import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeFilterEngine } from './filter-engine.js';

const mockEstates = [
  {
    id: 'e-1',
    title: 'The Bel-Air Promontory',
    location: 'Bel Air, California',
    propertyType: 'Modern Villa',
    price: 42500000,
    bedrooms: 7,
    bathrooms: 9,
    sqft: 14200,
    tags: ['pool', 'helipad', 'ocean-view']
  },
  {
    id: 'e-2',
    title: 'Tribeca Sky Penthouse',
    location: 'New York, NY',
    propertyType: 'Penthouse',
    price: 28000000,
    bedrooms: 4,
    bathrooms: 5,
    sqft: 6800,
    tags: ['skyline', 'terrace', 'elevator']
  },
  {
    id: 'e-3',
    title: 'St. Moritz Alpine Chalet',
    location: 'St. Moritz, Switzerland',
    propertyType: 'Chalet',
    price: 35000000,
    bedrooms: 6,
    bathrooms: 7,
    sqft: 9500,
    tags: ['ski-in', 'mountain-view', 'spa']
  },
  {
    id: 'e-4',
    title: 'Villa d\'Azur Waterfront',
    location: 'Cap d\'Antibes, France',
    propertyType: 'Waterfront Estate',
    price: 54000000,
    bedrooms: 8,
    bathrooms: 10,
    sqft: 16000,
    tags: ['ocean-view', 'private-dock', 'pool']
  }
];

test('RealEstateLuxeFilterEngine initializes and returns full dataset', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'e-3'); // Alphabetical by title: 'St. Moritz...'
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });

  // Match title
  const r1 = engine.filterByKeyword('bel-air');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'e-1');

  // Match location
  const r2 = engine.filterByKeyword('FRANCE');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, 'e-4');

  // Match property type
  const r3 = engine.filterByKeyword('penthouse');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 'e-2');

  // Match tag
  const r4 = engine.filterByKeyword('pool');
  assert.equal(r4.length, 2);

  // Non-matching query
  const r5 = engine.filterByKeyword('nonexistent-property');
  assert.equal(r5.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });

  // Filter single tag: 'pool' -> 2 estates (e-1, e-4)
  engine.toggleTag('pool');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'private-dock' -> only e-4 has both 'pool' and 'private-dock'
  engine.toggleTag('private-dock');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'e-4');

  // Toggle off 'pool' -> matches estates with 'private-dock'
  engine.toggleTag('pool');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });

  // Numeric descending by price
  engine.sort('price', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].price, 54000000);
  assert.equal(sorted[sorted.length - 1].price, 28000000);

  // Numeric ascending by price
  engine.sort('price', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].price, 28000000);
  assert.equal(sorted[sorted.length - 1].price, 54000000);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'Villa d\'Azur Waterfront');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });

  engine.filterByKeyword('chalet');
  engine.toggleTag('ski-in');
  engine.sort('price', 'desc');

  assert.equal(engine.apply().length, 1);

  engine.reset();
  const res = engine.apply();
  const filters = engine.getActiveFilters();

  assert.equal(res.length, 4);
  assert.equal(filters.keyword, '');
  assert.equal(filters.tags.length, 0);
  assert.equal(filters.sortField, 'title');
  assert.equal(filters.sortDirection, 'asc');
});

test('getAllTags returns frequency count and sorted tag list', () => {
  const engine = new RealEstateLuxeFilterEngine({ data: mockEstates });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const poolTag = tags.find(t => t.tag === 'pool');
  assert.ok(poolTag);
  assert.equal(poolTag.count, 2);
});
