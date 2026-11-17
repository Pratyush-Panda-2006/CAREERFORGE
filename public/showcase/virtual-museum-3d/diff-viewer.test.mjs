import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3DDiffInspector } from './diff-viewer.js';

test('VirtualMuseum3DDiffInspector', async (t) => {
  await t.test('should identify identical exhibit configurations as unchanged', () => {
    const inspector = new VirtualMuseum3DDiffInspector();
    const config = 'material: PBR_MARBLE\nroughness: 0.35\nmetalness: 0.0';
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
    const inspector = new VirtualMuseum3DDiffInspector();
    const orig = 'material: PBR_MARBLE\nroughness: 0.35\nspotlight: 2.5';
    const mod = 'material: PBR_MARBLE\ntransmission: 0.15\nroughness: 0.22\nspotlight: 3.2';

    const lines = inspector.computeDiff(orig, mod);
    assert.ok(lines.length >= 4);

    const metrics = inspector.getChangeMetrics();
    assert.ok(metrics.added >= 1);
    assert.ok(metrics.unchanged >= 1);
  });

  await t.test('should format unified text representation correctly', () => {
    const inspector = new VirtualMuseum3DDiffInspector();
    const orig = 'lod: 2.0\nmesh: high';
    const mod = 'lod: 2.0\nmesh: decimated';
    inspector.computeDiff(orig, mod);

    const unified = inspector.generateUnifiedView();
    assert.ok(unified.includes('  lod: 2.0'));
    assert.ok(unified.includes('- mesh: high'));
    assert.ok(unified.includes('+ mesh: decimated'));
  });

  await t.test('should handle empty input strings gracefully', () => {
    const inspector = new VirtualMuseum3DDiffInspector();
    const lines = inspector.computeDiff('', '');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'unchanged');
  });
});
