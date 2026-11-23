import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FintechVaultCostOptimizerEngine,
  BANKING_TIERS,
  BANKING_RESOURCES
} from './cost-optimizer.js';

test('FintechVaultCostOptimizerEngine - initializes with default values & currency USD', () => {
  const engine = new FintechVaultCostOptimizerEngine();
  const quote = engine.generateQuote();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.pricing.currency, 'USD');
  assert.equal(quote.pricing.currencySymbol, '$');
  assert.equal(quote.pricing.billingFrequency, 'monthly');
  assert.equal(quote.pricing.multiplier, 1);
  assert.ok(quote.quoteId.startsWith('FV-Q-'));
  assert.ok(Array.isArray(quote.complianceFrameworks));
  assert.ok(quote.complianceFrameworks.length >= 4);
  assert.ok(quote.pricing.totalCost > 0);
  assert.ok(quote.pricing.subtotal > 0);
  assert.ok(quote.pricing.tier);
});

test('FintechVaultCostOptimizerEngine - sanitizes zero, negative, and invalid inputs gracefully', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  // Test sanitizeInput helper directly
  assert.equal(engine.sanitizeInput(0), 0);
  assert.equal(engine.sanitizeInput(-15), 0);
  assert.equal(engine.sanitizeInput(null), 0);
  assert.equal(engine.sanitizeInput(undefined), 0);
  assert.equal(engine.sanitizeInput(false), 0);
  assert.equal(engine.sanitizeInput('invalid'), 0);
  assert.equal(engine.sanitizeInput(NaN), 0);
  assert.equal(engine.sanitizeInput(Infinity), 0);
  assert.equal(engine.sanitizeInput(42.7), 42);
  assert.equal(engine.sanitizeInput('100'), 100);

  // Zero resources calculation
  const zeroPricing = engine.calculatePricing({
    transactionsPerSec: 0,
    vaultStorageTb: 0,
    fraudInferences: 0,
    swiftEndpoints: 0,
    hsmKeys: 0,
    billingFrequency: 'monthly'
  });

  assert.equal(zeroPricing.subtotal, 0);
  assert.equal(zeroPricing.totalCost, 0);
  assert.equal(zeroPricing.volumeDiscountAmount, 0);
  assert.equal(zeroPricing.annualDiscountAmount, 0);
  assert.equal(zeroPricing.tier.id, 'seedling');
  assert.equal(zeroPricing.metrics.monthlyTransactionsCapacity, 0);
  assert.equal(zeroPricing.metrics.effectiveBpsPerTransaction, 0);
});

