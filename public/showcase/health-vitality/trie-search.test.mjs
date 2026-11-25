import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityTrieEngine } from './trie-search.js';

test('HealthVitalityTrieEngine - initial terms require an explicit array', () => {
  for (const value of [null, 'ledger', {}, 1]) {
    assert.throws(() => new HealthVitalityTrieEngine(value), TypeError);
  }
});

test('HealthVitalityTrieEngine - prefix traversal preserves complete words', () => {
  const engine = new HealthVitalityTrieEngine(['Alpha', 'Alpine', 'Beta']);
  assert.deepEqual(engine.findWordsWithPrefix(' alp '), ['Alpha', 'Alpine']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('HealthVitalityTrieEngine - fuzzy matching calculates edit distance', () => {
  const engine = new HealthVitalityTrieEngine(['Health', 'Fitness']);
  assert.deepEqual(engine.fuzzySearch('helth', 1), [{ word: 'Health', distance: 1 }]);
});
