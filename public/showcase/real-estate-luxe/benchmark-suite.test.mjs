import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeBenchmarkSuite } from './benchmark-suite.js';

test('RealEstateLuxeBenchmarkSuite - percentile calculations calculate correct rank values', () => {
  const suite = new RealEstateLuxeBenchmarkSuite();
  const samples = Array.from({ length: 100 }, (_, i) => i + 1);

  assert.equal(suite.calculatePercentile(samples, 50), 51);
  assert.equal(suite.calculatePercentile(samples, 95), 96);
  assert.equal(suite.calculatePercentile(samples, 99), 100);
});

test('RealEstateLuxeBenchmarkSuite - throughput test executes requested iteration counts and bounds metrics', () => {
  const suite = new RealEstateLuxeBenchmarkSuite();
  const summary = suite.runThroughputTest(200);

  assert.equal(summary.totalIterations, 200);
  assert.ok(summary.opsPerSec > 0);
  assert.ok(summary.elapsedMs >= 0);
  assert.ok(summary.p50 >= 0);
  assert.ok(summary.p95 >= summary.p50);
  assert.ok(summary.p99 >= summary.p95);
});

test('RealEstateLuxeBenchmarkSuite - latency measurement executes operation callback and returns positive duration', () => {
  const suite = new RealEstateLuxeBenchmarkSuite();
  let executed = false;
  const lat = suite.measureLatency(() => {
    let acc = 0;
    for (let i = 0; i < 1000; i++) acc += i;
    executed = true;
  });

  assert.equal(executed, true);
  assert.ok(lat > 0);
});

test('RealEstateLuxeBenchmarkSuite - reset clears summary metrics and buffers', () => {
  const suite = new RealEstateLuxeBenchmarkSuite();
  suite.runThroughputTest(50);
  assert.equal(suite.getSummaryMetrics().totalIterations, 50);

  suite.reset();
  assert.equal(suite.getSummaryMetrics().totalIterations, 0);
  assert.equal(suite.getSummaryMetrics().opsPerSec, 0);
});
