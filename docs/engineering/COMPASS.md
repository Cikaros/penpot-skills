# 工程化设计罗盘

> 性质：本项目工程化决策的顶层约束。文档、技能、脚本的修改先对齐本文件；局部约定与本文件冲突时，以本文件为准。
>
> 基线：仓库 `v0.6.0`，Penpot `2.18.7`，2026-11-19。

## 1. 北极星

**让每一条 Penpot 操作知识都能被验证、被复用、被安全安装。**

三个结果缺一不可：

| 结果 | 判断标准 |
|---|---|
| 正确 | 示例可执行；规则之间不矛盾；失败不会被静默吞掉 |
| 可维护 | 一个事实只有一个源；改一次，文档、技能、案例同步生效 |
| 可验收 | 每条结论有证据级别；每次发布有可重复的门禁 |

## 2. 设计原则

1. **单一源**：同一事实只允许有一个“所有者文件”。派生副本必须带生成标记，并由脚本校验，不手工维护。
2. **证据分级**：结论必须标注证据级别、Penpot 版本、验证日期；合成页实测不能写成真实文件实测。
3. **示例即测试**：代码块要么可直接运行，要么显式标注“伪代码/占位符”；不允许把未加守卫的片段当成可复制配方。
4. **能力分级**：工具清单以当前会话为准。按“有 `export_shape` / 只有 `execute_code`”分别给出验收路径，不假设可选工具存在。
5. **失败可恢复**：批处理有上限、有游标、有逐项错误隔离；单张图片失败不能中断整批。
6. **小步发布**：一次发布对应一组相关事实；先过门禁，再打标签。
7. **不引入不必要的基础设施**：当前规模优先零依赖脚本；docs 站点、全量内容构建、自动化 E2E 都放到有明确收益之后。

## 3. 目标结构

```text
docs/
  engineering/COMPASS.md      # 本文件：工程化决策入口
  penpot-mcp/                 # 操作知识的 canonical 文档
  design/                     # 设计规范
shared/
  penpot-guards.mjs           # 纯函数：魔数、命名、越界、空值守卫
  snippets/                   # canonical 代码片段（逐步迁移）
skills/
  penpot-mcp/                 # 可安装技能，必须自包含
scripts/
  check-docs.mjs              # 文档与示例的静态门禁
test/
  guards.test.mjs             # 纯函数单测
verification/                 # P2：探针与验证日志
```

约束：

- `skills/penpot-mcp/` 安装到 `~/.sclaw/agent/skills` 后不能依赖仓库内其他路径，所以派生内容必须**生成进技能目录**，不能跨目录引用。
- `shared/` 只放可直接测试的纯函数与 canonical 片段，不放运行时依赖。
- `scripts/` 不引入第三方包；Node 22 内置能力足够。

## 4. 单一源矩阵

| 事实域 | 唯一源（现状） | 派生目标 | 当前状态 |
|---|---|---|---|
| API 行为、版本差异、错误索引 | `docs/penpot-mcp/pitfalls.md` | `skills/penpot-mcp/references/api-pitfalls.md` | 手工同步；图片签名片段自动生成 |
| 认证、`userToken`、远程模式 | `docs/penpot-mcp/auth.md` | `skills/penpot-mcp/references/auth-and-transport.md` | 手工同步；图片签名片段自动生成 |
| 设计协作原则、简报 | `docs/design/principles.md`、`prompt-brief.md` | `skills/penpot-mcp/references/design-workflow.md` | 手工同步（内容层面，暂不生成） |
| 原型方法、状态、可访问性 | `docs/design/prototyping.md`、`states.md`、`accessibility.md` | 无（方法规范） | 已建立；与 `principles.md`/`components.md` 交叉链接 |
| 可用性测试、设计系统、AI 协作 | `docs/design/usability-test.md`、`design-system.md`、`ai-collaboration.md` | 无（方法规范） | 已建立；与 `prototyping.md`/`components.md` 交叉链接 |
| Token/DTCG 与 CSS 后处理 | `docs/design/tokens.md`、`shared/design-tokens.mjs` | `docs/penpot-mcp/cases/04-design-to-code.md` | 已建立；纯函数测试 + V-07 |
| 操作配方、代码骨架 | `shared/snippets/` | `docs/penpot-mcp/cases/`、`references/recipes.md` | 已建立；8 个代码块由 `sync-snippets` 生成 |
| 设计规范 | `docs/design/visual-spec.md`、`components.md` | 无 | 已有 |
| 静态文档站 | 各 Markdown 源 | `site/`（生成） | 零依赖生成；`site:check` 防过期 |
| 版本与发布 | `CHANGELOG.md` + git tag | `skills/penpot-mcp/manifest.json` | 已建立；`build-manifest` 校验 |

