// V-04: live direct-parent overflow probe. WRITES a temporary board and removes it.
// Run only on a disposable acceptance page.
const board = penpot.createBoard();
board.name = "probe-overflow-" + Date.now();
board.resize(200, 100);
board.clipContent = true;

try {
  const outside = [];
  const walk = (parent) => {
    for (const child of parent.children || []) {
      const px = child.parentX;
      const py = child.parentY;
      if (px < 0 || py < 0 || px + child.width > parent.width || py + child.height > parent.height) {
        outside.push({
          id: child.id,
          name: child.name,
          parent: parent.name,
          px,
          py,
          w: child.width,
          h: child.height
        });
      }
      if (child.children?.length) walk(child);
    }
  };

  const direct = penpot.createRectangle();
  direct.name = "probe-overflow-direct";
  direct.resize(40, 20);
  board.appendChild(direct);
  penpotUtils.setParentXY(direct, 190, 10);

  const nested = penpot.createBoard();
  nested.name = "probe-overflow-nested";
  nested.resize(100, 50);
  board.appendChild(nested);
  penpotUtils.setParentXY(nested, 10, 10);

  const nestedChild = penpot.createRectangle();
  nestedChild.name = "probe-overflow-nested-child";
  nestedChild.resize(40, 20);
  nested.appendChild(nestedChild);
  penpotUtils.setParentXY(nestedChild, 90, 10);

  walk(board);
  return {
    probeId: "V-04",
    clipContent: board.clipContent,
    outsideCount: outside.length,
    outside
  };
} finally {
  board.remove();
}
