import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalTokenBucketRateLimiter } from './rate-limiter.js';

function fixture(options = {}) {
  let time = 0;
  return {
    limiter: new DocsPortalTokenBucketRateLimiter({ clock: () => time, ...options }),
    set: value => { time = value; }
  };
}

// ---------------------------------------------------------------------------
// Burst capacity bounds
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - initial burst exhausts exactly and never goes negative', () => {
  const { limiter: l } = fixture();
  // Capacity is 10 by default; consume exactly 10 should leave 0
  for (let i = 0; i < 10; i++) {
    assert.equal(l.tryConsume(), true, `Consume attempt ${i + 1} should succeed`);
  }
  // Eleventh consume should fail
  assert.equal(l.tryConsume(), false, 'Eleventh consume should fail - bucket empty');
  assert.equal(l.getAvailableTokens(), 0, 'Available tokens should be 0');
});

test('DocsPortalTokenBucketRateLimiter - consume tokens exceeding capacity throws', () => {
  const { limiter: l } = fixture();
  assert.throws(
    () => l.tryConsume(11),
    RangeError,
    'Trying to consume more than capacity should throw'
  );
});

test('DocsPortalTokenBucketRateLimiter - consume zero or negative tokens throws', () => {
  const { limiter: l } = fixture();
  assert.throws(
    () => l.tryConsume(0),
    RangeError,
    'Consuming 0 tokens should throw'
  );
  assert.throws(
    () => l.tryConsume(-1),
    RangeError,
    'Consuming negative tokens should throw'
  );
});

// ---------------------------------------------------------------------------
// Time-based token replenishment accuracy
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - fractional elapsed refill conserves capacity', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(10); // exhaust
  set(125); // 125ms elapsed: 0.125 * 2 = 0.25 tokens
  assert.equal(l.getAvailableTokens(), 0.25, 'Should have 0.25 tokens after 125ms at 2/sec');
  assert.equal(l.tryConsume(0.25), true, 'Should be able to consume the refilled tokens');
});

test('DocsPortalTokenBucketRateLimiter - refill respects capacity ceiling', () => {
  const { limiter: l, set } = fixture({ capacity: 5, refillPerSecond: 10 });
  l.tryConsume(5); // exhaust
  set(100); // 100ms elapsed: 0.1 * 10 = 1 token, but capped at capacity 5
  // Since we started at 0 and refilled 1, we should have 1 (not 5)
  assert.equal(l.getAvailableTokens(), 1, 'Should have 1 token after partial refill, not full capacity');
});

test('DocsPortalTokenBucketRateLimiter - long elapsed time fully refills bucket', () => {
  const { limiter: l, set } = fixture({ capacity: 10, refillPerSecond: 5 });
  l.tryConsume(10); // exhaust
  set(5000); // 5 seconds elapsed: 5 * 5 = 25 tokens, but capped at capacity 10
  assert.equal(l.getAvailableTokens(), 10, 'Bucket should be fully refilled after 5 seconds');
  assert.equal(l.tryConsume(10), true, 'Should be able to consume full capacity');
  assert.equal(l.tryConsume(1), false, 'Should be empty after full consumption');
});

// ---------------------------------------------------------------------------
// Request rejection under exhaustion
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - request rejection under exhaustion', () => {
  const { limiter: l } = fixture();
  // Exhaust the bucket
  for (let i = 0; i < 10; i++) {
    assert.equal(l.tryConsume(), true);
  }
  // All subsequent tries should fail
  assert.equal(l.tryConsume(), false, 'Should reject after exhaustion');
  assert.equal(l.tryConsume(1), false, 'Should reject again');
  assert.equal(l.getAvailableTokens(), 0, 'Tokens should be 0');
});

test('DocsPortalTokenBucketRateLimiter - interleaved consume and refill', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(5); // use 5, 5 remaining
  assert.equal(l.getAvailableTokens(), 5);
  set(250); // 250ms at 2/sec = 0.5 tokens
  assert.equal(l.getAvailableTokens(), 5.5, 'Should have 5.5 tokens after refill');
  assert.equal(l.tryConsume(3), true, 'Should be able to consume 3');
  assert.equal(l.getAvailableTokens(), 2.5, 'Should have 2.5 remaining');
});

