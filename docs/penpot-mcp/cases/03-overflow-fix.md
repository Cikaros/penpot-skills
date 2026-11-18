# 案例 03：子元素越界修复

**场景**：图层树里元素都在，坐标、尺寸、key 都正确，但画面上看不到。根因通常是父级 board 的 `clipContent` 裁掉了越界子元素。

## 步骤 1：确认是裁剪而不是删除

```js
const board = penpotUtils.findShapeById(storage.boardId);
const outside = penpotUtils.analyzeDescendants(board, (root, s) => {
  const px = s.parentX, py = s.parentY;
  const overflow =
    px < 0 || py < 0 ||
    px + s.width > root.width ||
    py + s.height > root.height;
  return overflow ? { name: s.name, px, py, w: s.width, h: s.height } : null;
});
return {
  board: { w: board.width, h: board.height, clip: board.clipContent },
  outsideCount: outside.length,
  sample: outside.slice(0, 10)
};
```

若 `outsideCount > 0` 且 `clip === true`，就是裁剪问题。

## 步骤 2：区分两类越界

| 类型 | 特征 | 修法 |
|---|---|---|
| 坐标残留 | `parentX` 是几百上千的绝对值 | 归零或按设计稿重设相对坐标 |
| 尺寸过大 | `w/h` 超过父容器 | 缩小内容或换布局，不要放大父级 |

```js
// 坐标残留：先归零，再按设计意图摆放
penpotUtils.setParentXY(shape, 0, 0);
```

不要第一反应把父 board 改大——容器尺寸通常是设计意图，扩大后整屏比例会坏。

## 步骤 3：批量修正（可重入）

```js
const board = penpotUtils.findShapeById(storage.boardId);

const fixes = penpotUtils.analyzeDescendants(board, (root, s) => {
  const px = s.parentX, py = s.parentY;
  const overflow = px < 0 || py < 0 ||
                   px + s.width > root.width ||
                   py + s.height > root.height;
  if (!overflow) return null;

  // 仅处理"坐标残留"：相对坐标远大于容器，视为绝对坐标误用
  if (px > root.width || py > root.height) {
    return () => penpotUtils.setParentXY(s, 0, 0);
  }
  return null;   // 尺寸问题不在本步自动修
});

fixes.forEach(f => f.result());
return { fixed: fixes.length };
```

为什么先收集再执行：遍历时改坐标会影响后续判断，先算后改更稳定。

## 步骤 4：验收

重复步骤 1，`outsideCount` 应为 0；再 `export_shape` 目视确认裁剪消失。

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 归零后元素叠在一起 | 原本有设计偏移 | 按设计稿逐块给偏移，不要一律 0 |
| 修完仍被裁 | 父级不止一层 | 从最外层 board 向内逐层检查 |
| 元素消失但坐标正常 | 被 `hidden` 或 `opacity=0` | 查可见性与透明度 |

## 现场需核对

- `clipContent` 的属性名与默认值（board 与 group 行为不同）。
- `parentX` 是否只读（是，必须用 `setParentXY`）。