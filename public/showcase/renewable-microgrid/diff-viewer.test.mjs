import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridDiffInspector } from './diff-viewer.js';

test('RenewableMicrogridDiffInspector', async (t) => {
  await t.test('should identify identical microgrid configurations as unchanged', () => {
    const inspector = new RenewableMicrogridDiffInspector();
    const config = 'mode: islanded\nsolar: 2.5\nwind: 1.5';
    const lines = inspector.computeDiff(config, config);

    assert.equal(lines.length, 3);
    assert.ok(lines.every(l => l.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.changePercent, 0);
  });

  await t.test('should detect additions, deletions, and modifications accurately', () => {
    const inspector = new RenewableMicrogridDiffInspector();
    const orig = 'solar: 2.0\nwind: 1.0\nbess: 0.5';
    const mod = 'solar: 2.5\ncurtailment: 0.3\nwind: 1.0\nbess: 0.8';

    const lines = inspector.computeDiff(orig, mod);
    assert.ok(lines.length >= 4);

    const metrics = inspector.getChangeMetrics();
    assert.ok(metrics.added >= 1);
    assert.ok(metrics.unchanged >= 1);
  });

  await t.test('should format unified text representation correctly', () => {
    const inspector = new RenewableMicrogridDiffInspector();
    const orig = 'freq: 50.0\ndroop: 4.0';
    const mod = 'freq: 50.0\ndroop: 3.5';
    inspector.computeDiff(orig, mod);

    const unified = inspector.generateUnifiedView();
    assert.ok(unified.includes('  freq: 50.0'));
    assert.ok(unified.includes('- droop: 4.0'));
    assert.ok(unified.includes('+ droop: 3.5'));
  });

  await t.test('should handle empty input strings gracefully', () => {
    const inspector = new RenewableMicrogridDiffInspector();
    const lines = inspector.computeDiff('', '');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'unchanged');
  });
});
