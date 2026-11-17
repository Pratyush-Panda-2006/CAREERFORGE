import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixMonteCarloEngine } from './simulation-sandbox.js';

test('DefiYieldMatrixMonteCarloEngine - runs 1,000 iterations and computes mean converging near base', () => {
  const engine = new DefiYieldMatrixMonteCarloEngine();
  const base = 18;
  const results = engine.runSimulation(1000, 0.1, base);

  assert.strictEqual(results.length, 1000);
  const summary = engine.getSummary();

  assert.ok(summary.mean > base * 0.85 && summary.mean < base * 1.15, `Expected mean near ${base}, got ${summary.mean}`);
});

test('DefiYieldMatrixMonteCarloEngine - calculates standard deviation and positive variance', () => {
  const engine = new DefiYieldMatrixMonteCarloEngine();
  engine.runSimulation(500, 0.2, 18);

  const stdDev = engine.getStandardDeviation();
  assert.ok(stdDev > 0);
});

test('DefiYieldMatrixMonteCarloEngine - computes monotonic percentile distribution bounds', () => {
  const engine = new DefiYieldMatrixMonteCarloEngine();
  engine.runSimulation(1000, 0.15, 18);

  const p = engine.calculatePercentiles();
  assert.ok(p.p10 <= p.p25, 'p10 <= p25');
  assert.ok(p.p25 <= p.p50, 'p25 <= p50');
  assert.ok(p.p50 <= p.p75, 'p50 <= p75');
  assert.ok(p.p75 <= p.p90, 'p75 <= p90');
  assert.ok(p.p90 <= p.p95, 'p90 <= p95');
  assert.ok(p.p95 <= p.p99, 'p95 <= p99');
});

test('DefiYieldMatrixMonteCarloEngine - handles custom trial sizing properly', () => {
  const engine = new DefiYieldMatrixMonteCarloEngine();
  const res = engine.runSimulation(50, 0.05, 100);

  assert.strictEqual(res.length, 50);
  const summary = engine.getSummary();
  assert.strictEqual(summary.count, 50);
});
