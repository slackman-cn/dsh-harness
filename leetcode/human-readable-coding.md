# Human-Readable Code Specification (HRCS) v1.0

## 1. 核心原则 (Core Philosophy)

**代码是写给人看的，只是恰好能被机器执行。**

在满足功能正确的前提下，优先级顺序为：
**可读性 > 可维护性 > 性能/空间优化**

- **拒绝炫技**：禁止使用晦涩的语法糖、位运算技巧或过度压缩的逻辑。
- **拒绝过早优化**：除非有明确的性能瓶颈，否则优先使用直观的数据结构和算法，允许牺牲少量时空复杂度换取逻辑清晰。
- **显式优于隐式**：逻辑流转必须清晰可见，禁止依赖隐式类型转换或副作用。

## 2. 实现规范 (Implementation Rules)

### 2.1 数据结构选择 (Data Structures)
- **优先使用高级抽象**：优先使用 `Array`, `Map`, `Set`, `List` 等标准库容器，而非原始数组或指针操作。
- **允许辅助空间**：若使用辅助数组/哈希表能显著降低逻辑复杂度（如避免双指针、原地交换），**必须**使用辅助空间。
  - ❌ **反例**：为了 O(1) 空间而使用复杂的位掩码或原地反转算法。
  - ✅ **正例**：使用 `result = []` 暂存中间状态，最后统一返回或拷贝。

### 2.2 控制流与逻辑 (Control Flow)
- **线性思维**：代码执行顺序应符合人类自然思考顺序（输入 → 处理 → 输出），避免多路复用变量。
- **拆分复杂表达式**：任何包含 2 个以上逻辑运算符 (`&&`, `||`) 或嵌套调用的表达式，必须拆分为具名中间变量。
  - ❌ **反例**：`if (x > 0 && arr[i] === target || flag)`
  - ✅ **正例**：
    ```javascript
    const isValidIndex = x > 0;
    const isTargetMatch = arr[i] === target;
    if ((isValidIndex && isTargetMatch) || flag) { ... }
    ```
- **卫语句 (Guard Clauses)**：优先处理边界和异常情况并提前返回，减少嵌套层级（Indentation Hell）。

### 2.3 命名与注释 (Naming & Comments)
- **语义化命名**：变量名必须解释“是什么”或“为什么”，禁止使用 `a`, `b`, `tmp`, `flag` 等无意义命名（循环计数器 `i, j` 除外）。
  - ✅ **正例**：`minLeftValue`, `hasFoundTarget`, `compressedResult`
- **解释“为什么”**：注释不应复述代码做了什么，而应解释**业务背景**或**设计决策**。
  - ✅ **正例**：`// 使用辅助数组暂存，避免原地修改导致的索引混乱`

### 2.4 函数设计 (Function Design)
- **单一职责**：一个函数只做一件事。若函数超过 20 行或包含多个逻辑阶段，必须拆分为子函数。
- **参数透明**：避免使用魔术数字（Magic Numbers），必须提取为具名常量。
  - ❌ **反例**：`setTimeout(cb, 3000)`
  - ✅ **正例**：
    ```javascript
    const RETRY_DELAY_MS = 3000;
    setTimeout(cb, RETRY_DELAY_MS);
    ```

## 3. 审查清单 (Review Checklist)

在交付代码前，必须通过以下自检：

| 检查项 | 标准 | 违规示例 |
| :--- | :--- | :--- |
| **空间换逻辑** | 是否为了省空间而让逻辑变得晦涩？ | 使用位运算压缩状态，而非清晰的布尔变量。 |
| **指针复杂度** | 是否使用了超过 2 个指针/索引？ | 三指针原地归并，难以追踪状态。 |
| **表达式密度** | 单行代码是否包含超过 1 个逻辑判断？ | `return a && b ? c : d;` |
| **变量复用** | 是否存在一个变量在函数不同阶段代表不同含义？ | `let i` 先做计数器，后做结果索引。 |
| **调试友好** | 中间结果是否可被打印/断点检查？ | 数据流在链式调用中不可见。 |

## 4. 代码重构示例 (Refactoring Examples)

### 场景：字符数组压缩 (String Compression)

#### ❌ 违反规范 (过度优化/双指针耦合)
```javascript
// 问题：读写指针耦合，数字拆分逻辑晦涩，难以调试
function compress(chars) {
  let write = 0, read = 0;
  while (read < chars.length) {
    let r = read;
    while (r < chars.length && chars[r] === chars[read]) r++;
    chars[write++] = chars[read];
    if (r - read > 1) {
      // 手动拆分数字，逻辑不直观
      for (const c of (r - read).toString()) chars[write++] = c;
    }
    read = r;
  }
  return write;
}
```

#### ✅ 符合规范 (Human Readable)
```javascript
/**
 * 压缩字符数组
 * 策略：使用辅助数组暂存，利用语言特性简化数字处理
 */
function compress(chars) {
  const n = chars.length;
  
  // 1. 边界处理：长度 <= 1 无需压缩
  if (n <= 1) {
    return n;
  }

  // 2. 辅助数据结构：暂存压缩结果
  const compressBuffer = [];
  let i = 0;

  // 3. 线性遍历：统计连续字符
  while (i < n) {
    const currentChar = chars[i];
    let count = 0;

    // 内层循环：统计当前字符连续出现次数
    while (i < n && currentChar === chars[i]) {
      i++;
      count++;
    }

    // 4. 写入结果
    compressBuffer.push(currentChar);

    // 5. 利用语言特性：数字自动转字符串并展开
    if (count > 1) {
      // String(count) 自动转为字符串，... 展开运算符自动拆分为字符数组
      // 比 split('') 更简洁，比手动取余更直观
      compressBuffer.push(...String(count));
    }
  }

  // 6. 原地拷贝：满足题目接口要求
  for (let j = 0; j < compressBuffer.length; j++) {
    chars[j] = compressBuffer[j];
  }

  return compressBuffer.length;
}
```

**优化点解析：**
1. **辅助数组 `compressBuffer`**：完全解耦了“压缩逻辑”和“原地存储”，避免了双指针打架。
2. **`push(...String(count))`**：利用 JavaScript 特性，一行代码优雅解决“数字拆分为字符数组”的问题，无需 `split('')` 或手动取余。
3. **线性流程**：`遍历 → 统计 → 写入 → 拷贝`，符合人类直觉。

## 5. 应用指令 (Usage Instruction)

当用户要求“Human Readable”或“易维护”的代码时，请严格遵循本规范：

1. **自动启用辅助数据结构**，除非用户明确限制空间复杂度。
2. **强制拆分复杂逻辑**，将嵌套循环或条件判断提取为独立函数/变量。
3. **优先展示“阶段化”流程**（如：预处理 → 计算 → 后处理）。
4. **利用语言特性简化代码**（如展开运算符、模板字符串等），但前提是逻辑直观。
