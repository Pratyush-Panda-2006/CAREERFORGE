import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayLruCache } from './lru-cache.js';

test('DroneDeliverySkywayLruCache - stores and retrieves values in O(1)', () => {
  const cache = new DroneDeliverySkywayLruCache(3);
  cache.put('drone-1', 'telemetry-1');
  cache.put('drone-2', 'telemetry-2');

  assert.equal(cache.get('drone-1'), 'telemetry-1');
  assert.equal(cache.get('drone-2'), 'telemetry-2');
  assert.equal(cache.get('drone-3'), null);
});

test('DroneDeliverySkywayLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new DroneDeliverySkywayLruCache(3);
  cache.put('d1', 'data1');
  cache.put('d2', 'data2');
  cache.put('d3', 'data3');

  // Currently order: d3 (MRU), d2, d1 (LRU)
  // Access 'd1' -> 'd1' becomes MRU
  cache.get('d1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'd1');
  assert.equal(ordered[1].key, 'd3');
  assert.equal(ordered[2].key, 'd2');
});

test('DroneDeliverySkywayLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new DroneDeliverySkywayLruCache(2);
  cache.put('route-1', 'waypoint-a');
  cache.put('route-2', 'waypoint-b');
  // Cache full with [route-2, route-1]. Now add route-3 -> route-1 should be evicted!
  cache.put('route-3', 'waypoint-c');

  assert.equal(cache.get('route-1'), null);
  assert.equal(cache.get('route-2'), 'waypoint-b');
  assert.equal(cache.get('route-3'), 'waypoint-c');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'route-1');
  assert.equal(evicted[0].value, 'waypoint-a');
});

test('DroneDeliverySkywayLruCache - update existing key refreshes value and promotes to MRU without increasing size', () => {
  const cache = new DroneDeliverySkywayLruCache(2);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');
  cache.put('k1', 'val1-updated');

  assert.equal(cache.get('k1'), 'val1-updated');
  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].key, 'k1');
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('DroneDeliverySkywayLruCache - clear resets cache and evicted entries', () => {
  const cache = new DroneDeliverySkywayLruCache(2);
  cache.put('x', '10');
  cache.clear();

  assert.equal(cache.get('x'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});
