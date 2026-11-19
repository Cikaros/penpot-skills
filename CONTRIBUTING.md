# 贡献指南

本仓库是“可验证的 Penpot 操作知识 + 可安装技能”，不是普通博客。提交前先对齐 `docs/engineering/COMPASS.md`。

## 1. 改什么，先找唯一源

| 要改的内容 | 唯一源 |
|---|---|
| API 行为、版本差异、错误索引 | `docs/penpot-mcp/pitfalls.md` |
| 认证、`userToken`、远程模式 | `docs/penpot-mcp/auth.md` |
| 操作配方、代码骨架 | 先改 `docs/penpot-mcp/cases/` 或 `skills/penpot-mcp/references/recipes.md`，并在 `CHANGELOG` 说明 |
| 设计原则、方法、规范 | `docs/design/` |
| Token/DTCG、CSS 后处理 | `docs/design/tokens.md` + `shared/design-tokens.mjs` |
| 静态文档站 | 各 Markdown 源；`site/` 由 `npm run site` 生成 |
| 技能入口 | `skills/penpot-mcp/SKILL.md` |

技能目录必须自包含；不要把 `docs/` 的相对路径写进技能引用，因为安装到 `~/.sclaw/agent/skills` 后路径会失效。

## 2. 提交前必须跑

```bash
npm run verify
```

它包含：

- `check-docs.mjs`：相对链接、代码围栏、标题编号、禁用模式、版本一致性；
- `sync-snippets --check` / `build-manifest --check`：片段与技能清单一致性；
- `build-site --check`：`site/` 是否与 Markdown 源一致；
- `guards.test.mjs` / `design-tokens.test.mjs`：图片签名、命名、越界，以及 DTCG/token 后处理。

改了文档后运行 `npm run site` 重建静态站，再跑 `npm run verify`。

失败就修，不要用“只是文档”作为跳过理由。

## 3. 内容规则

1. **证据分级**：使用 `[实测-合成页]`、`[实测-真实文件]`、`[源码]`、`[推断]`、`[待验证]`，并写清 Penpot 版本与日期。不要把所有验证都简写成“实测”。
2. **示例可执行**：代码块要么能直接运行，要么显式标注“伪代码/占位符”。变量来源不明的片段必须加说明。
3. **返回值纯数据**：不要返回 shape/page 代理或函数；`getPages()` 官方返回 `{id,name}[]`，若某版本返回代理则先 `map`。
4. **名称不含 `/`**：Penpot 会把 `btn/Primary` 归一化成 `btn / Primary`；统一用 `-` 或 `__`。
5. **图片先验字节**：完整签名，不接受只查 `RIFF`；上传后再查 `media.width/height`。
6. **验收按直接父容器**：`parentX/parentY` 是相对坐标，不能拿顶层 board 的宽高代替直接父容器。
7. **批量可恢复**：单片有上限、有游标、逐项 `try/catch`；单张失败不能中断整批。
8. **不发明样式**：颜色/字号来自 token 或现有组件；示例里的裸色必须标注“仅示意”。

## 4. 评审清单

- [ ] 事实有唯一源，副本已同步或标记 `DERIVED FROM`；
- [ ] 结论有证据级别、版本、日期；
- [ ] 代码块可运行或明确标注未验证；
- [ ] 没有新增禁用模式（未 `await` 的 `openPage`、弱魔数守卫、Penpot 名称中的 `/` 等）；
- [ ] `npm run verify` 通过；
- [ ] `CHANGELOG.md` 有对应条目；
- [ ] 改了技能时，`.\scripts\install-skill.ps1 -TargetRoot <临时目录>` + `doctor.ps1` 冒烟通过。

## 5. 不做什么

- 不为“更整齐”重写历史 `CHANGELOG`；
- 不把单一版本的观察写成永恒事实；
- 不为了让示例变短而省掉守卫；
- 不在技能目录放 README/CHANGELOG；
- 不擅自选择或替换许可证（见 `COMPASS.md` ADR-004）。
