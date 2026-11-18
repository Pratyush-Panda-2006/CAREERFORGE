import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioPreferenceManager } from './preferences.js';

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

test('DeveloperPortfolioPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.layout, 'grid');
  assert.equal(prefs.syntaxTheme, 'dracula');
  assert.equal(prefs.soundCues, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.showMetrics, true);
  assert.equal(prefs.codeFontSize, 14);
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });

  const ok = manager.save('theme', 'nord');
  assert.equal(ok, true);
  assert.equal(manager.get('theme'), 'nord');

  manager.save('highContrast', true);
  manager.save('codeFontSize', 16);

  const raw = mockStorage.getItem(DeveloperPortfolioPreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.theme, 'nord');
  assert.equal(parsed.highContrast, true);
  assert.equal(parsed.codeFontSize, 16);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });

  manager.save('theme', 'solarized-light');
  manager.save('layout', 'list');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'dark');
  assert.equal(restored.layout, 'grid');
  assert.equal(mockStorage.getItem(DeveloperPortfolioPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });
  manager.save('syntaxTheme', 'monokai');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Developer Portfolio');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.syntaxTheme, 'monokai');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Developer Portfolio',
    preferences: {
      theme: 'cyberpunk',
      codeFontSize: 18,
      soundCues: true
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'cyberpunk');
  assert.equal(manager.get('codeFontSize'), 18);
  assert.equal(manager.get('soundCues'), true);

  // Fallback check on malformed JSON
  const invalid = manager.importJSON('invalid-json-string');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new DeveloperPortfolioPreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'high-contrast-dark');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'high-contrast-dark');

  unsubscribe();
  manager.save('theme', 'light');
  assert.equal(events.length, 1); // No new events after unsubscribe
});
