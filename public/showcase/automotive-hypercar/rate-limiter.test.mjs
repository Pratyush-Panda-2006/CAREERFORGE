import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarTokenBucketRateLimiter } from './rate-limiter.js';

test('AutomotiveHypercarTokenBucketRateLimiter - initializes with max capacity and consumes tokens within limit', () => {
  let currentTime = 1000;
  const limiter = new AutomotiveHypercarTokenBucketRateLimiter(12, 3, () => currentTime);

  assert.equal(limiter.getAvailableTokens(), 12);
  assert.equal(limiter.tryConsume(5), true);
  assert.equal(limiter.getAvailableTokens(), 7);
});

test('AutomotiveHypercarTokenBucketRateLimiter - rejects request when bucket is exhausted', () => {
  let currentTime = 1000;
  const limiter = new AutomotiveHypercarTokenBucketRateLimiter(6, 2, () => currentTime);

  assert.equal(limiter.tryConsume(6), true);
  assert.equal(limiter.getAvailableTokens(), 0);
  assert.equal(limiter.tryConsume(1), false);
});

test('AutomotiveHypercarTokenBucketRateLimiter - replenishes tokens over elapsed time up to capacity bound', () => {
  let currentTime = 1000;
  const limiter = new AutomotiveHypercarTokenBucketRateLimiter(10, 2, () => currentTime);

  limiter.tryConsume(10);
  assert.equal(limiter.getAvailableTokens(), 0);

  // Advance time by 2 seconds -> should add 4 tokens
  currentTime += 2000;
  assert.equal(limiter.getAvailableTokens(), 4);

  // Advance time by 10 more seconds -> capacity clamped at 10
  currentTime += 10000;
  assert.equal(limiter.getAvailableTokens(), 10);
});

test('AutomotiveHypercarTokenBucketRateLimiter - invalid parameters throw RangeError', () => {
  assert.throws(() => new AutomotiveHypercarTokenBucketRateLimiter(0, 1), RangeError);
  assert.throws(() => new AutomotiveHypercarTokenBucketRateLimiter(5, -1), RangeError);
});
