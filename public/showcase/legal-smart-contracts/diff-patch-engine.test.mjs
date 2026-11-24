import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsDiffPatchEngine } from './diff-patch-engine.js';

test('LegalSmartContractsDiffPatchEngine - computeDiff identical content produces all equal lines', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const text = 'clause 1\nclause 2\nclause 3';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('LegalSmartContractsDiffPatchEngine - computeDiff detects additions and deletions', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'alpha\nbeta';
  const modified = 'alpha\ngamma\nbeta';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'gamma'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('+gamma'));
});

test('LegalSmartContractsDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'party A\nliability: standard';
  const modified = 'party A\nliability: unlimited';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('LegalSmartContractsDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new LegalSmartContractsDiffPatchEngine();
  const original = 'token: ETH\namount: 10';
  const modified = 'token: ETH\namount: 25';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});
