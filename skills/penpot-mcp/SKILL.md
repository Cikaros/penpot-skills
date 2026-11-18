---
name: penpot-mcp
description: 通过 Penpot MCP server 与 Penpot 插件操作设计文件（execute_code、high_level_overview、penpot_api_info、export_shape、import_image），用于检查或修改 Penpot 页面、搭建与修复布局、导出图形做视觉验收、导入图片，以及排查插件未连接、401/匿名会话、上传后图片空白等问题。Use when working with Penpot through MCP, editing Penpot designs programmatically, or debugging Penpot MCP plugin connection and authentication failures.
---

# Penpot MCP 操作规范

目标：用最少的调用次数，产出**可验收**的 Penpot 设计改动，并且不把错误数据静默写进文件。

## 0. 先判定运行形态

| 形态 | 判定 | 影响 |
|---|---|---|
| 本地单用户 | MCP 在 localhost，插件连 `ws://localhost:4402` | 全部工具可用；同时只允许 **1 个**插件连接 |
| remote | `PENPOT_MCP_REMOTE_MODE=true` | `import_image` **不存在**；`export_shape` 无 `filePath` 参数 |
| multi-user | URL 带 `?userToken=` | 插件 WS 必须带同一 token；重复 token 会被拒绝 |

不确定就先看工具清单：**没有 `import_image` 就是 remote/多用户**，不要试图调用它，也不要让用户"检查为什么工具不见了"。

## 1. 工具契约（实测，不要凭印象）

- `high_level_overview`：返回官方总览（`prompts.yml`）。**整个会话只读一次**，读过后不要重复调用。
- `penpot_api_info(type, member?)`：API 文档。整型文档 > 2000 字符时只返回 overview，**必须再按 `member` 查**。不要猜 API 签名。
- `execute_code(code)`：在插件上下文执行 JS。可用全局：`penpot`、`penpotUtils`、`storage`、`console`。
  - 代码即函数体，用 `return` 返回；返回值和 `console` 输出**分两路**返回。
  - **单次调用硬超时 30 秒**（PluginBridge 默认）。超时 = 任务失败，不是"还在跑"。
  - `storage` 跨调用持久，用来存 shape id、基准尺寸、自定义工具函数。
- `export_shape(shapeId, format, mode, filePath?)`：`shapeId` 传 `"selection"` 表示当前选中第一个；`mode:"fill"` 取原始填充图（仅 PNG）。
- `import_image(filePath, x?, y?, width?, height?)`：只接受**绝对路径**的本地文件（jpg/jpeg/png/gif/webp），内部走 `penpot.uploadMediaData`。

> 30 秒是硬约束：批量操作要分片，每片控制在几十个形状以内，并让每次调用可重入（先按 id/name 查找，再改）。

## 2. 铁律

1. **认证**：`userToken` 只属于 MCP 传输层，Penpot 后端只认 cookie `auth-token` 或 `Authorization` 头，**不认 URL 查询参数**。永远不要在 `execute_code` 里 `fetch('/api/rpc/...')` 或 `fetch('/assets/...')`。插件内一切读写走 `penpot.*`。
2. **追加子元素**：除 flex board 外，禁用 `appendChild`。用 `parent.insertChild(parent.children.length, shape)`；flex board 用 `board.appendChild(shape)`（列/行方向下它插到数组前端，正好符合视觉顺序）。
3. **几何**：`width/height` 只读 → `resize(w,h)`；`parentX/parentY/boardX/boardY` 只读 → `penpotUtils.setParentXY(shape,x,y)`；`bounds` 只读。
4. **文本**：`resize()` 会把 `growType` 改成 `"fixed"`，改完必须改回 `"auto-width"`/`"auto-height"`，否则文本溢出且包围盒失真；自动尺寸有延迟，需等 ~100ms 再读。
5. **flex 顺序**：`dir` 为 `row`/`column` 时 `children` 数组顺序与视觉顺序**相反**，插入前先想清楚索引。
6. **z 序**：由 `children` 顺序决定，先加背景再加前景；调整用 `bringToFront/sendToBack/setParentIndex`。
7. **不发明样式**：只用已有 token / library / 组件；缺信息就问或留空，禁止自创颜色、字体、断点。
8. **不重复日志**：`return` 的数据不要再用 `console.log` 打一遍。
9. **图片必须验字节**：上传前后检查魔数；以 `<html`/`<!doc` 开头的字节一律视为错误页，立即中止，不得写入设计。
10. **改完必验**：每个页面/画板改完用 `export_shape` 看图，并对容器做包含性检查。

