import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterMonteCarloEngine } from './simulation-sandbox.js';

test('AerospaceOrbiterMonteCarloEngine - runs 1,000 iterations and computes mean converging near base altitude', () => {
  const engine = new AerospaceOrbiterMonteCarloEngine();
  const base = 420;
  const results = engine.runSimulation(1000, 0.1, base);

  assert.strictEqual(results.length, 1000);
  const summary = engine.getSummary();

  // With lognormal drift correction, mean converges within 10% of base
  assert.ok(summary.mean > 380 && summary.mean < 460, `Expected mean near 420, got ${summary.mean}`);
});

test('AerospaceOrbiterMonteCarloEngine - calculates standard deviation and positive variance', () => {
  const engine = new AerospaceOrbiterMonteCarloEngine();
  engine.runSimulation(500, 0.15, 300);

  const stdDev = engine.getStandardDeviation();
  assert.ok(stdDev > 0);
  assert.ok(stdDev < 150);
});

test('AerospaceOrbiterMonteCarloEngine - computes monotonic percentile distribution bounds', () => {
  const engine = new AerospaceOrbiterMonteCarloEngine();
  engine.runSimulation(1000, 0.14, 420);

  const p = engine.calculatePercentiles();
  assert.ok(p.p10 <= p.p25, 'p10 <= p25');
  assert.ok(p.p25 <= p.p50, 'p25 <= p50');
  assert.ok(p.p50 <= p.p75, 'p50 <= p75');
  assert.ok(p.p75 <= p.p90, 'p75 <= p90');
  assert.ok(p.p90 <= p.p95, 'p90 <= p95');
  assert.ok(p.p95 <= p.p99, 'p95 <= p99');
});

test('AerospaceOrbiterMonteCarloEngine - handles custom trial sizing properly', () => {
  const engine = new AerospaceOrbiterMonteCarloEngine();
  const res = engine.runSimulation(50, 0.05, 100);

  assert.strictEqual(res.length, 50);
  const summary = engine.getSummary();
  assert.strictEqual(summary.count, 50);
});
