// V-05: live image upload/fill probe. WRITES a temporary board and removes it.
// Run only on a disposable acceptance page.
const board = penpot.createBoard();
board.name = "probe-image-" + Date.now();
board.resize(100, 100);

try {
  // A CRC-valid 1x1 RGBA PNG fixture, generated with Python zlib/crc32.
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;

  const rect = penpot.createRectangle();
  rect.name = "probe-image-rect";
  rect.resize(1, 1);
  board.appendChild(rect);

  const media = await penpot.uploadMediaData("probe-1x1.png", bytes, "image/png");
  rect.fills = [{ fillOpacity: 1, fillImage: media }];
  const data = await rect.fills[0].fillImage.data();
  const dataIsPng = data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47;

  return {
    probeId: "V-05",
    sourceIsPng: isPng,
    sourceBytes: bytes.length,
    media: { width: media.width, height: media.height },
    dataBytes: data.length,
    dataIsPng
  };
} finally {
  board.remove();
}
