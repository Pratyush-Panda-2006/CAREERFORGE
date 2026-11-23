import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HealthVitalityCostOptimizerEngine,
  HEALTH_TIERS,
  RESOURCE_METRICS,
  mountCostOptimizer
} from './cost-optimizer.js';

test('HealthVitalityCostOptimizerEngine - initializes with default values & currency USD', () => {
  const engine = new HealthVitalityCostOptimizerEngine();
  const quote = engine.generateQuote();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.currencySymbol, '$');
  assert.equal(quote.annualDiscountRate, 0.20);
  assert.equal(quote.inputs.patientProfiles, 750);
  assert.equal(quote.inputs.telehealthHours, 150);
  assert.equal(quote.inputs.iotSyncData, 350);
  assert.equal(quote.inputs.aiConsults, 120);
  assert.equal(quote.inputs.hipaaStorage, 10);
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.totalCost > 0);
  assert.ok(quote.tier);
  assert.ok(quote.breakdown);
  assert.ok(Array.isArray(quote.complianceBadges));
  assert.ok(quote.complianceBadges.length >= 4);
});

test('HealthVitalityCostOptimizerEngine - sanitization and edge cases for inputs', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Zero inputs
  const zeroQuote = engine.calculatePricing({
    patientProfiles: 0,
    telehealthHours: 0,
    iotSyncData: 0,
    aiConsults: 0,
    hipaaStorage: 0,
    billingFrequency: 'monthly'
  });

  assert.equal(zeroQuote.subtotal, 0);
  assert.equal(zeroQuote.totalCost, 0);
  assert.equal(zeroQuote.totalDiscountAmount, 0);
  assert.equal(zeroQuote.perPatientCareIndex, 0);
  assert.equal(zeroQuote.tier.id, 'clinic');

  // Negative numbers clamped to 0
  assert.equal(engine.sanitizeInput(-50), 0);
  assert.equal(engine.sanitizeInput(-0.001), 0);

  // Floating point values floored
  assert.equal(engine.sanitizeInput(125.85), 125);
  assert.equal(engine.sanitizeInput(0.99), 0);

  // Invalid non-numerics sanitized to 0
  assert.equal(engine.sanitizeInput(null), 0);
  assert.equal(engine.sanitizeInput(undefined), 0);
  assert.equal(engine.sanitizeInput(NaN), 0);
  assert.equal(engine.sanitizeInput(true), 0);
  assert.equal(engine.sanitizeInput(false), 0);
  assert.equal(engine.sanitizeInput('invalid'), 0);

  // Numeric string parsed
  assert.equal(engine.sanitizeInput('250'), 250);
});

test('HealthVitalityCostOptimizerEngine - exact tier thresholds and volume transitions', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Exact upper boundary of Clinic Tier: 1,000 patients
  const clinicBoundary = engine.calculatePricing({ patientProfiles: 1000 });
  assert.equal(clinicBoundary.tier.id, 'clinic');
  assert.equal(clinicBoundary.tier.discountRate, 0.0);
  assert.equal(clinicBoundary.tier.clinicalSubsidyRate, 0.05);

  // Immediately above Clinic boundary: 1,001 patients -> Hospital Network
  const hospitalEntry = engine.calculatePricing({ patientProfiles: 1001 });
  assert.equal(hospitalEntry.tier.id, 'hospital');
  assert.equal(hospitalEntry.tier.discountRate, 0.10);
  assert.equal(hospitalEntry.tier.clinicalSubsidyRate, 0.08);

  // Exact upper boundary of Hospital Network Tier: 5,000 patients
  const hospitalBoundary = engine.calculatePricing({ patientProfiles: 5000 });
  assert.equal(hospitalBoundary.tier.id, 'hospital');
  assert.equal(hospitalBoundary.tier.discountRate, 0.10);

  // Immediately above Hospital boundary: 5,001 patients -> Multisite System
  const multisiteEntry = engine.calculatePricing({ patientProfiles: 5001 });
  assert.equal(multisiteEntry.tier.id, 'multisite');
  assert.equal(multisiteEntry.tier.discountRate, 0.18);
  assert.equal(multisiteEntry.tier.clinicalSubsidyRate, 0.10);

  // Exact upper boundary of Multisite Tier: 20,000 patients
  const multisiteBoundary = engine.calculatePricing({ patientProfiles: 20000 });
  assert.equal(multisiteBoundary.tier.id, 'multisite');
  assert.equal(multisiteBoundary.tier.discountRate, 0.18);

  // Immediately above Multisite boundary: 20,001 patients -> National Consortium
  const consortiumEntry = engine.calculatePricing({ patientProfiles: 20001 });
  assert.equal(consortiumEntry.tier.id, 'consortium');
  assert.equal(consortiumEntry.tier.discountRate, 0.25);
  assert.equal(consortiumEntry.tier.clinicalSubsidyRate, 0.12);

  // Tier explicit override
  const overrideQuote = engine.calculatePricing({ patientProfiles: 500, tierId: 'consortium' });
  assert.equal(overrideQuote.tier.id, 'consortium');
  assert.equal(overrideQuote.tier.discountRate, 0.25);
});

