/**
 * Quantum Forge - Cost Optimizer Unit Tests
 * Issue #2112 - NSoC '26
 *
 * Validates tiered consumption pricing formulas, volume discount precision,
 * QPU hardware tier resolutions, quote object structures, annual commitment savings,
 * budget allocation optimizations, event emitters, and input boundary validations.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QuantumForgeCostOptimizerEngine,
  QPU_INSTANCES,
  SHOT_DISCOUNT_TIERS,
  RATES
} from './cost-optimizer.js';

const epsilon = 1e-6;
const assertNear = (actual, expected, message) => {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `${message || 'Values not equal'}: expected ${expected}, got ${actual}`
  );
};

test('Static definitions and instance exports are immutably exposed', () => {
  assert.ok(QPU_INSTANCES['standard-16']);
  assert.ok(QPU_INSTANCES['advanced-64']);
  assert.ok(QPU_INSTANCES['flagship-256']);
  assert.equal(SHOT_DISCOUNT_TIERS.length, 4);
  assert.equal(RATES.ANNUAL_COMMITMENT_DISCOUNT, 0.20);
  assert.equal(RATES.SIMULATION_HOURLY_RATE, 15.00);
  assert.equal(RATES.CRYOGENIC_MEMORY_PER_GB_MONTH, 8.00);
});

test('Engine instantiates with default and custom options', () => {
  const engineDefault = new QuantumForgeCostOptimizerEngine();
  assert.equal(engineDefault.defaultTaxRate, 0.08);

  const engineCustom = new QuantumForgeCostOptimizerEngine({ taxRate: 0.10 });
  assert.equal(engineCustom.defaultTaxRate, 0.10);

  const engineZeroTax = new QuantumForgeCostOptimizerEngine({ taxRate: 0 });
  assert.equal(engineZeroTax.defaultTaxRate, 0);

  assert.throws(() => new QuantumForgeCostOptimizerEngine({ taxRate: -0.05 }), RangeError);
  assert.throws(() => new QuantumForgeCostOptimizerEngine({ taxRate: NaN }), TypeError);
});

test('QPU Instance resolution by ID, name, or qubit count', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // By ID
  assert.equal(engine.resolveQpuInstance('standard-16').id, 'standard-16');
  assert.equal(engine.resolveQpuInstance('advanced-64').id, 'advanced-64');
  assert.equal(engine.resolveQpuInstance('flagship-256').id, 'flagship-256');

  // By case-insensitive name or ID
  assert.equal(engine.resolveQpuInstance('Standard 16-qubit').id, 'standard-16');
  assert.equal(engine.resolveQpuInstance('ADVANCED-64').id, 'advanced-64');
  assert.equal(engine.resolveQpuInstance('Flagship 256-qubit').id, 'flagship-256');

  // By qubit count
  assert.equal(engine.resolveQpuInstance(4).id, 'standard-16');
  assert.equal(engine.resolveQpuInstance(16).id, 'standard-16');
  assert.equal(engine.resolveQpuInstance(17).id, 'advanced-64');
  assert.equal(engine.resolveQpuInstance(64).id, 'advanced-64');
  assert.equal(engine.resolveQpuInstance(65).id, 'flagship-256');
  assert.equal(engine.resolveQpuInstance(256).id, 'flagship-256');

  // Out of bounds
  assert.throws(() => engine.resolveQpuInstance(0), RangeError);
  assert.throws(() => engine.resolveQpuInstance(-5), RangeError);
  assert.throws(() => engine.resolveQpuInstance(257), RangeError);
  assert.throws(() => engine.resolveQpuInstance(1000), RangeError);
  assert.throws(() => engine.resolveQpuInstance('non-existent-lattice'), RangeError);
});

test('Volume discount tier resolution across boundaries', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // Tier 1: 0 - 100k shots (0% discount)
  assert.equal(engine.resolveVolumeTier(0).tier, 1);
  assert.equal(engine.resolveVolumeTier(0).discountPercent, 0);
  assert.equal(engine.resolveVolumeTier(50_000).tier, 1);
  assert.equal(engine.resolveVolumeTier(100_000).tier, 1);
  assert.equal(engine.resolveVolumeTier(100_000).discountRate, 0.00);

  // Tier 2: 100k - 1M shots (10% discount)
  assert.equal(engine.resolveVolumeTier(100_001).tier, 2);
  assert.equal(engine.resolveVolumeTier(100_001).discountPercent, 10);
  assert.equal(engine.resolveVolumeTier(500_000).tier, 2);
  assert.equal(engine.resolveVolumeTier(1_000_000).tier, 2);
  assert.equal(engine.resolveVolumeTier(1_000_000).discountRate, 0.10);

  // Tier 3: 1M - 10M shots (20% discount)
  assert.equal(engine.resolveVolumeTier(1_000_001).tier, 3);
  assert.equal(engine.resolveVolumeTier(1_000_001).discountPercent, 20);
  assert.equal(engine.resolveVolumeTier(5_000_000).tier, 3);
  assert.equal(engine.resolveVolumeTier(10_000_000).tier, 3);
  assert.equal(engine.resolveVolumeTier(10_000_000).discountRate, 0.20);

  // Tier 4: > 10M shots (35% enterprise discount)
  assert.equal(engine.resolveVolumeTier(10_000_001).tier, 4);
  assert.equal(engine.resolveVolumeTier(10_000_001).discountPercent, 35);
  assert.equal(engine.resolveVolumeTier(50_000_000).tier, 4);
  assert.equal(engine.resolveVolumeTier(10_000_001).discountRate, 0.35);

  // String / index resolutions
  assert.equal(engine.resolveVolumeTier(1).tier, 1);
  assert.equal(engine.resolveVolumeTier(2).tier, 2);
  assert.equal(engine.resolveVolumeTier(3).tier, 3);
  assert.equal(engine.resolveVolumeTier(4).tier, 4);
  assert.equal(engine.resolveVolumeTier('tier1').tier, 1);
  assert.equal(engine.resolveVolumeTier('tier-2').tier, 2);
  assert.equal(engine.resolveVolumeTier('Tier 3').tier, 3);
  assert.equal(engine.resolveVolumeTier('tier4').tier, 4);

  // Negative shots error
  assert.throws(() => engine.resolveVolumeTier(-100), RangeError);
});

test('applyVolumeDiscount calculates exact mathematical discounts', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // Tier 1: 0% discount
  assert.equal(engine.applyVolumeDiscount(1, 1000.00), 1000.00);
  assert.equal(engine.applyVolumeDiscount('tier1', 250.50), 250.50);

  // Tier 2: 10% discount
  assert.equal(engine.applyVolumeDiscount(2, 1000.00), 900.00);
  assert.equal(engine.applyVolumeDiscount('tier2', 500.00), 450.00);

  // Tier 3: 20% discount
  assert.equal(engine.applyVolumeDiscount(3, 1000.00), 800.00);
  assert.equal(engine.applyVolumeDiscount('tier3', 1500.00), 1200.00);

  // Tier 4: 35% discount
  assert.equal(engine.applyVolumeDiscount(4, 1000.00), 650.00);
  assert.equal(engine.applyVolumeDiscount('tier4', 2000.00), 1300.00);

  // Precision and floating point checks
  assertNear(engine.applyVolumeDiscount(2, 123.45), 111.105, '10% on 123.45');
  assertNear(engine.applyVolumeDiscount(4, 999.99), 649.9935, '35% on 999.99');

  // Passing raw shots volume
  assert.equal(engine.applyVolumeDiscount(50_000, 1000.00), 1000.00);
  assert.equal(engine.applyVolumeDiscount(500_000, 1000.00), 900.00);
  assert.equal(engine.applyVolumeDiscount(5_000_000, 1000.00), 800.00);
  assert.equal(engine.applyVolumeDiscount(20_000_000, 1000.00), 650.00);

  // Invalid base cost
  assert.throws(() => engine.applyVolumeDiscount(1, -50), RangeError);
  assert.throws(() => engine.applyVolumeDiscount(1, NaN), TypeError);
});

test('calculatePricing computes itemized quantum compute workloads', () => {
  const engine = new QuantumForgeCostOptimizerEngine({ taxRate: 0.08 });

  const result = engine.calculatePricing({
    qubits: 16,
    shots: 100_000,
    simulationHours: 10,
    cryogenicMemoryGB: 8,
    compilerOptimization: 'standard',
    billingFrequency: 'monthly'
  });

  const { costs, qpu, volumeTier } = result;

  // QPU check: Standard 16 is $180/mo, shotRate = 0.0004
  assert.equal(qpu.id, 'standard-16');
  assert.equal(costs.qpuBaseCost, 180.00);

  // 100,000 shots at $0.0004 = $40.00 (Tier 1: 0% discount)
  assert.equal(volumeTier.tier, 1);
  assert.equal(costs.rawShotCost, 40.00);
  assert.equal(costs.discountedShotCost, 40.00);
  assert.equal(costs.shotVolumeDiscount, 0.00);

  // 10 simulation hours @ $15/hr = $150.00
  assert.equal(costs.simulationCost, 150.00);

  // 8 GB cryogenic memory @ $8/GB = $64.00
  assert.equal(costs.cryogenicCost, 64.00);

  // Standard compiler pass = $49.00
  assert.equal(costs.compilerCost, 49.00);

  // Subtotal = 180 + 40 + 150 + 64 + 49 = 483.00
  assert.equal(costs.subtotal, 483.00);
  assert.equal(costs.netMonthlySubtotal, 483.00);

  // Tax @ 8% = 483.00 * 0.08 = 38.64
  assert.equal(costs.monthlyTax, 38.64);
  assert.equal(costs.estimatedMonthlyCost, 521.64);

  // Annual commitment savings: 483 * 12 * 0.20 = 1159.20
  assert.equal(costs.annualSavingsWithCommitment, 1159.20);
});

test('Billing frequency multiplier: Monthly vs Annual with 20% commitment savings', () => {
  const engine = new QuantumForgeCostOptimizerEngine({ taxRate: 0.08 });

  const monthlyRun = engine.calculatePricing({
    qubits: 64,
    shots: 500_000,
    simulationHours: 20,
    cryogenicMemoryGB: 16,
    compilerOptimization: 'aggressive',
    billingFrequency: 'monthly'
  });

  const annualRun = engine.calculatePricing({
    qubits: 64,
    shots: 500_000,
    simulationHours: 20,
    cryogenicMemoryGB: 16,
    compilerOptimization: 'aggressive',
    billingFrequency: 'annual'
  });

  // Monthly subtotal before discount should match
  assert.equal(monthlyRun.costs.subtotal, annualRun.costs.subtotal);

  // Annual commitment should have a commitmentDiscountMonthly equal to 20% of net monthly subtotal
  const expectedMonthlyNet = monthlyRun.costs.netMonthlySubtotal * 0.80;
  assertNear(annualRun.costs.netMonthlySubtotal, expectedMonthlyNet, '20% commitment saving on monthly net');

  // Verify annual cost comparison
  const standardYearly = monthlyRun.costs.netMonthlySubtotal * 12;
  const committedYearly = annualRun.costs.netMonthlySubtotal * 12;
  assertNear(standardYearly - committedYearly, monthlyRun.costs.annualSavingsWithCommitment, 'Annual savings match');
});

test('generateQuote produces structured quote object with line items and recommendation', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  const quote = engine.generateQuote({
    qubits: 64,
    shots: 250_000,
    simulationHours: 15,
    cryogenicMemoryGB: 32,
    compilerOptimization: 'standard',
    billingFrequency: 'monthly'
  });

  // Structure assertions
  assert.ok(quote.quoteId.startsWith('QTE-QF-'));
  assert.ok(quote.createdAt);
  assert.ok(quote.expiresAt);
  assert.equal(quote.status, 'active');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.billingFrequency, 'monthly');

  // QPU & Tier
  assert.equal(quote.qpu.id, 'advanced-64');
  assert.equal(quote.volumeTier.tier, 2); // 250k is Tier 2 (10% discount)

  // Line items
  assert.ok(Array.isArray(quote.lineItems));
  assert.ok(quote.lineItems.length >= 4);

  const qpuItem = quote.lineItems.find(i => i.id === 'qpu-reservation');
  assert.ok(qpuItem);
  assert.equal(qpuItem.category, 'compute');
  assert.equal(qpuItem.unitPrice, 580.00);

  const shotsItem = quote.lineItems.find(i => i.id === 'circuit-shots');
  assert.ok(shotsItem);
  assert.equal(shotsItem.category, 'execution');
  assert.equal(shotsItem.quantity, 250_000);
  assert.equal(shotsItem.discountPercent, 10);

  const simItem = quote.lineItems.find(i => i.id === 'noise-simulation');
  assert.ok(simItem);
  assert.equal(simItem.category, 'simulation');

  // Sum of raw costs
  const lineItemsRawSum = quote.lineItems.reduce((acc, item) => acc + item.rawCost, 0);
  assertNear(lineItemsRawSum, quote.subtotal, 'Line items sum matches subtotal');

  // Totals & recommendation
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.netSubtotal > 0);
  assert.ok(quote.tax > 0);
  assert.ok(quote.total > 0);
  assert.ok(quote.estimatedMonthlyCost > 0);
  assert.ok(quote.estimatedAnnualCost > 0);
  assert.ok(quote.efficiencyRecommendation);
  assert.ok(quote.efficiencyRecommendation.title);
  assert.ok(quote.efficiencyRecommendation.message);
});

test('optimizeAllocation recommends optimal tier and shot budget under target expense', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // Test 1: Standard 16 QPU budget scenario ($500/mo, 12 qubits)
  const alloc1 = engine.optimizeAllocation(500, 12);
  assert.equal(alloc1.recommendedQpu.id, 'standard-16');
  assert.equal(alloc1.feasibility, 'optimal');
  assert.ok(alloc1.maxAchievableShotsMonthly > 0);
  assert.ok(alloc1.maxAchievableShotsAnnual >= alloc1.maxAchievableShotsMonthly);
  assert.ok(alloc1.recommendation.includes('Standard 16-qubit'));

  // Test 2: Advanced 64 QPU budget scenario ($1500/mo, 48 qubits)
  const alloc2 = engine.optimizeAllocation(1500, 48);
  assert.equal(alloc2.recommendedQpu.id, 'advanced-64');
  assert.equal(alloc2.feasibility, 'optimal');
  assert.ok(alloc2.maxAchievableShotsMonthly > 500_000);
  assert.ok(alloc2.extraShotsWithAnnual > 0);

  // Test 3: Budget below minimum hardware reservation ($300/mo, 64 qubits)
  // Advanced-64 base is $580/mo (annual committed is $464/mo), so $300 cannot afford it
  const alloc3 = engine.optimizeAllocation(300, 64);
  assert.equal(alloc3.feasibility, 'exceeds_budget');
  assert.equal(alloc3.maxAchievableShotsMonthly, 0);
  assert.ok(alloc3.budgetDeficit > 0);
  assert.ok(alloc3.recommendation.includes('below the minimum hardware reservation'));

  // Test 4: Budget boundary validations
  assert.throws(() => engine.optimizeAllocation(0, 16), RangeError);
  assert.throws(() => engine.optimizeAllocation(-100, 16), RangeError);
  assert.throws(() => engine.optimizeAllocation(500, 0), RangeError);
  assert.throws(() => engine.optimizeAllocation(500, 300), RangeError);
  assert.throws(() => engine.optimizeAllocation(NaN, 16), TypeError);
});

test('Event emitter handles subscriptions, emits, and unsubscriptions', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  let pricingEventCount = 0;
  let quoteEventCount = 0;
  let allocEventCount = 0;

  const unbindPricing = engine.on('pricing:calculated', (data) => {
    pricingEventCount++;
    assert.ok(data.costs);
  });

  const unbindQuote = engine.on('quote:generated', (data) => {
    quoteEventCount++;
    assert.ok(data.quoteId);
  });

  engine.on('allocation:optimized', (data) => {
    allocEventCount++;
    assert.ok(data.recommendedQpu);
  });

  // Trigger calculations
  engine.calculatePricing({ qubits: 16, shots: 50_000 });
  assert.equal(pricingEventCount, 1);

  engine.generateQuote({ qubits: 16, shots: 50_000 });
  // Note: generateQuote internally calls calculatePricing
  assert.equal(pricingEventCount, 2);
  assert.equal(quoteEventCount, 1);

  engine.optimizeAllocation(1000, 16);
  assert.equal(allocEventCount, 1);

  // Unsubscribe pricing listener
  unbindPricing();
  engine.calculatePricing({ qubits: 16, shots: 50_000 });
  assert.equal(pricingEventCount, 2, 'Unsubscribed listener did not fire');

  // Unsubscribe quote listener via off()
  engine.off('quote:generated', unbindQuote);
  unbindQuote();

  // Invalid listener
  assert.throws(() => engine.on('test', 'not-a-function'), TypeError);
});

test('Efficiency recommendations cover annual savings, tier thresholds, and compiler passes', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // Case 1: Monthly billing recommendation
  const quoteMonthly = engine.generateQuote({
    qubits: 16,
    shots: 50_000,
    billingFrequency: 'monthly'
  });
  assert.equal(quoteMonthly.efficiencyRecommendation.key, 'annual_commitment_savings');
  assert.ok(quoteMonthly.efficiencyRecommendation.potentialSavingsUSD > 0);

  // Case 2: Near tier boundary (e.g. 90,000 shots is 90% of 100k boundary)
  const quoteNearTier = engine.generateQuote({
    qubits: 16,
    shots: 90_000,
    billingFrequency: 'annual'
  });
  assert.equal(quoteNearTier.efficiencyRecommendation.key, 'volume_tier_opportunity');
  assert.ok(quoteNearTier.efficiencyRecommendation.message.includes('Tier 2'));

  // Case 3: High shots without compiler optimization
  const quoteNeedsCompiler = engine.generateQuote({
    qubits: 16,
    shots: 500_000,
    compilerOptimization: 'none',
    billingFrequency: 'annual'
  });
  assert.equal(quoteNeedsCompiler.efficiencyRecommendation.key, 'circuit_compiler_pass');

  // Case 4: Already optimal configuration
  const quoteOptimal = engine.generateQuote({
    qubits: 16,
    shots: 500_000,
    compilerOptimization: 'standard',
    billingFrequency: 'annual'
  });
  assert.equal(quoteOptimal.efficiencyRecommendation.key, 'optimal_allocation');
});

test('Compiler pass rate resolution and boolean toggle support', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  assert.equal(engine.resolveCompilerRate('none'), 0.00);
  assert.equal(engine.resolveCompilerRate('standard'), 49.00);
  assert.equal(engine.resolveCompilerRate('aggressive'), 129.00);
  assert.equal(engine.resolveCompilerRate(true), 49.00);
  assert.equal(engine.resolveCompilerRate(false), 0.00);
  assert.equal(engine.resolveCompilerRate(75.50), 75.50);
  assert.equal(engine.resolveCompilerRate('unknown-mode'), 0.00);

  assert.throws(() => engine.resolveCompilerRate(-10), RangeError);
});

test('Object and discount rate resolution for resolveVolumeTier', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  assert.equal(engine.resolveVolumeTier({ tier: 2 }).tier, 2);
  assert.equal(engine.resolveVolumeTier({ discountRate: 0.20 }).tier, 3);
  assert.equal(engine.resolveVolumeTier({ discountRate: 0.35 }).tier, 4);

  assert.throws(() => engine.resolveVolumeTier({ tier: 99 }), RangeError);
  assert.throws(() => engine.resolveVolumeTier(null), RangeError);
  assert.throws(() => engine.resolveVolumeTier(undefined), RangeError);
});

test('Input boundary validations throw descriptive RangeErrors and TypeErrors', () => {
  const engine = new QuantumForgeCostOptimizerEngine();

  // Negative shots
  assert.throws(() => engine.calculatePricing({ shots: -1 }), RangeError);

  // Negative simulation hours
  assert.throws(() => engine.calculatePricing({ simulationHours: -5 }), RangeError);

  // Negative cryogenic memory
  assert.throws(() => engine.calculatePricing({ cryogenicMemoryGB: -10 }), RangeError);

  // Invalid billing frequency
  assert.throws(() => engine.calculatePricing({ billingFrequency: 'weekly' }), TypeError);

  // Invalid qubit count
  assert.throws(() => engine.calculatePricing({ qubits: 0 }), RangeError);
  assert.throws(() => engine.calculatePricing({ qubits: 512 }), RangeError);

  // Non-number inputs
  assert.throws(() => engine.calculatePricing({ shots: 'unlimited' }), TypeError);
  assert.throws(() => engine.calculatePricing({ simulationHours: 'five' }), TypeError);
});
