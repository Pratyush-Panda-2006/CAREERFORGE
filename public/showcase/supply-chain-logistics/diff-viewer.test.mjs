import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsDiffInspector } from './diff-viewer.js';

test('SupplyChainLogisticsDiffInspector', async (t) => {
  await t.test('should identify identical manifest lines as unchanged', () => {
    const inspector = new SupplyChainLogisticsDiffInspector();
    const manifest = 'vessel: EVER_GIVEN\norigin: CNSHA\ndest: NLRTM';
    const lines = inspector.computeDiff(manifest, manifest);

    assert.equal(lines.length, 3);
    assert.ok(lines.every(l => l.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.changePercent, 0);
  });

  await t.test('should detect additions, deletions, and updates accurately', () => {
    const inspector = new SupplyChainLogisticsDiffInspector();
    const orig = 'vessel: EVER_GIVEN\nteu: 1400\nport: NLRTM';
    const mod = 'vessel: EVER_GIVEN\ntransshipment: SGSIN\nteu: 1600\nport: NLRTM';

    const lines = inspector.computeDiff(orig, mod);
    assert.ok(lines.length >= 4);

    const metrics = inspector.getChangeMetrics();
    assert.ok(metrics.added >= 1);
    assert.ok(metrics.unchanged >= 2);
  });

  await t.test('should produce formatted unified text representation', () => {
    const inspector = new SupplyChainLogisticsDiffInspector();
    const orig = 'line1\nline2';
    const mod = 'line1\nline2_mod';
    inspector.computeDiff(orig, mod);

    const unified = inspector.generateUnifiedView();
    assert.ok(unified.includes('  line1'));
    assert.ok(unified.includes('- line2'));
    assert.ok(unified.includes('+ line2_mod'));
  });

  await t.test('should handle empty inputs gracefully', () => {
    const inspector = new SupplyChainLogisticsDiffInspector();
    const lines = inspector.computeDiff('', '');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'unchanged');
  });
});
