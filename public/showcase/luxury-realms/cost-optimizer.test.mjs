import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LuxuryRealmsCostOptimizerEngine,
  ASSET_TIERS,
  SERVICE_RATES
} from './cost-optimizer.js';

test('LuxuryRealmsCostOptimizerEngine - initializes with default values & currency USD ($)', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();
  const quote = engine.generateQuote();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.currencySymbol, '$');
  assert.equal(quote.inputs.estates, 2);
  assert.equal(quote.inputs.flightHours, 15);
  assert.equal(quote.inputs.securityOperatives, 2);
  assert.equal(quote.inputs.yachtDays, 3);
  assert.equal(quote.inputs.lifestyleRetainers, 1);
  assert.equal(quote.inputs.assets, 3500000);

  assert.ok(quote.subtotal > 0, 'Subtotal should be positive');
  assert.ok(quote.totalCost > 0, 'Total cost should be positive');
  assert.ok(quote.tier, 'Tier should be defined');
  assert.equal(quote.tier.id, 'tier3');
  assert.equal(quote.tier.discountPercent, 15);
  assert.ok(quote.breakdown, 'Breakdown object should be populated');
});

test('LuxuryRealmsCostOptimizerEngine - zero & single resource allocation calculations', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();
  const zeroQuote = engine.calculatePricing({
    estates: 0,
    flightHours: 0,
    securityOperatives: 0,
    yachtDays: 0,
    lifestyleRetainers: 0,
    assets: 250000,
    billingFrequency: 'monthly'
  });

  assert.equal(zeroQuote.subtotal, 0);
  assert.equal(zeroQuote.totalCost, 0);
  assert.equal(zeroQuote.totalDiscountAmount, 0);
  assert.equal(zeroQuote.breakdown.estates, 0);
  assert.equal(zeroQuote.breakdown.flightHours, 0);
  assert.equal(zeroQuote.breakdown.securityOperatives, 0);
  assert.equal(zeroQuote.breakdown.yachtDays, 0);
  assert.equal(zeroQuote.breakdown.lifestyleRetainers, 0);
  assert.equal(zeroQuote.tier.id, 'tier1');

  // Single resource: 1 managed estate ($15,000) under Tier 1 (0% discount)
  const singleEstateQuote = engine.calculatePricing({
    estates: 1,
    flightHours: 0,
    securityOperatives: 0,
    yachtDays: 0,
    lifestyleRetainers: 0,
    assets: 300000,
    billingFrequency: 'monthly'
  });

  assert.equal(singleEstateQuote.subtotal, 15000);
  assert.equal(singleEstateQuote.volumeDiscountAmount, 0);
  assert.equal(singleEstateQuote.totalCost, 15000);
  assert.equal(singleEstateQuote.tier.id, 'tier1');
});

