import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TravelOdysseyCostOptimizerEngine,
  TIERS,
  AGENCY_PRESETS
} from './cost-optimizer.js';

test('TravelOdysseyCostOptimizerEngine - initializes with default values & currency USD', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();
  const quote = engine.calculatePricing();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.currencySymbol, '$');
  assert.equal(quote.inputs.apiRequests, 20);
  assert.equal(quote.inputs.flightSearches, 8000);
  assert.equal(quote.inputs.hotelSyncNodes, 4);
  assert.equal(quote.inputs.mapCacheStorage, 150);
  assert.equal(quote.inputs.flightAlerts, 3500);
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.totalCost > 0);
  assert.equal(quote.tier.id, 'backpacker');
  assert.ok(quote.breakdown);
});

test('TravelOdysseyCostOptimizerEngine - sanitizes negative, invalid, and edge-case inputs safely', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  const edgeCases = [
    { apiRequests: -10, flightSearches: -500, hotelSyncNodes: -2, mapCacheStorage: -50, flightAlerts: -100 },
    { apiRequests: NaN, flightSearches: Infinity, hotelSyncNodes: -Infinity, mapCacheStorage: null, flightAlerts: undefined },
    { apiRequests: 'invalid', flightSearches: '12000', hotelSyncNodes: false, mapCacheStorage: true, flightAlerts: {} }
  ];

  for (const input of edgeCases) {
    const quote = engine.calculatePricing(input);
    assert.ok(Number.isFinite(quote.subtotal));
    assert.ok(Number.isFinite(quote.totalCost));
    assert.ok(quote.subtotal >= 0);
    assert.ok(quote.totalCost >= 0);
    assert.ok(quote.inputs.apiRequests >= 0);
    assert.ok(quote.inputs.flightSearches >= 0);
    assert.ok(quote.inputs.hotelSyncNodes >= 0);
    assert.ok(quote.inputs.mapCacheStorage >= 0);
    assert.ok(quote.inputs.flightAlerts >= 0);
  }
});

test('TravelOdysseyCostOptimizerEngine - zero usage returns zero cost', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();
  const quote = engine.calculatePricing({
    apiRequests: 0,
    flightSearches: 0,
    hotelSyncNodes: 0,
    mapCacheStorage: 0,
    flightAlerts: 0,
    billingFrequency: 'monthly'
  });

  assert.equal(quote.subtotal, 0);
  assert.equal(quote.totalCost, 0);
  assert.equal(quote.totalDiscountAmount, 0);
  assert.equal(quote.breakdown.apiRequests, 0);
  assert.equal(quote.breakdown.flightSearches, 0);
  assert.equal(quote.breakdown.hotelSyncNodes, 0);
  assert.equal(quote.breakdown.mapCacheStorage, 0);
  assert.equal(quote.breakdown.flightAlerts, 0);
  assert.equal(quote.tier.id, 'backpacker');
  assert.equal(quote.costPerBooking, 0);
});

test('TravelOdysseyCostOptimizerEngine - standalone applyVolumeDiscount validation & precision', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  const dBackpacker = engine.applyVolumeDiscount('backpacker', 1000);
  assert.equal(dBackpacker.tierId, 'backpacker');
  assert.equal(dBackpacker.discountRate, 0);
  assert.equal(dBackpacker.discountAmount, 0);
  assert.equal(dBackpacker.netCost, 1000);

  const dRegional = engine.applyVolumeDiscount('regional', 1000);
  assert.equal(dRegional.tierId, 'regional');
  assert.equal(dRegional.discountRate, 0.10);
  assert.equal(dRegional.discountPercent, 10);
  assert.equal(dRegional.discountAmount, 100);
  assert.equal(dRegional.netCost, 900);

  const dEnterprise = engine.applyVolumeDiscount('enterprise', 1000);
  assert.equal(dEnterprise.tierId, 'enterprise');
  assert.equal(dEnterprise.discountRate, 0.18);
  assert.equal(dEnterprise.discountPercent, 18);
  assert.equal(dEnterprise.discountAmount, 180);
  assert.equal(dEnterprise.netCost, 820);

  const dSovereign = engine.applyVolumeDiscount('sovereign', 1000);
  assert.equal(dSovereign.tierId, 'sovereign');
  assert.equal(dSovereign.discountRate, 0.25);
  assert.equal(dSovereign.discountPercent, 25);
  assert.equal(dSovereign.discountAmount, 250);
  assert.equal(dSovereign.netCost, 750);

  // Fallback on unknown string
  const dUnknown = engine.applyVolumeDiscount('non_existent', 500);
  assert.equal(dUnknown.discountRate, 0);
  assert.equal(dUnknown.netCost, 500);
});

