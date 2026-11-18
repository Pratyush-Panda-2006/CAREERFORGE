import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubBenchmarkSuite } from './benchmark-suite.js';

test('GamingEsportsHubBenchmarkSuite - initialization & defaults', () => {
  const suite = new GamingEsportsHubBenchmarkSuite({ name: 'Esports Test Rig' });
  assert.equal(suite.name, 'Esports Test Rig');
  assert.equal(suite.isRunning, false);
  const metrics = suite.getSummaryMetrics();
  assert.equal(metrics.totalIterations, 0);
  assert.equal(metrics.opsPerSec, 0);
});

test('calculatePercentile calculates correct percentile values', () => {
  const suite = new GamingEsportsHubBenchmarkSuite();
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(suite.calculatePercentile(sorted, 50), 6);
  assert.equal(suite.calculatePercentile(sorted, 90), 10);
  assert.equal(suite.calculatePercentile([], 50), 0);
});

test('measureLatency executes workload and returns positive duration', () => {
  const suite = new GamingEsportsHubBenchmarkSuite();
  let count = 0;
  const lat = suite.measureLatency(() => {
    for (let i = 0; i < 500; i++) count += i;
  });
  assert.ok(lat > 0, 'Latency must be greater than 0');
  assert.ok(count > 0);
});

test('runThroughputTest computes full summary metrics', () => {
  const suite = new GamingEsportsHubBenchmarkSuite();
  const summary = suite.runThroughputTest(100);
  assert.equal(summary.totalIterations, 100);
  assert.ok(summary.elapsedMs >= 0);
  assert.ok(summary.opsPerSec > 0);
  assert.ok(summary.p50 >= 0);
  assert.ok(summary.p95 >= 0);
  assert.ok(summary.p99 >= 0);
  assert.ok(summary.avgLatencyMs >= 0);
});

test('reset clears summary and samples', () => {
  const suite = new GamingEsportsHubBenchmarkSuite();
  suite.runThroughputTest(50);
  assert.equal(suite.getSummaryMetrics().totalIterations, 50);
  suite.reset();
  assert.equal(suite.getSummaryMetrics().totalIterations, 0);
  assert.equal(suite.sampleBuffer.length, 0);
});
