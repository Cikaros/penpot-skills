// execute_code probe: creates two boards, one navigate-to interaction and one
// flow, reads them back, then removes everything it created.
// Writes to the current page. Run only on a disposable page.

const page = penpot.currentPage;
let start = null;
let target = null;
let nav = null;
let flow = null;

try {
  start = penpot.createBoard();
  start.name = "probe-Prototype-Start";
  start.resize(390, 844);
  start.fills = [{ fillOpacity: 1, fillColor: "#FFFFFF" }];

  target = penpot.createBoard();
  target.name = "probe-Prototype-Target";
  target.resize(390, 844);
  target.fills = [{ fillOpacity: 1, fillColor: "#F8FAFC" }];

  await penpot.waitForLayoutUpdate();

  nav = start.addInteraction("click", {
    type: "navigate-to",
    destination: target,
  });

  flow = page.createFlow("probe-prototype-flow", start);

  const readback = {
    start: { id: start.id, name: start.name },
    target: { id: target.id, name: target.name },
    interactions: start.interactions.map((interaction) => ({
      trigger: interaction.trigger,
      action: interaction.action.type,
      destination: interaction.action.destination?.id ?? null,
      delay: interaction.delay ?? null,
    })),
    flows: page.flows.map((item) => ({
      name: item.name,
      board: item.startingBoard.id,
    })),
  };

  if (readback.interactions.length !== 1) throw new Error("expected one interaction");
  if (readback.interactions[0].action !== "navigate-to") throw new Error("wrong action");
  if (readback.interactions[0].destination !== target.id) throw new Error("wrong destination");
  if (readback.flows.length !== 1) throw new Error("expected one flow");
  if (readback.flows[0].board !== start.id) throw new Error("wrong flow start");

  return { ok: true, readback };
} finally {
  if (flow) page.removeFlow(flow);
  if (nav) start.removeInteraction(nav);
  if (start) start.remove();
  if (target) target.remove();
}
