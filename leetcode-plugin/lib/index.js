/**
 * dsh-leetcode — LeetCode 题目助手插件
 *
 * 向 DSH 注册两个模型端工具：
 *   leetcode_get     按 slug 或题号拉取题目详情（标题、难度、Markdown 描述、标签、通过率等）
 *   leetcode_search  按关键词/难度/标签搜索题目列表
 *
 * 数据源：LeetCode 公开 GraphQL API（https://leetcode.com/graphql），无需登录。
 * 题号 -> slug 的映射来自 https://leetcode.cn/api/problems/all/（进程内缓存一次）。
 *
 * 插件形态：cordis 插件（命名导出 name/inject/apply），通过
 *   dsh plugin --profile web add <本包路径>
 * 安装后由 profile 的 loader 加载。
 */
import { defineTool } from "@deepseek-ai/dsh-tools";

/** 插件标识（loader/日志用）。 */
const name = "leetcode";

/** 依赖的服务：工具注册表（dsh-tools 的 tools 行）。 */
const inject = ["tools"];

const ENDPOINT = "https://leetcode.com/graphql";
const SLUG_INDEX_URL = "https://leetcode.cn/api/problems/all/";
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_LIST_LIMIT = 100;

const PROBLEM_QUERY = `query questionData($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    questionFrontendId
    title
    titleSlug
    difficulty
    content
    isPaidOnly
    topicTags { name slug }
    stats
    likes
    dislikes
    similarQuestions
  }
}`;

const LIST_QUERY = `query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(categorySlug: $categorySlug, limit: $limit, skip: $skip, filters: $filters) {
    total: totalNum
    questions: data {
      acRate
      difficulty
      frontendQuestionId: questionFrontendId
      isFavor
      paidOnly: isPaidOnly
      status
      title
      titleSlug
      topicTags { name slug }
      hasSolution
      hasVideoSolution
    }
  }
}`;

/** 执行一次 GraphQL 请求并返回 data；出错抛出带上下文的中文错误。 */
async function graphql(query, variables) {
	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"user-agent": "dsh-leetcode/0.1.0"
		},
		body: JSON.stringify({ query, variables })
	});
	if (!response.ok) {
		throw new Error(`leetcode: GraphQL 请求失败（HTTP ${response.status}）`);
	}
	const payload = await response.json();
	if (Array.isArray(payload.errors) && payload.errors.length > 0) {
		throw new Error(`leetcode: GraphQL 错误 — ${payload.errors.map((error) => error.message).join("; ")}`);
	}
	return payload.data;
}

let slugIndexPromise = null;

/**
 * 题号索引（frontendQuestionId -> titleSlug），进程内只拉取一次。
 * 数据源 https://leetcode.cn/api/problems/all/ 是公开接口，返回全部题目列表。
 */
function loadSlugIndex() {
	slugIndexPromise ??= (async () => {
		const response = await fetch(SLUG_INDEX_URL, {
			headers: { accept: "application/json" }
		});
		if (!response.ok) {
			throw new Error(`leetcode: 题号索引请求失败（HTTP ${response.status}）`);
		}
		const payload = await response.json();
		const index = new Map();
		for (const pair of payload.stat_status_pairs ?? []) {
			const frontendId = pair.stat?.frontend_question_id;
			const slug = pair.stat?.question__title_slug;
			if (frontendId !== undefined && typeof slug === "string" && slug.length > 0) {
				index.set(String(frontendId), slug);
			}
		}
		if (index.size === 0) {
			throw new Error("leetcode: 题号索引为空，无法解析题号");
		}
		return index;
	})();
	return slugIndexPromise;
}

/** 去掉所有 HTML 标签。 */
function stripTags(html) {
	return html.replace(/<[^>]*>/g, "");
}

/** 反转义常见 HTML 实体。 */
function unescapeHtml(text) {
	return text
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&#39;/g, "'")
		.replace(/&quot;/g, '"');
}

/**
 * LeetCode 题目描述的 HTML -> Markdown 转换（无第三方依赖的轻量实现）：
 * 代码块/行内代码、加粗、斜体、列表、换行，其余标签剥掉。
 */
