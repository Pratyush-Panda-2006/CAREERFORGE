import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProCostOptimizerEngine } from './cost-optimizer.js';

test('CryptoExchangeProCostOptimizerEngine - initializes with default unit rates and discount tiers', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();
  assert.equal(engine.unitRates.compute, 0.05);
  assert.equal(engine.unitRates.storage, 0.08);
  assert.equal(engine.unitRates.bandwidth, 0.03);
  assert.equal(engine.discountTiers.length, 4);
});

test('CryptoExchangeProCostOptimizerEngine - calculates raw baseline pricing for zero or minimal inputs', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();
  const pricing = engine.calculatePricing({ compute: 0, storage: 0, bandwidth: 0 });

  assert.equal(pricing.breakdown.compute, 0);
  assert.equal(pricing.breakdown.storage, 0);
  assert.equal(pricing.breakdown.bandwidth, 0);
  assert.equal(pricing.breakdown.rawSubtotal, 0);
  assert.equal(pricing.tier.name, 'Standard');
  assert.equal(pricing.effectiveMonthly, 0);
  assert.equal(pricing.totalBilled, 0);
});

test('CryptoExchangeProCostOptimizerEngine - tier boundary pricing and volume discount transitions', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();

  // Standard Tier: Spend < $250
  // e.g. 2000 compute * 0.05 = $100 -> Standard (0% discount)
  const p1 = engine.calculatePricing({ compute: 2000, storage: 0, bandwidth: 0 });
  assert.equal(p1.tier.name, 'Standard');
  assert.equal(p1.tier.discountRate, 0);
  assert.equal(p1.volumeDiscountAmount, 0);
  assert.equal(p1.totalBilled, 100);

  // Growth Tier: Spend >= $250
  // e.g. 5000 compute * 0.05 + 1250 storage * 0.08 = 250 + 100 = $350
  // 8% discount on 350 = 28 -> total 322
  const p2 = engine.calculatePricing({ compute: 5000, storage: 1250, bandwidth: 0 });
  assert.equal(p2.tier.name, 'Growth');
  assert.equal(p2.tier.discountRate, 0.08);
  assert.equal(p2.breakdown.rawSubtotal, 350);
  assert.equal(p2.volumeDiscountAmount, 28);
  assert.equal(p2.totalBilled, 322);

  // Enterprise Tier: Spend >= $750
  // e.g. 15000 compute * 0.05 = $750
  // 15% discount on 750 = 112.50 -> total 637.50
  const p3 = engine.calculatePricing({ compute: 15000, storage: 0, bandwidth: 0 });
  assert.equal(p3.tier.name, 'Enterprise');
  assert.equal(p3.tier.discountRate, 0.15);
  assert.equal(p3.volumeDiscountAmount, 112.50);
  assert.equal(p3.totalBilled, 637.50);

  // Whale / Institutional Tier: Spend >= $2000
  // e.g. 40000 compute * 0.05 = $2000
  // 25% discount on 2000 = 500 -> total 1500
  const p4 = engine.calculatePricing({ compute: 40000, storage: 0, bandwidth: 0 });
  assert.equal(p4.tier.name, 'Whale / Institutional');
  assert.equal(p4.tier.discountRate, 0.25);
  assert.equal(p4.volumeDiscountAmount, 500);
  assert.equal(p4.totalBilled, 1500);
});

test('CryptoExchangeProCostOptimizerEngine - annual billing applies 20% commitment discount', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();
  // Standard spend: 2000 compute * 0.05 = $100/mo raw
  // Monthly: $100
  // Annual: 100 * (1 - 0.20) = $80/mo -> 80 * 12 = $960/yr
  const annual = engine.calculatePricing({ compute: 2000, storage: 0, bandwidth: 0, frequency: 'annual' });
  assert.equal(annual.frequency, 'annual');
  assert.equal(annual.effectiveMonthly, 80);
  assert.equal(annual.totalBilled, 960);
  assert.equal(annual.annualSavings, 240); // (100 * 12) - 960 = 240
});

test('CryptoExchangeProCostOptimizerEngine - applyVolumeDiscount returns correct rate and percentage', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();

  const disc1 = engine.applyVolumeDiscount('growth');
  assert.equal(disc1.discountRate, 0.08);
  assert.equal(disc1.discountPercentage, 8);

  const disc2 = engine.applyVolumeDiscount(1000);
  assert.equal(disc2.tierName, 'Enterprise');
  assert.equal(disc2.discountRate, 0.15);
  assert.equal(disc2.discountPercentage, 15);

  const disc3 = engine.applyVolumeDiscount({ name: 'Custom VIP', discountRate: 0.30 });
  assert.equal(disc3.tierName, 'Custom VIP');
  assert.equal(disc3.discountPercentage, 30);
});

test('CryptoExchangeProCostOptimizerEngine - generateQuote produces structured quote object', () => {
  const engine = new CryptoExchangeProCostOptimizerEngine();
  const quote = engine.generateQuote({ compute: 10000, storage: 2000, bandwidth: 5000, frequency: 'annual' });

  assert.ok(quote.quoteId.startsWith('QUOTE-'));
  assert.ok(typeof quote.timestamp === 'string');
  assert.equal(quote.status, 'active');
  assert.equal(quote.frequency, 'annual');
  assert.ok(quote.breakdown.compute > 0);
  assert.ok(quote.breakdown.storage > 0);
  assert.ok(quote.breakdown.bandwidth > 0);
  assert.ok(quote.totalBilled > 0);
  assert.ok(quote.annualSavings > 0);
  assert.ok(typeof quote.distribution.computePercent === 'number');
});
