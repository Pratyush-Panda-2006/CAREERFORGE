import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeBenchmarkSuite } from './benchmark-suite.js';

describe('QuantumForgeBenchmarkSuite', () => {
  it('initializes with default metrics structure', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    const metrics = suite.getSummaryMetrics();

    assert.equal(metrics.totalIterations, 0);
    assert.equal(metrics.opsPerSec, 0);
    assert.equal(metrics.p50, 0);
    assert.equal(metrics.p95, 0);
    assert.equal(metrics.p99, 0);
  });

  it('calculates percentiles correctly from sorted arrays', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    assert.equal(suite.calculatePercentile(sorted, 50), 6);
    assert.equal(suite.calculatePercentile(sorted, 90), 10);
    assert.equal(suite.calculatePercentile([], 50), 0);
  });

  it('measures operation latency correctly', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    const lat = suite.measureLatency(() => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    });

    assert.ok(typeof lat === 'number');
    assert.ok(lat > 0);
  });

  it('runs throughput test across iterations and calculates latency percentiles', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    const results = suite.runThroughputTest(100);

    assert.equal(results.totalIterations, 100);
    assert.ok(results.elapsedMs > 0);
    assert.ok(results.opsPerSec > 0);
    assert.ok(results.p50 >= 0);
    assert.ok(results.p95 >= results.p50);
    assert.ok(results.p99 >= results.p95);
  });

  it('resets summary metrics accurately', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    suite.runThroughputTest(50);
    assert.equal(suite.getSummaryMetrics().totalIterations, 50);

    suite.reset();
    assert.equal(suite.getSummaryMetrics().totalIterations, 0);
    assert.equal(suite.getSummaryMetrics().opsPerSec, 0);
  });
});
