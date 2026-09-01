# dsh-leetcode — LeetCode 题目助手插件

给 DeepSeek Harness (DSH) 增加两个 LeetCode 工具，让 Agent 能直接把题目拉进上下文解答：

| 工具 | 作用 |
|---|---|
| `leetcode_get` | 按 **slug** 或 **题号** 拉取题目详情：标题、难度、Markdown 格式的完整题目描述（含示例与约束）、主题标签、通过率、点赞数、相似题目、题目链接 |
| `leetcode_search` | 按**关键词 / 难度 / 标签**搜索题目列表：题号、slug、标题、难度、通过率、是否付费、是否有题解 |

数据源为 LeetCode 公开 GraphQL API（`https://leetcode.com/graphql`），**无需登录**；
题号 → slug 的映射来自 `https://leetcode.cn/api/problems/all/`（进程内只请求一次并缓存）。

## 目录结构

```
dsh-leetcode/
├── package.json        # dsh.bundle.patch 声明本包为 DSH profile 插件
├── cordis.patch.yml    # loader 补丁：插入 leetcode 工具行
├── lib/
│   └── index.js        # cordis 插件：注册 leetcode_get / leetcode_search
└── README.md
```

## 安装

### 方式一：GitHub 安装（推荐，依赖自动处理）

把本仓库推到 GitHub 后：

```bash
dsh plugin --profile web add "github:<你的用户名>/dsh-leetcode"
```

### 方式二：本地路径安装

```bash
# 1) 先装插件自身依赖（pnpm 对 file:/路径 依赖不代装依赖，需手动一次）
cd dsh-leetcode && pnpm install && cd ..

# 2) 再安装到 web profile
dsh plugin --profile web add /绝对路径/dsh-leetcode
```

> 提示：GitHub 安装时 pnpm 会在 store 里安装包的依赖，无需上面的 `pnpm install`。

### 在 Docker 镜像里启用

把 `github:<你的用户名>/dsh-leetcode` 追加进 `dsh-docker` 的 `PLUGINS` 构建参数即可：

```bash
docker build --build-arg 'PLUGINS=github:<你的用户名>/dsh-leetcode github:zhu1090093659/dsh-web ...' -t dsh .
```

### 验证安装

```bash
# bundle 栈应包含 dsh-leetcode
python3 -c "import json; m=json.load(open('$DSH_HOME/profiles/web/package.json')); print(m['dsh']['profile']['bundles'])"
# 组合配置里应出现 leetcode 行
dsh --profile web --dump-default-config | grep -A2 leetcode
```

## 使用示例

启动 `dsh web` 后，直接对 Agent 说：

> 用 leetcode_get 拉取 two-sum 这道题，我先看题再写解法。

> 搜索 LeetCode 上难度为 MEDIUM、标签包含 dynamic-programming 的题目，取前 10 道。

> 拉取题号 206 的题目（Reverse Linked List）。

Agent 会先 `leetcode_search` 定位、再用 `leetcode_get` 拉详情，然后解答。

## 技术说明

- **插件形态**：标准 DSH profile 插件。`package.json` 声明
  `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`，patch 向 loader 插入
  `{ id: leetcode, name: 'dsh-leetcode' }` 行；`lib/index.js` 导出
  `name` / `inject`（依赖 `tools` 服务）/ `apply(ctx)`，在 `apply` 里
  `ctx.tools.register(defineTool(...))` 注册两个工具。
- **依赖**：仅 `@deepseek-ai/dsh-tools`（`defineTool` 负责 JSON Schema 转换与参数校验）。
- **工具输出**：结构化 JSON（描述为 Markdown 文本，方便模型直接阅读），
  可空数字字段用 `oneOf [number, null]` 表达，与 DSH 校验器兼容。

## 已实测验证

- `fetchProblem("two-sum")`：返回完整详情，HTML 描述正确转为 Markdown（代码块/加粗/列表）。
- `searchProblems({keyword:"two sum", difficulty:"EASY"})`：命中 109 条，结果含题号/slug/难度/通过率/标签。
- 题号索引：4429 道题，`1 → two-sum`、`206 → reverse-linked-list` 解析正确。
- 集成：安装进隔离 web profile 后 `dsh web` 正常启动（HTTP 200），插件加载与工具注册无报错。
