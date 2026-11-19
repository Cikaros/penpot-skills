import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = path.join(root, "site");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const check = process.argv.includes("--check");
const write = process.argv.includes("--write") || !check;

const skipDirs = new Set([".git", "node_modules", "site"]);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

const markdownFiles = walk(root).sort();
const pageRel = new Map(
  markdownFiles.map((file) => {
    const rel = path.relative(root, file).replaceAll("\\", "/");
    return [rel, rel.replace(/\.md$/, ".html")];
  }),
);

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slug(text, seen) {
  const base = text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}

function resolveLink(url, currentRel) {
  if (/^(https?:|mailto:|data:|#)/i.test(url)) return url;
  const [pathPart, hash = ""] = url.split("#");
  if (!pathPart.endsWith(".md")) return url;
  const base = path.posix.dirname(currentRel);
  const target = path.posix.normalize(path.posix.join(base, pathPart)).replaceAll("\\", "/");
  const html = pageRel.get(target);
  if (!html) return url;
  const relative = path.posix.relative(path.posix.dirname(currentRel), html);
  return `${relative}${hash ? `#${hash}` : ""}`;
}

function inline(text, currentRel) {
  const codes = [];
  let value = String(text).replace(/`([^`]+)`/g, (_, code) => {
    const token = `\u0000${codes.length}\u0000`;
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  value = escapeHtml(value);
  value = value.replace(/<((?:https?:\/\/|mailto:)[^>]+)>/g, (_, url) => {
    const safe = escapeHtml(url);
    return `<a href="${safe}">${safe}</a>`;
  });
  value = value.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, url) => {
    return `<img src="${escapeHtml(resolveLink(url, currentRel))}" alt="${escapeHtml(alt)}" loading="lazy">`;
  });
  value = value.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, url) => {
    const href = escapeHtml(resolveLink(url, currentRel));
    return `<a href="${href}">${label}</a>`;
  });
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  value = value.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  value = value.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
  return value;
}

function isTableSeparator(line) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function tableCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function renderMarkdown(text, currentRel) {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const out = [];
  const seen = new Map();
  let title = null;
  let seenH1 = false;
  let i = 0;

  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) i = end + 1;
  }

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*```/.test(line)) {
      const lang = line.trim().slice(3).trim();
      const code = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const raw = heading[2].trim();
      const plain = raw.replace(/`([^`]+)`/g, "$1");
      if (level === 1 && !seenH1) {
        title = plain;
        seenH1 = true;
      } else {
        const id = slug(plain, seen);
        out.push(`<h${level} id="${id}">${inline(raw, currentRel)}</h${level}>`);
      }
      i += 1;
      continue;
    }

    if (i + 1 < lines.length && line.includes("|") && isTableSeparator(lines[i + 1])) {
      const headers = tableCells(line);
      const align = tableCells(lines[i + 1]).map((cell) => {
        if (/^:-+:$/.test(cell)) return "center";
        if (/^-+:$/.test(cell)) return "right";
        return "left";
      });
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(tableCells(lines[i]));
        i += 1;
      }
      out.push("<div class=\"table-wrap\"><table>");
      out.push("<thead><tr>");
      headers.forEach((cell, index) => {
        out.push(`<th style="text-align:${align[index] ?? "left"}">${inline(cell, currentRel)}</th>`);
      });
      out.push("</tr></thead><tbody>");
      for (const row of rows) {
        out.push("<tr>");
        headers.forEach((_, index) => {
          out.push(`<td style="text-align:${align[index] ?? "left"}">${inline(row[index] ?? "", currentRel)}</td>`);
        });
        out.push("</tr>");
      }
      out.push("</tbody></table></div>");
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote>${quote.map((q) => inline(q, currentRel)).join("<br>")}</blockquote>`);
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      while (i < lines.length) {
        const match = /^\s*([-*]|\d+\.)\s+(.+)$/.exec(lines[i]);
        if (!match) break;
        const body = match[2];
        const checkbox = /^\[([ xX])\]\s+/.exec(body);
        items.push(checkbox
          ? `<li class="task"><input type="checkbox" disabled${checkbox[1].toLowerCase() === "x" ? " checked" : ""}> ${inline(body.slice(checkbox[0].length), currentRel)}</li>`
          : `<li>${inline(body, currentRel)}</li>`);
        i += 1;
      }
      out.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i += 1;
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i];
      if (!next.trim()) break;
      if (/^\s*```/.test(next) || /^(#{1,4})\s+/.test(next) || /^>\s?/.test(next)) break;
      if (/^\s*([-*]|\d+\.)\s+/.test(next)) break;
      if (i + 1 < lines.length && next.includes("|") && isTableSeparator(lines[i + 1])) break;
      paragraph.push(next);
      i += 1;
    }
    out.push(`<p>${inline(paragraph.join(" "), currentRel)}</p>`);
  }

  const fallback = path.basename(currentRel).replace(/\.md$/, "");
  return { title: title ?? fallback, html: out.join("\n") };
}

const CSS = `:root {
  color-scheme: light;
  --bg: #f5f7fb;
  --panel: #ffffff;
  --ink: #172033;
  --muted: #5b6577;
  --line: #dbe2ee;
  --brand: #1f5eff;
  --code: #f2f5fa;
  --warn: #fff7e8;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font-family: "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif;
  line-height: 1.7;
}
a { color: var(--brand); text-decoration-thickness: 1px; text-underline-offset: 3px; }
.layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); min-height: 100vh; }
.sidebar {
  position: sticky; top: 0; align-self: start; height: 100vh; overflow: auto;
  padding: 24px 18px; background: #101827; color: #e8eefb;
}
.sidebar .brand { display: block; color: #fff; font-weight: 700; letter-spacing: .02em; margin-bottom: 4px; }
.sidebar .sub { color: #aab7cf; font-size: 12px; margin-bottom: 22px; }
.sidebar h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #8fa2c4; margin: 20px 0 8px; }
.sidebar a { color: #d9e3f6; text-decoration: none; display: block; padding: 5px 8px; border-radius: 6px; font-size: 13px; }
.sidebar a:hover { background: #1d2a40; color: #fff; }
.sidebar a.active { background: #214a9a; color: #fff; }
main { width: min(980px, 100%); padding: 42px 40px 80px; }
.page-title { margin: 0 0 8px; font-size: clamp(28px, 4vw, 42px); line-height: 1.2; }
.lede { color: var(--muted); margin: 0 0 28px; }
article { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 30px 34px; box-shadow: 0 8px 28px rgba(23,32,51,.05); }
article h2 { margin-top: 34px; padding-top: 8px; border-top: 1px solid var(--line); }
article h3 { margin-top: 26px; }
article p, article li { color: #263247; }
article code { background: var(--code); padding: .12em .35em; border-radius: 5px; font-size: .92em; }
article pre { background: #101827; color: #e8eefb; padding: 16px 18px; border-radius: 10px; overflow: auto; line-height: 1.5; }
article pre code { background: transparent; padding: 0; color: inherit; }
blockquote { margin: 18px 0; padding: 12px 16px; background: var(--warn); border-left: 4px solid #d99b23; border-radius: 0 8px 8px 0; color: #4b3a15; }
blockquote code { background: #f5e8c9; }
.table-wrap { overflow-x: auto; margin: 18px 0; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { border: 1px solid var(--line); padding: 8px 10px; vertical-align: top; }
th { background: #f0f4fb; }
hr { border: 0; border-top: 1px solid var(--line); margin: 28px 0; }
.task { list-style: none; margin-left: -1.2em; }
input[type="checkbox"] { accent-color: var(--brand); }
.index-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-top: 18px; }
.card { display: block; background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; text-decoration: none; color: var(--ink); }
.card:hover { border-color: var(--brand); box-shadow: 0 8px 20px rgba(31,94,255,.08); }
.card strong { display: block; margin-bottom: 4px; }
.card span { color: var(--muted); font-size: 13px; }
.site-footer { color: var(--muted); font-size: 12px; margin-top: 28px; }
@media (max-width: 820px) {
  .layout { display: block; }
  .sidebar { position: static; height: auto; }
  main { padding: 26px 16px 60px; }
  article { padding: 20px 18px; }
}
`;

function navFor(currentRel, rootPrefix) {
  const groups = [
    ["开始", ["README.md", "CONTRIBUTING.md"]],
    ["设计", [
      "docs/design/principles.md",
      "docs/design/prototyping.md",
      "docs/design/usability-test.md",
      "docs/design/design-system.md",
      "docs/design/ai-collaboration.md",
      "docs/design/states.md",
      "docs/design/accessibility.md",
      "docs/design/tokens.md",
      "docs/design/visual-spec.md",
      "docs/design/components.md",
      "docs/design/prompt-brief.md",
    ]],
    ["Penpot MCP", [
      "docs/penpot-mcp/usage.md",
      "docs/penpot-mcp/conventions.md",
      "docs/penpot-mcp/pitfalls.md",
      "docs/penpot-mcp/auth.md",
      "docs/penpot-mcp/glossary.md",
      "docs/penpot-mcp/known-unknowns.md",
      "docs/penpot-mcp/cases/README.md",
      "docs/penpot-mcp/cases/01-homepage-build.md",
      "docs/penpot-mcp/cases/02-image-repair.md",
      "docs/penpot-mcp/cases/03-overflow-fix.md",
      "docs/penpot-mcp/cases/04-design-to-code.md",
      "docs/penpot-mcp/cases/05-prototype-flow.md",
    ]],
    ["工程", ["docs/engineering/COMPASS.md", "verification/README.md", "verification/compatibility.md"]],
    ["变更", ["CHANGELOG.md"]],
  ];
  return groups.map(([name, files]) => {
    const links = files.filter((file) => pageRel.has(file)).map((file) => {
      const active = file === currentRel ? " class=\"active\"" : "";
      return `<a${active} href="${rootPrefix}${pageRel.get(file)}">${escapeHtml(pageTitle(file))}</a>`;
    }).join("");
    return links ? `<h2>${escapeHtml(name)}</h2>${links}` : "";
  }).join("");
}

function pageTitle(rel) {
  const text = fs.readFileSync(path.join(root, rel), "utf8").replaceAll("\r\n", "\n");
  const match = /^#\s+(.+)$/m.exec(text);
  return match ? match[1].replace(/`([^`]+)`/g, "$1").trim() : path.basename(rel, ".md");
}

function summarize(rel) {
  const text = fs.readFileSync(path.join(root, rel), "utf8").replaceAll("\r\n", "\n");
  const blocks = text.split(/\n\s*\n/);
  const paragraph = blocks.find((block) => {
    const first = block.trimStart();
    return first && !/^[#>`|]/.test(first) && !first.startsWith("---") && !first.startsWith("```");
  });
  return paragraph ? paragraph.replace(/[*_`#>-]/g, "").replace(/\s+/g, " ").trim().slice(0, 90) : "打开文档";
}

function pageHtml(rel, body, title) {
  const depth = rel.split("/").length - 1;
  const rootPrefix = depth ? "../".repeat(depth) : "./";
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · penpot-skills</title>
<link rel="stylesheet" href="${rootPrefix}assets/style.css">
</head>
<body>
<div class="layout">
<aside class="sidebar">
  <a class="brand" href="${rootPrefix}index.html">penpot-skills</a>
  <div class="sub">Penpot 操作知识与设计规范</div>
  ${navFor(rel, rootPrefix)}
</aside>
<main>
  <h1 class="page-title">${escapeHtml(title)}</h1>
  <p class="lede">静态文档站 · 由 <code>npm run site</code> 从 Markdown 生成</p>
  <article>${body}</article>
  <p class="site-footer">仓库基线 v${pkg.version} · 证据边界以各文档标注为准</p>
</main>
</div>
</body>
</html>`;
}

const generated = new Map();
for (const file of markdownFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (rel === "site/index.html") continue;
  const text = fs.readFileSync(file, "utf8");
  const rendered = renderMarkdown(text, rel);
  const outRel = pageRel.get(rel);
  generated.set(outRel, pageHtml(rel, rendered.html, rendered.title));
}

const indexGroups = [
  ["设计方法", [
    "docs/design/principles.md",
    "docs/design/prototyping.md",
    "docs/design/usability-test.md",
    "docs/design/design-system.md",
    "docs/design/ai-collaboration.md",
    "docs/design/states.md",
    "docs/design/accessibility.md",
    "docs/design/tokens.md",
    "docs/design/visual-spec.md",
    "docs/design/components.md",
  ]],
  ["Penpot MCP", [
    "docs/penpot-mcp/usage.md",
    "docs/penpot-mcp/conventions.md",
    "docs/penpot-mcp/pitfalls.md",
    "docs/penpot-mcp/auth.md",
    "docs/penpot-mcp/cases/README.md",
    "docs/penpot-mcp/cases/05-prototype-flow.md",
  ]],
  ["验证", ["docs/engineering/COMPASS.md", "verification/README.md", "verification/compatibility.md"]],
];

const cards = indexGroups.map(([name, files]) => {
  const items = files.filter((file) => pageRel.has(file)).map((file) => {
    return `<a class="card" href="${pageRel.get(file)}"><strong>${escapeHtml(pageTitle(file))}</strong><span>${escapeHtml(summarize(file))}</span></a>`;
  }).join("");
  return `<h2>${escapeHtml(name)}</h2><div class="index-grid">${items}</div>`;
}).join("\n");

generated.set("index.html", `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>penpot-skills · 文档站</title>
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
<div class="layout">
<aside class="sidebar">
  <a class="brand" href="index.html">penpot-skills</a>
  <div class="sub">Penpot 操作知识与设计规范</div>
  <h2>入口</h2>
  <a href="README.html">项目说明</a>
  <a href="CONTRIBUTING.html">贡献指南</a>
  <a href="CHANGELOG.html">变更记录</a>
</aside>
<main>
  <h1 class="page-title">penpot-skills</h1>
  <p class="lede">把 Penpot 的操作知识、设计方法和验证证据放在同一个可检索入口。</p>
  <article>
    ${cards}
    <h2>状态</h2>
    <p>这是零依赖生成的静态站；源文件仍是 Markdown。运行 <code>npm run site</code> 重建，<code>npm run site:check</code> 校验是否过期。</p>
  </article>
</main>
</div>
</body>
</html>`);
generated.set("assets/style.css", CSS);

let errors = 0;
for (const [rel, content] of generated) {
  const target = path.join(outDir, rel);
  if (check) {
    if (!fs.existsSync(target)) {
      console.error(`site: missing ${rel}`);
      errors += 1;
    } else if (fs.readFileSync(target, "utf8") !== content) {
      console.error(`site: stale ${rel}`);
      errors += 1;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }
}

if (check && errors) {
  console.error(`site: ${errors} file(s) need rebuild; run npm run site`);
  process.exit(1);
}
console.log(`site: ${generated.size} file(s), ${check ? "up to date" : "written"}`);
