import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AutomotiveHypercarCostOptimizerEngine,
  VOLUME_TIERS,
  CHASSIS_OPTIONS,
  AERO_OPTIONS,
  BRAKE_OPTIONS,
  EXHAUST_OPTIONS,
  WHEEL_OPTIONS,
  TELEMETRY_OPTIONS
} from './cost-optimizer.js';

test('AutomotiveHypercarCostOptimizerEngine - initializes with default values & currency USD', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  assert.equal(engine.currency, 'USD');
  assert.equal(engine.currencySymbol, '$');
  assert.equal(engine.cashDiscountRate, 0.10);
  assert.equal(engine.financingTermMonths, 48);
  assert.equal(engine.currentInputs.chassis, 'apex-v8');
  assert.equal(engine.currentInputs.aero, 'stage-1');
  assert.equal(engine.currentInputs.brakes, 'standard-ceramic');
  assert.equal(engine.currentInputs.exhaust, 'inconel-sport');
  assert.equal(engine.currentInputs.wheels, 'forged-aluminum');
  assert.equal(engine.currentInputs.telemetry, 'standard-telemetry');
  assert.equal(engine.currentInputs.paymentTerms, 'cash');

  const quote = engine.generateQuote();
  assert.ok(quote.quoteId.startsWith('HFQ-'));
  assert.equal(quote.status, 'OFFICIAL_FACTORY_QUOTE');
  assert.ok(quote.totalCost > 0);
  assert.ok(quote.performance.horsepower >= 780);
});

test('Tier boundary calculations - exact threshold transitions', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Tier 1: $500k - $1.5M (0% discount)
  const tier1Low = engine.determineVolumeTier(500000);
  assert.equal(tier1Low.id, 'tier1');
  assert.equal(tier1Low.discountRate, 0.0);

  const tier1High = engine.determineVolumeTier(1499999);
  assert.equal(tier1High.id, 'tier1');
  assert.equal(tier1High.discountRate, 0.0);

  const sub500k = engine.determineVolumeTier(250000);
  assert.equal(sub500k.id, 'tier1');
  assert.equal(sub500k.discountRate, 0.0);

  // Tier 2: $1.5M - $3.0M (5% performance incentive)
  const tier2Boundary = engine.determineVolumeTier(1500000);
  assert.equal(tier2Boundary.id, 'tier2');
  assert.equal(tier2Boundary.discountRate, 0.05);

  const tier2Mid = engine.determineVolumeTier(2200000);
  assert.equal(tier2Mid.id, 'tier2');
  assert.equal(tier2Mid.discountRate, 0.05);

  const tier2High = engine.determineVolumeTier(2999999);
  assert.equal(tier2High.id, 'tier2');
  assert.equal(tier2High.discountRate, 0.05);

  // Tier 3: $3.0M - $5.0M (10% VIP paddock package)
  const tier3Boundary = engine.determineVolumeTier(3000000);
  assert.equal(tier3Boundary.id, 'tier3');
  assert.equal(tier3Boundary.discountRate, 0.10);

  const tier3Mid = engine.determineVolumeTier(4200000);
  assert.equal(tier3Mid.id, 'tier3');
  assert.equal(tier3Mid.discountRate, 0.10);

  const tier3High = engine.determineVolumeTier(5000000);
  assert.equal(tier3High.id, 'tier3');
  assert.equal(tier3High.discountRate, 0.10);

  // Tier 4: > $5.0M (18% factory racing team allocation)
  const tier4Entry = engine.determineVolumeTier(5000001);
  assert.equal(tier4Entry.id, 'tier4');
  assert.equal(tier4Entry.discountRate, 0.18);

  const tier4High = engine.determineVolumeTier(7500000);
  assert.equal(tier4High.id, 'tier4');
  assert.equal(tier4High.discountRate, 0.18);
});

