import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NonprofitImpactCostOptimizerEngine,
  NONPROFIT_TIERS,
  RESOURCES
} from './cost-optimizer.js';

test('NonprofitImpactCostOptimizerEngine - initializes with default values & currency USD', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();
  const quote = engine.generateQuote();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.currencySymbol, '$');
  assert.equal(quote.annualDiscountRate, 0.20);
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.billingMultiplier, 1);
  assert.equal(quote.isNonprofitVerified, true);
  assert.equal(quote.inputs.donors, 1200);
  assert.equal(quote.inputs.volunteers, 15);
  assert.equal(quote.inputs.notifications, 8000);
  assert.equal(quote.inputs.storage, 80);
  assert.equal(quote.inputs.telemetry, 150);
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.totalCost > 0);
  assert.ok(quote.tier);
  assert.ok(quote.breakdown);
  assert.ok(quote.quoteId.startsWith('TI-OPT-'));
  assert.equal(quote.status, 'active_guaranteed');
});

test('NonprofitImpactCostOptimizerEngine - sanitizeInput handles edge cases', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  assert.equal(engine.sanitizeInput(null), 0);
  assert.equal(engine.sanitizeInput(undefined), 0);
  assert.equal(engine.sanitizeInput(true), 0);
  assert.equal(engine.sanitizeInput(false), 0);
  assert.equal(engine.sanitizeInput(-50), 0);
  assert.equal(engine.sanitizeInput('invalid'), 0);
  assert.equal(engine.sanitizeInput(NaN), 0);
  assert.equal(engine.sanitizeInput(Infinity), 0);
  assert.equal(engine.sanitizeInput(42.85), 42);
  assert.equal(engine.sanitizeInput('350'), 350);

  // Float sanitizer
  assert.equal(engine.sanitizeFloat(null), 0);
  assert.equal(engine.sanitizeFloat(-20.5), 0);
  assert.equal(engine.sanitizeFloat(123.456), 123.46);
});

test('NonprofitImpactCostOptimizerEngine - zero & minimum resource allocation', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();
  const zeroQuote = engine.calculatePricing({
    donors: 0,
    volunteers: 0,
    notifications: 0,
    storage: 0,
    telemetry: 0,
    billingFrequency: 'monthly',
    isNonprofitVerified: true,
    grantAllowance: 0
  });

  assert.equal(zeroQuote.subtotal, 0);
  assert.equal(zeroQuote.totalCost, 0);
  assert.equal(zeroQuote.totalDiscountAmount, 0);
  assert.equal(zeroQuote.breakdown.donors, 0);
  assert.equal(zeroQuote.breakdown.volunteers, 0);
  assert.equal(zeroQuote.breakdown.notifications, 0);
  assert.equal(zeroQuote.breakdown.storage, 0);
  assert.equal(zeroQuote.breakdown.telemetry, 0);
  assert.equal(zeroQuote.tier.id, 'grassroots');
});

