import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterTokenBucketRateLimiter } from './rate-limiter.js';

function fixture(options = {}) {
  let time = 0;
  return {
    limiter: new AerospaceOrbiterTokenBucketRateLimiter({ clock: () => time, ...options }),
    set: value => { time = value; }
  };
}

test('AerospaceOrbiterTokenBucketRateLimiter - initial burst exhausts exactly and never goes negative', () => {
  const { limiter: l } = fixture();
  for (let i = 0; i < 10; i++) assert.equal(l.tryConsume(), true);
  assert.equal(l.tryConsume(), false);
  assert.equal(l.getAvailableTokens(), 0);
});

test('AerospaceOrbiterTokenBucketRateLimiter - fractional elapsed refill conserves capacity', () => {
  const { limiter: l, set } = fixture();
  l.tryConsume(10);
  set(125);
  assert.equal(l.getAvailableTokens(), 0.25);
  assert.equal(l.tryConsume(0.25), true);
});
