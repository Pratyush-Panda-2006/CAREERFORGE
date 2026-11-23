import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelCostOptimizerEngine } from './cost-optimizer.js';

test('CybersecuritySentinelCostOptimizerEngine - tier boundary pricing formulas', () => {
  const engine = new CybersecuritySentinelCostOptimizerEngine();
  const starter = engine.calculatePricing({ compute: 10, storage: 10, bandwidth: 10 });
  assert.strictEqual(starter.tier, 'Starter');
  assert.strictEqual(starter.discountPercent, 0);

  const scale = engine.calculatePricing({ compute: 50000, storage: 0, bandwidth: 0 });
  assert.strictEqual(scale.tier, 'Scale');
  assert.strictEqual(scale.discountPercent, 10);

  const premium = engine.calculatePricing({ compute: 200000, storage: 0, bandwidth: 0 });
  assert.strictEqual(premium.tier, 'Premium');
  assert.strictEqual(premium.discountPercent, 30);
});

test('CybersecuritySentinelCostOptimizerEngine - discount mathematical precision', () => {
  const engine = new CybersecuritySentinelCostOptimizerEngine();
  const quote = engine.calculatePricing({ compute: 50000, storage: 0, bandwidth: 0 });
  assert.strictEqual(quote.discountPercent, 10);
  const expectedDiscount = Number((quote.subtotal * 0.10).toFixed(2));
  assert.strictEqual(quote.discountAmount, expectedDiscount);
  assert.strictEqual(quote.discountedTotal, Number((quote.subtotal - quote.discountAmount).toFixed(2)));
  assert.ok(quote.discountedTotal <= quote.subtotal);
});

test('CybersecuritySentinelCostOptimizerEngine - quote object structure and annual billing', () => {
  const engine = new CybersecuritySentinelCostOptimizerEngine({ billingCycle: 'annual' });
  const quote = engine.generateQuote();
  assert.ok(quote.quoteId);
  assert.strictEqual(quote.billingCycle, 'annual');
  assert.ok(quote.validUntil > Date.now());
  assert.ok(Array.isArray(quote.lineItems));
  assert.strictEqual(quote.lineItems.length, 3);
  assert.ok(quote.annualTotal >= 0);
  assert.ok(typeof quote.projectedTotal === 'number');
});
