import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsDiffPatchEngine } from './diff-patch-engine.js';

test('LuxuryRealmsDiffPatchEngine - computeDiff identical content produces all equal lines and empty unified diff', () => {
  const engine = new LuxuryRealmsDiffPatchEngine();
  const text = 'estate: Aspen Ridge\nprice: $35M\nstatus: Available';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('LuxuryRealmsDiffPatchEngine - computeDiff detects additions and deletions accurately', () => {
  const engine = new LuxuryRealmsDiffPatchEngine();
  const original = 'amenity: Tennis Court\nview: Ocean Front\ngarage: 4 Cars';
  const modified = 'amenity: Tennis Court\nview: Ocean Front & Private Beach\ngarage: 6 Cars\nfeature: Bowling Alley';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'view: Ocean Front'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'view: Ocean Front & Private Beach'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'feature: Bowling Alley'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-view: Ocean Front'));
  assert.ok(unified.includes('+view: Ocean Front & Private Beach'));
  assert.ok(unified.includes('+feature: Bowling Alley'));
});

test('LuxuryRealmsDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new LuxuryRealmsDiffPatchEngine();
  const original = 'sqft: 12000\nacres: 5';
  const modified = 'sqft: 14500\nacres: 7.5\npool: Infinity';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('LuxuryRealmsDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new LuxuryRealmsDiffPatchEngine();
  const original = 'architect: Frank Lloyd Wright\nyear: 1958';
  const modified = 'architect: Frank Lloyd Wright\nyear: 1958\nrestoration: 2024';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});

test('LuxuryRealmsDiffPatchEngine - computeDiff throws TypeError on invalid arguments', () => {
  const engine = new LuxuryRealmsDiffPatchEngine();
  assert.throws(() => engine.computeDiff(null, 'text'), TypeError);
  assert.throws(() => engine.computeDiff('text', undefined), TypeError);
});