test('HealthVitalityCostOptimizerEngine - itemized math and pricing accuracy for Clinic Tier', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Inputs: 500 patients, 100 telehealth hrs, 200 GB IoT, 50 AI scans, 4 TB storage
  // Clinic Rates:
  // Patient: $1.50 -> 500 * 1.50 = 750
  // Telehealth: $5.00 -> 100 * 5.00 = 500
  // IoT: $0.90 -> 200 * 0.90 = 180
  // AI: $15.00 -> 50 * 15.00 = 750
  // Storage: $30.00 -> 4 * 30.00 = 120
  // Base sum = 750 + 500 + 180 + 750 + 120 = 2300
  // Subtotal = 2300
  // Volume discount: 0% -> 0
  // Clinical subsidy: 5% of 2300 = 115
  // Annual discount: 0
  // Total cost = 2300 - 115 = 2185
  // Per-patient care index = 2185 / 500 = 4.37

  const pricing = engine.calculatePricing({
    patientProfiles: 500,
    telehealthHours: 100,
    iotSyncData: 200,
    aiConsults: 50,
    hipaaStorage: 4,
    billingFrequency: 'monthly'
  });

  assert.equal(pricing.breakdown.patientProfiles, 750);
  assert.equal(pricing.breakdown.telehealthHours, 500);
  assert.equal(pricing.breakdown.iotSyncData, 180);
  assert.equal(pricing.breakdown.aiConsults, 750);
  assert.equal(pricing.breakdown.hipaaStorage, 120);
  assert.equal(pricing.subtotal, 2300);
  assert.equal(pricing.volumeDiscountAmount, 0);
  assert.equal(pricing.clinicalSubsidyAmount, 115);
  assert.equal(pricing.annualDiscountAmount, 0);
  assert.equal(pricing.totalDiscountAmount, 115);
  assert.equal(pricing.totalCost, 2185);
  assert.equal(pricing.monthlyEquivalent, 2185);
  assert.equal(pricing.perPatientCareIndex, 4.37);
});

test('HealthVitalityCostOptimizerEngine - volume discounts & clinical subsidies for Hospital Tier', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Inputs: 2000 patients, 400 telehealth hrs, 1000 GB IoT, 200 AI scans, 20 TB storage
  // Hospital Rates:
  // Patient: $1.25 -> 2000 * 1.25 = 2500
  // Telehealth: $4.20 -> 400 * 4.20 = 1680
  // IoT: $0.75 -> 1000 * 0.75 = 750
  // AI: $12.50 -> 200 * 12.50 = 2500
  // Storage: $25.00 -> 20 * 25.00 = 500
  // Base sum = 2500 + 1680 + 750 + 2500 + 500 = 7930
  // Volume discount: 10% of 7930 = 793
  // After volume = 7930 - 793 = 7137
  // Clinical subsidy: 8% of 7137 = 570.96
  // After subsidy = 7137 - 570.96 = 6566.04
  // Total discount = 793 + 570.96 = 1363.96
  // Total cost = 7930 - 1363.96 = 6566.04

  const pricing = engine.calculatePricing({
    patientProfiles: 2000,
    telehealthHours: 400,
    iotSyncData: 1000,
    aiConsults: 200,
    hipaaStorage: 20,
    billingFrequency: 'monthly'
  });

  assert.equal(pricing.subtotal, 7930);
  assert.equal(pricing.volumeDiscountAmount, 793);
  assert.equal(pricing.clinicalSubsidyAmount, 570.96);
  assert.equal(pricing.annualDiscountAmount, 0);
  assert.equal(pricing.totalDiscountAmount, 1363.96);
  assert.equal(pricing.totalCost, 6566.04);
  assert.equal(pricing.monthlyEquivalent, 6566.04);
  assert.equal(pricing.perPatientCareIndex, 3.28);
});

