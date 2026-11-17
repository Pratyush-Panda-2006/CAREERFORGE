import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsMonteCarloEngine } from './simulation-sandbox.js';

describe('BiotechGenomicsMonteCarloEngine', () => {
  it('initializes with default biotech genomic parameters', () => {
    const engine = new BiotechGenomicsMonteCarloEngine();
    assert.equal(engine.sampleSize, 500);
    assert.equal(engine.baselineEfficacy, 78.5);
    assert.equal(engine.mutationRate, 0.02);
    assert.equal(engine.toxicityThreshold, 15.0);
  });

  it('runs Monte Carlo simulation and computes sorted outcomes', () => {
    const engine = new BiotechGenomicsMonteCarloEngine();
    const outcomes = engine.runSimulation(500, 0.04);

    assert.equal(outcomes.length, 500);
    for (let i = 1; i < outcomes.length; i++) {
      assert.ok(outcomes[i] >= outcomes[i - 1]);
    }
  });

  it('calculates mean and standard deviation correctly', () => {
    const engine = new BiotechGenomicsMonteCarloEngine();
    engine.runSimulation(400, 0.06);

    const mean = engine.getMean();
    const stdDev = engine.getStandardDeviation();

    assert.ok(typeof mean === 'number' && mean > 0 && mean <= 100);
    assert.ok(typeof stdDev === 'number' && stdDev >= 0);
  });

  it('calculates percentiles properly', () => {
    const engine = new BiotechGenomicsMonteCarloEngine();
    engine.runSimulation(300, 0.05);

    const percentiles = engine.calculatePercentiles([5, 50, 95]);
    assert.ok(percentiles[5] <= percentiles[50]);
    assert.ok(percentiles[50] <= percentiles[95]);
  });

  it('compares cohort scenarios across treatments', () => {
    const engine = new BiotechGenomicsMonteCarloEngine();
    const cohorts = engine.runCohortComparison();

    assert.ok(cohorts.wildtype);
    assert.ok(cohorts.crisprEdited);
    assert.ok(cohorts.offTargetStress);
    assert.ok(cohorts.offTargetStress.mean <= cohorts.crisprEdited.mean);
  });
});
