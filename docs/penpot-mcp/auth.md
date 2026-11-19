# 认证与连接排查

## 1. `userToken` 的边界

`userToken` 是 **MCP 传输层**的会话标识，不是 Penpot 登录令牌。

- MCP HTTP 端点（`/mcp`、`/sse`）把它读进会话上下文，用于多用户模式下路由请求。
- 插件 WebSocket 用它注册连接；同一 token 重复连接会被拒绝，缺失会被 `close(1008)`。
- 官方插件侧的 token 目前仍是硬编码的占位值（源码中的 TODO），说明"插件→用户"绑定尚未完成。

结论：把 `?userToken=` 拼在 URL 上，**不会**让 Penpot 的 `/api/rpc/command/*` 变成已登录。

## 2. Penpot 后端只认两种凭证

- Cookie：`auth-token`，`HttpOnly`，默认 `SameSite=Lax`（开启 `:cors` 时为 `None`）。
- 请求头：`Authorization: Bearer <jwt>` 或 `Authorization: Token <jwt>`。

没有查询参数分支。会话 token 的签发方为 `authentication`；个人访问令牌需开 `:access-tokens`；MCP OAuth 令牌需开 `:mcp`，且只对白名单命令生效。

## 3. 为什么插件里 `fetch` 一定是匿名

插件运行在独立于 Penpot 应用的沙箱/源中：

- 不满足同源，拿不到 `HttpOnly` cookie；
- 跨源请求没有对应的 CORS 许可时，`credentials: "include"` 也不会带 cookie；
- 于是 `/api/rpc/...` 返回 401 或 HTML 错误页。

**判断登录态的正确方式**只有插件 API：

```js
const user = (() => {
  try { return penpot.currentUser ? { id: penpot.currentUser.id, name: penpot.currentUser.name } : null; }
  catch (e) { return "ERR " + e; }
})();
return { user };
```

- `user.id` 有值 → 登录正常，问题在用了 `fetch`。
- `user === null` → 该标签页确实未登录/已过期。
- `user` 为 `"ERR ... user:read"` → 插件缺少用户信息权限，**不是未登录**（2.18.7 实测）；跳过用户信息继续操作文件。

不要写 `location.origin`——执行上下文没有 `location`。也不要用 `fetch('/api/rpc/command/get-profile')` 判断登录，它永远是匿名或错误页。

## 4. 远程模式下的图片导入

远程/多用户模式移除了 `import_image`，改用：

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(base64);
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

1. 校验源字节魔数（PNG/JPEG/GIF/WEBP）。
2. 若源字节以 `<html`/`<!doc` 开头 → 取源那步就拿到错误页，不是上传问题。
3. 上传后看 `media.width`/`media.height`，为 0 说明服务端没解出图。
4. 有 `export_shape` 且允许 `filePath` 时落盘目视确认；远程模式没有 `filePath` 时，只能做字节/宽高校验，并在汇报里注明“未做视觉确认”。
5. 不要反复重传同一份坏字节，先修数据源。

## 6. 症状速查

| 症状 | 原因 | 处理 |
|---|---|---|
| `No Penpot plugin instances ... connected` | 插件未开或未连接 | 打开插件点 Connect |
| `Multiple (N) ... instances` | 多个插件实例 | 只留一个 |
| `Task ... timed out after 30 seconds` | 单次代码过重 | 分片、去全树遍历 |
| 401 / `Anonymous User` | 插件上下文没有 cookie | 改用 `penpot.*`，不是登录故障 |
| 上传后空白、读回 `<html>` | 错误页被当图片 | 魔数校验，重取源数据 |
| 元素"消失" | 父级 `clipContent` 裁剪 | 相对坐标归零 |

## 7. 安全

长期令牌不要放 URL 查询串：会进 access log、浏览器历史、Referer。优先 `Authorization` 头；必须用 URL 时确保短期、可撤销、仅限 MCP 路由。