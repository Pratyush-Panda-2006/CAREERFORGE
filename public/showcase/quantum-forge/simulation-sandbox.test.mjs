import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeMonteCarloEngine } from './simulation-sandbox.js';

describe('QuantumForgeMonteCarloEngine', () => {
  it('initializes with default quantum parameters', () => {
    const engine = new QuantumForgeMonteCarloEngine();
    assert.equal(engine.qubits, 16);
    assert.equal(engine.gateFidelity, 0.998);
    assert.equal(engine.decoherenceTime, 150);
    assert.equal(engine.circuitDepth, 64);
  });

  it('runs Monte Carlo simulation and computes sorted outcomes', () => {
    const engine = new QuantumForgeMonteCarloEngine();
    const outcomes = engine.runSimulation(500, 0.03);

    assert.equal(outcomes.length, 500);
    // Verify sorted ascending
    for (let i = 1; i < outcomes.length; i++) {
      assert.ok(outcomes[i] >= outcomes[i - 1]);
    }
  });

  it('calculates mean and standard deviation correctly', () => {
    const engine = new QuantumForgeMonteCarloEngine();
    engine.runSimulation(300, 0.05);

    const mean = engine.getMean();
    const stdDev = engine.getStandardDeviation();

    assert.ok(typeof mean === 'number' && mean > 0 && mean <= 100);
    assert.ok(typeof stdDev === 'number' && stdDev >= 0);
  });

  it('calculates percentiles properly', () => {
    const engine = new QuantumForgeMonteCarloEngine();
    engine.runSimulation(200, 0.04);

    const percentiles = engine.calculatePercentiles([10, 50, 90]);
    assert.ok(percentiles[10] <= percentiles[50]);
    assert.ok(percentiles[50] <= percentiles[90]);
  });

  it('runs multi-scenario comparison against noise baseline', () => {
    const engine = new QuantumForgeMonteCarloEngine();
    const comparison = engine.runScenarioComparison();

    assert.ok(comparison.baseline);
    assert.ok(comparison.noisy);
    assert.ok(comparison.shielded);
    assert.ok(comparison.noisy.mean <= comparison.shielded.mean);
  });
});
