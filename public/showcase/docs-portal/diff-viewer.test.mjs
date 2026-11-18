import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalDiffInspector } from './diff-viewer.js';

describe('DocsPortalDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new DocsPortalDiffInspector();
  });

  it('initializes with default documentation schema presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    assert.equal(presets[0].id, 'openapi-auth-migration');
  });

  it('computes line-by-line differences between original and modified text', () => {
    const orig = 'line 1\nline 2\nline 3';
    const mod = 'line 1\nline 2 modified\nline 3\nline 4';

    const diff = inspector.computeDiff(orig, mod);
    assert.ok(diff.length > 0);

    const types = diff.map((d) => d.type);
    assert.ok(types.includes('unchanged'));
    assert.ok(types.includes('removed'));
    assert.ok(types.includes('added'));
  });

  it('calculates diff statistics with addition, removal, and unchanged counts', () => {
    const diff = [
      { type: 'unchanged', content: 'a' },
      { type: 'removed', content: 'b' },
      { type: 'added', content: 'c' },
      { type: 'added', content: 'd' }
    ];

    const stats = inspector.getDiffStats(diff);
    assert.equal(stats.added, 2);
    assert.equal(stats.removed, 1);
    assert.equal(stats.unchanged, 1);
    assert.equal(stats.totalLines, 4);
    assert.equal(stats.netChange, 1);
  });

  it('retrieves preset by id correctly', () => {
    const p = inspector.getPresetById('rate-limiting-quota');
    assert.ok(p);
    assert.equal(p.title, 'Rate Limiting Tier Quota Policy Evolution');

    assert.equal(inspector.getPresetById('unknown-id'), null);
  });
});