function htmlToMarkdown(html) {
	if (!html) return "";
	let text = html;
	// <pre> 代码块：先整体取出，内部再剥标签
	text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, (_, code) => {
		const body = unescapeHtml(stripTags(code)).replace(/\n{3,}/g, "\n\n").trim();
		return `\n\`\`\`\n${body}\n\`\`\`\n`;
	});
	// 行内 <code>
	text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/g, (_, code) => `\`${stripTags(code).trim()}\``);
	// 加粗 / 斜体
	text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, "**$1**");
	text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/g, "**$1**");
	text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/g, "*$1*");
	text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/g, "*$1*");
	// 列表与换行
	text = text.replace(/<li[^>]*>/g, "\n- ");
	text = text.replace(/<br\s*\/?>/g, "\n");
	text = text.replace(/<\/(p|div|h[1-6]|ul|ol|table|tr|blockquote)>/g, "\n");
	text = unescapeHtml(stripTags(text));
	return text.replace(/\n{3,}/g, "\n\n").trim();
}

/** 安全解析 JSON 字符串字段（stats / similarQuestions），失败回退到空值。 */
function parseJsonField(value, fallback) {
	if (typeof value !== "string" || value.length === 0) return fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

/** 按 slug 拉取题目详情并整理为工具输出结构。 */
async function fetchProblem(slug) {
	const data = await graphql(PROBLEM_QUERY, { titleSlug: slug });
	const question = data?.question;
	if (!question) {
		throw new Error(`leetcode: 未找到题目 ${slug}`);
	}
	const stats = parseJsonField(question.stats, {});
	const similar = parseJsonField(question.similarQuestions, []);
	return {
		id: question.questionFrontendId,
		slug: question.titleSlug,
		title: question.title,
		difficulty: question.difficulty,
		paidOnly: question.isPaidOnly,
		tags: (question.topicTags ?? []).map((tag) => ({ name: tag.name, slug: tag.slug })),
		acRate: stats.acRate ?? null,
		totalAccepted: stats.totalAccepted ?? null,
		totalSubmission: stats.totalSubmission ?? null,
		likes: question.likes ?? null,
		dislikes: question.dislikes ?? null,
		similarQuestions: Array.isArray(similar)
			? similar.map((item) => ({
				title: item.title,
				slug: item.titleSlug,
				difficulty: item.difficulty
			}))
			: [],
		descriptionMarkdown: htmlToMarkdown(question.content),
		url: `https://leetcode.com/problems/${question.titleSlug}/`
	};
}

/** 搜索题目列表（关键词/难度/标签），返回分页结果。 */
async function searchProblems({ keyword, difficulty, tags, limit, skip } = {}) {
	const filters = {};
	if (typeof keyword === "string" && keyword.trim().length > 0) {
		filters.searchKeywords = keyword.trim();
	}
	if (typeof difficulty === "string" && difficulty.length > 0) {
		filters.difficulty = difficulty;
	}
	if (Array.isArray(tags) && tags.length > 0) {
		filters.tags = tags;
	}
	const pageSize = Math.min(Number.isFinite(limit) && limit > 0 ? limit : 20, MAX_LIST_LIMIT);
	const offset = Number.isFinite(skip) && skip > 0 ? skip : 0;
	const data = await graphql(LIST_QUERY, {
		categorySlug: "",
		skip: offset,
		limit: pageSize,
		filters
	});
	const list = data?.problemsetQuestionList;
	if (!list) {
		throw new Error("leetcode: 搜索无结果");
	}
	return {
		total: list.total,
		questions: (list.questions ?? []).map((question) => ({
			id: question.frontendQuestionId,
			slug: question.titleSlug,
			title: question.title,
			difficulty: question.difficulty,
			acRate: question.acRate ?? null,
			paidOnly: question.paidOnly,
			hasSolution: question.hasSolution,
			tags: (question.topicTags ?? []).map((tag) => tag.slug)
		}))
	};
}

/** 可空数字的 JSON Schema 片段（oneOf number/null，与 dsh 校验器兼容）。 */
function nullableNumber() {
	return { oneOf: [{ type: "number" }, { type: "null" }] };
}

const GET_TOOL = defineTool({
	name: "leetcode_get",
	description: "按 slug 或题号获取 LeetCode 题目详情：标题、难度、Markdown 格式的完整题目描述（含示例与约束）、主题标签、通过率、点赞数、相似题目与题目链接。用于把一道题拉进上下文后解答。题号->slug 映射需要额外一次请求，优先用 slug。",
	parameters: {
		slug: {
			type: "string",
			description: "题目标题 slug（如 two-sum、longest-substring-without-repeating-characters）。可用 leetcode_search 先搜索得到。"
		},
		id: {
			type: "string",
			description: "题号（如 1、206）。与 slug 二选一；同时给出时以 slug 为准。"
		}
	},
	output: {
		schema: {
			type: "object",
			additionalProperties: false,
			properties: {
				id: { type: "string", required: true },
				slug: { type: "string", required: true },
				title: { type: "string", required: true },
				difficulty: { type: "string", required: true },
				paidOnly: { type: "boolean", required: true },
				tags: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							name: { type: "string", required: true },
							slug: { type: "string", required: true }
						}
					}
				},
				acRate: nullableNumber(),
				totalAccepted: nullableNumber(),
				totalSubmission: nullableNumber(),
				likes: nullableNumber(),
				dislikes: nullableNumber(),
				similarQuestions: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							title: { type: "string", required: true },
							slug: { type: "string", required: true },
							difficulty: { type: "string", required: true }
						}
					}
				},
				descriptionMarkdown: { type: "string", required: true },
				url: { type: "string", required: true }
			}
		}
	},
	timeoutMs: DEFAULT_TIMEOUT_MS,
	execute: async (args) => {
		let slug = args.slug;
		if (typeof slug !== "string" || slug.length === 0) {
			if (typeof args.id !== "string" || args.id.length === 0) {
				throw new Error("leetcode: 需要提供 slug 或 id");
			}
			const index = await loadSlugIndex();
			slug = index.get(String(args.id));
			if (!slug) {
				throw new Error(`leetcode: 找不到题号 ${args.id} 对应的题目`);
			}
		}
		return fetchProblem(slug);
	}
});

