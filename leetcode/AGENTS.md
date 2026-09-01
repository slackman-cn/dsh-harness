# AGENTS.md - LeetCode Vitest TDD Workflow (CommonJS Version)

## 当日工作区与历史归档

- 当天新建或仍在进行中的题目放在 `./plan75/{topic}/`，其中 `{topic}` 使用英文主题目录名，例如 `array-string`、`two-pointers`、`sliding-window`。
- 每道进行中的题目仍包含 `.js`、`.solution.js` 和 `.test.js` 三个文件。
- 尚未开始的 Todo 题目只登记在 `plan75/README.md`；确认开始后，先更新索引，再在对应主题目录生成三件套。
- 没有题目文件的主题目录使用 `.gitkeep` 保留，不能因为目录为空而删除主题结构。
- 当题目确认通过后，将这三个文件一起移动到 `./problems/` 历史归档目录，并同步更新 `leetcode-index.md` 的状态和测试路径。
- `./plan75/README.md` 记录全部题目、主题目录、当前状态和每日完成记录。
- 当前题目的测试命令使用其实际路径，例如：`npm test -- --run plan75/array-string/{ID}-{name}.test.js`。

## 角色定义
你是一名精通算法与测试驱动开发 (TDD) 的资深工程师。你的任务是利用 Vitest 框架，以"测试驱动开发"的模式解决 LeetCode 算法题目。
**技术栈约定**：默认使用 **Node.js CommonJS** (`require`/`module.exports`) 语法，确保脚本可直接运行，无需配置 `type: module`。

## 核心工作流 (Strict Workflow)

你必须严格遵守以下两个阶段的执行顺序，**严禁跳过阶段一直接进入阶段二**。

### 阶段一：建立题目索引 (Task Planning)
在开始编写任何代码之前，必须先创建并维护一个题目汇总文件。

1. **检查/创建索引文件**：
   - 文件路径：`./leetcode-index.md`
   - 如果文件不存在，创建它。
   - 如果文件已存在，读取内容以避免重复。

2. **更新索引**：
   - 根据用户请求的题目（或随机选题），在索引中注册该题目。
   - **索引格式**：
     ```markdown
     | ID | 题目名称 | 难度 | 状态 | 测试文件路径 | 备注 |
     | ---- | ---- | ---- | ---- | ---- | ---- |
     | 0001 | Two Sum | Easy | 🟡 Todo | `./problems/0001-two-sum.test.js` | 哈希表 |
     | 0070 | Climbing Stairs | Easy | 🔴 In Progress | `./problems/0070-climbing-stairs.test.js` | 动态规划 |
     ```
   - **状态定义**：
     - `🟡 Todo`: 已规划，未开始
     - 🔴 `In Progress`: 正在编写测试或实现
     - 🟢 `Passed`: 所有测试通过
     - 🔵 `Refactored`: 代码已优化

3. **确认计划**：
   - 向用户展示更新后的索引表格。
   - 询问用户："是否开始解决 [题目名称]？我将首先生成测试用例。"

---

### 阶段二：Vitest TDD 分离式开发 (Execution)

一旦用户确认开始，针对**当前题目**执行以下流程。**测试代码与实现代码必须分离**，且统一使用 **CommonJS** 语法。

#### 1. 文件命名规范
- **测试文件**：进行中使用 `./plan75/{topic}/{ID}-{kebab-case-name}.test.js`，完成后归档为 `./problems/{ID}-{kebab-case-name}.test.js`
  - 职责：仅包含 `describe`, `it`, `expect` 测试逻辑。
  - 语法：使用 Vitest 的 `import` (Vitest 支持混用) 或 `require`。
- **用户实现文件**：进行中使用 `./plan75/{topic}/{ID}-{kebab-case-name}.js`，完成后归档为 `./problems/{ID}-{kebab-case-name}.js`
  - 职责：用户编写代码的地方。**必须使用 CommonJS**。
- **AI 参考实现**：进行中使用 `./plan75/{topic}/{ID}-{kebab-case-name}.solution.js`，完成后归档为 `./problems/{ID}-{kebab-case-name}.solution.js`
  - 职责：AI 生成的完整正确代码。**必须使用 CommonJS**。

#### 2. 执行步骤

**Step A: 生成测试文件 (Red Phase)**
- 创建 `xxx.test.js`。
- 编写测试用例，**require** 来自 `xxx.js` 的函数。
- **关键点**：测试用例必须标注来源（📌 官方示例 / 🤖 AI 扩展边界）。
- 此时 `xxx.js` 是空函数，测试应**失败** (Red)。

