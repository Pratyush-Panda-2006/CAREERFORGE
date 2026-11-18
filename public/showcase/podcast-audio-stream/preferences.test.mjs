import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamPreferenceManager } from './preferences.js';

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

test('PodcastAudioStreamPreferenceManager loads default fallback values when storage is empty', () => {
  const mockStorage = createMockStorage();
  const manager = new PodcastAudioStreamPreferenceManager({ storage: mockStorage });
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.viewLayout, 'grid');
  assert.equal(prefs.soundCues, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.metricUnits, 'metric');
  assert.equal(prefs.audioVolume, 80);
  assert.equal(prefs.playbackSpeed, 1.0);
  assert.equal(prefs.skipSilence, true);
  assert.equal(prefs.autoPlayNext, true);
});

test('PodcastAudioStreamPreferenceManager save(key, val) updates in-memory preference and persists into storage', () => {
  const mockStorage = createMockStorage();
  const manager = new PodcastAudioStreamPreferenceManager({ storage: mockStorage });

  const s1 = manager.save('soundCues', true);
  const s2 = manager.save('highContrast', true);
  const s3 = manager.save('viewLayout', 'timeline');
  const s4 = manager.save('playbackSpeed', 1.5);

  assert.equal(s1, true);
  assert.equal(s2, true);
  assert.equal(s3, true);
  assert.equal(s4, true);

  assert.equal(manager.get('soundCues'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('viewLayout'), 'timeline');
  assert.equal(manager.get('playbackSpeed'), 1.5);

  const raw = JSON.parse(mockStorage.getItem(PodcastAudioStreamPreferenceManager.STORAGE_KEY));
  assert.equal(raw.soundCues, true);
  assert.equal(raw.highContrast, true);
  assert.equal(raw.viewLayout, 'timeline');
  assert.equal(raw.playbackSpeed, 1.5);
});

test('PodcastAudioStreamPreferenceManager resetDefaults restores initial settings and clears custom storage item', () => {
  const mockStorage = createMockStorage({
    [PodcastAudioStreamPreferenceManager.STORAGE_KEY]: JSON.stringify({ soundCues: true, theme: 'light' })
  });
  const manager = new PodcastAudioStreamPreferenceManager({ storage: mockStorage });
  manager.resetDefaults();

  assert.equal(manager.get('soundCues'), false);
  assert.equal(manager.get('theme'), 'dark');
});

test('PodcastAudioStreamPreferenceManager exportJSON returns structured schema string', () => {
  const manager = new PodcastAudioStreamPreferenceManager();
  const json = manager.exportJSON();
  const parsed = JSON.parse(json);

  assert.equal(parsed.schemaVersion, '1.0');
  assert.equal(parsed.system, 'podcast-audio-stream');
  assert.ok(parsed.preferences);
});
