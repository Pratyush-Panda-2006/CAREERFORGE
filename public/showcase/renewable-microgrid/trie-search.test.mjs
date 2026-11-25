import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridTrieEngine } from './trie-search.js';

test('RenewableMicrogridTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new RenewableMicrogridTrieEngine(value), TypeError);
  }
});

test('RenewableMicrogridTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new RenewableMicrogridTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('RenewableMicrogridTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new RenewableMicrogridTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
