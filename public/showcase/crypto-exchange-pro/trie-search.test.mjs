import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProTrieEngine } from './trie-search.js';

test('CryptoExchangeProTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new CryptoExchangeProTrieEngine(value), TypeError);
  }
});

test('CryptoExchangeProTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new CryptoExchangeProTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('CryptoExchangeProTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new CryptoExchangeProTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
