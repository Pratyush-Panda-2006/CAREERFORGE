import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridCostOptimizerEngine } from './cost-optimizer.js';

const calculate = inputs => new RenewableMicrogridCostOptimizerEngine().calculatePricing(inputs);

test('default quote has zero usage and a serializable explicit demo contract', () => {
  const quote = calculate();
  assert.equal(quote.totalCents, 0);
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.demo, true);
  assert.equal(quote.tariffId, 'renewable-microgrid-demo-v1');
  assert.equal(quote.resources.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(quote)), quote);
});

test('graduated bands discount only units above each boundary', () => {
  const expectations = [[0, 0], [1, 25], [100, 2500], [101, 2523], [1000, 22750], [1001, 22770]];
  for (const [compute, expected] of expectations) assert.equal(calculate({ compute }).totalCents, expected, String(compute));
  assert.deepEqual(calculate({ compute: 1001 }).resources[0].bands.map(b => b.units), [100, 900, 1]);
});

test('demo tier API returns exact discount basis points and rejects prototype names', () => {
  const engine = new RenewableMicrogridCostOptimizerEngine();
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
    for (const r of quote.resources) assert.equal(r.subtotalCents - r.volumeDiscountCents - r.annualDiscountCents, r.amountCents);
    assert(Number.isSafeInteger(quote.totalCents));
    assert(quote.volumeDiscountCents >= 0 && quote.annualDiscountCents >= 0);
  }
});
