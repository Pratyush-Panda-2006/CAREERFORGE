import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingTrieEngine } from './trie-search.js';

test('AgritechPrecisionFarmingTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new AgritechPrecisionFarmingTrieEngine(value), TypeError);
  }
});

test('AgritechPrecisionFarmingTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new AgritechPrecisionFarmingTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('AgritechPrecisionFarmingTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new AgritechPrecisionFarmingTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