在生成器落地前，允许保留手工副本，但必须满足：

- 副本文件头写 `<!-- DERIVED FROM: <源文件> -->`；
- 改动源文件时，同一提交内改副本；
- `npm run check` 对关键片段做指纹校验，发现不一致即失败。

## 5. 质量门禁

### 5.1 `npm run check`

- **站点**：`scripts/build-site.mjs --check` 校验 `site/` 是否与 Markdown 源一致。

零依赖脚本，必须覆盖：

- **frontmatter**：技能只允许 `name`/`description`；`name` 与目录名一致；`description` ≤ 1024 字符。
- **链接**：所有相对 Markdown 链接可解析；锚点找不到时给出警告。
- **围栏**：代码围栏成对；未标注语言的块给出提示。
- **标题**：二级/三级编号单调；重复标题给出警告。
- **禁用模式**：Penpot 名称中的 `/`、未 `await` 的 `openPage(`、直接返回 page 代理、弱魔数守卫、`fontWeight = "700"` 等。
- **版本**：`CHANGELOG` 最新版本与最新 git tag 一致（无 git 时跳过）。
- **派生标记**：带 `DERIVED FROM` 的文件必须存在源文件；`shared/snippets/` 的块必须与源一致。
- **清单**：`skills/penpot-mcp/manifest.json` 的文件列表与 SHA-256 必须与技能目录一致。

### 5.2 `npm run sync` / `npm run manifest`

- `sync`：把 `shared/snippets/` 的 canonical 代码写入 Markdown 标记块；`check` 只校验不写入。
- `manifest`：重建技能目录清单；`check` 校验版本、文件列表与 SHA-256。

### 5.3 `npm test`

- `shared/penpot-guards.mjs` 的纯函数单测；
- 至少覆盖：完整/截断图片签名、RIFF/WAVE 拒绝、WEBP 接受、命名归一化、嵌套越界、空值守卫。

### 5.4 CI

GitHub Actions 在 push / pull_request 上运行：

```bash
npm run check
npm test
```

发布前本地同样执行；任一失败不得打标签。

## 6. 变更工作流

1. **定位事实域**：查第 4 节矩阵，确定唯一源。
2. **改源**：优先改 `docs/` 或 `shared/`；不要先改派生副本。
3. **同步**：有生成器时运行 `npm run sync`；没有时手工同步并更新指纹。
4. **补验证**：涉及 API 行为时，在 `verification/probes/` 增加或更新探针；至少写清期望输出。
5. **跑门禁**：`npm run check && npm test`。
6. **更新记录**：`CHANGELOG.md` 增加条目；必要时升版本、打标签。
7. **技能冒烟**：若改了 `skills/penpot-mcp/`，复制到临时目录，确认 frontmatter 与引用文件齐全。

## 7. 分阶段路线图

### 当前进度（2026-11-19）

| 阶段 | 状态 | 已落地 | 下一步 |
|---|---|---|---|
| P0 | 仓库侧完成 | 案例命名/await/序列化修正、完整魔数守卫、嵌套越界提示、标题编号、证据级别 | 在真实 Penpot 实例复跑案例 01/02/03 |
| P1 | 完成 | `check-docs`、CI、guard 单测、install/doctor、命名规则、术语表、贡献指南、片段生成/同步、`manifest.json`、已知未知清单 | 无（许可证仍按 ADR-004 待作者决定） |
| P2 | 仓库侧完成 | 探针库、验证日志、兼容性矩阵；V-00/V-02/V-04/V-05 与案例 01/02/03 已在 2.18.7 合成页通过；案例 04 token 后处理已落地 | 真实项目文件复跑；案例 05 待执行 |
| P3 | 部分完成 | 零依赖静态文档站、站点链接探针；案例 05 API 路径已写 | 真实实例浏览器 E2E；真实项目文件复跑 |

### P0：先修会误导执行的错误（已完成）

范围：

- 案例 01：`home/Home-Default` → `home-Home-Default`；`openPage` 补 `await`；返回值去代理。
- 案例 02：显式使用 `penpot.currentPage.root`（官方同时提供等价的 `penpot.root`）；区分“新建图片”和“替换 fill”。
- 案例 03：`sample` 去 shape 代理；负坐标归入可修复范围。
- `pitfalls.md` / `api-pitfalls.md`：标题编号归位。
- `SKILL.md`：预检返回纯数据；补 `waitForLayoutUpdate` 探测；明确“仅 execute_code 时不能声称目视验收”。
- 魔数守卫升级为完整签名。
- 嵌套越界改为按直接父容器检查。
- `usage.md` 标注上游命令；README 补前置条件。
- 案例证据级别统一。

