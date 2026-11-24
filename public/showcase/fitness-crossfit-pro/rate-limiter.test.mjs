import test from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProTokenBucketRateLimiter } from './rate-limiter.js';

test('FitnessCrossfitProTokenBucketRateLimiter - initializes with max capacity and consumes tokens within limit', () => {
  let currentTime = 1000;
  const limiter = new FitnessCrossfitProTokenBucketRateLimiter(10, 2, () => currentTime);

  assert.equal(limiter.getAvailableTokens(), 10);
  assert.equal(limiter.tryConsume(4), true);
  assert.equal(limiter.getAvailableTokens(), 6);
});

test('FitnessCrossfitProTokenBucketRateLimiter - rejects request when bucket is exhausted', () => {
  let currentTime = 1000;
  const limiter = new FitnessCrossfitProTokenBucketRateLimiter(5, 1, () => currentTime);

  assert.equal(limiter.tryConsume(5), true);
  assert.equal(limiter.getAvailableTokens(), 0);
  assert.equal(limiter.tryConsume(1), false);
});

test('FitnessCrossfitProTokenBucketRateLimiter - replenishes tokens over elapsed time up to capacity bound', () => {
  let currentTime = 1000;
  // Refill 2 tokens per second
  const limiter = new FitnessCrossfitProTokenBucketRateLimiter(10, 2, () => currentTime);

  limiter.tryConsume(10);
  assert.equal(limiter.getAvailableTokens(), 0);

  // Advance time by 2 seconds -> should add 4 tokens
  currentTime += 2000;
  assert.equal(limiter.getAvailableTokens(), 4);

  // Advance time by 10 more seconds -> capacity clamped at 10
  currentTime += 10000;
  assert.equal(limiter.getAvailableTokens(), 10);
});

test('FitnessCrossfitProTokenBucketRateLimiter - invalid parameters throw RangeError', () => {
  assert.throws(() => new FitnessCrossfitProTokenBucketRateLimiter(0, 1), RangeError);
  assert.throws(() => new FitnessCrossfitProTokenBucketRateLimiter(5, -1), RangeError);
});
