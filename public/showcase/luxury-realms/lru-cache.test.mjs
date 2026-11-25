import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsLruCache } from './lru-cache.js';

test('LuxuryRealmsLruCache - stores and retrieves values in O(1)', () => {
  const cache = new LuxuryRealmsLruCache(3);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');

  assert.equal(cache.get('k1'), 'val1');
  assert.equal(cache.get('k2'), 'val2');
  assert.equal(cache.get('unknown'), null);
});

test('LuxuryRealmsLruCache - throws RangeError on non-positive capacity', () => {
  assert.throws(() => new LuxuryRealmsLruCache(0), RangeError);
  assert.throws(() => new LuxuryRealmsLruCache(-5), RangeError);
});

test('LuxuryRealmsLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new LuxuryRealmsLruCache(3);
  cache.put('c1', 'data1');
  cache.put('c2', 'data2');
  cache.put('c3', 'data3');

  cache.get('c1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'c1');
  assert.equal(ordered[1].key, 'c3');
  assert.equal(ordered[2].key, 'c2');
});

test('LuxuryRealmsLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new LuxuryRealmsLruCache(2);
  cache.put('item1', 'content1');
  cache.put('item2', 'content2');
  cache.put('item3', 'content3');

  assert.equal(cache.get('item1'), null);
  assert.equal(cache.get('item2'), 'content2');
  assert.equal(cache.get('item3'), 'content3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'item1');
});

test('LuxuryRealmsLruCache - clear resets cache and evicted entries', () => {
  const cache = new LuxuryRealmsLruCache(2);
  cache.put('test', '123');
  cache.clear();

  assert.equal(cache.get('test'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
});
