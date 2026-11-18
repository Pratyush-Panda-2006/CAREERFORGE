import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioFilterEngine } from './filter-engine.js';

const mockProjects = [
  {
    id: 'p-1',
    title: 'Rust WebAssembly Parser',
    category: 'Compilers',
    description: 'High performance AST generator',
    language: 'Rust',
    stars: 2400,
    tags: ['rust', 'wasm', 'compiler']
  },
  {
    id: 'p-2',
    title: 'Go Microservice Template',
    category: 'Backend',
    description: 'gRPC production starter',
    language: 'Go',
    stars: 850,
    tags: ['go', 'grpc', 'backend']
  },
  {
    id: 'p-3',
    title: 'TypeScript Design System',
    category: 'Frontend',
    description: 'Accessible UI component library',
    language: 'TypeScript',
    stars: 3100,
    tags: ['typescript', 'frontend', 'ui']
  },
  {
    id: 'p-4',
    title: 'Rust Distributed Cache',
    category: 'Distributed Systems',
    description: 'In-memory key-value cache engine',
    language: 'Rust',
    stars: 1200,
    tags: ['rust', 'distributed', 'cache']
  }
];

test('DeveloperPortfolioFilterEngine initializes and returns full dataset', () => {
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'p-2'); // Sorted by title 'Go...' alphabetically
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });

  // Match title
  const r1 = engine.filterByKeyword('parser');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'p-1');

  // Match category
  const r2 = engine.filterByKeyword('FRONTEND');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, 'p-3');

  // Match tag / language
  const r3 = engine.filterByKeyword('rust');
  assert.equal(r3.length, 2);

  // Non-matching query
  const r4 = engine.filterByKeyword('nonexistent-keyword-query');
  assert.equal(r4.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });

  // Filter single tag: 'rust' -> 2 projects
  engine.toggleTag('rust');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'wasm' -> only p-1 has both 'rust' and 'wasm'
  engine.toggleTag('wasm');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'p-1');

  // Toggle off 'rust' -> matches all projects with 'wasm'
  engine.toggleTag('rust');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });

  // Numeric descending by stars
  engine.sort('stars', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].stars, 3100);
  assert.equal(sorted[sorted.length - 1].stars, 850);

  // Numeric ascending by stars
  engine.sort('stars', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].stars, 850);
  assert.equal(sorted[sorted.length - 1].stars, 3100);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'TypeScript Design System');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });

  engine.filterByKeyword('cache');
  engine.toggleTag('distributed');
  engine.sort('stars', 'desc');

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
  const engine = new DeveloperPortfolioFilterEngine({ data: mockProjects });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const rustTag = tags.find(t => t.tag === 'rust');
  assert.ok(rustTag);
  assert.equal(rustTag.count, 2);
});
