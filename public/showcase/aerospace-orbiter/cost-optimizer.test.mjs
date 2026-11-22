import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AerospaceOrbiterCostOptimizerEngine,
  PRICING_TIERS,
  FREQUENCY_DISCOUNTS
} from './cost-optimizer.js';

test('AerospaceOrbiterCostOptimizerEngine - tier boundary threshold resolutions', () => {
  const engine = new AerospaceOrbiterCostOptimizerEngine();

  // Explorer boundary: composite < 100
  // compute: 50 * 1 + storage: 40 * 0.5 + bandwidth: 50 * 0.2 = 50 + 20 + 10 = 80
  const explorerPricing = engine.calculatePricing({ computeHours: 50, storageGB: 40, bandwidthGB: 50 });
  assert.equal(explorerPricing.tier, 'EXPLORER');
  assert.equal(explorerPricing.tierName, 'Explorer');
  assert.equal(explorerPricing.discounts.volumeRate, 0.0);

  // Orbital boundary: composite >= 100, < 500
  // compute: 100 * 1 + storage: 0 = 100
  const orbitalPricing = engine.calculatePricing({ computeHours: 100, storageGB: 0, bandwidthGB: 0 });
  assert.equal(orbitalPricing.tier, 'ORBITAL');
  assert.equal(orbitalPricing.discounts.volumeRate, 0.05);

  // Deep Space boundary: composite >= 500, < 1500
  // compute: 500 * 1 = 500
  const deepSpacePricing = engine.calculatePricing({ computeHours: 500, storageGB: 0, bandwidthGB: 0 });
  assert.equal(deepSpacePricing.tier, 'DEEP_SPACE');
  assert.equal(deepSpacePricing.discounts.volumeRate, 0.12);

  // Constellation boundary: composite >= 1500
  // compute: 1500 * 1 = 1500
  const constellationPricing = engine.calculatePricing({ computeHours: 1500, storageGB: 0, bandwidthGB: 0 });
  assert.equal(constellationPricing.tier, 'CONSTELLATION');
  assert.equal(constellationPricing.discounts.volumeRate, 0.20);
});

test('AerospaceOrbiterCostOptimizerEngine - volume and frequency discount mathematical precision', () => {
  const engine = new AerospaceOrbiterCostOptimizerEngine();

  // Test custom input with monthly billing
  const monthlyRes = engine.calculatePricing({
    computeHours: 200, // 200 * 0.045 = 9.00
    storageGB: 100,    // 100 * 0.018 = 1.80
    bandwidthGB: 100,  // 100 * 0.070 = 7.00
    // total composite: 200 + 50 + 20 = 270 (ORBITAL -> 5% volume discount)
    frequency: 'monthly',
  });

  const expectedSubtotal = 9.0 + 1.8 + 7.0; // 17.80
  assert.equal(monthlyRes.subtotal, 17.80);
  assert.equal(monthlyRes.discounts.volumeRate, 0.05);
  assert.equal(monthlyRes.discounts.frequencyRate, 0.0);

  // Expected discount: 17.80 * 0.05 = 0.89
  assert.equal(monthlyRes.discounts.amount, 0.89);
  assert.equal(monthlyRes.monthlyTotal, 16.91);
  assert.equal(monthlyRes.total, 16.91);

  // Test annual billing with combined volume and annual discount
  const annualRes = engine.calculatePricing({
    computeHours: 200,
    storageGB: 100,
    bandwidthGB: 100,
    frequency: 'annual',
  });

  // Annual discount = 0.15, Volume = 0.05
  // Combined discount: 1 - (1 - 0.05) * (1 - 0.15) = 1 - 0.95 * 0.85 = 1 - 0.8075 = 0.1925
  assert.equal(annualRes.discounts.frequencyRate, 0.15);
  assert.equal(annualRes.discounts.totalRate, 0.1925);
  // discount amount: 17.80 * 0.1925 = 3.4265 -> 3.43
  assert.equal(annualRes.discounts.amount, 3.43);
  // monthly equivalent after discount: 17.80 - 3.43 = 14.37
  assert.equal(annualRes.monthlyTotal, 14.37);
  // annual total: 14.37 * 12 = 172.44
  assert.equal(annualRes.total, 172.44);
});

test('AerospaceOrbiterCostOptimizerEngine - applyVolumeDiscount validation and error handling', () => {
  const engine = new AerospaceOrbiterCostOptimizerEngine();
  assert.equal(engine.applyVolumeDiscount('EXPLORER'), 0.0);
  assert.equal(engine.applyVolumeDiscount('ORBITAL'), 0.05);
  assert.equal(engine.applyVolumeDiscount('DEEP_SPACE'), 0.12);
  assert.equal(engine.applyVolumeDiscount('CONSTELLATION'), 0.20);
  assert.throws(() => engine.applyVolumeDiscount('INVALID_TIER'), /Invalid tier key/);
});

test('AerospaceOrbiterCostOptimizerEngine - generateQuote schema and structure validity', () => {
  const engine = new AerospaceOrbiterCostOptimizerEngine();
  const quote = engine.generateQuote({
    computeHours: 300,
    storageGB: 600,
    bandwidthGB: 400,
    frequency: 'annual',
  });

  assert.ok(typeof quote.quoteId === 'string' && quote.quoteId.startsWith('ORB-QUOTE-'));
  assert.equal(quote.status, 'ESTIMATED');
  assert.ok(quote.issuedAt);
  assert.ok(quote.validUntil);
  assert.deepEqual(quote.resourceInputs, {
    computeHours: 300,
    storageGB: 600,
    bandwidthGB: 400,
    frequency: 'annual',
  });

  assert.ok(quote.pricing);
  assert.ok(quote.pricing.breakdown);
  assert.ok(typeof quote.pricing.total === 'number');
  assert.equal(quote.pricing.currency, 'USD');
  assert.equal(
    quote.pricing.breakdown.percentages.compute +
    quote.pricing.breakdown.percentages.storage +
    quote.pricing.breakdown.percentages.bandwidth,
    100
  );
});
