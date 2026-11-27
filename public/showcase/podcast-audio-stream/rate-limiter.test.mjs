import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamTokenBucketRateLimiter } from './rate-limiter.js';

function fixture(options = {}) {
  let time = 0;
  const limiter = new PodcastAudioStreamTokenBucketRateLimiter({ clock: () => time, ...options });
  return {
    limiter,
    set(value) {
      time = value;
    },
    advance(ms) {
      time += ms;
    }
  };
}

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

test('initial burst spends exactly the capacity and then rejects', () => {
  const { limiter } = fixture();

  for (let index = 0; index < 10; index += 1) {
    assert.equal(limiter.tryConsume(), true);
  }

  assert.equal(limiter.tryConsume(), false);
  assert.equal(limiter.getAvailableTokens(), 0);
});

test('refill is continuous, fractional, and clamped to burst capacity', () => {
  const { limiter, set } = fixture({ capacity: 10, refillPerSecond: 2 });

  assert.equal(limiter.tryConsume(10), true);

  set(125);
  assert.equal(limiter.getAvailableTokens(), 0.25);
  assert.equal(limiter.tryConsume(0.25), true);

  set(625);
  assert.equal(limiter.getAvailableTokens(), 1);

  set(100000);
  assert.equal(limiter.getAvailableTokens(), 10);
});

test('refill rate accumulates accurately across partial intervals', () => {
  const { limiter, advance } = fixture({ capacity: 5, refillPerSecond: 10 });

  assert.equal(limiter.tryConsume(5), true);

  advance(50);
  assert.equal(limiter.getAvailableTokens(), 0.5);
  advance(50);
  assert.equal(limiter.getAvailableTokens(), 1);
  advance(50);
  assert.equal(limiter.getAvailableTokens(), 1.5);
  advance(5000);
  assert.equal(limiter.getAvailableTokens(), 5);
});

test('requests are rejected under exhaustion without spending tokens', () => {
  const { limiter, advance } = fixture({ capacity: 2, refillPerSecond: 0.5 });

  assert.equal(limiter.tryConsume(2), true);
  assert.equal(limiter.tryConsume(1), false);
  assert.equal(limiter.getAvailableTokens(), 0);

  advance(1000);
  assert.equal(limiter.getAvailableTokens(), 0.5);
  assert.equal(limiter.tryConsume(1), false);
  assert.equal(limiter.getAvailableTokens(), 0.5);

  assert.equal(limiter.tryConsume(0.5), true);
  assert.equal(limiter.getAvailableTokens(), 0);
  assert.equal(limiter.snapshot().metrics.throttled, 2);
});

test('configuration rejects invalid, non-finite, and unbounded values', () => {
  for (const capacity of [0, -1, NaN, Infinity, '10', 1001]) {
    assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ capacity }));
  }
  for (const refillPerSecond of [0, -1, NaN, Infinity, '2', 1001]) {
    assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ refillPerSecond }));
  }
  for (const maxConcurrent of [0, -1, 1.5, 21, NaN, '3']) {
    assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ maxConcurrent }));
  }
  for (const maxQueue of [0, -1, 1.5, 101, NaN, '20']) {
    assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ maxQueue }));
  }

  assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ clock: null }), TypeError);
  assert.throws(() => new PodcastAudioStreamTokenBucketRateLimiter({ clock: () => NaN }), TypeError);

  assert.doesNotThrow(() => new PodcastAudioStreamTokenBucketRateLimiter({
    capacity: 1000,
    refillPerSecond: 1000,
    maxConcurrent: 20,
    maxQueue: 100,
    clock: () => 0
  }));
});

test('tryConsume validates cost bounds', () => {
  const { limiter } = fixture({ capacity: 10 });

  for (const tokens of [0, -1, NaN, Infinity, 10.5, '1']) {
    assert.throws(() => limiter.tryConsume(tokens));
  }

  assert.equal(limiter.tryConsume(0.5), true);
  assert.equal(limiter.getAvailableTokens(), 9.5);
});

test('priority queue serves highest priority first and FIFO for ties', () => {
  const { limiter } = fixture({ maxConcurrent: 3 });

  assert.equal(limiter.enqueue({ id: 'bulk', priority: 0 }), true);
  assert.equal(limiter.enqueue({ id: 'live-a', priority: 6 }), true);
  assert.equal(limiter.enqueue({ id: 'live-b', priority: 6 }), true);
  assert.equal(limiter.enqueue({ id: 'emergency', priority: 9 }), true);

  const { started } = limiter.tick();
  assert.deepEqual(started.map((job) => job.id), ['emergency', 'live-a', 'live-b']);
  assert.deepEqual(limiter.snapshot().queue.map((job) => job.id), ['bulk']);
  assert.equal(limiter.snapshot().active.length, 3);
});

