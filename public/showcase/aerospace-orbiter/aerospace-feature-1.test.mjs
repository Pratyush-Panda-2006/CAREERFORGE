import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterPreferenceManager } from './preferences.js';

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

test('AerospaceOrbiterPreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'deep-space');
  assert.equal(prefs.orbitProjection, '3d-elliptical');
  assert.equal(prefs.telemetryUnits, 'metric');
  assert.equal(prefs.audioTelemetryCues, true);
  assert.equal(prefs.criticalProximityAlerts, true);
  assert.equal(prefs.highContrastDisplay, false);
  assert.equal(prefs.hapticThrusterFeedback, true);
  assert.equal(prefs.trajectoryPredictor, true);
  assert.equal(prefs.hudOverlayDensity, 'mission-critical');
  assert.equal(prefs.groundStationSyncInterval, 10);
});

test('AerospaceOrbiterPreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });

  manager.save('telemetryUnits', 'nautical');
  manager.save('theme', 'solar-amber');
  manager.save('groundStationSyncInterval', 5);

  assert.equal(manager.get('telemetryUnits'), 'nautical');
  assert.equal(manager.get('theme'), 'solar-amber');
  assert.equal(manager.get('groundStationSyncInterval'), 5);

  // Reload verification
  const reloaded = new AerospaceOrbiterPreferenceManager({ storage });
  assert.equal(reloaded.get('telemetryUnits'), 'nautical');
  assert.equal(reloaded.get('theme'), 'solar-amber');
  assert.equal(reloaded.get('groundStationSyncInterval'), 5);
  assert.equal(reloaded.get('orbitProjection'), '3d-elliptical');
});

test('AerospaceOrbiterPreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });

  manager.save('theme', 'lunar-tactical');
  manager.save('groundStationSyncInterval', 30);
  assert.equal(manager.get('theme'), 'lunar-tactical');
  assert.equal(manager.get('groundStationSyncInterval'), 30);

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'deep-space');
  assert.equal(manager.get('groundStationSyncInterval'), 10);

  const reloaded = new AerospaceOrbiterPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'deep-space');
  assert.equal(reloaded.get('groundStationSyncInterval'), 10);
});

test('AerospaceOrbiterPreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });
  manager.save('telemetryUnits', 'astronomical');

  const jsonStr = manager.exportJSON();
  assert.ok(typeof jsonStr === 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'Aerospace Orbiter Avionics Suite');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.telemetryUnits, 'astronomical');
  assert.equal(parsed.preferences.theme, 'deep-space');
});

test('AerospaceOrbiterPreferenceManager - importJSON restores state from exported JSON string', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });

  const customConfig = {
    app: 'Aerospace Orbiter Avionics Suite',
    version: '1.0.0',
    preferences: {
      theme: 'solar-amber',
      orbitProjection: 'ground-track',
      telemetryUnits: 'nautical',
      groundStationSyncInterval: 15
    }
  };

  manager.importJSON(JSON.stringify(customConfig));
  assert.equal(manager.get('theme'), 'solar-amber');
  assert.equal(manager.get('orbitProjection'), 'ground-track');
  assert.equal(manager.get('telemetryUnits'), 'nautical');
  assert.equal(manager.get('groundStationSyncInterval'), 15);

  const reloaded = new AerospaceOrbiterPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'solar-amber');
  assert.equal(reloaded.get('telemetryUnits'), 'nautical');
});

test('AerospaceOrbiterPreferenceManager - subscribe notifies listeners on save and reset', () => {
  const storage = new MockStorage();
  const manager = new AerospaceOrbiterPreferenceManager({ storage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('telemetryUnits', 'nautical');
  manager.resetDefaults();

  assert.equal(events.length, 2);
  assert.equal(events[0].key, 'telemetryUnits');
  assert.equal(events[0].val, 'nautical');
  assert.equal(events[1].key, '__reset__');

  unsubscribe();
  manager.save('telemetryUnits', 'metric');
  assert.equal(events.length, 2);
});
