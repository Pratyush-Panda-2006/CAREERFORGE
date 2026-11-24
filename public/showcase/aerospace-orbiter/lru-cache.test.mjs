import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterLruCache } from './lru-cache.js';

test('AerospaceOrbiterLruCache - stores and retrieves values in O(1)', () => {
  const cache = new AerospaceOrbiterLruCache(3);
  cache.put('orbiter-1', 'telemetry-a');
  cache.put('orbiter-2', 'telemetry-b');

  assert.equal(cache.get('orbiter-1'), 'telemetry-a');
  assert.equal(cache.get('orbiter-2'), 'telemetry-b');
  assert.equal(cache.get('orbiter-3'), null);
});

test('AerospaceOrbiterLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new AerospaceOrbiterLruCache(3);
  cache.put('t1', 'data1');
  cache.put('t2', 'data2');
  cache.put('t3', 'data3');

  // Order: t3 (MRU), t2, t1 (LRU)
  // Access 't1' -> 't1' becomes MRU
  cache.get('t1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 't1');
  assert.equal(ordered[1].key, 't3');
  assert.equal(ordered[2].key, 't2');
});

test('AerospaceOrbiterLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new AerospaceOrbiterLruCache(2);
  cache.put('frame-alpha', 'gyro1');
  cache.put('frame-beta', 'gyro2');
  // Cache full with [frame-beta, frame-alpha]. Adding frame-gamma evicts frame-alpha!
  cache.put('frame-gamma', 'gyro3');

  assert.equal(cache.get('frame-alpha'), null);
  assert.equal(cache.get('frame-beta'), 'gyro2');
  assert.equal(cache.get('frame-gamma'), 'gyro3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'frame-alpha');
  assert.equal(evicted[0].value, 'gyro1');
});

test('AerospaceOrbiterLruCache - update existing key refreshes value and promotes to MRU without increasing size', () => {
  const cache = new AerospaceOrbiterLruCache(2);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');
  cache.put('k1', 'val1-updated');

  assert.equal(cache.get('k1'), 'val1-updated');
  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].key, 'k1');
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('AerospaceOrbiterLruCache - clear resets cache and evicted entries', () => {
  const cache = new AerospaceOrbiterLruCache(2);
  cache.put('packet-1', 'sensor');
  cache.clear();

  assert.equal(cache.get('packet-1'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});
