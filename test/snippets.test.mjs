import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("图片签名只有一份 canonical 实现", () => {
  const source = read("shared/snippets/image-kind.mjs");
  const guard = read("shared/penpot-guards.mjs");
  assert.match(source, /export function imageKind/);
  assert.match(guard, /from "\.\/snippets\/image-kind\.mjs"/);
  assert.doesNotMatch(guard, /function imageKind\(/);
});

test("案例 02 的三个代码块由片段生成", () => {
  const text = read("docs/penpot-mcp/cases/02-image-repair.md");
  const blocks = text.match(/\/\/ SNIPPET:image-kind:start[\s\S]*?\/\/ SNIPPET:image-kind:end/g) ?? [];
  assert.equal(blocks.length, 3);
  for (const block of blocks) {
    assert.match(block, /function imageKind\(/);
    assert.doesNotMatch(block, /export function imageKind/);
  }
});
