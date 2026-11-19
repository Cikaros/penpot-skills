# 案例 03：子元素越界修复

**场景**：图层树里元素都在，坐标、尺寸、id 都正确，但画面上看不到。根因通常是父级 board 的 `clipContent` 裁掉了越界子元素。

## 步骤 1：确认是裁剪而不是删除

```js
const board = penpotUtils.findShapeById(storage.boardId);
if (!board) throw new Error("board not found: " + storage.boardId);
const outside = [];
(function walk(parent) {
  for (const child of parent.children || []) {
    const px = child.parentX, py = child.parentY;
    if (px < 0 || py < 0 ||
        px + child.width > parent.width ||
        py + child.height > parent.height) {
      outside.push({ id: child.id, name: child.name, parent: parent.name, px, py });
    }
    if (child.children?.length) walk(child);
  }
})(board);
return {
  board: { w: board.width, h: board.height, clip: board.clipContent },
  outsideCount: outside.length,
  outside: outside.slice(0, 10)
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
if (!board) throw new Error("board not found: " + storage.boardId);

const fixes = [];
(function walk(parent) {
  for (const child of parent.children || []) {
    const px = child.parentX, py = child.parentY;
    const overflow = px < 0 || py < 0 ||
                     px + child.width > parent.width ||
                     py + child.height > parent.height;

    // 仅处理“坐标残留”：负值或远大于容器，视为相对坐标误用
    if (overflow && (px < 0 || py < 0 || px > parent.width || py > parent.height)) {
      fixes.push({ shape: child, px, py });
    }
    if (child.children?.length) walk(child);
  }
})(board);

for (const f of fixes) penpotUtils.setParentXY(f.shape, 0, 0);
return {
  fixed: fixes.length,
  sample: fixes.slice(0, 10).map(f => ({ id: f.shape.id, name: f.shape.name, px: f.px, py: f.py }))
};
```

为什么先收集再执行：遍历时改坐标会影响后续判断，先算后改更稳定。这里检查的是 board 级越界；如果越界发生在嵌套容器，必须按直接父容器再查一遍，不能只用顶层 board 的宽高。

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