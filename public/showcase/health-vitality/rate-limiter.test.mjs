import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityTokenBucketRateLimiter as Limiter } from './rate-limiter.js';

function fixture(options = {}) { let time = 0; return { limiter: new Limiter({ clock: () => time, ...options }), set: value => { time = value; } }; }
test('initial burst exhausts exactly and never goes negative', () => {
  const { limiter: l } = fixture();
  for (let i = 0; i < 10; i++) assert.equal(l.tryConsume(), true);
  assert.equal(l.tryConsume(), false); assert.equal(l.getAvailableTokens(), 0);
});
test('fractional elapsed refill and idle clamp conserve capacity', () => {
  const { limiter: l, set } = fixture(); l.tryConsume(10); set(125);
  assert.equal(l.getAvailableTokens(), .25); assert.equal(l.tryConsume(.25), true);
  set(625); assert.equal(l.getAvailableTokens(), 1); set(100000); assert.equal(l.getAvailableTokens(), 10);
});
test('backward clocks cannot double-refill and invalid clocks fail', () => {
  const { limiter: l, set } = fixture(); l.tryConsume(10); set(1000); assert.equal(l.getAvailableTokens(), 2);
  set(500); assert.equal(l.getAvailableTokens(), 2); set(1000); assert.equal(l.getAvailableTokens(), 2);
  set(1500); assert.equal(l.getAvailableTokens(), 3); set(NaN); assert.throws(() => l.refill(), TypeError);
});
test('configuration rejects invalid and unbounded values', () => {
  for (const capacity of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new Limiter({ capacity }));
  for (const refillPerSecond of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new Limiter({ refillPerSecond }));
  for (const maxConcurrent of [0, 1.5, 21, NaN]) assert.throws(() => new Limiter({ maxConcurrent }));
  for (const maxQueue of [0, 1.5, 101]) assert.throws(() => new Limiter({ maxQueue }));
  assert.throws(() => new Limiter({ clock: 1 })); assert.throws(() => new Limiter({ clock: () => NaN }));
});
test('invalid consumption never spends a token', () => {
  const { limiter: l } = fixture();
  for (const n of [0, -1, 11, NaN, Infinity, '1']) assert.throws(() => l.tryConsume(n));
  assert.equal(l.getAvailableTokens(), 10);
});
test('priority wins and FIFO breaks ties, with concurrency bounded', () => {
  const { limiter: l } = fixture({ maxConcurrent: 2 });
  l.enqueue({ id: 'low' }); l.enqueue({ id: 'high1', priority: 9 }); l.enqueue({ id: 'high2', priority: 9 });
  assert.deepEqual(l.tick().started.map(x => x.id), ['high1', 'high2']);
  assert.equal(l.snapshot().active.length, 2); assert.deepEqual(l.snapshot().queue.map(x => x.id), ['low']);
  assert.equal(l.tick().started.length, 0);
});
test('jobs complete at exact boundary and queued work starts once', () => {
  const { limiter: l, set } = fixture({ maxConcurrent: 1 });
  l.enqueue({ id: 'first', durationMs: 800 }); l.enqueue({ id: 'next' }); l.tick();
  set(799); assert.equal(l.tick().completed.length, 0); set(800);
  assert.deepEqual(l.tick().completed.map(x => x.id), ['first']);
  assert.deepEqual(l.snapshot().active.map(x => x.id), ['next']); assert.equal(l.snapshot().metrics.accepted, 2);
  assert.equal(l.tick().started.length, 0);
});
test('token exhaustion waits for sufficient refill', () => {
  const { limiter: l, set } = fixture({ capacity: 1, refillPerSecond: 1 });
  l.enqueue({ id: 'one', durationMs: 0 }); l.enqueue({ id: 'two' });
  assert.equal(l.tick().started.length, 1); set(999); assert.equal(l.tick().started.length, 0);
  set(1000); assert.deepEqual(l.tick().started.map(x => x.id), ['two']);
});
test('strict priority head is not bypassed by cheaper jobs', () => {
  const { limiter: l, set } = fixture(); l.tryConsume(9);
  l.enqueue({ id: 'costly', priority: 9, tokens: 3 }); l.enqueue({ id: 'cheap', tokens: 1 });
  assert.equal(l.tick().started.length, 0); set(1000);
  assert.deepEqual(l.tick().started.map(x => x.id), ['costly']);
});
test('queue cap rejects without evicting or exceeding the bound', () => {
  const { limiter: l } = fixture({ maxQueue: 2 });
  assert.equal(l.enqueue({ id: 'a' }), true); assert.equal(l.enqueue({ id: 'b' }), true);
  assert.equal(l.enqueue({ id: 'c' }), false); assert.equal(l.snapshot().queue.length, 2);
  assert.equal(l.snapshot().metrics.throttled, 1);
});
test('cancel only waiting work, without refunding running tokens', () => {
  const { limiter: l } = fixture({ maxConcurrent: 1 }); l.enqueue({ id: 'running' }); l.enqueue({ id: 'waiting' }); l.tick();
  assert.equal(l.cancel('waiting'), true); assert.equal(l.cancel('waiting'), false); assert.equal(l.cancel('running'), false);
  assert.equal(l.getAvailableTokens(), 9); assert.equal(l.snapshot().metrics.cancelled, 1);
});
test('invalid jobs and duplicate IDs cannot corrupt queue or metrics', () => {
  const { limiter: l } = fixture();
  for (const args of [{}, { id: '' }, { id: 'x'.repeat(65) }, { id: 'a', priority: 10 }, { id: 'a', priority: 1.5 }, { id: 'a', tokens: 11 }, { id: 'a', durationMs: -1 }, { id: 'a', durationMs: Infinity }]) assert.throws(() => l.enqueue(args));
  l.enqueue({ id: 'a' }); assert.throws(() => l.enqueue({ id: 'a' })); l.tick(); assert.throws(() => l.enqueue({ id: 'a' }));
  assert.equal(l.snapshot().metrics.accepted, 1); assert.equal(l.snapshot().queue.length, 0);
});
test('snapshots and tick results cannot mutate retained jobs', () => {
  const { limiter: l } = fixture(); l.enqueue({ id: 'a' }); const snap = l.snapshot(); snap.queue[0].tokens = 100;
  snap.metrics.accepted = 100; const result = l.tick(); result.started[0].id = 'changed';
  assert.equal(l.snapshot().active[0].id, 'a'); assert.equal(l.snapshot().metrics.accepted, 1);
});
test('extended flood stays within concurrency, queue and token conservation bounds', () => {
  const { limiter: l, set } = fixture({ capacity: 7, refillPerSecond: 3, maxConcurrent: 2 });
  for (let n = 0; n < 100; n++) l.enqueue({ id: String(n), priority: n % 10, tokens: 1, durationMs: 150 });
  for (let time = 0; time <= 40000; time += 50) {
    set(time); l.tick(); const s = l.snapshot(); assert(s.available >= 0 && s.available <= 7);
    assert(s.active.length <= 2); assert(s.queue.length <= 100); assert(s.metrics.accepted <= 7 + time * .003);
  }
  assert.equal(l.snapshot().metrics.completed, 100); assert.equal(l.snapshot().queue.length, 0);
});
