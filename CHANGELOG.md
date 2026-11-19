# Changelog

## Unreleased

### Added

- `docs/design/prototyping.md`：原型问题/假设/保真度/证据/决策模板，形成性测试最小流程与验收。
- `docs/design/states.md`：屏幕级 loading/empty/error/partial/offline/permission/long-text 状态矩阵与命名规则。
- `docs/design/accessibility.md`：WCAG 2.2 AA 设计期基线、设计标注表、Penpot 可查与必须到原型/代码验证的分界。
- `docs/design/usability-test.md`：可用性测试计划、任务写法、主持脚本、指标、严重度与报告模板。
- `docs/design/design-system.md`：Token 分层、组件 API、贡献流程、版本/废弃、Penpot 边界与治理指标。
- `docs/design/ai-collaboration.md`：AI 输入契约、证据边界、评审门、隐私与失败模式。
- `docs/design/tokens.md` + `shared/design-tokens.mjs` + `shared/tokens/example.tokens.json`：DTCG 子集、CSS 变量、颜色后处理与审计；`test/design-tokens.test.mjs` 覆盖别名/循环/8 位 alpha。
- `docs/penpot-mcp/cases/05-prototype-flow.md` + `verification/probes/08-prototype-flow.js`：`addInteraction` / flow 原型流；已在合成页通过 API 结构验收，首次 interaction 自动建 `Flow 1`。
- `pitfalls.md` / `api-pitfalls.md`：补 2.18.7 交互自动创建 flow 的行为与正确清理顺序。
- `scripts/build-site.mjs` + `site/`：零依赖静态文档站与 `site:check`；`verification/probes/09-site-links.mjs` 校验本地链接。
- `verification/probes/07-css-tokenize.mjs`、`10-real-file-baseline.js`：token 后处理探针与真实文件只读基线。
- 案例 04 增加 token 后处理代码、验收项和常见失败；案例 05 补入案例索引。
- README、`principles.md`、`components.md`、`prompt-brief.md`、`COMPASS.md` 增加交叉链接与单一源登记。

### Changed

- `npm run check` 增加 `site:check`；`CONTRIBUTING` 增加站点重建与 token 测试说明。
- `COMPASS` P3 标记为部分完成：静态站与链接探针已落地，浏览器/真实文件 E2E 仍待外部条件。

### Known gaps

- 案例 05 的 API 结构已通过 `[实测-合成页]`；view mode 的实际点击跳转未验证。
- 真实项目文件未访问；V-10 只在 `test-design` 合成文件运行。
- 内置浏览器未恢复；改用系统 Edge headless 完成首页/Token 页视觉冒烟，完整点击 E2E 仍未完成。

遵循语义化版本：`vMAJOR.MINOR.PATCH`。

- MAJOR：规范出现不兼容变更（既有用法需要改写）
- MINOR：新增技能、文档章节或规范条目
- PATCH：修正错误、补充示例、措辞调整

## v0.6.0

工程化第一阶段：先修会误导执行的示例，再建立最小质量门禁、单一源与可复现验证。

### Added

- `docs/engineering/COMPASS.md`：工程化设计罗盘，定义单一源、证据分级、质量门禁与 P0–P3 路线图。
- `shared/penpot-guards.mjs` + `test/guards.test.mjs`：图片完整签名、命名归一化、嵌套越界、空值守卫的纯函数与单测。
- `shared/snippets/image-kind.mjs` + `scripts/sync-snippets.mjs`：canonical 图片签名片段，自动写入 8 个 Markdown 代码块；`penpot-guards` 直接复用同一实现。
- `scripts/build-manifest.mjs` + `skills/penpot-mcp/manifest.json`：技能文件清单与 SHA-256；`doctor.ps1` 校验安装完整性。
- `scripts/check-docs.mjs` + `.github/workflows/check.yml`：链接、围栏、标题编号、禁用模式、片段一致性、manifest、版本一致性的零依赖门禁。
- `scripts/install-skill.ps1` / `doctor.ps1`：带备份、版本戳与安装后检查的技能安装链路。
- `package.json`：`npm run check`、`npm test`、`npm run verify`、`npm run sync`、`npm run manifest`。
- `CONTRIBUTING.md`、`docs/penpot-mcp/glossary.md`、`docs/penpot-mcp/known-unknowns.md`：贡献流程、术语表与已知未知清单。
- `verification/`：运行时/纯函数探针、验证日志、兼容性矩阵与升级回归清单；V-00/V-02/V-04/V-05 已在 2.18.7 合成页执行。
- 实测补记：`waitForLayoutUpdate` 出现过一次超时，随后成对复跑通过；`uploadMediaData` + `fillImage.data()` 用 70 字节 1×1 PNG 验证成功。
- 完整合成页复跑：案例 01（11 区块/390×844/越界 0）、案例 02（扫描/替换/保留 opacity）、案例 03（修复后越界 0）、案例 04（CSS 3040/165、HTML 3643）均已记录。
- 案例 04 token 边界实测：即使 `fillColorRefId` 指向库色 `color-brand-primary`，`generateStyle` 仍输出 `#3366ffFF`、无变量；token 化需要生成后处理。补测 `withPrelude`（147/789 字符，prelude 重复）与 `generateMarkup` SVG（589 字符）。
- 修复案例 01 文本片段漏定义 `board` 的问题，并记录临时页生命周期探针 V-06。

