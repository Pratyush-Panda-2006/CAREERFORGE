import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioDiffInspector } from './diff-viewer.js';

describe('DeveloperPortfolioDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new DeveloperPortfolioDiffInspector();
  });

  it('initializes with default refactoring and code review presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    assert.equal(presets[0].id, 'abort-controller-refactor');
  });

  it('computes line differences correctly', () => {
    const original = 'const a = 1;\nconst b = 2;';
    const modified = 'const a = 1;\nconst b = 3;\nconst c = 4;';

    const diff = inspector.computeDiff(original, modified);
    assert.ok(diff.length > 0);

    const types = diff.map((d) => d.type);
    assert.ok(types.includes('unchanged'));
    assert.ok(types.includes('removed'));
    assert.ok(types.includes('added'));
  });

  it('calculates diff stats with correct counts', () => {
    const diff = [
      { type: 'unchanged', content: 'keep' },
      { type: 'removed', content: 'del' },
      { type: 'added', content: 'add1' },
      { type: 'added', content: 'add2' }
    ];

    const stats = inspector.getDiffStats(diff);
    assert.equal(stats.added, 2);
    assert.equal(stats.removed, 1);
    assert.equal(stats.unchanged, 1);
    assert.equal(stats.totalLines, 4);
    assert.equal(stats.netChange, 1);
  });

  it('retrieves preset by id or null if not found', () => {
    const preset = inspector.getPresetById('docker-multistage-build');
    assert.ok(preset);
    assert.equal(preset.title, 'Dockerfile Optimization to Multi-Stage Build');

    assert.equal(inspector.getPresetById('missing'), null);
  });
});
