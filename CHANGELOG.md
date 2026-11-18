# Changelog

遵循语义化版本：`vMAJOR.MINOR.PATCH`。

- MAJOR：规范出现不兼容变更（既有用法需要改写）
- MINOR：新增技能、文档章节或规范条目
- PATCH：修正错误、补充示例、措辞调整

## v0.5.4

批量查色与换色。

### Added

- `penpot.shapesColors([board])` 返回 `{color, opacity, shapesInfo}` 列表，可审计配色。
- `penpot.replaceColor(shapes, {color}, {color})` 可批量换色；两个颜色参数必须是对象，传十六进制字符串报 `Value not valid`。

## v0.5.3

设计转代码一致性。

### Added

- `generateStyle` 的 CSS 类名与 `generateMarkup` 的 HTML 类名共用同一基类（39 个 HTML 类中 29 个与 CSS 重合），可直接配对；HTML 额外带语义类。
- 从 CSS 提取类名需过滤纯数字，避免把 `.2em` 误识别为类名。

## v0.5.2

设计规范与 Penpot 字段打通。

### Added

- `docs/design/visual-spec.md` 新增“Penpot 字段映射”：间距、字阶、中文字体、颜色 token、圆角、阴影、模糊、图标、断点、组件五态。

## v0.5.1

中文字体实测。

### Added

- `penpot.fonts.findByName("Noto Sans SC")` 可用（`gfont-noto-sans-sc`，9 个字重）；`Microsoft YaHei`/`PingFang SC`/`Source Han Sans` 返回 `null`。
- 设置中文字体需同时写 `fontId`/`fontVariantId`/`fontFamily`，改完字体后可能需要再等待一次布局。

## v0.5.0

实测结论收敛到 README。

### Added

- README 新增“实测覆盖（Penpot 2.18.7）”表：连接、布局、文本、图片、token、样式、组件、导出、代码生成、grid 限制与查找语义。

## v0.4.6

配方端到端验证。

### Verified

- 按 `recipes.md` 原样执行：幂等建区块、文本块、颜色 token、PNG 导出 4 项断言全部通过，验收页自动删除。

## v0.4.5

代码生成类型与网格限制。

### Added

- `generateStyle` 只接受 `type:"css"`；`generateMarkup` 接受 `html`/`svg`，其它类型报 `Value not valid`。
- grid 的 `columns`/`rows` 只读，`push` 静默无效；本版本用 flex 或绝对定位。

## v0.4.4

排版 token 与字体 CSS。

### Added

- `createTypography()` 可建本地排版 token；字段包含 `fontId`/`fontVariantId`/`fontSize`/`fontWeight`/`lineHeight` 等。
- 文本不能按引用挂排版 token（`text.typography` 报 `object is not extensible`），只能逐字段复制。
- `generateFontFaces([text])` 返回 Promise<string>，含 `@font-face` 与字体绝对 URL。
- `findTokensByName` 不索引排版 token，应查 `library.local.typographies`。

## v0.4.3

对齐、分布与组件实例。

### Added

- `alignHorizontal/alignVertical` 用法与只改坐标不改尺寸的行为。
- `distributeHorizontal` 等间距规则；同 x 时结果退化。
- 组件实例文本覆盖只影响实例，主组件不变。

## v0.4.2

样式与图标实测。

### Added

- 阴影属性名是 `shadows`（复数），内层 `color` 必须是 `{color, opacity}`；外层 `opacity` 被忽略。
- `blur` 必须写 `{value: n}`，直接赋数字会被忽略。
- 圆角支持四角独立属性。
- `createShapeFromSvg` 返回 group（`base-background` + `svg-path`）；重着色要改子 path 的 `fills`/`strokes`，`strokeWidth` 在 stroke 对象上。

## v0.4.1

补齐布局默认值与可复现配方。

### Added

- `createBoard()` 默认 100×100、白底、`clipContent=true`，且总落在页面根；嵌套必须 `insertChild`。
- `addFlexLayout()` 默认 `dir="row"`，间距与 padding 全为 0。
- `penpot.group([a,b])` 后 `children` 顺序反转。
- 返回函数值会触发 `message could not be cloned`。
- `shape.export({scale})` 与 SVG 导出实测。
- `createPage()` / `page.remove()` 不依赖当前激活页。

