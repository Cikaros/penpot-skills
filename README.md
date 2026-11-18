# penpot-skills

Penpot 相关的**使用规范、避坑手册、设计规范**与可执行 **Skills** 的集合。

目标只有一个：让使用 Penpot（尤其是 Penpot MCP + AI）的人，不必把同样的坑再踩一遍。

## 内容结构

```
docs/
  penpot-mcp/        第一部分：MCP 使用说明、规范与注意事项
    usage.md         连接形态、工具契约、调用顺序
    conventions.md   文件/页面/画板/图层/组件/Token 的命名与分组规范
    pitfalls.md      API 陷阱目录（会静默产出坏数据的那些）
    auth.md          userToken、401、匿名会话、远程模式排查
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

## 约定

- 结论必须来自源码或实测；不确定就标注"待验证"，不要写成事实。
- 规范分两类：**硬规则**（违反即错误，如 `appendChild`）与**项目约定**（可覆盖，如 4pt 间距体系）。文档中必须标明是哪一类。
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
