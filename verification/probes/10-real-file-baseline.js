// execute_code probe: read-only baseline for a real project file.
// Run only when a real project file is open; this probe never writes.

const file = penpot.currentFile;
const page = penpot.currentPage;
const boards = page
  ? penpotUtils.analyzeDescendants(page.root, (root, node) => node.type === "board", 4)
  : [];

return {
  file: file ? { id: file.id, name: file.name } : null,
  currentPage: page ? { id: page.id, name: page.name } : null,
  pages: file ? file.pages.map((item) => ({ id: item.id, name: item.name })) : [],
  boards: boards.map((item) => ({
    id: item.shape.id,
    name: item.shape.name,
    width: item.shape.width,
    height: item.shape.height,
  })),
  selection: penpot.selection.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
  })),
  version: penpot.version,
};
