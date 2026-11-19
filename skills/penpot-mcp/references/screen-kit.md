# 多屏原型搭建方法

> 性质：**方法约束，不是主题/风格/布局模板**。颜色、字体、圆角、密度、品牌语气都由项目 token 与业务决定；本文只固定“怎样把多屏做成可导航、可检查、可复现的原型”。
>
> 依据：Penpot `2.18.7` 真实文件多屏原型的操作经验；API 细节见 [`api-pitfalls.md`](api-pitfalls.md)，代码骨架见 [`recipes.md`](recipes.md)。

## 1. 先画屏幕图，再画屏幕

### 1.1 屏幕清单

动手前先列一张表，一行一个屏幕或状态：

| 字段 | 要写清的内容 |
|---|---|
| 名称 | `area-Screen-State`，与最终 board 名一致 |
| 入口 | 从哪个屏幕、哪个控件进入 |
| 出口 | 返回哪里；完成后去哪里 |
| 类型 | 主路径 / 次级页 / 状态页 / 弹层 |
| 数据 | 依赖哪些示例数据；与哪些屏幕共享 |

清单写不出来，说明信息架构还没有定；此时不要用“先画一版看看”代替结构决策。

### 1.2 可达性契约

- 先定 **一条主流程**，只把真正需要演示的路径接进去。
- 次级页必须有明确返回；不要留下只能靠浏览器后退的死路。
- 底部/顶部导航的 **当前项不接自跳**；点击当前 tab 不产生导航，避免原型循环刷新。
- 状态页可以不在主流程上，但要在清单里标明“这是状态，不是入口”；不要假装它可从主路径到达。
- 同一个控件只承担一个明确动作；一个卡片不要既像入口又像纯展示。

### 1.3 可点击暗示必须兑现

如果列表项画了箭头、按钮态、悬浮阴影，就已经向用户承诺“可以点”。

- 要么接上行为；
- 要么去掉箭头/按钮态，明确它只是展示；
- 只做一个详情样例时，**不要把所有同类卡片都接到同一个带具体标题的详情页**。这会让用户点“工作”却看到“生活”的内容。未接的卡片应降低可点击暗示，并在交付说明里标为示例。

## 2. 画板、坐标与贴底区域

### 2.1 统一屏幕框架

- 同一组屏幕使用同一尺寸；移动端原型先固定一个设备框，不在这里讨论响应式断点。
- 所有屏幕 `y` 对齐，按 `x = 上一个 board.x + board.width + gap` 横向排列。
- 一屏一个 board；不要用 group 冒充屏幕。

### 2.2 子元素坐标是页面绝对坐标

Penpot 的 shape `x/y` 是**页面绝对坐标**，不是相对 board 的局部坐标。board 放在 `x=1200` 时，局部 `16` 必须写成 `1200 + 16`。

推荐两种写法，二选一，不要混用：

```js
// A. 直接使用绝对坐标
shape.x = board.x + localX;
shape.y = board.y + localY;

// B. 用父级相对定位工具
penpotUtils.setParentXY(shape, localX, localY);
```

如果先按局部坐标建好子元素、最后统一平移，只能平移一次：

```js
for (const child of board.children) child.x += board.x;
```

再次执行同一段代码会把所有元素推到屏幕外。实际项目里出现过“board 已在 4,230，标签又写成 292.5”的情况，读回局部坐标变成 `-3,937.5`；这不是布局算法坏了，而是坐标基准混用了。

### 2.3 贴底栏必须贴住底边

固定底栏、工具条、安全区不是“内容下面再加一块”，而是从屏幕底部反推：

```js
const barHeight = 80;
const bar = penpot.createRectangle();
bar.name = "nav-bar";
board.appendChild(bar);
bar.x = board.x;
bar.y = board.y + board.height - barHeight;
bar.resize(board.width, barHeight);

// 验收：不允许存在无法解释的悬空
if (bar.y + bar.height !== board.y + board.height) {
  throw new Error("bottom bar is not anchored to the board bottom");
}
```

