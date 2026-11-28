import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreTokenBucketRateLimiter } from './rate-limiter.js';

// ===================== Fixture =====================
function fixture(options = {}) {
  let time = 0;
  return {
    limiter: new EcommerceStoreTokenBucketRateLimiter({ clock: () => time, ...options }),
    set: value => { time = value; },
    advance: ms => { time += ms; },
  };
}

// ===================== Burst Capacity Bounds =====================

test('TokenBucket - initial burst exactly fills capacity and rejects excess', () => {
  const { limiter: l } = fixture();
  // Capacity is 10 by default; consume exactly 10 should succeed
  for (let i = 0; i < 10; i++) {
    assert.equal(l.tryConsume(), true, `Consume #${i + 1} should succeed`);
  }
  // The 11th must fail
  assert.equal(l.tryConsume(), false, '11th consume should be throttled');
  // Bucket should be empty
  assert.equal(l.getAvailableTokens(), 0);
});

test('TokenBucket - multi-token consume respects capacity bounds', () => {
  const { limiter: l } = fixture();
  // Consume 3 tokens with capacity 10
  assert.equal(l.tryConsume(3), true);
  // Should have 7 remaining
  assert.equal(l.getAvailableTokens(), 7);
  // Try to consume 4 more -> 7 - 4 = 3, should succeed
  assert.equal(l.tryConsume(4), true);
  // Should have 3 remaining
  assert.equal(l.getAvailableTokens(), 3);
  // Try to consume 4 more -> only 3 available, should fail
  assert.equal(l.tryConsume(4), false);
});

// ===================== Time-Based Token Replenishment =====================

test('TokenBucket - fractional elapsed refill conserves capacity correctly', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(10); // bucket now has 0 tokens
  set(125); // advance 125ms
  // refill: 125ms * 2/sec / 1000 = 0.25 tokens
  assert.equal(l.getAvailableTokens(), 0.25, 'Should refill 0.25 tokens after 125ms');
  assert.equal(l.tryConsume(0.25), true, 'Should be able to consume the refilled tokens');
});

test('TokenBucket - continuous refill over time restores full capacity', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(10); // drain bucket
  // Refill at 2/sec -> need 5000ms to restore 10 tokens
  set(5000);
  assert.equal(l.getAvailableTokens(), 10, 'Full bucket should be restored after 5000ms at 2/sec');
});

// Test with non-zero initial capacity
test('TokenBucket - refill from partial state', () => {
  const { limiter: l, set } = fixture();
  // Consume 7, leaving 3
  l.tryConsume(7);
  set(250); // 250ms * 2/sec / 1000 = 0.5 tokens
  const available = l.getAvailableTokens();
  assert(available >= 3.0 && available <= 3.5, `Expected ~3.5 tokens, got ${available}`);
});

// ===================== Request Rejection Under Exhaustion =====================

test('TokenBucket - throttled requests increment metrics', () => {
  const { limiter: l } = fixture();
  // Drain all tokens
  for (let i = 0; i < 10; i++) l.tryConsume();
  // All subsequent tries should be throttled
  for (let i = 0; i < 5; i++) {
    assert.equal(l.tryConsume(), false, `Try ${i + 1} should be throttled`);
  }
  // Metrics should reflect throttling
  assert.equal(l.metrics.throttled, 5, 'Throttled count should be 5');
  assert.equal(l.metrics.accepted, 10, 'Accepted count should remain 10');
});

test('TokenBucket - tryConsume with custom token cost under exhaustion', () => {
  const { limiter: l } = fixture();
  l.tryConsume(10);
  // Requesting 1 token should fail when 0 available
  assert.equal(l.tryConsume(1), false);
  // Requesting exactly 0 should throw
  assert.throws(() => l.tryConsume(0), RangeError);
  // Requesting > capacity should throw
  assert.throws(() => l.tryConsume(11), RangeError);
});

// ===================== Concurrency Throttling =====================

test('TokenBucket - enqueue respects maxConcurrent limit', () => {
  const { limiter: l } = fixture();
  // Fill the bucket
  for (let i = 0; i < 10; i++) l.tryConsume();
  // Now enqueue requests; they should be throttled since bucket is empty and no active jobs
  for (let i = 0; i < 5; i++) {
    assert.equal(l.enqueue({ id: `req-${i}`, tokens: 1 }), false, `Enqueue ${i} should be throttled`);
  }
  assert.equal(l.metrics.throttled, 5, 'All enqueued should be throttled');
});

// ===================== Tick & Concurrency =====================

test('TokenBucket - tick advances time and starts jobs up to maxConcurrent', () => {
  const { limiter: l, set } = fixture();
  // Start with full bucket, enqueue 3 jobs (tokens go from 10 to 7; accepted unchanged)
  for (let i = 0; i < 3; i++) {
    assert.equal(l.enqueue({ id: `req-${i}`, tokens: 1, durationMs: 1000 }), true);
  }
  // Tick should start 3 jobs (maxConcurrent=3); accepted increments from 0 to 3
  const tick1 = l.tick();
  assert.equal(tick1.started.length, 3, 'Should start 3 jobs initially');
  assert.equal(l.metrics.accepted, 3, 'Accepted should be 3');
  assert.equal(l.metrics.active, 3, 'Active count should be 3');
  assert.equal(l.getAvailableTokens(), 7, 'Tokens should be 7 after consuming 3');

  // Advance time to refill 3 tokens (1500ms at 2/sec)
  set(1500);
  // Tick again - no jobs in queue, so 0 started; tokens refilled
  const tick2 = l.tick();
  assert.equal(tick2.started.length, 0, 'No jobs to start when queue is empty');
  assert.equal(l.getAvailableTokens(), 10, 'Tokens should be fully refilled to 10');
});

