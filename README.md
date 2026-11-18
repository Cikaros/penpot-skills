# penpot-skills

与 Penpot 相关的 AI Skills 集合，用于约束 Agent 在 Penpot 设计文件上的操作方式，减少"看起来做完了、实际是坏数据"的情况。

## 安装

把 `skills/<name>/` 整个目录复制到客户端的 skills 目录，例如：

```powershell
Copy-Item -Recurse .\skills\penpot-mcp "$env:USERPROFILE\.sclaw\agent\skills\"
```

重启或重新加载会话后，技能即可被自动发现。

## 技能列表

### `penpot-mcp`

通过 Penpot MCP server 与插件操作设计文件。覆盖：

- 工具契约：`execute_code` / `high_level_overview` / `penpot_api_info` / `export_shape` / `import_image`
- 30 秒单次执行硬超时带来的分片要求
- Penpot Plugin API 的静默陷阱：`appendChild`、flex 子元素顺序、只读宽高、`growType` 被 `resize` 重置
- 认证边界：`userToken` 只属于 MCP 传输层，Penpot 只认 cookie 或 `Authorization`
- 图片流水线：`penpot.uploadMediaData` + 魔数校验，防止把 HTML 错误页存成 PNG
- 交付前验收清单与失败速查表

参考文件：

- `references/api-pitfalls.md`
- `references/auth-and-transport.md`
- `references/design-workflow.md`

## 约定

- 每个技能一个目录：`skills/<name>/SKILL.md`，可带 `references/`、`scripts/`、`assets/`
- `SKILL.md` frontmatter 只写 `name` 和 `description` 两个字段
- 技能目录内不放 README、CHANGELOG 之类的辅助文档，说明统一写在本文件
- 结论必须来自源码或实测，不写"大概是这样"

## 来源

- <https://github.com/penpot/penpot-mcp>（`main`）
- <https://github.com/penpot/penpot>（`develop`，后端鉴权与插件 API）
- <https://help.penpot.app/mcp/good-prompting-practices-design/>
