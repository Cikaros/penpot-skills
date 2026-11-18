# 案例 02：图片缺失修复

**场景**：结构里图片位都在，但 `fillImage` 为空，或读回的字节是 HTML 错误页，导出后一片空白。

## 步骤 1：判定"坏图"而不是"没图"

```js
const candidates = penpotUtils.findShapes(
  s => s.fills && s.fills.some(f => f.fillImage),
  penpot.root
);

const bad = [];
for (const s of candidates) {
  const fill = s.fills.find(f => f.fillImage);
  const data = fill.fillImage.data();      // 若返回 Promise，改成 await
  const head = String.fromCharCode(...Array.from(data.slice(0, 5)));
  const ok =
    (data[0] === 0x89 && data[1] === 0x50) ||          // PNG
    (data[0] === 0xff && data[1] === 0xd8) ||          // JPEG
    head.startsWith("GIF8") ||                          // GIF
    head.startsWith("RIFF");                            // WEBP
  if (!ok) bad.push({ id: s.id, name: s.name, head });
}

return { total: candidates.length, badCount: bad.length, bad };
```

判定标准：字节头不是图片格式 → 坏图。若 `badCount === 0` 但导出仍空白，问题在渲染或尺寸，不在数据。

## 步骤 2：确认可用的数据源

修复的前提是**有正确的源**：

- 本地模式：源文件在磁盘上，走 `import_image`。
- 远程模式：源以 base64 提供，走 `penpot.uploadMediaData`。
- 都没有：不要"用占位色块假装修好"，直接报告缺源。

## 步骤 3：逐张替换（每片 5–10 张）

```js
const bytes = penpotUtils.atob(base64);

// 上传前守卫：绝不把错误页存成图片
const b = Array.from(bytes.slice(0, 4));
const ok = (b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8)
        || String.fromCharCode(...b).startsWith("GIF")
        || String.fromCharCode(...b) === "RIFF";
if (!ok) throw new Error("source is not an image: " + String.fromCharCode(...bytes.slice(0, 5)));

const media = await penpot.uploadMediaData(name, bytes, "image/png");
if (!media.width || !media.height) throw new Error("decoded size is zero");

const shape = penpotUtils.findShapeById(shapeId);
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
const bad = penpotUtils.findShapes(
  s => s.fills && s.fills.some(f => f.fillImage),
  penpot.root
).filter(s => {
  const d = s.fills.find(f => f.fillImage).fillImage.data();
  return !(d[0] === 0x89 && d[1] === 0x50) && !(d[0] === 0xff && d[1] === 0xd8);
});
return { remaining: bad.map(s => s.name) };
```

再对含图区块执行 `export_shape` 目视确认。

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 上传"成功"但图空白 | 源字节本身是 HTML | 上传前守卫 |
| `decoded size is zero` | 服务端解不出图 | 换源，不要重试同一份字节 |
| 替换后其它样式丢失 | 重建了 fill 对象 | 展开原 fill 再覆盖 `fillImage` |
| 反复修同一张 | 没有记录已处理 id | 把 id 写入 `storage.fixed` |

## 现场需核对

- `fillImage.data()` 是同步还是异步返回（版本差异）。
- `penpot.uploadMediaData` 的参数顺序与 MIME 要求，用 `penpot_api_info("Penpot", "uploadMediaData")` 确认。