import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsDiffInspector } from './diff-viewer.js';

describe('GamingEsportsDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new GamingEsportsDiffInspector();
  });

  it('loads default esports server and balance presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    const srv = inspector.getPresetById('server-tickrate-config');
    assert.ok(srv);
    assert.equal(srv.category, 'Server Engine');
  });

  it('computes accurate diff stats for identical configs', () => {
    const text = 'tickrate: 128\nsv_maxrate: 786432';
    const diff = inspector.computeDiff(text, text);

    assert.equal(diff.stats.totalLines, 2);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.stats.modified, 0);
    assert.equal(diff.stats.changePercent, 0);
  });

  it('detects added and removed config lines', () => {
    const orig = 'sensitivity 1.8\nfps_max 240';
    const mod = 'sensitivity 1.8\nfps_max 240\ncl_crosshairsize 2';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.totalLines, 3);
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.lines[2].type, 'added');
  });

  it('detects modified balance variables accurately', () => {
    const orig = 'Base Health: 550 HP';
    const mod = 'Base Health: 575 HP';
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
    const preset = inspector.getPresetById('hero-balance-patch');
    assert.ok(preset);
    const diff = inspector.computeDiff(preset.original, preset.modified);
    assert.ok(diff.stats.totalLines > 0);
    assert.ok(diff.stats.modified > 0);
  });
});
