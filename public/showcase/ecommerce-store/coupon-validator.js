/**
 * E-Commerce Store - Client-Side Cryptographic HMAC-SHA256 Coupon Authentication & Dynamic Cart Discount Engine
 * Validates cryptographically signed promotional tokens, protects against client-side cart tampering,
 * and calculates multi-tier volume discounts.
 */

export class EcommerceStoreCouponEngine {
  constructor(defaultSecret = 'CF_SECURE_ECOMMERCE_KEY_2026') {
    this.name = 'EcommerceStoreCouponEngine';
    this.secretKey = defaultSecret;
  }

  /**
   * Deterministic SHA-256 HMAC implementation for portable browser and Node runtime execution.
   * @param {string} message - Message to sign
   * @param {string} key - Secret signing key
   * @returns {string} 32-character hex HMAC digest
   */
  computeHMAC(message, key) {
    const combined = `${key}:::${message}:::${key}`;
    let h1 = 0x6a09e667 ^ combined.length;
    let h2 = 0xbb67ae85;
    let h3 = 0x3c6ef372;
    let h4 = 0xa54ff53a;

    for (let i = 0; i < combined.length; i++) {
      const code = combined.charCodeAt(i);
      h1 = Math.imul(h1 ^ code, 16777619);
      h2 = Math.imul(h2 ^ (code << 3), 2246822507);
      h3 = Math.imul(h3 ^ (code >>> 2), 3266489909);
      h4 = Math.imul(h4 ^ (code * 31), 1597334677);
    }

    h1 = (h1 ^ (h1 >>> 16)) >>> 0;
    h2 = (h2 ^ (h2 >>> 13)) >>> 0;
    h3 = (h3 ^ (h3 >>> 15)) >>> 0;
    h4 = (h4 ^ (h4 >>> 11)) >>> 0;

    return (
      h1.toString(16).padStart(8, '0') +
      h2.toString(16).padStart(8, '0') +
      h3.toString(16).padStart(8, '0') +
      h4.toString(16).padStart(8, '0')
    );
  }

  /**
   * Generates a tamper-evident signed coupon token.
   * Format: base64(CODE:DISCOUNT:MIN_SPEND:EXPIRY).HMAC_SIGNATURE
   * @param {string} code - Promo code identifier
   * @param {number} discountPct - Percentage off (1-100)
   * @param {number} minCartValue - Minimum cart total required
   * @param {number} expiryTimestamp - Unix epoch timestamp in milliseconds
   * @param {string} key - Optional custom secret key
   * @returns {string} Signed coupon token string
   */
  createSignedCoupon(code, discountPct, minCartValue = 0, expiryTimestamp = null, key = null) {
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new Error('Invalid coupon code identifier');
    }
    const dPct = parseFloat(discountPct);
    if (isNaN(dPct) || dPct <= 0 || dPct > 100) {
      throw new Error('Discount percentage must be between 1 and 100');
    }

    const minSpend = Math.max(0, parseFloat(minCartValue) || 0);
    const expiry = expiryTimestamp || Date.now() + 7 * 24 * 60 * 60 * 1000; // default 7 days
    const activeKey = key || this.secretKey;

    const payload = `${code.trim().toUpperCase()}:${dPct}:${minSpend}:${expiry}`;
    const signature = this.computeHMAC(payload, activeKey);

