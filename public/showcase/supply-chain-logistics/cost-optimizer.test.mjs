import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsCostOptimizerEngine, TIERS } from './cost-optimizer.js';

test('SupplyChainLogisticsCostOptimizerEngine - initializes with default values & currency INR', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();
  const quote = engine.generateQuote();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.currency, 'INR');
  assert.equal(quote.currencySymbol, '₹');
  assert.equal(quote.inputs.compute, 8);
  assert.equal(quote.inputs.storage, 150);
  assert.equal(quote.inputs.bandwidth, 800);
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.totalCost > 0);
  assert.ok(quote.tier);
  assert.ok(quote.breakdown);
});

test('SupplyChainLogisticsCostOptimizerEngine - zero & minimum resource allocation', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();
  const zeroQuote = engine.calculatePricing({ compute: 0, storage: 0, bandwidth: 0, billingFrequency: 'monthly' });

  assert.equal(zeroQuote.subtotal, 0);
  assert.equal(zeroQuote.totalCost, 0);
  assert.equal(zeroQuote.discountAmount, 0);
  assert.equal(zeroQuote.breakdown.compute, 0);
  assert.equal(zeroQuote.breakdown.storage, 0);
  assert.equal(zeroQuote.breakdown.bandwidth, 0);
  assert.equal(zeroQuote.tier.id, 'starter');

  const minQuote = engine.calculatePricing({ compute: 1, storage: 10, bandwidth: 50, billingFrequency: 'monthly' });
  // Starter rates: compute: 1200, storage: 20, bandwidth: 6.5
  // Cost = 1*1200 + 10*20 + 50*6.5 = 1200 + 200 + 325 = 1725
  assert.equal(minQuote.subtotal, 1725);
  assert.equal(minQuote.totalCost, 1725);
  assert.equal(minQuote.tier.id, 'starter');
});

test('SupplyChainLogisticsCostOptimizerEngine - exact tier boundaries and threshold transitions', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();

  // Exact upper boundary of Starter Tier: compute = 15, storage = 200, bandwidth = 1000
  const starterBoundary = engine.calculatePricing({ compute: 15, storage: 200, bandwidth: 1000, billingFrequency: 'monthly' });
  assert.equal(starterBoundary.tier.id, 'starter');
  assert.equal(starterBoundary.tier.discountRate, 0);
  // Base: 15*1200 + 200*20 + 1000*6.5 = 18000 + 4000 + 6500 = 28500
  assert.equal(starterBoundary.subtotal, 28500);
  assert.equal(starterBoundary.totalCost, 28500);

  // Immediately above Starter Tier (compute = 16, crossing into Business Tier)
  const businessEntryCompute = engine.calculatePricing({ compute: 16, storage: 200, bandwidth: 1000, billingFrequency: 'monthly' });
  assert.equal(businessEntryCompute.tier.id, 'business');
  assert.equal(businessEntryCompute.tier.discountRate, 0.10);
  // Business rates: compute: 960, storage: 16, bandwidth: 5.0
  // Subtotal = 16*960 + 200*16 + 1000*5.0 = 15360 + 3200 + 5000 = 23560
  // Discount = 23560 * 0.10 = 2356
  // Total = 23560 - 2356 = 21204
  assert.equal(businessEntryCompute.subtotal, 23560);
  assert.equal(businessEntryCompute.volumeDiscountAmount, 2356);
  assert.equal(businessEntryCompute.totalCost, 21204);

  // Immediately above Starter Tier by storage (storage = 201)
  const businessEntryStorage = engine.calculatePricing({ compute: 15, storage: 201, bandwidth: 1000, billingFrequency: 'monthly' });
  assert.equal(businessEntryStorage.tier.id, 'business');

  // Immediately above Starter Tier by bandwidth (bandwidth = 1001)
  const businessEntryBandwidth = engine.calculatePricing({ compute: 15, storage: 200, bandwidth: 1001, billingFrequency: 'monthly' });
  assert.equal(businessEntryBandwidth.tier.id, 'business');

  // Exact upper boundary of Business Tier: compute = 50, storage = 1000, bandwidth = 5000
  const businessBoundary = engine.calculatePricing({ compute: 50, storage: 1000, bandwidth: 5000, billingFrequency: 'monthly' });
  assert.equal(businessBoundary.tier.id, 'business');
  assert.equal(businessBoundary.tier.discountRate, 0.10);

  // Immediately above Business Tier (compute = 51, crossing into Enterprise Tier)
  const enterpriseEntry = engine.calculatePricing({ compute: 51, storage: 1000, bandwidth: 5000, billingFrequency: 'monthly' });
  assert.equal(enterpriseEntry.tier.id, 'enterprise');
  assert.equal(enterpriseEntry.tier.discountRate, 0.20);
});