test('FintechVaultCostOptimizerEngine - accurately determines tier boundaries and threshold transitions', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  // 1. Exact upper boundary of Fintech Seedling tier:
  // TPS: 100, Storage: 10, Fraud: 100, Swift: 2, HSM: 4
  const seedlingUpper = engine.calculatePricing({
    transactionsPerSec: 100,
    vaultStorageTb: 10,
    fraudInferences: 100,
    swiftEndpoints: 2,
    hsmKeys: 4,
    billingFrequency: 'monthly'
  });
  assert.equal(seedlingUpper.tier.id, 'seedling');
  assert.equal(seedlingUpper.tier.discountRate, 0.00);
  assert.equal(seedlingUpper.volumeDiscountAmount, 0);

  // 2. Crossing into Regulated Neobank by exceeding TPS (101 TPS)
  const neobankTps = engine.calculatePricing({
    transactionsPerSec: 101,
    vaultStorageTb: 10,
    fraudInferences: 100,
    swiftEndpoints: 2,
    hsmKeys: 4,
    billingFrequency: 'monthly'
  });
  assert.equal(neobankTps.tier.id, 'neobank');
  assert.equal(neobankTps.tier.discountRate, 0.10);
  assert.ok(neobankTps.volumeDiscountAmount > 0);

  // 3. Crossing into Regulated Neobank by storage (11 TB)
  const neobankStorage = engine.calculatePricing({
    transactionsPerSec: 50,
    vaultStorageTb: 11,
    fraudInferences: 50,
    swiftEndpoints: 1,
    hsmKeys: 2
  });
  assert.equal(neobankStorage.tier.id, 'neobank');

  // 4. Exact upper boundary of Regulated Neobank:
  // TPS: 1000, Storage: 100, Fraud: 1000, Swift: 10, HSM: 20
  const neobankUpper = engine.calculatePricing({
    transactionsPerSec: 1000,
    vaultStorageTb: 100,
    fraudInferences: 1000,
    swiftEndpoints: 10,
    hsmKeys: 20
  });
  assert.equal(neobankUpper.tier.id, 'neobank');
  assert.equal(neobankUpper.tier.discountRate, 0.10);

  // 5. Crossing into Tier-1 Investment Bank by exceeding HSM keys (21 keys)
  const investmentBankEntry = engine.calculatePricing({
    transactionsPerSec: 1000,
    vaultStorageTb: 100,
    fraudInferences: 1000,
    swiftEndpoints: 10,
    hsmKeys: 21
  });
  assert.equal(investmentBankEntry.tier.id, 'investment_bank');
  assert.equal(investmentBankEntry.tier.discountRate, 0.20);

  // 6. Crossing into Global Sovereign Central Banking by exceeding TPS (10001 TPS)
  const sovereignEntry = engine.calculatePricing({
    transactionsPerSec: 10001,
    vaultStorageTb: 500,
    fraudInferences: 10000,
    swiftEndpoints: 50,
    hsmKeys: 100
  });
  assert.equal(sovereignEntry.tier.id, 'sovereign_central_bank');
  assert.equal(sovereignEntry.tier.discountRate, 0.30);
});

test('FintechVaultCostOptimizerEngine - applyVolumeDiscount correctly evaluates rates and amounts', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  // Test by string ID
  const dSeedling = engine.applyVolumeDiscount('seedling', 1000);
  assert.equal(dSeedling.discountPercent, 0);
  assert.equal(dSeedling.discountAmount, 0);
  assert.equal(dSeedling.netCost, 1000);

  const dNeobank = engine.applyVolumeDiscount('neobank', 1000);
  assert.equal(dNeobank.discountPercent, 10);
  assert.equal(dNeobank.discountAmount, 100);
  assert.equal(dNeobank.netCost, 900);

  const dInvestment = engine.applyVolumeDiscount('investment_bank', 5000);
  assert.equal(dInvestment.discountPercent, 20);
  assert.equal(dInvestment.discountAmount, 1000);
  assert.equal(dInvestment.netCost, 4000);

  const dSovereign = engine.applyVolumeDiscount('sovereign_central_bank', 10000);
  assert.equal(dSovereign.discountPercent, 30);
  assert.equal(dSovereign.discountAmount, 3000);
  assert.equal(dSovereign.netCost, 7000);

  // Test by tier object
  const customTier = { id: 'custom', name: 'Partner', discountRate: 0.15 };
  const dCustom = engine.applyVolumeDiscount(customTier, 2000);
  assert.equal(dCustom.discountPercent, 15);
  assert.equal(dCustom.discountAmount, 300);
  assert.equal(dCustom.netCost, 1700);

  // Test fallback on invalid tier
  const dUnknown = engine.applyVolumeDiscount('non-existent-tier', 500);
  assert.equal(dUnknown.discountPercent, 0);
  assert.equal(dUnknown.netCost, 500);
});

