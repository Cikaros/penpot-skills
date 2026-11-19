import { collectOverflows } from "../../shared/penpot-guards.mjs";

const root = {
  id: "root",
  name: "Board",
  width: 390,
  height: 844,
  children: [
    {
      id: "card",
      name: "card-Vehicle",
      parentX: 16,
      parentY: 16,
      width: 200,
      height: 120,
      children: [
        {
          id: "badge",
          name: "badge",
          parentX: 190,
          parentY: 10,
          width: 40,
          height: 20,
          children: [],
        },
      ],
    },
  ],
};

const overflows = collectOverflows(root);
const first = overflows[0] ?? null;
const ok = overflows.length === 1 && first?.id === "badge" && first?.parent === "card-Vehicle";

console.log(JSON.stringify({ ok, probeId: "V-03", count: overflows.length, first }));
if (!ok) process.exitCode = 1;
