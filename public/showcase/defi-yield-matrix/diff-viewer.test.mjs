import test from 'node:test';
import assert from 'node:assert/strict';
import { DeFiYieldMatrixDiffInspector } from './diff-viewer.js';

test('DeFiYieldMatrixDiffInspector', async (t) => {
  await t.test('should identify identical vault configurations as unchanged', () => {
    const inspector = new DeFiYieldMatrixDiffInspector();
    const config = 'vault: ETH_USDC\nfee: 30\ncollateral: 0.8';
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
    const inspector = new DeFiYieldMatrixDiffInspector();
    const orig = 'lower_tick: -887220\nupper_tick: 887220\nfee: 30';
    const mod = 'lower_tick: -443610\nupper_tick: 443610\nfee: 30\nslippage: 15';

    const lines = inspector.computeDiff(orig, mod);
    assert.ok(lines.length >= 4);

    const metrics = inspector.getChangeMetrics();
    assert.ok(metrics.added >= 1);
    assert.ok(metrics.unchanged >= 1);
  });

  await t.test('should format unified text representation correctly', () => {
    const inspector = new DeFiYieldMatrixDiffInspector();
    const orig = 'kink: 0.8\nbaseRate: 0.02';
    const mod = 'kink: 0.8\nbaseRate: 0.03';
    inspector.computeDiff(orig, mod);

    const unified = inspector.generateUnifiedView();
    assert.ok(unified.includes('  kink: 0.8'));
    assert.ok(unified.includes('- baseRate: 0.02'));
    assert.ok(unified.includes('+ baseRate: 0.03'));
  });

  await t.test('should handle empty input strings gracefully', () => {
    const inspector = new DeFiYieldMatrixDiffInspector();
    const lines = inspector.computeDiff('', '');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'unchanged');
  });
});