### Refactored

- `references/recipes.md` 重写为 7 段已验证骨架：临时验收页、幂等区块、文本块、图片替换、越界巡检、颜色 token、导出验收。

## v0.4.0

文本链路与端到端页面的实测补充。

### Added

- 文本默认宽度只有 **1px**：不先 `resize(width, h)` 就设 `auto-height` 会逐字换行（14px 短句实测 152px 高，给 300px 宽后回到 17px）。
- 文本数值字段（`fontSize`/`lineHeight`/`letterSpacing`/`fontWeight`）读回为字符串，计算前需 `parseFloat`。
- `fontFamily` 返回字体 id，字体查询用 `penpot.fonts.findByName`。
- 端到端验收：390×844 首页 24 个子元素，10 项包含性检查全通过；中文导出 PNG 目视正常。

### Changed

- 案例 01 的文本创建示例改为“先 resize 宽度，再设 growType”。
- `SKILL.md`、`api-pitfalls.md`、`design-workflow.md` 同步文本新规则。

## v0.3.1

补充 token 与布局实测。

### Added

- 颜色 token 绑定：`fillColor` + `fillColorRefId` + `fillColorRefFile` 三字段写法；直接传 `LibraryColor` 会报 `Value not valid`。
- grid 布局 `columns`/`rows` 在本版本为只读 getter 的记录。
- `tokenOverview()` 无 token 时返回 `{}`，应以 `library.local.colors` 为准。

## v0.3.0

以 Penpot `2.18.7` 实测重写避坑文档与技能规则，改为"先探测、再分支"。

### Changed（不兼容）

- 删除"flex 子元素顺序必然相反"：2.18.7 的 `naturalChildOrdering=true`，数组顺序即视觉顺序；改为运行时探测，不确定时用 `waitForLayoutUpdate` 后读 `y` 验证。
- 删除"插件没有 atob"：2.18.7 原生 `atob` 可用，`penpotUtils.atob` **不存在**，有 `penpotUtils.base64ToByteArray`。
- 删除 `location.origin` 预检：执行上下文没有 `location`/`window`/`document`。
- `findShapes` 改为显式传 `root`：2.18.7 不带根会跨所有页面。
- `analyzeDescendants` 改为真实签名 `(shape, fn(root, node), depth?)`，返回 `[{shape, result}]`。
- 命名分隔符 `/` 改为 `-`：Penpot 把 `btn/Primary` 归一化为 `btn / Primary`，精确匹配失效。
- 图片：`fillImage.data()` 与 `shape.export()` 一律 `await`（均返回 Promise）。
- `generateStyle` 统一用 `includeChildren`（实测 `withChildren` 被静默忽略）。

### Refactored

- `pitfalls.md` 重写为"探测 → 版本矩阵 → 规则 → 验收"，删除逐条追加的编号。
- `SKILL.md` 重写为版本自适应流程，并补充仅暴露 `execute_code` 时的降级做法。
- `references/api-pitfalls.md` 压缩为可扫描清单，与实测基线对齐。
- 案例 01/02/04 同步修正命名、`await`、选项名。

## v0.2.0

案例集与可复用配方。

### Added

- `docs/penpot-mcp/cases/`：四个分步案例
  - `01-homepage-build.md` 分区块搭建首页（分片、幂等、坐标换算）
  - `02-image-repair.md` 图片缺失修复（魔数检测、替换、验收）
  - `03-overflow-fix.md` 子元素越界修复（裁剪判定、先算后改）
  - `04-design-to-code.md` 设计转代码（选项名核对、token 映射）
- `skills/penpot-mcp/references/recipes.md`：三段可直接复用的代码骨架

### Changed

- `pitfalls.md` 新增 P2-4：`generateStyle` 的 `withChildren` / `includeChildren` 选项名不一致

## v0.1.0

首个基线版本。

### Added

- `skills/penpot-mcp`：可安装的 Penpot MCP 操作技能
  - `references/api-pitfalls.md`
  - `references/auth-and-transport.md`
  - `references/design-workflow.md`
- `docs/penpot-mcp/`：使用说明、命名与分组规范、避坑目录、认证排查
- `docs/design/`：设计原则、视觉规范基线、组件规范、简报模板
- 根 `README.md`：内容索引与版本管理约定