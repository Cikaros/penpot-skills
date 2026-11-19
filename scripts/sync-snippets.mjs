import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const manifestPath = path.join(root, "shared", "snippets", "manifest.json");
const write = process.argv.includes("--write");
const check = process.argv.includes("--check") || !write;
const errors = [];

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function normalize(text) {
  return text.replaceAll("\r\n", "\n");
}

if (!fs.existsSync(manifestPath)) {
  console.error("snippets: missing shared/snippets/manifest.json");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let blockCount = 0;

for (const snippet of manifest.snippets ?? []) {
  const sourcePath = path.join(root, "shared", "snippets", snippet.file);
  if (!fs.existsSync(sourcePath)) {
    errors.push(`missing snippet source: ${snippet.file}`);
    continue;
  }

  const raw = normalize(fs.readFileSync(sourcePath, "utf8")).trim();
  const body = raw.replace(/^export\s+/gm, "");
  const markerStart = `// SNIPPET:${snippet.id}:start`;
  const markerEnd = `// SNIPPET:${snippet.id}:end`;
  const block = `${markerStart}\n${body}\n${markerEnd}`;

  for (const target of snippet.targets ?? []) {
    const targetPath = path.join(root, target);
    if (!fs.existsSync(targetPath)) {
      errors.push(`missing target: ${target}`);
      continue;
    }

    const original = fs.readFileSync(targetPath, "utf8");
    const eol = original.includes("\r\n") ? "\r\n" : "\n";
    const text = normalize(original);
    const startCount = text.split(markerStart).length - 1;
    const endCount = text.split(markerEnd).length - 1;
    if (startCount === 0 || startCount !== endCount) {
      errors.push(`${target}: markers for ${snippet.id} are missing or unbalanced`);
      continue;
    }

    let cursor = 0;
    let updated = "";
    for (let i = 0; i < startCount; i += 1) {
      const start = text.indexOf(markerStart, cursor);
      const end = text.indexOf(markerEnd, start);
      if (start < 0 || end < 0) {
        errors.push(`${target}: cannot find complete block for ${snippet.id}`);
        break;
      }
      updated += text.slice(cursor, start) + block;
      cursor = end + markerEnd.length;
    }
    updated += text.slice(cursor);
    blockCount += startCount;

    if (check) {
      if (normalize(original) !== updated) {
        errors.push(`${target}: ${snippet.id} block is out of date; run npm run sync`);
      }
    } else if (original !== updated.replaceAll("\n", eol)) {
      fs.writeFileSync(targetPath, updated.replaceAll("\n", eol), "utf8");
    }
  }
}

if (errors.length) {
  console.error(`snippets: ${errors.length} error(s)`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`snippets: ${manifest.snippets?.length ?? 0} source(s), ${blockCount} block(s), up to date`);
