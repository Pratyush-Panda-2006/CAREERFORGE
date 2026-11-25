import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceTrieEngine } from './trie-search.js';

test('NeurotechInterfaceTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new NeurotechInterfaceTrieEngine(value), TypeError);
  }
});

test('NeurotechInterfaceTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new NeurotechInterfaceTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('NeurotechInterfaceTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new NeurotechInterfaceTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
