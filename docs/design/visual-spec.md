# 视觉规范基线

> 性质：**默认基线**。产品可覆盖；覆盖时在本文件追加一节"项目覆盖"，不要口头约定。

## 1. 间距：4pt 体系

| Token | 值 | 典型用途 |
|---|---|---|
| `space/4` | 4 | 图标与文字、行内间隙 |
| `space/8` | 8 | 紧凑元素间距 |
| `space/12` | 12 | 表单内部 |
| `space/16` | 16 | 卡片内边距、列表项 |
| `space/24` | 24 | 区块内分组 |
| `space/32` | 32 | 区块之间 |
| `space/48` | 48 | 大区块 |
| `space/64` | 64 | 页面分区 |
| `space/96` | 96 | 首屏留白 |

规则：只允许上表取值；不允许 13、18、22 这类"看着差不多"的数。

## 2. 字阶

| Token | 字号 | 行高 | 用途 |
|---|---|---|---|
| `font/display` | 40 | 1.1 | 首屏主标题 |
| `font/h1` | 32 | 1.2 | 页面标题 |
| `font/h2` | 24 | 1.3 | 区块标题 |
| `font/h3` | 20 | 1.4 | 卡片标题 |
| `font/body` | 16 | 1.6 | 正文 |
| `font/body-s` | 14 | 1.6 | 次要正文 |
| `font/caption` | 12 | 1.5 | 说明、标签 |

- 中文正文行高不低于 1.6；英文可用 1.5。
- 同屏字号层级不超过 4 档。
- 字重只用 400 / 500 / 600；不用 300（浅色背景不可读）。

## 3. 颜色角色

按角色命名，不按色值命名：

| Token | 用途 |
|---|---|
| `color/bg/canvas` | 页面底色 |
| `color/bg/surface` | 卡片、弹层 |
| `color/bg/subtle` | 次级填充、hover 底 |
| `color/text/primary` | 主文本 |
| `color/text/secondary` | 次要文本 |
| `color/text/disabled` | 禁用文本 |
| `color/border/subtle` | 分隔线、边框 |
| `color/brand/primary` | 品牌主色、主按钮 |
| `color/state/success` `warning` `danger` `info` | 状态 |

规则：

- 一个界面品牌色占比不超过 10%，否则层级消失。
- 状态色只用于状态，不做装饰。
- 深色模式不是简单反色：surface 与 canvas 的对比要重新调。

## 4. 圆角与阴影

| Token | 值 | 用途 |
|---|---|---|
| `radius/4` | 4 | 标签、输入框 |
| `radius/8` | 8 | 按钮、卡片 |
| `radius/12` | 12 | 弹层 |
| `radius/16` | 16 | 大卡片 |
| `radius/full` | 999 | 胶囊、头像 |

阴影只保留三级：`shadow/1`（卡片）、`shadow/2`（悬浮）、`shadow/3`（弹层）。同一屏不超过两级同时出现。

## 5. 栅格与断点

| 端 | 列 | 槽宽 | 边距 | 内容最大宽 |
|---|---|---|---|---|
| Mobile | 4 | 16 | 16 | 不限 |
| Tablet | 8 | 24 | 24 | 不限 |
| Desktop | 12 | 24 | 32 | 1200–1440 |

- 断点来自实际设计稿的 board 宽度，不要凭空发明。
- 移动端基准稿 390×844；桌面 1440×900。
- 内容区超过最大宽时居中，不拉伸卡片。

## 6. 图标与状态

- 图标 24×24 为主，行内可用 16×16；描边 1.5–2px。
- 交互状态必须齐五态：default / hover / pressed / focus / disabled。
- 禁用态用透明度或 `text/disabled`，不要只改颜色导致对比度不足。
- 加载态必须有，且不能改变布局尺寸（用占位骨架）。

## 7. 反例

- 13px 字号、18px 间距这类非标数值。
- 卡片圆角 8、按钮圆角 10 这种"差一点"的不一致。
- 用阴影表达层级，同时又用边框表达层级。
- 一屏出现 3 种以上灰色文字。

## 8. Penpot 字段映射（2.18.7 实测）

规范里的 token 落到 Penpot 插件 API 时，按这张表写：

> 表中的 `space/4` 等是**规范标识**；落到 Penpot 图层/颜色名时改写为 `space-4`，不要直接带 `/`（会被归一化成 `" / "`）。

| 规范项 | Penpot 字段 / 写法 |
|---|---|
| 间距 | `x/y` 或 `penpotUtils.setParentXY`；flex 用 `rowGap`/`columnGap`/padding |
| 字阶 | `fontSize`/`lineHeight`/`fontWeight`；先 `resize(width,h)` 再 `growType="auto-height"` |
| 中文字体 | `findByName("Noto Sans SC")`，写 `fontId`+`fontVariantId`+`fontFamily` |
| 颜色角色 | `fills:[{fillColor, fillColorRefId, fillColorRefFile}]`，三者缺一不可 |
| 圆角 | `borderRadius`，或四角独立 `borderRadiusTopLeft` 等 |
| 阴影 | `shadows:[{style,offsetX,offsetY,blur,spread,color:{color,opacity}}]` |
| 模糊 | `blur:{value:n}` |
| 图标 | `createShapeFromSvg`，改子 `path.strokes`/`fills` |
| 断点 | 用 board 宽度表达；插件 API 的 grid `columns` 只读，不要用它做栅格 |
| 组件五态 | `createComponent` 主组件 + `instance()`，实例只覆盖文本/图标 |

> 以上字段在 2.18.7 上逐项验证；跨版本先跑 `docs/penpot-mcp/pitfalls.md` 第 0 节探测。