test('applyVolumeDiscount - calculation and precision across tier identifiers', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Call with auto-detection by cost
  const dAuto1 = engine.applyVolumeDiscount(1000000);
  assert.equal(dAuto1.tier.id, 'tier1');
  assert.equal(dAuto1.discountAmount, 0);
  assert.equal(dAuto1.netCost, 1000000);

  const dAuto2 = engine.applyVolumeDiscount(2000000);
  assert.equal(dAuto2.tier.id, 'tier2');
  assert.equal(dAuto2.discountRate, 0.05);
  assert.equal(dAuto2.discountAmount, 100000);
  assert.equal(dAuto2.netCost, 1900000);

  const dAuto3 = engine.applyVolumeDiscount(4000000);
  assert.equal(dAuto3.tier.id, 'tier3');
  assert.equal(dAuto3.discountRate, 0.10);
  assert.equal(dAuto3.discountAmount, 400000);
  assert.equal(dAuto3.netCost, 3600000);

  const dAuto4 = engine.applyVolumeDiscount(6000000);
  assert.equal(dAuto4.tier.id, 'tier4');
  assert.equal(dAuto4.discountRate, 0.18);
  assert.equal(dAuto4.discountAmount, 1080000);
  assert.equal(dAuto4.netCost, 4920000);

  // Call with explicit tier ID
  const dTier2 = engine.applyVolumeDiscount('tier2', 2000000);
  assert.equal(dTier2.discountPercent, 5);
  assert.equal(dTier2.discountAmount, 100000);

  // Call with numeric tier level
  const dLevel3 = engine.applyVolumeDiscount(3, 3000000);
  assert.equal(dLevel3.discountPercent, 10);
  assert.equal(dLevel3.discountAmount, 300000);

  // Call with tier object
  const dObj = engine.applyVolumeDiscount(VOLUME_TIERS.tier4, 10000000);
  assert.equal(dObj.discountPercent, 18);
  assert.equal(dObj.discountAmount, 1800000);
  assert.equal(dObj.netCost, 8200000);
});

test('Financing vs Cash Settlement - 10% cash savings incentive verification', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Base Apex GT build:
  // chassis: 850,000, aero: 120,000, brakes: 95,000, exhaust: 75,000, wheels: 45,000, telemetry: 60,000
  // baseCost = 1,245,000 (Tier 1: 0% volume discount)
  const cashPricing = engine.calculatePricing({
    chassis: 'apex-v8',
    aero: 'stage-1',
    brakes: 'standard-ceramic',
    exhaust: 'inconel-sport',
    wheels: 'forged-aluminum',
    telemetry: 'standard-telemetry',
    paymentTerms: 'cash'
  });

  assert.equal(cashPricing.baseCost, 1245000);
  assert.equal(cashPricing.tier.id, 'tier1');
  assert.equal(cashPricing.volumeDiscountAmount, 0);
  assert.equal(cashPricing.isCashSettlement, true);
  // 10% of 1,245,000 = 124,500
  assert.equal(cashPricing.cashDiscountAmount, 124500);
  assert.equal(cashPricing.totalDiscountAmount, 124500);
  assert.equal(cashPricing.totalCost, 1120500);

  const financedPricing = engine.calculatePricing({
    chassis: 'apex-v8',
    aero: 'stage-1',
    brakes: 'standard-ceramic',
    exhaust: 'inconel-sport',
    wheels: 'forged-aluminum',
    telemetry: 'standard-telemetry',
    paymentTerms: 'financed'
  });

  assert.equal(financedPricing.baseCost, 1245000);
  assert.equal(financedPricing.isCashSettlement, false);
  assert.equal(financedPricing.cashDiscountAmount, 0);
  assert.equal(financedPricing.totalDiscountAmount, 0);
  assert.equal(financedPricing.totalCost, 1245000);
  // Monthly payment estimate over 48 months: 1,245,000 / 48 = 25,937.5
  assert.equal(financedPricing.financedMonthlyEstimate, 25937.5);
});

