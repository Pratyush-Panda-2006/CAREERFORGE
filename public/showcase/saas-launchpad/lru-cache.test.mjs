import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadLruCache } from './lru-cache.js';

test('SaasLaunchpadLruCache - stores and retrieves values in O(1)', () => {
  const cache = new SaasLaunchpadLruCache(3);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');

  assert.equal(cache.get('k1'), 'val1');
  assert.equal(cache.get('k2'), 'val2');
  assert.equal(cache.get('unknown'), null);
});

test('SaasLaunchpadLruCache - throws RangeError on non-positive or invalid capacity', () => {
  assert.throws(() => new SaasLaunchpadLruCache(0), RangeError);
  assert.throws(() => new SaasLaunchpadLruCache(-5), RangeError);
  assert.throws(() => new SaasLaunchpadLruCache('invalid'), RangeError);
  assert.throws(() => new SaasLaunchpadLruCache(NaN), RangeError);
});

test('SaasLaunchpadLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new SaasLaunchpadLruCache(3);
  cache.put('c1', 'data1');
  cache.put('c2', 'data2');
  cache.put('c3', 'data3');

  // c1 was inserted first, now access it to promote to head
  const val = cache.get('c1');
  assert.equal(val, 'data1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'c1');
  assert.equal(ordered[1].key, 'c3');
  assert.equal(ordered[2].key, 'c2');
});

test('SaasLaunchpadLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new SaasLaunchpadLruCache(2);
  cache.put('item1', 'content1');
  cache.put('item2', 'content2');
  cache.put('item3', 'content3'); // overflows, item1 is evicted

  assert.equal(cache.get('item1'), null);
  assert.equal(cache.get('item2'), 'content2');
  assert.equal(cache.get('item3'), 'content3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'item1');
  assert.equal(evicted[0].value, 'content1');
  assert.ok(typeof evicted[0].timestamp === 'number');
});

test('SaasLaunchpadLruCache - clear resets cache and evicted entries', () => {
  const cache = new SaasLaunchpadLruCache(2);
  cache.put('test1', '123');
  cache.put('test2', '456');
  cache.put('test3', '789'); // evicts test1
  assert.equal(cache.getEvictedEntries().length, 1);

  cache.clear();

  assert.equal(cache.get('test2'), null);
  assert.equal(cache.get('test3'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('SaasLaunchpadLruCache - multiple evictions maintain chronological log', () => {
  const cache = new SaasLaunchpadLruCache(2);
  cache.put('a', 'alpha');
  cache.put('b', 'beta');
  cache.put('c', 'gamma'); // evicts 'a'
  cache.put('d', 'delta'); // evicts 'b'

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 2);
  assert.equal(evicted[0].key, 'a');
  assert.equal(evicted[1].key, 'b');
});

test('SaasLaunchpadLruCache - updating existing key promotes to MRU without evicting or growing', () => {
  const cache = new SaasLaunchpadLruCache(2);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');
  cache.put('k1', 'val1_updated');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].key, 'k1');
  assert.equal(ordered[0].value, 'val1_updated');
  assert.equal(ordered[1].key, 'k2');
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('SaasLaunchpadLruCache - capacity of 1 behaves correctly on sequential insertions', () => {
  const cache = new SaasLaunchpadLruCache(1);
  cache.put('single1', 'v1');
  assert.equal(cache.get('single1'), 'v1');

  cache.put('single2', 'v2');
  assert.equal(cache.get('single1'), null);
  assert.equal(cache.get('single2'), 'v2');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 1);
  assert.equal(ordered[0].key, 'single2');
});

test('SaasLaunchpadLruCache - setCapacity trims excess LRU nodes when reduced', () => {
  const cache = new SaasLaunchpadLruCache(4);
  cache.put('x', '10');
  cache.put('y', '20');
  cache.put('z', '30');

  // Reduce capacity to 2 (should evict oldest entry 'x')
  cache.setCapacity(2);
  assert.equal(cache.capacity, 2);
  assert.equal(cache.get('x'), null);
  assert.equal(cache.get('y'), '20');
  assert.equal(cache.get('z'), '30');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'x');

  assert.throws(() => cache.setCapacity(0), RangeError);
  assert.throws(() => cache.setCapacity(-2), RangeError);
});

test('SaasLaunchpadLruCache - dispatches reactive cache events', () => {
  const cache = new SaasLaunchpadLruCache(2);
  const events = [];

  cache._eventTarget.addEventListener('cache:insert', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:hit', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:miss', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:update', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:evict', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:clear', (e) => events.push(e.type));
  cache._eventTarget.addEventListener('cache:resize', (e) => events.push(e.type));

  cache.put('t1', 'v1'); // insert
  cache.get('t1'); // hit
  cache.get('missing'); // miss
  cache.put('t1', 'v1_mod'); // update
  cache.put('t2', 'v2'); // insert
  cache.put('t3', 'v3'); // evict (t1), insert (t3)
  cache.setCapacity(3); // resize
  cache.clear(); // clear

  assert.ok(events.includes('cache:insert'));
  assert.ok(events.includes('cache:hit'));
  assert.ok(events.includes('cache:miss'));
  assert.ok(events.includes('cache:update'));
  assert.ok(events.includes('cache:evict'));
  assert.ok(events.includes('cache:resize'));
  assert.ok(events.includes('cache:clear'));
});
