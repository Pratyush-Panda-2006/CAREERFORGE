import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsTrieEngine } from './trie-search.js';

test('initial terms require an explicit array', () => {
  for (const value of [null, 'text', {}, 1]) assert.throws(() => new SupplyChainLogisticsTrieEngine(value), TypeError);
});

test('prefix traversal preserves complete words and deterministic order', () => {
  const engine = new SupplyChainLogisticsTrieEngine(['Synapse', 'Cortex', 'Neural', 'Neuron']);
  assert.deepEqual(engine.findWordsWithPrefix(' neu '), ['Neural', 'Neuron']);
  assert.deepEqual(engine.findWordsWithPrefix('syn'), ['Synapse']);
  assert.deepEqual(engine.findWordsWithPrefix('unknown'), []);
});

test('duplicates are case-insensitive and do not consume capacity', () => {
  const engine = new SupplyChainLogisticsTrieEngine(['Axon']);
  assert.equal(engine.insert(' AXON '), false);
  assert.equal(engine.size, 1);
  assert.deepEqual(engine.findWordsWithPrefix('ax'), ['Axon']);
});

test('fuzzy matching implements insertion, deletion, substitution and exact distance', () => {
  const engine = new SupplyChainLogisticsTrieEngine(['Plasticity', 'Dendrite', 'Receptor']);
  assert.deepEqual(engine.fuzzySearch('dendrit', 1), [{ word: 'Dendrite', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('receptr', 1), [{ word: 'Receptor', distance: 1 }]);
  assert.deepEqual(engine.fuzzySearch('zzzzz', 1), []);
});
