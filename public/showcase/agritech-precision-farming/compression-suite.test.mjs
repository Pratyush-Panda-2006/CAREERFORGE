import test from "node:test";
import assert from "node:assert/strict";
import { AgritechPrecisionFarmingCompressionEngine as Engine } from "./compression-suite.js";
const engine = new Engine();
test("LZW encodes a known dictionary sequence and handles the next-code special case", () => {
  assert.deepEqual(engine.compressLZW("ABABABA"), [65, 66, 256, 258]);
  assert.equal(engine.decompressLZW([65, 66, 256, 258]), "ABABABA");
});
test("empty, single-byte, repetitive and UTF-8 text round trip", () => {
  for (const text of [
    "",
    "a",
    "\0\r\n",
    "\ufeffpayload",
    "A".repeat(10000),
    "नमस्ते 🌾 土壤\n café e\u0301",
    "😀".repeat(300),
  ]) {
    const codes = engine.compressLZW(text);
    assert.equal(engine.decompressLZW(codes), text);
    assert.equal(engine.decompressLZW(Uint16Array.from(codes)), text);
  }
});
test("serialized sizes include header and fixed-width codes, allowing honest expansion", () => {
  const text = "ABABABA",
    codes = engine.compressLZW(text),
    binary = engine.toBinary(text, codes);
  assert.equal(binary.length, 16);
  assert.deepEqual([...binary.slice(0, 4)], [76, 90, 87, 49]);
  assert.equal(new DataView(binary.buffer).getUint32(4, true), 7);
  const parsed = Array.from({ length: (binary.length - 8) / 2 }, (_, i) =>
    new DataView(binary.buffer).getUint16(8 + i * 2, true),
  );
  assert.equal(engine.decompressLZW(parsed), text);
  assert.equal(engine.computeSavingsRatio(text), -9 / 7);
  assert.equal(engine.computeSavingsRatio(""), 0);
  assert.equal(engine.toBinary("").length, 8);
  assert.ok(
    engine.computeSavingsRatio("north-field sensor reading;".repeat(100)) > 0,
  );
});
test("invalid codes, invalid Unicode and mismatched binary data are rejected", () => {
  for (const codes of [
    [256],
    [65, 900],
    [-1],
    [65, 1.5],
    [65536],
    [65, NaN],
    "bad",
  ])
    assert.throws(() => engine.decompressLZW(codes));
  assert.throws(
    () => engine.decompressLZW([255]),
    /encoded data|encoding|decode/i,
  );
  assert.throws(() => engine.compressLZW("\ud800"), /surrogate/);
  assert.throws(() => engine.toBinary("different", [65]), /match/);
  assert.throws(() => engine.compressLZW("a".repeat(262145)), RangeError);
  assert.throws(() => engine.decompressLZW(Array(262145).fill(65)), TypeError);
});
test("decoder caps expansion independently of compressed input size", () => {
  const codes = [65];
  for (let next = 256; next < 2000; next++) codes.push(next);
  assert.throws(() => engine.decompressLZW(codes), RangeError);
});
test("large high-entropy text remains lossless when the dictionary fills", () => {
  let seed = 123456789;
  const chars = [];
  for (let i = 0; i < 240000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    chars.push(String.fromCharCode(32 + ((seed >>> 16) % 95)));
  }
  const text = chars.join(""),
    codes = engine.compressLZW(text);
  assert.ok(Math.max(...codes.slice(-5000)) > 60000);
  assert.equal(engine.decompressLZW(codes), text);
});
