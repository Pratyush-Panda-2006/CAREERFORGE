import test from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroPreferenceManager } from './preferences.js';

function createMockStorage(seed = {}) {
  const store = { ...seed };
  return {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: k => {
      delete store[k];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
    _raw: store
  };
}

test('CulinaryBistroPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.layout, 'grid');
  assert.equal(prefs.temperatureUnit, 'celsius');
  assert.equal(prefs.currency, 'USD');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.dietaryAlerts, true);
  assert.equal(prefs.tableDensity, 'spacious');
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });

  const ok = manager.save('temperatureUnit', 'fahrenheit');
  assert.equal(ok, true);
  assert.equal(manager.get('temperatureUnit'), 'fahrenheit');

  manager.save('currency', 'EUR');
  manager.save('highContrast', true);

  const raw = mockStorage.getItem(CulinaryBistroPreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.temperatureUnit, 'fahrenheit');
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.highContrast, true);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });

  manager.save('theme', 'rustic-wood');
  manager.save('currency', 'GBP');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'dark');
  assert.equal(restored.currency, 'USD');
  assert.equal(mockStorage.getItem(CulinaryBistroPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });
  manager.save('tableDensity', 'compact');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Culinary Bistro Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.tableDensity, 'compact');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Culinary Bistro Core',
    preferences: {
      theme: 'bistro-emerald',
      currency: 'JPY',
      dietaryAlerts: false
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'bistro-emerald');
  assert.equal(manager.get('currency'), 'JPY');
  assert.equal(manager.get('dietaryAlerts'), false);

  const invalid = manager.importJSON('invalid-json');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new CulinaryBistroPreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'midnight-velvet');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'midnight-velvet');

  unsubscribe();
  manager.save('theme', 'light');
  assert.equal(events.length, 1);
});
