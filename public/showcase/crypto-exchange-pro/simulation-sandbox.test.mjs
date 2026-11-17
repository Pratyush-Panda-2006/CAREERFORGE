import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProMonteCarloEngine } from './simulation-sandbox.js';

test('CryptoExchangeProMonteCarloEngine - runs 1,000 iterations and computes mean converging near base price', () => {
  const engine = new CryptoExchangeProMonteCarloEngine();
  const base = 90000;
  const results = engine.runSimulation(1000, 0.1, base);

  assert.strictEqual(results.length, 1000);
  const summary = engine.getSummary();

  // With lognormal drift correction, mean converges within 10% of base
  assert.ok(summary.mean > 81000 && summary.mean < 99000, `Expected mean near 90000, got ${summary.mean}`);
});

test('CryptoExchangeProMonteCarloEngine - calculates standard deviation and positive variance', () => {
  const engine = new CryptoExchangeProMonteCarloEngine();
  engine.runSimulation(500, 0.3, 50000);

  const stdDev = engine.getStandardDeviation();
  assert.ok(stdDev > 0);
  assert.ok(stdDev < 40000);
});

test('CryptoExchangeProMonteCarloEngine - computes monotonic percentile distribution bounds', () => {
  const engine = new CryptoExchangeProMonteCarloEngine();
  engine.runSimulation(1000, 0.25, 90000);

  const p = engine.calculatePercentiles();
  assert.ok(p.p10 <= p.p25, 'p10 <= p25');
  assert.ok(p.p25 <= p.p50, 'p25 <= p50');
  assert.ok(p.p50 <= p.p75, 'p50 <= p75');
  assert.ok(p.p75 <= p.p90, 'p75 <= p90');
  assert.ok(p.p90 <= p.p95, 'p90 <= p95');
  assert.ok(p.p95 <= p.p99, 'p95 <= p99');
});

test('CryptoExchangeProMonteCarloEngine - handles custom trial sizing properly', () => {
  const engine = new CryptoExchangeProMonteCarloEngine();
  const res = engine.runSimulation(50, 0.05, 1000);

  assert.strictEqual(res.length, 50);
  const summary = engine.getSummary();
  assert.strictEqual(summary.count, 50);
});
