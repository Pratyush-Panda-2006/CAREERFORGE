import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreLruCache } from './lru-cache.js';

// --- O(1) Access Updates ---

test('EcommerceStoreLruCache - stores and retrieves values in O(1)', () => {
  const cache = new EcommerceStoreLruCache(3);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');

  assert.equal(cache.get('k1'), 'val1');
  assert.equal(cache.get('k2'), 'val2');
  assert.equal(cache.get('unknown'), null);
});

test('EcommerceStoreLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new EcommerceStoreLruCache(3);
  cache.put('c1', 'data1');
  cache.put('c2', 'data2');
  cache.put('c3', 'data3');

  cache.get('c1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'c1');
  assert.equal(ordered[1].key, 'c3');
  assert.equal(ordered[2].key, 'c2');
});

// --- Correct Eviction on Overflow ---

test('EcommerceStoreLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new EcommerceStoreLruCache(2);
  cache.put('item1', 'content1');
  cache.put('item2', 'content2');
  cache.put('item3', 'content3');

  assert.equal(cache.get('item1'), null);
  assert.equal(cache.get('item2'), 'content2');
  assert.equal(cache.get('item3'), 'content3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'item1');
  assert.equal(evicted[0].value, 'content1');
  assert.ok(evicted[0].timestamp > 0);
});

test('EcommerceStoreLruCache - evicts oldest when re-inserting after eviction', () => {
  const cache = new EcommerceStoreLruCache(2);
  cache.put('a', '1');
  cache.put('b', '2');
  // a is LRU initially, get('a') promotes it to MRU
  cache.get('a');
  // Now b is LRU, putting 'c' should evict b
  cache.put('c', '3');

  assert.equal(cache.get('b'), null);
  assert.equal(cache.get('a'), '1');
  assert.equal(cache.get('c'), '3');

  const evicted = cache.getEvictedEntries();
  // Only 1 eviction: 'b' from the second put
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'b');
});

// --- Cache Clear Resets ---

test('EcommerceStoreLruCache - clear resets cache and evicted entries', () => {
  const cache = new EcommerceStoreLruCache(2);
  cache.put('test', '123');
  cache.clear();

  assert.equal(cache.get('test'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
});

test('EcommerceStoreLruCache - clear then re-populate works correctly', () => {
  const cache = new EcommerceStoreLruCache(2);
  cache.put('x', '1');
  cache.put('y', '2');
  cache.clear();

  assert.equal(cache.getOrderedEntries().length, 0);

  cache.put('a', '10');
  cache.put('b', '20');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'b');
  assert.equal(ordered[1].key, 'a');
  assert.equal(cache.get('a'), '10');
  assert.equal(cache.get('b'), '20');
});

// --- Edge Cases ---

test('EcommerceStoreLruCache - handles capacity of 1', () => {
  const cache = new EcommerceStoreLruCache(1);
  cache.put('only', 'first');
  assert.equal(cache.get('only'), 'first');

  cache.put('new', 'second');
  assert.equal(cache.get('only'), null);
  assert.equal(cache.get('new'), 'second');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'only');
});

test('EcommerceStoreLruCache - updating existing key does not increase size', () => {
  const cache = new EcommerceStoreLruCache(2);
  cache.put('a', '1');
  cache.put('b', '2');
  // Update 'a' - should not change size or evict
  cache.put('a', '10');

  assert.equal(cache.getOrderedEntries().length, 2);
  assert.equal(cache.get('a'), '10');
  assert.equal(cache.get('b'), '2');

  const ordered = cache.getOrderedEntries();
  // Size should remain 2 after updating existing key
  assert.equal(ordered.length, 2);
  // Both keys should be present
  assert.ok(ordered.some(e => e.key === 'a'), 'key a should be in ordered entries');
  assert.ok(ordered.some(e => e.key === 'b'), 'key b should be in ordered entries');
});

test('EcommerceStoreLruCache - getEvictedEntries returns copies', () => {
  const cache = new EcommerceStoreLruCache(1);
  cache.put('a', '1');
  cache.put('b', '2');

  const evicted = cache.getEvictedEntries();
  evicted.push({ key: 'fake', value: 'fake' }); // should not affect internal state

  assert.equal(cache.getEvictedEntries().length, 1);
});

// --- Memory Occupancy ---

test('EcommerceStoreLruCache - getMemoryOccupancy reports correct percentage', () => {
  const cache = new EcommerceStoreLruCache(4);
  assert.equal(cache.getMemoryOccupancy(), 0);

  cache.put('a', '1');
  assert.equal(cache.getMemoryOccupancy(), 25);

  cache.put('b', '2');
  cache.put('c', '3');
  cache.put('d', '4');
  assert.equal(cache.getMemoryOccupancy(), 100);

  cache.put('e', '5'); // evicts 'a' (LRU), size stays at 4
  assert.equal(cache.getMemoryOccupancy(), 100);
});