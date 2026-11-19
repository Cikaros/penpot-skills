# 兼容性矩阵

> 基线：Penpot `2.18.7`，2026-11-19。  
> `2.18.7` 列的“实测”只代表本仓库记录过的合成页/工具面；真实项目文件另见 `docs/penpot-mcp/known-unknowns.md`。

## 1. 版本 × 能力

| 能力 | 2.18.7 | 其他版本 | 探针/证据 |
|---|---|---|---|
| `penpot.version` | 可读，字符串 | 待验证 | V-00 |
| `penpot.root` / `penpot.currentPage.root` | 两者均存在，指向当前页根 `[源码]` | 待验证 | V-00 `rootType` |
| `penpotUtils.getPages()` | 返回 `{id,name}[]` `[源码]`；代码仍映射一次以防代理 | 待验证 | V-00 `pages` |
| `penpot.waitForLayoutUpdate()` | 存在；改子元素后需等待 `[实测]`；合成页出现过一次超时，最终成对复跑通过 | 可能不存在或行为不同 | V-00 `layoutWait`、V-02 |
| `naturalChildOrdering` | `true`，数组顺序 = 视觉顺序 `[实测]` | 旧版可能相反 | V-00、V-02 |
| flex 布局建立 | 先建布局再 `flex.appendChild`、或建后重新 append，均结算为 0/20/40 `[实测-合成页]` | 待验证 | V-02 |
| 直接父级越界 | 直接子级与嵌套子级都能识别，嵌套项父级正确 `[实测-合成页]` | 待验证 | V-04 |
| `uploadMediaData` + `fillImage.data()` | 70 字节 1×1 PNG 上传成功，宽高 1×1，读回仍为 PNG，Promise 可 `await` `[实测-合成页]` | 待验证 | V-05 |
| 临时页生命周期 | 创建、切换、恢复、删除均通过 `[实测-合成页]` | 待验证 | V-06 |
| 案例 01 首页骨架 | 390×844、11 区块、越界 0、PNG 390×844 `[实测-合成页]` | 待验证 | 案例 01 + 日志 |
| 案例 02 图片扫描/替换 | 1 张 PNG 扫描通过；替换保留 `fillOpacity=0.5`；读回 PNG `[实测-合成页]` | 待验证 | 案例 02 + 日志 |
| 案例 03 越界修复 | 2 个越界修复后 0，`clipContent` 保留 `[实测-合成页]` | 待验证 | 案例 03 + 日志 |
| 案例 04 生成链路 | CSS 3040/165、`withPrelude` 147/789、HTML 3643、SVG 589；token 映射未通过，含裸色 `[实测-合成页]` | 待验证 | 案例 04 + 日志 |
| 案例 04 token 后处理 | `tokenizeCssDetailed` 将 `#3366ffFF` 替换为 `var(--color-brand-primary)`；`unmapped=[]`，裸 `16px` 进入审计 | 待验证 | V-07 |
| 案例 05 interaction/flow | `Board.addInteraction` / `Page.createFlow` 签名存在 `[源码]`；**未执行** | 待验证 | V-08 |
| 真实文件只读基线 | 探针已写，**未执行**；当前 Penpot 标签页被挂起 | 待验证 | V-10 |
| `generateStyle` + 库颜色 | 即使 `fillColorRefId` 指向 `color-brand-primary`，CSS 仍是 `#3366ffFF`，无变量 `[实测-合成页]` | 期望自动 `var(--token)` | 生成后按 token 表替换 |
| `shape.export()` | 返回 Promise\<Uint8Array\> `[实测]` | 待验证 | 导出案例 |
| `generateStyle` | 只认 `includeChildren` `[实测]` | 官方总览示例出现 `withChildren` | 案例 04 |
| `penpot.currentUser` | 缺 `user:read` 时会抛错 `[实测]` | 待验证 | V-00 `user` |
| 执行上下文全局 | 无 `location`/`window`/`document`；`atob` 可用 `[实测]` | 待验证 | V-00 `globals` |
| 远程模式 `import_image` | 可能被移除 `[源码]` | 视部署 | 工具清单 |
| 远程模式 `export_shape.filePath` | 可能被删除 `[源码]` | 视部署 | 工具 schema |

## 2. 已知冲突与处理

| 冲突 | 采用 | 原因 |
|---|---|---|
| 官方总览示例 `generateStyle(..., { withChildren: true })` vs 2.18.7 实测 `includeChildren` | 以实测版本为准，使用 `includeChildren` | 用错选项会静默生成缺少子元素的 CSS |
| 旧文“flex 子元素顺序必然相反” vs 2.18.7 flag | 先探测 `naturalChildOrdering`，不写死 | 版本间行为发生变化 |
| `penpot.root` 被旧检查器禁用 vs 官方 API 同时提供 | 允许两者；统一文档用 `penpot.currentPage.root` 以显式表达页码 | `penpot.root` 只指向当前页，不是跨页根 |
| `getPages()` 必须 map vs 官方返回纯对象 | 允许直接使用；保留映射作为防御 | 老版本可能返回代理，映射成本低 |

## 3. 升级回归清单

升级 Penpot 或 MCP 后，按顺序执行：

1. `00-runtime-readonly.js`：确认版本、`rootType`、`layoutWait`、工具/全局；
2. `01-image-kind.mjs`：Node 侧纯函数不回归；
3. `02-layout-wait.js`：在可丢弃页确认插入顺序与等待语义；
4. `03-overflow.mjs`：嵌套越界仍只报直接父级越界；
5. 重跑案例 01/02/03，至少记录一条 `[实测-真实文件]`；
6. 运行 `07-css-tokenize.mjs` 和 `09-site-links.mjs`，确认 token 化与静态站链接不回归；
7. 在可写合成页运行 `08-prototype-flow.js`，在真实文件运行 `10-real-file-baseline.js`；
8. 更新本矩阵与 `docs/penpot-mcp/known-unknowns.md`，再跑 `npm run verify`。

## 4. 证据边界

- `[实测]`：2.18.7 合成页或本仓库纯函数测试；
- `[源码]`：官方 API/总览，尚未在本轮执行；
- `[推断]`：相邻行为推断，不能作为唯一依据；
- `[待验证]`：升级或新部署必须先探测。

本矩阵不承诺 2.18.7 之外的版本行为。
