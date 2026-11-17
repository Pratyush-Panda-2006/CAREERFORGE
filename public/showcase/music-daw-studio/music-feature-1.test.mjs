import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioPreferenceManager } from './preferences.js';

test('MusicDawStudioPreferenceManager - default fallback values', () => {
  const manager = new MusicDawStudioPreferenceManager('test_music_prefs');
  const prefs = manager.load();
  assert.equal(prefs.theme, 'studio-neon');
  assert.equal(prefs.sampleRateKhz, 48);
  assert.equal(prefs.bufferSizeSamples, 256);
  assert.equal(prefs.metronomeAudio, true);
  assert.equal(prefs.snapToGrid, true);
  assert.equal(prefs.latencyCompensation, true);
});

test('MusicDawStudioPreferenceManager - save and get preferences', () => {
  const manager = new MusicDawStudioPreferenceManager('test_music_save');
  manager.save('sampleRateKhz', 96);
  manager.save('bufferSizeSamples', 128);
  assert.equal(manager.get('sampleRateKhz'), 96);
  assert.equal(manager.get('bufferSizeSamples'), 128);

  // Batch object save
  manager.save({ metronomeAudio: false, midiClockOutput: true });
  assert.equal(manager.get('metronomeAudio'), false);
  assert.equal(manager.get('midiClockOutput'), true);
});

test('MusicDawStudioPreferenceManager - export and import JSON integrity', () => {
  const manager = new MusicDawStudioPreferenceManager('test_music_export');
  manager.save('sampleRateKhz', 96);
  const exported = manager.exportJSON();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.sampleRateKhz, 96);

  const manager2 = new MusicDawStudioPreferenceManager('test_music_import');
  const success = manager2.importJSON(JSON.stringify({ sampleRateKhz: 44.1, bufferSizeSamples: 512 }));
  assert.equal(success, true);
  assert.equal(manager2.get('sampleRateKhz'), 44.1);
  assert.equal(manager2.get('bufferSizeSamples'), 512);
});

test('MusicDawStudioPreferenceManager - resetDefaults restores baseline', () => {
  const manager = new MusicDawStudioPreferenceManager('test_music_reset');
  manager.save('sampleRateKhz', 96);
  manager.save('metronomeAudio', false);
  manager.resetDefaults();
  assert.equal(manager.get('sampleRateKhz'), 48);
  assert.equal(manager.get('metronomeAudio'), true);
});

test('MusicDawStudioPreferenceManager - persistence across instances with same backend', () => {
  class MockStorage {
    constructor() { this.data = new Map(); }
    getItem(k) { return this.data.get(k) || null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    removeItem(k) { this.data.delete(k); }
  }
  const sharedStorage = new MockStorage();
  const managerA = new MusicDawStudioPreferenceManager('shared_music', sharedStorage);
  managerA.save('bufferSizeSamples', 128);

  const managerB = new MusicDawStudioPreferenceManager('shared_music', sharedStorage);
  assert.equal(managerB.get('bufferSizeSamples'), 128);
});
