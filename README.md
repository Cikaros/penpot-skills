# penpot-skills

Penpot 相关的**使用规范、避坑手册、设计规范**与可执行 **Skills** 的集合。

目标只有一个：让使用 Penpot（尤其是 Penpot MCP + AI）的人，不必把同样的坑再踩一遍。

## 内容结构

```
docs/
  engineering/       工程化设计：原则、单一源、质量门禁、路线图
    COMPASS.md       工程化设计罗盘（改文档/技能前先读）
  penpot-mcp/        第一部分：MCP 使用说明、规范与注意事项
    usage.md         连接形态、工具契约、调用顺序
    conventions.md   文件/页面/画板/图层/组件/Token 的命名与分组规范
    pitfalls.md      API 陷阱 + 版本差异实测矩阵（会静默产出坏数据的那些）
    auth.md          userToken、401、匿名会话、远程模式排查
    glossary.md      术语表：page root、shape proxy、parentX、fillImage 等
    known-unknowns.md 尚未验证的 API/部署差异与关闭条件
    cases/           实战案例：首页搭建、图片修复、越界修复、设计转代码
  design/            第二部分：设计思维、理念与设计规范
    principles.md    设计原则与 AI 协作原则
    prototyping.md   原型方法、保真度选择、测试与决策
    usability-test.md 可用性测试执行、指标、分级与报告
    design-system.md 设计系统治理、组件 API、贡献与废弃
    ai-collaboration.md AI 输入契约、证据、评审门与安全
    states.md        屏幕/组件状态矩阵与验收
    accessibility.md 可访问性设计基线、标注与验收
    tokens.md        Token 分层、DTCG 子集与 CSS 后处理
    visual-spec.md   栅格、间距、字阶、颜色、圆角、阴影、图标
    components.md    组件分层、变体、命名、验收
    prompt-brief.md  设计简报模板与示例
skills/
  penpot-mcp/        可直接安装的 Skill（操作型，短小、可执行）
shared/
  penpot-guards.mjs  可测试的纯函数：图片签名、命名、越界、空值守卫
  snippets/          canonical 代码片段（图片签名等）与同步清单
scripts/
  check-docs.mjs     文档与示例的静态门禁
  sync-snippets.mjs  把 canonical 片段写入 Markdown 标记块
  build-manifest.mjs 生成/校验技能目录清单
  build-site.mjs     零依赖生成静态文档站
  install-skill.ps1  带备份与版本戳的技能安装
site/                由 npm run site 生成的静态文档站
test/                纯函数与探针单测
verification/        探针、验证日志、兼容性矩阵
CONTRIBUTING.md      贡献流程、内容规则、评审清单
```
## 快速开始

**只想让 AI 少犯错**：安装技能。

```powershell
# 推荐：带备份、版本戳与安装后检查
.\scripts\install-skill.ps1
.\scripts\doctor.ps1

# 手动安装（等价于把 skills\penpot-mcp 复制到目标目录）
Copy-Item -Recurse .\skills\penpot-mcp "$env:USERPROFILE\.sclaw\agent\skills\"
```

### 前置条件

