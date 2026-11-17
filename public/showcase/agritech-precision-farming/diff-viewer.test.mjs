import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingDiffInspector } from './diff-viewer.js';

test('AgritechPrecisionFarmingDiffInspector - detects added lines accurately', () => {
  const inspector = new AgritechPrecisionFarmingDiffInspector();
  const orig = 'crop: Wheat\nsensor: Moisture\nthreshold: 40';
  const mod = 'crop: Wheat\nsensor: Moisture\nirrigation: Active\nthreshold: 40';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.ok(diff.some(line => line.type === 'added' && line.content === 'irrigation: Active'));
  assert.strictEqual(metrics.added, 1);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('AgritechPrecisionFarmingDiffInspector - detects removed lines accurately', () => {
  const inspector = new AgritechPrecisionFarmingDiffInspector();
  const orig = 'temp: 24C\nhumidity: 65%\nsunlight: High\nbattery: 90%';
  const mod = 'temp: 24C\nhumidity: 65%\nbattery: 90%';

  const diff = inspector.computeDiff(orig, mod);
  const metrics = inspector.getChangeMetrics();

  assert.ok(diff.some(line => line.type === 'removed' && line.content === 'sunlight: High'));
  assert.strictEqual(metrics.removed, 1);
  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.unchanged, 3);
});

test('AgritechPrecisionFarmingDiffInspector - identical texts produce 0% change', () => {
  const inspector = new AgritechPrecisionFarmingDiffInspector();
  const sample = 'zone: Alpha\nstatus: Optimal\nnutrient_level: 8.5';

  const diff = inspector.computeDiff(sample, sample);
  const metrics = inspector.getChangeMetrics();

  assert.strictEqual(metrics.added, 0);
  assert.strictEqual(metrics.removed, 0);
  assert.strictEqual(metrics.changePercent, 0);
  assert.strictEqual(diff.every(l => l.type === 'unchanged'), true);
});

test('AgritechPrecisionFarmingDiffInspector - unified view formatting', () => {
  const inspector = new AgritechPrecisionFarmingDiffInspector();
  const orig = 'line1\nline2';
  const mod = 'line1\nline2_modified';

  inspector.computeDiff(orig, mod);
  const unified = inspector.generateUnifiedView();

  assert.ok(unified.includes('  line1'));
  assert.ok(unified.includes('- line2'));
  assert.ok(unified.includes('+ line2_modified'));
});
