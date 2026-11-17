import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubFilterEngine } from './search-filter.js';

const testItems = [
  { id: 1, name: 'Cyberpunk Plaza Neo-Tokyo', realm: 'Metropolis', userCount: 1420, fps: 90, status: 'LIVE', tags: ['social', 'cyberpunk', 'popular'] },
  { id: 2, name: 'Zero-G Orbital Auditorium', realm: 'Space Station', userCount: 350, fps: 120, status: 'LIVE', tags: ['auditorium', 'event', 'zero-g'] },
  { id: 3, name: 'Ancient Zen Bamboo Forest', realm: 'Sanctuary', userCount: 88, fps: 90, status: 'IDLE', tags: ['chill', 'nature', 'meditation'] },
  { id: 4, name: 'Holographic Esports Arena', realm: 'Stadium', userCount: 2890, fps: 144, status: 'LIVE', tags: ['gaming', 'esports', 'popular'] },
  { id: 5, name: 'Quantum Art Gallery Nexus', realm: 'Museum', userCount: 210, fps: 90, status: 'LIVE', tags: ['art', 'social', 'chill'] }
];

test('Case-insensitive search by realm name and attributes', () => {
  const engine = new VrMetaverseHubFilterEngine(testItems);
  const results = engine.filterByKeyword('cyberpunk');
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Cyberpunk Plaza Neo-Tokyo');

  const zeroGResults = engine.filterByKeyword('ZERO-G');
  assert.equal(zeroGResults.length, 1);
  assert.equal(zeroGResults[0].id, 2);
});

test('Compound tag filtering narrows results matching all active tags', () => {
  const engine = new VrMetaverseHubFilterEngine(testItems);
  engine.toggleTag('social');
  let results = engine.getFilteredAndSorted();
  assert.equal(results.length, 2);

  engine.toggleTag('chill');
  results = engine.getFilteredAndSorted();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Quantum Art Gallery Nexus');

  // Untoggle tag
  engine.toggleTag('chill');
  assert.equal(engine.getFilteredAndSorted().length, 2);
});

test('Multi-column sorting handles numeric and alphabetical fields ascending and descending', () => {
  const engine = new VrMetaverseHubFilterEngine(testItems);

  // Numeric desc
  engine.sort('userCount', 'desc');
  const sortedUsersDesc = engine.getFilteredAndSorted();
  assert.equal(sortedUsersDesc[0].userCount, 2890);
  assert.equal(sortedUsersDesc[sortedUsersDesc.length - 1].userCount, 88);

  // Alphabetical asc
  engine.sort('name', 'asc');
  const sortedNameAsc = engine.getFilteredAndSorted();
  assert.equal(sortedNameAsc[0].name, 'Ancient Zen Bamboo Forest');
  assert.equal(sortedNameAsc[sortedNameAsc.length - 1].name, 'Zero-G Orbital Auditorium');
});

test('Combined keyword search, tag filtering, and sorting', () => {
  const engine = new VrMetaverseHubFilterEngine(testItems);
  engine.filterByKeyword('Arena');
  engine.toggleTag('gaming');
  engine.sort('fps', 'desc');
  const results = engine.getFilteredAndSorted();
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 4);
});

test('Reset filters restores full items list with default settings', () => {
  const engine = new VrMetaverseHubFilterEngine(testItems);
  engine.filterByKeyword('Zen');
  engine.toggleTag('chill');
  assert.equal(engine.getFilteredAndSorted().length, 1);

  const resetResults = engine.resetFilters();
  assert.equal(resetResults.length, 5);
  assert.equal(engine.getActiveTags().length, 0);
  assert.equal(engine.searchQuery, '');
});
