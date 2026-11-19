import test from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansMonteCarloEngine, SeededScenarioRandom, percentile, probabilityInterval, summarizeLosses } from './simulation-sandbox.js';
test('seeded uniform recurrence is reproducible and excludes both endpoints', () => {
  const a = new SeededScenarioRandom(1), b = new SeededScenarioRandom(1);
  assert.equal(a.uniform(), 1015568748.5 / 4294967296); b.uniform();
  for (let i = 0; i < 1000; i++) { const value = a.uniform(); assert.equal(value, b.uniform()); assert.ok(value > 0 && value < 1); }
});
test('Gaussian generator converges in mean, variance and tails', () => {
  const rng = new SeededScenarioRandom(5021); let sum = 0, squares = 0, tails = 0;
  for (let i = 0; i < 100000; i++) { const z = rng.normal(); sum += z; squares += z * z; if (Math.abs(z) > 2) tails++; }
  assert.ok(Math.abs(sum / 100000) < .015); assert.ok(Math.abs(squares / 100000 - 1) < .025); assert.ok(Math.abs(tails / 100000 - .0455) < .004);
});
test('known interpolated quantiles preserve the input and numeric ordering', () => {
  const values = [100, 0, 50, 25];
  assert.equal(percentile(values, 0), 0); assert.equal(percentile(values, 1), 100); assert.equal(percentile(values, .5), 37.5); assert.ok(Math.abs(percentile(values, .95) - 92.5) < 1e-10); assert.equal(percentile([5], .95), 5); assert.deepEqual(values, [100, 0, 50, 25]);
  for (const q of [-1, 1.1, NaN]) assert.throws(() => percentile(values, q)); assert.throws(() => percentile([], .5));
});
test('population deviation, strict budget boundary and histogram conservation', () => {
  const result = summarizeLosses([0, 200, 0, 200], 200, 100);
  assert.equal(result.mean, 100); assert.equal(result.standardDeviation, 100); assert.equal(result.exceeded, 2); assert.equal(result.bins.reduce((a, b) => a + b.count, 0), 4); assert.equal(result.bins[0].count, 2); assert.equal(result.bins.at(-1).count, 2);
  assert.equal(summarizeLosses([200], 200, 200).exceeded, 0); assert.throws(() => summarizeLosses([1.5], 2, 1));
});
test('probability intervals agree with independent score-equation inversion', () => {
  const z2 = 1.959963984540054 ** 2;
  for (const n of [1, 2, 5, 10, 100, 1000]) for (let j = 0; j <= 25; j++) {
    const k = Math.round(n * j / 25), p = k / n, observed = probabilityInterval(k, n), equation = x => (x - p) ** 2 - z2 * x * (1 - x) / n;
    let low = 0, high = p;
    for (let i = 0; i < 80; i++) { const mid = (low + high) / 2; if (equation(mid) > 0) low = mid; else high = mid; }
    assert.ok(Math.abs(observed.lower - (low + high) / 2) < 1e-10); low = p; high = 1;
    for (let i = 0; i < 80; i++) { const mid = (low + high) / 2; if (equation(mid) < 0) low = mid; else high = mid; }
    assert.ok(Math.abs(observed.upper - (low + high) / 2) < 1e-10);
  }
});
test('exact no-default and all-default loss limits, including paisa rounding', async () => {
  const zero = new CharityMicroloansMonteCarloEngine({ defaultRate: 0, budgetPaise: 0 }); const a = await zero.runSimulation(); assert.equal(a.mean, 0); assert.equal(a.standardDeviation, 0); assert.equal(a.exceeded, 0); assert.ok(a.interval.upper > 0);
  const full = new CharityMicroloansMonteCarloEngine({ loans: 2, principalPaise: 10001, defaultRate: 1, recoveryRate: .3333, budgetPaise: 13336 }); const b = await full.runSimulation(); assert.equal(b.unitLoss, 6668); assert.ok(b.values.every(v => v === 13336)); assert.equal(b.mean, 13336); assert.equal(b.p95, 13336); assert.equal(b.exceeded, 0); assert.equal(full.getStandardDeviation(), 0); assert.deepEqual(full.calculatePercentiles(), { low: 13336, median: 13336, p95: 13336, high: 13336 });
});
test('full recovery has no loss even with a shared shock', async () => {
  const e = new CharityMicroloansMonteCarloEngine({ recoveryRate: 1, budgetPaise: 0 }); const result = await e.runSimulation(1000, .2); assert.equal(result.mean, 0); assert.equal(result.bins.length, 1); assert.equal(result.bins[0].count, 1000); assert.equal(result.p95, 0);
});
test('zero-shock binomial moments and count distribution have independent oracles', async () => {
  const n = 25, p = .12, principal = 100000, loss = 75000, e = new CharityMicroloansMonteCarloEngine({ loans: n, principalPaise: principal, defaultRate: p, recoveryRate: .25, budgetPaise: 500000, seed: 307 });
  const r = await e.runSimulation(50000, 0), mean = n * p * loss, deviation = Math.sqrt(n * p * (1 - p)) * loss;
  assert.ok(Math.abs(r.mean - mean) < deviation * .02); assert.ok(Math.abs(r.standardDeviation - deviation) < deviation * .02); assert.equal(r.reference.mean, mean); assert.equal(r.reference.standardDeviation, deviation);
  const counts = Array(n + 1).fill(0); for (const value of r.values) counts[value / loss]++; let mass = (1 - p) ** n;
  for (let k = 0; k <= n; k++) { if (k) mass *= (n - k + 1) / k * p / (1 - p); assert.ok(Math.abs(counts[k] / 50000 - mass) < 5 * Math.sqrt(mass * (1 - mass) / 50000) + 1 / 50000); }
});
test('same assumptions and seed reproduce results; a changed seed changes scenarios', async () => {
  const a = await new CharityMicroloansMonteCarloEngine().runSimulation(1000, .1), b = await new CharityMicroloansMonteCarloEngine().runSimulation(1000, .1), c = await new CharityMicroloansMonteCarloEngine({ seed: 43 }).runSimulation(1000, .1);
  assert.deepEqual(a, b); assert.notDeepEqual(a.values, c.values); assert.ok(a.values.every(v => v >= 0 && v <= 20000000)); assert.throws(() => { a.values.push(1); }); assert.throws(() => { a.parameters.loans = 2; });
});
test('cancellation preserves the last completed result and retry succeeds', async () => {
  const engine = new CharityMicroloansMonteCarloEngine(), old = await engine.runSimulation(), control = new AbortController(), progress = [];
  await assert.rejects(engine.runSimulation(50000, .2, { signal: control.signal, onProgress: p => progress.push(p), yieldControl: async () => control.abort() }), { name: 'AbortError' }); assert.equal(engine.results, old); assert.ok(progress.at(-1) < 1);
  const retry = await engine.runSimulation(1000, .2, { onProgress: p => progress.push(p) }); assert.equal(retry.parameters.trials, 1000); assert.equal(progress.at(-1), 1);
});
test('a superseded run cannot replace the newer result', async () => {
  const engine = new CharityMicroloansMonteCarloEngine(); let newer;
  await assert.rejects(engine.runSimulation(50000, .1, { yieldControl: async () => { newer = await engine.runSimulation(1000, 0); } }), { name: 'AbortError' }); assert.equal(engine.results, newer); assert.equal(engine.results.parameters.volatility, 0);
});
test('invalid parameters and run sizes fail without losing completed results', async () => {
  for (const options of [{ loans: 0 }, { loans: 501 }, { loans: 1.5 }, { principalPaise: NaN }, { defaultRate: -1 }, { recoveryRate: 1.1 }, { budgetPaise: 99999999999 }, { seed: -1 }]) assert.throws(() => new CharityMicroloansMonteCarloEngine(options), RangeError);
  const e = new CharityMicroloansMonteCarloEngine(); assert.equal(e.getStandardDeviation(), null); const old = await e.runSimulation();
  for (const size of [0, 999, 50001, NaN]) await assert.rejects(e.runSimulation(size), RangeError);
  for (const shock of [-.1, .26, NaN]) await assert.rejects(e.runSimulation(1000, shock), RangeError); assert.equal(e.results, old);
  await assert.rejects(e.runSimulation(1000, 0, { onProgress: () => { throw Error('synthetic failure'); } }), /synthetic failure/); assert.equal(e.results, old);
});
