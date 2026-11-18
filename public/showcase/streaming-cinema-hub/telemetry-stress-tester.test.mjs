import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubStressBenchmarkEngine } from './telemetry-stress-tester.js';

test('StreamingCinemaHubStressBenchmarkEngine - computes zero jitter for empty or single delta list', () => {
  const engine = new StreamingCinemaHubStressBenchmarkEngine();
  assert.strictEqual(engine.measureFrameJitter([]), 0);
  assert.strictEqual(engine.measureFrameJitter([16.6]), 0);
});

test('StreamingCinemaHubStressBenchmarkEngine - calculates frame jitter delta math accurately', () => {
  const engine = new StreamingCinemaHubStressBenchmarkEngine();
  const jitter = engine.measureFrameJitter([16, 20, 18, 22]);
  assert.strictEqual(jitter, 3.33);
});

test('StreamingCinemaHubStressBenchmarkEngine - clamps composite score within 0 to 100 range', () => {
  const engine = new StreamingCinemaHubStressBenchmarkEngine();
  const perfect = engine.computeCompositeScore(60, 0, 10);
  assert.ok(perfect <= 100 && perfect >= 0);

  const degraded = engine.computeCompositeScore(5, 50, 400);
  assert.ok(degraded <= 100 && degraded >= 0);
});

test('StreamingCinemaHubStressBenchmarkEngine - executes stress test iterations and generates summary report', () => {
  const engine = new StreamingCinemaHubStressBenchmarkEngine();
  const summary = engine.runStressTest(100);

  assert.strictEqual(summary.iterations, 100);
  assert.ok(summary.compositeScore >= 0 && summary.compositeScore <= 100);
  assert.ok(['OPTIMAL', 'STABLE', 'DEGRADED'].includes(summary.rating));
  assert.strictEqual(engine.getSummary().iterations, 100);
});
