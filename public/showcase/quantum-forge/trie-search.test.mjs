import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeTrieEngine } from './trie-search.js';

test('QuantumForgeTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new QuantumForgeTrieEngine(value), TypeError);
  }
});

test('QuantumForgeTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new QuantumForgeTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('QuantumForgeTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new QuantumForgeTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