test('SupplyChainLogisticsCostOptimizerEngine - annual billing discount & multiplier precision', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();

  // Annual calculation for Starter tier: compute 10, storage 100, bandwidth 500
  // Monthly base: 10*1200 + 100*20 + 500*6.5 = 12000 + 2000 + 3250 = 17250
  // Annual subtotal: 17250 * 12 = 207000
  // Volume discount: 0
  // Annual discount: 207000 * 0.15 = 31050
  // Total cost: 207000 - 31050 = 175950
  const annualStarter = engine.calculatePricing({ compute: 10, storage: 100, bandwidth: 500, billingFrequency: 'annual' });
  assert.equal(annualStarter.billingFrequency, 'annual');
  assert.equal(annualStarter.annualMultiplier, 12);
  assert.equal(annualStarter.subtotal, 207000);
  assert.equal(annualStarter.volumeDiscountAmount, 0);
  assert.equal(annualStarter.annualDiscountAmount, 31050);
  assert.equal(annualStarter.totalCost, 175950);

  // Annual calculation for Business tier with combined discounts
  // compute: 20, storage: 300, bandwidth: 1500
  // Monthly base: 20*960 + 300*16 + 1500*5.0 = 19200 + 4800 + 7500 = 31500
  // Annual subtotal: 31500 * 12 = 378000
  // Volume discount: 378000 * 0.10 = 37800
  // Remaining base after volume discount: 378000 - 37800 = 340200
  // Annual discount: 340200 * 0.15 = 51030
  // Total discount: 37800 + 51030 = 88830
  // Total cost: 378000 - 88830 = 289170
  const annualBusiness = engine.calculatePricing({ compute: 20, storage: 300, bandwidth: 1500, billingFrequency: 'annual' });
  assert.equal(annualBusiness.subtotal, 378000);
  assert.equal(annualBusiness.volumeDiscountAmount, 37800);
  assert.equal(annualBusiness.annualDiscountAmount, 51030);
  assert.equal(annualBusiness.totalDiscountAmount, 88830);
  assert.equal(annualBusiness.totalCost, 289170);
});

test('SupplyChainLogisticsCostOptimizerEngine - applyVolumeDiscount validation & precision', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();

  const dStarter = engine.applyVolumeDiscount('starter', 50000);
  assert.equal(dStarter.discountRate, 0);
  assert.equal(dStarter.discountAmount, 0);
  assert.equal(dStarter.netCost, 50000);

  const dBusiness = engine.applyVolumeDiscount('business', 50000);
  assert.equal(dBusiness.discountRate, 0.10);
  assert.equal(dBusiness.discountAmount, 5000);
  assert.equal(dBusiness.netCost, 45000);

  const dEnterprise = engine.applyVolumeDiscount('enterprise', 50000);
  assert.equal(dEnterprise.discountRate, 0.20);
  assert.equal(dEnterprise.discountAmount, 10000);
  assert.equal(dEnterprise.netCost, 40000);
});

test('SupplyChainLogisticsCostOptimizerEngine - handles invalid, negative, and non-finite inputs safely', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine();

  const edgeCases = [
    { compute: -10, storage: -100, bandwidth: -500 },
    { compute: NaN, storage: Infinity, bandwidth: -Infinity },
    { compute: 'invalid', storage: null, bandwidth: undefined },
    { compute: false, storage: true, bandwidth: {} }
  ];

  for (const inputs of edgeCases) {
    const quote = engine.calculatePricing(inputs);
    assert.ok(Number.isFinite(quote.subtotal));
    assert.ok(Number.isFinite(quote.totalCost));
    assert.ok(quote.subtotal >= 0);
    assert.ok(quote.totalCost >= 0);
    assert.ok(quote.inputs.compute >= 0);
    assert.ok(quote.inputs.storage >= 0);
    assert.ok(quote.inputs.bandwidth >= 0);
  }
});

test('SupplyChainLogisticsCostOptimizerEngine - quote structure and generateQuote state tracking', () => {
  const engine = new SupplyChainLogisticsCostOptimizerEngine({ compute: 5, storage: 50, bandwidth: 200 });
  const quote1 = engine.generateQuote();
  assert.equal(quote1.inputs.compute, 5);

  const quote2 = engine.generateQuote({ compute: 12 });
  assert.equal(quote2.inputs.compute, 12);
  assert.equal(quote2.inputs.storage, 50);

  // Check required quote keys
  const expectedKeys = [
    'inputs', 'billingFrequency', 'currency', 'currencySymbol',
    'tier', 'annualMultiplier', 'annualDiscountRate', 'annualDiscountPercent',
    'breakdown', 'subtotal', 'baseCost', 'volumeDiscountAmount',
    'annualDiscountAmount', 'totalDiscountAmount', 'discountAmount', 'totalCost'
  ];
  for (const key of expectedKeys) {
    assert.ok(key in quote2, `Expected key "${key}" in quote object`);
  }
});
