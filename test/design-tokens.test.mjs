import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  auditCss,
  colorTokenMap,
  flattenDtcg,
  indexDtcg,
  resolveDtcgValue,
  toCssVars,
  tokenizeCss,
  tokenizeCssDetailed,
} from "../shared/design-tokens.mjs";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const example = JSON.parse(fs.readFileSync(path.join(root, "shared/tokens/example.tokens.json"), "utf8"));

test("flattenDtcg 继承组类型并忽略元数据", () => {
  const tokens = flattenDtcg(example);
  const primary = tokens.find((token) => token.path === "color.brand.primary");
  assert.equal(primary.type, "color");
  assert.equal(primary.value, "#3366FF");
  assert.equal(tokens.find((token) => token.path === "space.16").type, "dimension");
});

test("resolveDtcgValue 解析别名并拒绝循环", () => {
  const tokens = flattenDtcg(example);
  const index = indexDtcg(tokens);
  assert.equal(resolveDtcgValue("{color.brand.primary}", index), "#3366FF");

  const cyclic = [
    { path: "a", segments: ["a"], type: "color", value: "{b}" },
    { path: "b", segments: ["b"], type: "color", value: "{a}" },
  ];
  assert.throws(() => resolveDtcgValue("{a}", indexDtcg(cyclic)), /circular token alias/);
});

test("toCssVars 输出颜色和 dimension 变量", () => {
  const css = toCssVars(flattenDtcg(example));
  assert.match(css, /--color-brand-primary: #3366ff;/);
  assert.match(css, /--space-16: 16px;/);
  assert.match(css, /--font-body: \{"fontFamily"/);
});

test("tokenizeCss 将 8 位 alpha 颜色归一化到 token", () => {
  const tokens = flattenDtcg(example);
  const input = ".hero { color: #3366ffFF; background: #ffffff; }";
  const result = tokenizeCssDetailed(input, tokens);
  assert.equal(result.css, ".hero { color: var(--color-brand-primary); background: var(--color-surface-default); }");
  assert.equal(result.unmapped.length, 0);
  assert.equal(colorTokenMap(tokens).get("#3366ff"), "var(--color-brand-primary)");
});

test("tokenizeCss 保留未知颜色并报告", () => {
  const tokens = flattenDtcg(example);
  const result = tokenizeCssDetailed(".x { color: #ABCDEF; }", tokens);
  assert.equal(result.css, ".x { color: #ABCDEF; }");
  assert.deepEqual(result.unmapped, ["#ABCDEF"]);
});

test("auditCss 同时报告裸色、裸 px 和变量", () => {
  const report = auditCss(":root { --space-16: 16px; } .x { gap: 13px; color: #fff; padding: var(--space-16); }");
  assert.deepEqual(report.rawColors, ["#fff"]);
  assert.deepEqual(report.rawPx, ["16px", "13px"]);
  assert.deepEqual(report.variables, ["var(--space-16)"]);
});

test("tokenizeCss 不替换已有变量", () => {
  const tokens = flattenDtcg(example);
  const input = ".x { color: var(--color-brand-primary); }";
  assert.equal(tokenizeCss(input, tokens), input);
});
