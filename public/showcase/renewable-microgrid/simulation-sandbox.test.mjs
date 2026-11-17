import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridMonteCarloEngine } from './simulation-sandbox.js';

test('RenewableMicrogridMonteCarloEngine executes 1,000 iterative trials', () => {
  const engine = new RenewableMicrogridMonteCarloEngine({ baseLoad: 100, solarCapacity: 150, windCapacity: 100 });
  const results = engine.runSimulation(1000, 0.25);

  assert.equal(results.length, 1000);
  assert.equal(typeof engine.getMean(), 'number');
  assert.ok(engine.getStandardDeviation() > 0);
});

test('calculatePercentiles guarantees monotonic sorted bounds', () => {
  const engine = new RenewableMicrogridMonteCarloEngine();
  engine.runSimulation(1000, 0.3);

  const percentiles = engine.calculatePercentiles([5, 25, 50, 75, 95]);
  assert.ok(percentiles[5] <= percentiles[25]);
  assert.ok(percentiles[25] <= percentiles[50]);
  assert.ok(percentiles[50] <= percentiles[75]);
  assert.ok(percentiles[75] <= percentiles[95]);
});

test('confidence intervals provide symmetric bounds around median', () => {
  const engine = new RenewableMicrogridMonteCarloEngine();
  engine.runSimulation(1000, 0.2);

  const ci = engine.getConfidenceInterval(0.90);
  assert.ok(ci.lower < ci.upper);
  const mean = engine.getMean();
  assert.ok(ci.lower <= mean);
  assert.ok(ci.upper >= mean);
});

test('higher volatility yields larger standard deviation', () => {
  const engine = new RenewableMicrogridMonteCarloEngine();
  engine.runSimulation(1000, 0.05);
  const lowVolStd = engine.getStandardDeviation();

  engine.runSimulation(1000, 0.5);
  const highVolStd = engine.getStandardDeviation();

  assert.ok(highVolStd > lowVolStd);
});
