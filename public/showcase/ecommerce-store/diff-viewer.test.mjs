import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceDiffInspector } from './diff-viewer.js';

describe('EcommerceDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new EcommerceDiffInspector();
  });

  it('initializes with default e-commerce catalog presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    assert.equal(presets[0].id, 'promo-discount-matrix');
  });

  it('computes line-by-line diff between original and modified catalog text', () => {
    const orig = 'item: tee\nprice: 25';
    const mod = 'item: tee\nprice: 20\nsale: true';

    const diff = inspector.computeDiff(orig, mod);
    assert.ok(diff.length > 0);

    const types = diff.map((d) => d.type);
    assert.ok(types.includes('unchanged'));
    assert.ok(types.includes('removed'));
    assert.ok(types.includes('added'));
  });

  it('calculates diff statistics with addition, removal, and unchanged counts', () => {
    const diff = [
      { type: 'unchanged', content: 'sku' },
      { type: 'removed', content: 'old' },
      { type: 'added', content: 'new' }
    ];

    const stats = inspector.getDiffStats(diff);
    assert.equal(stats.added, 1);
    assert.equal(stats.removed, 1);
    assert.equal(stats.unchanged, 1);
    assert.equal(stats.totalLines, 3);
    assert.equal(stats.netChange, 0);
  });

  it('retrieves preset by id correctly', () => {
    const p = inspector.getPresetById('shipping-zone-tariffs');
    assert.ok(p);
    assert.equal(p.title, 'Cross-Border Carrier Shipping Rates & Zone Tariffs');

    assert.equal(inspector.getPresetById('non-existent'), null);
  });
});
