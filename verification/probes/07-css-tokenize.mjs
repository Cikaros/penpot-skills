import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditCss,
  flattenDtcg,
  tokenizeCssDetailed,
} from "../../shared/design-tokens.mjs";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const tokens = flattenDtcg(
  JSON.parse(fs.readFileSync(path.join(root, "shared/tokens/example.tokens.json"), "utf8")),
);

// Shape of the CSS observed from generateStyle in 2.18.7: raw 8-digit alpha
// colour plus a raw background. The 16px gap is intentionally left raw to make
// the audit visible.
const generated = `
.e2ehome-abc123 {
  color: #3366ffFF;
  background-color: #FFFFFF;
  gap: 16px;
}
`;

const result = tokenizeCssDetailed(generated, tokens);
const audit = auditCss(result.css);

if (result.unmapped.length) {
  throw new Error(`unmapped colours: ${result.unmapped.join(", ")}`);
}
if (result.css.includes("#3366ffFF")) {
  throw new Error("8-digit alpha colour was not normalized");
}

console.log(JSON.stringify({
  ok: true,
  replacements: result.replacements,
  css: result.css.trim(),
  audit,
}, null, 2));
