/**
 * Image signature guard: PNG / JPEG / GIF87a / GIF89a / WEBP.
 * Requires at least 12 bytes and rejects other RIFF containers (WAV/AVI).
 */
export function imageKind(bytes) {
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
