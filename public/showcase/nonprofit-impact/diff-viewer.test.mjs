import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactDiffInspector } from './diff-viewer.js';

test('NonprofitImpactDiffInspector - computes diff on identical text', () => {
  const inspector = new NonprofitImpactDiffInspector();
  const text = 'grants: 500000\ntrees: 12000\nwater_wells: 15';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('NonprofitImpactDiffInspector - computes additions and deletions accurately', () => {
  const inspector = new NonprofitImpactDiffInspector();
  const oldText = 'program: clean water\nbudget: 100k';
  const newText = 'program: clean water & sanitation\nbudget: 150k\npartner: UNICEF';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('NonprofitImpactDiffInspector - handles empty strings gracefully', () => {
  const inspector = new NonprofitImpactDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('NonprofitImpactDiffInspector - loads built-in impact presets', () => {
  const inspector = new NonprofitImpactDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('carbonMethodology'));
  assert.ok(keys.includes('grantBudget'));
  assert.ok(keys.includes('treeCanopyAudit'));

  const carbon = inspector.getPreset('carbonMethodology');
  assert.ok(carbon.left.includes('VM0007'));
  assert.ok(carbon.right.includes('VM0033'));
});
