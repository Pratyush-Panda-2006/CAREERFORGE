import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansStressBenchmarkEngine } from './telemetry-stress-tester.js';

test('CharityMicroloansStressBenchmarkEngine - computes zero jitter for empty or single delta list', () => {
  const engine = new CharityMicroloansStressBenchmarkEngine();
  assert.strictEqual(engine.measureFrameJitter([]), 0);
  assert.strictEqual(engine.measureFrameJitter([16.6]), 0);
});

test('CharityMicroloansStressBenchmarkEngine - calculates frame jitter delta math accurately', () => {
  const engine = new CharityMicroloansStressBenchmarkEngine();
  // deltas: 16, 20 (diff 4), 18 (diff 2), 22 (diff 4) -> sum = 10, avg = 10 / 3 = 3.33
  const jitter = engine.measureFrameJitter([16, 20, 18, 22]);
  assert.strictEqual(jitter, 3.33);
});

test('CharityMicroloansStressBenchmarkEngine - clamps composite score within 0 to 100 range', () => {
  const engine = new CharityMicroloansStressBenchmarkEngine();
  const perfect = engine.computeCompositeScore(60, 0, 10);
  assert.ok(perfect <= 100 && perfect >= 0);

  const degraded = engine.computeCompositeScore(5, 50, 400);
  assert.ok(degraded <= 100 && degraded >= 0);
});

test('CharityMicroloansStressBenchmarkEngine - executes stress test iterations and generates summary report', () => {
  const engine = new CharityMicroloansStressBenchmarkEngine();
  const summary = engine.runStressTest(100);

  assert.strictEqual(summary.iterations, 100);
  assert.ok(summary.compositeScore >= 0 && summary.compositeScore <= 100);
  assert.ok(['OPTIMAL', 'STABLE', 'DEGRADED'].includes(summary.rating));
  assert.strictEqual(engine.getSummary().iterations, 100);
});
