import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('./script.js', import.meta.url), 'utf8');

// Common double-encoded UTF-8 sequences (utf8 read back as cp1252).
const MOJIBAKE = /\u00e2\u20ac|\u00f0\u0178|\u00c2[\u00b0\u00b7\u00a9\u00ae\u00ab\u00bb]|\u00c3[\u0080-\u00bf]/;

test('script.js has no BOM', () => {
  assert.notEqual(script.charCodeAt(0), 0xfeff);
});

test('script.js has no double-encoded UTF-8 text', () => {
  const bad = script.split('\n').map((line, i) => [i + 1, line]).filter(([, line]) => MOJIBAKE.test(line));
  assert.deepEqual(bad.map(([n]) => n), []);
});
