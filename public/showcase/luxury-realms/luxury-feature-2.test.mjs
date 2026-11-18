import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsFilterEngine } from './filter-engine.js';

test('LuxuryRealmsFilterEngine - initial execute returns full default dataset sorted by price desc', () => {
  const engine = new LuxuryRealmsFilterEngine();
  const results = engine.execute();

  assert.equal(results.length, 8);
  assert.equal(results[0].name, 'The Crown Sky Penthouse'); // $58,000,000
  assert.equal(results[results.length - 1].name, 'Kyoto Zen Pavilion'); // $15,800,000
});

test('LuxuryRealmsFilterEngine - filterByKeyword performs case-insensitive match on name, location, and category', () => {
  const engine = new LuxuryRealmsFilterEngine();

  // Match by location (Italy)
  engine.filterByKeyword('italy');
  const italyResults = engine.execute();
  assert.equal(italyResults.length, 2);
  const titles = italyResults.map(r => r.name);
  assert.ok(titles.includes('Villa Bellissima'));
  assert.ok(titles.includes('Palazzo Grand Canal'));

  // Match by category/tag
  engine.filterByKeyword('Historic');
  const historicResults = engine.execute();
  assert.equal(historicResults.length, 4);

  // Partial match
  engine.filterByKeyword('château');
  assert.equal(engine.execute().length, 1);
  assert.equal(engine.execute()[0].name, 'Château de Lumière');
});

test('LuxuryRealmsFilterEngine - toggleTag and compound tag filtering works accurately', () => {
  const engine = new LuxuryRealmsFilterEngine();

  // Filter by single tag
  engine.toggleTag('wine-cellar');
  const wineResults = engine.execute();
  assert.equal(wineResults.length, 3);

  // Add another tag for compound filtering (AND match)
  engine.toggleTag('waterfront');
  const compoundResults = engine.execute();
  assert.equal(compoundResults.length, 1);
  assert.equal(compoundResults[0].name, 'Villa Bellissima');

  // Toggle off tag
  engine.toggleTag('waterfront');
  assert.equal(engine.execute().length, 3);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.execute().length, 8);
});

test('LuxuryRealmsFilterEngine - multi-attribute sorting orders numeric and string fields ascending and descending', () => {
  const engine = new LuxuryRealmsFilterEngine();

  // Price asc
  engine.sort('price', 'asc');
  const priceAsc = engine.execute();
  assert.equal(priceAsc[0].name, 'Kyoto Zen Pavilion');
  assert.equal(priceAsc[priceAsc.length - 1].name, 'The Crown Sky Penthouse');

  // Area sqft desc
  engine.sort('areaSqft', 'desc');
  const areaDesc = engine.execute();
  assert.equal(areaDesc[0].name, 'Château de Lumière'); // 18,500 sqft

  // Name asc (alphabetical)
  engine.sort('name', 'asc');
  const nameAsc = engine.execute();
  assert.equal(nameAsc[0].name, 'Azure Horizon Sanctuary');
});

test('LuxuryRealmsFilterEngine - range filters correctly bound numeric fields', () => {
  const engine = new LuxuryRealmsFilterEngine();

  // Filter price between 20M and 40M
  engine.setRangeFilter('price', 20000000, 40000000);
  const ranged = engine.execute();
  assert.equal(ranged.length, 3);
  for (const item of ranged) {
    assert.ok(item.price >= 20000000 && item.price <= 40000000);
  }
});

test('LuxuryRealmsFilterEngine - getAvailableTags and subscribe notifications', () => {
  const engine = new LuxuryRealmsFilterEngine();
  const tags = engine.getAvailableTags();

  assert.ok(tags.includes('waterfront'));
  assert.ok(tags.includes('helipad'));
  assert.ok(tags.includes('wine-cellar'));

  let notified = false;
  const unsubscribe = engine.subscribe((results) => {
    notified = true;
    assert.ok(Array.isArray(results));
  });

  engine.filterByKeyword('Dubai');
  assert.equal(notified, true);
  unsubscribe();
});