const SEARCH_TOOL = defineTool({
	name: "leetcode_search",
	description: "搜索 LeetCode 题目列表，支持标题关键词、难度、主题标签过滤，返回题号、slug、标题、难度、通过率等。用于查找题目：先用它定位，再用 leetcode_get 拉详情。",
	parameters: {
		keyword: {
			type: "string",
			description: "标题关键词（也常用于按题号模糊搜索，如 1、two）。"
		},
		difficulty: {
			type: "string",
			enum: ["EASY", "MEDIUM", "HARD"],
			description: "难度过滤：EASY / MEDIUM / HARD。"
		},
		tags: {
			type: "array",
			items: { type: "string" },
			description: "主题标签 slug 列表（如 array、two-pointers、dynamic-programming），多选为交集过滤。"
		},
		limit: {
			type: "integer",
			description: "返回条数，默认 20，最大 100。"
		},
		skip: {
			type: "integer",
			description: "分页偏移，默认 0。"
		}
	},
	output: {
		schema: {
			type: "object",
			additionalProperties: false,
			properties: {
				total: { type: "integer", required: true },
				questions: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							id: { type: "string", required: true },
							slug: { type: "string", required: true },
							title: { type: "string", required: true },
							difficulty: { type: "string", required: true },
							acRate: nullableNumber(),
							paidOnly: { type: "boolean", required: true },
							hasSolution: { type: "boolean", required: true },
							tags: {
								type: "array",
								required: true,
								items: { type: "string" }
							}
						}
					}
				}
			}
		}
	},
	timeoutMs: DEFAULT_TIMEOUT_MS,
	execute: (args) => searchProblems(args)
});

/** 插件入口：注册两个 LeetCode 工具。 */
function apply(ctx) {
	ctx.tools.register(GET_TOOL);
	ctx.tools.register(SEARCH_TOOL);
}

export { name, inject, apply, fetchProblem, searchProblems, graphql, htmlToMarkdown, loadSlugIndex };
