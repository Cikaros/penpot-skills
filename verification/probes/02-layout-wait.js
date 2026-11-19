// V-02: layout/wait probe. WRITES temporary boards to the current page and removes them.
// Run only on a disposable acceptance page.
const t = (value) => typeof value;
const TIMEOUT_MS = 2000;

const base = {
  probeId: "V-02",
  page: penpot.currentPage ? penpot.currentPage.name : null,
  naturalChildOrdering: penpot.flags ? penpot.flags.naturalChildOrdering : null,
  layoutWait: t(penpot.waitForLayoutUpdate),
  timeoutMs: TIMEOUT_MS
};

if (base.layoutWait !== "function") {
  return { ...base, skipped: "waitForLayoutUpdate unavailable" };
}

async function waitForLayout() {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve("timeout"), TIMEOUT_MS);
  });
  const result = Promise.resolve(penpot.waitForLayoutUpdate()).then(
    () => "resolved",
    (e) => "error: " + String(e && e.message ? e.message : e)
  );
  const value = await Promise.race([result, timeout]);
  clearTimeout(timer);
  return value;
}

async function runCase(mode) {
  const board = penpot.createBoard();
  board.name = `probe-layout-${mode}-` + Date.now();
  board.resize(200, 200);

  try {
    if (mode === "layout-before-children") {
      const flex = board.addFlexLayout();
      flex.dir = "column";
      for (let i = 0; i < 3; i += 1) {
        const rect = penpot.createRectangle();
        rect.name = `probe-${mode}-${i}`;
        rect.resize(40, 20);
        flex.appendChild(rect);
      }
    } else {
      for (let i = 0; i < 3; i += 1) {
        const rect = penpot.createRectangle();
        rect.name = `probe-${mode}-${i}`;
        rect.resize(40, 20);
        board.appendChild(rect);
      }
      penpotUtils.addFlexLayout(board, "column");
    }

    const before = board.children.map((child) => Math.round(child.y));
    const wait = await waitForLayout();
    const after = board.children.map((child) => Math.round(child.y));

    return { mode, wait, before, after, childCount: board.children.length };
  } finally {
    board.remove();
  }
}

const cases = [];
cases.push(await runCase("layout-before-children"));
cases.push(await runCase("existing-children-helper"));

return { ...base, cases };