### Fixed

- 案例 01：`home/Home-Default` 改为 `home-Home-Default`；`openPage` 补 `await`；返回值去掉 page/shape 代理。
- 案例 02：显式使用 `penpot.currentPage.root`（官方同时提供等价的 `penpot.root`）；区分 `import_image` 新建图片与 `uploadMediaData` 替换 fill；批量扫描加 30 张上限和逐项错误隔离。
- 案例 03：`sample` 改为纯数据；负坐标纳入可修复范围；去掉用闭包承载修复动作的写法。
- 魔数守卫改为完整 PNG/JPEG/GIF/WEBP 签名，拒绝 WAV/AVI 等 RIFF 容器；改为单一 canonical 片段生成。
- 修正检查器对 `penpot.root` 与 `getPages()` 的误禁：官方 API 同时提供 `penpot.root`/`currentPage.root`，`getPages()` 返回纯对象。
- `pitfalls.md` 第 6 节按 6.1–6.5 重排；`api-pitfalls.md` 的 4.4 改为 4.1。
- `SKILL.md` 预检返回纯数据，补 `waitForLayoutUpdate` 探测与“仅 execute_code 时不能声称目视验收”的说明。

### Changed

- README 增加前置条件、质量门禁、安装脚本、验证入口与工程化入口；`.gitignore` 补 Node/Python 工具目录。
- 统一实例命名与 Token 映射说明：主组件 `cmp-...`、实例图层 `btn-...`；规范 ID 落 Penpot 用 `-`。
- `usage.md` 修正“本仓库没有 package.json”的过时说法；`check-docs` 现覆盖 `verification/` 与 `CONTRIBUTING.md`。

## v0.5.11

导出缩放像素验证。

### Added

- 200×100 画板在 `scale` 1/2/0.5 下导出尺寸分别为 200×100、400×200、100×50（PNG IHDR 实读）。

## v0.5.10

遍历深度语义。

### Added

- `analyzeDescendants` 的 `maxDepth`：`1` 只含直接子级，`2` 含孙级，省略为全量。
- 隔离复现 `openPage` 未 `await` 时的 `Cannot modify a page that is not currently active`。

## v0.5.9

高阶导出封装。

### Added

- `penpotUtils.exportImage(shape, "shape"|"fill", asSvg)`：`shape` 导出渲染图，`fill` 导出原始填充字节；第二参传 `"png"` 会报错。

## v0.5.8

错误信息索引。

### Added

- `pitfalls.md` 新增 11 条报错 → 原因 → 处理对照，覆盖 `location`、`user:read`、`openPage`、`structuredClone`、`object is not extensible`、grid getter、`generateStyle` 类型、`replaceColor`、变体 API、fills、图片解码。

## v0.5.7

页面切换时序。

### Added

- `penpot.openPage(page)` 返回 Promise，必须 `await`；否则向未激活页面写入会报 `Cannot modify a page that is not currently active`。
- `createPage()` 不会自动切换当前页，需显式 `openPage`。

## v0.5.6

命名一致性巡检。

### Fixed

- `components.md` 的组件命名从 `cmp/<domain>/<Component>/<variant>` 改为 `cmp-<domain>-<Component>-<variant>`；实例后缀同步改为 `btn-Primary-Disabled`。
- `prompt-brief.md` 的画板/组件引用改为 `profile-Profile-Default`、`home-Home-Default`、`cmp-base-*`。
- `visual-spec.md` 明确：`space/4` 等是规范标识，落到 Penpot 名称时用 `-`。

## v0.5.5

组件变体 API 实测。

### Added

- `createVariantFromComponents` 在 2.18.7 对 shape 代理与 id 数组都报 `Value not valid`；变体暂用独立组件 + 命名约定模拟。

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