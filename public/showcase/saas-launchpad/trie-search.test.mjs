import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadTrieEngine } from './trie-search.js';

test('SaasLaunchpadTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new SaasLaunchpadTrieEngine(value), TypeError);
  }
});

test('SaasLaunchpadTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new SaasLaunchpadTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('SaasLaunchpadTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new SaasLaunchpadTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