test('TravelOdysseyCostOptimizerEngine - exact tier thresholds and boundary transitions', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  // 1. Exact upper boundary of Tier 1: Backpacker
  // Limits: api: 25, flight: 10000, hotel: 5, map: 200, alerts: 5000
  const bpBoundary = engine.calculatePricing({
    apiRequests: 25,
    flightSearches: 10000,
    hotelSyncNodes: 5,
    mapCacheStorage: 200,
    flightAlerts: 5000,
    billingFrequency: 'monthly'
  });
  assert.equal(bpBoundary.tier.id, 'backpacker');
  assert.equal(bpBoundary.tier.discountRate, 0);
  // Rates: api: 2.50, flight: 0.0050, hotel: 45.00, map: 0.20, alerts: 0.0100
  // Cost: 25*2.5 + 10000*0.005 + 5*45 + 200*0.2 + 5000*0.01 = 62.5 + 50 + 225 + 40 + 50 = 427.50
  assert.equal(bpBoundary.subtotal, 427.50);
  assert.equal(bpBoundary.totalCost, 427.50);

  // 2. Crossing into Tier 2: Regional (exceeding apiRequests by 1)
  const regEntryApi = engine.calculatePricing({
    apiRequests: 26,
    flightSearches: 10000,
    hotelSyncNodes: 5,
    mapCacheStorage: 200,
    flightAlerts: 5000,
    billingFrequency: 'monthly'
  });
  assert.equal(regEntryApi.tier.id, 'regional');
  assert.equal(regEntryApi.tier.discountRate, 0.10);

  // 3. Exact upper boundary of Tier 2: Regional
  // Limits: api: 100, flight: 50000, hotel: 20, map: 1000, alerts: 25000
  const regBoundary = engine.calculatePricing({
    apiRequests: 100,
    flightSearches: 50000,
    hotelSyncNodes: 20,
    mapCacheStorage: 1000,
    flightAlerts: 25000,
    billingFrequency: 'monthly'
  });
  assert.equal(regBoundary.tier.id, 'regional');
  assert.equal(regBoundary.tier.discountRate, 0.10);
  // Regional rates: api: 2.00, flight: 0.0040, hotel: 38.00, map: 0.16, alerts: 0.0080
  // Base: 100*2 + 50000*0.004 + 20*38 + 1000*0.16 + 25000*0.008
  // Base: 200 + 200 + 760 + 160 + 200 = 1520.00
  // 10% volume discount: 152.00 -> total: 1368.00
  assert.equal(regBoundary.subtotal, 1520.00);
  assert.equal(regBoundary.volumeDiscountAmount, 152.00);
  assert.equal(regBoundary.totalCost, 1368.00);

  // 4. Crossing into Tier 3: Enterprise (exceeding flightSearches by 1)
  const entEntryFlight = engine.calculatePricing({
    apiRequests: 100,
    flightSearches: 50001,
    hotelSyncNodes: 20,
    mapCacheStorage: 1000,
    flightAlerts: 25000,
    billingFrequency: 'monthly'
  });
  assert.equal(entEntryFlight.tier.id, 'enterprise');
  assert.equal(entEntryFlight.tier.discountRate, 0.18);

  // 5. Exact upper boundary of Tier 3: Enterprise
  // Limits: api: 300, flight: 200000, hotel: 60, map: 4000, alerts: 100000
  const entBoundary = engine.calculatePricing({
    apiRequests: 300,
    flightSearches: 200000,
    hotelSyncNodes: 60,
    mapCacheStorage: 4000,
    flightAlerts: 100000,
    billingFrequency: 'monthly'
  });
  assert.equal(entBoundary.tier.id, 'enterprise');
  assert.equal(entBoundary.tier.discountRate, 0.18);

  // 6. Crossing into Tier 4: Sovereign (exceeding hotelSyncNodes by 1)
  const sovEntry = engine.calculatePricing({
    apiRequests: 300,
    flightSearches: 200000,
    hotelSyncNodes: 61,
    mapCacheStorage: 4000,
    flightAlerts: 100000,
    billingFrequency: 'monthly'
  });
  assert.equal(sovEntry.tier.id, 'sovereign');
  assert.equal(sovEntry.tier.discountRate, 0.25);
});

