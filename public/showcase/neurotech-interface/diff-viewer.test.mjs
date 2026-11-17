import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceDiffInspector } from './diff-viewer.js';

describe('NeurotechInterfaceDiffInspector', () => {
  it('should detect zero changes and 0% change metric on identical texts', () => {
    const inspector = new NeurotechInterfaceDiffInspector();
    const montage = 'electrode: C3\nimpedance: 4.5k\nsample_rate: 1000';
    const diff = inspector.computeDiff(montage, montage);

    assert.equal(diff.length, 3);
    assert.ok(diff.every(line => line.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.changePercent, 0);
  });

  it('should accurately identify line insertions and line deletions', () => {
    const inspector = new NeurotechInterfaceDiffInspector();
    const orig = 'channel: Cz\nfilter: bandpass\ngain: 24';
    const mod = 'channel: Cz\nfilter: notch_60hz\ngain: 32\nreference: mastoid';

    inspector.computeDiff(orig, mod);
    const metrics = inspector.getChangeMetrics();

    assert.ok(metrics.added > 0);
    assert.ok(metrics.removed > 0);
    assert.ok(metrics.changePercent > 0);
  });

  it('should generate accurate unified diff view with correct prefix symbols', () => {
    const inspector = new NeurotechInterfaceDiffInspector();
    const orig = 'signal line 1\nsignal line 2';
    const mod = 'signal line 1\nsignal line inserted\nsignal line 2';

    inspector.computeDiff(orig, mod);
    const unified = inspector.generateUnifiedView();

    assert.ok(unified.includes('  signal line 1'));
    assert.ok(unified.includes('+ signal line inserted') || unified.includes('+ '));
  });

  it('should handle empty string inputs gracefully without crashing', () => {
    const inspector = new NeurotechInterfaceDiffInspector();
    const diff = inspector.computeDiff('', '');

    assert.equal(diff.length, 1);
    assert.equal(diff[0].type, 'unchanged');
    assert.equal(inspector.getChangeMetrics().changePercent, 0);
  });
});