验收：

- `npm run check` 通过；
- 上述文件不再出现禁用模式；
- 手工复核案例 01/02/03 的代码块可以按步骤执行，或明确标注未验证点。

### P1：质量门禁与单一源（已完成）

- `scripts/check-docs.mjs` + CI；
- `shared/penpot-guards.mjs` + 单测；
- `shared/snippets/` + 片段同步脚本；
- `manifest.json` + `install-skill.ps1` / `doctor.ps1`；
- Token/实例命名统一；
- `CONTRIBUTING.md`、术语表、已知未知清单。

验收：

- CI 绿灯；
- 同一魔数守卫只存在一份 canonical 实现；
- 新安装可用 `doctor` 验证版本与文件完整性；
- 命名矩阵在 docs 与案例中一致。

### P2：可复现验证（仓库侧完成）

- `verification/probes/`：每条 `[实测]` 对应一个探针；
- `verification/log/`：记录 Penpot 版本、MCP 工具清单、日期、结果；
- 兼容性矩阵（2.18.7 已验证，其他版本待验证）；
- `CHANGELOG` 条目引用探针 ID。

验收：

- 任取一条 `[实测]`，能在 10 分钟内找到探针、期望输出和最近一次执行记录；
- 升级 Penpot 后有明确的回归清单。

### P3：可选增强（部分完成）

- 静态文档站：已用 `scripts/build-site.mjs` 零依赖生成到 `site/`；
- 站点链接探针：`verification/probes/09-site-links.mjs`；
- 浏览器冒烟：用 agent-browser 打开站点并走查；
- 真实 Penpot 实例上的 Docker + Playwright + 插件 E2E：待真实文件/环境；
- 按版本自动生成兼容性矩阵：未开始。

这些不以“看起来更完整”为理由提前做；站点只在确有检索/阅读需求时维护。

## 8. 决策记录

### ADR-001：先修 P0，再做全量内容生成

当前只有 20 个 Markdown，直接上 `content/` 全量构建的迁移成本和维护成本高于收益。先用“共享片段 + 指纹校验”验证单一源流程，再决定是否扩展到整篇文档。

### ADR-002：技能保持自包含

`skills/penpot-mcp/` 必须能单独复制安装，因此不引用 `docs/` 的相对路径。派生内容由脚本生成到技能目录，并带生成标记。

### ADR-003：校验脚本零依赖

使用 Node 22 内置模块（`fs`、`path`、`url`、`node:test`），不引入 markdown 解析器或 docs 框架。脚本保持 200 行以内，宁可少检查，也不引入维护负担。

### ADR-004：许可证暂不自动选择

仓库目前没有 `LICENSE`。推荐“文档 CC BY 4.0 + 代码 MIT”或整体 MIT，但这是作者的法律选择，需确认后再加；在此之前不擅自写入。

### ADR-005：证据标签五级

- `[实测-合成页]`：在临时验收页/合成数据上复现；
- `[实测-真实文件]`：在真实项目文件上复现；
- `[源码]`：来自上游源码或官方文档，尚未在本环境执行；
- `[推断]`：基于相邻行为的合理推断；
- `[待验证]`：明确未验证，不得作为操作依据。

禁止把 `[实测-合成页]` 简写成“实测”后用于真实文件承诺。

### ADR-006：静态站零依赖生成，不引入站点框架

`site/` 由 `scripts/build-site.mjs` 从 Markdown 直接生成，不引入 VuePress/Docusaurus，也不把内容迁移到 `content/`。这样做的原因是：当前规模只需要可检索的 HTML 与链接校验，框架带来的依赖、构建和安全维护成本高于收益。

站点是派生副本，不是事实源；改内容仍改 Markdown，`site:check` 在 CI 中防止过期。浏览器 E2E 属于后续验证，不以“生成成功”代替。

## 9. 知识变更的 Definition of Done

- [ ] 事实有唯一源，派生副本已同步或标记生成；
- [ ] 结论带证据级别、Penpot 版本、日期；
- [ ] 代码块可直接运行，或明确标注占位符/未验证；
- [ ] 涉及 API 行为时补了探针或说明为何不能补；
- [ ] `npm run check && npm test` 通过；
- [ ] `CHANGELOG.md` 有对应条目；
- [ ] 若改技能，安装冒烟通过。

## 10. 当前明确不做

- 不把全部文档迁移到 `content/`；
- 不引入 VuePress/Docusaurus 等站点框架；静态站保持零依赖生成；
- 不承诺 2.18.7 之外的版本行为；
- 不自动选择许可证；
- 不为了“统一”重写历史 `CHANGELOG`。