- 底栏内部再放 Home Indicator、按钮或安全区；不要把它们放到 board 之外的另一个 board。
- 内容区最后一项的底边应小于或等于底栏顶边，不要被底栏遮住。
- 底栏高度由设计系统/设备安全区决定，不要用“内容刚好结束的位置”倒推。

### 2.4 等分导航的 1px 规则

四等分不是“每项写 98”，而是：

```js
const unit = board.width / 4;          // 390 / 4 = 97.5
const x = index * unit;
```

- 每个 item 的 `x + width` 必须精确等于下一个 item 的 `x`，最后一项等于 `board.width`。
- 文本容器不能比 item 宽；`x=293, width=98` 在 390 宽 board 上会多出 1px。
- 这类 1px 越界在导出图上几乎看不见，但会被 `clipContent` 裁掉，也会让几何巡检失败；必须用数值验收，不要只靠目视。

## 3. 共享界面壳与批量搭建

### 3.1 抽小函数，不复制整段代码

状态栏、底栏、卡片、图标、文本样式应在一次会话里复用同一组 helper：

```js
function addText(board, name, value, x, y, width, typographyName, color) {
  const text = penpot.createText(value);
  text.name = name;
  board.appendChild(text);
  text.x = board.x + x;
  text.y = board.y + y;
  text.resize(width, 10);
  text.growType = "auto-height";

  // 从项目 typography token 逐字段复制，不写死字号
  const spec = penpot.library.local.typographies.find(t => t.name === typographyName);
  if (!spec) throw new Error("missing typography token: " + typographyName);
  text.fontId = spec.fontId;
  text.fontVariantId = spec.fontVariantId;
  text.fontSize = spec.fontSize;
  text.fontWeight = spec.fontWeight;
  text.lineHeight = spec.lineHeight;
  text.fills = [{ fillColor: color, fillOpacity: 1 }];
  return text;
}
```

helper 只负责**结构和顺序**，不把品牌色、字号、圆角写死；这些仍从 token 读取。

### 3.2 分片执行

- 一次 `execute_code` 只建 2–3 屏，或一个明确的区块；不要在一次调用里生成整个文件。
- 先建屏幕壳和固定底栏，再填内容，最后统一接线。
- 每片结束返回 `{id, name, children, x}` 这类纯数据，下一片按 id 复用。
- 大批量操作前先留一个可回滚的 board/页面；不要在唯一真实文件上做不可逆全量重排。

### 3.3 示例数据要跨屏一致

- 同一张纸条的标题、标签、日期、计数在列表、详情、搜索结果里应一致；不一致会让原型显得不可信。
- 计数（如“12 张纸条”）要么由同一份示例数据推导，要么在交付说明里明确是占位。
- 图片、头像、状态文案同理；不要在 A 屏叫“林小满”，B 屏又叫“小林”。

## 4. 交互接线

### 4.1 命中层

- interaction 挂在**具体 shape** 上，不挂在“屏幕”这个概念上。
- 视觉元素本身可点时直接挂；视觉元素太薄或会被子元素遮挡时，加透明命中层：

```js
const surface = penpot.library.local.colors.find(c => c.name === "color-bg-surface");
if (!surface) throw new Error("missing color token: color-bg-surface");

const hit = penpot.createRectangle();
hit.name = "nav-hit-home";
board.appendChild(hit);
hit.x = board.x;
hit.y = 764;
hit.resize(97.5, 80);
hit.fills = [{
  fillColor: surface.color,
  fillOpacity: 0.001,          // 极低透明度，保留命中区域
  fillColorRefId: surface.id,
  fillColorRefFile: penpot.currentFile.id
}];
```

- 命中层放在视觉层的上方，但不要盖住需要单独点击的子控件。
- 命中层命名统一 `*-hit-*` 或 `btn-*`，便于验收时按名字统计。

