import test from 'node:test';
import assert from 'node:assert/strict';
import { VRMetaverseHubDiffInspector } from './diff-viewer.js';

test('VRMetaverseHubDiffInspector', async (t) => {
  await t.test('should identify identical WebXR configurations as unchanged', () => {
    const inspector = new VRMetaverseHubDiffInspector();
    const config = 'mode: immersive-vr\nframeRate: 90\nspace: local-floor';
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
    const inspector = new VRMetaverseHubDiffInspector();
    const orig = 'mode: immersive-vr\nfoveation: 0.0\nhandTracking: false';
    const mod = 'mode: immersive-vr\nfoveation: 0.5\nhandTracking: true\ndepthSensing: true';

    const lines = inspector.computeDiff(orig, mod);
    assert.ok(lines.length >= 4);

    const metrics = inspector.getChangeMetrics();
    assert.ok(metrics.added >= 1);
    assert.ok(metrics.unchanged >= 1);
  });

  await t.test('should format unified text representation correctly', () => {
    const inspector = new VRMetaverseHubDiffInspector();
    const orig = 'renderScale: 1.0\nmsaa: 2x';
    const mod = 'renderScale: 1.0\nmsaa: 4x';
    inspector.computeDiff(orig, mod);

    const unified = inspector.generateUnifiedView();
    assert.ok(unified.includes('  renderScale: 1.0'));
    assert.ok(unified.includes('- msaa: 2x'));
    assert.ok(unified.includes('+ msaa: 4x'));
  });

  await t.test('should handle empty input strings gracefully', () => {
    const inspector = new VRMetaverseHubDiffInspector();
    const lines = inspector.computeDiff('', '');
    assert.equal(lines.length, 1);
    assert.equal(lines[0].type, 'unchanged');
  });
});
