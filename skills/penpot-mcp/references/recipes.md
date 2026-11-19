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
if (!board) throw new Error("board not found: " + storage.boardId);
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
if (!board) throw new Error("board not found: " + storage.boardId);
let t = penpotUtils.findShape(s => s.name === "txt-Title", board);
if (!t) {
  t = penpot.createText("标题");
  t.name = "txt-Title";
  board.insertChild(board.children.length, t);
}
t.fontSize = 20;
t.fontWeight = "600";           // visual-spec：只用 400/500/600
t.resize(300, 10);              // 默认宽度只有 1px，必须先给宽度
t.growType = "auto-height";
const textColor = penpot.library.local.colors.find(c => c.name === "color-text-primary");
if (!textColor) throw new Error("missing token: color-text-primary");
t.fills = [{
  fillOpacity: 1,
  fillColor: textColor.color,
  fillColorRefId: textColor.id,
  fillColorRefFile: penpot.currentFile.id
}];
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
// SNIPPET:image-kind:start
/**
 * Image signature guard: PNG / JPEG / GIF87a / GIF89a / WEBP.
 * Requires at least 12 bytes and rejects other RIFF containers (WAV/AVI).
 */
function imageKind(bytes) {
  if (!bytes || typeof bytes.length !== "number" || bytes.length < 12) return null;

  const s = (from, to) => String.fromCharCode(...Array.from(bytes.slice(from, to)));

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (s(0, 6) === "GIF87a" || s(0, 6) === "GIF89a") return "gif";
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "webp";
  return null;
}
// SNIPPET:image-kind:end
if (!imageKind(bytes)) throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0, 8)));

const media = await penpot.uploadMediaData(name, bytes, mime);
if (!media.width || !media.height) throw new Error("zero decoded size");

const shape = penpotUtils.findShapeById(shapeId);
if (!shape) throw new Error("shape not found: " + shapeId);
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
return { count: outside.length, outside: outside.slice(0, 10) };
```

- `parentX`/`parentY` 是相对**直接父容器**的坐标，所以逐层检查每个 `parent`，不要拿顶层 board 的宽高代替。
- 返回的是纯数据数组，不含 shape 代理；不要直接把 `analyzeDescendants` 的 `{shape,result}` 放进返回值。
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
// 或：const fill = await penpotUtils.exportImage(shape, "fill", false);
// 注意 exportImage 第二参是 "shape"/"fill"，不是 "png"
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