test('HealthVitalityCostOptimizerEngine - annual commitment billing discount', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Test annual billing with same inputs as Hospital Tier:
  // Monthly base = 7930
  // Annual subtotal = 7930 * 12 = 95160
  // Volume discount = 10% of 95160 = 9516
  // After volume = 95160 - 9516 = 85644
  // Clinical subsidy = 8% of 85644 = 6851.52
  // After subsidy = 85644 - 6851.52 = 78792.48
  // Annual discount = 20% of 78792.48 = 15758.50
  // Total discount = 9516 + 6851.52 + 15758.50 = 32126.02
  // Total cost = 95160 - 32126.02 = 63033.98

  const annualPricing = engine.calculatePricing({
    patientProfiles: 2000,
    telehealthHours: 400,
    iotSyncData: 1000,
    aiConsults: 200,
    hipaaStorage: 20,
    billingFrequency: 'annual'
  });

  assert.equal(annualPricing.billingFrequency, 'annual');
  assert.equal(annualPricing.annualMultiplier, 12);
  assert.equal(annualPricing.subtotal, 95160);
  assert.equal(annualPricing.volumeDiscountAmount, 9516);
  assert.equal(annualPricing.clinicalSubsidyAmount, 6851.52);
  assert.equal(annualPricing.annualDiscountAmount, 15758.50);
  assert.equal(annualPricing.totalDiscountAmount, 32126.02);
  assert.equal(annualPricing.totalCost, 63033.98);
  assert.equal(annualPricing.monthlyEquivalent, 5252.83);
  assert.equal(annualPricing.perPatientCareIndex, 2.63);
});

test('HealthVitalityCostOptimizerEngine - applyVolumeDiscount method standalone', () => {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Using tier id string
  const clinic = engine.applyVolumeDiscount('clinic', 1000);
  assert.equal(clinic.tier, 'clinic');
  assert.equal(clinic.discountRate, 0);
  assert.equal(clinic.discountPercent, 0);
  assert.equal(clinic.discountAmount, 0);
  assert.equal(clinic.netCost, 1000);

  const hospital = engine.applyVolumeDiscount('hospital', 10000);
  assert.equal(hospital.tier, 'hospital');
  assert.equal(hospital.discountRate, 0.10);
  assert.equal(hospital.discountPercent, 10);
  assert.equal(hospital.discountAmount, 1000);
  assert.equal(hospital.netCost, 9000);

  const consortium = engine.applyVolumeDiscount('consortium', 20000);
  assert.equal(consortium.tier, 'consortium');
  assert.equal(consortium.discountRate, 0.25);
  assert.equal(consortium.discountPercent, 25);
  assert.equal(consortium.discountAmount, 5000);
  assert.equal(consortium.netCost, 15000);

  // Using tier object directly
  const custom = engine.applyVolumeDiscount(HEALTH_TIERS.multisite, 5000);
  assert.equal(custom.tier, 'multisite');
  assert.equal(custom.discountRate, 0.18);
  assert.equal(custom.discountAmount, 900);
  assert.equal(custom.netCost, 4100);

  // Edge cases
  const fallback = engine.applyVolumeDiscount('unknown_tier', 1000);
  assert.equal(fallback.tier, 'clinic');

  const zeroBase = engine.applyVolumeDiscount('hospital', 0);
  assert.equal(zeroBase.discountAmount, 0);
  assert.equal(zeroBase.netCost, 0);
});

test('HealthVitalityCostOptimizerEngine - Event Emitter pattern (on, off, emit)', () => {
  const engine = new HealthVitalityCostOptimizerEngine();
  let pricingEventCount = 0;
  let receivedQuote = null;

  // Subscribe
  const unsubscribe = engine.on('pricingCalculated', (data) => {
    pricingEventCount++;
    receivedQuote = data;
  });

  engine.calculatePricing({ patientProfiles: 300 });
  assert.equal(pricingEventCount, 1);
  assert.equal(receivedQuote.inputs.patientProfiles, 300);

  // Unsubscribe using returned callback
  unsubscribe();
  engine.calculatePricing({ patientProfiles: 400 });
  assert.equal(pricingEventCount, 1);

  // Test off() directly
  let quoteCount = 0;
  const quoteHandler = () => { quoteCount++; };
  engine.on('quoteGenerated', quoteHandler);
  engine.generateQuote();
  assert.equal(quoteCount, 1);

  engine.off('quoteGenerated', quoteHandler);
  engine.generateQuote();
  assert.equal(quoteCount, 1);

  // Error in listener does not throw or break engine
  engine.on('testEvent', () => { throw new Error('Simulated listener error'); });
  let secondListenerRan = false;
  engine.on('testEvent', () => { secondListenerRan = true; });

  const emitResult = engine.emit('testEvent');
  assert.equal(emitResult, true);
  assert.equal(secondListenerRan, true);

  // Emit non-existent event returns false
  assert.equal(engine.emit('nonExistent'), false);
});

