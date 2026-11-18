import test from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroFilterEngine } from './filter-engine.js';

const mockDishes = [
  {
    id: 'm-1',
    title: 'Wagyu Ribeye Steak',
    category: 'Main Course',
    course: 'Entree',
    price: 70.0,
    rating: 4.9,
    tags: ['beef', 'wagyu', 'gluten-free']
  },
  {
    id: 'm-2',
    title: 'Truffle Gnocchi',
    category: 'Pasta',
    course: 'Entree',
    price: 32.0,
    rating: 4.8,
    tags: ['pasta', 'truffle', 'vegetarian']
  },
  {
    id: 'm-3',
    title: 'Hokkaido Scallops',
    category: 'Seafood',
    course: 'Appetizer',
    price: 26.0,
    rating: 4.7,
    tags: ['seafood', 'gluten-free']
  },
  {
    id: 'm-4',
    title: 'Chocolate Mousse',
    category: 'Dessert',
    course: 'Dessert',
    price: 18.0,
    rating: 4.9,
    tags: ['dessert', 'chocolate', 'vegetarian']
  }
];

test('CulinaryBistroFilterEngine initializes and returns full dataset', () => {
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'm-4'); // Alphabetically 'Chocolate...'
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });

  // Match title
  const r1 = engine.filterByKeyword('wagyu');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'm-1');

  // Match category
  const r2 = engine.filterByKeyword('VEGETARIAN');
  assert.equal(r2.length, 2);

  // Match tag
  const r3 = engine.filterByKeyword('gluten-free');
  assert.equal(r3.length, 2);

  // Non-matching query
  const r4 = engine.filterByKeyword('nonexistent-ingredient');
  assert.equal(r4.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });

  // Filter single tag: 'vegetarian' -> 2 dishes (m-2, m-4)
  engine.toggleTag('vegetarian');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'chocolate' -> only m-4 has both 'vegetarian' and 'chocolate'
  engine.toggleTag('chocolate');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'm-4');

  // Toggle off 'vegetarian' -> matches dishes with 'chocolate'
  engine.toggleTag('vegetarian');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });

  // Numeric descending by price
  engine.sort('price', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].price, 70.0);
  assert.equal(sorted[sorted.length - 1].price, 18.0);

  // Numeric ascending by price
  engine.sort('price', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].price, 18.0);
  assert.equal(sorted[sorted.length - 1].price, 70.0);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'Wagyu Ribeye Steak');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });

  engine.filterByKeyword('scallops');
  engine.toggleTag('seafood');
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
  const engine = new CulinaryBistroFilterEngine({ data: mockDishes });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const vegTag = tags.find(t => t.tag === 'vegetarian');
  assert.ok(vegTag);
  assert.equal(vegTag.count, 2);
});
