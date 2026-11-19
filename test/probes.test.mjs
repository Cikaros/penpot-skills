import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

function readProbe(name) {
  return fs.readFileSync(path.join(root, "verification", "probes", name), "utf8");
}

test("execute_code 探针是可解析的函数体", () => {
  for (const name of [
    "00-runtime-readonly.js",
    "02-layout-wait.js",
    "04-overflow-live.js",
    "05-image-upload.js",
    "06-page-lifecycle.js",
    "08-prototype-flow.js",
    "10-real-file-baseline.js",
  ]) {
    assert.doesNotThrow(() => new AsyncFunction(readProbe(name)), `${name} should parse`);
  }
});

test("静态探针返回 ok=true", () => {
  const probes = ["01-image-kind.mjs", "03-overflow.mjs", "07-css-tokenize.mjs"];
  // site/ is a CI/preview artifact; the link probe only applies when it exists locally.
  if (fs.existsSync(path.join(root, "site", "index.html"))) probes.push("09-site-links.mjs");
  for (const name of probes) {
    const output = execFileSync(process.execPath, [path.join("verification", "probes", name)], {
      cwd: root,
      encoding: "utf8",
    });
    const result = JSON.parse(output);
    assert.equal(result.ok, true, `${name} should pass`);
  }
});
