import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingDiffPatchEngine } from './diff-patch-engine.js';

test('AgritechPrecisionFarmingDiffPatchEngine - computeDiff identical content produces all equal lines', () => {
  const engine = new AgritechPrecisionFarmingDiffPatchEngine();
  const text = 'crop: Wheat\nmoisture: 60%\nstatus: optimal';
  const diff = engine.computeDiff(text, text);

  assert.equal(diff.length, 3);
  assert.ok(diff.every(item => item.type === 'equal'));
  assert.equal(engine.toUnifiedFormat(diff), '');
});

test('AgritechPrecisionFarmingDiffPatchEngine - computeDiff detects additions and deletions', () => {
  const engine = new AgritechPrecisionFarmingDiffPatchEngine();
  const original = 'zone: A\nvalve: closed';
  const modified = 'zone: A\nvalve: open\nflow: 12L/min';

  const diff = engine.computeDiff(original, modified);
  assert.ok(diff.some(d => d.type === 'delete' && d.text === 'valve: closed'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'valve: open'));
  assert.ok(diff.some(d => d.type === 'insert' && d.text === 'flow: 12L/min'));

  const unified = engine.toUnifiedFormat(diff);
  assert.ok(unified.includes('-valve: closed'));
  assert.ok(unified.includes('+valve: open'));
});

test('AgritechPrecisionFarmingDiffPatchEngine - applyPatch reconstructs modified text from diff array', () => {
  const engine = new AgritechPrecisionFarmingDiffPatchEngine();
  const original = 'soil: loam\npH: 6.5';
  const modified = 'soil: loam\npH: 7.0';

  const diff = engine.computeDiff(original, modified);
  const reconstructed = engine.applyPatch(original, diff);
  assert.equal(reconstructed, modified);
});

test('AgritechPrecisionFarmingDiffPatchEngine - applyPatch reconstructs modified text from unified string', () => {
  const engine = new AgritechPrecisionFarmingDiffPatchEngine();
  const original = 'crop: Barley\ncycle: 90 days';
  const modified = 'crop: Barley\ncycle: 105 days';

  const diff = engine.computeDiff(original, modified);
  const unified = engine.toUnifiedFormat(diff);
  const patched = engine.applyPatch(original, unified);
  assert.equal(patched, modified);
});
