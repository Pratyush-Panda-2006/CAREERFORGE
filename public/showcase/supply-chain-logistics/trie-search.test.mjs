import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsTrieEngine } from './trie-search.js';

test('SupplyChainLogisticsTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new SupplyChainLogisticsTrieEngine(value), TypeError);
  }
});

test('SupplyChainLogisticsTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new SupplyChainLogisticsTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('SupplyChainLogisticsTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new SupplyChainLogisticsTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
