import test from 'node:test';
import assert from 'node:assert/strict';
import './queue-logic.js';
const create = () => new globalThis.EpisodeQueue({ '142': { duration: 2880 }, '141': { duration: 3240 } });
test('queue starts empty and tracks both episode durations', () => {
  const queue = create(); assert.equal(queue.next(), null); assert.equal(queue.seconds(), 0);
  queue.add('142'); queue.add('141'); assert.equal(queue.seconds(), 6120);
});
test('reorder preserves stable identity and next follows revised sequence', () => {
  const queue = create(); queue.add('142'); queue.add('141'); const key = queue.items[1].key;
  assert.equal(queue.move(key, -1), true); assert.equal(queue.next(), '141'); assert.equal(queue.next(), '142'); assert.equal(queue.next(), null);
});
test('duplicate episodes have distinct keys and removing one keeps the other', () => {
  const queue = create(); queue.add('142'); queue.add('142');
  assert.notEqual(queue.items[0].key, queue.items[1].key); queue.remove(queue.items[0].key);
  assert.equal(queue.items.length, 1); assert.equal(queue.seconds(), 2880);
});
test('invalid ids and out-of-range operations cannot mutate the queue', () => {
  const queue = create(); assert.equal(queue.add('__proto__'), false); assert.equal(queue.add('999'), false);
  queue.add('141'); const key = queue.items[0].key;
  for (const direction of [-1, 1, 0, 4]) assert.equal(queue.move(key, direction), false);
  assert.equal(queue.remove(-1), false); assert.equal(queue.move(-1, 1), false); assert.equal(queue.next(), '141');
});
test('queue caps at 50 entries and clear resets duration without reusing keys', () => {
  const queue = create(); for (let i = 0; i < 50; i++) assert.equal(queue.add('141'), true);
  assert.equal(queue.add('142'), false); assert.equal(queue.seconds(), 162000);
  const last = queue.items.at(-1).key; queue.clear(); assert.equal(queue.seconds(), 0);
  queue.add('142'); assert.ok(queue.items[0].key > last);
});
