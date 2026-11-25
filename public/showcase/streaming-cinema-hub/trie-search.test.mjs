import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubTrieEngine } from './trie-search.js';

test('StreamingCinemaHubTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new StreamingCinemaHubTrieEngine(value), TypeError);
  }
});

test('StreamingCinemaHubTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new StreamingCinemaHubTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('StreamingCinemaHubTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new StreamingCinemaHubTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