test('concurrency throttle bounds in-flight work and releases slots on completion', () => {
  const { limiter, set } = fixture({ capacity: 20, refillPerSecond: 1, maxConcurrent: 2 });

  for (const id of ['a', 'b', 'c', 'd']) {
    assert.equal(limiter.enqueue({ id, durationMs: 1000 }), true);
  }

  const first = limiter.tick();
  assert.deepEqual(first.started.map((job) => job.id), ['a', 'b']);
  assert.deepEqual(first.completed, []);
  assert.equal(limiter.snapshot().active.length, 2);
  assert.equal(limiter.snapshot().queue.length, 2);

  set(500);
  assert.equal(limiter.tick().started.length, 0);

  set(1000);
  const second = limiter.tick();
  assert.deepEqual(second.completed.map((job) => job.id), ['a', 'b']);
  assert.deepEqual(second.started.map((job) => job.id), ['c', 'd']);
  assert.equal(limiter.snapshot().metrics.accepted, 4);
  assert.equal(limiter.snapshot().metrics.completed, 2);

  set(2000);
  const third = limiter.tick();
  assert.deepEqual(third.completed.map((job) => job.id), ['c', 'd']);
  assert.equal(limiter.snapshot().metrics.completed, 4);
  assert.equal(limiter.snapshot().active.length, 0);
});

test('queued requests wait for sufficient token refill before starting', () => {
  const { limiter, set } = fixture({ capacity: 4, refillPerSecond: 4, maxConcurrent: 1 });

  assert.equal(limiter.enqueue({ id: 'first', tokens: 4, durationMs: 0 }), true);
  assert.equal(limiter.enqueue({ id: 'second', tokens: 2, durationMs: 100 }), true);

  assert.deepEqual(limiter.tick().started.map((job) => job.id), ['first']);
  assert.equal(limiter.tryConsume(1), false);

  const afterCompletion = limiter.tick();
  assert.deepEqual(afterCompletion.completed.map((job) => job.id), ['first']);
  assert.equal(afterCompletion.started.length, 0);

  set(250);
  assert.equal(limiter.tick().started.length, 0);

  set(500);
  assert.deepEqual(limiter.tick().started.map((job) => job.id), ['second']);
});

test('strict priority keeps an unaffordable high-priority request at the head', () => {
  const { limiter, set } = fixture({ capacity: 4, refillPerSecond: 1, maxConcurrent: 2 });

  assert.equal(limiter.tryConsume(4), true);
  assert.equal(limiter.enqueue({ id: 'low', tokens: 1, priority: 1 }), true);
  assert.equal(limiter.enqueue({ id: 'high', tokens: 2, priority: 9 }), true);

  assert.equal(limiter.tick().started.length, 0);

  set(1000);
  assert.equal(limiter.tick().started.length, 0);

  set(2000);
  assert.deepEqual(limiter.tick().started.map((job) => job.id), ['high']);
});

test('queue limit throttles new work and cancellation frees capacity', () => {
  const { limiter } = fixture({ capacity: 20, maxConcurrent: 1, maxQueue: 2 });

  assert.equal(limiter.enqueue({ id: 'active', durationMs: 1000 }), true);
  assert.equal(limiter.enqueue({ id: 'waiting-1' }), true);
  assert.equal(limiter.enqueue({ id: 'waiting-2' }), false);
  assert.equal(limiter.snapshot().metrics.throttled, 1);
  assert.equal(limiter.snapshot().queue.length, 2);

  assert.deepEqual(limiter.tick().started.map((job) => job.id), ['active']);
  assert.equal(limiter.snapshot().queue.length, 1);

  assert.equal(limiter.cancel('waiting-1'), true);
  assert.equal(limiter.cancel('waiting-1'), false);
  assert.equal(limiter.cancel('active'), false);
  assert.equal(limiter.snapshot().metrics.cancelled, 1);
  assert.equal(limiter.snapshot().queue.length, 0);

  assert.equal(limiter.enqueue({ id: 'replacement' }), true);
  assert.equal(limiter.snapshot().queue.length, 1);
});

