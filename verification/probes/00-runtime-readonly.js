// V-00: read-only runtime probe.
// Paste the body into Penpot MCP `execute_code`; it does not modify the file.
const t = (value) => typeof value;
const probe = (fn, fallback = null) => {
  try { return fn(); } catch (e) { return { error: String(e && e.message ? e.message : e) }; }
};

return {
  probeId: "V-00",
  version: probe(() => penpot.version),
  rootType: probe(() => t(penpot.root)),
  currentPageType: probe(() => t(penpot.currentPage)),
  currentPageName: probe(() => penpot.currentPage ? penpot.currentPage.name : null),
  naturalChildOrdering: probe(() => penpot.flags ? penpot.flags.naturalChildOrdering : null),
  layoutWait: probe(() => t(penpot.waitForLayoutUpdate)),
  globals: {
    location: probe(() => t(location)),
    atob: probe(() => t(atob)),
    TextDecoder: probe(() => t(TextDecoder)),
    Blob: probe(() => t(Blob))
  },
  utils: probe(() => Object.getOwnPropertyNames(penpotUtils)
    .filter((name) => !["length", "name", "prototype"].includes(name))),
  user: probe(() => penpot.currentUser ? penpot.currentUser.id : null),
  pages: probe(() => penpotUtils.getPages().map((page) => ({ id: page.id, name: page.name }))),
  selection: probe(() => penpot.selection.map((shape) => ({
    id: shape.id,
    name: shape.name,
    type: shape.type
  })))
};
