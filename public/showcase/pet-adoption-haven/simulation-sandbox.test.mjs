import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenMonteCarloEngine } from './simulation-sandbox.js';

test('PetAdoptionHavenMonteCarloEngine - runs 1,000 iterations and computes mean converging near baseline', () => {
  const engine = new PetAdoptionHavenMonteCarloEngine();
  const base = 65;
  const results = engine.runSimulation(1000, 0.1, base);

  assert.strictEqual(results.length, 1000);
  const summary = engine.getSummary();

  assert.ok(summary.mean > base * 0.85 && summary.mean < base * 1.15, `Mean ${summary.mean} should converge near ${base}`);
  assert.ok(summary.stdDev > 0, 'Standard deviation should be positive');
});

test('PetAdoptionHavenMonteCarloEngine - calculates standard deviation correctly', () => {
  const engine = new PetAdoptionHavenMonteCarloEngine();
  engine.runSimulation(500, 0.2, 65);
  const stdDev = engine.getStandardDeviation();

  assert.ok(typeof stdDev === 'number' && stdDev > 0);
});

test('PetAdoptionHavenMonteCarloEngine - computes percentiles in monotonic ascending order', () => {
  const engine = new PetAdoptionHavenMonteCarloEngine();
  engine.runSimulation(1000, 0.15, 65);
  const p = engine.calculatePercentiles();

  assert.ok(p.p10 <= p.p25);
  assert.ok(p.p25 <= p.p50);
  assert.ok(p.p50 <= p.p75);
  assert.ok(p.p75 <= p.p90);
  assert.ok(p.p90 <= p.p95);
  assert.ok(p.p95 <= p.p99);
});
