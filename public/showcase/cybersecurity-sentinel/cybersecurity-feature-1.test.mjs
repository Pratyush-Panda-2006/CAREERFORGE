import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelPreferenceManager } from './preferences.js';

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

test('CybersecuritySentinelPreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'cyber-terminal');
  assert.equal(prefs.viewLayout, 'threat-matrix');
  assert.equal(prefs.alertSeverityThreshold, 'medium');
  assert.equal(prefs.pollingInterval, 15);
  assert.equal(prefs.soundCues, true);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.autoMitigation, false);
  assert.equal(prefs.logDensity, 'detailed');
});

test('CybersecuritySentinelPreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });

  manager.save('alertSeverityThreshold', 'critical');
  manager.save('pollingInterval', 5);
  manager.save('autoMitigation', true);

  assert.equal(manager.get('alertSeverityThreshold'), 'critical');
  assert.equal(manager.get('pollingInterval'), 5);
  assert.equal(manager.get('autoMitigation'), true);

  // Reload from storage
  const reloaded = new CybersecuritySentinelPreferenceManager({ storage });
  assert.equal(reloaded.get('alertSeverityThreshold'), 'critical');
  assert.equal(reloaded.get('pollingInterval'), 5);
  assert.equal(reloaded.get('autoMitigation'), true);
  assert.equal(reloaded.get('theme'), 'cyber-terminal');
});

test('CybersecuritySentinelPreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });

  manager.save('theme', 'matrix-green');
  manager.save('pollingInterval', 60);
  assert.equal(manager.get('theme'), 'matrix-green');
  assert.equal(manager.get('pollingInterval'), 60);

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'cyber-terminal');
  assert.equal(manager.get('pollingInterval'), 15);

  const reloaded = new CybersecuritySentinelPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'cyber-terminal');
  assert.equal(reloaded.get('pollingInterval'), 15);
});

test('CybersecuritySentinelPreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });
  manager.save('viewLayout', 'compact-audit');

  const jsonString = manager.exportJSON(true);
  const parsed = JSON.parse(jsonString);

  assert.equal(parsed.schema, 'cybersecurity_sentinel_preferences');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.viewLayout, 'compact-audit');
  assert.equal(parsed.preferences.theme, 'cyber-terminal');
});

test('CybersecuritySentinelPreferenceManager - importJSON successfully restores exported preferences', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });

  const payload = {
    schema: 'cybersecurity_sentinel_preferences',
    preferences: {
      theme: 'neon-red-alert',
      viewLayout: 'siem-stream',
      alertSeverityThreshold: 'high',
      pollingInterval: 10
    }
  };

  const success = manager.importJSON(JSON.stringify(payload));
  assert.equal(success, true);
  assert.equal(manager.get('theme'), 'neon-red-alert');
  assert.equal(manager.get('viewLayout'), 'siem-stream');
  assert.equal(manager.get('alertSeverityThreshold'), 'high');
  assert.equal(manager.get('pollingInterval'), 10);
  assert.equal(manager.get('autoMitigation'), false); // untouched default preserved
});

test('CybersecuritySentinelPreferenceManager - subscribe notifies listeners when preferences are updated', () => {
  const storage = new MockStorage();
  const manager = new CybersecuritySentinelPreferenceManager({ storage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('soundCues', false);
  manager.save('autoMitigation', true);

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], { key: 'soundCues', val: false });
  assert.deepEqual(events[1], { key: 'autoMitigation', val: true });

  unsubscribe();
  manager.save('soundCues', true);
  assert.equal(events.length, 2); // Unsubscribed
});
