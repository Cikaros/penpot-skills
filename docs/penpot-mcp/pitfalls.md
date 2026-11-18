# 避坑与实测基线

> 性质：**硬规则 + 版本差异**。违反多半不报错，但产出是错的。
>
> 实测环境：Penpot `2.18.7`，MCP 只暴露 `execute_code`（2026-11-19）。
> 标注 `[实测]` 的条目在该环境复现过；标注 `[推断]` 的条目来自源码或官方文档，尚未在本环境验证。

## 0. 先探测，再写代码

同一个 API 在不同 Penpot 版本上行为不同。下面的探测一次拿全，后续按结果分支，不要凭记忆写死。

```js
const t = (v) => typeof v;
const probe = (fn) => { try { return fn(); } catch (e) { return "ERR " + e; } };
return {
  version: penpot.version,                       // 例："2.18.7"
  naturalChildOrdering: penpot.flags && penpot.flags.naturalChildOrdering,
  globals: {
    location: t(location), window: t(window), document: t(document),
    atob: t(atob), TextDecoder: t(TextDecoder), Blob: t(Blob), fetch: t(fetch)
  },
  utils: Object.getOwnPropertyNames(penpotUtils)
    .filter(n => !["length", "name", "prototype"].includes(n)),
  user: probe(() => penpot.currentUser ? penpot.currentUser.id : null),
  pages: probe(() => penpotUtils.getPages())
};
```

判读：

- `user` 以 `ERR` 开头且含 `user:read` → 插件没有用户信息权限，**不是未登录**。
- `utils` 里没有 `atob` 但有 `base64ToByteArray` → 用后者解码。
- `naturalChildOrdering === true` → 子元素数组顺序 = 视觉顺序。
- `globals.location === "undefined"` → 不要写 `location.origin`。

## 1. 版本差异速查

| 能力 | 2.18.7 实测 | 旧版 / 官方总览常见写法 | 稳妥做法 |
|---|---|---|---|
| flex 子元素顺序 | `naturalChildOrdering: true`，数组顺序 = 视觉顺序 `[实测]` | "row/column 下顺序相反" | 探测 flag；不确定就用 `insertChild` 后 `waitForLayoutUpdate` 读 `y` 验证 |
| 追加子元素 | `appendChild` 与 `insertChild(n)` 结果一致 `[实测]` | 禁用 `appendChild` | 统一 `insertChild(parent.children.length, shape)` |
| base64 解码 | 原生 `atob` 可用；`penpotUtils.atob` **不存在**；`penpotUtils.base64ToByteArray` 可用 `[实测]` | "插件没有 atob，用 penpotUtils.atob" | 运行时探测，按存在者调用 |
| 布局生效 | 改完子元素后坐标可能全是 0，需 `await penpot.waitForLayoutUpdate()` `[实测]` | "等 100ms" | 优先 await 官方等待函数 |
| `fillImage.data()` | 返回 **Promise** `[实测]` | 当同步数组用 | 一律 `await`（对同步返回值也无害） |
| `shape.export()` | 返回 **Promise\<Uint8Array\>** `[实测]` | 当同步字节用 | 一律 `await` |
| `generateStyle` 选项 | 只认 `includeChildren`；`withChildren` 被静默忽略 `[实测]` | 示例写 `withChildren` | 用 `includeChildren`，并用输出长度验证 |
| 图层名中的 `/` | 写入即归一化为 `" / "` `[实测]` | 用 `home/Home-Default` 并精确匹配 | 改用 `-`/`__`，或比较前归一化 |
| `findShapes(pred)` | **跨所有页面**搜索 `[实测]` | "默认只搜当前页" | 显式传 `root` 限定范围 |
| `analyzeDescendants` | `(shape, fn(root,node), maxDepth?)` → `[{shape,result}]`，不含 root `[实测]` | 当作返回数组/布尔过滤 | 按三元组签名调用，回调返回非空才收集 |
| `penpot.currentUser` | 无 `user:read` 权限时**抛异常** `[实测]` | 当作 null 判断登录 | try/catch，区分"无权限"与"未登录" |
| 执行上下文全局 | `location`/`window`/`document` 均 undefined；`fetch` 存在 `[实测]` | 用 `location.origin` 做预检 | 只用 `penpot.*`，不要碰 DOM/URL |

