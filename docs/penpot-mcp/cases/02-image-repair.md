# 案例 02：图片缺失修复

**场景**：结构里图片位都在，但 `fillImage` 为空，或读回的字节是 HTML 错误页，导出后一片空白。

## 步骤 1：判定"坏图"而不是"没图"

```js
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

const candidates = penpotUtils.findShapes(
  s => s.fills && s.fills.some(f => f.fillImage),
  penpot.currentPage.root
);

const bad = [];
for (const s of candidates.slice(0, 30)) {   // 单片上限，避免 30 秒超时
  try {
    const fill = s.fills.find(f => f.fillImage);
    if (!fill) continue;
    const data = await fill.fillImage.data();   // 2.18.7 实测返回 Promise
    if (!imageKind(data)) {
      bad.push({ id: s.id, name: s.name, head: String.fromCharCode(...data.slice(0, 8)) });
    }
  } catch (e) {
    bad.push({ id: s.id, name: s.name, error: String(e) });
  }
}

return { total: candidates.length, scanned: Math.min(candidates.length, 30), badCount: bad.length, bad };
```

判定标准：字节头不是图片格式 → 坏图。若 `badCount === 0` 但导出仍空白，问题在渲染或尺寸，不在数据。

## 步骤 2：确认可用的数据源

修复的前提是**有正确的源**：

- 本地模式：若要**新建图片形状**，走 `import_image`；若要**修复已有 fill**，仍走 `uploadMediaData`（`import_image` 不会替换现有填充）。
- 远程模式：源以 base64 提供，走 `penpot.uploadMediaData`。
- 都没有：不要"用占位色块假装修好"，直接报告缺源。

## 步骤 3：逐张替换（每片 5–10 张）

```js
const bytes = typeof atob === "function"
  ? Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  : penpotUtils.base64ToByteArray(base64);   // 2.18.7：无 penpotUtils.atob

// 上传前守卫：完整签名，绝不把错误页/WAV/AVI 存成图片
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
if (!imageKind(bytes)) {
  throw new Error("source is not an image: " + String.fromCharCode(...bytes.slice(0, 8)));
}

const media = await penpot.uploadMediaData(name, bytes, "image/png");
if (!media.width || !media.height) throw new Error("decoded size is zero");

const shape = penpotUtils.findShapeById(shapeId);
if (!shape) throw new Error("shape not found: " + shapeId);
const fills = [...shape.fills];
const idx = fills.findIndex(f => f.fillImage);
if (idx < 0) throw new Error("shape has no image fill");

fills[idx] = { ...fills[idx], fillImage: media };   // 保留 fillOpacity 等属性
shape.fills = fills;

return { shapeId, w: media.width, h: media.height };
```

要点：

- 必须先校验源字节再上传；上传后再校验 `media.width/height`。
- 替换时保留原有 `fillOpacity`，只换 `fillImage`。
- 每次只处理一批，避免 30 秒超时。

## 步骤 4：验收

```js
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

const candidates = penpotUtils.findShapes(
  s => s.fills && s.fills.some(f => f.fillImage),
  penpot.currentPage.root
);

const bad = [];
for (const s of candidates.slice(0, 30)) {
  try {
    const d = await s.fills.find(f => f.fillImage).fillImage.data();
    if (!imageKind(d)) bad.push({ name: s.name, id: s.id });
  } catch (e) {
    bad.push({ name: s.name, id: s.id, error: String(e) });
  }
}
return { total: candidates.length, scanned: Math.min(candidates.length, 30), remaining: bad };
```

再对含图区块执行 `export_shape` 落盘目视；若当前部署没有 `filePath`，只做字节/宽高校验，并在汇报里注明“未做视觉确认”。

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 上传"成功"但图空白 | 源字节本身是 HTML | 上传前守卫 |
| `decoded size is zero` | 服务端解不出图 | 换源，不要重试同一份字节 |
| 替换后其它样式丢失 | 重建了 fill 对象 | 展开原 fill 再覆盖 `fillImage` |
| 反复修同一张 | 没有记录已处理 id | 把 id 写入 `storage.fixed` |

## 已知版本差异（2.18.7 实测）

- `fillImage.data()` 返回 Promise，必须 `await`。
- 原生 `atob` 可用，`penpotUtils.atob` 不存在；无原生时用 `penpotUtils.base64ToByteArray`。
- `uploadMediaData(name, bytes, "image/png")` 在插件会话内直接成功，返回正确 `width/height`；401 只出现在手写 `fetch` 调后端时。