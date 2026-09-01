---
name: human-readable-coding
description: Use when writing or reviewing code that must be human-readable and maintainable — LeetCode algorithm solutions and general implementation work where clarity outweighs micro-optimization. Enforces readable data structures, split control flow, semantic naming, staged flow, and the review checklist. Triggered by requests for "human readable" or "easy to maintain" code, or by default when a solution prioritizes logic clarity.
---

# Human-Readable Code Specification (HRCS)

Write code for the person reading it; it merely has to run. Within functional correctness, the priority order is **readability > maintainability > performance/space**. This is guidance, not a script — apply judgment and skip a rule when the exact situation is already clear.

- **Reject showing off.** No obscure syntax sugar, bit-manipulation tricks, or over-compressed logic.
- **Reject premature optimization.** Without a confirmed bottleneck, prefer the obvious data structure and algorithm; a little time/space may trade away for a clearer idea.
- **Explicit over implicit.** The flow of logic must be visible; do not rely on implicit type coercion or side effects.

## Data structures

- **Prefer high-level abstractions:** `Array`, `Map`, `Set`, `List` and other standard containers over raw arrays or pointer arithmetic.
- **Allow helper space.** When a helper array or hash map materially lowers logic complexity (e.g. avoiding two-pointers or in-place swaps), **must** use it.
  - ❌ Complex bitmask or in-place reversal just to reach O(1) space.
  - ✅ `result = []` to hold intermediate state, returned or copied at the end.

## Control flow and logic

- **Linear thinking:** execution order should match natural thought (input → process → output); avoid one variable reused across meanings.
- **Split complex expressions:** any expression with more than one logical operator (`&&`, `||`) or nested call must break into named intermediate variables.
  - ❌ `if (x > 0 && arr[i] === target || flag)`
  - ✅
    ```javascript
    const isValidIndex = x > 0;
    const isTargetMatch = arr[i] === target;
    if ((isValidIndex && isTargetMatch) || flag) { /* ... */ }
    ```
- **Guard clauses:** handle boundaries and error cases up front and return early to keep nesting shallow (avoid indentation hell).

## Naming and comments

- **Semantic names:** a variable must explain *what* or *why*; forbid `a`, `b`, `tmp`, `flag` (loop counters `i`, `j` excepted).
  - ✅ `minLeftValue`, `hasFoundTarget`, `compressedResult`
- **Comment the "why":** do not restate what the code does; explain the business context or the design decision.
  - ✅ `// 使用辅助数组暂存，避免原地修改导致的索引混乱`

## Function design

- **Single responsibility:** one function does one thing. If it runs past ~20 lines or spans several logical phases, split into sub-functions.
- **No magic numbers:** extract them into named constants.
  - ❌ `setTimeout(cb, 3000)`
  - ✅
    ```javascript
    const RETRY_DELAY_MS = 3000;
    setTimeout(cb, RETRY_DELAY_MS);
    ```

## Review checklist

Before delivering, self-check against:

| Check | Standard | Violation example |
| :--- | :--- | :--- |
| **Space for logic** | Did I make logic obscure to save space? | Bit-packed state instead of clear booleans. |
| **Pointer complexity** | More than two pointers/indices? | Three-pointer in-place merge, hard to track. |
| **Expression density** | One line holding more than one judgment? | `return a && b ? c : d;` |
| **Variable reuse** | Does a variable mean different things in different phases? | `let i` as counter, then as result index. |
| **Debug-friendliness** | Are intermediates printable/inspectable? | Data flowing invisibly through chained calls. |

## Refactoring example — string compression

❌ Violates the spec (over-optimized, coupled two-pointers):
```javascript
function compress(chars) {
  let write = 0, read = 0;
  while (read < chars.length) {
    let r = read;
    while (r < chars.length && chars[r] === chars[read]) r++;
    chars[write++] = chars[read];
    if (r - read > 1) {
      for (const c of (r - read).toString()) chars[write++] = c;
    }
    read = r;
  }
  return write;
}
```

✅ Follows the spec (human readable):
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
      // String(count) 自动转字符串，... 展开运算符自动拆分为字符
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

Why this reads better:
1. **Helper array `compressBuffer`** decouples "compression logic" from "in-place storage"; no two-pointer fighting.
2. **`push(...String(count))`** uses the language to split a number into chars in one clear line — no `split('')` or manual modulo.
3. **Linear flow:** `遍历 → 统计 → 写入 → 拷贝`, matching intuition.

## Usage instruction

When the user asks for "human readable" or "easy to maintain" code — or when a solution should prioritize logic clarity — apply this spec:

1. **Automatically enable helper data structures** unless the user explicitly caps space complexity.
2. **Force-split complex logic:** pull nested loops or conditionals into independent functions/variables.
3. **Prefer staged flow** (e.g. preprocess → compute → post-process).
4. **Use language features to simplify** (spread operator, template strings, etc.), but only when the logic stays obvious.
