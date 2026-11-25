import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroTrieEngine } from './trie-search.js';

test('CulinaryBistroTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new CulinaryBistroTrieEngine(value), TypeError);
  }
});

test('CulinaryBistroTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new CulinaryBistroTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('CulinaryBistroTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new CulinaryBistroTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
