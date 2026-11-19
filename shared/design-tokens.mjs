/**
 * DTCG-flavoured design-token utilities.
 *
 * Scope: flattening, alias resolution, CSS custom properties and a narrowly
 * scoped CSS colour tokenizer. This is intentionally not a full DTCG engine:
 * composite tokens are emitted as JSON unless they have a simple CSS form.
 */

const ALIAS = /^\{([^{}]+)\}$/;
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function tokenPath(segments) {
  return segments.join(".");
}

function cssName(segments) {
  return `--${segments.join("-").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function normalizeHex(value) {
  const raw = String(value).trim();
  if (!/^#[0-9a-fA-F]{3,8}$/.test(raw)) return null;
  let hex = raw.slice(1).toLowerCase();
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split("").map((ch) => ch + ch).join("");
  }
  if (hex.length === 8 && hex.endsWith("ff")) hex = hex.slice(0, 6);
  return `#${hex}`;
}

function dimension(value) {
  if (typeof value === "number") return `${value}px`;
  if (isObject(value) && typeof value.value === "number" && typeof value.unit === "string") {
    return `${value.value}${value.unit}`;
  }
  return null;
}

/**
 * Flatten a DTCG tree. `$type` is inherited by child groups; `$value` marks a
 * token. Unknown `$` keys and non-object group values are ignored.
 */
export function flattenDtcg(tree, { prefix = [] } = {}) {
  const tokens = [];

  function walk(node, segments, inheritedType) {
    if (!isObject(node)) return;
    const type = typeof node.$type === "string" ? node.$type : inheritedType;
    if (Object.prototype.hasOwnProperty.call(node, "$value")) {
      tokens.push({
        path: tokenPath(segments),
        segments: [...segments],
        type: type ?? null,
        value: node.$value,
        description: typeof node.$description === "string" ? node.$description : null,
      });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || !isObject(child)) continue;
      walk(child, [...segments, key], type);
    }
  }

  walk(tree, prefix, null);
  return tokens;
}

/** Resolve `{a.b}` aliases, including aliases nested in composite values. */
export function resolveDtcgValue(value, index, seen = new Set()) {
  if (typeof value === "string") {
    const match = ALIAS.exec(value);
    if (!match) return value;
    const path = match[1];
    if (seen.has(path)) throw new Error(`circular token alias: ${[...seen, path].join(" -> ")}`);
    const token = index.get(path);
    if (!token) throw new Error(`unknown token alias: ${path}`);
    return resolveDtcgValue(token.value, index, new Set([...seen, path]));
  }
  if (Array.isArray(value)) return value.map((item) => resolveDtcgValue(item, index, seen));
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveDtcgValue(item, index, seen)]),
    );
  }
  return value;
}

/** Convert a token value to a CSS value. Composite tokens fall back to JSON. */
export function toCssValue(token, value) {
  if (token.type === "color" && typeof value === "string") {
    return normalizeHex(value) ?? value;
  }
  if (token.type === "dimension") {
    return dimension(value) ?? String(value);
  }
  if (token.type === "duration") {
    if (isObject(value) && typeof value.value === "number" && typeof value.unit === "string") {
      return `${value.value}${value.unit}`;
    }
    return String(value);
  }
  if (token.type === "cubicBezier" && Array.isArray(value)) {
    return `cubic-bezier(${value.join(", ")})`;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Build a path -> token index. Throws on duplicate paths. */
export function indexDtcg(tokens) {
  const index = new Map();
  for (const token of tokens) {
    if (index.has(token.path)) throw new Error(`duplicate token: ${token.path}`);
    index.set(token.path, token);
  }
  return index;
}

/** Build CSS custom properties from a flattened token list. */
export function toCssVars(tokens, { selector = ":root", resolved = true } = {}) {
  const index = indexDtcg(tokens);
  const lines = tokens.map((token) => {
    const value = resolved ? resolveDtcgValue(token.value, index) : token.value;
    return `  ${cssName(token.segments)}: ${toCssValue(token, value)};`;
  });
  return `${selector} {\n${lines.join("\n")}\n}`;
}

/** Build a normalized colour -> var(--token) map. Only colour tokens qualify. */
export function colorTokenMap(tokens) {
  const index = indexDtcg(tokens);
  const map = new Map();
  for (const token of tokens) {
    if (token.type !== "color") continue;
    const value = resolveDtcgValue(token.value, index);
    if (typeof value !== "string") continue;
    const key = normalizeHex(value);
    if (key) map.set(key, `var(${cssName(token.segments)})`);
  }
  return map;
}

/**
 * Replace raw hex colours with token variables. This is deliberately limited
 * to colours and 6/8-digit hex; spacing and typography need semantic mapping.
 */
export function tokenizeCss(css, tokens) {
  return tokenizeCssDetailed(css, tokens).css;
}

export function tokenizeCssDetailed(css, tokens) {
  const map = colorTokenMap(tokens);
  const replacements = [];
  const unmapped = [];
  const output = String(css).replace(HEX, (raw) => {
    const key = normalizeHex(raw);
    const replacement = key ? map.get(key) : null;
    if (replacement) {
      replacements.push({ from: raw, to: replacement });
      return replacement;
    }
    unmapped.push(raw);
    return raw;
  });
  return { css: output, replacements, unmapped };
}

/** Report raw values that still need semantic mapping after tokenization. */
export function auditCss(css) {
  const text = String(css);
  const rawColors = [...new Set(text.match(HEX) ?? [])];
  const rawPx = [...new Set(text.match(/(?<![\w-])\d+(?:\.\d+)?px\b/g) ?? [])];
  const variables = [...new Set(text.match(/var\(--[a-zA-Z0-9_-]+\)/g) ?? [])];
  return { rawColors, rawPx, variables };
}

/** Return a compact summary suitable for a design-to-code report. */
export function tokenReport(css, tokens) {
  const result = tokenizeCssDetailed(css, tokens);
  return {
    replacements: result.replacements,
    unmappedColors: result.unmapped,
    audit: auditCss(result.css),
  };
}
