import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamFilterEngine } from './filter-engine.js';

const mockEpisodes = [
  { id: '1', name: 'Alpha Episode', description: 'Primary broadcast', rating: 4.8, popularity: 1200, tags: ['core', 'v1'] },
  { id: '2', name: 'Beta Show', description: 'Secondary episode', rating: 4.2, popularity: 3400, tags: ['audio', 'v1'] },
  { id: '3', name: 'Gamma Podcast', description: 'Special edition', rating: 4.9, popularity: 980, tags: ['core', 'interview'] }
];

test('PodcastAudioStreamFilterEngine - returns all items by default', () => {
  const engine = new PodcastAudioStreamFilterEngine({ data: mockEpisodes });
  const results = engine.apply();
  assert.equal(results.length, 3);
});

test('PodcastAudioStreamFilterEngine - filterByKeyword performs case-insensitive matching', () => {
  const engine = new PodcastAudioStreamFilterEngine({ data: mockEpisodes });
  const res = engine.filterByKeyword('ALPHA');
  assert.equal(res.length, 1);
  assert.equal(res[0].id, '1');
});

test('PodcastAudioStreamFilterEngine - toggleTag applies compound tag filter', () => {
  const engine = new PodcastAudioStreamFilterEngine({ data: mockEpisodes });
  engine.toggleTag('core');
  assert.equal(engine.apply().length, 2);

  engine.toggleTag('v1');
  assert.equal(engine.apply().length, 1);
  assert.equal(engine.apply()[0].id, '1');
});

test('PodcastAudioStreamFilterEngine - sorts correctly ascending and descending', () => {
  const engine = new PodcastAudioStreamFilterEngine({ data: mockEpisodes });
  engine.sort('popularity', 'desc');
  const res = engine.apply();
  assert.equal(res[0].id, '2'); // 3400
  assert.equal(res[2].id, '3'); // 980
});
