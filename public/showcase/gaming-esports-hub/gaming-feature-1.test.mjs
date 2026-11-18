import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubPreferenceManager } from './preferences.js';

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

test('GamingEsportsHubPreferenceManager loads standard defaults when storage is clear', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'cyberpunk-neon');
  assert.equal(prefs.layout, 'grid');
  assert.equal(prefs.streamQuality, '1080p60');
  assert.equal(prefs.region, 'NA');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.autoPlayClips, true);
  assert.equal(prefs.chatDensity, 'compact');
});

test('save(key, val) properly records key in memory and serializes into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });

  const ok = manager.save('streamQuality', '4k60');
  assert.equal(ok, true);
  assert.equal(manager.get('streamQuality'), '4k60');

  manager.save('region', 'EU');
  manager.save('highContrast', true);

  const raw = mockStorage.getItem(GamingEsportsHubPreferenceManager.STORAGE_KEY);
  assert.ok(raw);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.streamQuality, '4k60');
  assert.equal(parsed.region, 'EU');
  assert.equal(parsed.highContrast, true);
});

test('resetDefaults restores initial settings and clears storage', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });

  manager.save('theme', 'retro-arcade');
  manager.save('region', 'APAC');

  const restored = manager.resetDefaults();
  assert.equal(restored.theme, 'cyberpunk-neon');
  assert.equal(restored.region, 'NA');
  assert.equal(mockStorage.getItem(GamingEsportsHubPreferenceManager.STORAGE_KEY), null);
});

test('exportJSON produces valid JSON string with system metadata and preference values', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });
  manager.save('chatDensity', 'expanded');

  const exported = manager.exportJSON();
  const parsed = JSON.parse(exported);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'Gaming Esports Hub Core');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.chatDensity, 'expanded');
});

test('importJSON hydrates preference state correctly from JSON input', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });

  const payload = JSON.stringify({
    schemaVersion: '1.0',
    system: 'Gaming Esports Hub Core',
    preferences: {
      theme: 'synthwave-glow',
      region: 'KR',
      autoPlayClips: false
    }
  });

  const success = manager.importJSON(payload);
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'synthwave-glow');
  assert.equal(manager.get('region'), 'KR');
  assert.equal(manager.get('autoPlayClips'), false);

  const invalid = manager.importJSON('invalid-json');
  assert.equal(invalid, false);
});

test('subscribe correctly notifies listeners on save and reset events', () => {
  const mockStorage = createMockStorage();
  const manager = new GamingEsportsHubPreferenceManager({ storage: mockStorage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('theme', 'valorant-red');
  assert.equal(events.length, 1);
  assert.equal(events[0].key, 'theme');
  assert.equal(events[0].val, 'valorant-red');

  unsubscribe();
  manager.save('theme', 'cyberpunk-neon');
  assert.equal(events.length, 1);
});
