import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultDiffInspector } from './diff-viewer.js';

describe('FintechVaultDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new FintechVaultDiffInspector();
  });

  it('loads default banking and loan presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    const basel = inspector.getPresetById('basel-capital-ratios');
    assert.ok(basel);
    assert.equal(basel.category, 'Prudential Ratios');
  });

  it('computes accurate diff stats for identical balance reports', () => {
    const text = 'Common Equity Tier 1: 9.4%\nTier 1 Leverage: 4.8%';
    const diff = inspector.computeDiff(text, text);

    assert.equal(diff.stats.totalLines, 2);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.stats.modified, 0);
    assert.equal(diff.stats.changePercent, 0);
  });

  it('detects added and removed clauses correctly', () => {
    const orig = 'Domestic Interchange: 1.75%\nChargeback Fee: $25.00';
    const mod = 'Domestic Interchange: 1.75%\nChargeback Fee: $25.00\nInstant SEPA Fee: 0.10%';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.totalLines, 3);
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.lines[2].type, 'added');
  });

  it('detects modified pricing terms accurately', () => {
    const orig = 'Domestic Card Interchange: 1.75% + $0.30';
    const mod = 'Domestic Card Interchange: 1.35% + $0.18';
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
    const preset = inspector.getPresetById('corporate-syndicated-facility');
    assert.ok(preset);
    const diff = inspector.computeDiff(preset.original, preset.modified);
    assert.ok(diff.stats.totalLines > 0);
    assert.ok(diff.stats.modified > 0);
  });
});
