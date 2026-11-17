import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsPreferenceManager } from './preferences.js';

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

test('SupplyChainLogisticsPreferenceManager loads default fallback values when storage is empty', () => {
  const mockStorage = createMockStorage();
  const manager = new SupplyChainLogisticsPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.telemetryRefreshRate, 5);
  assert.equal(prefs.compactMode, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.notificationSound, true);
  assert.equal(prefs.defaultTimeframe, '24H');
  assert.equal(prefs.dataRetentionDays, 30);
});

test('save(key, val) updates in-memory preference and persists into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new SupplyChainLogisticsPreferenceManager({ storage: mockStorage });

  const s1 = manager.save('compactMode', true);
  const s2 = manager.save('highContrast', true);
  const s3 = manager.save('telemetryRefreshRate', 15);
  const s4 = manager.save('theme', 'cyber');

  assert.equal(s1, true);
  assert.equal(s2, true);
  assert.equal(s3, true);
  assert.equal(s4, true);

  assert.equal(manager.get('compactMode'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('telemetryRefreshRate'), 15);
  assert.equal(manager.get('theme'), 'cyber');

  const raw = JSON.parse(mockStorage.getItem(SupplyChainLogisticsPreferenceManager.STORAGE_KEY));
  assert.equal(raw.compactMode, true);
  assert.equal(raw.highContrast, true);
  assert.equal(raw.telemetryRefreshRate, 15);
  assert.equal(raw.theme, 'cyber');
});

test('resetDefaults restores initial settings and clears custom storage item', () => {
  const mockStorage = createMockStorage({
    [SupplyChainLogisticsPreferenceManager.STORAGE_KEY]: JSON.stringify({
      theme: 'light',
      compactMode: true
    })
  });
  const manager = new SupplyChainLogisticsPreferenceManager({ storage: mockStorage });
  assert.equal(manager.get('theme'), 'light');

  const reset = manager.resetDefaults();
  assert.equal(reset.theme, 'dark');
  assert.equal(reset.compactMode, false);
  assert.equal(mockStorage.getItem(SupplyChainLogisticsPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON and importJSON serialize and restore preferences correctly', () => {
  const mockStorage = createMockStorage();
  const manager = new SupplyChainLogisticsPreferenceManager({ storage: mockStorage });
  manager.save('telemetryRefreshRate', 25);
  manager.save('theme', 'cyber');

  const exported = manager.exportJSON();
  assert.ok(exported.includes('"telemetryRefreshRate": 25'));

  const newManager = new SupplyChainLogisticsPreferenceManager({ storage: createMockStorage() });
  const success = newManager.importJSON(exported);
  assert.equal(success, true);
  assert.equal(newManager.get('telemetryRefreshRate'), 25);
  assert.equal(newManager.get('theme'), 'cyber');
});

test('subscribe observer gets notified on preference changes', () => {
  const mockStorage = createMockStorage();
  const manager = new SupplyChainLogisticsPreferenceManager({ storage: mockStorage });
  let notifiedKey = null;
  let notifiedVal = null;

  const unsubscribe = manager.subscribe((key, val) => {
    notifiedKey = key;
    notifiedVal = val;
  });

  manager.save('notificationSound', false);
  assert.equal(notifiedKey, 'notificationSound');
  assert.equal(notifiedVal, false);

  unsubscribe();
  manager.save('notificationSound', true);
  assert.equal(notifiedKey, 'notificationSound'); // Still previous notification since unsubscribed
});
