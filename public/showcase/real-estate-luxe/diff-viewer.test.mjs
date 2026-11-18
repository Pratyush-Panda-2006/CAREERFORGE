import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeDiffInspector } from './diff-viewer.js';

describe('RealEstateLuxeDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new RealEstateLuxeDiffInspector();
  });

  it('loads default luxury contract and spec presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    const psa = inspector.getPresetById('purchase-sale-agreement');
    assert.ok(psa);
    assert.equal(psa.category, 'Legal Contracts');
  });

  it('computes accurate diff stats for identical contract clauses', () => {
    const text = 'Offer: $24,500,000\nClosing: 14 Days';
    const diff = inspector.computeDiff(text, text);

    assert.equal(diff.stats.totalLines, 2);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.stats.modified, 0);
    assert.equal(diff.stats.changePercent, 0);
  });

  it('detects added and removed specifications correctly', () => {
    const orig = 'Flooring: White Oak\nCountertop: Quartz';
    const mod = 'Flooring: White Oak\nCountertop: Quartz\nSauna: Finnish Cedar';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.totalLines, 3);
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.lines[2].type, 'added');
  });

  it('detects modified contract terms accurately', () => {
    const orig = 'Purchase Offer Price: $22,000,000';
    const mod = 'Purchase Offer Price: $24,500,000 (All-Cash Guarantee)';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.modified, 1);
    assert.equal(diff.lines[0].type, 'modified');
    assert.equal(diff.lines[0].originalText, orig);
    assert.equal(diff.lines[0].modifiedText, mod);
  });

  it('safely handles empty configuration inputs', () => {
    const diff = inspector.computeDiff('', '');
    assert.equal(diff.stats.totalLines, 1);
  });

  it('calculates preset diff correctly', () => {
    const preset = inspector.getPresetById('hoa-covenants-ccr');
    assert.ok(preset);
    const diff = inspector.computeDiff(preset.original, preset.modified);
    assert.ok(diff.stats.totalLines > 0);
    assert.ok(diff.stats.modified > 0);
  });
});