test('TravelOdysseyCostOptimizerEngine - annual multi-year contract discount (20% off)', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  // Test with Backpacker tier
  // Monthly base: 20*2.5 + 8000*0.005 + 4*45 + 150*0.2 + 3500*0.01 = 50 + 40 + 180 + 30 + 35 = 335.00
  // Annual subtotal: 335 * 12 = 4020.00
  // Volume discount (0%): 0
  // Annual discount: 4020 * 0.20 = 804.00
  // Total cost: 4020 - 804 = 3216.00
  const annualBp = engine.calculatePricing({
    apiRequests: 20,
    flightSearches: 8000,
    hotelSyncNodes: 4,
    mapCacheStorage: 150,
    flightAlerts: 3500,
    billingFrequency: 'annual'
  });

  assert.equal(annualBp.billingFrequency, 'annual');
  assert.equal(annualBp.annualMultiplier, 12);
  assert.equal(annualBp.subtotal, 4020.00);
  assert.equal(annualBp.volumeDiscountAmount, 0);
  assert.equal(annualBp.annualDiscountAmount, 804.00);
  assert.equal(annualBp.totalDiscountAmount, 804.00);
  assert.equal(annualBp.totalCost, 3216.00);
  assert.equal(annualBp.monthlyEquivalentCost, 268.00);

  // Test with Regional tier (Combined volume 10% + annual 20% discounts)
  // Monthly base: 100*2 + 50000*0.004 + 20*38 + 1000*0.16 + 25000*0.008 = 1520.00
  // Annual subtotal: 1520 * 12 = 18240.00
  // Volume discount: 18240 * 0.10 = 1824.00
  // Net after volume discount: 18240 - 1824 = 16416.00
  // Annual discount: 16416 * 0.20 = 3283.20
  // Total discount: 1824 + 3283.20 = 5107.20
  // Total cost: 18240 - 5107.20 = 13132.80
  const annualReg = engine.calculatePricing({
    apiRequests: 100,
    flightSearches: 50000,
    hotelSyncNodes: 20,
    mapCacheStorage: 1000,
    flightAlerts: 25000,
    billingFrequency: 'annual'
  });

  assert.equal(annualReg.subtotal, 18240.00);
  assert.equal(annualReg.volumeDiscountAmount, 1824.00);
  assert.equal(annualReg.annualDiscountAmount, 3283.20);
  assert.equal(annualReg.totalDiscountAmount, 5107.20);
  assert.equal(annualReg.totalCost, 13132.80);
});

test('TravelOdysseyCostOptimizerEngine - booking efficiency metrics', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();
  const quote = engine.calculatePricing({
    apiRequests: 50,
    flightSearches: 20000,
    hotelSyncNodes: 10,
    mapCacheStorage: 500,
    flightAlerts: 10000,
    billingFrequency: 'monthly'
  });

  assert.ok(quote.estimatedBookingsSupported > 0);
  assert.ok(quote.costPerBooking > 0);
  assert.ok(quote.costPerBooking < quote.totalCost);
});

test('TravelOdysseyCostOptimizerEngine - optimizeAllocation within target budget', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  // Test budget of $500/month
  const result = engine.optimizeAllocation(500, {
    apiRequests: 10,
    flightSearches: 2000,
    hotelSyncNodes: 2,
    mapCacheStorage: 50,
    flightAlerts: 1000
  });

  assert.equal(result.withinBudget, true);
  assert.ok(result.quote.totalCost <= 500);
  assert.ok(result.allocatedResources.flightSearches >= 2000);
  assert.ok(result.allocatedResources.apiRequests >= 10);
  assert.ok(result.allocatedResources.hotelSyncNodes >= 2);
  assert.ok(result.allocatedResources.mapCacheStorage >= 50);
  assert.ok(result.allocatedResources.flightAlerts >= 1000);
});

test('TravelOdysseyCostOptimizerEngine - optimizeAllocation handling budget below minimum needs', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  // Require resources costing far more than $50
  const result = engine.optimizeAllocation(50, {
    apiRequests: 100,
    flightSearches: 50000,
    hotelSyncNodes: 20,
    mapCacheStorage: 1000,
    flightAlerts: 25000
  });

  assert.equal(result.withinBudget, false);
  assert.ok(result.quote.totalCost > 50);
  assert.ok(result.message.includes('exceed target budget'));
});

test('TravelOdysseyCostOptimizerEngine - optimizeAllocation with zero or negative budget', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  const zeroResult = engine.optimizeAllocation(0);
  assert.equal(zeroResult.targetBudget, 0);
  assert.equal(zeroResult.quote.totalCost, 0);
  assert.equal(zeroResult.withinBudget, true);

  const negResult = engine.optimizeAllocation(-150);
  assert.equal(negResult.targetBudget, 0);
  assert.equal(negResult.quote.totalCost, 0);
  assert.equal(negResult.withinBudget, true);
});

