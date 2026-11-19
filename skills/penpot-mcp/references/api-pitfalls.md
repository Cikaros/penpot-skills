# Penpot Plugin API 陷阱清单（紧凑版）

> 实测基线：Penpot `2.18.7`，2026-11-19。跨版本使用前先跑 `pitfalls.md` 第 0 节的探测。
> 只列**会静默产出错误设计**的点；每条都给出可执行的替代写法。

## 0. 探测模板

```js
const t = v => typeof v;
return {
  version: penpot.version,
  naturalOrder: penpot.flags?.naturalChildOrdering,
  globals: { location: t(location), atob: t(atob), TextDecoder: t(TextDecoder), Blob: t(Blob) },
  utils: Object.getOwnPropertyNames(penpotUtils).filter(n => !["length","name","prototype"].includes(n)),
  user: (() => { try { return penpot.currentUser?.id ?? null; } catch (e) { return "ERR " + e; } })()
};
```

## 1. 层级与插入

```js
// ✅ 统一用 insertChild，索引 = 视觉位置（2.18.7 实测）
parent.insertChild(parent.children.length, shape);  // 末尾
parent.insertChild(0, shape);                       // 最前
parent.insertChild(2, shape);                       // 第三位

// ⚠️ 旧版 flex 下索引可能反向；不确定就先插一个测试块，等待布局后读 y
```

- `parent = null` 表示页面根。
- `createBoard()` 默认 100×100、名称 `Board`、白底、`clipContent=true`，并且**总是加到页面根**，不会自动嵌到当前 board；要嵌套必须 `insertChild`（实测）。
- `addFlexLayout()` 默认 `dir="row"`，间距/padding 全为 0（实测）。
- 删除用 `shape.remove()`；`remove()` 不是“移动”。
- reparent 后绝对坐标保留，要贴边再 `setParentXY`。
- `penpot.group([a,b])` 后的 `children` 顺序会反转（实测），不要用下标反推 z 序。

## 2. 几何与布局

| 属性 | 读写 | 改法 |
|---|---|---|
| `x` / `y` | 可写（页面绝对坐标） | 直接赋值 |
| `width` / `height` | **只读** | `resize(w, h)` |
| `bounds` | 只读 | `x/y` + `resize()` |
| `parentX/parentY` | 只读 | `penpotUtils.setParentXY(shape, px, py)` |

```js
board.insertChild(0, shape);
await penpot.waitForLayoutUpdate();   // 不等就读，坐标可能全是 0（实测）
```

- flex/grid 子元素坐标由布局接管，手改 `x/y` 无效。
- `penpotUtils.getBounds(shape)` 返回页面绝对坐标 `{x,y,width,height}`（实测）。
- `penpotUtils.addFlexLayout(shape, "row" | "column")` 会按现有 x/y 排序后建立布局（源码可见）。

### 2.1 对齐与分布

```js
penpot.alignHorizontal(shapes, "left");   // left | center | right
penpot.distributeHorizontal(shapes);
```

- 对齐只改坐标，不改尺寸（实测）。
- 分布按等间距：40/60/30 宽、x=0/100/250 的三个块，中间块被移到 115，两侧间隙均 75（实测）。
- 所有元素 x 相同时分布结果退化，先错开再调用。

## 3. 文本

```js
const text = penpot.createText("内容");  // 默认 auto-width，但宽度只有 1px（实测）
text.resize(240, 10);                    // 必须先给宽度
text.growType = "auto-height";           // 后设 growType，否则被重置为 fixed
text.fontSize = 16;
```

- 不先 resize 就设 `auto-height`：文本按 1px 宽逐字换行，14px 的短句可高达 152px（实测）；给 300px 宽后回到 17px。
- `resize()` 必然把 `growType` 重置为 `"fixed"`（实测）。
- 自动尺寸异步生效：`await penpot.waitForLayoutUpdate()` 后再读宽高。
- `fontSize`/`lineHeight`/`letterSpacing`/`fontWeight` 读回是字符串，计算前 `parseFloat`。
- 中文用 `penpot.fonts.findByName("Noto Sans SC")`（实测可用，`gfont-noto-sans-sc`）；系统字体名如 `Microsoft YaHei` 返回 `null`。设置时同时写 `fontId`/`fontVariantId`/`fontFamily`。
- 溢出优先查“宽度是否给对”与 `growType`，不要先缩字号。

## 4. 图片与填充

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(b64);

// 上传前魔数守卫
const h = Array.from(bytes.slice(0, 4));
const ok = (h[0] === 0x89 && h[1] === 0x50) || (h[0] === 0xff && h[1] === 0xd8)
        || String.fromCharCode(...h.slice(0,3)) === "GIF"
        || String.fromCharCode(...h) === "RIFF";
if (!ok) throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0, 8)));

