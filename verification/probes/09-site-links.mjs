import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const site = path.join(root, "site");
const errors = [];
let pages = 0;
let links = 0;

if (!fs.existsSync(site)) {
  console.error("site-links: site/ is missing; run npm run site");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

for (const file of walk(site)) {
  pages += 1;
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const raw = match[1];
    if (/^(https?:|mailto:|data:|#)/i.test(raw)) continue;
    const targetPart = decodeURIComponent(raw.split("#")[0]);
    if (!targetPart) continue;
    links += 1;
    const resolved = path.resolve(path.dirname(file), targetPart);
    if (!fs.existsSync(resolved)) {
      errors.push(`${path.relative(root, file)} -> ${raw}`);
    }
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, pages, links, broken: errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, pages, links }, null, 2));
