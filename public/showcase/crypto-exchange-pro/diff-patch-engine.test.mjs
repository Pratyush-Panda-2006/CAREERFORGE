import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProDiffPatchEngine } from './diff-patch-engine.js';

test('CryptoExchangeProDiffPatchEngine - computeDiff identical content produces all equal lines and empty unified diff', () => {
  const engine = new CryptoExchangeProDiffPatchEngine();
  const text = 'pair: BTC/USDT\ntickSize: 0.01\nminQty: 0.0001';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('CryptoExchangeProDiffPatchEngine - computeDiff detects additions and deletions accurately', () => {
  const engine = new CryptoExchangeProDiffPatchEngine();
  const original = 'orderType: limit\nstatus: open\nfilled: 0.0';
  const modified = 'orderType: limit\nstatus: partially_filled\nfilled: 0.25\nremaining: 0.75';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'status: open'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'status: partially_filled'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'remaining: 0.75'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-status: open'));
  assert.ok(unified.includes('+status: partially_filled'));
  assert.ok(unified.includes('+remaining: 0.75'));
});

test('CryptoExchangeProDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new CryptoExchangeProDiffPatchEngine();
  const original = 'leverage: 10x\nmarginType: cross';
  const modified = 'leverage: 25x\nmarginType: isolated';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('CryptoExchangeProDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new CryptoExchangeProDiffPatchEngine();
  const original = 'baseAsset: ETH\nquoteAsset: USDT';
  const modified = 'baseAsset: ETH\nquoteAsset: USDC\nfeeTier: VIP2';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});

test('CryptoExchangeProDiffPatchEngine - computeDiff throws TypeError on invalid arguments', () => {
  const engine = new CryptoExchangeProDiffPatchEngine();
  assert.throws(() => engine.computeDiff(null, 'text'), TypeError);
  assert.throws(() => engine.computeDiff('text', {}), TypeError);
});
