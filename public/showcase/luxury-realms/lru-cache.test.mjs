import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsLruCache } from './lru-cache.js';

test('LuxuryRealmsLruCache - stores and retrieves values in O(1)', () => {
  const cache = new LuxuryRealmsLruCache(3);
  cache.put('estate-1', 'villa-a');
  cache.put('estate-2', 'penthouse-b');

  assert.equal(cache.get('estate-1'), 'villa-a');
  assert.equal(cache.get('estate-2'), 'penthouse-b');
  assert.equal(cache.get('estate-3'), null);
});

test('LuxuryRealmsLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new LuxuryRealmsLruCache(3);
  cache.put('e1', 'data1');
  cache.put('e2', 'data2');
  cache.put('e3', 'data3');

  // Order: e3 (MRU), e2, e1 (LRU)
  // Access 'e1' -> 'e1' becomes MRU
  cache.get('e1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'e1');
  assert.equal(ordered[1].key, 'e3');
  assert.equal(ordered[2].key, 'e2');
});

test('LuxuryRealmsLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new LuxuryRealmsLruCache(2);
  cache.put('estate-alpha', 'price1');
  cache.put('estate-beta', 'price2');
  // Cache full with [estate-beta, estate-alpha]. Adding estate-gamma evicts estate-alpha!
  cache.put('estate-gamma', 'price3');

  assert.equal(cache.get('estate-alpha'), null);
  assert.equal(cache.get('estate-beta'), 'price2');
  assert.equal(cache.get('estate-gamma'), 'price3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'estate-alpha');
  assert.equal(evicted[0].value, 'price1');
});

test('LuxuryRealmsLruCache - update existing key refreshes value and promotes to MRU without increasing size', () => {
  const cache = new LuxuryRealmsLruCache(2);
  cache.put('e1', 'val1');
  cache.put('e2', 'val2');
  cache.put('e1', 'val1-updated');

  assert.equal(cache.get('e1'), 'val1-updated');
  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].key, 'e1');
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('LuxuryRealmsLruCache - clear resets cache and evicted entries', () => {
  const cache = new LuxuryRealmsLruCache(2);
  cache.put('prop1', '$10M');
  cache.clear();

  assert.equal(cache.get('prop1'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});