test('LuxuryRealmsCostOptimizerEngine - exact tier boundaries and threshold transitions', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  // Tier 1: $100k - $500k assets (0% discount)
  const t1Min = engine.calculatePricing({ assets: 100000, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t1Min.tier.id, 'tier1');
  assert.equal(t1Min.tier.discountRate, 0.0);
  assert.equal(t1Min.volumeDiscountAmount, 0);

  // Exact upper boundary of Tier 1: $500,000
  const t1Max = engine.calculatePricing({ assets: 500000, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t1Max.tier.id, 'tier1');
  assert.equal(t1Max.tier.discountRate, 0.0);

  // Immediately above Tier 1: $500,001 (crossing into Tier 2: 8% prestige rebate)
  const t2Entry = engine.calculatePricing({ assets: 500001, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t2Entry.tier.id, 'tier2');
  assert.equal(t2Entry.tier.discountRate, 0.08);
  assert.equal(t2Entry.volumeDiscountAmount, 1200); // $15,000 * 0.08 = $1,200
  assert.equal(t2Entry.totalCost, 13800);

  // Exact upper boundary of Tier 2: $2,000,000
  const t2Max = engine.calculatePricing({ assets: 2000000, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t2Max.tier.id, 'tier2');
  assert.equal(t2Max.tier.discountRate, 0.08);

  // Immediately above Tier 2: $2,000,001 (crossing into Tier 3: 15% elite discount)
  const t3Entry = engine.calculatePricing({ assets: 2000001, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t3Entry.tier.id, 'tier3');
  assert.equal(t3Entry.tier.discountRate, 0.15);
  assert.equal(t3Entry.volumeDiscountAmount, 2250); // $15,000 * 0.15 = $2,250
  assert.equal(t3Entry.totalCost, 12750);

  // Exact upper boundary of Tier 3: $10,000,000
  const t3Max = engine.calculatePricing({ assets: 10000000, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t3Max.tier.id, 'tier3');
  assert.equal(t3Max.tier.discountRate, 0.15);

  // Immediately above Tier 3: $10,000,001 (crossing into Tier 4: 25% sovereign family office discount)
  const t4Entry = engine.calculatePricing({ assets: 10000001, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t4Entry.tier.id, 'tier4');
  assert.equal(t4Entry.tier.discountRate, 0.25);
  assert.equal(t4Entry.volumeDiscountAmount, 3750); // $15,000 * 0.25 = $3,750
  assert.equal(t4Entry.totalCost, 11250);

  // High sovereign asset base: $50,000,000
  const t4Ultra = engine.calculatePricing({ assets: 50000000, estates: 1, billingFrequency: 'monthly' });
  assert.equal(t4Ultra.tier.id, 'tier4');
  assert.equal(t4Ultra.tier.discountRate, 0.25);
});

test('LuxuryRealmsCostOptimizerEngine - applyVolumeDiscount mathematical precision', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  // Test with string IDs
  const d1 = engine.applyVolumeDiscount('tier1', 100000);
  assert.equal(d1.discountRate, 0.0);
  assert.equal(d1.discountAmount, 0);
  assert.equal(d1.netCost, 100000);

  const d2 = engine.applyVolumeDiscount('tier2', 100000);
  assert.equal(d2.discountRate, 0.08);
  assert.equal(d2.discountAmount, 8000);
  assert.equal(d2.netCost, 92000);

  const d3 = engine.applyVolumeDiscount('tier3', 100000);
  assert.equal(d3.discountRate, 0.15);
  assert.equal(d3.discountAmount, 15000);
  assert.equal(d3.netCost, 85000);

  const d4 = engine.applyVolumeDiscount('tier4', 100000);
  assert.equal(d4.discountRate, 0.25);
  assert.equal(d4.discountAmount, 25000);
  assert.equal(d4.netCost, 75000);

  // Test with tier aliases ('sapphire', 'diamond', 'royal', 'sovereign')
  assert.equal(engine.applyVolumeDiscount('sapphire', 50000).discountRate, 0.0);
  assert.equal(engine.applyVolumeDiscount('diamond', 50000).discountRate, 0.08);
  assert.equal(engine.applyVolumeDiscount('royal', 50000).discountRate, 0.15);
  assert.equal(engine.applyVolumeDiscount('sovereign', 50000).discountRate, 0.25);

  // Test with fractional cents to verify rounding precision
  const dFractional = engine.applyVolumeDiscount('tier2', 123456.78);
  // 123456.78 * 0.08 = 9876.5424 -> 9876.54
  assert.equal(dFractional.discountAmount, 9876.54);
  assert.equal(dFractional.netCost, 113580.24);
});

test('LuxuryRealmsCostOptimizerEngine - annual commitment multiplier and 15% savings', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  // Test setup: 2 estates ($30k), 10 flight hrs ($65k), 1 security ($12k), 1 yacht ($25k), 0 lifestyle = $132,000 monthly
  const config = {
    estates: 2,
    flightHours: 10,
    securityOperatives: 1,
    yachtDays: 1,
    lifestyleRetainers: 0,
    assets: 300000 // Tier 1: 0% volume discount
  };

  const monthlyQuote = engine.calculatePricing({ ...config, billingFrequency: 'monthly' });
  assert.equal(monthlyQuote.billingFrequency, 'monthly');
  assert.equal(monthlyQuote.annualMultiplier, 1);
  assert.equal(monthlyQuote.subtotal, 132000);
  assert.equal(monthlyQuote.volumeDiscountAmount, 0);
  assert.equal(monthlyQuote.annualDiscountAmount, 0);
  assert.equal(monthlyQuote.totalCost, 132000);
  assert.equal(monthlyQuote.monthlyEquivalent, 132000);

  const annualQuote = engine.calculatePricing({ ...config, billingFrequency: 'annual' });
  assert.equal(annualQuote.billingFrequency, 'annual');
  assert.equal(annualQuote.annualMultiplier, 12);
  // Annual subtotal: 132,000 * 12 = 1,584,000
  assert.equal(annualQuote.subtotal, 1584000);
  assert.equal(annualQuote.volumeDiscountAmount, 0);
  // Annual commitment savings: 1,584,000 * 0.15 = 237,600
  assert.equal(annualQuote.annualDiscountAmount, 237600);
  assert.equal(annualQuote.totalDiscountAmount, 237600);
  assert.equal(annualQuote.totalCost, 1346400);
  assert.equal(annualQuote.monthlyEquivalent, 112200); // 1,346,400 / 12 = 112,200

  // Combined volume discount + annual discount in Tier 3 (15% volume discount + 15% annual savings)
  const combinedQuote = engine.calculatePricing({
    ...config,
    assets: 5000000, // Tier 3 (15%)
    billingFrequency: 'annual'
  });
  // Annual Subtotal: 1,584,000
  // Volume discount: 1,584,000 * 0.15 = 237,600
  // Remaining base after volume discount: 1,584,000 - 237,600 = 1,346,400
  // Annual savings: 1,346,400 * 0.15 = 201,960
  // Total discount: 237,600 + 201,960 = 439,560
  // Total cost: 1,584,000 - 439,560 = 1,144,440
  assert.equal(combinedQuote.subtotal, 1584000);
  assert.equal(combinedQuote.volumeDiscountAmount, 237600);
  assert.equal(combinedQuote.annualDiscountAmount, 201960);
  assert.equal(combinedQuote.totalDiscountAmount, 439560);
  assert.equal(combinedQuote.totalCost, 1144440);
  assert.equal(combinedQuote.monthlyEquivalent, 95370);
});

test('LuxuryRealmsCostOptimizerEngine - handles invalid, negative, and non-finite inputs safely', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  const edgeCases = [
    { estates: -5, flightHours: -20, securityOperatives: -3, yachtDays: -1, lifestyleRetainers: -2 },
    { estates: NaN, flightHours: Infinity, securityOperatives: -Infinity, yachtDays: 'invalid' },
    { estates: null, flightHours: undefined, securityOperatives: false, yachtDays: true },
    { assets: -1000000 },
    { assets: NaN, billingFrequency: 'unknown-frequency' }
  ];

  for (const inputs of edgeCases) {
    const quote = engine.calculatePricing(inputs);
    assert.ok(Number.isFinite(quote.subtotal), 'Subtotal must be finite');
    assert.ok(Number.isFinite(quote.totalCost), 'Total cost must be finite');
    assert.ok(quote.subtotal >= 0, 'Subtotal must be non-negative');
    assert.ok(quote.totalCost >= 0, 'Total cost must be non-negative');
    assert.ok(quote.inputs.estates >= 0);
    assert.ok(quote.inputs.flightHours >= 0);
    assert.ok(quote.inputs.securityOperatives >= 0);
    assert.ok(quote.inputs.yachtDays >= 0);
  }
});

test('LuxuryRealmsCostOptimizerEngine - quote structure and generateQuote options tracking', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine({
    estates: 3,
    flightHours: 20,
    securityOperatives: 3,
    yachtDays: 2,
    lifestyleRetainers: 1,
    assets: 5000000
  });

  const quote1 = engine.generateQuote();
  assert.equal(quote1.inputs.estates, 3);
  assert.equal(quote1.inputs.flightHours, 20);

  const quote2 = engine.generateQuote({ estates: 5, flightHours: 40 });
  assert.equal(quote2.inputs.estates, 5);
  assert.equal(quote2.inputs.flightHours, 40);
  assert.equal(quote2.inputs.securityOperatives, 3);

  // Validate complete quote property contract
  const expectedKeys = [
    'quoteId', 'timestamp', 'currency', 'currencySymbol', 'inputs',
    'billingFrequency', 'annualMultiplier', 'tier', 'rates', 'breakdown',
    'monthlyBaseCost', 'subtotal', 'baseCost', 'volumeDiscountRate',
    'volumeDiscountPercent', 'volumeDiscountAmount', 'afterVolumeDiscount',
    'annualDiscountRate', 'annualDiscountPercent', 'annualDiscountAmount',
    'totalDiscountAmount', 'discountAmount', 'commitmentSavings',
    'totalCost', 'monthlyEquivalent'
  ];

  for (const key of expectedKeys) {
    assert.ok(key in quote2, `Expected quote property: ${key}`);
  }
});

test('LuxuryRealmsCostOptimizerEngine - event emitter registration and notification delivery', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  let pricingCalculatedFired = false;
  let quoteGeneratedFired = false;
  let tierChangedFired = false;
  let receivedTierData = null;

  const unsubscribePricing = engine.on('pricing:calculated', (data) => {
    pricingCalculatedFired = true;
    assert.ok(data.quoteId);
  });

  engine.on('quote:generated', (data) => {
    quoteGeneratedFired = true;
    assert.ok(data.totalCost >= 0);
  });

  engine.on('tier:changed', (data) => {
    tierChangedFired = true;
    receivedTierData = data;
  });

  // Calculate pricing transitioning from Tier 3 ($3.5M default) to Tier 4 ($15M)
  engine.calculatePricing({ assets: 15000000 });
  assert.ok(pricingCalculatedFired, 'pricing:calculated event should fire');
  assert.ok(tierChangedFired, 'tier:changed event should fire');
  assert.equal(receivedTierData.previousTier.id, 'tier3');
  assert.equal(receivedTierData.currentTier.id, 'tier4');

  engine.generateQuote();
  assert.ok(quoteGeneratedFired, 'quote:generated event should fire');

  // Verify unsubscribe
  pricingCalculatedFired = false;
  unsubscribePricing();
  engine.calculatePricing({ estates: 4 });
  assert.equal(pricingCalculatedFired, false, 'Unsubscribed listener should not be called');
});

test('LuxuryRealmsCostOptimizerEngine - optimizeAllocation within budget and constraint handling', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  // Test budget too small for minimum requirements
  // 1 estate ($15k) + 5 flight hours (5 * $6.5k = $32.5k) = $47.5k base, budget is $10k
  const lowBudgetResult = engine.optimizeAllocation(10000, {
    minEstates: 1,
    minFlightHours: 5,
    assets: 250000
  });

  assert.equal(lowBudgetResult.feasible, false);
  assert.equal(lowBudgetResult.withinBudget, false);
  assert.ok(lowBudgetResult.deficit > 0);
  assert.ok(lowBudgetResult.remainingBudget < 0);

  // Test viable budget optimization
  const budget = 150000; // $150,000 monthly
  const optResult = engine.optimizeAllocation(budget, {
    minEstates: 2,
    minFlightHours: 10,
    minSecurityOperatives: 1,
    minYachtDays: 1,
    assets: 5000000 // Tier 3: 15% discount
  });

  assert.equal(optResult.feasible, true);
  assert.equal(optResult.withinBudget, true);
  assert.ok(optResult.quote.totalCost <= budget, `Total cost ${optResult.quote.totalCost} must be <= budget ${budget}`);
  assert.ok(optResult.remainingBudget >= 0);
  assert.ok(optResult.utilizationPercent > 70, 'Allocation should utilize substantial budget');
  assert.ok(optResult.allocatedServices.estates >= 2);
  assert.ok(optResult.allocatedServices.flightHours >= 10);
  assert.ok(optResult.allocatedServices.securityOperatives >= 1);
  assert.ok(optResult.allocatedServices.yachtDays >= 1);

  // Test invalid target budget throws RangeError
  assert.throws(() => engine.optimizeAllocation(0), RangeError);
  assert.throws(() => engine.optimizeAllocation(-5000), RangeError);
  assert.throws(() => engine.optimizeAllocation('invalid'), RangeError);
});

