import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsLruCache } from './lru-cache.js';

test('LegalSmartContractsLruCache - stores and retrieves values in O(1)', () => {
  const cache = new LegalSmartContractsLruCache(3);
  cache.put('a', 'valA');
  cache.put('b', 'valB');

  assert.equal(cache.get('a'), 'valA');
  assert.equal(cache.get('b'), 'valB');
  assert.equal(cache.get('c'), null);
});

test('LegalSmartContractsLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new LegalSmartContractsLruCache(3);
  cache.put('a', '1');
  cache.put('b', '2');
  cache.put('c', '3');

  // Currently order: c (MRU), b, a (LRU)
  // Access 'a' -> 'a' becomes MRU
  cache.get('a');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'a');
  assert.equal(ordered[1].key, 'c');
  assert.equal(ordered[2].key, 'b');
});

test('LegalSmartContractsLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new LegalSmartContractsLruCache(2);
  cache.put('k1', 'v1');
  cache.put('k2', 'v2');
  // Cache full with [k2, k1]. Now add k3 -> k1 should be evicted!
  cache.put('k3', 'v3');

  assert.equal(cache.get('k1'), null);
  assert.equal(cache.get('k2'), 'v2');
  assert.equal(cache.get('k3'), 'v3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'k1');
  assert.equal(evicted[0].value, 'v1');
});

test('LegalSmartContractsLruCache - clear resets cache and evicted entries', () => {
  const cache = new LegalSmartContractsLruCache(2);
  cache.put('x', '10');
  cache.clear();

  assert.equal(cache.get('x'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});
