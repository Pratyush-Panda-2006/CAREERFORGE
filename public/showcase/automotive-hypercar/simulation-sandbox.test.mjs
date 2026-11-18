import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarSimulationEngine } from './simulation-sandbox.js';

test('AutomotiveHypercarSimulationEngine - executes simulation and populates results array', () => {
  const engine = new AutomotiveHypercarSimulationEngine();
  const results = engine.runSimulation(500, 0.08, 78.5);

  assert.strictEqual(results.length, 500);
  assert.strictEqual(engine.results.length, 500);
  assert.strictEqual(engine.sortedResults.length, 500);
});

test('AutomotiveHypercarSimulationEngine - computes non-negative standard deviation', () => {
  const engine = new AutomotiveHypercarSimulationEngine();
  engine.runSimulation(300, 0.12, 82.0);

  const stdDev = engine.getStandardDeviation();
  assert.ok(typeof stdDev === 'number');
  assert.ok(stdDev >= 0);
});

test('AutomotiveHypercarSimulationEngine - calculates correct monotonic percentiles', () => {
  const engine = new AutomotiveHypercarSimulationEngine();
  engine.runSimulation(1000, 0.08, 78.5);

  const p = engine.calculatePercentiles();
  assert.ok(p.p10 <= p.p25);
  assert.ok(p.p25 <= p.p50);
  assert.ok(p.p50 <= p.p75);
  assert.ok(p.p75 <= p.p90);
  assert.ok(p.p90 <= p.p95);
  assert.ok(p.p95 <= p.p99);
});

test('AutomotiveHypercarSimulationEngine - summary returns structured statistical report', () => {
  const engine = new AutomotiveHypercarSimulationEngine();
  engine.runSimulation(400, 0.06, 75.0);

  const summary = engine.getSummary();
  assert.strictEqual(summary.count, 400);
  assert.ok(summary.mean > 0);
  assert.ok(summary.min <= summary.max);
  assert.strictEqual(summary.params.trials, 400);
  assert.strictEqual(summary.params.baseMetric, 75.0);
});
