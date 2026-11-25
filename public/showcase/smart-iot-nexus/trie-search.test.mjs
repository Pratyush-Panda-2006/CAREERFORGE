import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusTrieEngine } from './trie-search.js';

test('SmartIotNexusTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new SmartIotNexusTrieEngine(value), TypeError);
  }
});

test('SmartIotNexusTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new SmartIotNexusTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('SmartIotNexusTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new SmartIotNexusTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
