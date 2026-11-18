import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalPreferenceManager } from './preferences.js';

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

test('DocsPortalPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.layout, 'comfortable');
  assert.equal(prefs.readerFont, 'inter');
  assert.equal(prefs.fontSize, 16);
  assert.equal(prefs.lineSpacing, 1.6);
  assert.equal(prefs.showToc, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.autoExpandCode, true);
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });

  const ok = manager.save('theme', 'sepia');
  assert.equal(ok, true);
  assert.equal(manager.get('theme'), 'sepia');

  manager.save('highContrast', true);
  manager.save('fontSize', 18);

  const raw = mockStorage.getItem(DocsPortalPreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.theme, 'sepia');
  assert.equal(parsed.highContrast, true);
  assert.equal(parsed.fontSize, 18);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });

  manager.save('theme', 'light');
  manager.save('readerFont', 'serif');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'dark');
  assert.equal(restored.readerFont, 'inter');
  assert.equal(mockStorage.getItem(DocsPortalPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });
  manager.save('readerFont', 'fira-code');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Docs Portal Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.readerFont, 'fira-code');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Docs Portal Core',
    preferences: {
      theme: 'cyberpunk',
      fontSize: 20,
      showToc: false
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'cyberpunk');
  assert.equal(manager.get('fontSize'), 20);
  assert.equal(manager.get('showToc'), false);

  const invalid = manager.importJSON('invalid-json');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new DocsPortalPreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'dark-dimmed');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'dark-dimmed');

  unsubscribe();
  manager.save('theme', 'light');
  assert.equal(events.length, 1);
});
