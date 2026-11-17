import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubPreferenceManager } from './preferences.js';

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

test('FestivalHubPreferenceManager loads default fallback values when storage is empty', () => {
  const mockStorage = createMockStorage();
  const manager = new FestivalHubPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.viewLayout, 'grid');
  assert.equal(prefs.soundCues, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.metricUnits, 'metric');
  assert.equal(prefs.lineupNotifications, true);
  assert.equal(prefs.audioVolume, 80);
});

test('save(key, val) updates in-memory preference and persists into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new FestivalHubPreferenceManager({ storage: mockStorage });

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

  const raw = JSON.parse(mockStorage.getItem(FestivalHubPreferenceManager.STORAGE_KEY));
  assert.equal(raw.soundCues, true);
  assert.equal(raw.highContrast, true);
  assert.equal(raw.viewLayout, 'timeline');
  assert.equal(raw.metricUnits, 'imperial');
});

test('resetDefaults restores initial settings and clears custom storage item', () => {
  const mockStorage = createMockStorage({
    [FestivalHubPreferenceManager.STORAGE_KEY]: JSON.stringify({
      theme: 'neon',
      soundCues: true,
      highContrast: true,
      viewLayout: 'map'
    })
  });
  const manager = new FestivalHubPreferenceManager({ storage: mockStorage });
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('viewLayout'), 'map');

  const reset = manager.resetDefaults();
  assert.equal(reset.highContrast, false);
  assert.equal(reset.soundCues, false);
  assert.equal(reset.viewLayout, 'grid');
  assert.equal(mockStorage.getItem(FestivalHubPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON outputs valid JSON containing complete preference state and metadata', () => {
  const mockStorage = createMockStorage();
  const manager = new FestivalHubPreferenceManager({ storage: mockStorage });
  manager.save('viewLayout', 'compact');
  manager.save('audioVolume', 95);

  const json = manager.exportJSON();
  assert.equal(typeof json, 'string');
  const parsed = JSON.parse(json);
  assert.equal(parsed.schemaVersion, '1.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.viewLayout, 'compact');
  assert.equal(parsed.preferences.audioVolume, 95);
});

test('importJSON successfully parses and applies preference payload', () => {
  const mockStorage = createMockStorage();
  const manager = new FestivalHubPreferenceManager({ storage: mockStorage });

  const customPayload = JSON.stringify({
    preferences: {
      soundCues: true,
      highContrast: true,
      viewLayout: 'map',
      metricUnits: 'imperial'
    }
  });

  const res = manager.importJSON(customPayload);
  assert.equal(res, true);
  assert.equal(manager.get('soundCues'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('viewLayout'), 'map');
  assert.equal(manager.get('metricUnits'), 'imperial');

  const invalidRes = manager.importJSON('invalid-json{{{');
  assert.equal(invalidRes, false);
});
