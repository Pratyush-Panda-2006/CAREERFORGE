import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProPreferenceManager } from './preferences.js';

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

test('CryptoExchangeProPreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'terminal-dark');
  assert.equal(prefs.orderBookLayout, 'dual-depth');
  assert.equal(prefs.quoteCurrency, 'USDT');
  assert.equal(prefs.orderFillSound, true);
  assert.equal(prefs.priceAlertSound, true);
  assert.equal(prefs.highContrastCandles, false);
  assert.equal(prefs.leverageWarningDialog, true);
  assert.equal(prefs.oneClickTrading, false);
  assert.equal(prefs.chartInterval, '15m');
  assert.equal(prefs.precisionDigits, 4);
});

test('CryptoExchangeProPreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });

  manager.save('quoteCurrency', 'BTC');
  manager.save('chartInterval', '1h');
  manager.save('oneClickTrading', true);

  assert.equal(manager.get('quoteCurrency'), 'BTC');
  assert.equal(manager.get('chartInterval'), '1h');
  assert.equal(manager.get('oneClickTrading'), true);

  // Reload verification
  const reloaded = new CryptoExchangeProPreferenceManager({ storage });
  assert.equal(reloaded.get('quoteCurrency'), 'BTC');
  assert.equal(reloaded.get('chartInterval'), '1h');
  assert.equal(reloaded.get('oneClickTrading'), true);
  assert.equal(reloaded.get('theme'), 'terminal-dark');
});

test('CryptoExchangeProPreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });

  manager.save('theme', 'cyber-matrix');
  manager.save('precisionDigits', 8);
  assert.equal(manager.get('theme'), 'cyber-matrix');
  assert.equal(manager.get('precisionDigits'), 8);

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'terminal-dark');
  assert.equal(manager.get('precisionDigits'), 4);

  const reloaded = new CryptoExchangeProPreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'terminal-dark');
  assert.equal(reloaded.get('precisionDigits'), 4);
});

test('CryptoExchangeProPreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });
  manager.save('quoteCurrency', 'USDC');

  const jsonStr = manager.exportJSON();
  assert.ok(typeof jsonStr === 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'Crypto Exchange Pro Terminal');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.quoteCurrency, 'USDC');
  assert.equal(parsed.preferences.theme, 'terminal-dark');
});

test('CryptoExchangeProPreferenceManager - importJSON restores state from exported JSON string', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });

  const customConfig = {
    app: 'Crypto Exchange Pro Terminal',
    version: '1.0.0',
    preferences: {
      theme: 'midnight-blue',
      quoteCurrency: 'EUR',
      chartInterval: '4h',
      oneClickTrading: true
    }
  };

  manager.importJSON(JSON.stringify(customConfig));
  assert.equal(manager.get('theme'), 'midnight-blue');
  assert.equal(manager.get('quoteCurrency'), 'EUR');
  assert.equal(manager.get('chartInterval'), '4h');
  assert.equal(manager.get('oneClickTrading'), true);

  const reloaded = new CryptoExchangeProPreferenceManager({ storage });
  assert.equal(reloaded.get('quoteCurrency'), 'EUR');
  assert.equal(reloaded.get('theme'), 'midnight-blue');
});

test('CryptoExchangeProPreferenceManager - subscribe notifies listeners on save and reset', () => {
  const storage = new MockStorage();
  const manager = new CryptoExchangeProPreferenceManager({ storage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('quoteCurrency', 'BTC');
  manager.resetDefaults();

  assert.equal(events.length, 2);
  assert.equal(events[0].key, 'quoteCurrency');
  assert.equal(events[0].val, 'BTC');
  assert.equal(events[1].key, '__reset__');

  unsubscribe();
  manager.save('quoteCurrency', 'USDT');
  assert.equal(events.length, 2);
});