test('LuxuryRealmsCostOptimizerEngine - determineTier comprehensive input mapping', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();

  // String IDs and aliases
  assert.equal(engine.determineTier('tier1').id, 'tier1');
  assert.equal(engine.determineTier('sapphire').id, 'tier1');
  assert.equal(engine.determineTier('tier2').id, 'tier2');
  assert.equal(engine.determineTier('diamond').id, 'tier2');
  assert.equal(engine.determineTier('tier3').id, 'tier3');
  assert.equal(engine.determineTier('royal').id, 'tier3');
  assert.equal(engine.determineTier('imperial').id, 'tier3');
  assert.equal(engine.determineTier('tier4').id, 'tier4');
  assert.equal(engine.determineTier('sovereign').id, 'tier4');

  // Integer tier indices 1-4
  assert.equal(engine.determineTier(1).id, 'tier1');
  assert.equal(engine.determineTier(2).id, 'tier2');
  assert.equal(engine.determineTier(3).id, 'tier3');
  assert.equal(engine.determineTier(4).id, 'tier4');

  // Objects with id, tierNumber, or assets
  assert.equal(engine.determineTier({ id: 'tier2' }).id, 'tier2');
  assert.equal(engine.determineTier({ tierNumber: 3 }).id, 'tier3');
  assert.equal(engine.determineTier({ assets: 15000000 }).id, 'tier4');
  assert.equal(engine.determineTier({ assetValuation: 150000 }).id, 'tier1');

  // Boundary asset figures
  assert.equal(engine.determineTier(0).id, 'tier1');
  assert.equal(engine.determineTier(500000).id, 'tier1');
  assert.equal(engine.determineTier(500000.01).id, 'tier2');
  assert.equal(engine.determineTier(2000000).id, 'tier2');
  assert.equal(engine.determineTier(2000000.01).id, 'tier3');
  assert.equal(engine.determineTier(10000000).id, 'tier3');
  assert.equal(engine.determineTier(10000000.01).id, 'tier4');
});

