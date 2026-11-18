import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioPreferenceManager } from './preferences.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('AiVoiceStudioPreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'studio-dark');
  assert.equal(prefs.viewLayout, 'waveform');
  assert.equal(prefs.sampleRate, 48000);
  assert.equal(prefs.outputFormat, 'wav');
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.autoNormalize, true);
  assert.equal(prefs.latencyMode, 'ultra-low');
});

test('AiVoiceStudioPreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });

  manager.save('sampleRate', 96000);
  manager.save('outputFormat', 'flac');
  manager.save('highContrast', true);

  assert.equal(manager.get('sampleRate'), 96000);
  assert.equal(manager.get('outputFormat'), 'flac');
  assert.equal(manager.get('highContrast'), true);

  // Reload from storage
  const reloaded = new AiVoiceStudioPreferenceManager({ storage });
  assert.equal(reloaded.get('sampleRate'), 96000);
  assert.equal(reloaded.get('outputFormat'), 'flac');
  assert.equal(reloaded.get('highContrast'), true);
  assert.equal(reloaded.get('theme'), 'studio-dark');
});

test('AiVoiceStudioPreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });

  manager.save('theme', 'neon-synth');
  manager.save('sampleRate', 192000);
  assert.equal(manager.get('theme'), 'neon-synth');
  assert.equal(manager.get('sampleRate'), 192000);

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'studio-dark');
  assert.equal(manager.get('sampleRate'), 48000);

  const reloaded = new AiVoiceStudioPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'studio-dark');
  assert.equal(reloaded.get('sampleRate'), 48000);
});

test('AiVoiceStudioPreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });
  manager.save('latencyMode', 'standard');

  const jsonString = manager.exportJSON(true);
  const parsed = JSON.parse(jsonString);

  assert.equal(parsed.schema, 'ai_voice_studio_preferences');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.latencyMode, 'standard');
  assert.equal(parsed.preferences.sampleRate, 48000);
});

test('AiVoiceStudioPreferenceManager - importJSON successfully restores exported preferences', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });

  const payload = {
    schema: 'ai_voice_studio_preferences',
    preferences: {
      theme: 'cyber-analog',
      viewLayout: 'multitrack',
      sampleRate: 44100,
      outputFormat: 'mp3'
    }
  };

  const success = manager.importJSON(JSON.stringify(payload));
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'cyber-analog');
  assert.equal(manager.get('viewLayout'), 'multitrack');
  assert.equal(manager.get('sampleRate'), 44100);
  assert.equal(manager.get('outputFormat'), 'mp3');
  assert.equal(manager.get('latencyMode'), 'ultra-low'); // untouched default preserved
});

test('AiVoiceStudioPreferenceManager - subscribe notifies listeners when preferences are updated', () => {
  const storage = new MockStorage();
  const manager = new AiVoiceStudioPreferenceManager({ storage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('soundCues', false);
  manager.save('sampleRate', 96000);

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], { key: 'soundCues', val: false });
  assert.deepEqual(events[1], { key: 'sampleRate', val: 96000 });

  unsubscribe();
  manager.save('soundCues', true);
  assert.equal(events.length, 2); // Unsubscribed, no extra events
});
