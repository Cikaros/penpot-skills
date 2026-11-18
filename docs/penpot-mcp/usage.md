# Penpot MCP 使用说明

## 1. 架构：谁在替你操作设计

MCP server **不直接调用** Penpot 的 HTTP API。它通过 WebSocket 把任务下发给 Penpot 里的插件，插件用 Plugin API 在用户会话中执行。

由此得到三条硬事实：

- 身份来自浏览器里的 Penpot 会话，不是 MCP 的 token。
- 插件必须保持打开；关闭插件 UI 就等于断连。
- 单用户模式下同时只允许一个插件实例连接。

## 2. 三种运行形态

| 形态 | 判定方式 | 影响 |
|---|---|---|
| 本地单用户 | MCP 在 localhost，插件连 `ws://localhost:4402` | 工具齐全；只允许一个插件连接 |
| remote | `PENPOT_MCP_REMOTE_MODE=true` | 没有 `import_image`；`export_shape` 没有 `filePath` |
| multi-user | 连接 URL 带 `?userToken=` | 插件 WS 必须带同一 token；重复 token 会被拒绝 |

判断方法：工具清单里没有 `import_image`，就是 remote 或多用户模式。不要在这时尝试调用它。

## 3. 工具契约

| 工具 | 关键点 |
|---|---|
| `high_level_overview` | 返回官方总览；一个会话只调用一次 |
| `penpot_api_info(type, member?)` | 完整文档超过 2000 字符时只返回概述，必须按 `member` 再查 |
| `execute_code(code)` | 在插件上下文执行 JS；**单次硬超时 30 秒** |
| `export_shape(shapeId, format, mode, filePath?)` | `shapeId="selection"` 表示当前选中第一个；`mode="fill"` 取原图（仅 PNG） |
| `import_image(filePath, x?, y?, width?, height?)` | 仅本地模式；只接受绝对路径；jpg/png/gif/webp |

`execute_code` 的细节：

- 代码即函数体，用 `return` 返回；不返回就是 `undefined`。
- 可用全局：`penpot`、`penpotUtils`、`storage`、`console`。
- 返回值会被 `JSON.stringify(..., null, 2)`，**不要返回 shape 对象**，返回 id/name/数值。
- `console` 输出单独返回；不要把要返回的数据再 log 一遍。
- `storage` 跨调用持久，适合存 shape id、基准尺寸、自定义工具函数。
- 30 秒是硬限制：批量操作必须分片，并保证每片可重入（先查再改，不依赖上次的内存状态）。

## 4. 连接步骤

1. `npm run bootstrap` 启动 MCP server 与插件静态服务。
2. Penpot 打开设计文件 → Plugins 菜单 → 用开发地址加载 `http://localhost:4400/manifest.json`。
3. 打开插件 UI，点击「Connect to MCP server」。
4. MCP 客户端连接 `http://localhost:4401/mcp`（Streamable HTTP）或 `/sse`（旧版 SSE）。

常见连接问题：

- Chromium 142+ 会弹「访问本地网络」授权，必须允许。
- Brave 需要对该站点关闭 Shield。
- 插件 UI 不能关；关了连接就断。

## 5. 推荐调用顺序

```
预检（currentUser / pages / selection）
  → high_level_overview（仅一次）
  → penpot_api_info（按需查具体成员）
  → 结构探查（shapeStructure，深度 2–3）
  → 分片修改（每片一类改动）
  → export_shape 视觉验收
  → 汇报（id、数值、证据）
```

## 6. 不要做的事

- 不要在插件里 `fetch('/api/rpc/...')` 或 `fetch('/assets/...')`：拿不到会话，只会得到 401/HTML。详见 `auth.md`。
- 不要一次遍历整棵树并 dump JSON，30 秒很容易超。
- 不要在未读 `high_level_overview` 的情况下凭记忆写 API。
- 不要在远程模式下要求用户「为什么没有 import_image」。