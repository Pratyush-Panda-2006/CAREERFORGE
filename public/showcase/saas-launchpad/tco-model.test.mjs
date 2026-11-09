import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTco, DEFAULT_RATES, estimateText } from './tco-model.js';
const input = { clusters: 4, egress: 1000, hourly: 75 };
test('36-month totals include recurring components and one-time setup', () => {
  const result = compareTco(input, DEFAULT_RATES);
  assert.deepEqual(result.scenarios.map(row => row.total), [4644000, 6960000, 3276000]);
  assert.equal(result.scenarios[1].setup, 1200000);
  for (const row of result.scenarios) assert.equal(row.total, row.infrastructure + row.transfer + row.engineering + row.setup);
  assert.equal(result.annualDifference[0].cents, 456000);
});
test('zero usage plus zero engineering/setup produces zero costs and differences', () => {
  const rates = DEFAULT_RATES.map(row => ({ ...row, hours: 0, setupCluster: 0 }));
  const result = compareTco({ clusters: 0, egress: 0, hourly: 0 }, rates);
  assert.ok(result.scenarios.every(row => row.total === 0)); assert.ok(result.annualDifference.every(row => row.cents === 0));
});
test('more expensive Launchpad scenario reports a negative saving', () => {
  const rates = DEFAULT_RATES.map(row => ({ ...row, hours: 0, setupCluster: 0 })); rates[2].monthlyCluster = 10000;
  assert.ok(compareTco(input, rates).annualDifference.every(row => row.cents < 0));
});
test('invalid, nonfinite and out-of-bound assumptions fail explicitly', () => {
  for (const clusters of [-1, 1.5, 1001, NaN, Infinity, '4']) assert.throws(() => compareTco({ ...input, clusters }, DEFAULT_RATES));
  assert.throws(() => compareTco({ ...input, egress: -1 }, DEFAULT_RATES));
  assert.throws(() => compareTco(input, []));
  for (const key of ['monthlyCluster', 'egress', 'hours', 'setupCluster']) assert.throws(() => compareTco(input, DEFAULT_RATES.map(row => ({ ...row, [key]: -1 }))));
});
test('monthly components round to cents before accumulation and inputs stay unchanged', () => {
  const rates = DEFAULT_RATES.map(row => ({ ...row, egress: 0.001 }));
  const result = compareTco({ ...input, egress: 1 }, rates);
  assert.equal(result.scenarios[0].transfer, 0); assert.equal(rates[0].egress, 0.001);
});
test('download includes assumptions, exclusions and units with exact snapshot totals', () => {
  const result = compareTco(input, DEFAULT_RATES); const text = estimateText(result);
  assert.match(text, /NOT A VENDOR QUOTE/); assert.match(text, /integer USD cents/); assert.match(text, /4644000/); assert.match(text, /invented demo/);
});
