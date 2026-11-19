import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const skillDir = path.join(root, "skills", "penpot-mcp");
const manifestPath = path.join(skillDir, "manifest.json");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const check = process.argv.includes("--check");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && full !== manifestPath) out.push(full);
  }
  return out;
}

// Hash normalized LF text so a Windows checkout (CRLF) and CI (LF) agree.
const files = walk(skillDir)
  .map((file) => {
    const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
    const bytes = Buffer.from(text, "utf8");
    return {
      path: path.relative(skillDir, file).replaceAll("\\", "/"),
      bytes: bytes.length,
      sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = {
  schemaVersion: 1,
  name: "penpot-mcp",
  version: pkg.version,
  entry: "SKILL.md",
  files,
};
const rendered = `${JSON.stringify(manifest, null, 2)}\n`;

if (check) {
  if (!fs.existsSync(manifestPath)) {
    console.error("manifest: missing skills/penpot-mcp/manifest.json; run npm run manifest");
    process.exit(1);
  }
  if (fs.readFileSync(manifestPath, "utf8") !== rendered) {
    console.error("manifest: stale; run npm run manifest");
    process.exit(1);
  }
} else {
  fs.writeFileSync(manifestPath, rendered, "utf8");
}

console.log(`manifest: ${files.length} file(s), v${pkg.version}, ${check ? "up to date" : "written"}`);
