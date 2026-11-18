# 常用配方

三段可直接改参数使用的代码骨架。执行前先用 `penpot_api_info` 核对成员名。

## 1. 幂等建区块

```js
const board = penpotUtils.findShapeById(storage.boardId);
const name = "sec/Hero";
if (!board.children.some(c => c.name === name)) {
  const sec = penpot.createBoard();
  sec.name = name;
  sec.resize(board.width, 240);
  board.insertChild(board.children.length, sec);
  const bottom = board.children.reduce((m, c) => Math.max(m, c.y - board.y + c.height), 0);
  sec.x = board.x;
  sec.y = board.y + bottom;
}
return board.children.map(c => c.name);
```

## 2. 图片守卫 + 替换

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(base64);
const h = Array.from(bytes.slice(0, 4));
const ok = (h[0] === 0x89 && h[1] === 0x50) || (h[0] === 0xff && h[1] === 0xd8)
        || String.fromCharCode(...h).startsWith("GIF")
        || String.fromCharCode(...h) === "RIFF";
if (!ok) throw new Error("not an image");

const media = await penpot.uploadMediaData(name, bytes, mime);
const shape = penpotUtils.findShapeById(shapeId);
const fills = [...shape.fills];
const i = fills.findIndex(f => f.fillImage);
fills[i] = { ...fills[i], fillImage: media };
shape.fills = fills;
return { w: media.width, h: media.height };
```

## 3. 越界巡检

```js
const board = penpotUtils.findShapeById(storage.boardId);
const outside = penpotUtils.analyzeDescendants(board, (root, s) =>
  (s.parentX < 0 || s.parentY < 0 ||
   s.parentX + s.width > root.width ||
   s.parentY + s.height > root.height)
    ? { name: s.name, px: s.parentX, py: s.parentY }
    : null
);
return { count: outside.length, sample: outside.slice(0, 10) };
```

修复用 `penpotUtils.setParentXY(shape, x, y)`；不要靠放大父容器。