import test from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioMonteCarloEngine } from './simulation-sandbox.js';

test('AgencyStudioMonteCarloEngine initializes with default state', () => {
  const engine = new AgencyStudioMonteCarloEngine();
  assert.equal(engine.results.length, 0);
  assert.equal(engine.getStandardDeviation(), 0);
  const summary = engine.getSummary();
  assert.equal(summary.count, 0);
  assert.equal(summary.mean, 0);
});

test('AgencyStudioMonteCarloEngine runs simulation with specified trials', () => {
  const engine = new AgencyStudioMonteCarloEngine();
  const trials = 600;
  const res = engine.runSimulation(trials, 0.15, 35000);

  assert.equal(res.length, trials);
  assert.equal(engine.results.length, trials);
  assert.equal(engine.sortedResults.length, trials);

  const summary = engine.getSummary();
  assert.ok(summary.mean > 20000 && summary.mean < 55000);
  assert.ok(summary.stdDev > 0);
});

test('AgencyStudioMonteCarloEngine calculates monotonic percentiles', () => {
  const engine = new AgencyStudioMonteCarloEngine();
  engine.runSimulation(1000, 0.2, 35000);
  const p = engine.calculatePercentiles();

  assert.ok(p.p10 <= p.p25);
  assert.ok(p.p25 <= p.p50);
  assert.ok(p.p50 <= p.p75);
  assert.ok(p.p75 <= p.p90);
  assert.ok(p.p90 <= p.p95);
  assert.ok(p.p95 <= p.p99);
});

test('AgencyStudioMonteCarloEngine standard deviation reflects volatility change', () => {
  const lowVolEngine = new AgencyStudioMonteCarloEngine();
  lowVolEngine.runSimulation(2000, 0.05, 35000);
  const lowStd = lowVolEngine.getStandardDeviation();

  const highVolEngine = new AgencyStudioMonteCarloEngine();
  highVolEngine.runSimulation(2000, 0.35, 35000);
  const highStd = highVolEngine.getStandardDeviation();

  assert.ok(highStd > lowStd);
});
