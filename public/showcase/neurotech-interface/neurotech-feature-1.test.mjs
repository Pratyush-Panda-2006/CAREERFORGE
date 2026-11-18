import test from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfacePreferenceManager } from './preferences.js';

test('NeurotechInterfacePreferenceManager - default fallback values', () => {
  const manager = new NeurotechInterfacePreferenceManager('test_neurotech_prefs');
  const prefs = manager.load();
  assert.equal(prefs.theme, 'neural-violet');
  assert.equal(prefs.eegBandFilter, 'all-bands');
  assert.equal(prefs.sampleRateHz, 250);
  assert.equal(prefs.artifactRejection, true);
  assert.equal(prefs.hapticFeedback, false);
  assert.equal(prefs.notchFilter60Hz, true);
});

test('NeurotechInterfacePreferenceManager - save and get preferences', () => {
  const manager = new NeurotechInterfacePreferenceManager('test_neurotech_save');
  manager.save('eegBandFilter', 'gamma');
  manager.save('sampleRateHz', 500);
  assert.equal(manager.get('eegBandFilter'), 'gamma');
  assert.equal(manager.get('sampleRateHz'), 500);

  // Batch object save
  manager.save({ artifactRejection: false, impedanceCheckEnabled: false });
  assert.equal(manager.get('artifactRejection'), false);
  assert.equal(manager.get('impedanceCheckEnabled'), false);
});

test('NeurotechInterfacePreferenceManager - export and import JSON integrity', () => {
  const manager = new NeurotechInterfacePreferenceManager('test_neurotech_export');
  manager.save('eegBandFilter', 'theta');
  const exported = manager.exportJSON();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.eegBandFilter, 'theta');

  const manager2 = new NeurotechInterfacePreferenceManager('test_neurotech_import');
  const success = manager2.importJSON(JSON.stringify({ eegBandFilter: 'theta', sampleRateHz: 1000 }));
  assert.equal(success, true);
  assert.equal(manager2.get('eegBandFilter'), 'theta');
  assert.equal(manager2.get('sampleRateHz'), 1000);
});

test('NeurotechInterfacePreferenceManager - resetDefaults restores baseline', () => {
  const manager = new NeurotechInterfacePreferenceManager('test_neurotech_reset');
  manager.save('eegBandFilter', 'alpha');
  manager.save('artifactRejection', false);
  manager.resetDefaults();
  assert.equal(manager.get('eegBandFilter'), 'all-bands');
  assert.equal(manager.get('artifactRejection'), true);
});

test('NeurotechInterfacePreferenceManager - persistence across instances with same backend', () => {
  class MockStorage {
    constructor() { this.data = new Map(); }
    getItem(k) { return this.data.get(k) || null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    removeItem(k) { this.data.delete(k); }
  }
  const sharedStorage = new MockStorage();
  const managerA = new NeurotechInterfacePreferenceManager('shared_neurotech', sharedStorage);
  managerA.save('sampleRateHz', 1000);

  const managerB = new NeurotechInterfacePreferenceManager('shared_neurotech', sharedStorage);
  assert.equal(managerB.get('sampleRateHz'), 1000);
});
