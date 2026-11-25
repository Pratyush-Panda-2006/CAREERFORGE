import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioTrieEngine } from './trie-search.js';

test('AgencyStudioTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new AgencyStudioTrieEngine(value), TypeError);
  }
});

test('AgencyStudioTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new AgencyStudioTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('AgencyStudioTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new AgencyStudioTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
