import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansTrieEngine } from './trie-search.js';

test('CharityMicroloansTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new CharityMicroloansTrieEngine(value), TypeError);
  }
});

test('CharityMicroloansTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new CharityMicroloansTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('CharityMicroloansTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new CharityMicroloansTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