test('FintechVaultCostOptimizerEngine - monthly vs annual multi-year institutional SLA discount', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  const resources = {
    transactionsPerSec: 500,  // 500 * $1.50 = $750
    vaultStorageTb: 20,       // 20 * $45 = $900
    fraudInferences: 200,     // 200 * $2.20 = $440
    swiftEndpoints: 2,        // 2 * $180 = $360
    hsmKeys: 4                // 4 * $125 = $500
  };
  // Monthly base = 750 + 900 + 440 + 360 + 500 = $2,950
  // Tier: Neobank (since TPS is 500 > 100), discount = 10%
  // Volume discount: 2950 * 0.10 = $295
  // Monthly Total: 2950 - 295 = $2,655

  const monthly = engine.calculatePricing({ ...resources, billingFrequency: 'monthly' });
  assert.equal(monthly.billingFrequency, 'monthly');
  assert.equal(monthly.multiplier, 1);
  assert.equal(monthly.subtotal, 2950);
  assert.equal(monthly.volumeDiscountAmount, 295);
  assert.equal(monthly.annualDiscountAmount, 0);
  assert.equal(monthly.totalCost, 2655);

  // Annual calculation:
  // Subtotal = 2950 * 12 = $35,400
  // Volume discount = 35400 * 0.10 = $3,540
  // After volume discount = $31,860
  // Annual institutional SLA discount = 31860 * 0.20 = $6,372
  // Total discount = 3540 + 6372 = $9,912
  // Total cost = 35400 - 9912 = $25,488
  // Monthly equivalent = 25488 / 12 = $2,124

  const annual = engine.calculatePricing({ ...resources, billingFrequency: 'annual' });
  assert.equal(annual.billingFrequency, 'annual');
  assert.equal(annual.multiplier, 12);
  assert.equal(annual.subtotal, 35400);
  assert.equal(annual.volumeDiscountAmount, 3540);
  assert.equal(annual.annualDiscountAmount, 6372);
  assert.equal(annual.totalCost, 25488);
  assert.equal(annual.monthlyEquivalent, 2124);
  assert.ok(annual.monthlyEquivalent < monthly.totalCost);
});

test('FintechVaultCostOptimizerEngine - basis point (bps) per transaction metric calculation', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  // TPS: 1000
  // Monthly transactions: 1000 * 2,592,000 = 2,592,000,000
  const pricing = engine.calculatePricing({
    transactionsPerSec: 1000,
    vaultStorageTb: 10,
    fraudInferences: 100,
    swiftEndpoints: 2,
    hsmKeys: 2,
    billingFrequency: 'monthly'
  });

  assert.equal(pricing.metrics.monthlyTransactionsCapacity, 2_592_000_000);
  assert.ok(pricing.metrics.costPerTransactionUsd > 0);
  assert.ok(pricing.metrics.effectiveBpsPerTransaction > 0);

  // Effective Bps formula check: (cost / txns) * 10000
  const expectedCostPerTxn = pricing.totalCost / 2_592_000_000;
  const expectedBps = Math.round(expectedCostPerTxn * 10000 * 1000) / 1000;
  assert.equal(pricing.metrics.effectiveBpsPerTransaction, expectedBps);
});

test('FintechVaultCostOptimizerEngine - formal quote generation with SLA guarantees', () => {
  const engine = new FintechVaultCostOptimizerEngine();
  const quote = engine.generateQuote({
    institution: 'Manhattan Custody Bank',
    transactionsPerSec: 2500,
    vaultStorageTb: 150,
    fraudInferences: 2000,
    swiftEndpoints: 15,
    hsmKeys: 30,
    billingFrequency: 'annual'
  });

  assert.equal(quote.institution, 'Manhattan Custody Bank');
  assert.ok(quote.quoteId.startsWith('FV-Q-'));
  assert.ok(new Date(quote.issuedAt).getTime() > 0);
  assert.ok(new Date(quote.expiresAt).getTime() > new Date(quote.issuedAt).getTime());
  assert.equal(quote.pricing.tier.id, 'investment_bank');
  assert.ok(quote.slaGuarantee.includes('99.999%'));
  assert.ok(quote.pricing.totalCost > 0);
});