test('LuxuryRealmsCostOptimizerEngine - optimizeAllocation with annual commitment billing', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();
  const annualBudget = 1200000; // $1.2M annual budget

  const result = engine.optimizeAllocation(annualBudget, {
    minEstates: 1,
    minFlightHours: 10,
    minSecurityOperatives: 1,
    assets: 5000000,
    billingFrequency: 'annual'
  });

  assert.equal(result.feasible, true);
  assert.equal(result.withinBudget, true);
  assert.equal(result.quote.billingFrequency, 'annual');
  assert.ok(result.quote.totalCost <= annualBudget);
  assert.ok(result.quote.annualDiscountAmount > 0);
  assert.ok(result.remainingBudget >= 0);
});

test('LuxuryRealmsCostOptimizerEngine - event emitter listener error isolation', () => {
  const engine = new LuxuryRealmsCostOptimizerEngine();
  let normalListenerCalled = false;

  engine.on('pricing:calculated', () => {
    throw new Error('Simulated listener failure');
  });

  engine.on('pricing:calculated', () => {
    normalListenerCalled = true;
  });

  // Emitting should not throw despite the failing listener
  assert.doesNotThrow(() => {
    engine.calculatePricing({ estates: 1 });
  });

  assert.ok(normalListenerCalled, 'Normal listener should still be invoked when sibling throws');
});
