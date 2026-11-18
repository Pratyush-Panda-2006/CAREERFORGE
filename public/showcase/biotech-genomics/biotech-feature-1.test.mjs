import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsPreferenceManager, MemoryStorage } from './preferences.js';

describe('BiotechGenomicsPreferenceManager (Issue #659)', () => {
  it('initializes with verified default genomics workspace preferences', () => {
    const memory = new MemoryStorage();
    const manager = new BiotechGenomicsPreferenceManager({ storage: memory });
    const defaults = manager.state;

    assert.equal(defaults.theme, 'emerald-matrix');
    assert.equal(defaults.sequenceAlignmentLayout, 'split-ribbon');
    assert.equal(defaults.audioAlertsEnabled, true);
    assert.equal(defaults.alertVolume, 65);
    assert.equal(defaults.highContrastMode, false);
    assert.equal(defaults.metricUnits, 'base-pairs');
    assert.equal(defaults.renderFidelity, 'high');
    assert.equal(defaults.crisprOverlayHighlight, true);
  });

  it('updates preferences via key-value and object-merge with persistent storage', () => {
    const memory = new MemoryStorage();
    const manager = new BiotechGenomicsPreferenceManager({ storage: memory });

    manager.save('metricUnits', 'mega-bases');
    assert.equal(manager.get('metricUnits'), 'mega-bases');

    manager.save({
      theme: 'cyan-helix',
      audioAlertsEnabled: false,
      alertVolume: 80
    });

    assert.equal(manager.get('theme'), 'cyan-helix');
    assert.equal(manager.get('audioAlertsEnabled'), false);
    assert.equal(manager.get('alertVolume'), 80);
    assert.equal(manager.get('metricUnits'), 'mega-bases'); // retains previous change
  });

  it('verifies persistence integrity across new manager instances', () => {
    const memory = new MemoryStorage();
    const manager1 = new BiotechGenomicsPreferenceManager({ storage: memory });
    manager1.save({
      sequenceAlignmentLayout: 'circular-chord',
      highContrastMode: true
    });

    // Instantiate fresh manager sharing same storage backend
    const manager2 = new BiotechGenomicsPreferenceManager({ storage: memory });
    assert.equal(manager2.get('sequenceAlignmentLayout'), 'circular-chord');
    assert.equal(manager2.get('highContrastMode'), true);
    assert.equal(manager2.get('theme'), 'emerald-matrix'); // unchanged default
  });

  it('resets all modified preferences back to standard defaults', () => {
    const memory = new MemoryStorage();
    const manager = new BiotechGenomicsPreferenceManager({ storage: memory });
    manager.save('theme', 'high-contrast-bio');
    manager.save('crisprOverlayHighlight', false);

    assert.equal(manager.get('theme'), 'high-contrast-bio');
    assert.equal(manager.get('crisprOverlayHighlight'), false);

    manager.resetDefaults();
    assert.equal(manager.get('theme'), 'emerald-matrix');
    assert.equal(manager.get('crisprOverlayHighlight'), true);
  });

  it('exports valid JSON configuration string with verified schema and metadata', () => {
    const memory = new MemoryStorage();
    const manager = new BiotechGenomicsPreferenceManager({ storage: memory });
    const jsonStr = manager.exportJSON();
    assert.ok(typeof jsonStr === 'string');

    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.appName, 'Biotech Genomics Workspace');
    assert.equal(parsed.version, '3.4.0');
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.preferences.theme, 'emerald-matrix');
    assert.equal(parsed.preferences.metricUnits, 'base-pairs');
  });

  it('gracefully handles corrupted storage data by falling back to defaults', () => {
    const memory = new MemoryStorage();
    memory.setItem('biotech_genomics_user_preferences_v1', '{invalid_json--corrupted');
    const manager = new BiotechGenomicsPreferenceManager({ storage: memory });

    assert.equal(manager.get('theme'), 'emerald-matrix');
    assert.equal(manager.get('metricUnits'), 'base-pairs');
  });
});