## 2. 布局与插入

### 2.1 插入位置

```js
// 普通容器：末尾
parent.insertChild(parent.children.length, shape);

// 指定视觉位置（0-based）
parent.insertChild(index, shape);

// 不要依赖 appendChild 的历史语义
```

Penpot 2.18.7 中 `insertChild(0, x)` 把 `x` 放到视觉第一位，`insertChild(2, x)` 放到第三位 `[实测]`。旧版本在 flex 下可能相反，因此**索引含义要用一次小实验确认**，不要跨版本套用。

### 2.2 改完必须等布局

```js
board.insertChild(0, shape);
await penpot.waitForLayoutUpdate();
const y = shape.y;   // 未等待时可能仍是 0
```

`[实测]` 连续插入 3 个矩形后立即读坐标，三者 `y` 都是 0；等待后变为 0/50/100。

### 2.3 手改坐标对 flex 子元素无效

flex/grid 容器的子元素位置由布局系统接管。要调间距用 `rowGap`/`columnGap`/`padding`，要调顺序用 `insertChild`/`setParentIndex`。

### 2.4 相对定位

`x/y` 是页面绝对坐标，`parentX/parentY` 只读。贴到父级内部用：

```js
penpotUtils.setParentXY(shape, 24, 16);
```

### 2.5 board 默认值与创建位置

`[实测]` `penpot.createBoard()` 的默认值：

| 项 | 默认值 |
|---|---|
| 尺寸 | 100 × 100 |
| 名称 | `Board` |
| 填充 | 白色 |
| `clipContent` | **true** |
| `borderRadius` / `shadow` | 0 / 无 |
| flex / grid | 无 |

关键行为：新建的 board **总是落在页面根（Root Frame）**，即使当前选中的是另一个 board。要嵌套必须显式 `parent.insertChild(...)`：

```js
const card = penpot.createBoard();   // parent = Root Frame
cardBoard.insertChild(cardBoard.children.length, card);
```

`addFlexLayout()` 的默认 `dir` 是 `"row"`，`rowGap`/`columnGap`/padding 均为 0 `[实测]`。

### 2.6 `group()` 会反转子元素数组

`[实测]` `penpot.group([a, b])` 后，group 的 `children` 是 `[b, a]`，与传入顺序相反。视觉层级是否保持需用 `y`/重叠色块或导出图核对；不要用 group 后的数组下标反推 z 序。

## 3. 文本

```js
const text = penpot.createText("标题");   // 默认 growType "auto-width"，但宽度只有 1px [实测]
text.fontSize = 20;
text.resize(240, 10);                     // 必须先给宽度；resize 会把 growType 重置为 "fixed"
text.growType = "auto-height";            // 再设 auto-height，高度才会按宽度自然换行
await penpot.waitForLayoutUpdate();
```

- **默认宽度是 1px**。不先 `resize(width, h)` 就设 `auto-height`，文本会按 1px 宽度逐字换行：14px 的 10 个字能测出 152px 高 `[实测]`。
- 同一段文本给到 300px 宽后，高度从 152px 降为 17px `[实测]`。
- 顺序固定：**先 resize（带目标宽度），后设 growType**。
- `fontSize`、`lineHeight`、`letterSpacing`、`fontWeight` 读回来是**字符串**（如 `"16"`、`"1.2"`），计算前先 `parseFloat` `[实测]`。
- `fontFamily` 返回字体 id（如 `sourcesanspro`），不是显示名；查字体用 `penpot.fonts.findByName("Source Sans Pro")` `[实测]`。
- 中文渲染可用（导出 PNG 目视确认），但字体族仍是默认字体，必要时显式指定中文字体。

## 4. 图片与填充

