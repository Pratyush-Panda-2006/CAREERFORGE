import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreCouponEngine } from './coupon-validator.js';

describe('EcommerceStoreCouponEngine', () => {
  it('instantiates correctly with default HMAC secret key', () => {
    const engine = new EcommerceStoreCouponEngine();
    assert.equal(engine.name, 'EcommerceStoreCouponEngine');
    assert.ok(typeof engine.secretKey === 'string' && engine.secretKey.length > 0);
  });

  it('rejects invalid inputs when creating signed coupon tokens', () => {
    const engine = new EcommerceStoreCouponEngine();
    assert.throws(() => engine.createSignedCoupon('', 20), /Invalid coupon code identifier/);
    assert.throws(() => engine.createSignedCoupon('SALE', 0), /between 1 and 100/);
    assert.throws(() => engine.createSignedCoupon('SALE', 150), /between 1 and 100/);
  });

  it('generates deterministic HMAC signatures and verifies valid coupons', () => {
    const engine = new EcommerceStoreCouponEngine();
    const token = engine.createSignedCoupon('SAVE20', 20, 100);

    const result = engine.verifyAndApplyCoupon(token, 250);
    assert.equal(result.isValid, true);
    assert.equal(result.code, 'SAVE20');
    assert.equal(result.discountPct, 20);
    assert.equal(result.discountAmount, 50); // 20% of $250
    assert.equal(result.finalTotal, 200);
  });

  it('rejects cryptographically tampered payloads with signature mismatch', () => {
    const engine = new EcommerceStoreCouponEngine();
    const validToken = engine.createSignedCoupon('SAVE10', 10, 50);
    const [payload, sig] = validToken.split('.');

    // Attacker modifies discount from 10% to 90% without knowing secretKey
    const tamperedPayload = payload.replace(':10:', ':90:');
    const tamperedToken = `${tamperedPayload}.${sig}`;

    const result = engine.verifyAndApplyCoupon(tamperedToken, 200);
    assert.equal(result.isValid, false);
    assert.match(result.reason, /tampering detected/i);
    assert.equal(result.discountAmount, 0);
  });

  it('rejects expired coupon tokens based on timestamp verification', () => {
    const engine = new EcommerceStoreCouponEngine();
    const pastTimestamp = Date.now() - 10000;
    const expiredToken = engine.createSignedCoupon('EXPIRED', 15, 0, pastTimestamp);

    const result = engine.verifyAndApplyCoupon(expiredToken, 100);
    assert.equal(result.isValid, false);
    assert.match(result.reason, /expired/i);
  });

  it('enforces minimum cart threshold rules', () => {
    const engine = new EcommerceStoreCouponEngine();
    const token = engine.createSignedCoupon('BIGSPENDER', 30, 500);

    const failResult = engine.verifyAndApplyCoupon(token, 450);
    assert.equal(failResult.isValid, false);
    assert.match(failResult.reason, /below minimum threshold/i);

    const passResult = engine.verifyAndApplyCoupon(token, 550);
    assert.equal(passResult.isValid, true);
    assert.equal(passResult.discountAmount, 165);
  });

  it('calculates tiered basket volume discounts correctly', () => {
    const engine = new EcommerceStoreCouponEngine();
    const items = [
      { name: 'Laptop', price: 600, quantity: 1 }
    ];

    const breakdown = engine.calculateCartTiers(items, null);
    assert.equal(breakdown.subtotal, 600);
    assert.equal(breakdown.volumeDiscountPct, 10);
    assert.equal(breakdown.volumeDiscount, 60);
    assert.equal(breakdown.finalCheckout, 540);
  });
});