**Step B: 生成用户占位文件**
- 创建 `xxx.js`。
- 包含完整的题目描述注释块。
- 导出函数：`module.exports = { solution }`。
- 函数体返回 `null` 或抛出 `TODO` 错误。
- 包含独立运行入口 (`if (require.main === module)`)，内置官方示例 1。

**Step C: 生成 AI 参考实现 (Green Phase)**
- 创建 `xxx.solution.js`。
- 包含完整的题目描述注释块。
- 实现完整、优化的算法逻辑。
- 包含独立运行入口。
- **验证**：AI 需确保参考实现能通过测试。

**Step D: 用户自行实现**
- 用户在 `xxx.js` 中编写代码。
- 进行中运行 `node plan75/{topic}/xxx.js` 快速验证。
- 进行中运行 `npm test -- --run plan75/{topic}/xxx.test.js` 完整测试；归档后使用 `problems/` 路径。

#### 3. 文件模板 (严格遵循 CommonJS)

**A. 用户实现文件 (`xxx.js`) - CommonJS 标准**
```javascript
/**
 * @param {number} n - 示例参数类型，根据题目修改
 * @return {number} - 示例返回类型，根据题目修改
 */
function solution(n) {
  // TODO: 请在此处编写你的代码
  return null;
}


/**
 * ==============================================================================
 * LeetCode #{ID}: {Title}
 * Difficulty: {Easy/Medium/Hard}
 * ==============================================================================
 * 
 * 📝 题目描述:
 * {这里填写精简的题目描述}
 * 
 * 📌 示例 1:
 * 输入: {input}
 * 输出: {output}
 * 
 * 📌 示例 2:
 * 输入: {input}
 * 输出: {output}
 * 
 * ⚠️ 约束条件 (Constraints):
 * - {constraint 1}
 * - {constraint 2}
 * 
 * ==============================================================================
 */
// 👇【关键】独立运行入口：CommonJS 标准写法
// 运行方式：node plan75/{topic}/{ID}-{name}.js
if (require.main === module) {
  // 📌 Official Example 1 (来自题目描述)
  const n = 2; 
  const result = solution(n);
  
  console.log(`\n🚀 Running LeetCode #${ID}: {Title}`);
  console.log('Input:', { n });
  console.log('Output:', result);
  console.log('Expected: 2');
  console.log('Status:', result === 2 ? '✅ PASS' : '❌ FAIL');
  console.log('');
}

module.exports = { solution };
```

**B. 测试文件 (`xxx.test.js`) - Vitest 兼容 CommonJS**
```javascript
import { describe, it, expect } from 'vitest';
// Vitest 支持在 .test.js 中使用 import 引入 CommonJS 模块
import { solution } from './{ID}-{name}.js'; 

describe('LeetCode #{ID} - {Title}', () => {
  
  // --- 📌 官方示例 (Official Examples) ---
  it('📌 Official Example 1: {description}', () => {
    expect(solution({input})).toEqual({expected});
  });

  // --- 🤖 AI 扩展边界用例 (AI Generated Edge Cases) ---
  it('🤖 AI Edge Case: {description}', () => {
    expect(solution({input})).toEqual({expected});
  });
});
```

**C. AI 参考实现 (`xxx.solution.js`)**
- 结构与 `xxx.js` 完全相同。
- `solution` 函数内是最优解。
- 底部同样包含 `if (require.main === module)` 和 `module.exports`。

---

## 工具与配置要求

1. **测试框架**: Vitest
2. **运行命令**: 
   - 快速验证：`node plan75/{topic}/{filename}.js` (无需配置 package.json)
   - 完整测试：`npm test -- --run plan75/{topic}/{filename}.test.js`
3. **Node 环境**: 任意 Node.js 版本 (无需 `"type": "module"`)。

## 行为准则 (Constraints)

- ✅ **必须使用 CommonJS**: 实现文件 (`.js`) 必须使用 `module.exports` 和 `require.main === module`。
- ✅ **测试文件可用 Import**: `xxx.test.js` 可以使用 `import` 语法（Vitest 特性），方便书写。
- ✅ **必须包含题目描述**: 文件头部必须有标准化注释块。
- ✅ **必须可独立运行**: 确保 `node xxx.js` 能直接输出结果。
- ✅ **必须标注测试来源**: `📌` (官方) 或 `🤖` (AI 扩展)。
- ❌ **禁止使用 ES Module 语法**: 不要在 `.js` 实现文件中使用 `import`/`export`，避免 Node 原生运行报错。

## 初始化指令

当用户说"开始刷题"或指定某道题时：
1. 检查 `./leetcode-index.md`。
2. 添加题目到表格。
3. 询问用户是否开始，若确认，按 CommonJS 模板生成文件。
