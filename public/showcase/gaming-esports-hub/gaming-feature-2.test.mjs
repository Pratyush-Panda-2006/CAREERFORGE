import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubFilterEngine } from './filter-engine.js';

const mockTournaments = [
  {
    id: 't-1',
    title: 'VCT Champions Final',
    game: 'Valorant',
    tier: 'S-Tier',
    prizePool: 2250000,
    viewers: 1450000,
    tags: ['valorant', 'fps', 'grand-final']
  },
  {
    id: 't-2',
    title: 'Worlds Semifinals',
    game: 'League of Legends',
    tier: 'S-Tier',
    prizePool: 3500000,
    viewers: 2800000,
    tags: ['moba', 'riot', 'championship']
  },
  {
    id: 't-3',
    title: 'Major Antwerp Decider',
    game: 'CS2',
    tier: 'A-Tier',
    prizePool: 1250000,
    viewers: 890000,
    tags: ['fps', 'counter-strike', 'lan']
  },
  {
    id: 't-4',
    title: 'The International Finals',
    game: 'Dota 2',
    tier: 'S-Tier',
    prizePool: 18000000,
    viewers: 1100000,
    tags: ['moba', 'valve', 'championship']
  }
];

test('GamingEsportsHubFilterEngine initializes and returns full dataset', () => {
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });
  const results = engine.apply();

  assert.equal(results.length, 4);
  assert.equal(results[0].id, 't-3'); // Alphabetical by title: 'Major Antwerp...'
});

test('filterByKeyword matches case-insensitively across fields', () => {
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });

  // Match title
  const r1 = engine.filterByKeyword('vct');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 't-1');

  // Match game
  const r2 = engine.filterByKeyword('LEAGUE');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].id, 't-2');

  // Match tier
  const r3 = engine.filterByKeyword('a-tier');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 't-3');

  // Match tag
  const r4 = engine.filterByKeyword('fps');
  assert.equal(r4.length, 2);

  // Non-matching query
  const r5 = engine.filterByKeyword('nonexistent-game');
  assert.equal(r5.length, 0);
});

test('toggleTag supports compound tag filtering criteria', () => {
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });

  // Filter single tag: 'moba' -> 2 tournaments (t-2, t-4)
  engine.toggleTag('moba');
  let filtered = engine.apply();
  assert.equal(filtered.length, 2);

  // Add second compound tag: 'riot' -> only t-2 has both 'moba' and 'riot'
  engine.toggleTag('riot');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 't-2');

  // Toggle off 'moba' -> matches tournaments with 'riot'
  engine.toggleTag('moba');
  filtered = engine.apply();
  assert.equal(filtered.length, 1);

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 4);
});

test('sort orders numerically and alphabetically ascending/descending', () => {
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });

  // Numeric descending by prizePool
  engine.sort('prizePool', 'desc');
  let sorted = engine.apply();
  assert.equal(sorted[0].prizePool, 18000000);
  assert.equal(sorted[sorted.length - 1].prizePool, 1250000);

  // Numeric ascending by prizePool
  engine.sort('prizePool', 'asc');
  sorted = engine.apply();
  assert.equal(sorted[0].prizePool, 1250000);
  assert.equal(sorted[sorted.length - 1].prizePool, 18000000);

  // Alphabetical descending by title
  engine.sort('title', 'desc');
  sorted = engine.apply();
  assert.equal(sorted[0].title, 'Worlds Semifinals');
});

test('reset restores initial search keyword, tags, and default sort', () => {
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });

  engine.filterByKeyword('valorant');
  engine.toggleTag('fps');
  engine.sort('prizePool', 'desc');

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
  const engine = new GamingEsportsHubFilterEngine({ data: mockTournaments });
  const tags = engine.getAllTags();

  assert.ok(tags.length > 0);
  const fpsTag = tags.find(t => t.tag === 'fps');
  assert.ok(fpsTag);
  assert.equal(fpsTag.count, 2);
});
