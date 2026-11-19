import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const errors = [];
const warnings = [];

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const files = [
  ...walk(path.join(root, "docs")),
  ...walk(path.join(root, "skills")),
  ...walk(path.join(root, "verification")),
  path.join(root, "README.md"),
  path.join(root, "CHANGELOG.md"),
  path.join(root, "CONTRIBUTING.md"),
].filter((file) => fs.existsSync(file));

function fail(file, line, message) {
  errors.push(`${rel(file)}:${line}: ${message}`);
}

function warn(file, line, message) {
  warnings.push(`${rel(file)}:${line}: ${message}`);
}

function checkFrontmatter(file, lines) {
  if (path.basename(file) !== "SKILL.md") return;

  if (lines[0] !== "---") {
    fail(file, 1, "SKILL.md 缺少 frontmatter");
    return;
  }
  const end = lines.indexOf("---", 1);
  if (end < 0) {
    fail(file, 1, "frontmatter 未闭合");
    return;
  }

  const fields = new Map();
  for (let i = 1; i < end; i += 1) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    fields.set(match[1], match[2]);
  }

  for (const key of fields.keys()) {
    if (key !== "name" && key !== "description") {
      fail(file, 1, `frontmatter 只允许 name/description，发现 ${key}`);
    }
  }
  const name = fields.get("name");
  const description = fields.get("description");
  if (!name) fail(file, 1, "frontmatter 缺少 name");
  if (!description) fail(file, 1, "frontmatter 缺少 description");
  if (description && description.length > 1024) {
    fail(file, 1, `description 超过 1024 字符（${description.length}）`);
  }
  if (name && name !== path.basename(path.dirname(file))) {
    fail(file, 1, `name=${name} 与目录 ${path.basename(path.dirname(file))} 不一致`);
  }
}

function checkLinks(file, text) {
  const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (!target || target.startsWith("#")) continue;
    if (/^(https?:|mailto:|data:)/i.test(target)) continue;

    target = target.replace(/^<|>$/g, "");
    const pathPart = target.split("#")[0];
    if (!pathPart) continue;

    const resolved = path.resolve(path.dirname(file), decodeURIComponent(pathPart));
    if (!fs.existsSync(resolved)) {
      fail(file, 0, `相对链接不存在: ${target}`);
    }
  }
}

function checkHeadings(file, lines) {
  let inFence = false;
  let section = null;
  let expectedSub = 1;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;

    const h2 = /^##\s+(\d+)\.\s+/.exec(line);
    if (h2) {
      section = Number(h2[1]);
      expectedSub = 1;
      return;
    }

    const h3 = /^###\s+(\d+)\.(\d+)\s+/.exec(line);
    if (!h3) return;

    const parent = Number(h3[1]);
    const sub = Number(h3[2]);
    if (section === null || parent !== section) {
      fail(file, index + 1, `三级标题 ${parent}.${sub} 与上级 ## ${section ?? "?"} 不匹配`);
      return;
    }
    if (sub !== expectedSub) {
      fail(file, index + 1, `三级标题编号应连续，期望 ${parent}.${expectedSub}，实际 ${parent}.${sub}`);
    }
    expectedSub = sub + 1;
  });
}

function checkFences(file, lines) {
  let open = false;
  let openLine = 0;
  lines.forEach((line, index) => {
    if (!/^\s*```/.test(line)) return;
    if (!open) {
      open = true;
      openLine = index + 1;
    } else {
      open = false;
    }
  });
  if (open) fail(file, openLine, "代码围栏未闭合");
}

function checkBannedPatterns(file, lines) {
  let inFence = false;

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) return;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    if (/penpot\.openPage\(/.test(line) && !/await\s+penpot\.openPage\(/.test(line)) {
      fail(file, index + 1, "penpot.openPage() 必须 await");
    }
    // 注意：penpot.root 与 penpot.currentPage.root 都是当前页根，官方 API 同时提供；不再禁用。
    // penpotUtils.getPages() 官方返回 {id,name}[]，也不强制 map。
    if (/fontWeight\s*=\s*["']700["']/.test(line)) {
      fail(file, index + 1, "visual-spec 只允许 400/500/600，不要用 700");
    }
    if (/String\.fromCharCode\(\.\.\.h\)\s*===\s*["']RIFF["']/.test(line)) {
      fail(file, index + 1, "RIFF 不能单独判定 WEBP，必须检查第 8–11 字节");
    }
    if (/startsWith\(["']GIF["']\)/.test(line)) {
      fail(file, index + 1, "GIF 判定必须使用 GIF87a/GIF89a 完整签名");
    }
    if (/h\[0\]\s*===\s*0x89\s*&&\s*h\[1\]\s*===\s*0x50/.test(line)) {
      fail(file, index + 1, "PNG 判定必须使用完整 8 字节签名");
    }
    if (/sample:\s*outside\.slice\([^)]*\)(?!\.map)/.test(line)) {
      fail(file, index + 1, "sample 必须映射为纯数据（.map(x => x.result)）");
    }
    if (/\b(?:name|board\.name|shape\.name)\s*=\s*["'][^"']*\/[^"']*["']/.test(line)) {
      fail(file, index + 1, "Penpot 名称不能含 /，会被归一化成 ' / '");
    }
    if (/findShape(?:s)?\([^)]*===\s*["'][^"']*\/[^"']*["']/.test(line)) {
      fail(file, index + 1, "按名称查找时不要使用含 / 的旧命名");
    }
  });
}

function checkDerivedMarkers(file, text) {
  for (const match of text.matchAll(/<!--\s*DERIVED FROM:\s*([^\s>]+)\s*-->/g)) {
    const source = path.resolve(root, match[1]);
    if (!fs.existsSync(source)) {
      fail(file, 0, `派生源不存在: ${match[1]}`);
    }
  }
}

function latestChangelogVersion() {
  const changelog = path.join(root, "CHANGELOG.md");
  if (!fs.existsSync(changelog)) return null;
  const text = fs.readFileSync(changelog, "utf8");
  const match = /^##\s+v(\d+\.\d+\.\d+)/m.exec(text);
  return match ? match[1] : null;
}

function latestTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim().replace(/^v/, "");
  } catch {
    return null;
  }
}

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  checkFrontmatter(file, lines);
  checkFences(file, lines);
  checkHeadings(file, lines);
  checkLinks(file, text);
  checkBannedPatterns(file, lines);
  checkDerivedMarkers(file, text);
}

const changelogVersion = latestChangelogVersion();
const tagVersion = latestTag();
if (changelogVersion && tagVersion && changelogVersion !== tagVersion) {
  errors.push(`CHANGELOG 最新版本 v${changelogVersion} 与最新 tag v${tagVersion} 不一致`);
}

const pkgPath = path.join(root, "package.json");
if (pkgPath && fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (changelogVersion && pkg.version !== changelogVersion) {
    errors.push(`package.json 版本 ${pkg.version} 与 CHANGELOG v${changelogVersion} 不一致`);
  }
}

if (warnings.length) {
  console.warn(`\n${warnings.length} 个警告：`);
  for (const item of warnings) console.warn(`  - ${item}`);
}

if (errors.length) {
  console.error(`\n${errors.length} 个错误：`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`检查通过：${files.length} 个 Markdown 文件，0 个错误，${warnings.length} 个警告。`);
