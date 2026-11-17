import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingPreferenceManager } from './preferences.js';

test('AgritechPrecisionFarmingPreferenceManager - default fallback values', () => {
  const manager = new AgritechPrecisionFarmingPreferenceManager('test_prefs_default');
  const prefs = manager.load();
  assert.equal(prefs.theme, 'dark-emerald');
  assert.equal(prefs.viewLayout, 'grid');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.metricUnits, 'metric');
  assert.equal(prefs.autoRefreshIntervalSec, 30);
});

test('AgritechPrecisionFarmingPreferenceManager - save and get preferences', () => {
  const manager = new AgritechPrecisionFarmingPreferenceManager('test_prefs_save');
  manager.save('viewLayout', 'dense');
  manager.save('metricUnits', 'imperial');
  assert.equal(manager.get('viewLayout'), 'dense');
  assert.equal(manager.get('metricUnits'), 'imperial');

  // Object batch update
  manager.save({ soundCues: false, highContrast: true });
  assert.equal(manager.get('soundCues'), false);
  assert.equal(manager.get('highContrast'), true);
});

test('AgritechPrecisionFarmingPreferenceManager - export and import JSON integrity', () => {
  const manager = new AgritechPrecisionFarmingPreferenceManager('test_prefs_export');
  manager.save('viewLayout', 'map');
  const exported = manager.exportJSON();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.viewLayout, 'map');

  const manager2 = new AgritechPrecisionFarmingPreferenceManager('test_prefs_import');
  const success = manager2.importJSON(JSON.stringify({ viewLayout: 'dense', metricUnits: 'imperial' }));
  assert.equal(success, true);
  assert.equal(manager2.get('viewLayout'), 'dense');
  assert.equal(manager2.get('metricUnits'), 'imperial');
});

test('AgritechPrecisionFarmingPreferenceManager - resetDefaults restores baseline', () => {
  const manager = new AgritechPrecisionFarmingPreferenceManager('test_prefs_reset');
  manager.save('viewLayout', 'map');
  manager.save('soundCues', false);
  manager.resetDefaults();
  assert.equal(manager.get('viewLayout'), 'grid');
  assert.equal(manager.get('soundCues'), true);
});

test('AgritechPrecisionFarmingPreferenceManager - persistence across instances with same backend', () => {
  class MockStorage {
    constructor() { this.data = new Map(); }
    getItem(k) { return this.data.get(k) || null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    removeItem(k) { this.data.delete(k); }
  }
  const sharedStorage = new MockStorage();
  const managerA = new AgritechPrecisionFarmingPreferenceManager('shared_key', sharedStorage);
  managerA.save('viewLayout', 'dense');

  const managerB = new AgritechPrecisionFarmingPreferenceManager('shared_key', sharedStorage);
  assert.equal(managerB.get('viewLayout'), 'dense');
});
