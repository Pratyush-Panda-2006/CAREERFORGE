import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactCompressionEngine as Engine } from './compression-suite.js';
const bytes = text => new TextEncoder().encode(text).length;

test('known dictionary sequence and the special next-code case', () => {
  const e = new Engine();
  assert.deepEqual(e.compressLZW('TOBEORNOTTOBEORTOBEORNOT'), [84,79,66,69,79,82,78,79,84,256,258,260,265,259,261,263]);
  assert.equal(e.decompressLZW([65,256,257]), 'AAAAAA');
});
test('lossless Unicode, embedded zero, combining marks and BOM', () => {
  for (const text of ['🌳 नमस्ते 森林 🌍 café e\u0301', '\ufeffforest', '\0\0\r\n\t', '😀'.repeat(200), '']) {
    const e = new Engine();
    assert.equal(e.decompressLZW(e.compressLZW(text)), text);
    assert.equal(e.decodeBinary(e.exportBinary()), text);
  }
});
test('packed bytes include header and fixed-width codes, even for expansion', () => {
  const e = new Engine();
  assert.equal(e.computeSavingsRatio(), 0);
  assert.throws(() => e.exportBinary());
  e.compressLZW('a');
  assert.equal(e.getMetrics().packedBytes, 14);
  assert.equal(e.computeSavingsRatio(), -13);
  assert.equal(e.getMetrics().originalBytes, 1);
  assert.equal(e.exportBinary().length, 14);
  e.compressLZW('');
  assert.equal(e.computeSavingsRatio(), 0);
  assert.equal(e.getMetrics().packedBytes, 12);
});
test('repetition reduces the actual full binary payload', () => {
  const e = new Engine();
  e.compressLZW('restore native woodland 🌳\n'.repeat(100));
  const m = e.getMetrics(2);
  assert.ok(m.packedBytes < m.originalBytes);
  assert.equal(m.savingsRatio, 1 - m.packedBytes / m.originalBytes);
  assert.equal(m.originalMs, m.originalBytes * 8 / 2000);
  assert.equal(m.packedMs, m.packedBytes * 8 / 2000);
});
test('header is portable big-endian and accepts a non-zero byte offset', () => {
  const e = new Engine();e.compressLZW('AAA');
  assert.deepEqual([...e.exportBinary()], [76,90,87,49,0,0,0,3,0,0,0,2,0,65,1,0]);
  const padded = new Uint8Array(30);padded.set(e.exportBinary(), 7);
  assert.equal(e.decodeBinary(padded.subarray(7, 23)), 'AAA');
});
test('returned arrays and metrics cannot mutate the retained result', () => {
  const e = new Engine();const codes = e.compressLZW('woodland');const original = e.exportBinary();
  codes[0] = 999;const m = e.getMetrics();m.originalBytes = 0;const blob = e.exportBinary();blob[0] = 0;
  assert.deepEqual(e.exportBinary(), original);
  assert.equal(e.getMetrics().originalBytes, 8);
});
test('reject invalid text atomically instead of silently replacing surrogates', () => {
  const e = new Engine();e.compressLZW('valid');const saved = e.exportBinary();
  for (const input of [null, 123, '\ud800', '\udfff', 'a\ud800b', 'x'.repeat(262145), '🌳'.repeat(65537)]) assert.throws(() => e.compressLZW(input));
  assert.deepEqual(e.exportBinary(), saved);
});
test('reject malformed codes, invalid UTF-8 and oversized decoding', () => {
  const e = new Engine();
  for (const codes of [null, 'AA', {}, [256], [-1], [65536], [1.5], [NaN], [65,300], [255], [192,128], Array(2)]) assert.throws(() => e.decompressLZW(codes));
  assert.throws(() => e.decompressLZW(Array(262145).fill(65)));
  const bomb = [65, ...Array.from({ length: 800 }, (_, i) => i + 256)];
  assert.throws(() => e.decompressLZW(bomb), /exceeds/);
  assert.equal(e.decompressLZW(new Uint16Array([65,256])), 'AAA');
});
test('reject truncated, extended, forged and mismatched binary headers', () => {
  const e = new Engine();e.compressLZW('森林');const data = e.exportBinary();
  for (const input of [null, data.buffer, data.slice(0, 4), data.slice(0, -1), new Uint8Array([...data, 0])]) assert.throws(() => e.decodeBinary(input));
  for (const offset of [0,4,8]) { const bad = data.slice();bad[offset] = 255;assert.throws(() => e.decodeBinary(bad)); }
  const wrong = data.slice();new DataView(wrong.buffer).setUint32(4, 1);assert.throws(() => e.decodeBinary(wrong), /length/);
});
test('independent encoder comparison for 200 deterministic varied payloads', () => {
  function reference(text) {
    const dictionary = Object.create(null);let next = 256;let word = '';const out = [];
    for (let i = 0; i < 256; i++) dictionary[String.fromCharCode(i)] = i;
    for (const n of new TextEncoder().encode(text)) { const c = String.fromCharCode(n);if (Object.hasOwn(dictionary, word+c)) word += c;else {out.push(dictionary[word]);if (next < 65536) dictionary[word+c] = next++;word = c;} }
    if (word) out.push(dictionary[word]);return out;
  }
  let seed = 761;
  for (let n = 0; n < 200; n++) {
    let text = '';
    for (let i = 0; i < n * 5; i++) {seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;text += ['a','b','🌳','森','\0','é','e\u0301'][seed % 7];}
    const e = new Engine();assert.deepEqual(e.compressLZW(text), reference(text));assert.equal(e.decodeBinary(e.exportBinary()), text);
    assert.equal(e.getMetrics().originalBytes, bytes(text));
  }
});
test('full bounded dictionary freezes consistently on a 256 KiB entropy payload', () => {
  let seed = 81;const chars = Array.from({ length: 262144 }, () => {seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;return String.fromCharCode(32 + ((seed >>> 16) % 95));});
  const text = chars.join('');const e = new Engine();const codes = e.compressLZW(text);
  assert.ok(codes.length > 65536);assert.equal(e.decompressLZW(codes), text);assert.equal(e.decodeBinary(e.exportBinary()), text);
});
test('modeled link validation is explicit and cannot change the payload', () => {
  const e = new Engine();e.compressLZW('forest');const original = e.exportBinary();
  for (const speed of [0, -1, NaN, Infinity, '1', 0.001, 10001]) assert.throws(() => e.getMetrics(speed));
  assert.equal(e.getMetrics(0.01).originalMs, 4.8);assert.equal(e.getMetrics(10000).originalMs, 0.0000048);
  assert.deepEqual(e.exportBinary(), original);
});
