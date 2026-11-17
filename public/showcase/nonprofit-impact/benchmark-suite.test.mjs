import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactBenchmarkSuite, percentile } from './benchmark-suite.js';

function fixture(options = {}) {
  let time = 0;
  let nextId = 0;
  const frames = new Map();
  const suite = new NonprofitImpactBenchmarkSuite({ now: () => time,
    requestFrame: (callback) => { frames.set(++nextId, callback); return nextId; },
    cancelFrame: (id) => frames.delete(id), readMemory: () => null, batchSize: 2,
    operation: () => { time += .5; return 7; }, ...options });
  const frame = (delay = 16) => {
    time += delay;
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  };
  return { suite, frames, frame, advance: (ms) => { time += ms; } };
}

test('nearest-rank percentiles include boundaries and do not mutate input', () => {
  const samples = [9, 2, 5, 1, 3];
  assert.equal(percentile(samples, 0), 1);
  assert.equal(percentile(samples, 50), 3);
  assert.equal(percentile(samples, 95), 9);
  assert.equal(percentile(samples, 99), 9);
  assert.equal(percentile(samples, 100), 9);
  assert.deepEqual(samples, [9, 2, 5, 1, 3]);
  assert.equal(percentile([], 50), null);
});

test('invalid samples and percentile bounds are rejected', () => {
  for (const value of [-1, 101, NaN, Infinity]) assert.throws(() => percentile([1], value));
  for (const samples of [[NaN], [Infinity], [-1], '1,2']) assert.throws(() => percentile(samples, 50));
});

test('empty and single-frame runs never invent a frame rate', async () => {
  const { suite, frame } = fixture();
  assert.equal(suite.getSummaryMetrics().fps, null);
  assert.equal(suite.getSummaryMetrics().latency.p50, null);
  const pending = suite.runThroughputTest(1);
  frame();
  const result = await pending;
  assert.equal(result.fps, null);
  assert.equal(result.completed, 1);
  assert.equal(result.latency.p50, .5);
});

test('measures actual frame intervals, operation samples and bounded completion', async () => {
  const { suite, frame, frames } = fixture();
  const pending = suite.runThroughputTest(5);
  frame(); frame(); frame();
  const result = await pending;
  assert.equal(result.status, 'complete');
  assert.equal(result.completed, 5);
  assert.equal(result.samples, 5);
  assert.deepEqual(result.latency, { p50: .5, p95: .5, p99: .5 });
  assert.ok(Math.abs(result.fps - 1000 / 17) < 1e-10);
  assert.equal(result.elapsedMs, 50.5);
  assert.equal(frames.size, 0);
});

test('iteration, load and execution safety bounds are enforced before scheduling', () => {
  const { suite, frames } = fixture();
  for (const value of [0, -1, 50001, 1.1, NaN, Infinity]) assert.throws(() => suite.runThroughputTest(value));
  assert.throws(() => suite.runThroughputTest(5, { spikeFactor: 33 }));
  assert.throws(() => fixture({ batchSize: 501 }));
  assert.throws(() => fixture({ frameBudgetMs: 9 }));
  assert.throws(() => fixture({ maxDurationMs: 30001 }));
  assert.equal(frames.size, 0);
});

test('only one run can execute, and Stop settles it with partial measurements', async () => {
  const { suite, frame, frames } = fixture();
  const pending = suite.runThroughputTest(100);
  assert.throws(() => suite.runThroughputTest(2), /already running/);
  frame();
  suite.stop();
  suite.stop();
  const result = await pending;
  assert.equal(result.status, 'stopped');
  assert.equal(result.completed, 2);
  assert.equal(frames.size, 0);
});

test('cancelled callbacks cannot change a later run, and metrics reset between runs', async () => {
  const { suite, frame, frames } = fixture();
  const first = suite.runThroughputTest(100);
  const staleCallback = frames.values().next().value;
  suite.stop();
  await first;
  const second = suite.runThroughputTest(1);
  staleCallback(99999);
  frame();
  const result = await second;
  assert.equal(result.status, 'complete');
  assert.equal(result.completed, 1);
  assert.equal(result.samples, 1);
});

test('time limits settle a partial run rather than continuing indefinitely', async () => {
  const { suite, frame, frames } = fixture({ maxDurationMs: 100 });
  const pending = suite.runThroughputTest(100);
  frame();
  frame(100);
  const result = await pending;
  assert.equal(result.status, 'limit');
  assert.equal(result.completed, 2);
  assert.equal(frames.size, 0);
});

test('missing, invalid and throwing memory APIs report unavailable without failing work', async () => {
  for (const readMemory of [() => null, () => undefined, () => -1, () => Infinity, () => { throw new Error('restricted'); }]) {
    const { suite, frame } = fixture({ readMemory });
    const pending = suite.runThroughputTest(1);
    frame();
    assert.equal((await pending).memoryBytes, null);
  }
  assert.equal(fixture({ readMemory: () => 1048576 }).suite.getSummaryMetrics().memoryBytes, 1048576);
});

test('workload failures reject, release scheduled work and allow a fresh run', async () => {
  const { suite, frame, frames } = fixture({ operation: () => { throw new Error('work failed'); } });
  const pending = suite.runThroughputTest(10);
  frame();
  await assert.rejects(pending, /work failed/);
  assert.equal(suite.running, false);
  assert.equal(frames.size, 0);
  suite.operation = () => 1;
  const next = suite.runThroughputTest(1);
  frame();
  assert.equal((await next).status, 'complete');
});

test('a progress callback can stop without scheduling an extra frame', async () => {
  let instance;
  const { suite, frames } = fixture({ onProgress: (summary) => { if (summary.status === 'running') instance.stop(); } });
  instance = suite;
  const result = await suite.runThroughputTest(10);
  assert.equal(result.status, 'stopped');
  assert.equal(frames.size, 0);
});

test('non-monotonic operation clocks reject the measurement', () => {
  let time = 2;
  const { suite } = fixture({ now: () => time-- });
  assert.throws(() => suite.measureLatency(() => 0), /monotonic/);
});

test('a busy frame yields before processing the rest of its batch', async () => {
  let time = 0;
  const { suite, frame } = fixture({ batchSize: 20, frameBudgetMs: 4, now: () => time,
    operation: () => { time += 3; return 1; } });
  const pending = suite.runThroughputTest(100);
  frame();
  assert.equal(suite.getSummaryMetrics().completed, 2);
  suite.stop();
  assert.equal((await pending).completed, 2);
});
