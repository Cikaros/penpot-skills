import { imageKind } from "../../shared/penpot-guards.mjs";

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0];
const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const wav = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
const avi = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x41, 0x56, 0x49, 0x20];
const html = [...Buffer.from("<!doctype html>")];
const truncatedPng = [0x89, 0x50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const cases = [
  ["png", png, "png"],
  ["jpeg", jpeg, "jpeg"],
  ["gif87a", gif87a, "gif"],
  ["gif89a", gif89a, "gif"],
  ["webp", webp, "webp"],
  ["wav", wav, null],
  ["avi", avi, null],
  ["html", html, null],
  ["truncated-png", truncatedPng, null],
  ["null", null, null],
];

const results = cases.map(([name, bytes, expected]) => {
  const actual = imageKind(bytes);
  return { name, expected, actual, ok: actual === expected };
});
const ok = results.every((item) => item.ok);

console.log(JSON.stringify({ ok, probeId: "V-01", cases: results }));
if (!ok) process.exitCode = 1;
