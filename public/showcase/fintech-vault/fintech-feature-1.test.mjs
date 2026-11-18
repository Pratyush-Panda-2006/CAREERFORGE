import test from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultPreferenceManager } from './preferences.js';

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

test('FintechVaultPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'cyber-dark');
  assert.equal(prefs.layout, 'dashboard');
  assert.equal(prefs.currency, 'USD');
  assert.equal(prefs.securityLevel, 'strict');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.maskedBalances, true);
  assert.equal(prefs.auditLogging, 'realtime');
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });

  const ok = manager.save('securityLevel', 'maximum');
  assert.equal(ok, true);
  assert.equal(manager.get('securityLevel'), 'maximum');

  manager.save('currency', 'EUR');
  manager.save('highContrast', true);

  const raw = mockStorage.getItem(FintechVaultPreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.securityLevel, 'maximum');
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.highContrast, true);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });

  manager.save('theme', 'terminal-green');
  manager.save('currency', 'GBP');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'cyber-dark');
  assert.equal(restored.currency, 'USD');
  assert.equal(mockStorage.getItem(FintechVaultPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });
  manager.save('auditLogging', 'batched');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Fintech Vault Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.auditLogging, 'batched');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Fintech Vault Core',
    preferences: {
      theme: 'neon-emerald',
      currency: 'SGD',
      maskedBalances: false
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'neon-emerald');
  assert.equal(manager.get('currency'), 'SGD');
  assert.equal(manager.get('maskedBalances'), false);

  const invalid = manager.importJSON('invalid-json');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new FintechVaultPreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'matrix-code');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'matrix-code');

  unsubscribe();
  manager.save('theme', 'cyber-dark');
  assert.equal(events.length, 1);
});