test('NonprofitImpactCostOptimizerEngine - exact tier boundaries & multi-dimension transitions', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  // 1. Exact Grassroots boundary
  const grassrootsBoundary = engine.calculatePricing({
    donors: 1000,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100,
    billingFrequency: 'monthly'
  });
  assert.equal(grassrootsBoundary.tier.id, 'grassroots');
  assert.equal(grassrootsBoundary.tier.volumeDiscountRate, 0);

  // 2. Crossing into Community tier by single resource
  const communityByDonors = engine.calculatePricing({
    donors: 1001,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100
  });
  assert.equal(communityByDonors.tier.id, 'community');
  assert.equal(communityByDonors.tier.volumeDiscountRate, 0.10);

  const communityByVolunteers = engine.calculatePricing({
    donors: 1000,
    volunteers: 11,
    notifications: 5000,
    storage: 50,
    telemetry: 100
  });
  assert.equal(communityByVolunteers.tier.id, 'community');

  // 3. Exact Community boundary
  const communityBoundary = engine.calculatePricing({
    donors: 5000,
    volunteers: 50,
    notifications: 25000,
    storage: 250,
    telemetry: 500
  });
  assert.equal(communityBoundary.tier.id, 'community');

  // 4. Crossing into Regional tier by storage
  const regionalByStorage = engine.calculatePricing({
    donors: 5000,
    volunteers: 50,
    notifications: 25000,
    storage: 251,
    telemetry: 500
  });
  assert.equal(regionalByStorage.tier.id, 'regional');
  assert.equal(regionalByStorage.tier.volumeDiscountRate, 0.18);

  // 5. Exact Regional boundary
  const regionalBoundary = engine.calculatePricing({
    donors: 25000,
    volunteers: 200,
    notifications: 100000,
    storage: 1000,
    telemetry: 2500
  });
  assert.equal(regionalBoundary.tier.id, 'regional');

  // 6. Crossing into Global Relief tier
  const globalByNotifications = engine.calculatePricing({
    donors: 25000,
    volunteers: 200,
    notifications: 100001,
    storage: 1000,
    telemetry: 2500
  });
  assert.equal(globalByNotifications.tier.id, 'global');
  assert.equal(globalByNotifications.tier.volumeDiscountRate, 0.25);

  // 7. Manual tier override
  const forcedGlobal = engine.calculatePricing({
    donors: 100,
    volunteers: 2,
    notifications: 500,
    storage: 10,
    telemetry: 20,
    tier: 'global'
  });
  assert.equal(forcedGlobal.tier.id, 'global');
});

test('NonprofitImpactCostOptimizerEngine - applyVolumeDiscount calculation & rates', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  const discGrassroots = engine.applyVolumeDiscount('grassroots', 1000);
  assert.equal(discGrassroots.discountPercent, 0);
  assert.equal(discGrassroots.discountAmount, 0);
  assert.equal(discGrassroots.netCost, 1000);

  const discCommunity = engine.applyVolumeDiscount('community', 1000);
  assert.equal(discCommunity.discountPercent, 10);
  assert.equal(discCommunity.discountAmount, 100);
  assert.equal(discCommunity.netCost, 900);

  const discRegional = engine.applyVolumeDiscount(NONPROFIT_TIERS.regional, 1000);
  assert.equal(discRegional.discountPercent, 18);
  assert.equal(discRegional.discountAmount, 180);
  assert.equal(discRegional.netCost, 820);

  const discGlobal = engine.applyVolumeDiscount('global', 1000);
  assert.equal(discGlobal.discountPercent, 25);
  assert.equal(discGlobal.discountAmount, 250);
  assert.equal(discGlobal.netCost, 750);

  // Negative and zero base cost
  assert.equal(engine.applyVolumeDiscount('global', 0).discountAmount, 0);
  assert.equal(engine.applyVolumeDiscount('global', -500).discountAmount, 0);
});

test('NonprofitImpactCostOptimizerEngine - 501(c)(3) tax-exempt subsidy discount toggle', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  // Test Community tier with subsidy active (30% subsidy discount, 10% volume discount)
  // Grassroots: donors=1000 ($25), volunteers=10 ($50), notifications=5000 ($25), storage=50 ($6), telemetry=100 ($18) -> Subtotal = 124
  const quoteWithSubsidy = engine.calculatePricing({
    donors: 1000,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100,
    billingFrequency: 'monthly',
    isNonprofitVerified: true
  });
  // Grassroots subsidy rate is 25% (0.25)
  // Subtotal = 124. Volume discount = 0. Cost after volume = 124.
  // Subsidy = 124 * 0.25 = 31. Total = 93.
  assert.equal(quoteWithSubsidy.subtotal, 124);
  assert.equal(quoteWithSubsidy.volumeDiscountAmount, 0);
  assert.equal(quoteWithSubsidy.subsidyDiscountAmount, 31);
  assert.equal(quoteWithSubsidy.totalCost, 93);

  // Toggle subsidy off (non-verified / commercial)
  const quoteWithoutSubsidy = engine.calculatePricing({
    donors: 1000,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100,
    billingFrequency: 'monthly',
    isNonprofitVerified: false
  });
  assert.equal(quoteWithoutSubsidy.subtotal, 124);
  assert.equal(quoteWithoutSubsidy.subsidyDiscountAmount, 0);
  assert.equal(quoteWithoutSubsidy.totalCost, 124);
});