test('Multi-tier compounding discounts - Volume + Cash Settlement', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Build Chiron W16 with top specs:
  // chassis: 3,800,000, aero: stage-3 (480,000), brakes: extreme (195,000), exhaust: titanium (150,000),
  // wheels: carbon (210,000), telemetry: pit-crew (360,000)
  // Total base: 3,800,000 + 480,000 + 195,000 + 150,000 + 210,000 + 360,000 = 5,195,000 (> $5M -> Tier 4: 18%)
  const highTierBuild = engine.calculatePricing({
    chassis: 'chiron-w16',
    aero: 'stage-3',
    brakes: 'extreme-ceramic',
    exhaust: 'titanium-f1',
    wheels: 'carbon-composite',
    telemetry: 'pit-crew-vip',
    paymentTerms: 'cash'
  });

  assert.equal(highTierBuild.baseCost, 5195000);
  assert.equal(highTierBuild.tier.id, 'tier4');
  assert.equal(highTierBuild.volumeDiscountPercent, 18);

  // Volume discount: 5,195,000 * 0.18 = 935,100
  assert.equal(highTierBuild.volumeDiscountAmount, 935100);
  // Cost after volume discount: 5,195,000 - 935,100 = 4,259,900
  assert.equal(highTierBuild.costAfterVolumeDiscount, 4259900);
  // Cash discount: 4,259,900 * 0.10 = 425,990
  assert.equal(highTierBuild.cashDiscountAmount, 425990);
  // Total discount: 935,100 + 425,990 = 1,361,090
  assert.equal(highTierBuild.totalDiscountAmount, 1361090);
  // Final net cost: 5,195,000 - 1,361,090 = 3,833,910
  assert.equal(highTierBuild.totalCost, 3833910);
});

test('Performance metric calculations - accurately combines chassis and component specs', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Test Valkyrie V12 with Stage 3 aero, titanium exhaust, carbon wheels
  const pricing = engine.calculatePricing({
    chassis: 'valkyrie-v12',
    aero: 'stage-3',
    brakes: 'extreme-ceramic',
    exhaust: 'titanium-f1',
    wheels: 'carbon-composite',
    telemetry: 'standard-telemetry'
  });

  const perf = pricing.performance;

  // Base HP: 1160 + exhaust titanium (+35) = 1195 HP
  assert.equal(perf.horsepower, 1195);

  // Top speed: 395 km/h + aero stage-3 (-8) = 387 km/h
  assert.equal(perf.topSpeedKmh, 387);

  // Downforce: 850 + aero stage-3 (+650) = 1500 kg
  assert.equal(perf.downforceKg, 1500);

  // 0-100: 2.35s + carbon wheels (-0.10s) = 2.25s
  assert.equal(perf.acceleration0to100, 2.25);

  // Braking 100-0 with extreme ceramic: 27.8m
  assert.equal(perf.brakingDistance100to0, 27.8);

  // Weight: 1220 (base) + 28 (aero) - 22 (brakes) - 20 (exhaust) - 26 (wheels) = 1180 kg
  assert.equal(perf.weightKg, 1180);

  // Power to weight ratio: (1195 / 1180) * 1000 = 1012.7 HP/ton
  assert.equal(perf.powerToWeightHpPerTon, 1012.7);
});

test('generateQuote - produces complete official factory quote payload', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  let eventEmitted = false;
  engine.on('quote:generated', (quote) => {
    eventEmitted = true;
    assert.ok(quote.quoteId);
    assert.equal(quote.status, 'OFFICIAL_FACTORY_QUOTE');
  });

  const quote = engine.generateQuote({
    clientName: 'Lord Sterling',
    dealerPartner: 'Mayfair Atelier London',
    chassis: 'valkyrie-v12',
    paymentTerms: 'cash'
  });

  assert.equal(eventEmitted, true);
  assert.ok(quote.quoteId.startsWith('HFQ-'));
  assert.equal(quote.clientName, 'Lord Sterling');
  assert.equal(quote.dealerPartner, 'Mayfair Atelier London');
  assert.ok(quote.buildSlotAllocation.chassisVIN.startsWith('APX-'));
  assert.ok(quote.validUntil > quote.generatedAt);
  assert.ok(quote.totalCost > 0);
  assert.equal(quote.currency, 'USD');
});

