import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingBloomFilter as Filter } from './bloom-filter.js';

test('empty filter rules out queries with zero theoretical probability', () => {
  const filter = new Filter();
  assert.equal(filter.contains('agritech'), false);
  assert.equal(filter.calculateFalsePositiveRate(), 0);
  assert.equal(filter.snapshot().setBits, 0);
});
test('all inserted corpus members survive collisions without false negatives', () => {
  const filter = new Filter(1024, 5);
  const corpus = Array.from({ length: 350 }, (_, i) => `agri:${i}:crop`);
  corpus.forEach(item => filter.insert(item));
  for (const item of corpus) assert.equal(filter.contains(item), true, item);
});
test('duplicate inserts reuse positions without clearing bits', () => {
  const filter = new Filter(64, 8);
  const first = filter.insert('same'), before = filter.snapshot();
  const second = filter.insert('same');
  assert.deepEqual(second.positions, first.positions);
  assert.deepEqual(second.collisions, first.positions);
  assert.deepEqual(filter.snapshot().bits, before.bits);
  assert.equal(filter.snapshot().insertions, 2);
});
test('hash positions are bounded and distinct for every supported hash count', () => {
  for (const size of [64, 128, 256, 4096]) for (let hashes = 1; hashes <= 8; hashes++) {
    const positions = new Filter(size, hashes).positions('crop / agritech');
    assert.equal(new Set(positions).size, hashes);
    assert.ok(positions.every(bit => Number.isInteger(bit) && bit >= 0 && bit < size));
  }
});
test('UTF-8 strings preserve case, whitespace and canonical form', () => {
  const filter = new Filter(4096);
  for (const item of ['é', 'e\u0301', ' crop ', 'crop', 'CROP', '🌾']) filter.insert(item);
  for (const item of ['é', 'e\u0301', ' crop ', 'crop', 'CROP', '🌾']) assert.equal(filter.contains(item), true);
  assert.notDeepEqual(filter.positions('crop'), filter.positions('CROP'));
  assert.notDeepEqual(filter.positions('é'), filter.positions('e\u0301'));
});
test('invalid inserts and probes leave the entire state intact', () => {
  const filter = new Filter(); filter.insert('keep'); const before = filter.snapshot();
  for (const value of ['', null, undefined, 7, [], {}, 'a'.repeat(257), 'é'.repeat(129)]) {
    assert.throws(() => filter.insert(value)); assert.throws(() => filter.contains(value));
    assert.deepEqual(filter.snapshot(), before);
  }
});
test('configuration is validated and cannot be changed after construction', () => {
  for (const size of [0, 63, 65, 8192, '256', 128.5]) assert.throws(() => new Filter(size));
  for (const count of [0, 9, 1.5, '4']) assert.throws(() => new Filter(256, count));
  const filter = new Filter();
  assert.throws(() => { filter.bitSize = 64; });
  assert.throws(() => Object.defineProperty(filter, 'hashCount', { value: 1 }));
});
test('snapshot and diagnostic arrays cannot corrupt internal membership', () => {
  const filter = new Filter(), result = filter.insert('safe'), snapshot = filter.snapshot();
  result.positions.fill(999); result.collisions.push(2); snapshot.bits.fill(0);
  assert.equal(filter.contains('safe'), true);
  assert.equal(filter.snapshot().setBits, 4);
});
test('32 insertions match an independently calculated probability reference', () => {
  const filter = new Filter(256, 4);
  for (let i = 0; i < 32; i++) filter.insert(`item-${i}`);
  assert.ok(Math.abs(filter.calculateFalsePositiveRate() - 0.023968650821013612) < 1e-12);
});
test('probability rises monotonically through saturation and remains finite', () => {
  const filter = new Filter(64, 8); let previous = 0;
  for (let i = 0; i < 1000; i++) {
    filter.insert(`key-${i}`); const rate = filter.calculateFalsePositiveRate();
    assert.ok(Number.isFinite(rate) && rate >= previous && rate <= 1); previous = rate;
  }
  assert.equal(filter.snapshot().setBits, 64);
});
test('deterministic absent-query corpus has fewer than 3 percent false positives', () => {
  const filter = new Filter(1024, 4);
  for (let i = 0; i < 64; i++) filter.insert(`inserted-${i}`);
  let positives = 0;
  for (let i = 0; i < 10000; i++) positives += Number(filter.contains(`absent-${i}`));
  assert.ok(positives < 300, `observed ${positives}/10000`);
});
test('independent sequential-key corpus has no empty or overloaded first-hash bucket', () => {
  const filter = new Filter(256), buckets = new Array(256).fill(0);
  for (let i = 0; i < 8192; i++) buckets[filter.positions(`distribution-${i}`)[0]]++;
  assert.ok(Math.min(...buckets) > 10);
  assert.ok(Math.max(...buckets) < 65);
});
test('bounded insertion count rejects overflow without mutating state', () => {
  const filter = new Filter(64, 1);
  for (let i = 0; i < 10000; i++) filter.insert('repeat');
  const before = filter.snapshot(); assert.throws(() => filter.insert('overflow'));
  assert.deepEqual(filter.snapshot(), before);
});
