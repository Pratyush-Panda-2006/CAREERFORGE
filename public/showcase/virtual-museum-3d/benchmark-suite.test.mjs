import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dBenchmarkSuite } from './benchmark-suite.js';

test('VirtualMuseum3dBenchmarkSuite - initialization & defaults', () => {
  const suite = new VirtualMuseum3dBenchmarkSuite({ name: 'Virtual Museum 3D Stress Test' });
  assert.equal(suite.name, 'Virtual Museum 3D Stress Test');
  assert.equal(suite.isRunning, false);
  const metrics = suite.getSummaryMetrics();
  assert.equal(metrics.totalIterations, 0);
  assert.equal(metrics.opsPerSec, 0);
});

test('VirtualMuseum3dBenchmarkSuite - calculatePercentile handles empty and sorted sets', () => {
  const suite = new VirtualMuseum3dBenchmarkSuite();
  assert.equal(suite.calculatePercentile([], 50), 0);
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  assert.equal(suite.calculatePercentile(data, 50), 6);
  assert.equal(suite.calculatePercentile(data, 95), 10);
});

test('VirtualMuseum3dBenchmarkSuite - measureLatency executes callback and records non-zero time', () => {
  const suite = new VirtualMuseum3dBenchmarkSuite();
  let counter = 0;
  const lat = suite.measureLatency(() => {
    for (let i = 0; i < 500; i++) counter += i;
  });
  assert.ok(lat > 0);
  assert.ok(counter > 0);
});

test('VirtualMuseum3dBenchmarkSuite - runThroughputTest executes specified iterations and populates metrics', () => {
  const suite = new VirtualMuseum3dBenchmarkSuite();
  const summary = suite.runThroughputTest(100);

  assert.equal(summary.totalIterations, 100);
  assert.ok(summary.elapsedMs >= 0);
  assert.ok(summary.opsPerSec > 0);
  assert.ok(summary.p50 >= 0);
  assert.ok(summary.p95 >= 0);
  assert.ok(summary.p99 >= 0);
  assert.ok(summary.avgLatencyMs >= 0);
});

test('VirtualMuseum3dBenchmarkSuite - reset clears buffer and metrics', () => {
  const suite = new VirtualMuseum3dBenchmarkSuite();
  suite.runThroughputTest(50);
  assert.equal(suite.getSummaryMetrics().totalIterations, 50);

  suite.reset();
  assert.equal(suite.getSummaryMetrics().totalIterations, 0);
  assert.equal(suite.sampleBuffer.length, 0);
});
