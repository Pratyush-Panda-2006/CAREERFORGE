import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyLruCache } from './lru-cache.js';

test('EdtechAcademyLruCache - stores and retrieves values in O(1)', () => {
  const cache = new EdtechAcademyLruCache(3);
  cache.put('CS101', 'Algorithms');
  cache.put('MATH201', 'Calculus');

  assert.equal(cache.get('CS101'), 'Algorithms');
  assert.equal(cache.get('MATH201'), 'Calculus');
  assert.equal(cache.get('BIO301'), null);
});

test('EdtechAcademyLruCache - throws RangeError on non-positive capacity', () => {
  assert.throws(() => new EdtechAcademyLruCache(0), RangeError);
  assert.throws(() => new EdtechAcademyLruCache(-5), RangeError);
  assert.throws(() => new EdtechAcademyLruCache('invalid'), RangeError);
});

test('EdtechAcademyLruCache - promotes accessed key to MRU (head)', () => {
  const cache = new EdtechAcademyLruCache(3);
  cache.put('c1', 'course1');
  cache.put('c2', 'course2');
  cache.put('c3', 'course3');

  // Order before get: c3 (MRU), c2, c1 (LRU)
  cache.get('c1');

  const ordered = cache.getOrderedEntries();
  assert.equal(ordered[0].key, 'c1');
  assert.equal(ordered[1].key, 'c3');
  assert.equal(ordered[2].key, 'c2');
});

test('EdtechAcademyLruCache - evicts least recently used item upon capacity overflow', () => {
  const cache = new EdtechAcademyLruCache(2);
  cache.put('mod-alpha', 'Lecture 1');
  cache.put('mod-beta', 'Lecture 2');
  // Cache full. Adding mod-gamma evicts mod-alpha
  cache.put('mod-gamma', 'Lecture 3');

  assert.equal(cache.get('mod-alpha'), null);
  assert.equal(cache.get('mod-beta'), 'Lecture 2');
  assert.equal(cache.get('mod-gamma'), 'Lecture 3');

  const evicted = cache.getEvictedEntries();
  assert.equal(evicted.length, 1);
  assert.equal(evicted[0].key, 'mod-alpha');
  assert.equal(evicted[0].value, 'Lecture 1');
});

test('EdtechAcademyLruCache - update existing key refreshes value and promotes to MRU without increasing size', () => {
  const cache = new EdtechAcademyLruCache(2);
  cache.put('k1', 'val1');
  cache.put('k2', 'val2');
  cache.put('k1', 'val1-updated');

  assert.equal(cache.get('k1'), 'val1-updated');
  const ordered = cache.getOrderedEntries();
  assert.equal(ordered.length, 2);
  assert.equal(ordered[0].key, 'k1');
  assert.equal(cache.getEvictedEntries().length, 0);
});

test('EdtechAcademyLruCache - clear resets cache and evicted entries', () => {
  const cache = new EdtechAcademyLruCache(2);
  cache.put('lesson-1', 'content');
  cache.clear();

  assert.equal(cache.get('lesson-1'), null);
  assert.equal(cache.getOrderedEntries().length, 0);
  assert.equal(cache.getEvictedEntries().length, 0);
});
