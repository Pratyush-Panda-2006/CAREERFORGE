import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioBenchmarkSuite } from './benchmark-suite.js';

test('MusicDawStudioBenchmarkSuite - computes percentiles from sorted distribution', () => {
  const suite = new MusicDawStudioBenchmarkSuite();
  const sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  assert.equal(suite.calculatePercentile(sorted, 50), 6);
  assert.equal(suite.calculatePercentile(sorted, 90), 10);
  assert.equal(suite.calculatePercentile([], 50), 0);
});

test('MusicDawStudioBenchmarkSuite - measures positive operation latency', () => {
  const suite = new MusicDawStudioBenchmarkSuite();
  const lat = suite.measureLatency(() => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;
    return sum;
  });

  assert.ok(typeof lat === 'number');
  assert.ok(lat > 0);
});

test('MusicDawStudioBenchmarkSuite - runs throughput iterations and generates summary metrics', () => {
  const suite = new MusicDawStudioBenchmarkSuite();
  const summary = suite.runThroughputTest(100);

  assert.equal(summary.totalIterations, 100);
  assert.ok(summary.elapsedMs >= 0);
  assert.ok(summary.opsPerSec >= 0);
  assert.ok(summary.p50 <= summary.p95);
  assert.ok(summary.p95 <= summary.p99);

  const fromGetter = suite.getSummaryMetrics();
  assert.equal(fromGetter.totalIterations, 100);
});
