import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamTokenBucketRateLimiter } from './rate-limiter.js';

function fixture(options = {}) {
  let time = 0;
  return {
    limiter: new PodcastAudioStreamTokenBucketRateLimiter({ clock: () => time, ...options }),
    set: value => { time = value; }
  };
}

test('PodcastAudioStreamTokenBucketRateLimiter - initial burst exhausts exactly and never goes negative', () => {
  const { limiter: l } = fixture();
  for (let i = 0; i < 10; i++) assert.equal(l.tryConsume(), true);
  assert.equal(l.tryConsume(), false);
  assert.equal(l.getAvailableTokens(), 0);
});

test('PodcastAudioStreamTokenBucketRateLimiter - fractional elapsed refill and idle clamp conserve capacity', () => {
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

test('PodcastAudioStreamTokenBucketRateLimiter - configuration rejects invalid and unbounded values', () => {
  for (const capacity of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ capacity }));
  for (const refillPerSecond of [0, -1, NaN, Infinity, 1001]) assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ refillPerSecond }));
  for (const maxConcurrent of [0, 1.5, 21, NaN]) assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ maxConcurrent }));
  for (const maxQueue of [0, 1.5, 101]) assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ maxQueue }));
});

test('PodcastAudioStreamTokenBucketRateLimiter - priority wins and FIFO breaks ties with concurrency bounded', () => {
  const { limiter: l } = fixture({ maxConcurrent: 2 });
  l.enqueue({ id: 'podcast-stream' });
  l.enqueue({ id: 'live-stream-1', priority: 9 });
  l.enqueue({ id: 'live-stream-2', priority: 9 });
  assert.deepEqual(l.tick().started.map(x => x.id), ['live-stream-1', 'live-stream-2']);
  assert.equal(l.snapshot().active.length, 2);
  assert.deepEqual(l.snapshot().queue.map(x => x.id), ['podcast-stream']);
  assert.equal(l.tick().started.length, 0);
});

test('PodcastAudioStreamTokenBucketRateLimiter - token exhaustion waits for sufficient refill before admission', () => {
  const { limiter: l, set } = fixture({ capacity: 1, refillPerSecond: 1 });
  l.enqueue({ id: 'chunk-1', durationMs: 0 });
  l.enqueue({ id: 'chunk-2' });
  assert.equal(l.tick().started.length, 1);
  set(999);
  assert.equal(l.tick().started.length, 0);
  set(1000);
  assert.deepEqual(l.tick().started.map(x => x.id), ['chunk-2']);
});