test('NonprofitImpactCostOptimizerEngine - annual billing discount & multiplier precision', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  const monthlyQuote = engine.calculatePricing({
    donors: 2000,
    volunteers: 20,
    notifications: 10000,
    storage: 100,
    telemetry: 200,
    billingFrequency: 'monthly',
    isNonprofitVerified: true
  });

  const annualQuote = engine.calculatePricing({
    donors: 2000,
    volunteers: 20,
    notifications: 10000,
    storage: 100,
    telemetry: 200,
    billingFrequency: 'annual',
    isNonprofitVerified: true
  });

  assert.equal(annualQuote.billingFrequency, 'annual');
  assert.equal(annualQuote.billingMultiplier, 12);
  assert.equal(annualQuote.subtotal, Math.round(monthlyQuote.subtotal * 12 * 100) / 100);
  assert.ok(annualQuote.annualDiscountAmount > 0);
  // Annual cost should be significantly less than 12x monthly cost due to 20% annual discount
  assert.ok(annualQuote.totalCost < monthlyQuote.totalCost * 12);
  assert.equal(annualQuote.monthlyEquivalentCost, Math.round((annualQuote.totalCost / 12) * 100) / 100);
});

test('NonprofitImpactCostOptimizerEngine - grant allowance offset & remaining credits', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  // Partial grant offset
  const partialGrantQuote = engine.calculatePricing({
    donors: 1000,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100,
    billingFrequency: 'monthly',
    isNonprofitVerified: true,
    grantAllowance: 40 // Net cost before grant is 93
  });
  assert.equal(partialGrantQuote.grossCost, 93);
  assert.equal(partialGrantQuote.grantOffsetApplied, 40);
  assert.equal(partialGrantQuote.grantRemaining, 0);
  assert.equal(partialGrantQuote.totalCost, 53);

  // Full grant coverage exceeding cost
  const fullGrantQuote = engine.calculatePricing({
    donors: 1000,
    volunteers: 10,
    notifications: 5000,
    storage: 50,
    telemetry: 100,
    billingFrequency: 'monthly',
    isNonprofitVerified: true,
    grantAllowance: 150 // Cost before grant is 93
  });
  assert.equal(fullGrantQuote.grossCost, 93);
  assert.equal(fullGrantQuote.grantOffsetApplied, 93);
  assert.equal(fullGrantQuote.grantRemaining, 57);
  assert.equal(fullGrantQuote.totalCost, 0);
});

test('NonprofitImpactCostOptimizerEngine - breakdown consistency with sum of line items', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();
  const quote = engine.calculatePricing({
    donors: 3500,
    volunteers: 30,
    notifications: 15000,
    storage: 150,
    telemetry: 300,
    billingFrequency: 'monthly'
  });

  const breakdownSum = Math.round(
    (quote.breakdown.donors +
     quote.breakdown.volunteers +
     quote.breakdown.notifications +
     quote.breakdown.storage +
     quote.breakdown.telemetry) * 100
  ) / 100;

  assert.equal(breakdownSum, quote.subtotal);
});

test('NonprofitImpactCostOptimizerEngine - generateQuote produces complete quote record', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();
  const quote = engine.generateQuote({
    donors: 1500,
    volunteers: 25,
    organizationName: 'Amazon Reforestation Trust',
    ein: '12-3456789'
  });

  assert.ok(quote.quoteId);
  assert.equal(quote.organizationName, 'Amazon Reforestation Trust');
  assert.equal(quote.ein, '12-3456789');
  assert.ok(quote.validUntil);
  assert.equal(quote.status, 'active_guaranteed');
  assert.equal(engine.getLastQuote().quoteId, quote.quoteId);
});

