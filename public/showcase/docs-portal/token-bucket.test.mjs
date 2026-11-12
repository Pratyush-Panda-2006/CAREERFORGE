import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/docs-portal/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math,
    Date,
    setInterval: () => 1,
    clearInterval: () => {}
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('TokenBucket algorithm initializes with default parameters', () => {
  const ctx = loadContext();
  const TokenBucket = ctx.TokenBucket;
  assert.equal(typeof TokenBucket, 'function');

  const tb = new TokenBucket(100, 10, 50);
  assert.equal(tb.capacity, 100);
  assert.equal(tb.refillRate, 10);
  assert.equal(tb.tokens, 50);
  assert.equal(tb.accepted, 0);
  assert.equal(tb.throttled, 0);
});

test('TokenBucket consumes available tokens and yields HTTP 200', () => {
  const ctx = loadContext();
  const TokenBucket = ctx.TokenBucket;
  const tb = new TokenBucket(100, 10, 50);

  const t0 = Date.now();
  const res = tb.consume(5, t0);

  assert.equal(res.success, true);
  assert.equal(res.status, 200);
  assert.equal(res.remaining, 45);
  assert.equal(res.retryAfter, 0);
  assert.equal(tb.accepted, 1);
  assert.equal(tb.throttled, 0);
});

test('TokenBucket throttles with HTTP 429 when tokens are exhausted', () => {
  const ctx = loadContext();
  const TokenBucket = ctx.TokenBucket;
  const tb = new TokenBucket(100, 10, 5);

  const t0 = Date.now();
  const res = tb.consume(10, t0);

  assert.equal(res.success, false);
  assert.equal(res.status, 429);
  assert.equal(res.remaining, 5);
  assert.ok(res.retryAfter >= 1, 'retryAfter should be at least 1s');
  assert.equal(tb.accepted, 0);
  assert.equal(tb.throttled, 1);
});

test('TokenBucket refills continuously over time up to capacity', () => {
  const ctx = loadContext();
  const TokenBucket = ctx.TokenBucket;
  const tb = new TokenBucket(100, 10, 20);

  const t0 = Date.now();
  // Simulate 3 seconds later
  tb.refill(t0 + 3000);
  assert.equal(Math.floor(tb.tokens), 50);

  // Simulate 10 seconds later (should hit cap of 100)
  tb.refill(t0 + 13000);
  assert.equal(tb.tokens, 100);
});
