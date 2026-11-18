import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalFilterEngine } from './filter-engine.js';

const mockArticles = [
  {
    id: 'd-1',
    title: 'OAuth2 Integration Guide',
    category: 'Security',
    section: 'Guides',
    readTime: 5,
    tags: ['auth', 'security', 'oauth2']
  },
  {
    id: 'd-2',
    title: 'GraphQL API Reference',
    category: 'API',
    section: 'Reference',
    readTime: 15,
    tags: ['graphql', 'api', 'schema']
  },
  {
    id: 'd-3',
    title: 'Architecture Best Practices',
    category: 'Overview',
    section: 'Guides',
    readTime: 8,
    tags: ['architecture', 'security']
  },
  {
    id: 'd-4',
    title: 'WebAssembly Runtime Setup',
    category: 'Runtime',
    section: 'Deep Dives',
    readTime: 20,
    tags: ['wasm', 'runtime', 'rust']
  }
];

test('DocsPortalFilterEngine initializes and returns full dataset', () => {
  const engine = new DocsPortalFilterEngine({ data: mockArticles });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 'd-3'); // Alphabetically 'Architecture...'
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new DocsPortalFilterEngine({ data: mockArticles });

  // Match title
  const r1 = engine.filterByKeyword('oauth2');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'd-1');

  // Match category
  const r2 = engine.filterByKeyword('SECURITY');
  assert.equal(r2.length, 2);

  // Match tag
  const r3 = engine.filterByKeyword('wasm');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 'd-4');

  // Non-matching query
  const r4 = engine.filterByKeyword('nonexistent-term');
  assert.equal(r4.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new DocsPortalFilterEngine({ data: mockArticles });

  // Filter single tag: 'security' -> 2 articles (d-1, d-3)
  engine.toggleTag('security');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'oauth2' -> only d-1 has both 'security' and 'oauth2'
  engine.toggleTag('oauth2');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'd-1');

  // Toggle off 'security' -> matches articles with 'oauth2'
  engine.toggleTag('security');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new DocsPortalFilterEngine({ data: mockArticles });

  // Numeric descending by readTime
  engine.sort('readTime', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].readTime, 20);
  assert.equal(sorted[sorted.length - 1].readTime, 5);

  // Numeric ascending by readTime
  engine.sort('readTime', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].readTime, 5);
  assert.equal(sorted[sorted.length - 1].readTime, 20);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'WebAssembly Runtime Setup');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new DocsPortalFilterEngine({ data: mockArticles });

  engine.filterByKeyword('graphql');
  engine.toggleTag('api');
  engine.sort('readTime', 'desc');

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
  const engine = new DocsPortalFilterEngine({ data: mockArticles });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const securityTag = tags.find(t => t.tag === 'security');
  assert.ok(securityTag);
  assert.equal(securityTag.count, 2);
});
