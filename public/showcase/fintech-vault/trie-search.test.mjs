import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultTrieEngine } from './trie-search.js';

test('FintechVaultTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new FintechVaultTrieEngine(value), TypeError);
  }
});

test('FintechVaultTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new FintechVaultTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('FintechVaultTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new FintechVaultTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
