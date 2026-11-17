import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProDiffInspector } from './diff-viewer.js';

test('FitnessCrossfitProDiffInspector - detects workout line insertions accurately', () => {
  const inspector = new FitnessCrossfitProDiffInspector();
  const orig = 'wod: Grace\nclean_and_jerk: 30 reps\nweight: 135 lbs';
  const mod = 'wod: Grace\nclean_and_jerk: 30 reps\nsplit_time_15_reps: 1:12\nweight: 135 lbs';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'added' && l.content === 'split_time_15_reps: 1:12'));
});

test('FitnessCrossfitProDiffInspector - detects workout line deletions accurately', () => {
  const inspector = new FitnessCrossfitProDiffInspector();
  const orig = 'focus: gymnastics\nmuscle_ups: 10\nstrict_hspu: 15\nbox_height: 30in';
  const mod = 'focus: gymnastics\nmuscle_ups: 10\nbox_height: 30in';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
  assert.ok(diff.some(l => l.type === 'removed' && l.content === 'strict_hspu: 15'));
});

test('FitnessCrossfitProDiffInspector - zero-change idempotency', () => {
  const inspector = new FitnessCrossfitProDiffInspector();
  const text = 'exercise: BackSquat\nsets: 5\nreps: 5\nweight_kg: 140';

  inspector.computeDiff(text, text);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(metrics.unchanged, 4);
});

test('FitnessCrossfitProDiffInspector - generates unified view format', () => {
  const inspector = new FitnessCrossfitProDiffInspector();
  const orig = 'wodA\nwodB';
  const mod = 'wodA\nwodB_scaled';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  wodA'));
  assert.ok(unified.includes('- wodB'));
  assert.ok(unified.includes('+ wodB_scaled'));
});