- Penpot `2.18.7`（其他版本先跑 `docs/penpot-mcp/pitfalls.md` 第 0 节探测）。
- 上游 [`penpot/penpot-mcp`](https://github.com/penpot/penpot-mcp) 已启动，Penpot 插件已加载并连接。
- Node.js `>=20`：仅用于运行本仓库的校验脚本；技能本身不依赖 Node。

本仓库只含文档、技能与校验脚本，**不含 MCP server**；`usage.md` 里的 `npm run bootstrap` 属于上游仓库。

**想先理解规则**：按顺序读 `docs/penpot-mcp/usage.md` → `conventions.md` → `pitfalls.md`。

**想做设计规范**：读 `docs/design/principles.md` → `prototyping.md` → `usability-test.md` → `design-system.md` → `ai-collaboration.md` → `states.md` → `accessibility.md` → `tokens.md` → `visual-spec.md` → `components.md`。

**想做可点击多屏原型**：先读技能内的 `skills/penpot-mcp/references/screen-kit.md`，再用 `references/recipes.md` 的代码骨架落地。

## 质量门禁

```bash
npm test          # 纯函数与探针单测
npm run check     # 链接、围栏、标题编号、片段一致性、manifest、版本
npm run sync      # 从 shared/snippets/ 重建 Markdown 代码块
npm run manifest  # 重建 skills/penpot-mcp/manifest.json
npm run site      # 重建 site/ 静态文档站
npm run verify    # check + test（含 site:check）
```

工程化决策与阶段划分见 `docs/engineering/COMPASS.md`；改动文档或技能前先对齐该文件。

## 两部分的关系

| | 第一部分：MCP | 第二部分：设计 |
|---|---|---|
| 解决问题 | 会不会用错、连不上、数据写坏 | 做出来是否可用、一致、可交付 |
| 形态 | 硬约束、检查表、故障速查 | 原则、尺度、组件规则 |
| 失败表现 | 401、图片空白、元素被裁、超时 | 层级混乱、间距随意、组件膨胀 |

第一部分保证"操作正确"，第二部分保证"结果正确"。缺任何一半，产出都不可交付。

## 实测覆盖（Penpot 2.18.7）

2026-11-19 历史基线：在真实 Penpot 实例 + 仅暴露 `execute_code` 的 MCP 部署上逐项验证（本轮实时复跑状态见下方验证记录）：

| 能力 | 结论 |
|---|---|
| 连接与文件读取 | 正常；`currentUser` 可能因缺 `user:read` 抛异常，不是未登录 |
| 页面/画板/矩形/文本 | 正常；`createBoard()` 总落在页面根 |
| flex 布局与顺序 | `naturalChildOrdering=true`，数组顺序=视觉顺序；改完需 `waitForLayoutUpdate` |
| 文本 | 默认宽度 **1px**；必须先 `resize(width,h)` 再设 `auto-height` |
| 图片上传/填充 | `uploadMediaData` 正常；`fillImage.data()` 返回 Promise |
| 颜色/排版 token | 颜色用三字段绑定；排版只能逐字段复制 |
| 阴影/模糊/圆角 | `shadows` 复数、`blur={value}`；四角圆角可用 |
| SVG 图标 | 返回 group；重着色改子 path 的 `strokes`/`fills` |
| 组件 | 可创建/实例化；实例文本覆盖不影响主组件 |
| 导出 | PNG/SVG 均为 Promise；支持 `scale` |
| 代码生成 | `generateStyle` 仅 `css`；`generateMarkup` 支持 `html`/`svg` |
| grid 布局 | `columns`/`rows` 只读，`push` 无效；用 flex/绝对定位代替 |
| 查找/遍历 | `findShapes` 不带 root 会跨页；`analyzeDescendants` 回调签名 `(root,node)` |

逐条证据与反例见 `docs/penpot-mcp/pitfalls.md`；可复现骨架见 `skills/penpot-mcp/references/recipes.md`。

> 2026-11-19 刷新 MCP 后，V-00/V-02/V-04/V-05 与案例 01/02/03 已在 Penpot 2.18.7 的临时合成页通过；案例 04 的生成链路通过，但实测不自动 token 化，需要生成后处理。真实项目文件 `小纸条` 已完成 11 屏设计与 45 个交互的数据层验收，并通过 V-10 只读基线；view mode 实际点击仍未验证。记录见 `verification/log/2026-11-19.md`。

## 验证与已知未知

- `verification/README.md`：探针运行方式与日志规范。
- `verification/compatibility.md`：Penpot 版本 × 能力矩阵。
- `docs/penpot-mcp/known-unknowns.md`：尚未能写成事实的 API/部署差异。
- `skills/penpot-mcp/manifest.json`：安装文件清单与 SHA-256。

## 约定

- 结论必须来自源码或实测；不确定就标注"待验证"，不要写成事实。
- 规范分两类：**硬规则**（违反即错误，如把错误页字节上传成图片）与**项目约定**（可覆盖，如 4pt 间距体系）。文档中必须标明是哪一类。
- 与版本相关的结论必须标注实测版本（如 Penpot 2.18.7）；跨版本行为先探测再分支，不把单一版本的观察写成永恒事实。
- 每个技能一个目录：`skills/<name>/SKILL.md`，可带 `references/`；frontmatter 只写 `name` 和 `description`。
- 说明性文档放 `docs/`，技能目录内不放 README/CHANGELOG。

## 版本管理

采用语义化版本，标签格式 `vMAJOR.MINOR.PATCH`：

| 变更类型 | 版本位 | 例子 |
|---|---|---|
| 规范不兼容变更（既有用法需改写） | MAJOR | `v1.0.0` → `v2.0.0` |
| 新增技能、文档章节、规范条目 | MINOR | `v0.1.0` → `v0.2.0` |
| 修正错误、补示例、措辞调整 | PATCH | `v0.1.0` → `v0.1.1` |

发布流程：

```bash
npm run verify
git add -A
git commit -m "feat: ..."
git tag -a v0.1.0 -m "v0.1.0"
git push origin main --tags
```

每个版本在 `CHANGELOG.md` 记录变更；标签只打在已通过自检的提交上。

## 来源

- <https://github.com/penpot/penpot-mcp>（`main`）
- <https://github.com/penpot/penpot>（`develop`，后端鉴权与插件 API）
- <https://help.penpot.app/mcp/good-prompting-practices-design/>