const media = await penpot.uploadMediaData("hero.png", bytes, "image/png");
if (!media.width || !media.height) throw new Error("zero decoded size");
```

- 取原图：`const data = await fill.fillImage.data()`（返回 Promise，实测）。
- 导出：`const out = await shape.export({ type: "png" | "svg" })`（Promise\<Uint8Array\>，实测）。
- 环境差异：2.18.7 有原生 `atob`，**没有** `penpotUtils.atob`，有 `base64ToByteArray`。三者按探测结果选。
- 没有 `TextDecoder`/`Blob`（实测），不要用它们解字节。
- 保留原 fill 的其它属性：`fills[i] = { ...fills[i], fillImage: media }`。

### 4.4 SVG 图标

```js
const icon = penpot.createShapeFromSvg(svgText);   // group：base-background + svg-path
const path = icon.children.find(c => c.type === "path");
path.strokes = [{ ...path.strokes[0], strokeColor: "#FF0000" }];
```

- 给 group 设 `fills` 不会给子元素上色；改 path 的 `fills`/`strokes`。
- `strokeWidth` 在 stroke 对象上。

## 5. 查找工具的真实语义

```js
penpotUtils.findShapes(pred)             // 2.18.7 跨所有页面（实测），旧版可能只搜当前页
penpotUtils.findShapes(pred, page.root)  // 推荐：显式限定
penpotUtils.findShape(pred)              // 跨页面，返回第一个
penpotUtils.findShapeById(id)            // 按 id
penpotUtils.analyzeDescendants(root, fn, depth?)
```

- `analyzeDescendants` 的签名是 `(shape, callback(root, node), maxDepth?)`，返回 `[{shape, result}]`，**不含 root 自身**（实测）。回调返回 `null/undefined` 的节点会被丢弃。
- 名称里的 `/` 写入即变成 `" / "`（实测）：`btn/Primary` → `btn / Primary`。精确匹配前归一化，或改用 `-`。
- `isContainedIn(child, parent)` 只比几何包围盒，不代表后代不溢出。
- `generateCss` 可能切换当前页（推断），调用前记录 `currentPage.id`。

## 6. 库与组件

```js
const lib = penpot.library.local;
const cmp = lib.components.find(c => c.name.includes("Button"));
const inst = cmp.instance();
cmp.mainInstance();
```

- 本地库 `penpot.library.local`，已连接库 `penpot.library.connected`。
- 新建颜色/字体/组件：`createColor()` / `createTypography()` / `createComponent(shapes)`。
- 优先用组件实例，不要复制形状仿造。
- `generateStyle` 只接受 `type:"css"`；`generateMarkup` 接受 `html`/`svg`（实测）。
- grid 的 `columns`/`rows` 只读，`push` 也无效；用 flex 或绝对定位（实测）。
- `shapesColors([board])` 返回 `{color, opacity, shapesInfo}` 列表；`replaceColor(shapes, {color}, {color})` 的两个颜色参数必须是对象，传字符串报 `Value not valid`（实测）。

### 6.1 颜色 token 绑定（2.18.7 实测）

```js
const color = penpot.library.local.createColor();
color.name = "color-brand-primary";
color.color = "#3366FF";

shape.fills = [{
  fillOpacity: 1,
  fillColor: color.color,                       // hex
  fillColorRefId: color.id,                     // 必填
  fillColorRefFile: penpot.currentFile.id       // 必填
}];
```

- 直接把 `color` 对象赋给 `fillColor` 会报 `Value not valid`。
- `tokenOverview()` 在无 token 时返回 `{}`；以 `library.local.colors` 为准。

### 6.2 阴影/模糊/圆角

```js
shape.shadows = [{ style: "drop-shadow", offsetX: 0, offsetY: 4, blur: 12, spread: 0,
  color: { color: "#000000", opacity: 0.12 } }];
shape.blur = { value: 6 };
shape.opacity = 0.5;
shape.borderRadius = 12;
```

- 属性是 `shadows`（复数）；写 `shadow` 报 `object is not extensible`。
- 阴影透明度必须放在 `color.opacity`，外层 `opacity` 被忽略（实测存 0.2）。
- `blur` 必须是 `{ value: n }`，直接赋数字被忽略。

### 6.3 排版 token

```js
const typo = penpot.library.local.createTypography();
typo.name = "font-body";
typo.fontSize = "16";
typo.lineHeight = "1.5";

text.fontId = typo.fontId;
text.fontVariantId = typo.fontVariantId;
text.fontSize = typo.fontSize;
text.fontWeight = typo.fontWeight;
text.lineHeight = typo.lineHeight;
```

- `text.typography = typo` 报 `object is not extensible`，只能逐字段复制（实测）。
- `generateFontFaces([text])` 返回 Promise<string>，含 `@font-face` 与字体绝对 URL（实测）。
- `findTokensByName` 不索引排版 token，查 `library.local.typographies`。
- `createVariantFromComponents` 对 shape 代理/ID 数组都报 `Value not valid`（实测），暂时用独立组件模拟变体。

## 7. 执行环境

- 无 `location`/`window`/`document`（实测）；`location.origin` 会直接抛错。
- 无模块作用域，不要写 `import`/`export`。
- 跨调用状态放 `storage`。
- 返回值走 JSON 序列化；返回 id/name/数值，不返回 shape 对象。
- 不要返回函数（如某些 `isComponentInstance` 方法），否则 `structuredClone` 失败，报 `message could not be cloned`（实测）。
- `shape.export({type:"png", scale:2})` 支持缩放；`type:"svg"` 返回 UTF-8 字节（实测）。
- 临时验收页可 `createPage()` → 断言 → `page.remove()`，不会切换当前页（实测）。
- `openPage(page)` 返回 Promise，必须 `await`；否则目标页未激活，写入报 `Cannot modify a page that is not currently active`（实测）。
- 单次 30 秒硬超时；批量操作分片、可重入。
- 只暴露 `execute_code` 的部署里，没有 `export_shape`/`import_image`；用 `shape.export()` 与 `uploadMediaData` 替代。