```js
// base64 → 字节（按环境能力分支）
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(b64);

// 上传前守卫（详见 4.2）
const media = await penpot.uploadMediaData("hero.png", bytes, "image/png");
if (!media.width || !media.height) throw new Error("decoded size is zero");

// 挂到 fill，保留原有透明度等属性
const fills = [...shape.fills];
const i = fills.findIndex(f => f.fillImage);
fills[i] = { ...fills[i], fillImage: media };
shape.fills = fills;
```

### 4.1 `data()` 与 `export()` 都是异步

```js
const data = await fill.fillImage.data();          // Uint8Array
const svg  = await shape.export({ type: "svg" });  // Uint8Array
```

`[实测]` 2.18.7 两者都返回 Promise。不要 `data[0]` 直接取下标。

### 4.2 错误页当图片

症状：上传"成功"，但图片空白，读回字节以 `<html` 开头（常见 548 字节）。

```js
const h = Array.from(bytes.slice(0, 4));
const isPng  = h[0] === 0x89 && h[1] === 0x50 && h[2] === 0x4e && h[3] === 0x47;
const isJpeg = h[0] === 0xff && h[1] === 0xd8;
const isGif  = String.fromCharCode(...h.slice(0, 3)) === "GIF";
const isWebp = String.fromCharCode(...h) === "RIFF";
if (!(isPng || isJpeg || isGif || isWebp)) {
  throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0, 8)));
}
```

守卫必须放在**上传前**；上传后再校验 `media.width/height` 作为第二道闸。

### 4.3 上传本身不需要额外 token

`[实测]` `penpot.uploadMediaData` 在插件会话内直接成功，返回正确宽高。401 只出现在手写 `fetch` 调后端接口时——那条路本来就不该走。

### 4.4 SVG 图标

```js
const icon = penpot.createShapeFromSvg(svgText);   // 返回 group，名 "svg"
const path = icon.children.find(c => c.type === "path");
path.strokes = [{ ...path.strokes[0], strokeColor: "#FF0000" }];
```

- `[实测]` 导入后是 group，包含 `base-background`（rectangle）与 `svg-path`（path）两个子元素。
- 给 group 设 `fills` **不会**给子元素上色；要改 path 的 `fills` 或 `strokes`。
- `strokeWidth` 在 stroke 对象上（不是 shape 上）；stroke 可写字段包括 `strokeColor`、`strokeOpacity`、`strokeWidth`、`strokeAlignment`、`strokeCapStart/End`、`strokeColorRefId/File` `[实测]`。

## 5. 查找与遍历

```js
penpotUtils.findShapes(pred)              // 2.18.7：跨所有页面 [实测]
penpotUtils.findShapes(pred, page.root)   // 限定页面（推荐）
penpotUtils.findShape(pred)               // 跨页面，返回第一个
penpotUtils.findShapeById(id)             // 按 id，跨页面
```

- **默认范围会随版本变化**，跨页逻辑一律显式传 `root`。
- 名称含 `/` 时，写入被归一化成 `" / "` `[实测]`：`btn/Primary` 读回是 `btn / Primary`。精确匹配前先归一化：

```js
const norm = (s) => s.replace(/\s*\/\s*/g, "/");
const hit = penpotUtils.findShapes(s => norm(s.name) === "btn/Primary", page.root);
```

- `analyzeDescendants(root, fn, maxDepth?)` 的真实签名 `[实测]`：

```js
const issues = penpotUtils.analyzeDescendants(board, (root, node) => {
  return penpotUtils.isContainedIn(node, root) ? null : { name: node.name, x: node.x, y: node.y };
});
// → [{ shape, result }]，只包含回调返回非空的节点；root 自身不在结果里
```

- `shapeStructure(shape, depth?)` 返回 `{id,name,type,children}` 树，适合先看 2–3 层。

## 6. 样式与代码生成

```js
const css = penpot.generateStyle([board], { type: "css", includeChildren: true });
```

- 只认 `includeChildren`；`withChildren` 不生效也不报错 `[实测]`（同一画板：true 1230 字符，false 158 字符，`withChildren:false` 仍是 1230）。
- 输出里的颜色是 8 位十六进制（如 `#ff0000FF`），转代码时按目标平台转换。
- `generateCss` 内部可能切换当前页，调用前记录 `penpot.currentPage.id`，必要时切回 `[推断]`。

