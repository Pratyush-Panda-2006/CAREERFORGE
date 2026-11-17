import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadPreferenceManager } from './preferences.js';

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

test('SaasLaunchpadPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new SaasLaunchpadPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.telemetryRefreshRate, 5);
  assert.equal(prefs.compactMode, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.notificationSound, true);
  assert.equal(prefs.defaultTimeframe, '24H');
  assert.equal(prefs.dataRetentionDays, 30);
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new SaasLaunchpadPreferenceManager({ storage: mockStorage });

  const r1 = manager.save('compactMode', true);
  const r2 = manager.save('highContrast', true);
  const r3 = manager.save('telemetryRefreshRate', 15);
  const r4 = manager.save('defaultTimeframe', '7D');

  assert.equal(r1, true);
  assert.equal(r2, true);
  assert.equal(r3, true);
  assert.equal(r4, true);

  assert.equal(manager.get('compactMode'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('telemetryRefreshRate'), 15);
  assert.equal(manager.get('defaultTimeframe'), '7D');

  const stored = JSON.parse(mockStorage.getItem(SaasLaunchpadPreferenceManager.STORAGE_KEY));
  assert.equal(stored.compactMode, true);
  assert.equal(stored.highContrast, true);
  assert.equal(stored.telemetryRefreshRate, 15);
  assert.equal(stored.defaultTimeframe, '7D');
});

test('resetDefaults restores initial settings and clears localStorage', () => {
  const mockStorage = createMockStorage({
    [SaasLaunchpadPreferenceManager.STORAGE_KEY]: JSON.stringify({
      compactMode: true,
      highContrast: true,
      telemetryRefreshRate: 1
    })
  });
  const manager = new SaasLaunchpadPreferenceManager({ storage: mockStorage });
  assert.equal(manager.get('compactMode'), true);

  const resetPrefs = manager.resetDefaults();
  assert.equal(resetPrefs.compactMode, false);
  assert.equal(resetPrefs.highContrast, false);
  assert.equal(resetPrefs.telemetryRefreshRate, 5);
  assert.equal(mockStorage.getItem(SaasLaunchpadPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new SaasLaunchpadPreferenceManager({ storage: mockStorage });
  manager.save('defaultTimeframe', '1H');
  manager.save('dataRetentionDays', 90);

  const jsonStr = manager.exportJSON();
  assert.equal(typeof jsonStr, 'string');
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'SaaS Launchpad Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.defaultTimeframe, '1H');
  assert.equal(parsed.preferences.dataRetentionDays, 90);
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new SaasLaunchpadPreferenceManager({ storage: mockStorage });

  const customConfig = JSON.stringify({
    preferences: {
      compactMode: true,
      highContrast: true,
      telemetryRefreshRate: 60,
      defaultTimeframe: '30D'
    }
  });

  const success = manager.importJSON(customConfig);
  assert.equal(success, true);
  assert.equal(manager.get('compactMode'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('telemetryRefreshRate'), 60);
  assert.equal(manager.get('defaultTimeframe'), '30D');

  const fail = manager.importJSON('not-a-valid-json');
  assert.equal(fail, false);
});
