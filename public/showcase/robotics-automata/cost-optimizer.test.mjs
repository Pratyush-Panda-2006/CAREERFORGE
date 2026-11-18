import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataCostOptimizerEngine } from './cost-optimizer.js';

const calculate = inputs => new RoboticsAutomataCostOptimizerEngine().calculatePricing(inputs);

test('default quote has zero usage and a serializable explicit demo contract', () => {
  const quote = calculate();
  assert.equal(quote.totalCents, 0);
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.demo, true);
  assert.equal(quote.tariffId, 'robotics-demo-v1');
  assert.equal(quote.resources.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(quote)), quote);
});

test('graduated bands discount only units above each boundary', () => {
  const expectations = [[0, 0], [1, 25], [100, 2500], [101, 2523], [1000, 22750], [1001, 22770]];
  for (const [compute, expected] of expectations) assert.equal(calculate({ compute }).totalCents, expected, String(compute));
  assert.deepEqual(calculate({ compute: 1001 }).resources[0].bands.map(b => b.units), [100, 900, 1]);
});

test('demo tier API returns exact discount basis points and rejects prototype names', () => {
  const engine = new RoboticsAutomataCostOptimizerEngine();
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

test('cost does not drop when a resource crosses a graduated threshold', () => {
  for (const resource of ['compute', 'storage', 'bandwidth']) {
    for (const edge of [100, 1000]) {
      assert(calculate({ [resource]: edge + 1 }).totalCents >= calculate({ [resource]: edge }).totalCents);
    }
  }
});

test('invalid and fractional quantities fail rather than being coerced or clamped', () => {
  for (const quantity of [-1, 0.5, 1000001, NaN, Infinity, '100', null, undefined]) {
    assert.throws(() => calculate({ compute: quantity }), /whole number/);
  }
});

test('invalid containers, unsupported fields, accessors and billing periods are rejected', () => {
  for (const input of [null, [], new Date(), 'input', { other: 1 }, { billing: 'weekly' }]) assert.throws(() => calculate(input));
  let accessed = false;
  const input = Object.defineProperty({}, 'compute', { get() { accessed = true; return 10; } });
  assert.throws(() => calculate(input), /plain resource/);
  assert.equal(accessed, false);
});

test('a failed calculation clears the exportable quote instead of exporting stale values', () => {
  const engine = new RoboticsAutomataCostOptimizerEngine();
  assert.throws(() => engine.generateQuote(), /valid resource/);
  engine.calculatePricing({ compute: 10 });
  assert.throws(() => engine.calculatePricing({ compute: -1 }));
  assert.throws(() => engine.generateQuote(), /valid resource/);
});

test('returned and exported quotes are defensive copies of the current calculation', () => {
  const engine = new RoboticsAutomataCostOptimizerEngine();
  const input = { compute: 101 };
  const quote = engine.calculatePricing(input);
  quote.resources[0].bands[0].units = 999;
  quote.totalCents = -5;
  input.compute = 0;
  const exported = engine.generateQuote();
  assert.equal(exported.totalCents, 2523);
  assert.equal(exported.resources[0].bands[0].units, 100);
  exported.resources[0].amountCents = 0;
  assert.equal(engine.generateQuote().resources[0].amountCents, 2523);
});

test('small monthly inputs agree with an independent rational-arithmetic baseline', () => {
  for (let units = 0; units <= 1100; units += 11) {
    const rawTenthsOfCent = Math.min(units, 100) * 250 + Math.min(Math.max(units - 100, 0), 900) * 225 + Math.max(units - 1000, 0) * 200;
    assert.equal(calculate({ compute: units }).totalCents, Math.floor((rawTenthsOfCent + 5) / 10));
  }
});
