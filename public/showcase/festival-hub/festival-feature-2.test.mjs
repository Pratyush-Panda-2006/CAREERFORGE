import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubFilterEngine } from './filter-engine.js';

const mockFestivalItems = [
  {
    id: 'act-1',
    name: 'Aurora Resonance',
    genre: 'Synthwave',
    stage: 'Neon Apex',
    rating: 4.9,
    popularity: 12500,
    tags: ['electronic', 'night', 'headliner']
  },
  {
    id: 'act-2',
    name: 'Solar Flute Ensemble',
    genre: 'Acoustic',
    stage: 'Meadow Pavilion',
    rating: 4.6,
    popularity: 3400,
    tags: ['acoustic', 'live', 'daytime']
  },
  {
    id: 'act-3',
    name: 'Sub-Bass Odyssey',
    genre: 'Bass Music',
    stage: 'Bass Vault',
    rating: 4.8,
    popularity: 9800,
    tags: ['electronic', 'bass', 'night']
  },
  {
    id: 'act-4',
    name: 'Celestial Choirs',
    genre: 'Ambient',
    stage: 'Skyline Sanctum',
    rating: 4.7,
    popularity: 5100,
    tags: ['ambient', 'live']
  }
];

test('FestivalHubFilterEngine initializes and returns all items by default', () => {
  const engine = new FestivalHubFilterEngine({ data: mockFestivalItems });
  const results = engine.apply();
  assert.equal(results.length, 4);
});

test('filterByKeyword performs case-insensitive matching across name, stage, and genre', () => {
  const engine = new FestivalHubFilterEngine({ data: mockFestivalItems });

  const r1 = engine.filterByKeyword('aurora');
  assert.equal(r1.length, 1);
  assert.equal(r1[0].id, 'act-1');

  const r2 = engine.filterByKeyword('MEADOW');
  assert.equal(r2.length, 1);
  assert.equal(r2[0].name, 'Solar Flute Ensemble');

  const r3 = engine.filterByKeyword('ambient');
  assert.equal(r3.length, 1);
  assert.equal(r3[0].id, 'act-4');

  const rEmpty = engine.filterByKeyword('nonexistent-band');
  assert.equal(rEmpty.length, 0);
});

test('toggleTag supports compound AND tag filtering', () => {
  const engine = new FestivalHubFilterEngine({ data: mockFestivalItems });

  engine.toggleTag('electronic');
  let results = engine.apply();
  assert.equal(results.length, 2); // Aurora Resonance, Sub-Bass Odyssey

  engine.toggleTag('headliner');
  results = engine.apply();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Aurora Resonance');

  // Untoggle headliner
  engine.toggleTag('headliner');
  results = engine.apply();
  assert.equal(results.length, 2);
});

test('sort organizes items ascending and descending with numerical precision', () => {
  const engine = new FestivalHubFilterEngine({ data: mockFestivalItems });

  // Popularity descending (Highest to lowest)
  const byPop = engine.sort('popularity', 'desc');
  assert.equal(byPop[0].name, 'Aurora Resonance'); // 12500
  assert.equal(byPop[byPop.length - 1].name, 'Solar Flute Ensemble'); // 3400

  // Name ascending
  const byName = engine.sort('name', 'asc');
  assert.equal(byName[0].name, 'Aurora Resonance');
  assert.equal(byName[byName.length - 1].name, 'Sub-Bass Odyssey');

  // Rating descending
  const byRating = engine.sort('rating', 'desc');
  assert.equal(byRating[0].rating, 4.9);
  assert.equal(byRating[1].rating, 4.8);
});

test('reset restores clean search state and tag filters', () => {
  const engine = new FestivalHubFilterEngine({ data: mockFestivalItems });
  engine.filterByKeyword('aurora');
  engine.toggleTag('night');
  engine.sort('rating', 'desc');

  assert.equal(engine.apply().length, 1);

  const resetResults = engine.reset();
  assert.equal(resetResults.length, 4);

  const state = engine.getActiveState();
  assert.equal(state.keyword, '');
  assert.equal(state.tags.length, 0);
  assert.equal(state.sortField, 'name');
});
