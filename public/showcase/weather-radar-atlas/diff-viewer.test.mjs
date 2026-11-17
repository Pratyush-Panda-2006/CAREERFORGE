import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasDiffInspector } from './diff-viewer.js';

describe('WeatherRadarAtlasDiffInspector', () => {
  it('should detect zero changes and 0% change metric on identical texts', () => {
    const inspector = new WeatherRadarAtlasDiffInspector();
    const scan = 'radar: KFTG\nvcp: 212\nelevation: 0.5';
    const diff = inspector.computeDiff(scan, scan);

    assert.equal(diff.length, 3);
    assert.ok(diff.every(line => line.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.changePercent, 0);
  });

  it('should accurately identify line insertions and line deletions', () => {
    const inspector = new WeatherRadarAtlasDiffInspector();
    const orig = 'station: KTLX\ndbz: 45\nwarning: none';
    const mod = 'station: KTLX\ndbz: 65\ntvs: true\nwarning: tornado';

    inspector.computeDiff(orig, mod);
    const metrics = inspector.getChangeMetrics();

    assert.ok(metrics.added > 0);
    assert.ok(metrics.removed > 0);
    assert.ok(metrics.changePercent > 0);
  });

  it('should generate accurate unified diff view with correct prefix symbols', () => {
    const inspector = new WeatherRadarAtlasDiffInspector();
    const orig = 'radar scan a\nradar scan b';
    const mod = 'radar scan a\nradar scan inserted\nradar scan b';

    inspector.computeDiff(orig, mod);
    const unified = inspector.generateUnifiedView();

    assert.ok(unified.includes('  radar scan a'));
    assert.ok(unified.includes('+ radar scan inserted') || unified.includes('+ '));
  });

  it('should handle empty string inputs gracefully without crashing', () => {
    const inspector = new WeatherRadarAtlasDiffInspector();
    const diff = inspector.computeDiff('', '');

    assert.equal(diff.length, 1);
    assert.equal(diff[0].type, 'unchanged');
    assert.equal(inspector.getChangeMetrics().changePercent, 0);
  });
});