test('optimizeAllocation - finds optimal hypercar build within budget constraints', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // 1. Budget of $1,500,000 (Apex GT V8 domain)
  const opt1 = engine.optimizeAllocation(1500000, { paymentTerms: 'cash' });
  assert.equal(opt1.success, true);
  assert.ok(opt1.pricing.totalCost <= 1500000);
  assert.equal(opt1.configuration.chassis, 'apex-v8');
  assert.ok(opt1.budgetRemaining >= 0);
  assert.ok(opt1.utilizationRate > 0);

  // 2. Budget of $3,000,000 (Valkyrie V12 domain)
  const opt2 = engine.optimizeAllocation(3000000, { paymentTerms: 'cash' });
  assert.equal(opt2.success, true);
  assert.ok(opt2.pricing.totalCost <= 3000000);
  assert.equal(opt2.configuration.chassis, 'valkyrie-v12');

  // 3. Budget with strict specs (minTopSpeed: 420 km/h -> Requires Chiron or Bolide)
  const optSpeed = engine.optimizeAllocation(4500000, { minTopSpeed: 420, paymentTerms: 'cash' });
  assert.equal(optSpeed.success, true);
  assert.ok(optSpeed.pricing.performance.topSpeedKmh >= 420);
  assert.ok(optSpeed.pricing.totalCost <= 4500000);

  // 4. Insufficient budget for unattainable requirements
  const optImpossible = engine.optimizeAllocation(500000, { minHorsepower: 1800, minTopSpeed: 450 });
  assert.equal(optImpossible.success, false);
  assert.ok(optImpossible.reason);
  assert.ok(optImpossible.nearestConfiguration);
  assert.ok(optImpossible.budgetRemaining < 0);
});

test('Input sanitization & robustness against extreme and malformed inputs', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  // Malformed inputs to calculatePricing
  const weirdInputs = [
    {},
    null,
    undefined,
    { chassis: 'non-existent-chassis', aero: 999 },
    { chassis: null, brakes: undefined, exhaust: NaN },
    { paymentTerms: 'crypto', cashSettlement: 'yes' }
  ];

  for (const input of weirdInputs) {
    const pricing = engine.calculatePricing(input || {});
    assert.ok(Number.isFinite(pricing.baseCost));
    assert.ok(Number.isFinite(pricing.totalCost));
    assert.ok(pricing.totalCost > 0);
    assert.ok(pricing.tier);
    assert.ok(pricing.performance.horsepower > 0);
  }

  // Malformed budget in optimizeAllocation
  const badBudgetResult = engine.optimizeAllocation(-1000);
  assert.equal(badBudgetResult.success, false);
  assert.equal(badBudgetResult.targetBudget, 0);

  const nanBudgetResult = engine.optimizeAllocation(NaN);
  assert.equal(nanBudgetResult.success, false);
  assert.equal(nanBudgetResult.targetBudget, 0);
});

test('Event emitter pub/sub functionality - on, off, and emit', () => {
  const engine = new AutomotiveHypercarCostOptimizerEngine();

  let callCount = 0;
  let receivedData = null;

  const unsubscribe = engine.on('test:event', (data) => {
    callCount++;
    receivedData = data;
  });

  engine.emit('test:event', { payload: 42 });
  assert.equal(callCount, 1);
  assert.equal(receivedData.payload, 42);

  // Unsubscribe
  unsubscribe();
  engine.emit('test:event', { payload: 100 });
  assert.equal(callCount, 1); // Not called again

  // Listener throwing error should not break emit
  engine.on('safe:event', () => {
    throw new Error('Listener failed intentionally');
  });
  assert.doesNotThrow(() => {
    engine.emit('safe:event', { ok: true });
  });
});
