import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixCostOptimizerEngine } from './cost-optimizer.js';

const calculate = inputs => new DefiYieldMatrixCostOptimizerEngine().calculatePricing(inputs);

test('default quote has zero usage and a serializable explicit demo contract', () => {
  const quote = calculate();
  assert.equal(quote.totalCents, 0);
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.demo, true);
  assert.equal(quote.tariffId, 'defi-yield-matrix-v1');
  assert.equal(quote.resources.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(quote)), quote);
});

test('graduated bands discount only units above each boundary', () => {
  const expectations = [[0, 0], [1, 25], [100, 2500], [101, 2523], [1000, 22750], [1001, 22770]];
  for (const [compute, expected] of expectations) assert.equal(calculate({ compute }).totalCents, expected, String(compute));
  assert.deepEqual(calculate({ compute: 1001 }).resources[0].bands.map(b => b.units), [100, 900, 1]);
});

test('demo tier API returns exact discount basis points and rejects prototype names', () => {
  const engine = new DefiYieldMatrixCostOptimizerEngine();
  assert.equal(engine.applyVolumeDiscount('base'), 0);
  assert.equal(engine.applyVolumeDiscount('growth'), 1000);
  assert.equal(engine.applyVolumeDiscount('scale'), 2000);
  for (const tier of ['constructor', 'toString', '__proto__', 'unknown', 1]) assert.throws(() => engine.applyVolumeDiscount(tier), /Unknown/);
});

test('all three resources retain their individual unit tariffs', () => {
  assert.equal(calculate({ compute: 1, storage: 1, bandwidth: 1 }).totalCents, 35);
  const quote = calculate({ compute: 320, storage: 200, bandwidth: 500 });
  assert.deepEqual(quote.resources.map(r => r.amountCents), [7450, 570, 3220]);
  assert.equal(quote.totalCents, 11240);
});

test('annual prepayment uses unrounded usage before per-resource half-up rounding', () => {
  assert.equal(calculate({ compute: 101, billing: 'annual' }).totalCents, 27243);
  const quote = calculate({ compute: 320, storage: 200, bandwidth: 500, billing: 'annual' });
  assert.equal(quote.totalCents, 121392);
  assert.equal(quote.monthlyEquivalentCents, 10116);
  assert.equal(quote.annualDiscountCents, 13488);
});

test('money breakdown reconciles exactly for monthly and annual invoices', () => {
  for (const billing of ['monthly', 'annual']) for (const compute of [0, 1, 99, 100, 101, 999, 1000, 1001, 98765, 1000000]) {
    const quote = calculate({ compute, storage: 101, bandwidth: 1001, billing });
    assert.equal(quote.subtotalCents - quote.volumeDiscountCents - quote.annualDiscountCents, quote.totalCents);
    assert.equal(quote.resources.reduce((sum, r) => sum + r.amountCents, 0), quote.totalCents);
  }
});

test('cost does not drop when a resource crosses a graduated threshold', () => {
  for (const key of ['compute', 'storage', 'bandwidth']) {
    let previous = -1;
    for (const units of [98, 99, 100, 101, 102, 998, 999, 1000, 1001, 1002]) {
      const current = calculate({ [key]: units }).totalCents;
      assert.ok(current >= previous, `Monotonicity violated for ${key} at ${units}`);
      previous = current;
    }
  }
});

test('invalid and fractional quantities fail rather than being coerced or clamped', () => {
  for (const value of [-1, 1.5, NaN, Infinity, -Infinity, '10', null, undefined, true]) {
    assert.throws(() => calculate({ compute: value }), /whole number/);
  }
});

test('invalid containers, unsupported fields, accessors and billing periods are rejected', () => {
  assert.throws(() => calculate(null), /Supply an object/);
  assert.throws(() => calculate([]), /Supply an object/);
  assert.throws(() => calculate({ unknown: 10 }), /Only plain resource values/);
  assert.throws(() => calculate({ compute: 10, billing: 'weekly' }), /Choose monthly or annual/);
});

test('a failed calculation clears the exportable quote instead of exporting stale values', () => {
  const engine = new DefiYieldMatrixCostOptimizerEngine();
  engine.calculatePricing({ compute: 10 });
  assert.throws(() => engine.calculatePricing({ compute: -1 }), /whole number/);
  assert.throws(() => engine.generateQuote(), /Calculate valid resource inputs/);
});

test('returned and exported quotes are defensive copies of the current calculation', () => {
  const engine = new DefiYieldMatrixCostOptimizerEngine();
  const returned = engine.calculatePricing({ compute: 10 });
  const exported = engine.generateQuote();
  assert.notEqual(returned, exported);
  returned.totalCents = 999;
  assert.equal(engine.generateQuote().totalCents, 250);
});

test('small monthly inputs agree with an independent rational-arithmetic baseline', () => {
  const quote = calculate({ compute: 50, storage: 50, bandwidth: 50 });
  assert.equal(quote.totalCents, 50 * 25 + 50 * 3 + 50 * 7);
});
