import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactDiffPatchEngine } from './diff-patch-engine.js';

test('NonprofitImpactDiffPatchEngine - computeDiff identical content produces all equal lines', () => {
  const engine = new NonprofitImpactDiffPatchEngine();
  const text = 'grant: water\namount: $5000\nstatus: approved';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('NonprofitImpactDiffPatchEngine - computeDiff detects additions and deletions', () => {
  const engine = new NonprofitImpactDiffPatchEngine();
  const original = 'grant: water\namount: $5000';
  const modified = 'grant: water\namount: $7500\nregion: rural';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'amount: $5000'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'amount: $7500'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'region: rural'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-amount: $5000'));
  assert.ok(unified.includes('+amount: $7500'));
});

test('NonprofitImpactDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new NonprofitImpactDiffPatchEngine();
  const original = 'campaign: health\ngoal: 1000';
  const modified = 'campaign: health\ngoal: 2500';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('NonprofitImpactDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new NonprofitImpactDiffPatchEngine();
  const original = 'donor: Acme Corp\nmatch: 2x';
  const modified = 'donor: Acme Corp\nmatch: 3x';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});
