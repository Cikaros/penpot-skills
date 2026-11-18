# penpot-skills

Penpot 相关的**使用规范、避坑手册、设计规范**与可执行 **Skills** 的集合。

目标只有一个：让使用 Penpot（尤其是 Penpot MCP + AI）的人，不必把同样的坑再踩一遍。

## 内容结构

```
docs/
  penpot-mcp/        第一部分：MCP 使用说明、规范与注意事项
    usage.md         连接形态、工具契约、调用顺序
    conventions.md   文件/页面/画板/图层/组件/Token 的命名与分组规范
    pitfalls.md      API 陷阱 + 版本差异实测矩阵（会静默产出坏数据的那些）
    auth.md          userToken、401、匿名会话、远程模式排查
    cases/           实战案例：首页搭建、图片修复、越界修复、设计转代码
  design/            第二部分：设计思维、理念与设计规范
    principles.md    设计原则与 AI 协作原则
    visual-spec.md   栅格、间距、字阶、颜色、圆角、阴影、图标
    components.md    组件分层、变体、命名、验收
    prompt-brief.md  设计简报模板与示例
skills/
  penpot-mcp/        可直接安装的 Skill（操作型，短小、可执行）
```
## 快速开始

**只想让 AI 少犯错**：安装技能。

```powershell
Copy-Item -Recurse .\skills\penpot-mcp "$env:USERPROFILE\.sclaw\agent\skills\"
```

**想先理解规则**：按顺序读 `docs/penpot-mcp/usage.md` → `conventions.md` → `pitfalls.md`。

**想做设计规范**：读 `docs/design/principles.md` → `visual-spec.md` → `components.md`。

## 两部分的关系

| | 第一部分：MCP | 第二部分：设计 |
|---|---|---|
| 解决问题 | 会不会用错、连不上、数据写坏 | 做出来是否可用、一致、可交付 |
| 形态 | 硬约束、检查表、故障速查 | 原则、尺度、组件规则 |
| 失败表现 | 401、图片空白、元素被裁、超时 | 层级混乱、间距随意、组件膨胀 |

第一部分保证"操作正确"，第二部分保证"结果正确"。缺任何一半，产出都不可交付。

## 实测覆盖（Penpot 2.18.7）

2026-11-19 在真实 Penpot 实例 + 仅暴露 `execute_code` 的 MCP 部署上逐项验证：

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