### 4.2 一个一个接，可重入

```js
function link(shape, target) {
  if (shape.interactions.length) return { name: shape.name, existing: true };
  shape.addInteraction("click", { type: "navigate-to", destination: target });
  return { name: shape.name, to: target.name };
}
```

- 接线前判断 `shape.interactions.length`，避免重复录制。
- 一次只接一个方向；返回 `{from,to}` 纯数据，最后统一读回。
- 当前 tab、当前页的“返回当前页”不要接，保留 no-op。

### 4.3 保持单条主流程

真实文件实测：给一个还不在主流程可达子图中的 board 首次加 interaction，Penpot 可能为它自动新建一条 flow；即使页面里已经有 `小纸条-主流程`，也会出现 `Flow 1` / `Flow 2`。

```js
for (const flow of [...penpot.currentPage.flows]) {
  if (flow.name !== "主流程") penpot.currentPage.removeFlow(flow);
}
```

- 先接线，再清理额外 flow，最后复读 `page.flows`。
- `removeFlow` 删的是 flow，不是 shape 上的 interaction；清理后要复读交互数，确认没有误删。
- 单一路径只保留一条主流程；多起点/多流程是另一个设计决策，不要因为自动创建而默认接受。

## 5. 验收顺序

1. **结构**：board 数、尺寸、命名、层级是否符合屏幕图。
2. **几何**：逐 board 检查直接子元素越界；贴底栏 `bottom === board.bottom`；等分项首尾相接。
3. **视觉**：每个新 board 导出 PNG 并目视检查；重点看遮挡、留白、底栏、次级页返回、状态页。
4. **交互数据**：读回 interaction 数和 flow 数；确认没有重复、没有自跳、没有多余 flow。
5. **实际点击**：在 view mode 或真实浏览器点一遍；没有点击证据时，只能写“数据层通过”，不能写“流程可用”。

停止条件：屏幕图里的必需路径都能走通，几何/视觉/数据验收无回归；不要为了“再精致一点”继续加未要求的屏幕。

## 6. 反模式

| 现象 | 根因 | 处理 |
|---|---|---|
| 子元素全跑到屏幕外/负坐标 | 把局部坐标写进了绝对 `x/y` | 加 `board.x/y`，或改用 `setParentXY` |
| 底栏和屏幕底边有缝 | 用内容高度或固定 `y` 推底栏 | 从 `board.height - barHeight` 反推 |
| 右侧总有一条细裁切 | 等分项文本比 item 宽 1px | 用 `width/n` 精确算，文本宽度不超过 item |
| 一套原型出现多条 flow | 给不可达 board 加 interaction 自动建 flow | 接线后删除额外 flow，复读 flow 数 |
| 点“工作”看到“生活”详情 | 多张卡共用了一个具体标题的详情页 | 做通用详情，或只接一个样例并去掉其它可点击暗示 |
| 截图上没问题，交付后元素被裁 | 只目视，没做直接父容器几何检查 | 逐层检查 `parentX/parentY` 与父尺寸 |
| 数据层通过就宣称可点击 | 没在 view mode 实际点 | 分开记录“数据/视觉/点击”三种证据 |

## 7. 交付清单

- [ ] 屏幕清单、入口/出口、状态页边界已写清
- [ ] 主流程只有一条；次级页有返回；当前 tab 不自跳
- [ ] 所有 board 同尺寸、同 `y`，横向间距符合项目约定
- [ ] 所有子元素使用统一坐标基准，无负坐标/越界
- [ ] 贴底栏 `y + height === board.bottom`，内容不被遮挡
- [ ] 等分项 `x + width` 首尾相接，无 1px 裁切
- [ ] 可点击外观都有行为，或已明确降级为展示
- [ ] 示例数据跨屏一致，计数/标题/标签能互相解释
- [ ] 每个新 board 已导出目视；几何、交互数据已读回
- [ ] 实际点击未验证时，交付说明明确标注
