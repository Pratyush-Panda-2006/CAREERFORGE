import assert from "node:assert/strict";
import { test } from "node:test";
import { PodcastAudioStreamCostOptimizerEngine as Engine } from "./cost-optimizer.js";

const usage = (values = {}) => ({ compute: 0, storage: 0, bandwidth: 0, ...values });

test("charges only incremental compute units above a tier boundary", () => {
  const engine = new Engine();
  assert.equal(engine.calculatePricing(usage({ compute: 100 })).subtotalCents, 4500);
  const quote = engine.calculatePricing(usage({ compute: 101 }));
  assert.equal(quote.subtotalCents, 4532);
  assert.deepEqual(quote.resources[0].bands.map(({ units }) => units), [100, 1, 0]);
  assert.equal(engine.calculatePricing(usage({ compute: 401 })).subtotalCents, 14122);
});

test("computes storage and delivery as independent graduated schedules", () => {
  const quote = new Engine().calculatePricing(usage({ storage: 251, bandwidth: 501 }));
  assert.deepEqual(quote.resources.map(({ monthlyCents }) => monthlyCents), [0, 3008, 4506]);
  assert.equal(quote.subtotalCents, 7514);
});

test("applies exact volume thresholds and rounds once in integer cents", () => {
  const engine = new Engine();
  assert.deepEqual(engine.applyVolumeDiscount(8999), { percent: 0, cents: 0 });
  assert.deepEqual(engine.applyVolumeDiscount(9000), { percent: 5, cents: 450 });
  assert.deepEqual(engine.applyVolumeDiscount(9010), { percent: 5, cents: 451 });
  assert.deepEqual(engine.applyVolumeDiscount(17999), { percent: 5, cents: 900 });
  assert.deepEqual(engine.applyVolumeDiscount(18000), { percent: 10, cents: 1800 });
});

test("applies annual savings after recurring volume savings", () => {
  const engine = new Engine();
  const monthly = engine.calculatePricing(usage({ compute: 80, storage: 300, bandwidth: 900 }));
  assert.equal(monthly.subtotalCents, 13900);
  assert.equal(monthly.totalCents, 13205);
  const annual = engine.calculatePricing(usage({ compute: 80, storage: 300, bandwidth: 900, billing: "annual" }));
  assert.equal(annual.subtotalCents, 166800);
  assert.equal(annual.volumeDiscountCents, 8340);
  assert.equal(annual.annualDiscountCents, 23769);
  assert.equal(annual.totalCents, 134691);
  assert.equal(annual.resources.reduce((sum, line) => sum + line.periodCents, 0), annual.subtotalCents);
});

test("returns a serializable quote that cannot mutate stored pricing", () => {
  const engine = new Engine();
  assert.throws(() => engine.generateQuote(), /calculate pricing/i);
  const zero = engine.calculatePricing(usage());
  assert.equal(zero.currency, "USD");
  assert.equal(zero.totalCents, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(zero)), engine.generateQuote());
  zero.resources[0].bands[0].cents = 5;
  assert.equal(engine.generateQuote().resources[0].bands[0].cents, 0);
});

test("rejects unsafe units and billing values", () => {
  const engine = new Engine();
  for (const compute of [-1, 1.5, 1001, Infinity, "20"]) {
    assert.throws(() => engine.calculatePricing(usage({ compute })), RangeError);
  }
  assert.throws(() => engine.calculatePricing(usage({ billing: "weekly" })), RangeError);
});

test("keeps the maximum annual total consistent with its displayed components", () => {
  const quote = new Engine().calculatePricing(usage({ compute: 1000, storage: 5000, bandwidth: 10000, billing: "annual" }));
  assert.equal(quote.volumePercent, 10);
  assert.equal(quote.subtotalCents, quote.resources.reduce((sum, item) => sum + item.periodCents, 0));
  assert.equal(quote.totalCents, quote.subtotalCents - quote.volumeDiscountCents - quote.annualDiscountCents);
});