test('TravelOdysseyCostOptimizerEngine - event emitter (on, emit, off) pattern', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  let calculateFired = 0;
  let quoteFired = 0;
  let optimizeFired = 0;

  const onCalc = () => { calculateFired++; };
  const onQuote = () => { quoteFired++; };
  const onOpt = () => { optimizeFired++; };

  engine.on('calculate', onCalc);
  engine.on('quote', onQuote);
  engine.on('optimize', onOpt);

  engine.calculatePricing();
  assert.equal(calculateFired, 1);

  engine.generateQuote();
  assert.equal(quoteFired, 1);

  engine.optimizeAllocation(300);
  assert.equal(optimizeFired, 1);

  // Test deregistration with off
  const previousCalcCount = calculateFired;
  engine.off('calculate', onCalc);
  engine.calculatePricing();
  assert.equal(calculateFired, previousCalcCount); // should not increment after deregistration
});

test('TravelOdysseyCostOptimizerEngine - generateQuote schema and uniqueness', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();
  const quote1 = engine.generateQuote({ agencyName: 'Alpine Explorers' });
  const quote2 = engine.generateQuote({ agencyName: 'Safari Horizons' });

  assert.ok(quote1.quoteId.startsWith('TO-Q-'));
  assert.ok(quote2.quoteId.startsWith('TO-Q-'));
  assert.notEqual(quote1.quoteId, quote2.quoteId);
  assert.equal(quote1.agencyName, 'Alpine Explorers');
  assert.equal(quote2.agencyName, 'Safari Horizons');
  assert.ok(quote1.issuedAt);
  assert.ok(quote1.expiresAt);
  assert.ok(quote1.breakdown);
  assert.ok(quote1.totalCost >= 0);
});

test('TravelOdysseyCostOptimizerEngine - agency presets consistency', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  for (const [key, preset] of Object.entries(AGENCY_PRESETS)) {
    assert.ok(preset.name);
    assert.ok(preset.description);
    const quote = engine.calculatePricing(preset.inputs);
    assert.ok(quote.totalCost > 0);
    assert.ok(quote.tier.id);
  }
});

test('TravelOdysseyCostOptimizerEngine - mathematical integrity and subtotal reconciliation', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();
  const testScenarios = [
    { apiRequests: 10, flightSearches: 5000, hotelSyncNodes: 2, mapCacheStorage: 50, flightAlerts: 1000, billingFrequency: 'monthly' },
    { apiRequests: 120, flightSearches: 80000, hotelSyncNodes: 35, mapCacheStorage: 1500, flightAlerts: 40000, billingFrequency: 'monthly' },
    { apiRequests: 120, flightSearches: 80000, hotelSyncNodes: 35, mapCacheStorage: 1500, flightAlerts: 40000, billingFrequency: 'annual' },
    { apiRequests: 500, flightSearches: 500000, hotelSyncNodes: 100, mapCacheStorage: 5000, flightAlerts: 200000, billingFrequency: 'annual' }
  ];

  for (const scenario of testScenarios) {
    const q = engine.calculatePricing(scenario);

    // Sum of breakdown items must equal subtotal (within rounding tolerance)
    const breakdownSum = Math.round((
      q.breakdown.apiRequests +
      q.breakdown.flightSearches +
      q.breakdown.hotelSyncNodes +
      q.breakdown.mapCacheStorage +
      q.breakdown.flightAlerts
    ) * 100) / 100;

    assert.equal(breakdownSum, q.subtotal);

    // totalCost + totalDiscountAmount must equal subtotal (within rounding tolerance)
    const reconciled = Math.round((q.totalCost + q.totalDiscountAmount) * 100) / 100;
    assert.equal(reconciled, q.subtotal);
  }
});

test('TravelOdysseyCostOptimizerEngine - event emitter edge cases', () => {
  const engine = new TravelOdysseyCostOptimizerEngine();

  // Emitting with no listeners returns false
  assert.equal(engine.emit('unregistered_event'), false);

  // on() with non-function does not throw and returns engine
  assert.equal(engine.on('some_event', null), engine);
  assert.equal(engine.on('some_event', 'not-a-fn'), engine);

  // off() on non-existent event does not throw and returns engine
  assert.equal(engine.off('unregistered_event', () => {}), engine);
});
