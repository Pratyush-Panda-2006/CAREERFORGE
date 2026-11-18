import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/ecommerce-store/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } },
      documentElement: { setAttribute: () => {} }
    },
    window: {},
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
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
  return context;
}

const SAMPLE_ITEMS = [
  { id: '1', name: 'CyberDeck Pro Mechanical', category: 'keyboards', tags: ['wireless', 'rgb', 'pro'], price: 249.00, rating: 4.9 },
  { id: '2', name: 'Acoustic Pulse ANC Headset', category: 'audio', tags: ['bluetooth', 'anc', 'wireless'], price: 199.00, rating: 4.7 },
  { id: '3', name: 'Horizon 32" Curved OLED', category: 'displays', tags: ['oled', '4k', 'hdr'], price: 899.00, rating: 4.8 },
  { id: '4', name: 'Nexus Neo 65% Low-Profile', category: 'keyboards', tags: ['compact', 'rgb', 'mechanical'], price: 149.00, rating: 4.5 },
  { id: '5', name: 'Vortex Studio Monitors', category: 'audio', tags: ['wired', 'studio', 'pro'], price: 349.00, rating: 4.6 }
];

test('EcommerceStoreFilterEngine initializes with items and default state', () => {
  const ctx = loadContext();
  const FilterEngine = ctx.EcommerceStoreFilterEngine;
  assert.equal(typeof FilterEngine, 'function');

  const engine = new FilterEngine(SAMPLE_ITEMS);
  assert.equal(engine.getFilteredItems().length, 5);
  assert.equal(JSON.stringify(engine.getActiveTags()), JSON.stringify([]));
});

test('filterByKeyword performs case-insensitive substring searching', () => {
  const ctx = loadContext();
  const engine = new ctx.EcommerceStoreFilterEngine(SAMPLE_ITEMS);

  engine.filterByKeyword('cyber');
  let results = engine.getFilteredItems();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'CyberDeck Pro Mechanical');

  engine.filterByKeyword('AUDIO');
  results = engine.getFilteredItems();
  assert.equal(results.length, 2);

  engine.filterByKeyword('');
  assert.equal(engine.getFilteredItems().length, 5);
});

test('toggleTag handles compound tag filtering across items', () => {
  const ctx = loadContext();
  const engine = new ctx.EcommerceStoreFilterEngine(SAMPLE_ITEMS);

  // Single tag filter: wireless (keyboard + headset)
  engine.toggleTag('wireless');
  assert.equal(engine.getFilteredItems().length, 2);

  // Compound tag filter: wireless + rgb (only keyboard)
  engine.toggleTag('rgb');
  let results = engine.getFilteredItems();
  assert.equal(results.length, 1);
  assert.equal(results[0].id, '1');

  // Toggle off rgb
  engine.toggleTag('rgb');
  assert.equal(engine.getFilteredItems().length, 2);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.getFilteredItems().length, 5);
});

test('sort orders items accurately ascending and descending by multiple attributes', () => {
  const ctx = loadContext();
  const engine = new ctx.EcommerceStoreFilterEngine(SAMPLE_ITEMS);

  // Sort by price ascending
  engine.sort('price', 'asc');
  let prices = engine.getFilteredItems().map(it => it.price);
  assert.equal(JSON.stringify(prices), JSON.stringify([149.00, 199.00, 249.00, 349.00, 899.00]));

  // Sort by price descending
  engine.sort('price', 'desc');
  prices = engine.getFilteredItems().map(it => it.price);
  assert.equal(JSON.stringify(prices), JSON.stringify([899.00, 349.00, 249.00, 199.00, 149.00]));

  // Sort by rating descending
  engine.sort('rating', 'desc');
  const ratings = engine.getFilteredItems().map(it => it.rating);
  assert.equal(JSON.stringify(ratings), JSON.stringify([4.9, 4.8, 4.7, 4.6, 4.5]));
});

test('combined search keyword, tag filtering, and sorting work seamlessly together', () => {
  const ctx = loadContext();
  const engine = new ctx.EcommerceStoreFilterEngine(SAMPLE_ITEMS);

  engine.toggleTag('pro');
  engine.filterByKeyword('keyboard');
  engine.sort('price', 'asc');

  const results = engine.getFilteredItems();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'CyberDeck Pro Mechanical');

  engine.reset();
  assert.equal(engine.getFilteredItems().length, 5);
  assert.equal(JSON.stringify(engine.getActiveTags()), JSON.stringify([]));
});
