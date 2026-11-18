# Changelog

遵循语义化版本：`vMAJOR.MINOR.PATCH`。

- MAJOR：规范出现不兼容变更（既有用法需要改写）
- MINOR：新增技能、文档章节或规范条目
- PATCH：修正错误、补充示例、措辞调整

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