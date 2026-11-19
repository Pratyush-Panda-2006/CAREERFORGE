import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayMonteCarloEngine as Engine, summarize } from './simulation-sandbox.js';
const near = (a, b, tolerance = 1e-10) => assert.ok(Math.abs(a - b) < tolerance, a + ' vs ' + b);

test('known outcomes give interpolated quantiles and population standard deviation', () => {
  const s = summarize([10, 2, 8, 4], 7);
  near(s.mean, 6); near(s.standardDeviation, Math.sqrt(10));
  near(s.percentiles.p10, 2.6); near(s.percentiles.p25, 3.5); near(s.percentiles.p50, 6); near(s.percentiles.p90, 9.4);
  assert.equal(s.late, 2); assert.equal(s.minimum, 2); assert.equal(s.maximum, 10);
});
test('bins retain every outcome, include the upper edge and handle constant distributions', () => {
  for (const values of [[1], [30, 30, 30], Array.from({ length: 1000 }, (_, i) => 1 + i / 3)]) {
    const s = summarize(values, 30);
    assert.equal(s.histogram.bins.reduce((sum, bin) => sum + bin.count, 0), values.length);
    assert.equal(s.histogram.bins.length, 24);
    for (let i = 1; i < 24; i++) assert.equal(s.histogram.bins[i - 1].high, s.histogram.bins[i].low);
    if (s.minimum !== s.maximum) assert.ok(s.histogram.bins[23].count > 0);
    else { near(s.standardDeviation, 0); assert.equal(s.histogram.bins[12].count, values.length); }
  }
});
test('Wilson bounds match an independent numerical inversion of the score statistic', () => {
  const z = 1.959963984540054;
  let cases = 0;
  for (const n of [1, 3, 10, 30, 101]) for (let successes = 0; successes <= n; successes++) {
    const values = Array.from({ length: n }, (_, i) => i < successes ? 2 : 1);
    const actual = summarize(values, 1).lateInterval, p = successes / n;
    const score = q => Math.abs(p - q) / Math.sqrt(q * (1 - q) / n);
    const solve = lower => {
      if (lower && successes === 0) return 0;
      if (!lower && successes === n) return 1;
      let lo = lower ? 0 : p, hi = lower ? p : 1;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (lower ? score(mid) > z : score(mid) < z) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    near(actual[0], solve(true), 1e-12); near(actual[1], solve(false), 1e-12); cases++;
  }
  assert.equal(cases, 150);
});
test('summary inputs stay detached and invalid data is rejected', () => {
  const values = [1, 2, 3], copy = [...values], s = summarize(values, 2);
  assert.deepEqual(values, copy); assert.ok(Object.isFrozen(s.percentiles)); assert.ok(Object.isFrozen(s.histogram.bins[0]));
  for (const bad of [[], [NaN], [Infinity], ['3'], null, Array(50001).fill(1)]) assert.throws(() => summarize(bad, 2));
  assert.throws(() => summarize([1], NaN)); assert.throws(() => summarize([1], 0));
});
test('the default engine commits exactly 1,000 reproducible outcomes', async () => {
  const a = new Engine(), b = new Engine();
  assert.equal(a.getStandardDeviation(), 0); assert.equal(a.calculatePercentiles(), null);
  await a.runSimulation(); await b.runSimulation();
  assert.equal(a.results.length, 1000); assert.deepEqual(a.results, b.results);
  near(a.getStandardDeviation(), a.summary.standardDeviation); assert.equal(a.calculatePercentiles(), a.summary.percentiles);
  assert.ok(Object.isFrozen(a.results)); assert.ok(Object.isFrozen(a.summary.parameters));
  const different = new Engine({ seed: 18 }); await different.runSimulation(); assert.notDeepEqual(a.results, different.results);
});
test('zero volatility is exact and the physical minimum is respected', async () => {
  const e = new Engine({ baseline: 5, deadline: 5, seed: 0 });
  await e.runSimulation(100, 0); assert.ok(e.results.every(value => value === 5)); near(e.getStandardDeviation(), 0); assert.equal(e.summary.late, 0);
  await e.runSimulation(5000, .6); assert.ok(e.results.every(value => Number.isFinite(value) && value >= 1)); assert.ok(e.results.includes(1));
});
test('seeded normal sampling converges to independent theoretical moments and tails', async () => {
  const e = new Engine({ baseline: 100, deadline: 110, seed: 123456789 });
  await e.runSimulation(50000, .05);
  const z = e.results.map(value => (value / 100 - 1) / .05);
  const mean = z.reduce((a, b) => a + b, 0) / z.length;
  const second = z.reduce((a, b) => a + b * b, 0) / z.length;
  assert.ok(Math.abs(mean) < .02); assert.ok(Math.abs(second - 1) < .025);
  near(z.filter(value => value < 0).length / z.length, .5, .01);
  near(z.filter(value => value > 1.959963984540054).length / z.length, .025, .004);
});
test('progress reaches the requested trial count and quantile bounds remain sorted', async () => {
  const e = new Engine(), progress = [];
  const s = await e.runSimulation(1100, .2, { onProgress: (done, total) => progress.push([done, total]) });
  assert.deepEqual(progress, [[250, 1100], [500, 1100], [750, 1100], [1000, 1100], [1100, 1100]]);
  const quantiles = Object.values(s.percentiles);
  assert.deepEqual(quantiles, [...quantiles].sort((a, b) => a - b)); assert.ok(quantiles[0] >= s.minimum && quantiles.at(-1) <= s.maximum);
});
test('bad settings do not erase an earlier committed run', async () => {
  const e = new Engine(); await e.runSimulation(); const previous = e.results;
  for (const [n, v] of [[99, .2], [50001, .2], [100.5, .2], [NaN, .2], [100, -.1], [100, .61], [100, Infinity]]) await assert.rejects(e.runSimulation(n, v));
  await assert.rejects(e.runSimulation(100, .2, { onProgress: 3 })); assert.equal(e.results, previous);
  for (const config of [{ seed: -1 }, { seed: .5 }, { seed: 4294967296 }, { baseline: 0 }, { deadline: NaN }]) assert.throws(() => new Engine(config));
});
test('cancellation is atomic, leaves prior results intact and supports retry', async () => {
  const e = new Engine(); await e.runSimulation(100, .1); const previous = e.results;
  const controller = new AbortController();
  await assert.rejects(e.runSimulation(50000, .3, { signal: controller.signal, onProgress: () => controller.abort() }), { name: 'AbortError' });
  assert.equal(e.results, previous); assert.equal(e.summary.count, 100);
  const already = new AbortController(); already.abort();
  await assert.rejects(e.runSimulation(100, .2, { signal: already.signal }), { name: 'AbortError' });
  await e.runSimulation(1000, .1); assert.equal(e.results.length, 1000);
});
test('an older in-flight run cannot overwrite a newer run', async () => {
  const e = new Engine();
  const first = e.runSimulation(50000, .5);
  const rejection = assert.rejects(first, { name: 'AbortError' });
  await e.runSimulation(100, 0); await rejection;
  assert.equal(e.summary.count, 100); assert.ok(e.results.every(value => value === 30));
});
