import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/ecommerce-store/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function createMockStorage() {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    _store: store
  };
}

function loadContext(mockStorage = createMockStorage()) {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    localStorage: mockStorage,
    console,
    Math,
    Date,
    JSON,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return { context, mockStorage };
}

test('EcommerceStorePreferenceManager initializes with default fallback values', () => {
  const { context } = loadContext();
  const Manager = context.EcommerceStorePreferenceManager;
  assert.equal(typeof Manager, 'function', 'EcommerceStorePreferenceManager must be a constructor');

  const pref = new Manager();
  const defaults = pref.getAll();

  assert.equal(defaults.theme, 'dark');
  assert.equal(defaults.layout, 'grid');
  assert.equal(defaults.soundEffects, true);
  assert.equal(defaults.highContrast, false);
  assert.equal(defaults.currency, 'USD');
  assert.equal(defaults.itemsPerPage, 12);
  assert.equal(defaults.autoSaveCart, true);
});

test('EcommerceStorePreferenceManager saves individual preference and persists to storage', () => {
  const storage = createMockStorage();
  const { context } = loadContext(storage);
  const Manager = context.EcommerceStorePreferenceManager;

  const pref1 = new Manager(storage);
  pref1.save('theme', 'light');
  pref1.save('highContrast', true);
  pref1.save('itemsPerPage', 24);

  assert.equal(pref1.get('theme'), 'light');
  assert.equal(pref1.get('highContrast'), true);
  assert.equal(pref1.get('itemsPerPage'), 24);

  // Load into a new instance from the same storage
  const pref2 = new Manager(storage);
  assert.equal(pref2.get('theme'), 'light');
  assert.equal(pref2.get('highContrast'), true);
  assert.equal(pref2.get('itemsPerPage'), 24);
  assert.equal(pref2.get('currency'), 'USD'); // unchanged default
});

test('EcommerceStorePreferenceManager resets preferences back to system defaults', () => {
  const storage = createMockStorage();
  const { context } = loadContext(storage);
  const Manager = context.EcommerceStorePreferenceManager;

  const pref = new Manager(storage);
  pref.save('layout', 'list');
  pref.save('soundEffects', false);
  assert.equal(pref.get('layout'), 'list');

  pref.resetDefaults();
  assert.equal(pref.get('layout'), 'grid');
  assert.equal(pref.get('soundEffects'), true);

  // Storage should also reflect defaults
  const prefNew = new Manager(storage);
  assert.equal(prefNew.get('layout'), 'grid');
});

test('EcommerceStorePreferenceManager exports valid JSON configuration string', () => {
  const { context } = loadContext();
  const Manager = context.EcommerceStorePreferenceManager;

  const pref = new Manager();
  pref.save('currency', 'EUR');
  pref.save('theme', 'system');

  const jsonStr = pref.exportJSON();
  assert.equal(typeof jsonStr, 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.currency, 'EUR');
  assert.equal(parsed.theme, 'system');
  assert.ok(parsed.exportedAt, 'Should include timestamp');
});

test('EcommerceStorePreferenceManager safely imports valid JSON configuration', () => {
  const storage = createMockStorage();
  const { context } = loadContext(storage);
  const Manager = context.EcommerceStorePreferenceManager;

  const pref = new Manager(storage);
  const imported = pref.importJSON(JSON.stringify({
    theme: 'light',
    layout: 'compact',
    highContrast: true
  }));

  assert.equal(imported, true);
  assert.equal(pref.get('theme'), 'light');
  assert.equal(pref.get('layout'), 'compact');
  assert.equal(pref.get('highContrast'), true);

  // Reject malformed JSON
  assert.equal(pref.importJSON('{ invalid json'), false);
});