// ===================== Queue Prioritization =====================

test('TokenBucket - priority ordering in queue', () => {
  const { limiter: l } = fixture();

  // Enqueue with different priorities
  l.enqueue({ id: 'low', tokens: 1, priority: 0 });
  l.enqueue({ id: 'high', tokens: 1, priority: 10 });
  l.enqueue({ id: 'medium', tokens: 1, priority: 5 });

  // Queue should be sorted: high(10) -> medium(5) -> low(0)
  assert.equal(l.queue[0].id, 'high', 'Highest priority should be first');
  assert.equal(l.queue[1].id, 'medium', 'Medium priority should be second');
  assert.equal(l.queue[2].id, 'low', 'Lowest priority should be third');
});

test('TokenBucket - FIFO within same priority', () => {
  const { limiter: l } = fixture();

  l.enqueue({ id: 'first', tokens: 1, priority: 5 });
  l.enqueue({ id: 'second', tokens: 1, priority: 5 });
  l.enqueue({ id: 'third', tokens: 1, priority: 5 });

  assert.equal(l.queue[0].id, 'first', 'First enqueued should be first in FIFO');
  assert.equal(l.queue[1].id, 'second', 'Second enqueued should be second');
  assert.equal(l.queue[2].id, 'third', 'Third enqueued should be third');
});

// ===================== Cancel Functionality =====================

test('TokenBucket - cancel removes from queue', () => {
  const { limiter: l } = fixture();

  l.enqueue({ id: 'cancel-me', tokens: 1, priority: 5 });
  l.enqueue({ id: 'keep-me', tokens: 1, priority: 5 });

  assert.equal(l.cancel('cancel-me'), true, 'Should cancel existing request');
  assert.equal(l.queue.length, 1, 'Queue should have 1 remaining item');
  assert.equal(l.queue[0].id, 'keep-me', 'Should keep the non-cancelled request');
});

test('TokenBucket - cancel non-existent id returns false', () => {
  const { limiter: l } = fixture();
  assert.equal(l.cancel('non-existent'), false, 'Cancelling non-existent should return false');
});

// ===================== getState =====================

test('TokenBucket - getState returns correct summary', () => {
  const { limiter: l } = fixture();

  const state = l.getState();
  assert.ok(state.tokens >= 0 && state.tokens <= state.capacity, 'Tokens should be in valid range');
  assert.equal(state.capacity, 10, 'Default capacity should be 10');
  assert.equal(state.maxConcurrent, 3, 'Default maxConcurrent should be 3');
  assert.equal(state.maxQueue, 100, 'Default maxQueue should be 100');
  assert.equal(state.queueLength, 0, 'Queue should be empty initially');
  assert.equal(state.activeCount, 0, 'Active should be 0 initially');
});

// ===================== Edge Cases =====================

test('TokenBucket - enqueue with default parameters', () => {
  const { limiter: l } = fixture();
  assert.equal(l.enqueue({ id: 'default-test' }), true, 'Enqueue with default tokens should succeed');
});

test('TokenBucket - enqueue fills throttled metric when queue full', () => {
  const { limiter: l } = fixture({ maxQueue: 2 });

  // Enqueue 2 (fills maxQueue)
  assert.equal(l.enqueue({ id: 'q1', tokens: 1 }), true);
  assert.equal(l.enqueue({ id: 'q2', tokens: 1 }), true);

  // Try a 3rd - should be throttled because maxQueue is reached
  const result = l.enqueue({ id: 'q3', tokens: 1 });
  assert.equal(result, false, '3rd enqueue should be throttled');
  assert.equal(l.metrics.throttled, 1, 'Throttled count should be 1');
});

// ===================== Comprehensive End-to-End =====================

test('TokenBucket - end-to-end simulator cycle', () => {
  const { limiter: l, set } = fixture();

  // Start with full bucket
  assert.equal(l.getAvailableTokens(), 10);

  // Consume 7 tokens
  assert.equal(l.tryConsume(7), true);
  assert.equal(l.getAvailableTokens(), 3);

  // Advance time to refill 3 tokens (1500ms at 2/sec)
  set(1500);
  assert.equal(l.getAvailableTokens(), 6);

  // Consume the refilled amount
  assert.equal(l.tryConsume(6), true);
  assert.equal(l.getAvailableTokens(), 0);

  // Try to consume more - should fail
  assert.equal(l.tryConsume(1), false);

  // Advance more time to refill
  set(2500); // additional 1000ms -> 2 more tokens
  assert.equal(l.getAvailableTokens(), 2);

  // Should be able to consume 2 more
  assert.equal(l.tryConsume(2), true);
  assert.equal(l.getAvailableTokens(), 0);
});