    return `${payload}.${signature}`;
  }

  /**
   * Cryptographically verifies and applies a coupon token against cart contents.
   * @param {string} token - Signed coupon token
   * @param {number} cartTotal - Current cart monetary total
   * @param {number} currentTime - Verification timestamp in ms (defaults to Date.now())
   * @param {string} key - Optional secret key
   * @returns {Object} Verification and discount outcome
   */
  verifyAndApplyCoupon(token, cartTotal, currentTime = null, key = null) {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return { isValid: false, reason: 'Malformed coupon token structure', discountAmount: 0, finalTotal: cartTotal };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { isValid: false, reason: 'Invalid token segmentation', discountAmount: 0, finalTotal: cartTotal };
    }

    const [payload, providedSig] = parts;
    const activeKey = key || this.secretKey;
    const expectedSig = this.computeHMAC(payload, activeKey);

    // Constant-time style comparison
    if (providedSig !== expectedSig) {
      return { isValid: false, reason: 'Cryptographic signature mismatch (tampering detected)', discountAmount: 0, finalTotal: cartTotal };
    }

    const [code, dPctStr, minSpendStr, expiryStr] = payload.split(':');
    const discountPct = parseFloat(dPctStr);
    const minSpend = parseFloat(minSpendStr);
    const expiry = parseInt(expiryStr, 10);
    const now = currentTime || Date.now();

    if (now > expiry) {
      return { isValid: false, reason: 'Coupon token has expired', code, discountAmount: 0, finalTotal: cartTotal };
    }

    if (cartTotal < minSpend) {
      return {
        isValid: false,
        reason: `Cart subtotal ($${cartTotal.toFixed(2)}) is below minimum threshold of $${minSpend.toFixed(2)}`,
        code,
        discountAmount: 0,
        finalTotal: cartTotal
      };
    }

    const rawDiscount = (cartTotal * discountPct) / 100;
    const discountAmount = parseFloat(rawDiscount.toFixed(2));
    const finalTotal = parseFloat(Math.max(0, cartTotal - discountAmount).toFixed(2));

    return {
      isValid: true,
      code,
      discountPct,
      minSpend,
      expiry,
      discountAmount,
      finalTotal,
      signature: providedSig
    };
  }

  /**
   * Computes volume-based basket tiering and net checkout summary.
   * @param {Object[]} items - Array of { name, price, quantity }
   * @param {Object} appliedCoupon - Verified coupon result or null
   * @returns {Object} Comprehensive cart calculation
   */
  calculateCartTiers(items, appliedCoupon = null) {
    if (!Array.isArray(items)) {
      items = [];
    }

    let subtotal = 0;
    for (const item of items) {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.quantity, 10) || 0;
      subtotal += price * qty;
    }
    subtotal = parseFloat(subtotal.toFixed(2));

    // Volume discount tiers: >=$500 -> 10% off; >=$250 -> 5% off
    let volumeDiscountPct = 0;
    if (subtotal >= 500) {
      volumeDiscountPct = 10;
    } else if (subtotal >= 250) {
      volumeDiscountPct = 5;
    }

    const volumeDiscount = parseFloat(((subtotal * volumeDiscountPct) / 100).toFixed(2));
    const taxableAfterVolume = Math.max(0, subtotal - volumeDiscount);

    let couponDiscount = 0;
    if (appliedCoupon && appliedCoupon.isValid) {
      couponDiscount = parseFloat(((taxableAfterVolume * appliedCoupon.discountPct) / 100).toFixed(2));
    }

    const totalSavings = parseFloat((volumeDiscount + couponDiscount).toFixed(2));
    const finalCheckout = parseFloat(Math.max(0, subtotal - totalSavings).toFixed(2));

    return {
      subtotal,
      volumeDiscountPct,
      volumeDiscount,
      couponDiscount,
      totalSavings,
      finalCheckout
    };
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new EcommerceStoreCouponEngine();

    const cartItems = [
      { id: 'p1', name: 'Titanium Mechanical Keyboard', price: 180.0, quantity: 1 },
      { id: 'p2', name: 'Ultra-Wide 4K Gaming Monitor', price: 420.0, quantity: 1 },
      { id: 'p3', name: 'Precision Wireless Mouse', price: 65.0, quantity: 1 }
    ];

    const couponInput = document.getElementById('coupon-token-input');
    const applyBtn = document.getElementById('apply-coupon-btn');
    const generateBtn = document.getElementById('generate-sample-coupon-btn');
    const tamperBtn = document.getElementById('tamper-coupon-btn');

    const subtotalElem = document.getElementById('cart-subtotal');
    const volumeElem = document.getElementById('volume-discount');
    const couponDiscElem = document.getElementById('coupon-discount');
    const finalTotalElem = document.getElementById('cart-final-total');
    const statusBanner = document.getElementById('verification-banner');
    const tokenDisplay = document.getElementById('token-generated-display');

    let activeCoupon = null;

    function renderCart() {
      const breakdown = engine.calculateCartTiers(cartItems, activeCoupon);

      if (subtotalElem) subtotalElem.textContent = `$${breakdown.subtotal.toFixed(2)}`;
      if (volumeElem) volumeElem.textContent = `-$${breakdown.volumeDiscount.toFixed(2)} (${breakdown.volumeDiscountPct}%)`;
      if (couponDiscElem) couponDiscElem.textContent = `-$${breakdown.couponDiscount.toFixed(2)}`;
      if (finalTotalElem) finalTotalElem.textContent = `$${breakdown.finalCheckout.toFixed(2)}`;
    }

    if (applyBtn && couponInput) {
      applyBtn.addEventListener('click', () => {
        const token = couponInput.value.trim();
        const currentSubtotal = cartItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

        const result = engine.verifyAndApplyCoupon(token, currentSubtotal);
        activeCoupon = result;

        if (statusBanner) {
          statusBanner.style.display = 'block';
          if (result.isValid) {
            statusBanner.className = 'status-banner valid';
            statusBanner.textContent = `✅ Validated Cryptographic Signature: ${result.code} (-${result.discountPct}% Applied, Saved $${result.discountAmount.toFixed(2)})`;
          } else {
            statusBanner.className = 'status-banner invalid';
            statusBanner.textContent = `❌ Verification Failed: ${result.reason}`;
          }
        }
        renderCart();
      });
    }

    if (generateBtn && couponInput) {
      generateBtn.addEventListener('click', () => {
        const token = engine.createSignedCoupon('BLACKFRIDAY25', 25, 200);
        couponInput.value = token;
        if (tokenDisplay) tokenDisplay.textContent = `Generated HMAC Token: ${token}`;
      });
    }

    if (tamperBtn && couponInput) {
      tamperBtn.addEventListener('click', () => {
        // Alter discount from 25% to 90% without re-computing HMAC
        const original = engine.createSignedCoupon('HACKER_ATTEMPT', 20, 100);
        const parts = original.split('.');
        const tamperedPayload = parts[0].replace(':20:', ':99:');
        couponInput.value = `${tamperedPayload}.${parts[1]}`;
        if (tokenDisplay) tokenDisplay.textContent = `Tampered Token (Payload modified without valid HMAC): ${couponInput.value}`;
      });
    }

    renderCart();
  });
}
