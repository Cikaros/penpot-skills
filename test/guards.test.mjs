import test from "node:test";
import assert from "node:assert/strict";

import {
  assertImageBytes,
  collectOverflows,
  headHex,
  imageKind,
  isOverflow,
  normalizeName,
  requireShape,
} from "../shared/penpot-guards.mjs";

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const jpeg = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const gif87a = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0, 0, 0, 0, 0, 0];
const gif89a = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0];
const webp = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const wav = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x57, 0x41, 0x56, 0x45];
const avi = [0x52, 0x49, 0x46, 0x46, 4, 0, 0, 0, 0x41, 0x56, 0x49, 0x20];
const html = [...Buffer.from("<!doctype html>")];

test("imageKind 识别完整图片签名", () => {
  assert.equal(imageKind(png), "png");
  assert.equal(imageKind(jpeg), "jpeg");
  assert.equal(imageKind(gif87a), "gif");
  assert.equal(imageKind(gif89a), "gif");
  assert.equal(imageKind(webp), "webp");
});

test("imageKind 拒绝截断 PNG 和非图片字节", () => {
  assert.equal(imageKind([0x89, 0x50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), null);
  assert.equal(imageKind(html), null);
  assert.equal(imageKind([]), null);
  assert.equal(imageKind(null), null);
});

test("imageKind 不把 WAV/AVI 的 RIFF 当成 WEBP", () => {
  assert.equal(imageKind(wav), null);
  assert.equal(imageKind(avi), null);
});

test("assertImageBytes 返回类型并拒绝错误页", () => {
  assert.equal(assertImageBytes(png, "hero"), "png");
  assert.throws(() => assertImageBytes(wav, "hero"), /not a supported image/);
  assert.throws(() => assertImageBytes(html), /not a supported image/);
});

test("headHex 输出可读字节头", () => {
  assert.equal(headHex(png, 4), "89 50 4e 47");
  assert.equal(headHex(null), "");
});

test("normalizeName 还原 Penpot 的斜杠归一化", () => {
  assert.equal(normalizeName("btn / Primary"), "btn/Primary");
  assert.equal(normalizeName("btn/Primary"), "btn/Primary");
  assert.equal(normalizeName(undefined), "");
});

test("isOverflow 使用直接父容器判断", () => {
  const parent = { width: 100, height: 100 };
  assert.equal(isOverflow({ parentX: 10, parentY: 10, width: 50, height: 20 }, parent), false);
  assert.equal(isOverflow({ parentX: 90, parentY: 10, width: 20, height: 20 }, parent), true);
  assert.equal(isOverflow({ parentX: -1, parentY: 0, width: 10, height: 10 }, parent), true);
  assert.equal(isOverflow({ parentX: "x", parentY: 0, width: 10, height: 10 }, parent), false);
});

test("collectOverflows 能发现嵌套容器的越界", () => {
  const root = {
    id: "root",
    name: "Board",
    width: 390,
    height: 844,
    children: [
      {
        id: "card",
        name: "card-Vehicle",
        parentX: 16,
        parentY: 16,
        width: 200,
        height: 120,
        children: [
          {
            id: "badge",
            name: "badge",
            parentX: 190,
            parentY: 10,
            width: 40,
            height: 20,
            children: [],
          },
        ],
      },
    ],
  };

  const overflows = collectOverflows(root);
  assert.equal(overflows.length, 1);
  assert.equal(overflows[0].id, "badge");
  assert.equal(overflows[0].parent, "card-Vehicle");
});

test("requireShape 抛出带 label 的错误", () => {
  assert.deepEqual(requireShape({ id: "1" }, "board"), { id: "1" });
  assert.throws(() => requireShape(null, "board"), /shape not found: board/);
});
