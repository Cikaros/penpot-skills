// execute_code probe: read-only baseline for a real project file.
// Run only when a real project file is open; this probe never writes.

const file = penpot.currentFile;
const page = penpot.currentPage;
const boards = page
  ? penpotUtils.analyzeDescendants(
      page.root,
      (root, node) =>
        node.type === "board"
          ? { id: node.id, name: node.name, width: node.width, height: node.height }
          : null,
      4,
    )
  : [];

return {
  file: file ? { id: file.id, name: file.name } : null,
  currentPage: page ? { id: page.id, name: page.name } : null,
  pages: file ? file.pages.map((item) => ({ id: item.id, name: item.name })) : [],
  boards: boards.map((item) => item.result),
  selection: penpot.selection.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type,
  })),
  version: penpot.version,
};