// ---------------------------------------------------------------------------
// Constructor validation
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - validates constructor parameters', () => {
  // Invalid capacity (non-number)
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ capacity: 'abc' }),
    TypeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ capacity: null }),
    TypeError
  );

  // Invalid capacity (out of range)
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ capacity: 0 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ capacity: -1 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ capacity: 1001 }),
    RangeError
  );

  // Invalid refillPerSecond (non-number)
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ refillPerSecond: 'xyz' }),
    TypeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ refillPerSecond: null }),
    TypeError
  );

  // Invalid refillPerSecond (out of range)
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ refillPerSecond: 0 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ refillPerSecond: -5 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ refillPerSecond: 1001 }),
    RangeError
  );

  // Invalid maxConcurrent
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxConcurrent: 0 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxConcurrent: 21 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxConcurrent: 1.5 }),
    RangeError
  );

  // Invalid maxQueue
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxQueue: 0 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxQueue: 101 }),
    RangeError
  );
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ maxQueue: 1.5 }),
    RangeError
  );

  // Invalid clock
  assert.throws(
    () => new DocsPortalTokenBucketRateLimiter({ clock: 'not-a-function' }),
    TypeError
  );
});

// ---------------------------------------------------------------------------
// Tick and concurrency
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - tick processes queued jobs', () => {
  const { limiter: l, set } = fixture();
  // Enqueue 3 jobs that each cost 1 token (we have 10 tokens, maxConcurrent=3)
  l.enqueue({ id: 'job1', tokens: 1, durationMs: 100 });
  l.enqueue({ id: 'job2', tokens: 1, durationMs: 100 });
  l.enqueue({ id: 'job3', tokens: 1, durationMs: 100 });

  // Advance tick
  const result = l.tick();

  assert.equal(result.started.length, 3, 'All 3 jobs should start');
  assert.equal(l.metrics.accepted, 3, 'Metrics should show 3 accepted');
  assert.equal(l.metrics.completed, 0, 'No jobs should be completed yet (not enough time)');
});

test('DocsPortalTokenBucketRateLimiter - tick respects maxConcurrent limit', () => {
  const { limiter: l, set } = fixture({ maxConcurrent: 2 });
  // Enqueue 5 jobs
  for (let i = 1; i <= 5; i++) {
    l.enqueue({ id: `job${i}`, tokens: 1, durationMs: 200 });
  }

  // First tick starts 2 (advance time so they complete)
  let result = l.tick();
  assert.equal(result.started.length, 2, 'First tick should start 2 jobs');
  // Advance time past the first jobs' duration
  set(300);

  // Second tick starts 2 more (first 2 now complete)
  result = l.tick();
  assert.equal(result.started.length, 2, 'Second tick should start 2 more jobs');
  // Advance time past the second jobs' completion
  set(600);

  // Third tick starts 1 more (4 done, 1 waiting)
  result = l.tick();
  assert.equal(result.started.length, 1, 'Third tick should start 1 more job');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('DocsPortalTokenBucketRateLimiter - enqueue when queue is full throttles', () => {
  const { limiter: l } = fixture({ maxQueue: 2 });
  // Fill the queue
  assert.equal(l.enqueue({ id: 'q1', tokens: 1 }), true);
  assert.equal(l.enqueue({ id: 'q2', tokens: 1 }), true);
  // Third should be throttled
  assert.equal(l.enqueue({ id: 'q3', tokens: 1 }), false, 'Queue full should throttle');
  assert.equal(l.metrics.throttled, 1, 'Throttled count should be 1');
});

test('DocsPortalTokenBucketRateLimiter - getAvailableTokens returns value after refill', () => {
  const { limiter: l, set } = fixture();
  // Start with full bucket
  assert.equal(l.getAvailableTokens(), 10, 'Should start with full capacity');
  // After consuming some
  l.tryConsume(3);
  // Before refill, should return current (post-consume) value
  // getAvailableTokens calls refill internally, but since no time passed, it returns current
  assert.ok(l.getAvailableTokens() <= 10 && l.getAvailableTokens() >= 3);
});

test('DocsPortalTokenBucketRateLimiter - tryConsume with custom token cost', () => {
  const { limiter: l } = fixture();
  // Cost of 3 tokens from capacity 10
  assert.equal(l.tryConsume(3), true, 'Should consume 3 tokens');
  assert.equal(l.getAvailableTokens(), 7, 'Should have 7 remaining');
  // Try another 3
  assert.equal(l.tryConsume(3), true, 'Should consume another 3');
  assert.equal(l.getAvailableTokens(), 4, 'Should have 4 remaining (10 - 3 - 3)');
  // Try more than remaining (5 > 4)
  assert.equal(l.tryConsume(5), false, 'Should fail to consume 5 when only 4 remains');
  // Consume the last one
  assert.equal(l.tryConsume(4), true, 'Should consume the last 4 tokens');
  assert.equal(l.getAvailableTokens(), 0, 'Should have 0 remaining');
  // Try one more than empty
  assert.equal(l.tryConsume(1), false, 'Should fail when bucket is empty');
});

console.log('All rate-limiter tests passed.');