# Penpot Plugin API 陷阱清单

来源：官方 MCP `prompts.yml`（High-Level Overview）+ `PenpotUtils.ts` 实现。只列会**静默产出错误设计**的点。

## 目录
1. 层级与插入
2. 几何与布局
3. 文本
4. 图片与填充
5. 查找工具的真实语义
6. 库与组件
7. 代码执行环境

## 1. 层级与插入

```js
// ✅ 普通容器末尾追加
parent.insertChild(parent.children.length, shape);

// ✅ flex board：按视觉顺序调用，内部插到数组前端
board.appendChild(shape);

// ✅ 指定索引
parent.insertChild(index, shape);   // 0-based

// ❌ 会插到不可预测的位置
parent.appendChild(shape);
board.flex.appendChild(shape);      // flex 布局的 appendChild 同样不可靠
```

- `parent` 为 `null` 表示根形状。
- reparent：`newParent.insertChild(i, shape)`，绝对 `x/y` 保留；要贴到新父级内部时再 `setParentXY`。
- 删除用 `shape.remove()`；`remove()` 不能用来"移动"。

## 2. 几何与布局

| 属性 | 读写 | 改法 |
|---|---|---|
| `x` / `y` | 可写（页绝对坐标） | 直接赋值 |
| `width` / `height` | **只读** | `resize(w, h)` |
| `bounds` | 只读 | `x/y` + `resize()` |
| `parentX/parentY`、`boardX/boardY` | 只读 | `penpotUtils.setParentXY(shape, px, py)` |

```js
// 相对父级定位
penpotUtils.setParentXY(shape, 24, 16);
// 等价于
shape.x = shape.parent.x + 24;
shape.y = shape.parent.y + 16;
```

- 有 flex/grid 的 board，**子元素坐标由布局系统接管**，手改 x/y 无效。调 `rowGap/columnGap/padding` 或 `layoutCell`。
- flex `dir` 为 `row`/`column` 时，`children` 顺序与视觉顺序相反。
- grid 子元素定位是 1-based 行列；`shape.layoutCell` 可在事后调整。

## 3. 文本

```js
text.characters = "内容";
text.fontSize = 16;          // 改字号只动这里
text.growType = "auto-height";
```

- `resize()` 会把 `growType` 置为 `"fixed"`，必须显式改回 `auto-width` / `auto-height`。
- auto 尺寸是异步生效的，读完布局再读 `width/height`（约 100ms 后）。
- 溢出的常见根因：`growType` 被 resize 改掉，而不是字号太大。

## 4. 图片与填充

- `Image` 是遗留类型。现在图片是 **fill**：`shape.fills = [{ fillOpacity: 1, fillImage: imageData }]`。
- 上传：`const media = await penpot.uploadMediaData(name, bytes, "image/png")`，`bytes` 必须是 `Uint8Array`。
- 插件环境**没有 `atob`**，用 `penpotUtils.atob(base64)`。
- 取填充原图：`fill.fillImage.data()`；导出整形状：`shape.export({ type: "png" | "svg" })`。
- `mode:"fill"` 不支持 SVG，且形状必须真的含 `fillImage`。

上传守卫（务必加）：

```js
const head = Array.from(bytes.slice(0, 4));
const ok = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
        || (head[0] === 0xff && head[1] === 0xd8)
        || String.fromCharCode(...head).startsWith("GIF")
        || String.fromCharCode(...head.slice(0,4)) === "RIFF";
if (!ok) throw new Error("source bytes are not an image: " + String.fromCharCode(...bytes.slice(0,5)));
```

以 `<html`、`<!doc`、`{` 开头 → 一定是错误页/JSON 报错，**停止上传**。

## 5. 查找工具的真实语义

```js
penpotUtils.findShapes(pred, root = penpot.root) // 默认只在当前页
penpotUtils.findShape(pred, root = null)         // 默认跨所有页面
penpotUtils.findShapeById(id)                    // 跨所有页面
penpotUtils.analyzeDescendants(root, fn, depth)  // 从 root 的子级开始，不含 root 自身
```

- `findShapes` 与 `findShape` 的默认搜索范围**不对称**，跨页场景必须显式传根。
- `analyzeDescendants` 的回调返回非空值才收集；用它返回"修复函数"再统一执行，比边遍历边改安全。
- `isContainedIn(child, parent)` 只比较几何包围盒，**不代表视觉内容不溢出**（后代可能越界）。
- `generateCss(shape)` 会 `penpot.openPage(page)`，是有副作用的操作。

## 6. 库与组件

```js
const lib = penpot.library.local;
const cmp = lib.components.find(c => c.name.includes("Button"));
const inst = cmp.instance();          // 返回 Shape（常是 Board）
cmp.mainInstance();                   // 主组件形状
```

- 本地库：`penpot.library.local`；已连接：`penpot.library.connected`。
- 新建颜色/字体/组件分别用 `createColor()` / `createTypography()` / `createComponent(shapes)`。
- 优先复用组件实例，不要复制形状来"仿造"组件。

## 7. 代码执行环境

- 代码以 `new Function(...)` 执行，**没有模块作用域**；不要写 `import`/`export`。
- 跨调用状态放 `storage`（`storage.foo = ...`），普通变量会丢。
- 返回值会被 `JSON.stringify(..., null, 2)`，无法序列化的对象（如 shape 本身）只会得到浅层字段；**返回 id/name/数值，不要返回 shape 对象**。
- Toast/通知、`console` 输出都会作为独立字段返回；仍有 30 秒硬超时。
