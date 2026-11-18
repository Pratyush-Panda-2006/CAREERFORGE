import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsPreferenceManager } from './preferences.js';

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

test('LuxuryRealmsPreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'obsidian-gold');
  assert.equal(prefs.currency, 'USD');
  assert.equal(prefs.viewLayout, 'gallery-grid');
  assert.equal(prefs.metricsUnit, 'sqft');
  assert.equal(prefs.ambientSoundCues, true);
  assert.equal(prefs.highContrastMode, false);
  assert.equal(prefs.hapticFeedback, true);
  assert.equal(prefs.autoSaveDrafts, true);
  assert.equal(prefs.confidentialTier, 'vip');
  assert.equal(prefs.animationSpeed, 'refined');
});

test('LuxuryRealmsPreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });

  manager.save('currency', 'EUR');
  manager.save('theme', 'platinum-noir');
  manager.save('metricsUnit', 'sqm');

  assert.equal(manager.get('currency'), 'EUR');
  assert.equal(manager.get('theme'), 'platinum-noir');
  assert.equal(manager.get('metricsUnit'), 'sqm');

  // Verify reload from storage
  const reloaded = new LuxuryRealmsPreferenceManager({ storage });
  assert.equal(reloaded.get('currency'), 'EUR');
  assert.equal(reloaded.get('theme'), 'platinum-noir');
  assert.equal(reloaded.get('metricsUnit'), 'sqm');
  assert.equal(reloaded.get('viewLayout'), 'gallery-grid');
});

test('LuxuryRealmsPreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });

  manager.save('theme', 'emerald-estate');
  manager.save('currency', 'CHF');
  assert.equal(manager.get('theme'), 'emerald-estate');
  assert.equal(manager.get('currency'), 'CHF');

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'obsidian-gold');
  assert.equal(manager.get('currency'), 'USD');

  const reloaded = new LuxuryRealmsPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'obsidian-gold');
  assert.equal(reloaded.get('currency'), 'USD');
});

test('LuxuryRealmsPreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });
  manager.save('currency', 'AED');

  const jsonStr = manager.exportJSON();
  assert.ok(typeof jsonStr === 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'Luxury Realms Portfolio');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.currency, 'AED');
  assert.equal(parsed.preferences.theme, 'obsidian-gold');
});

test('LuxuryRealmsPreferenceManager - importJSON restores state from exported JSON string', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });

  const customConfig = {
    app: 'Luxury Realms Portfolio',
    version: '1.0.0',
    preferences: {
      theme: 'monaco-azure',
      currency: 'GBP',
      viewLayout: 'editorial-masonry',
      metricsUnit: 'sqm',
      confidentialTier: 'sovereign'
    }
  };

  manager.importJSON(JSON.stringify(customConfig));
  assert.equal(manager.get('theme'), 'monaco-azure');
  assert.equal(manager.get('currency'), 'GBP');
  assert.equal(manager.get('viewLayout'), 'editorial-masonry');
  assert.equal(manager.get('metricsUnit'), 'sqm');
  assert.equal(manager.get('confidentialTier'), 'sovereign');

  // Reload verification
  const reloaded = new LuxuryRealmsPreferenceManager({ storage });
  assert.equal(reloaded.get('currency'), 'GBP');
  assert.equal(reloaded.get('theme'), 'monaco-azure');
});

test('LuxuryRealmsPreferenceManager - subscribe notifies listeners on save and reset', () => {
  const storage = new MockStorage();
  const manager = new LuxuryRealmsPreferenceManager({ storage });

  const notifications = [];
  const unsubscribe = manager.subscribe((key, val) => {
    notifications.push({ key, val });
  });

  manager.save('currency', 'EUR');
  manager.resetDefaults();

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].key, 'currency');
  assert.equal(notifications[0].val, 'EUR');
  assert.equal(notifications[1].key, '__reset__');

  unsubscribe();
  manager.save('currency', 'USD');
  assert.equal(notifications.length, 2);
});