test('FintechVaultCostOptimizerEngine - optimizeAllocation scales resources within target budget', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  // 1. Zero budget
  const zeroOpt = engine.optimizeAllocation(0);
  assert.equal(zeroOpt.targetBudget, 0);
  assert.equal(zeroOpt.pricing.totalCost, 0);
  assert.equal(zeroOpt.isWithinBudget, true);

  // 2. Discretionary budget allocation ($5,000 / month)
  const opt5k = engine.optimizeAllocation(5000, { billingFrequency: 'monthly' });
  assert.ok(opt5k.pricing.totalCost <= 5000);
  assert.ok(opt5k.remainingBudget >= 0);
  assert.equal(opt5k.isWithinBudget, true);
  assert.ok(opt5k.allocation.transactionsPerSec > 0);
  assert.ok(opt5k.allocation.vaultStorageTb > 0);

  // 3. Minimum baseline needs respected
  const optWithMin = engine.optimizeAllocation(10000, {
    minTps: 1200,
    minStorage: 50,
    minFraudInferences: 500,
    minSwiftEndpoints: 5,
    minHsmKeys: 10,
    billingFrequency: 'monthly'
  });

  assert.ok(optWithMin.pricing.totalCost <= 10000);
  assert.ok(optWithMin.allocation.transactionsPerSec >= 1200);
  assert.ok(optWithMin.allocation.vaultStorageTb >= 50);
  assert.ok(optWithMin.allocation.fraudInferences >= 500);
  assert.ok(optWithMin.allocation.swiftEndpoints >= 5);
  assert.ok(optWithMin.allocation.hsmKeys >= 10);
  assert.equal(optWithMin.isWithinBudget, true);

  // 4. Baseline needs that exceed tight budget
  const optOver = engine.optimizeAllocation(500, {
    minTps: 1000, // 1000 TPS costs at least $1500 alone
    billingFrequency: 'monthly'
  });

  assert.equal(optOver.isWithinBudget, false);
  assert.equal(optOver.exceedsBudget, true);
  assert.ok(optOver.remainingBudget < 0);
});

test('FintechVaultCostOptimizerEngine - event emitter on, off, emit and unsubscribe pattern', () => {
  const engine = new FintechVaultCostOptimizerEngine();

  let pricingEventCount = 0;
  let quoteEventCount = 0;
  let lastPricingData = null;

  // Subscribe using .on()
  const unsubPricing = engine.on('pricingCalculated', (data) => {
    pricingEventCount++;
    lastPricingData = data;
  });

  const quoteListener = () => {
    quoteEventCount++;
  };
  engine.on('quoteGenerated', quoteListener);

  // Trigger calculatePricing
  engine.calculatePricing({ transactionsPerSec: 300 });
  assert.equal(pricingEventCount, 1);
  assert.equal(lastPricingData.inputs.transactionsPerSec, 300);

  // Trigger generateQuote
  engine.generateQuote();
  assert.equal(quoteEventCount, 1);
  assert.equal(pricingEventCount, 2); // calculatePricing is also called by generateQuote

  // Unsubscribe using returned callback
  unsubPricing();
  engine.calculatePricing({ transactionsPerSec: 600 });
  assert.equal(pricingEventCount, 2); // Not incremented

  // Unsubscribe using .off()
  engine.off('quoteGenerated', quoteListener);
  engine.generateQuote();
  assert.equal(quoteEventCount, 1); // Not incremented

  // Listener error safety check: listener throwing doesn't break engine or other listeners
  let secondListenerReceived = false;
  engine.on('customEvent', () => {
    throw new Error('Handler simulated error');
  });
  engine.on('customEvent', () => {
    secondListenerReceived = true;
  });

  assert.doesNotThrow(() => {
    engine.emit('customEvent', { test: true });
  });
  assert.equal(secondListenerReceived, true);
});

test('FintechVaultCostOptimizerEngine - custom configuration options', () => {
  const customEngine = new FintechVaultCostOptimizerEngine({
    currency: 'EUR',
    currencySymbol: '€',
    annualDiscountRate: 0.25 // 25% annual discount
  });

  const customAnnual = customEngine.calculatePricing({
    transactionsPerSec: 200,
    billingFrequency: 'annual'
  });

  assert.equal(customAnnual.currency, 'EUR');
  assert.equal(customAnnual.currencySymbol, '€');
  assert.equal(customAnnual.annualDiscountPercent, 25);
  assert.equal(customEngine.formatCurrency(1234.5), '€1,234.50');
});
