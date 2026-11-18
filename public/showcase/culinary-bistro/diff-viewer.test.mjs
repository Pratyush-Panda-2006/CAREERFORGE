import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroDiffInspector } from './diff-viewer.js';

describe('CulinaryBistroDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new CulinaryBistroDiffInspector();
  });

  it('loads default culinary degustation and prep presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    const degustation = inspector.getPresetById('seasonal-degustation-menu');
    assert.ok(degustation);
    assert.equal(degustation.category, 'Menu Development');
  });

  it('computes accurate diff stats for identical menu lists', () => {
    const text = 'Course 1: Caviar Tartlet\nCourse 2: A5 Wagyu Striploin';
    const diff = inspector.computeDiff(text, text);

    assert.equal(diff.stats.totalLines, 2);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.stats.modified, 0);
    assert.equal(diff.stats.changePercent, 0);
  });

  it('detects added and removed culinary courses correctly', () => {
    const orig = 'Veal Demi-Glace: 4.0L\nShallots: 1.5kg';
    const mod = 'Veal Demi-Glace: 4.0L\nShallots: 1.5kg\nBlack Truffles: 450g';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.totalLines, 3);
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.lines[2].type, 'added');
  });

  it('detects modified course descriptions accurately', () => {
    const orig = 'Course 1: Brittany Oyster with Cucumber Granite';
    const mod = 'Course 1: Royal Oscietra Caviar Tartlet with Smoked Crème';
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
    const preset = inspector.getPresetById('sommelier-wine-pairing');
    assert.ok(preset);
    const diff = inspector.computeDiff(preset.original, preset.modified);
    assert.ok(diff.stats.totalLines > 0);
    assert.ok(diff.stats.modified > 0);
  });
});
