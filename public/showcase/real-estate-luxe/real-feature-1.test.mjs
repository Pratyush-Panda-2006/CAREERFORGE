import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxePreferenceManager } from './preferences.js';

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

test('RealEstateLuxePreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark-luxe');
  assert.equal(prefs.layout, 'grid');
  assert.equal(prefs.metricUnits, 'sqft');
  assert.equal(prefs.currency, 'USD');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.priceDisplay, 'standard');
  assert.equal(prefs.mapStyle, 'satellite-dark');
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });

  const ok = manager.save('metricUnits', 'sqm');
  assert.equal(ok, true);
  assert.equal(manager.get('metricUnits'), 'sqm');

  manager.save('currency', 'EUR');
  manager.save('highContrast', true);

  const raw = mockStorage.getItem(RealEstateLuxePreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.metricUnits, 'sqm');
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.highContrast, true);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });

  manager.save('theme', 'platinum-light');
  manager.save('currency', 'GBP');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'dark-luxe');
  assert.equal(restored.currency, 'USD');
  assert.equal(mockStorage.getItem(RealEstateLuxePreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });
  manager.save('priceDisplay', 'compact');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Real Estate Luxe Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.priceDisplay, 'compact');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Real Estate Luxe Core',
    preferences: {
      theme: 'gold-terrace',
      currency: 'CHF',
      metricUnits: 'sqm'
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'gold-terrace');
  assert.equal(manager.get('currency'), 'CHF');
  assert.equal(manager.get('metricUnits'), 'sqm');

  const invalid = manager.importJSON('invalid-json');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new RealEstateLuxePreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'onyx-noir');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'onyx-noir');

  unsubscribe();
  manager.save('theme', 'dark-luxe');
  assert.equal(events.length, 1);
});
