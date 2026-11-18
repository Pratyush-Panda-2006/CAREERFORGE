import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityDiffInspector } from './diff-viewer.js';

describe('HealthVitalityDiffInspector', () => {
  let inspector;

  beforeEach(() => {
    inspector = new HealthVitalityDiffInspector();
  });

  it('loads default biomarker and regimen presets', () => {
    const presets = inspector.getPresets();
    assert.ok(presets.length >= 3);
    const blood = inspector.getPresetById('blood-lipid-panel');
    assert.ok(blood);
    assert.equal(blood.category, 'Biomarkers');
  });

  it('computes accurate diff lines and stats for identical texts', () => {
    const text = 'Fasting Glucose: 90 mg/dL\nHbA1c: 5.2%';
    const diff = inspector.computeDiff(text, text);

    assert.equal(diff.stats.totalLines, 2);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.stats.modified, 0);
    assert.equal(diff.stats.changePercent, 0);
  });

  it('detects line additions and removals properly', () => {
    const orig = 'Deep Sleep: 45m\nREM: 60m';
    const mod = 'Deep Sleep: 45m\nREM: 60m\nHRV: 70ms';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.totalLines, 3);
    assert.equal(diff.stats.added, 1);
    assert.equal(diff.stats.unchanged, 2);
    assert.equal(diff.lines[2].type, 'added');
  });

  it('detects modified lines between baseline and current regimen', () => {
    const orig = 'Total Cholesterol: 228 mg/dL';
    const mod = 'Total Cholesterol: 184 mg/dL';
    const diff = inspector.computeDiff(orig, mod);

    assert.equal(diff.stats.modified, 1);
    assert.equal(diff.lines[0].type, 'modified');
    assert.equal(diff.lines[0].originalText, orig);
    assert.equal(diff.lines[0].modifiedText, mod);
  });

  it('handles empty inputs without throwing', () => {
    const diff = inspector.computeDiff('', '');
    assert.equal(diff.stats.totalLines, 1);
  });

  it('computes preset diff directly', () => {
    const preset = inspector.getPresetById('sleep-architecture-optimization');
    assert.ok(preset);
    const diff = inspector.computeDiff(preset.original, preset.modified);
    assert.ok(diff.stats.totalLines > 0);
    assert.ok(diff.stats.modified > 0);
  });
});
