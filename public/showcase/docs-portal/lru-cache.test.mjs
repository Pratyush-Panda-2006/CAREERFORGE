import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalLruCache } from './lru-cache.js';

test('DocsPortalLruCache - stores and retrieves values in O(1)', () => {
  const cache = new DocsPortalLruCache(3);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');

  assert.equal(cache.get('k1'), 'val1');
  assert.equal(cache.get('k2'), 'val2');
  assert.equal(cache.get('unknown'), null);
});

test('DocsPortalLruCache - throws RangeError on non-positive capacity', () => {
  assert.throws(() => new DocsPortalLruCache(0), RangeError);
  assert.throws(() => new DocsPortalLruCache(-5), RangeError);
});

test('DocsPortalLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new DocsPortalLruCache(3);
  cache.put('c1', 'data1');
  cache.put('c2', 'data2');
  cache.put('c3', 'data3');

  cache.get('c1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'c1');
  assert.equal(ordered[1].key, 'c3');
  assert.equal(ordered[2].key, 'c2');
});

test('DocsPortalLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new DocsPortalLruCache(2);
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

test('DocsPortalLruCache - clear resets cache and evicted entries', () => {
  const cache = new DocsPortalLruCache(2);
  cache.put('test', '123');
  cache.clear();

  assert.equal(cache.get('test'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
});

test('DocsPortalLruCache - eviction log entries have correct shape', () => {
  const cache = new DocsPortalLruCache(1);
  cache.put('first', 'val1');
  cache.put('second', 'val2');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  const entry = evicted[0];
  assert.equal(typeof entry.key, 'string');
  assert.equal(typeof entry.value, 'string');
  assert.equal(typeof entry.timestamp, 'number');
  assert.ok(entry.timestamp > 0);
});

test('DocsPortalLruCache - multiple evictions in order', () => {
  const cache = new DocsPortalLruCache(2);
  cache.put('a', '1');
  cache.put('b', '2');
  cache.put('c', '3'); // evicts 'a'
  cache.put('d', '4'); // evicts 'b'

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 2);
  // 'a' was evicted first, then 'b'
  assert.equal(evicted[0].key, 'a');
  assert.equal(evicted[1].key, 'b');
});

test('DocsPortalLruCache - getOrderedEntries respects recency', () => {
  const cache = new DocsPortalLruCache(5);
  cache.put('first', '1');
  cache.put('second', '2');
  cache.put('third', '3');

  // Access 'first' to promote it to MRU
  cache.get('first');

  const ordered = cache.getOrderedEntries();
  // 'first' should be at the head (most recently used)
  assert.equal(ordered[0].key, 'first');
  // 'second' should be at the tail (least recently used among the three,
  // since accessing 'first' shifts 'second' to LRU position)
  assert.equal(ordered[ordered.length - 1].key, 'second');
});

test('DocsPortalLruCache - capacity of 1 behaves correctly', () => {
  const cache = new DocsPortalLruCache(1);
  cache.put('only', 'first');
  assert.equal(cache.get('only'), 'first');

  cache.put('new', 'second');
  // 'only' should be evicted
  assert.equal(cache.get('only'), null);
  assert.equal(cache.get('new'), 'second');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0].key, 'new');
});

test('DocsPortalLruCache - event dispatching on cache operations', () => {
  const cache = new DocsPortalLruCache(2);
  const events = [];

  cache._eventTarget.addEventListener('cache:hit', (e) => events.push(e));
  cache._eventTarget.addEventListener('cache:miss', (e) => events.push(e));
  cache._eventTarget.addEventListener('cache:insert', (e) => events.push(e));
  cache._eventTarget.addEventListener('cache:evict', (e) => events.push(e));
  cache._eventTarget.addEventListener('cache:update', (e) => events.push(e));
  cache._eventTarget.addEventListener('cache:clear', (e) => events.push(e));

  cache.put('a', '1');
  cache.get('a');
  cache.put('b', '2');
  cache.get('c'); // miss
  cache.put('c', '3');

  assert.ok(events.some(e => e.type === 'cache:insert'));
  assert.ok(events.some(e => e.type === 'cache:hit'));
  assert.ok(events.some(e => e.type === 'cache:miss'));
});

test('DocsPortalLruCache - updates existing key without eviction', () => {
  const cache = new DocsPortalLruCache(2);
  cache.put('a', 'valA');
  cache.put('b', 'valB');
  cache.put('a', 'valA_updated');

  // 'a' was already present, so no eviction should occur
  assert.equal(cache.getOrderedEntries().length, 2);
  // 'a' should now be MRU (head), 'b' should be LRU (tail.prev)
  assert.equal(cache.getOrderedEntries()[0].key, 'a');
  assert.equal(cache.getOrderedEntries()[1].key, 'b');

  assert.equal(cache.get('a'), 'valA_updated');
  assert.equal(cache.get('b'), 'valB');
});