test('HealthVitalityCostOptimizerEngine - generateQuote creates full executive quote', () => {
  const engine = new HealthVitalityCostOptimizerEngine();
  let emittedQuote = null;
  engine.on('quoteGenerated', (q) => { emittedQuote = q; });

  const quote = engine.generateQuote({
    organization: 'Mount Sinai Regional Health',
    patientProfiles: 1200,
    billingFrequency: 'annual'
  });

  assert.ok(quote.quoteId.startsWith('HV-QUOTE-'));
  assert.equal(quote.organization, 'Mount Sinai Regional Health');
  assert.equal(quote.schemaVersion, '2026.1');
  assert.ok(quote.generatedAt);
  assert.ok(quote.validUntil);
  assert.equal(quote.validUntilDays, 30);
  assert.ok(quote.complianceBadges.includes('HIPAA Compliant (45 CFR § 164)'));
  assert.equal(quote.billingFrequency, 'annual');
  assert.equal(quote.inputs.patientProfiles, 1200);

  assert.equal(emittedQuote, quote);
  assert.equal(engine.getLastQuote(), quote);
});

test('HealthVitalityCostOptimizerEngine - optimizeAllocation budget optimization', () => {
  const engine = new HealthVitalityCostOptimizerEngine();
  let optimizedEvent = null;
  engine.on('allocationOptimized', (res) => { optimizedEvent = res; });

  // Test 1: Zero / negative budget
  const zeroOpt = engine.optimizeAllocation(0);
  assert.equal(zeroOpt.success, false);
  assert.ok(zeroOpt.reason.includes('positive number'));

  const negOpt = engine.optimizeAllocation(-500);
  assert.equal(negOpt.success, false);

  // Test 2: Budget insufficient for required minimums
  // Minimum 10,000 patients requires more than $100 budget
  const insufficientOpt = engine.optimizeAllocation(100, {
    minPatients: 10000,
    billingFrequency: 'monthly'
  });
  assert.equal(insufficientOpt.success, false);
  assert.ok(insufficientOpt.reason.includes('insufficient'));
  assert.ok(insufficientOpt.minimumRequiredCost > 100);

  // Test 3: Successful optimization within $5,000 monthly budget
  const targetBudget = 5000;
  const opt = engine.optimizeAllocation(targetBudget, {
    billingFrequency: 'monthly'
  });

  assert.equal(opt.success, true);
  assert.equal(opt.targetBudget, targetBudget);
  assert.ok(opt.totalCost <= targetBudget);
  assert.ok(opt.totalCost > targetBudget * 0.90, 'Utilization should exceed 90% of budget');
  assert.ok(opt.remainingBudget >= 0);
  assert.ok(opt.allocatedResources.patientProfiles > 500);
  assert.ok(opt.allocatedResources.telehealthHours > 50);
  assert.ok(opt.allocatedResources.iotSyncData > 100);
  assert.ok(opt.allocatedResources.aiConsults > 30);
  assert.ok(opt.allocatedResources.hipaaStorage > 2);
  assert.equal(optimizedEvent, opt);

  // Test 4: Annual optimization within $60,000 annual budget
  const annualOpt = engine.optimizeAllocation(60000, {
    billingFrequency: 'annual'
  });
  assert.equal(annualOpt.success, true);
  assert.ok(annualOpt.totalCost <= 60000);
  assert.ok(annualOpt.totalCost > 50000);
});

test('HealthVitalityCostOptimizerEngine - export and constants structure verification', () => {
  assert.ok(HEALTH_TIERS.clinic);
  assert.ok(HEALTH_TIERS.hospital);
  assert.ok(HEALTH_TIERS.multisite);
  assert.ok(HEALTH_TIERS.consortium);

  assert.ok(RESOURCE_METRICS.patientProfiles);
  assert.ok(RESOURCE_METRICS.telehealthHours);
  assert.ok(RESOURCE_METRICS.iotSyncData);
  assert.ok(RESOURCE_METRICS.aiConsults);
  assert.ok(RESOURCE_METRICS.hipaaStorage);

  assert.equal(typeof mountCostOptimizer, 'function');
});