## 3. 标准工作流

**第 0 步 预检（一次调用拿全）**

```js
return {
  origin: location.origin,
  user: penpot.currentUser ? { id: penpot.currentUser.id, name: penpot.currentUser.name } : null,
  file: penpot.currentFile ? penpot.currentFile.name : null,
  pages: penpotUtils.getPages(),
  selection: penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type }))
};
```

`user` 为 `null` → 插件所在标签页确实未登录，先让用户登录，不要继续改设计。

**第 1 步 读结构与器量**
先 `high_level_overview`（仅一次），再按需 `penpot_api_info`。用 `penpotUtils.shapeStructure(page.root, 3)` 看层级，不要一上来就遍历全树 dump JSON。

**第 2 步 定位**
`findShapeById` 全页搜；`findShapes` 默认只在**当前页** `penpot.root` 下搜 —— 跨页必须显式传 `page.root` 或循环 `penpot.currentFile.pages`。

**第 3 步 小步执行**
每步只做一类改动（建容器 / 填内容 / 调布局 / 修溢出），把新建对象 id 存进 `storage`，失败可重入。

**第 4 步 验收**
几何：`penpotUtils.analyzeDescendants(board, (root, s) => penpotUtils.isContainedIn(s, root) ? null : s.name)`。
视觉：`export_shape(board.id, "png", "shape")`，逐块对照需求；文本看是否溢出；图片看是否有内容。

**第 5 步 汇报**
只报：改了哪些对象（id/name）、关键数值、验收证据（导出图/结构）、未完成项。不要复述整段代码。

## 4. 失败速查

| 症状 | 真实原因 | 处理 |
|---|---|---|
| `No Penpot plugin instances are currently connected` | 插件没开或没点 Connect | 让用户在 Penpot 里打开插件并连接，别改代码 |
| `Multiple (N) ... instances are connected` | 多个标签页/插件实例 | 只保留一个 |
| `Task ... timed out after 30 seconds` | 单次代码太重或死循环 | 分片、去掉全树遍历、加边界 |
| `fetch` 返回 401 / `Anonymous User` | 插件上下文拿不到 Penpot cookie，**属预期** | 改用 `penpot.*`；不算登录故障 |
| `penpot.currentUser` 为 null | 页面真的没登录 / 会话过期 | 该标签页重新登录 |
| 上传成功但图片空白、读回是 `<html>` | 把错误页当图片存了 | 校验魔数，重新取源数据，别重复上传 |
| 找不到 shape | id 属于其它页面或已删除 | `findShapeById` 全页搜；必要时让用户重新选中 |
| 元素被裁掉 | 父级 `clipContent` + 子元素坐标越界 | 用 `setParentXY` 归零相对坐标，别放大父级 |

## 5. 交付前检查清单

- [ ] 所有子元素都在父容器内（含 `clipContent` 的 board）
- [ ] 没有 0 宽/0 高、没有负尺寸
- [ ] 文本 `growType` 为 auto，且未溢出
- [ ] 层级顺序符合遮挡关系
- [ ] 颜色/字号来自 token 或现有样式
- [ ] 每个改动过的画板都导出过 PNG 并目视确认
- [ ] 图片填充非空（`fillImage` 存在且字节头正常）

## 参考

- 详细 API 陷阱与代码片段：`references/api-pitfalls.md`
- 认证、`userToken`、远程模式排查：`references/auth-and-transport.md`
- 设计简报模板、设计转代码、图片流水线：`references/design-workflow.md`