### 6.1 Token 与库颜色

```js
const lib = penpot.library.local;
const color = lib.createColor();          // 成功，加入本地库 [实测]
color.name = "color-brand-primary";
color.color = "#3366FF";

// ❌ 直接把 LibraryColor 对象塞进 fills 会报 Value not valid
// ✅ 用 hex + ref 字段绑定，三者缺一不可
shape.fills = [{
  fillOpacity: 1,
  fillColor: color.color,
  fillColorRefId: color.id,
  fillColorRefFile: penpot.currentFile.id
}];
```

- `fill` 的可写字段包括 `fillColor`、`fillOpacity`、`fillColorRefId`、`fillColorRefFile`、`fillImage` `[实测]`。
- `tokenOverview()` 在无 token 时返回 `{}`，不要把它当作“库为空”的唯一依据，直接查 `penpot.library.local.colors` 更可靠 `[实测]`。
- grid 布局对象的 `columns`/`rows` 在本版本是只读 getter，直接赋值会报 `only a getter` `[实测]`；需要网格时先确认当前版本是否提供写入方法。

### 6.2 阴影、模糊、圆角、透明度

```js
shape.shadows = [{
  style: "drop-shadow",
  offsetX: 0, offsetY: 4, blur: 12, spread: 0,
  color: { color: "#000000", opacity: 0.12 }   // 必须是嵌套对象
}];
shape.blur = { value: 6 };                     // 也是对象，不是数字
shape.opacity = 0.5;
shape.borderRadius = 12;                       // 也可用四角独立属性
```

- `[实测]` 属性名是 **`shadows`**（复数）；写 `shape.shadow` 会报 `object is not extensible`。
- 阴影颜色必须写成 `{ color, opacity }`；写成 `color:"#000" + opacity` 时 opacity 被忽略，统一存 0.2 `[实测]`。
- `shape.blur` 需要 `{ value }`；直接赋数字会被忽略，存回默认 4 `[实测]`。
- 圆角可统一 `borderRadius`，也可用 `borderRadiusTopLeft/TopRight/BottomRight/BottomLeft` `[实测]`。

## 7. 执行环境与工具面

- `[实测]` 执行上下文没有 `location`/`window`/`document`；写 `location.origin` 会直接 `Cannot read properties of undefined`。
- `[实测]` `fetch` 存在，但没有会话凭据；不要用它读 `/api/rpc/*` 或 `/assets/*`。
- `[实测]` 部分部署只暴露 `execute_code`，没有 `high_level_overview`/`export_shape`/`import_image`。工具清单以当前会话为准，缺工具时用 `shape.export()` + 返回字节长度自证，而不是假设工具坏了。
- 单次调用 30 秒硬超时；超时即失败。
- 返回值会被 JSON 序列化：只返回 `{id,name,x,y,width,height}` 之类的纯数据，不要返回 shape 代理对象。
- 不要返回**函数值**（如某些 `isComponentInstance` 方法）：会直接报 `message could not be cloned` / `structuredClone` 失败。返回前用 `typeof v === "function" ? "function" : v` 过滤 `[实测]`。
- `shape.export({type:"png", scale:2})` 支持缩放；`scale:2` 的字节数约为 1 倍时的 2.1 倍 `[实测]`。`type:"svg"` 返回以 `<svg` 开头的 UTF-8 字节 `[实测]`。
- 页面可 `penpot.createPage()` 后直接 `page.remove()`，不会切换当前页 `[实测]`；适合做临时验收页。
- 跨调用状态放 `storage`；普通变量不保留。

## 8. 验收清单

- [ ] 子元素都在父容器内（含 `clipContent` 的 board）
- [ ] 没有 0 宽/0 高、没有负尺寸
- [ ] 文本 `growType` 为 auto，且在实际布局后复读过尺寸
- [ ] 遮挡顺序符合预期
- [ ] 颜色/字号来自 token 或现有样式
- [ ] 图片 `fillImage` 存在，字节头正常，`media.width/height` 非 0
- [ ] 每个改动过的画板都导出过 PNG 并目视确认
