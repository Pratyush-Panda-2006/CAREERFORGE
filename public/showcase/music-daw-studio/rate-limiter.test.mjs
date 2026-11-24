import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioTokenBucketRateLimiter } from './rate-limiter.js';

function fixture(options = {}) {
  let time = 0;
  return {
    limiter: new MusicDawStudioTokenBucketRateLimiter({ clock: () => time, ...options }),
    set: value => { time = value; }
  };
}

test('MusicDawStudioTokenBucketRateLimiter - initial burst exhausts exactly and never goes negative', () => {
  const { limiter: l } = fixture();
  for (let i = 0; i < 10; i++) assert.equal(l.tryConsume(), true);
  assert.equal(l.tryConsume(), false);
  assert.equal(l.getAvailableTokens(), 0);
});

test('MusicDawStudioTokenBucketRateLimiter - fractional elapsed refill and idle clamp conserve capacity', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(10);
  set(125);
  assert.equal(l.getAvailableTokens(), 0.25);
  assert.equal(l.tryConsume(0.25), true);
  set(625);
  assert.equal(l.getAvailableTokens(), 1);
  set(100000);
  assert.equal(l.getAvailableTokens(), 10);
});

test('MusicDawStudioTokenBucketRateLimiter - configuration rejects invalid and unbounded values', () => {
  for (const capacity of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new MusicDawStudioTokenBucketRateLimiter({ capacity }));
  for (const refillPerSecond of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new MusicDawStudioTokenBucketRateLimiter({ refillPerSecond }));
  for (const maxConcurrent of [0, 1.5, 21, NaN]) assert.throws(() => new MusicDawStudioTokenBucketRateLimiter({ maxConcurrent }));
  for (const maxQueue of [0, 1.5, 101]) assert.throws(() => new MusicDawStudioTokenBucketRateLimiter({ maxQueue }));
});

test('MusicDawStudioTokenBucketRateLimiter - priority wins and FIFO breaks ties with concurrency bounded', () => {
  const { limiter: l } = fixture({ maxConcurrent: 2 });
  l.enqueue({ id: 'low' });
  l.enqueue({ id: 'high1', priority: 9 });
  l.enqueue({ id: 'high2', priority: 9 });
  assert.deepEqual(l.tick().started.map(x => x.id), ['high1', 'high2']);
  assert.equal(l.snapshot().active.length, 2);
  assert.deepEqual(l.snapshot().queue.map(x => x.id), ['low']);
  assert.equal(l.tick().started.length, 0);
});

test('MusicDawStudioTokenBucketRateLimiter - token exhaustion waits for sufficient refill before admission', () => {
  const { limiter: l, set } = fixture({ capacity: 1, refillPerSecond: 1 });
  l.enqueue({ id: 'voice-1', durationMs: 0 });
  l.enqueue({ id: 'voice-2' });
  assert.equal(l.tick().started.length, 1);
  set(999);
  assert.equal(l.tick().started.length, 0);
  set(1000);
  assert.deepEqual(l.tick().started.map(x => x.id), ['voice-2']);
});
