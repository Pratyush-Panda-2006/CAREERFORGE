import test from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProPreferenceManager } from './preferences.js';

function createMockStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => {
      for (const k in store) delete store[k];
    },
    _raw: store
  };
}

test('FitnessCrossfitProPreferenceManager loads default fallback values when storage is empty', () => {
  const mockStorage = createMockStorage();
  const manager = new FitnessCrossfitProPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.viewLayout, 'grid');
  assert.equal(prefs.soundCues, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.metricUnits, 'metric');
  assert.equal(prefs.lineupNotifications, true);
  assert.equal(prefs.audioVolume, 80);
});

test('FitnessCrossfitProPreferenceManager save(key, val) updates in-memory preference and persists into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new FitnessCrossfitProPreferenceManager({ storage: mockStorage });

  const s1 = manager.save('soundCues', true);
  const s2 = manager.save('highContrast', true);
  const s3 = manager.save('viewLayout', 'timeline');
  const s4 = manager.save('metricUnits', 'imperial');

  assert.equal(s1, true);
  assert.equal(s2, true);
  assert.equal(s3, true);
  assert.equal(s4, true);

  assert.equal(manager.get('soundCues'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('viewLayout'), 'timeline');
  assert.equal(manager.get('metricUnits'), 'imperial');

  const raw = JSON.parse(mockStorage.getItem(FitnessCrossfitProPreferenceManager.STORAGE_KEY));
  assert.equal(raw.soundCues, true);
  assert.equal(raw.highContrast, true);
  assert.equal(raw.viewLayout, 'timeline');
  assert.equal(raw.metricUnits, 'imperial');
});

test('FitnessCrossfitProPreferenceManager resetDefaults restores initial settings and clears custom storage item', () => {
  const mockStorage = createMockStorage({
    [FitnessCrossfitProPreferenceManager.STORAGE_KEY]: JSON.stringify({ soundCues: true, theme: 'custom' })
  });
  const manager = new FitnessCrossfitProPreferenceManager({ storage: mockStorage });
  manager.resetDefaults();

  assert.equal(manager.get('soundCues'), false);
  assert.equal(manager.get('theme'), 'dark');
});

test('FitnessCrossfitProPreferenceManager exportJSON returns structured schema string', () => {
  const manager = new FitnessCrossfitProPreferenceManager();
  const json = manager.exportJSON();
  const parsed = JSON.parse(json);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'fitness-crossfit-pro');
  assert.ok(parsed.preferences);
});
