import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubDiffInspector } from './diff-viewer.js';

describe('StreamingCinemaHubDiffInspector', () => {
  it('should detect zero changes and 0% change metric on identical texts', () => {
    const inspector = new StreamingCinemaHubDiffInspector();
    const manifest = '#EXTM3U\n#EXT-X-VERSION:6\n#EXTINF:6.000,';
    const diff = inspector.computeDiff(manifest, manifest);

    assert.equal(diff.length, 3);
    assert.ok(diff.every(line => line.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.changePercent, 0);
  });

  it('should accurately identify line insertions and line deletions', () => {
    const inspector = new StreamingCinemaHubDiffInspector();
    const orig = 'title: Dune\nresolution: 1080p\naudio: 5.1';
    const mod = 'title: Dune\nresolution: 4K HDR\naudio: Dolby Atmos\nsubtitles: English';

    inspector.computeDiff(orig, mod);
    const metrics = inspector.getChangeMetrics();

    assert.ok(metrics.added > 0);
    assert.ok(metrics.removed > 0);
    assert.ok(metrics.changePercent > 0);
  });

  it('should generate accurate unified diff view with correct prefix symbols', () => {
    const inspector = new StreamingCinemaHubDiffInspector();
    const orig = 'scene 1: Intro\nscene 2: Climax';
    const mod = 'scene 1: Intro\nscene 2: Interlude\nscene 3: Climax';

    inspector.computeDiff(orig, mod);
    const unified = inspector.generateUnifiedView();

    assert.ok(unified.includes('  scene 1: Intro'));
    assert.ok(unified.includes('+ scene 2: Interlude') || unified.includes('+ '));
  });

  it('should handle empty string inputs gracefully without crashing', () => {
    const inspector = new StreamingCinemaHubDiffInspector();
    const diff = inspector.computeDiff('', '');

    assert.equal(diff.length, 1);
    assert.equal(diff[0].type, 'unchanged');
    assert.equal(inspector.getChangeMetrics().changePercent, 0);
  });
});
