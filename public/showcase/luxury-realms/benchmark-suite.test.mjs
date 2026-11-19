import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsBenchmarkSuite } from './benchmark-suite.js';

test('LuxuryRealmsBenchmarkSuite percentile calculation handles edge cases', () => {
  const suite = new LuxuryRealmsBenchmarkSuite();
  assert.equal(suite.calculatePercentile([], 50), 0);
  assert.equal(suite.calculatePercentile([10, 20, 30, 40, 50], 50), 30);
  assert.equal(suite.calculatePercentile([10, 20, 30, 40, 50], 95), 50);
});

test('LuxuryRealmsBenchmarkSuite measures latency correctly', () => {
  const suite = new LuxuryRealmsBenchmarkSuite();
  const latency = suite.measureLatency(() => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;
    return sum;
  });
  assert.equal(typeof latency, 'number');
  assert.ok(latency >= 0.001);
});

test('LuxuryRealmsBenchmarkSuite executes throughput tests and generates summary metrics', () => {
  const suite = new LuxuryRealmsBenchmarkSuite();
  const res = suite.runThroughputTest(50);

  assert.equal(res.totalIterations, 50);
  assert.ok(res.elapsedMs >= 0);
  assert.ok(res.opsPerSec >= 0);
  assert.ok(res.avgLatencyMs >= 0);
  assert.ok(res.p50 >= 0);
  assert.ok(res.p95 >= 0);
  assert.ok(res.p99 >= 0);

  const metrics = suite.getSummaryMetrics();
  assert.equal(metrics.totalIterations, 50);
});