test('enqueue rejects invalid payloads and duplicate ids', () => {
  const { limiter } = fixture({ capacity: 5 });

  assert.throws(() => limiter.enqueue({ id: '' }));
  assert.throws(() => limiter.enqueue({ id: '   ' }));
  assert.throws(() => limiter.enqueue({ id: 'x'.repeat(65) }));
  assert.throws(() => limiter.enqueue({ id: 42 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-token', tokens: 0 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-token', tokens: 6 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-priority', priority: 10 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-priority', priority: 1.5 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-duration', durationMs: -1 }));
  assert.throws(() => limiter.enqueue({ id: 'bad-duration', durationMs: 60001 }));

  assert.equal(limiter.enqueue({ id: '  padded  ' }), true);
  assert.equal(limiter.snapshot().queue[0].id, 'padded');
  assert.throws(() => limiter.enqueue({ id: 'padded' }), /already queued/);

  limiter.tick();
  assert.throws(() => limiter.enqueue({ id: 'padded' }), /already queued/);
});

test('queued work is charged only when it starts', () => {
  const { limiter } = fixture({ capacity: 10, maxConcurrent: 1 });

  assert.equal(limiter.enqueue({ id: 'a', tokens: 3, durationMs: 1000 }), true);
  assert.equal(limiter.enqueue({ id: 'b', tokens: 4 }), true);
  assert.equal(limiter.getAvailableTokens(), 10);

  limiter.tick();
  closeTo(limiter.getAvailableTokens(), 7);
  assert.equal(limiter.snapshot().queue.length, 1);
  assert.equal(limiter.snapshot().tokens, 7);
});

test('zero-duration work releases its slot on the next tick', () => {
  const { limiter } = fixture({ capacity: 10, maxConcurrent: 1 });

  assert.equal(limiter.enqueue({ id: 'instant', durationMs: 0 }), true);
  assert.deepEqual(limiter.tick().started.map((job) => job.id), ['instant']);
  assert.equal(limiter.snapshot().active.length, 1);

  const next = limiter.tick();
  assert.deepEqual(next.completed.map((job) => job.id), ['instant']);
  assert.equal(limiter.snapshot().active.length, 0);
});

test('snapshot returns defensive copies of queue, active work, and metrics', () => {
  const { limiter } = fixture({ capacity: 10, maxConcurrent: 1 });

  assert.equal(limiter.enqueue({ id: 'running', durationMs: 1000 }), true);
  assert.equal(limiter.enqueue({ id: 'waiting' }), true);
  limiter.tick();

  const snapshot = limiter.snapshot();
  assert.equal(snapshot.active[0].id, 'running');
  assert.equal(snapshot.queue[0].id, 'waiting');

  snapshot.active[0].id = 'mutated';
  snapshot.queue[0].id = 'mutated';
  snapshot.metrics.accepted = 999;

  const fresh = limiter.snapshot();
  assert.equal(fresh.active[0].id, 'running');
  assert.equal(fresh.queue[0].id, 'waiting');
  assert.equal(fresh.metrics.accepted, 1);
});

test('reset restores capacity and clears queue, active work, and metrics', () => {
  const { limiter, set } = fixture({ capacity: 4, refillPerSecond: 1 });

  limiter.tryConsume(4);
  limiter.enqueue({ id: 'job' });
  limiter.tick();
  set(500);
  limiter.reset();

  const snapshot = limiter.snapshot();
  assert.equal(snapshot.tokens, 4);
  assert.equal(snapshot.queue.length, 0);
  assert.equal(snapshot.active.length, 0);
  assert.deepEqual(snapshot.metrics, {
    accepted: 0,
    completed: 0,
    throttled: 0,
    cancelled: 0
  });

  set(1500);
  assert.equal(limiter.getAvailableTokens(), 4);
});

test('backwards clock movement never creates or removes tokens', () => {
  let time = 100;
  const limiter = new PodcastAudioStreamTokenBucketRateLimiter({
    capacity: 10,
    refillPerSecond: 2,
    clock: () => time
  });

  assert.equal(limiter.tryConsume(5), true);

  time = 50;
  assert.equal(limiter.getAvailableTokens(), 5);

  time = 200;
  closeTo(limiter.getAvailableTokens(), 5.2);
});

test('getAvailableTokens reports the current balance without spending', () => {
  const { limiter } = fixture({ capacity: 5 });

  assert.equal(limiter.getAvailableTokens(), 5);
  assert.equal(limiter.getAvailableTokens(), 5);
  assert.equal(limiter.snapshot().tokens, 5);
});
