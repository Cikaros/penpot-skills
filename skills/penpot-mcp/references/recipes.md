# 常用配方

可直接改参数使用的代码骨架。基于 Penpot `2.18.7` 实测；跨版本先跑 `pitfalls.md` 第 0 节的探测。

> 本文骨架已在 2.18.7 按原样端到端跑通：建区块 → 文本 → token → 导出 4 项断言全过，验收页自动删除。

## 1. 临时验收页（推荐每次大改用）

```js
const file = penpot.currentFile;
const scratch = penpot.createPage();
scratch.name = "99-scratch-" + Date.now();
// createPage 不会切换当前页，需要显式打开
await penpot.openPage(scratch);

// …在 scratch.root 里建测试形状并断言…

const failed = checks.filter(c => !c.ok);
if (failed.length === 0) scratch.remove();   // 验收通过再删，失败保留现场
return { failed };
```

- `createPage()` / `page.remove()` 都不要求页面处于激活状态（实测）。
- 失败时保留页面，便于下一轮用 `openPage` 复现。

## 2. 幂等建区块

```js
const board = penpotUtils.findShapeById(storage.boardId);
const name = "sec-Hero";                 // 不用 "/"，会被归一化成 " / "
if (!board.children.some(c => c.name === name)) {
  const sec = penpot.createBoard();      // 总是先落到页面根
  sec.name = name;
  sec.resize(board.width, 240);
  board.insertChild(board.children.length, sec);   // 再嵌进目标 board
  const bottom = board.children.reduce((m, c) => Math.max(m, c.y - board.y + c.height), 0);
  sec.x = board.x;
  sec.y = board.y + bottom;
}
await penpot.waitForLayoutUpdate();
return board.children.map(c => c.name);
```

## 3. 文本块（先给宽度）

```js
const board = penpotUtils.findShapeById(storage.boardId);
let t = penpotUtils.findShape(s => s.name === "txt-Title", board);
if (!t) {
  t = penpot.createText("标题");
  t.name = "txt-Title";
  board.insertChild(board.children.length, t);
}
t.fontSize = 20;
t.fontWeight = "700";
t.resize(300, 10);              // 默认宽度只有 1px，必须先给宽度
t.growType = "auto-height";
t.fills = [{ fillOpacity: 1, fillColor: "#111827" }];
penpotUtils.setParentXY(t, 16, 12);
await penpot.waitForLayoutUpdate();
return { w: Math.round(t.width), h: Math.round(t.height), size: parseFloat(t.fontSize) };
```

- 顺序固定：`resize(width, h)` → `growType`；反过来会被重置成 `fixed`。
- 读回的 `fontSize`/`lineHeight` 是字符串，计算前 `parseFloat`。

## 4. 图片守卫 + 替换

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(base64);
const h = Array.from(bytes.slice(0, 4));
const ok = (h[0] === 0x89 && h[1] === 0x50) || (h[0] === 0xff && h[1] === 0xd8)
        || String.fromCharCode(...h).startsWith("GIF")
        || String.fromCharCode(...h) === "RIFF";
if (!ok) throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0, 8)));

const media = await penpot.uploadMediaData(name, bytes, mime);
if (!media.width || !media.height) throw new Error("zero decoded size");

const shape = penpotUtils.findShapeById(shapeId);
const fills = [...shape.fills];
const i = fills.findIndex(f => f.fillImage);
if (i < 0) throw new Error("no image fill");
fills[i] = { ...fills[i], fillImage: media };   // 保留 fillOpacity
shape.fills = fills;
return { w: media.width, h: media.height };
```

## 5. 越界巡检

```js
const board = penpotUtils.findShapeById(storage.boardId);
const outside = penpotUtils.analyzeDescendants(board, (root, node) =>
  (node.parentX < 0 || node.parentY < 0 ||
   node.parentX + node.width > root.width ||
   node.parentY + node.height > root.height)
    ? { name: node.name, px: node.parentX, py: node.parentY }
    : null
);
return { count: outside.length, sample: outside.slice(0, 10).map(x => x.result) };
```

- 回调签名是 `(root, node)`，返回非空才进结果；结果是 `[{shape, result}]`。
- 修复用 `penpotUtils.setParentXY(shape, x, y)`；不要靠放大父容器。

## 6. 颜色 token 绑定

```js
let color = penpot.library.local.colors.find(c => c.name === "color-brand-primary");
if (!color) {
  color = penpot.library.local.createColor();
  color.name = "color-brand-primary";
  color.color = "#3366FF";
  color.opacity = 1;
}
shape.fills = [{
  fillOpacity: 1,
  fillColor: color.color,
  fillColorRefId: color.id,
  fillColorRefFile: penpot.currentFile.id
}];
return { ref: shape.fills[0].fillColorRefId === color.id };
```

把 `color` 对象直接赋给 `fillColor` 会报 `Value not valid`（实测）。

## 7. 导出验收

```js
const png = await shape.export({ type: "png", scale: 1 });
const svg = await shape.export({ type: "svg" });
return {
  png: { len: png.length, head: Array.from(png.slice(0, 4)) },   // 89 50 4E 47
  svg: { len: svg.length, head: String.fromCharCode(...svg.slice(0, 4)) } // "<svg"
};
```

返回值里**不要带函数**，否则 `structuredClone` 失败（实测）。

## 8. SVG 图标重着色

```js
const icon = penpot.createShapeFromSvg(svgText);   // group: base-background + svg-path
icon.name = "ico-Arrow";
const path = icon.children.find(c => c.type === "path");
path.strokes = [{ ...path.strokes[0], strokeColor: "#4F46E5" }];
// 填充型图标则改 path.fills
return { type: icon.type, w: icon.width, h: icon.height };
```

- 给整个 group 设 `fills` 不会生效到子 path。
- `strokeWidth` 属于 stroke 对象，不属于 shape。

## 9. 排版 token + 字体 CSS

```js
const typo = penpot.library.local.typographies.find(t => t.name === "font-body")
  || penpot.library.local.createTypography();
typo.name = "font-body";
typo.fontSize = "16";
typo.lineHeight = "1.5";

text.fontId = typo.fontId;
text.fontVariantId = typo.fontVariantId;
text.fontSize = typo.fontSize;
text.fontWeight = typo.fontWeight;
text.lineHeight = typo.lineHeight;

text.resize(300, 10);
text.growType = "auto-height";

const fontCss = await penpot.generateFontFaces([text]);   // Promise<string>
return { fontCss };
```

- 不能 `text.typography = typo`，只能逐字段抄（实测）。
- `generateFontFaces` 是异步的，`await` 后再拼 CSS。
