# 认证与传输排查

## 1. `userToken` 到底是什么

`userToken` 是 **MCP 传输层**的会话标识，不是 Penpot 登录令牌。

- MCP HTTP 端点（`/mcp`、`/sse`）把它读进 `sessionContext`，用于多用户模式下把请求路由到对应插件连接。
- 插件 WebSocket 连接（`ws://host:4402?userToken=...`）用它注册 `clientsByToken`。
- 多用户模式下：缺 token → `close(1008, "Missing userToken parameter")`；同一 token 重复连接 → 拒绝新连接。
- 官方实现里插件侧的 token 仍是 `const userToken = "dummyToken"`（`penpot-plugin/src/main.ts` 的 TODO），说明"插件→用户"绑定尚未完成。

所以：把 `?userToken=` 拼在 URL 上，**不会**让 Penpot 的 `/api/rpc/command/*` 变成已登录。

## 2. Penpot 后端只认两种凭证

```
get-token = (some-fn get-token-from-cookie get-token-from-authorization)
```

- Cookie：`auth-token`，`HttpOnly`，`SameSite=Lax`（开启 `:cors` 时为 `None`）。
- Header：`Authorization: Bearer <jwt>` 或 `Authorization: Token <jwt>`。

没有 query 参数分支。与会话相关的 token 签发方为 `iss="authentication"`；个人访问令牌为 `access-token`（需 `:access-tokens` flag）；MCP OAuth 令牌为 `urn:penpot:mcp-token`（需 `:mcp` flag，且只对白名单 RPC 命令生效）。

## 3. 为什么插件里 `fetch` 是匿名

插件运行在独立于 Penpot 应用的沙箱/源里，`fetch('/api/rpc/...')` 既不满足同源，也拿不到 `HttpOnly` cookie；`credentials:'include'` 在没有对应 CORS 许可时同样无效。返回的 401 HTML 常被误判为"图片数据"。

**正确判据只有一个**：

```js
const user = (() => {
  try { return penpot.currentUser ? { id: penpot.currentUser.id, name: penpot.currentUser.name } : null; }
  catch (e) { return "ERR " + e; }
})();
return { user };
```

- `user.id` 有值 → 登录态正常，问题在用了 `fetch`；改用 `penpot.*`。
- `user === null` → 插件所在标签页确实未登录/会话过期，让用户在该标签页登录。
- `user` 是 `"ERR ... user:read"` → **插件缺少用户信息权限，不是未登录**；跳过用户信息，继续操作文件即可（2.18.7 实测）。

不要用 `fetch('/api/rpc/command/get-profile')` 判断登录态，它的结果永远是匿名或错误页。也不要写 `location.origin`：执行上下文里没有 `location`。

## 4. 远程模式（vendor 托管 MCP）

`PENPOT_MCP_REMOTE_MODE=true` 或多用户模式会：

- 从工具清单里**移除 `import_image`**；
- 从 `export_shape` 的 schema 里**删除 `filePath`**。

因此远程部署下导入图片只能走 `execute_code`：

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(base64);   // 2.18.7：无 penpotUtils.atob
// SNIPPET:image-kind:start
/**
 * Image signature guard: PNG / JPEG / GIF87a / GIF89a / WEBP.
 * Requires at least 12 bytes and rejects other RIFF containers (WAV/AVI).
 */
function imageKind(bytes) {
  if (!bytes || typeof bytes.length !== "number" || bytes.length < 12) return null;

  const s = (from, to) => String.fromCharCode(...Array.from(bytes.slice(from, to)));

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) {
    return "png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (s(0, 6) === "GIF87a" || s(0, 6) === "GIF89a") return "gif";
  if (s(0, 4) === "RIFF" && s(8, 12) === "WEBP") return "webp";
  return null;
}
// SNIPPET:image-kind:end
if (!imageKind(bytes)) throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0, 8)));

const media = await penpot.uploadMediaData(name, bytes, "image/png");
if (!media.width || !media.height) throw new Error("decoded size is zero");
const rect = penpot.createRectangle();
rect.name = name;
rect.resize(media.width, media.height);
rect.fills = [{ fillOpacity: 1, fillImage: media }];
return { shapeId: rect.id, w: media.width, h: media.height };
```

## 5. "上传成功但图片空白"的定位顺序

1. 校验**源字节**魔数（PNG `89 50 4E 47`、JPEG `FF D8`、GIF `GIF8`、WEBP `RIFF....WEBP`）。
2. 若源字节以 `<html`/`<!doc` 开头 → 取源那一步就已经拿到错误页，不是上传问题。
3. 上传后读 `media.width/media.height`；为 0 说明服务端没解出图。
4. 有 `export_shape` 且允许 `filePath` 时落盘目视确认；远程模式没有 `filePath` 时只做字节/宽高校验，并注明“未做视觉确认”。
5. 不要反复重传同一份坏字节；先修数据源。

## 6. 需要向托管方确认的问题

- `userToken` 是否只用于 MCP 路由？插件连接 MCP 时用的 token 从哪里来？
- 插件是否与 Penpot 同源部署？若跨源，插件内 `fetch` 永远无 cookie。
- 服务端是否开启 `:access-tokens` / `:mcp` flag？是否支持 `Authorization: Bearer`？
- 上传接口返回 401 时是否会以 HTML 形式回包（这会被客户端误存为图片）。

## 7. 安全

不要把任何长期令牌放在 URL 查询串里：会进 nginx access log、浏览器历史、Referer。优先 `Authorization` 头；必须用 URL 时确保是短期、可撤销、仅限 MCP 路由的令牌。