test('NonprofitImpactCostOptimizerEngine - optimizeAllocation fits resources within budget', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  // Zero budget
  const zeroOpt = engine.optimizeAllocation(0);
  assert.equal(zeroOpt.fitsBudget, true);
  assert.equal(zeroOpt.estimatedCost, 0);
  assert.equal(zeroOpt.allocation.donors, 0);

  // Reasonable budget: $120 / month
  const targetBudget = 120;
  const opt = engine.optimizeAllocation(targetBudget, {
    donors: 600,
    volunteers: 8,
    notifications: 3000,
    storage: 30,
    telemetry: 50,
    billingFrequency: 'monthly',
    isNonprofitVerified: true
  });

  assert.ok(opt.allocation.donors > 0);
  assert.ok(opt.allocation.volunteers > 0);
  assert.ok(opt.allocation.notifications > 0);
  assert.ok(opt.allocation.storage > 0);
  assert.ok(opt.allocation.telemetry > 0);
  assert.ok(opt.estimatedCost <= targetBudget);
  assert.equal(opt.fitsBudget, true);
  assert.ok(opt.budgetDifference >= 0);
  assert.ok(opt.recommendedTier);
});

test('NonprofitImpactCostOptimizerEngine - event emitter methods on, off, emit', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();

  let pricingEventCount = 0;
  let lastQuoteFromEvent = null;

  const unsubscribe = engine.on('pricingCalculated', (data) => {
    pricingEventCount++;
    lastQuoteFromEvent = data;
  });

  assert.equal(engine.listenerCount('pricingCalculated'), 1);

  engine.calculatePricing({ donors: 500 });
  assert.equal(pricingEventCount, 1);
  assert.ok(lastQuoteFromEvent);

  // Test unsubscribe function
  unsubscribe();
  assert.equal(engine.listenerCount('pricingCalculated'), 0);

  engine.calculatePricing({ donors: 600 });
  assert.equal(pricingEventCount, 1); // No new dispatch

  // Test quoteGenerated and allocationOptimized events
  let quoteEventTriggered = false;
  engine.on('quoteGenerated', () => { quoteEventTriggered = true; });
  engine.generateQuote();
  assert.equal(quoteEventTriggered, true);

  let allocEventTriggered = false;
  engine.on('allocationOptimized', () => { allocEventTriggered = true; });
  engine.optimizeAllocation(100);
  assert.equal(allocEventTriggered, true);

  // Listener error safety: a faulty listener doesn't throw or stop subsequent listeners
  let secondListenerFired = false;
  const originalConsoleError = console.error;
  console.error = () => {}; // suppress intentional test error log
  try {
    engine.on('testErrorSafety', () => { throw new Error('Boom!'); });
    engine.on('testErrorSafety', () => { secondListenerFired = true; });
    engine.emit('testErrorSafety', {});
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(secondListenerFired, true);

  // Rejection of invalid listener type
  assert.throws(() => {
    engine.on('pricingCalculated', 'not-a-function');
  }, TypeError);
});

test('NonprofitImpactCostOptimizerEngine - high scale enterprise/global relief parameters', () => {
  const engine = new NonprofitImpactCostOptimizerEngine();
  const megaQuote = engine.calculatePricing({
    donors: 500000,
    volunteers: 5000,
    notifications: 2000000,
    storage: 50000,
    telemetry: 100000,
    billingFrequency: 'annual',
    isNonprofitVerified: true
  });

  assert.equal(megaQuote.tier.id, 'global');
  assert.equal(megaQuote.tier.volumeDiscountPercent, 25);
  assert.equal(megaQuote.tier.subsidyDiscountPercent, 40);
  assert.ok(Number.isFinite(megaQuote.totalCost));
  assert.ok(megaQuote.totalCost > 0);
  assert.ok(megaQuote.totalDiscountAmount > 0);
});
