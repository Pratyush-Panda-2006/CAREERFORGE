// Cart state dictionary: { [id]: { id, name, price, qty, img, category } }
const cart = {};

const ITEM_META_FALLBACK = {
  p1: { name: 'CyberDeck Pro Mechanical', price: 249.00, img: '⌨️', category: 'keyboards' },
  p2: { name: 'Acoustic Pulse ANC Headset', price: 199.00, img: '🎧', category: 'audio' },
  p3: { name: 'Horizon 32" Curved OLED', price: 899.00, img: '🖥️', category: 'displays' },
  p4: { name: 'Nexus Neo 65% Low-Profile', price: 149.00, img: '⌨️', category: 'keyboards' },
  p5: { name: 'Vortex Reference Studio Monitors', price: 349.00, img: '🔊', category: 'audio' },
  p6: { name: 'Apex UltraWide 49" 240Hz', price: 1199.00, img: '🖥️', category: 'displays' },
  p7: { name: 'HyperStream Studio Mic & Arm', price: 179.00, img: '🎙️', category: 'audio' },
  p8: { name: 'Keychronix Ergo Alice Custom', price: 289.00, img: '⌨️', category: 'keyboards' }
};

/**
 * Pure, stateless promotional discount, spend-tier, tax & shipping engine.
 */
class PromoDiscountEngine {
  constructor(config = {}) {
    this.tiers = config.tiers || [
      { id: 'builder', name: 'Builder Tier', minSpend: 200, rate: 0.05 },
      { id: 'studio', name: 'Studio Tier', minSpend: 500, rate: 0.10 },
      { id: 'enterprise', name: 'Enterprise Rig Tier', minSpend: 1000, rate: 0.15 }
    ];

    this.coupons = config.coupons || {
      CYBER20: {
        code: 'CYBER20',
        type: 'percent',
        value: 0.20,
        minSubtotal: 0,
        categories: null,
        label: 'CYBER20: 20% off entire cart',
        conditionText: 'Any order subtotal'
      },
      FREESHIP: {
        code: 'FREESHIP',
        type: 'freeship',
        value: 0,
        minSubtotal: 100,
        categories: null,
        label: 'FREESHIP: Free ground shipping ($100+)',
        conditionText: 'Subtotal ≥ $100.00'
      },
      BUNDLE3: {
        code: 'BUNDLE3',
        type: 'bogo',
        buyQty: 2,
        getQty: 1,
        minSubtotal: 0,
        categories: null,
        label: 'BUNDLE3: Buy 2, Get 1 Free (lowest unit free)',
        conditionText: 'Cart quantity ≥ 3 items'
      },
      KEYB15: {
        code: 'KEYB15',
        type: 'category_percent',
        value: 0.15,
        minSubtotal: 150,
        categories: ['keyboards'],
        label: 'KEYB15: 15% off Keyboards ($150+)',
        conditionText: 'Keyboards subtotal ≥ $150.00'
      },
      AUDIO25: {
        code: 'AUDIO25',
        type: 'category_fixed',
        value: 25,
        minSubtotal: 180,
        categories: ['audio'],
        label: 'AUDIO25: $25 off Audio gear ($180+)',
        conditionText: 'Audio subtotal ≥ $180.00'
      },
      CAREER20: {
        code: 'CAREER20',
        type: 'percent',
        value: 0.20,
        minSubtotal: 0,
        categories: null,
        label: 'CAREER20: 20% off developer gear',
        conditionText: 'Any order subtotal'
      }
    };

    this.taxJurisdictions = config.taxJurisdictions || {
      CA: { code: 'CA', label: 'California (CA)', rate: 0.0825, baseShipping: 12.00 },
      NY: { code: 'NY', label: 'New York (NY)', rate: 0.08875, baseShipping: 12.00 },
      TX: { code: 'TX', label: 'Texas (TX)', rate: 0.0625, baseShipping: 12.00 },
      WA: { code: 'WA', label: 'Washington (WA)', rate: 0.065, baseShipping: 12.00 },
      OR: { code: 'OR', label: 'Oregon (OR)', rate: 0.00, baseShipping: 14.00 },
      DE: { code: 'DE', label: 'Delaware (DE)', rate: 0.00, baseShipping: 14.00 },
      'EU-DE': { code: 'EU-DE', label: 'Germany / EU (VAT)', rate: 0.19, baseShipping: 28.00 },
      UK: { code: 'UK', label: 'United Kingdom (VAT)', rate: 0.20, baseShipping: 26.00 }
    };

    this.vipFreeShipThreshold = 1200;
  }

  normalizeCart(cartInput) {
    const rawList = Array.isArray(cartInput)
      ? cartInput
      : Object.values(cartInput || {});

    return rawList
      .filter((item) => item && Number(item.qty) > 0 && Number(item.price) >= 0)
      .map((item) => {
        const meta = ITEM_META_FALLBACK[item.id] || {};
        return {
          id: String(item.id || meta.name || 'item'),
          name: String(item.name || meta.name || 'Hardware Item'),
          category: String(item.category || meta.category || 'general').toLowerCase(),
          price: Number(item.price || meta.price || 0),
          qty: Math.max(1, Math.floor(Number(item.qty || 1))),
          img: item.img || meta.img || '📦'
        };
      });
  }

  evaluateTierDiscount(subtotal) {
    const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
    let activeTier = null;
    for (let i = this.tiers.length - 1; i >= 0; i -= 1) {
      if (cleanSubtotal >= this.tiers[i].minSpend) {
        activeTier = this.tiers[i];
        break;
      }
    }

    const nextTier = this.tiers.find((t) => cleanSubtotal < t.minSpend) || null;
    const rate = activeTier ? activeTier.rate : 0;
    const discountAmount = Math.round(cleanSubtotal * rate * 100) / 100;
    const topThreshold = this.tiers[this.tiers.length - 1].minSpend;

    return {
      tierId: activeTier ? activeTier.id : 'standard',
      tierName: activeTier ? activeTier.name : 'Standard',
      rate,
      discountAmount,
      minSpend: activeTier ? activeTier.minSpend : 0,
      nextTierName: nextTier ? nextTier.name : null,
      nextTierRate: nextTier ? nextTier.rate : null,
      nextTierThreshold: nextTier ? nextTier.minSpend : null,
      amountToNextTier: nextTier ? Math.max(0, Math.round((nextTier.minSpend - cleanSubtotal) * 100) / 100) : 0,
      progressPercent: Math.min(100, Math.round((cleanSubtotal / topThreshold) * 100)),
      tiers: this.tiers
    };
  }

  applyCoupon(code, cartInput) {
    const normalizedCode = String(code || '').trim().toUpperCase();
    const items = this.normalizeCart(cartInput);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);

    if (!normalizedCode) {
      return {
        valid: false,
        code: '',
        type: 'none',
        discountAmount: 0,
        freeShipping: false,
        freeItemsCount: 0,
        freeUnits: [],
        eligibleSubtotal: 0,
        label: '',
        reason: 'Enter a promo code to apply conditional rules.'
      };
    }

    const rule = this.coupons[normalizedCode];
    if (!rule) {
      return {
        valid: false,
        code: normalizedCode,
        type: 'unknown',
        discountAmount: 0,
        freeShipping: false,
        freeItemsCount: 0,
        freeUnits: [],
        eligibleSubtotal: 0,
        label: '',
        reason: `"${normalizedCode}" is not a valid promo code.`
      };
    }

    if (items.length === 0 || subtotal <= 0) {
      return {
        valid: false,
        code: normalizedCode,
        type: rule.type,
        discountAmount: 0,
        freeShipping: false,
        freeItemsCount: 0,
        freeUnits: [],
        eligibleSubtotal: 0,
        label: rule.label,
        reason: `Add gear to your order before applying ${normalizedCode}.`
      };
    }

    const eligibleItems = rule.categories
      ? items.filter((item) => rule.categories.includes(item.category))
      : items;
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (rule.categories && eligibleItems.length === 0) {
      return {
        valid: false,
        code: normalizedCode,
        type: rule.type,
        discountAmount: 0,
        freeShipping: false,
        freeItemsCount: 0,
        freeUnits: [],
        eligibleSubtotal: 0,
        label: rule.label,
        reason: `${normalizedCode} requires items in category: ${rule.categories.join(', ')}.`
      };
    }

    if (eligibleSubtotal < rule.minSubtotal) {
      const gap = (rule.minSubtotal - eligibleSubtotal).toFixed(2);
      return {
        valid: false,
        code: normalizedCode,
        type: rule.type,
        discountAmount: 0,
        freeShipping: false,
        freeItemsCount: 0,
        freeUnits: [],
        eligibleSubtotal,
        label: rule.label,
        reason: `${normalizedCode} requires $${rule.minSubtotal.toFixed(2)} eligible spend ($${gap} away).`
      };
    }

    let discountAmount = 0;
    let freeShipping = false;
    let freeItemsCount = 0;
    const freeUnits = [];

    if (rule.type === 'percent' || rule.type === 'category_percent') {
      discountAmount = Math.round(eligibleSubtotal * rule.value * 100) / 100;
    } else if (rule.type === 'category_fixed') {
      discountAmount = Math.min(eligibleSubtotal, rule.value);
    } else if (rule.type === 'freeship') {
      freeShipping = true;
    } else if (rule.type === 'bogo') {
      const groupSize = (rule.buyQty || 2) + (rule.getQty || 1);
      if (totalUnits < groupSize) {
        return {
          valid: false,
          code: normalizedCode,
          type: rule.type,
          discountAmount: 0,
          freeShipping: false,
          freeItemsCount: 0,
          freeUnits: [],
          eligibleSubtotal,
          label: rule.label,
          reason: `BUNDLE3 requires at least ${groupSize} items in cart (currently ${totalUnits}).`
        };
      }
      const unitPool = [];
      items.forEach((item) => {
        for (let q = 0; q < item.qty; q += 1) {
          unitPool.push({ id: item.id, name: item.name, price: item.price });
        }
      });
      unitPool.sort((a, b) => a.price - b.price);
      freeItemsCount = Math.floor(unitPool.length / groupSize) * (rule.getQty || 1);
      for (let i = 0; i < freeItemsCount; i += 1) {
        discountAmount += unitPool[i].price;
        freeUnits.push(unitPool[i]);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
    }

    return {
      valid: true,
      code: normalizedCode,
      type: rule.type,
      discountAmount,
      freeShipping,
      freeItemsCount,
      freeUnits,
      eligibleSubtotal,
      label: rule.label,
      reason:
        rule.type === 'bogo'
          ? `${normalizedCode} applied: ${freeItemsCount} free unit(s) credited (-$${discountAmount.toFixed(2)}).`
          : rule.type === 'freeship'
            ? `${normalizedCode} applied: Standard shipping fee waived!`
            : `${normalizedCode} applied: -$${discountAmount.toFixed(2)} saved.`
    };
  }

  calculateTaxAndShipping(address, subtotal, options = {}) {
    const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
    const discountTotal = Math.max(0, Number(options.discountTotal) || 0);
    const addrObj =
      typeof address === 'string'
        ? { state: address }
        : address || { state: 'CA', zip: '94107', shippingMethod: 'standard' };

    const regionKey = String(addrObj.state || 'CA').toUpperCase();
    const jurisdiction = this.taxJurisdictions[regionKey] || {
      code: regionKey,
      label: `${regionKey} Standard`,
      rate: 0.08,
      baseShipping: 12.00
    };

    const method = String(addrObj.shippingMethod || 'standard').toLowerCase();
    const vipUnlocked = cleanSubtotal >= this.vipFreeShipThreshold;
    const freeShipCoupon = Boolean(options.freeShipping);

    let shippingAmount = 0;
    let freeShippingReason = '';

    if (cleanSubtotal > 0) {
      if (method === 'express') {
        shippingAmount = (freeShipCoupon || vipUnlocked ? 0 : jurisdiction.baseShipping) + 18.00;
        if (freeShipCoupon || vipUnlocked) {
          freeShippingReason = 'Base shipping waived; Express upgrade applied';
        }
      } else if (freeShipCoupon) {
        shippingAmount = 0;
        freeShippingReason = 'FREESHIP coupon ($100+ threshold)';
      } else if (vipUnlocked) {
        shippingAmount = 0;
        freeShippingReason = 'VIP Order ≥ $1,200 Free Ground';
      } else {
        shippingAmount = jurisdiction.baseShipping;
      }
    }

    const taxableAmount = Math.max(0, cleanSubtotal - discountTotal);
    const taxAmount = Math.round(taxableAmount * jurisdiction.rate * 100) / 100;

    return {
      regionCode: jurisdiction.code,
      regionLabel: jurisdiction.label,
      zip: String(addrObj.zip || ''),
      taxRate: jurisdiction.rate,
      taxableAmount,
      taxAmount,
      shippingMethod: method,
      shippingAmount: Math.round(shippingAmount * 100) / 100,
      freeShippingApplied: cleanSubtotal > 0 && shippingAmount === 0,
      freeShippingReason
    };
  }

  evaluateMatrix(cartInput, activeCouponCode, address) {
    const items = this.normalizeCart(cartInput);
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const tier = this.evaluateTierDiscount(subtotal);
    const rows = [];

    rows.push({
      key: 'TIER',
      title: `Auto Spend Tier (${tier.tierName})`,
      condition: tier.nextTierThreshold
        ? `Next unlock at $${tier.nextTierThreshold.toFixed(0)}`
        : 'Max 15% tier unlocked',
      status: tier.discountAmount > 0 ? 'ACTIVE' : 'LOCKED',
      impact: tier.discountAmount,
      applied: tier.discountAmount > 0
    });

    const matrixCodes = ['CYBER20', 'BUNDLE3', 'FREESHIP', 'KEYB15', 'AUDIO25'];
    matrixCodes.forEach((code) => {
      const rule = this.coupons[code];
      const evalRes = this.applyCoupon(code, items);
      const isSelected = String(activeCouponCode || '').toUpperCase() === code;
      let status = 'LOCKED';
      if (isSelected && evalRes.valid) status = 'ACTIVE';
      else if (evalRes.valid) status = 'READY';

      let potentialImpact = evalRes.discountAmount;
      if (code === 'FREESHIP' && evalRes.valid) {
        const taxShip = this.calculateTaxAndShipping(address, subtotal, { freeShipping: false });
        potentialImpact = taxShip.shippingAmount > 0 ? 12.00 : 0;
      }

      rows.push({
        key: code,
        title: code,
        condition: rule.conditionText,
        status,
        impact: potentialImpact,
        applied: isSelected && evalRes.valid,
        valid: evalRes.valid,
        reason: evalRes.reason
      });
    });

    return rows;
  }

  calculateOrderSummary(cartInput, couponCode, address, metadata = {}) {
    const items = this.normalizeCart(cartInput);
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100;
    const tierResult = this.evaluateTierDiscount(subtotal);
    const couponResult = this.applyCoupon(couponCode, items);
    const rawDiscount = tierResult.discountAmount + (couponResult.valid ? couponResult.discountAmount : 0);
    const totalDiscount = Math.min(subtotal, Math.round(rawDiscount * 100) / 100);

    const taxAndShipping = this.calculateTaxAndShipping(address, subtotal, {
      discountTotal: totalDiscount,
      freeShipping: couponResult.valid && couponResult.freeShipping
    });

    const baseShipTax = this.calculateTaxAndShipping(address, subtotal, {
      discountTotal: totalDiscount,
      freeShipping: false
    });
    const shippingSaved = Math.max(0, Math.round((baseShipTax.shippingAmount - taxAndShipping.shippingAmount) * 100) / 100);
    const grandTotal = Math.max(0, Math.round((subtotal - totalDiscount + taxAndShipping.shippingAmount + taxAndShipping.taxAmount) * 100) / 100);

    return {
      invoiceId: metadata.invoiceId || 'NX-2026-4340',
      issuedAt: metadata.issuedAt || new Date(),
      status: metadata.status || 'VERIFIED QUOTE',
      customerName: (address && address.customerName) || metadata.customerName || 'Alex Rivera · Nexus Labs',
      address: {
        state: taxAndShipping.regionCode,
        regionLabel: taxAndShipping.regionLabel,
        zip: taxAndShipping.zip || '94107',
        shippingMethod: taxAndShipping.shippingMethod
      },
      items,
      subtotal,
      tierResult,
      couponResult,
      totalDiscount,
      shippingSaved,
      totalSavings: Math.round((totalDiscount + shippingSaved) * 100) / 100,
      taxAndShipping,
      grandTotal,
      matrixRows: this.evaluateMatrix(items, couponCode, address)
    };
  }
}

const promoEngine = new PromoDiscountEngine();
window.PromoDiscountEngine = PromoDiscountEngine;

const SHIPPING_FEE = 12;
const TAX_RATE = 0.08;
const ShippingProgress = (typeof window !== 'undefined' && window.ShippingProgress) || (typeof globalThis !== 'undefined' && globalThis.ShippingProgress) || {
  THRESHOLD: 150,
  calculate(subtotal, couponCode) {
    const amount = Math.max(0, Number(subtotal) || 0);
    const couponUnlocked = amount > 0 && couponCode === 'FREESHIP';
    const thresholdUnlocked = amount >= 150;
    return {
      unlocked: couponUnlocked || thresholdUnlocked,
      couponUnlocked,
      remaining: Math.max(0, 150 - amount),
      percent: couponUnlocked ? 100 : Math.min(100, Math.round(amount / 150 * 100))
    };
  }
};
const COUPON_KEY = 'nexusStoreCoupon';
let appliedCoupon = null;

// Multi-currency exchange rate tables and locale configurations
const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', rate: 1.0, locale: 'en-US', digits: 2 },
  EUR: { code: 'EUR', symbol: 'â‚¬', rate: 0.92, locale: 'de-DE', digits: 2 },
  GBP: { code: 'GBP', symbol: 'Â£', rate: 0.78, locale: 'en-GB', digits: 2 },
  JPY: { code: 'JPY', symbol: 'Â¥', rate: 152.0, locale: 'ja-JP', digits: 0 },
  CAD: { code: 'CAD', symbol: 'CA$', rate: 1.38, locale: 'en-CA', digits: 2 },
  INR: { code: 'INR', symbol: 'â‚¹', rate: 83.5, locale: 'en-IN', digits: 2 },
  AUD: { code: 'AUD', symbol: 'A$', rate: 1.52, locale: 'en-AU', digits: 2 }
};
const CURRENCY_STORAGE_KEY = 'nexus_currency_preference';
let currentCurrency = 'USD';

function formatMoney(amount, currencyCode = currentCurrency) {
  const cur = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const converted = amount * cur.rate;
  const digits = cur.digits !== undefined ? cur.digits : 2;
  try {
    return new Intl.NumberFormat(cur.locale, {
      style: 'currency',
      currency: cur.code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(converted);
  } catch {
    return `${cur.symbol}${converted.toFixed(digits)}`;
  }
}

function normalizeCode(raw) {
  return String(raw || '').trim().toUpperCase();
}

function loadSavedCoupon() {
  try {
    const saved = normalizeCode(localStorage.getItem(COUPON_KEY));
    if (promoEngine.coupons[saved]) appliedCoupon = saved;
  } catch {
    appliedCoupon = null;
  }
}

function saveCoupon() {
  try {
    if (appliedCoupon) localStorage.setItem(COUPON_KEY, appliedCoupon);
    else localStorage.removeItem(COUPON_KEY);
  } catch {
    // storage can be blocked, the promo then only lasts for this page view
  }
}

// Pure helper so the maths uses PromoDiscountEngine consistently.
const COUPONS_MAP = typeof promoEngine !== 'undefined' && promoEngine.coupons ? promoEngine.coupons : {
  CAREER20: { type: 'percent', value: 0.20, label: 'CAREER20: 20% off' },
  SAVE15: { type: 'percent', value: 0.15, label: 'SAVE15: 15% off' },
  FIXED25: { type: 'fixed', value: 25.00, label: 'FIXED25:  off order' },
  FREESHIP: { type: 'freeship', value: 0, label: 'FREESHIP: free delivery' }
};

function calculateTotals(subtotal, couponCode) {
  const coupons = typeof COUPONS !== 'undefined' ? COUPONS : COUPONS_MAP;
  const coupon = coupons[couponCode] || null;
  const discount = coupon && coupon.type === 'percent' ? subtotal * coupon.value : 0;
  const shippingHelper = typeof ShippingProgress !== 'undefined' && ShippingProgress.calculate
    ? ShippingProgress
    : {
        calculate: (sub, code) => ({
          unlocked: sub >= 150 || (sub > 0 && code === 'FREESHIP')
        })
      };
  const shipping = subtotal > 0 && !shippingHelper.calculate(subtotal, couponCode).unlocked ? SHIPPING_FEE : 0;
  const tax = (subtotal - discount) * TAX_RATE;
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}

function setCouponMessage(text, isError) {
  const msg = document.getElementById('couponMessage');
  const input = document.getElementById('couponInput');
  if (!msg || !input) return;
  msg.textContent = text;
  msg.classList.toggle('error', Boolean(isError));
  if (isError) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

function applyCoupon(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) {
    setCouponMessage('Enter a promo code first.', true);
    return false;
  }
  if (!promoEngine.coupons[code]) {
    setCouponMessage(`"${code}" is not a valid promo code.`, true);
    return false;
  }
  if (appliedCoupon === code) {
    setCouponMessage(`${code} is already applied.`, true);
    return false;
  }
  const items = Object.values(cart);
  if (items.length > 0) {
    const check = promoEngine.applyCoupon(code, items);
    if (!check.valid) {
      setCouponMessage(check.reason, true);
      return false;
    }
  }
  appliedCoupon = code;
  saveCoupon();
  setCouponMessage(`${code} applied.`, false);
  renderCart();
  return true;
}

function removeCoupon() {
  appliedCoupon = null;
  saveCoupon();
  setCouponMessage('Promo code removed.', false);
  renderCart();
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer && backdrop) {
    drawer.classList.toggle('open');
    backdrop.classList.toggle('open');
  }
}

function addToCart(id, name, price, img) {
  const meta = ITEM_META_FALLBACK[id] || {};
  if (!cart[id]) {
    cart[id] = { id, name, price, qty: 1, img, category: meta.category || 'general' };
  } else {
    cart[id].qty += 1;
  }
  showToast(`Added ${name} to cart!`);
  renderCart();
}

function updateQuantity(id, delta) {
  if (!cart[id]) return;

  cart[id].qty += delta;

  if (cart[id].qty <= 0) {
    const itemTitle = cart[id].name;
    delete cart[id];
    showToast(`Removed ${itemTitle} from cart.`);
  }

  renderCart();
}

function renderCart() {
  // 1. Calculate Total Items and Price
  let totalItems = 0;
  let totalPrice = 0;

  Object.values(cart).forEach((item) => {
    totalItems += item.qty;
    totalPrice += item.price * item.qty;
  });

  // Update Badge Count
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    cartCountEl.innerText = totalItems;
  }

  // Update order summary (subtotal, tier discount, promo discount, shipping, tax, total)
  const totals = calculateTotals(totalPrice, appliedCoupon);
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('cartSubtotal', formatMoney(totals.subtotal));
  setText('cartDiscount', `-${formatMoney(totals.discount)}`);
  setText('cartShipping', totals.shipping === 0 && totals.subtotal > 0 ? 'FREE' : formatMoney(totals.shipping));
  setText('cartTax', formatMoney(totals.tax));
  setText('cartTotal', formatMoney(totals.total));

  const shippingProgress = ShippingProgress.calculate(totals.subtotal, appliedCoupon);
  const progressTrack = document.getElementById('shippingProgressTrack');
  const progressFill = document.getElementById('shippingProgressFill');
  const progressBadge = document.getElementById('shippingProgressBadge');
  const progressContainer = document.getElementById('shippingProgress');
  if (progressTrack) progressTrack.setAttribute('aria-valuenow', String(shippingProgress.percent));
  if (progressFill) progressFill.style.width = `${shippingProgress.percent}%`;
  if (progressBadge) progressBadge.hidden = !shippingProgress.unlocked;
  if (progressContainer) progressContainer.classList.toggle('unlocked', shippingProgress.unlocked);
  setText('shippingProgressMessage', shippingProgress.couponUnlocked
    ? 'Free Express Shipping unlocked with FREESHIP!'
    : shippingProgress.unlocked
      ? 'Free Express Shipping unlocked!'
      : `Add ${formatMoney(shippingProgress.remaining)} more to unlock Free Express Shipping!`);

  const discountRow = document.getElementById('discountRow');
  if (discountRow) discountRow.hidden = !(totals.couponDiscount > 0);
  setText('discountLabel', appliedCoupon ? `Promo (${appliedCoupon})` : 'Discount');

  const chip = document.getElementById('promoChip');
  if (chip) {
    chip.hidden = !appliedCoupon;
    if (appliedCoupon && promoEngine.coupons[appliedCoupon]) {
      setText('promoChipText', promoEngine.coupons[appliedCoupon].label);
    }
  }

  // 2. Render Product Card Buttons / Quantity Controls for p1..p8
  Object.keys(ITEM_META_FALLBACK).forEach((id) => {
    const container = document.getElementById(`action-${id}`);
    if (!container) return;

    const item = cart[id];
    if (item && item.qty > 0) {
      container.innerHTML = `
        <div class="qty-controls">
          <button class="qty-btn" aria-label="Decrease quantity" onclick="updateQuantity('${id}', -1)">-</button>
          <span class="qty-count">${item.qty}</span>
          <button class="qty-btn" aria-label="Increase quantity" onclick="updateQuantity('${id}', 1)">+</button>
        </div>
      `;
    } else {
      const meta = ITEM_META_FALLBACK[id];
      const safeName = meta.name.replace(/"/g, '&quot;');
      container.innerHTML = `
        <button class="add-btn" onclick="addToCart('${id}', '${safeName}', ${meta.price}, '${meta.img}')">Add to Cart</button>
      `;
    }
  });

  // Notify Promo Studio if initialized
  if (typeof window.syncPromoStudioWithCart === 'function') {
    window.syncPromoStudioWithCart();
  }

  // 3. Render Drawer List
  const drawerBody = document.getElementById('cartItemsList');
  if (!drawerBody) return;

  const items = Object.values(cart);
  if (items.length === 0) {
    const template = document.getElementById('cart-empty-template');
    drawerBody.replaceChildren(template.content.cloneNode(true));
    drawerBody.querySelector('.empty-cart-browse').addEventListener('click', () => {
      document.getElementById('cartDrawer').classList.remove('open');
      document.getElementById('cartBackdrop').classList.remove('open');
      const products = document.getElementById('productsGrid');
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      products.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      const nextAction = Array.from(products.querySelectorAll('button, a')).find(el => el.getClientRects().length);
      if (nextAction) nextAction.focus({ preventScroll: true });
    });
    return;
  }

  drawerBody.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <span class="cart-item-icon">${item.img}</span>
          <div class="cart-item-details">
            <h4>${item.name}</h4>
            <div class="price-sub">${formatMoney(item.price * item.qty)} (${formatMoney(item.price)} Ã— ${item.qty})</div>
          </div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" aria-label="Decrease quantity" onclick="updateQuantity('${item.id}', -1)">-</button>
          <span class="qty-count">${item.qty}</span>
          <button class="qty-btn" aria-label="Increase quantity" onclick="updateQuantity('${item.id}', 1)">+</button>
        </div>
      </div>
    `
    )
    .join('');
}

function checkout() {
  const items = Object.values(cart);
  if (items.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  if (typeof window.captureCheckoutInvoice === 'function') {
    window.captureCheckoutInvoice(items, appliedCoupon);
  }
  showToast('Order placed! High-DPI Canvas Invoice updated.');
  Object.keys(cart).forEach((key) => delete cart[key]);
  renderCart();
  toggleCartDrawer();
}

// Coupon form wiring
const couponForm = document.getElementById('couponForm');
if (couponForm) {
  couponForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.getElementById('couponInput');
    if (applyCoupon(input.value)) input.value = '';
  });
}
const promoRemoveBtn = document.getElementById('promoRemove');
if (promoRemoveBtn) promoRemoveBtn.addEventListener('click', removeCoupon);

// Escape closes the drawer
document.addEventListener('keydown', (event) => {
  const drawer = document.getElementById('cartDrawer');
  if (event.key === 'Escape' && drawer && drawer.classList.contains('open')) toggleCartDrawer();
});

loadSavedCoupon();
renderCart();

/* ===== BEGIN issue #63 & #402: Product Catalog & Faceted Search Engine ===== */
const PRODUCT_CATALOG = {
  p1: {
    id: 'p1',
    name: 'CyberDeck Pro Mechanical',
    category: 'keyboards',
    categoryLabel: 'KEYBOARDS',
    brand: 'nexus-lab',
    brandLabel: 'Nexus Lab',
    price: 249.00,
    rating: 4.9,
    ratingCount: 72,
    connectivity: 'tri-mode',
    connectivityLabel: 'Tri-Mode Wireless',
    colorKeys: ['black', 'violet', 'silver'],
    inStock: true,
    badge: 'HOT',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Wireless split ergonomic keyboard engineered with hot-swappable sockets, south-facing RGB matrix, customizable OLED telemetry screen, and CNC anodized aluminum chassis.',
    thumbs: [
      { icon: 'âŒ¨ï¸', label: 'Front Split', title: 'Ergonomic Split Layout' },
      { icon: 'ðŸ–²ï¸', label: '7Â° Tent', title: 'Integrated Tent Stand' },
      { icon: 'ðŸ”Œ', label: 'PCB Matrix', title: 'Hot-Swap Sockets' },
      { icon: 'ðŸ“¦', label: 'Unboxing', title: 'Braided Cable & Case' }
    ],
    colors: [
      { id: 'black', name: 'Stealth Matte Black', hex: '#18181b' },
      { id: 'violet', name: 'Synthwave Violet', hex: '#7c3aed' },
      { id: 'silver', name: 'Glacier Aluminum', hex: '#e2e8f0' }
    ],
    options: {
      label: 'Switch Mechanism',
      choices: [
        { id: 'linear', name: 'Gateron Oil King (Linear 55g)', priceDelta: 0 },
        { id: 'tactile', name: 'Holy Panda X (Tactile 62g)', priceDelta: 15.00 },
        { id: 'silent', name: 'Silent Aliaz Pro (Silent 60g)', priceDelta: 20.00 }
      ]
    },
    specs: [
      { icon: 'âš¡', text: 'Tri-Mode: 2.4G / BT 5.2 / USB-C' },
      { icon: 'ðŸ”‹', text: '4,000 mAh Li-ion (200 hrs)' },
      { icon: 'âš™ï¸', text: 'QMK & VIA Fully Programmable' },
      { icon: 'ðŸ›¡ï¸', text: 'Poron Gasket Acoustic Mount' }
    ]
  },
  p2: {
    id: 'p2',
    name: 'Acoustic Pulse ANC Headset',
    category: 'audio',
    categoryLabel: 'AUDIO & MONITORING',
    brand: 'vortex-audio',
    brandLabel: 'Vortex Audio',
    price: 199.00,
    rating: 4.8,
    ratingCount: 46,
    connectivity: 'wireless',
    connectivityLabel: 'Wireless 2.4GHz',
    colorKeys: ['black', 'silver', 'cyan'],
    inStock: true,
    badge: 'NEW',
    stockText: 'Only 3 Left',
    stockClass: 'low-stock',
    desc: 'Audiophile active noise-canceling studio headphones with ultra-low latency lossy spatial audio, custom 50mm beryllium biocellulose drivers, and broadcast-grade microphone.',
    thumbs: [
      { icon: 'ðŸŽ§', label: 'Studio Front', title: 'Studio Acoustic Profile' },
      { icon: 'ðŸŽ’', label: 'Folded', title: 'Foldable Travel Shell' },
      { icon: 'ðŸ”Š', label: 'Beryllium', title: '50mm Drivers' },
      { icon: 'ðŸŽ™ï¸', label: 'Broadcast', title: 'Detachable Boom Mic' }
    ],
    colors: [
      { id: 'black', name: 'Midnight Onyx Black', hex: '#0f172a' },
      { id: 'silver', name: 'Gunmetal Silver', hex: '#64748b' },
      { id: 'cyan', name: 'Pulse Kinetic Cyan', hex: '#06b6d4' }
    ],
    options: {
      label: 'Ear Cushion Material',
      choices: [
        { id: 'cooling', name: 'Cooling-Gel Memory Foam', priceDelta: 0 },
        { id: 'leather', name: 'Perforated Lambskin Leather', priceDelta: 18.00 },
        { id: 'velour', name: 'Acoustic Studio Velour', priceDelta: 12.00 }
      ]
    },
    specs: [
      { icon: 'ðŸ”‡', text: '40dB Hybrid Active Noise Cancel' },
      { icon: 'â±ï¸', text: '55-Hour Continuous Playback' },
      { icon: 'ðŸ“¶', text: 'Lossless 2.4GHz + Dual BT 5.3' },
      { icon: 'ðŸŽ›ï¸', text: 'Built-in 32-bit Quad DAC' }
    ]
  },
  p3: {
    id: 'p3',
    name: 'Horizon 32" Curved OLED',
    category: 'displays',
    categoryLabel: 'DISPLAYS & MONITORS',
    brand: 'apex-vision',
    brandLabel: 'Apex Vision',
    price: 899.00,
    rating: 4.9,
    ratingCount: 30,
    connectivity: 'usbc',
    connectivityLabel: 'USB-C / Wired',
    colorKeys: ['silver', 'black'],
    inStock: true,
    badge: 'PRO',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Immersive 1800R curved 4K UHD Quantum-Dot OLED display calibrated with 240Hz refresh rate, 0.03ms response time, 99% DCI-P3 gamut, and 90W USB-C single-cable dock.',
    thumbs: [
      { icon: 'ðŸ–¥ï¸', label: '1800R Front', title: 'Panoramic 1800R Curve' },
      { icon: 'âœ¨', label: 'Aura Halo', title: 'Ambient RGB Backlight' },
      { icon: 'ðŸ“', label: '4.5mm Slim', title: 'Razor-Thin OLED Panel' },
      { icon: 'âš¡', label: '90W Hub', title: 'Single-Cable USB-C Hub' }
    ],
    colors: [
      { id: 'silver', name: 'Space Gray Titanium', hex: '#94a3b8' },
      { id: 'black', name: 'Matte Obsidian Black', hex: '#020617' }
    ],
    options: {
      label: 'Mounting Stand Architecture',
      choices: [
        { id: 'desk', name: 'Heavy Anodized Desktop Stand', priceDelta: 0 },
        { id: 'arm', name: 'Ergonomic Gas-Spring VESA Arm', priceDelta: 45.00 }
      ]
    },
    specs: [
      { icon: 'ðŸŽ¯', text: '3840 x 2160 UHD @ 240Hz' },
      { icon: 'âš¡', text: '0.03ms (GtG) Pixel Response' },
      { icon: 'ðŸŽ¨', text: '99% DCI-P3 & Delta E < 1' },
      { icon: 'ðŸ”Œ', text: '90W USB-C + Dual HDMI 2.1' }
    ]
  },
  p4: {
    id: 'p4',
    name: 'Nexus Neo 65% Low-Profile',
    category: 'keyboards',
    categoryLabel: 'KEYBOARDS',
    brand: 'nexus-lab',
    brandLabel: 'Nexus Lab',
    price: 149.00,
    rating: 4.7,
    ratingCount: 54,
    connectivity: 'bluetooth',
    connectivityLabel: 'Bluetooth 5.3',
    colorKeys: ['black', 'white'],
    inStock: true,
    badge: 'POPULAR',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Ultra-thin mechanical keyboard with low-profile optical switches, PBT shine-through keycaps, and CNC aluminum chassis.',
    thumbs: [
      { icon: 'âŒ¨ï¸', label: 'Top View', title: '65% Compact Layout' },
      { icon: 'ðŸ“', label: 'Side Profile', title: '12mm Thin Chassis' },
      { icon: 'ðŸ”‹', label: 'Battery', title: '120h Bluetooth Endurance' },
      { icon: 'ðŸ“¦', label: 'Travel Case', title: 'Magnetic Travel Sleeve' }
    ],
    colors: [
      { id: 'black', name: 'Stealth Black', hex: '#18181b' },
      { id: 'white', name: 'Frost White', hex: '#f8fafc' }
    ],
    options: {
      label: 'Switch Variant',
      choices: [
        { id: 'red', name: 'Low-Profile Red (Linear 45g)', priceDelta: 0 },
        { id: 'brown', name: 'Low-Profile Brown (Tactile 50g)', priceDelta: 10.00 }
      ]
    },
    specs: [
      { icon: 'âš¡', text: 'Bluetooth 5.3 Low-Latency' },
      { icon: 'ðŸ”‹', text: '120h Operating Time' },
      { icon: 'ðŸª¶', text: 'Ultra-slim 12mm Profile' },
      { icon: 'ðŸ›¡ï¸', text: 'CNC Anodized Aluminum Top' }
    ]
  },
  p5: {
    id: 'p5',
    name: 'Vortex Reference Studio Monitors',
    category: 'audio',
    categoryLabel: 'AUDIO & MONITORING',
    brand: 'vortex-audio',
    brandLabel: 'Vortex Audio',
    price: 349.00,
    rating: 4.6,
    ratingCount: 28,
    connectivity: 'wired',
    connectivityLabel: 'USB-C / Wired',
    colorKeys: ['black', 'silver'],
    inStock: true,
    badge: 'STUDIO',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Active bi-amplified studio reference speakers with DSP room correction and balanced TRS inputs.',
    thumbs: [
      { icon: 'ðŸ”Š', label: 'Pair Front', title: 'Dual Bi-Amp Monoliths' },
      { icon: 'ðŸŽ›ï¸', label: 'Back DSP', title: 'Room Acoustics Equalizer' },
      { icon: 'ðŸ”Œ', label: 'Balanced I/O', title: 'XLR & TRS Balanced In' },
      { icon: 'ðŸ“¦', label: 'Isolation', title: 'Acoustic Foam Decouplers' }
    ],
    colors: [
      { id: 'black', name: 'Matte Studio Charcoal', hex: '#18181b' },
      { id: 'silver', name: 'Raw Brushed Silver', hex: '#94a3b8' }
    ],
    options: {
      label: 'Woofer Size',
      choices: [
        { id: '5inch', name: '5-Inch Carbon Fiber Drivers', priceDelta: 0 },
        { id: '7inch', name: '7-Inch Deep Bass Carbon Drivers', priceDelta: 80.00 }
      ]
    },
    specs: [
      { icon: 'ðŸ”Š', text: '100W Class-D Bi-Amplified' },
      { icon: 'ðŸ“ˆ', text: '38Hz â€“ 24kHz Flat Response' },
      { icon: 'ðŸŽ›ï¸', text: 'Integrated 32-bit DSP Room EQ' },
      { icon: 'ðŸ”Œ', text: 'XLR, 1/4" TRS & USB-C DAC' }
    ]
  },
  p6: {
    id: 'p6',
    name: 'Apex UltraWide 49" 240Hz',
    category: 'displays',
    categoryLabel: 'DISPLAYS & MONITORS',
    brand: 'apex-vision',
    brandLabel: 'Apex Vision',
    price: 1199.00,
    rating: 4.9,
    ratingCount: 19,
    connectivity: 'usbc',
    connectivityLabel: 'USB-C / Wired',
    colorKeys: ['black', 'silver'],
    inStock: false,
    badge: 'FLAGSHIP',
    stockText: 'Backorder',
    stockClass: 'low-stock',
    desc: 'Super ultrawide 32:9 dual QHD curved monitor with 1000R curvature and built-in KVM switch.',
    thumbs: [
      { icon: 'ðŸ–¥ï¸', label: 'Panoramic 32:9', title: 'Dual 1440p Workspace' },
      { icon: 'ðŸ”„', label: 'KVM Hub', title: 'Dual PC Control Matrix' },
      { icon: 'ðŸŒˆ', label: 'Mini-LED HDR', title: 'HDR 1000 Zone Dimming' },
      { icon: 'ðŸ“¦', label: 'Heavy Arm', title: 'Integrated Heavy-Duty Stand' }
    ],
    colors: [
      { id: 'black', name: 'Cosmic Black', hex: '#020617' },
      { id: 'silver', name: 'Anodized Silver', hex: '#94a3b8' }
    ],
    options: {
      label: 'Panel Surface',
      choices: [
        { id: 'matte', name: 'Anti-Glare Matte (AGR)', priceDelta: 0 },
        { id: 'glossy', name: 'Glossy Pure Contrast Coat', priceDelta: 50.00 }
      ]
    },
    specs: [
      { icon: 'ðŸŽ¯', text: '5120 x 1440 Dual QHD @ 240Hz' },
      { icon: 'âš¡', text: '0.03ms GtG Response Time' },
      { icon: 'ðŸ”„', text: 'Integrated USB-C KVM Switch' },
      { icon: 'âœ¨', text: 'Quantum Dot Mini-LED 1000 nits' }
    ]
  },
  p7: {
    id: 'p7',
    name: 'HyperStream Studio Mic & Arm',
    category: 'audio',
    categoryLabel: 'AUDIO & MONITORING',
    brand: 'nexus-lab',
    brandLabel: 'Nexus Lab',
    price: 179.00,
    rating: 4.5,
    ratingCount: 39,
    connectivity: 'usbc',
    connectivityLabel: 'USB-C / Wired',
    colorKeys: ['black', 'silver'],
    inStock: true,
    badge: 'NEW',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: '24-bit 192kHz broadcast condenser microphone with dual polar patterns and metal boom arm.',
    thumbs: [
      { icon: 'ðŸŽ™ï¸', label: 'Capsule Front', title: '25mm Gold-Sputtered Capsule' },
      { icon: 'ðŸ¦¾', label: 'Boom Arm', title: 'Gas-Spring Low Profile Arm' },
      { icon: 'ðŸ”‡', label: 'Tap Mute', title: 'Capacitive Tap-to-Mute' },
      { icon: 'ðŸ“¦', label: 'Full Kit', title: 'Shockmount & Pop Filter' }
    ],
    colors: [
      { id: 'black', name: 'Matte Cast Black', hex: '#18181b' },
      { id: 'silver', name: 'Silver Nickel', hex: '#94a3b8' }
    ],
    options: {
      label: 'Mount Type',
      choices: [
        { id: 'arm', name: 'Desk-Clamp Boom Arm', priceDelta: 0 },
        { id: 'stand', name: 'Cast-Iron Heavy Desktop Stand', priceDelta: 15.00 }
      ]
    },
    specs: [
      { icon: 'ðŸŽ™ï¸', text: '24-bit / 192kHz Studio Recording' },
      { icon: 'ðŸŽ¯', text: 'Cardioid & Omnidirectional Modes' },
      { icon: 'ðŸŽ§', text: 'Zero-Latency 3.5mm Headphone Jack' },
      { icon: 'ðŸ”Œ', text: 'Plug & Play USB-C Bus Powered' }
    ]
  },
  p8: {
    id: 'p8',
    name: 'Keychronix Ergo Alice Custom',
    category: 'keyboards',
    categoryLabel: 'KEYBOARDS',
    brand: 'keychronix',
    brandLabel: 'Keychronix',
    price: 289.00,
    rating: 4.8,
    ratingCount: 33,
    connectivity: 'tri-mode',
    connectivityLabel: 'Tri-Mode Wireless',
    colorKeys: ['violet', 'white', 'black'],
    inStock: true,
    badge: 'LIMITED',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Ergonomic Alice layout keyboard with rotary media knob, brass counterweight, and gasket mount.',
    thumbs: [
      { icon: 'âŒ¨ï¸', label: 'Split Angle', title: 'Natural Wrist Ergonomics' },
      { icon: 'ðŸŽ›ï¸', label: 'Rotary Knob', title: 'CNC Aluminum Volume Dial' },
      { icon: 'ðŸª™', label: 'Brass Weight', title: '2.4kg Solid Brass Base' },
      { icon: 'ðŸ“¦', label: 'Carrying Case', title: 'Custom Hard EVA Case' }
    ],
    colors: [
      { id: 'violet', name: 'Nebula Violet', hex: '#7c3aed' },
      { id: 'white', name: 'Pure Chalk White', hex: '#f8fafc' },
      { id: 'black', name: 'Carbon Black', hex: '#18181b' }
    ],
    options: {
      label: 'Plate Material',
      choices: [
        { id: 'fr4', name: 'FR4 Acoustic Plate (Thocky)', priceDelta: 0 },
        { id: 'pom', name: 'POM Flexible Plate (Clacky)', priceDelta: 12.00 },
        { id: 'brass', name: 'Brass Heavy Plate (Firm)', priceDelta: 25.00 }
      ]
    },
    specs: [
      { icon: 'âš¡', text: 'Tri-Mode: 2.4GHz / BT 5.1 / USB-C' },
      { icon: 'ðŸª™', text: '2.4kg CNC Brass Weighted Case' },
      { icon: 'ðŸŽ›ï¸', text: 'Programmable Rotary Media Dial' },
      { icon: 'âš™ï¸', text: 'VIA / QMK Full Key Remapping' }
    ]
  }
};

/* ===== BEGIN issue #402: Faceted Filter State & Engine ===== */
const facetState = {
  searchQuery: '',
  maxPrice: 1200,
  category: 'all',
  brands: new Set(),
  connectivity: new Set(),
  colors: new Set(),
  minRating: 0,
  inStockOnly: false,
  sortBy: 'featured'
};

const BRAND_LABELS = {
  'nexus-lab': 'Nexus Lab',
  'vortex-audio': 'Vortex Audio',
  'apex-vision': 'Apex Vision',
  'keychronix': 'Keychronix'
};

const CONN_LABELS = {
  'tri-mode': 'Tri-Mode Wireless',
  'wireless': 'Wireless 2.4GHz',
  'bluetooth': 'Bluetooth 5.3',
  'usbc': 'USB-C / Wired'
};

const COLOR_LABELS = {
  black: 'Black',
  silver: 'Silver',
  violet: 'Violet',
  cyan: 'Cyan',
  white: 'White'
};

function productMatchesPredicate(product, overrides = {}) {
  const query = overrides.searchQuery !== undefined ? overrides.searchQuery : facetState.searchQuery;
  const maxPrice = overrides.maxPrice !== undefined ? overrides.maxPrice : facetState.maxPrice;
  const category = overrides.category !== undefined ? overrides.category : facetState.category;
  const brands = overrides.brands !== undefined ? overrides.brands : facetState.brands;
  const connectivity = overrides.connectivity !== undefined ? overrides.connectivity : facetState.connectivity;
  const colors = overrides.colors !== undefined ? overrides.colors : facetState.colors;
  const minRating = overrides.minRating !== undefined ? overrides.minRating : facetState.minRating;
  const inStockOnly = overrides.inStockOnly !== undefined ? overrides.inStockOnly : facetState.inStockOnly;

  // Search keyword query
  if (query) {
    const q = query.toLowerCase();
    const matchesTitle = product.name.toLowerCase().includes(q);
    const matchesDesc = product.desc.toLowerCase().includes(q);
    const matchesBrand = (product.brandLabel || '').toLowerCase().includes(q);
    if (!matchesTitle && !matchesDesc && !matchesBrand) return false;
  }

  // Price
  if (product.price > maxPrice) return false;

  // Category
  if (category !== 'all' && product.category !== category) return false;

  // Brands
  if (brands.size > 0 && !brands.has(product.brand)) return false;

  // Connectivity
  if (connectivity.size > 0) {
    // If product connectivity is wired, match 'usbc' option
    const pConn = product.connectivity === 'wired' ? 'usbc' : product.connectivity;
    if (!connectivity.has(pConn) && !connectivity.has(product.connectivity)) return false;
  }

  // Colors
  if (colors.size > 0) {
    const pColors = product.colorKeys || [];
    const hasColorMatch = pColors.some(c => colors.has(c));
    if (!hasColorMatch) return false;
  }

  // Rating
  if (minRating > 0 && product.rating < minRating) return false;

  // In Stock
  if (inStockOnly && !product.inStock) return false;

  return true;
}

function updateFacetCounts() {
  const allProducts = Object.values(PRODUCT_CATALOG);

  // 1. Brands counts: compute matches when varying brand facet
  const brandKeys = ['nexus-lab', 'vortex-audio', 'apex-vision', 'keychronix'];
  brandKeys.forEach(brandKey => {
    const cnt = allProducts.filter(p => productMatchesPredicate(p, { brands: new Set([brandKey]) })).length;
    const el = document.getElementById(`count-brand-${brandKey}`);
    if (el) el.textContent = cnt;
    const parentLabel = el ? el.closest('.facet-checkbox-label') : null;
    if (parentLabel) parentLabel.classList.toggle('facet-zero-count', cnt === 0);
  });

  // 2. Connectivity counts
  const connKeys = ['tri-mode', 'wireless', 'bluetooth', 'usbc'];
  connKeys.forEach(connKey => {
    const cnt = allProducts.filter(p => productMatchesPredicate(p, { connectivity: new Set([connKey]) })).length;
    const el = document.getElementById(`count-conn-${connKey}`);
    if (el) el.textContent = cnt;
    const parentLabel = el ? el.closest('.facet-checkbox-label') : null;
    if (parentLabel) parentLabel.classList.toggle('facet-zero-count', cnt === 0);
  });

  // 3. Color counts
  const colorKeys = ['black', 'silver', 'violet', 'cyan', 'white'];
  colorKeys.forEach(colorKey => {
    const cnt = allProducts.filter(p => productMatchesPredicate(p, { colors: new Set([colorKey]) })).length;
    const el = document.getElementById(`count-color-${colorKey}`);
    if (el) el.textContent = cnt;
    const swatchBtn = document.querySelector(`.swatch-btn[data-color="${colorKey}"]`);
    if (swatchBtn) swatchBtn.classList.toggle('facet-zero-count', cnt === 0);
  });

  // 4. Rating counts
  const rAll = allProducts.filter(p => productMatchesPredicate(p, { minRating: 0 })).length;
  const r48 = allProducts.filter(p => productMatchesPredicate(p, { minRating: 4.8 })).length;
  const r46 = allProducts.filter(p => productMatchesPredicate(p, { minRating: 4.6 })).length;
  const r40 = allProducts.filter(p => productMatchesPredicate(p, { minRating: 4.0 })).length;

  const setBadge = (id, count) => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  };
  setBadge('count-rating-all', rAll);
  setBadge('count-rating-48', r48);
  setBadge('count-rating-46', r46);
  setBadge('count-rating-40', r40);

  // 5. In-stock count
  const stockCount = allProducts.filter(p => productMatchesPredicate(p, { inStockOnly: true })).length;
  setBadge('count-instock', stockCount);
}

function renderActiveChips() {
  const container = document.getElementById('chipsList');
  const bar = document.getElementById('activeChipsBar');
  if (!container || !bar) return;

  const chips = [];

  if (facetState.searchQuery) {
    chips.push({
      label: `"${facetState.searchQuery}"`,
      type: 'search',
      action: () => {
        facetState.searchQuery = '';
        const input = document.getElementById('productSearchInput');
        if (input) input.value = '';
        applyFacetedFilters();
      }
    });
  }

  if (facetState.category !== 'all') {
    chips.push({
      label: `Category: ${facetState.category.toUpperCase()}`,
      type: 'category',
      action: () => {
        setCategoryFilter('all');
      }
    });
  }

  if (facetState.maxPrice < 1200) {
    chips.push({
      label: `Under $${facetState.maxPrice}`,
      type: 'price',
      action: () => {
        facetState.maxPrice = 1200;
        const slider = document.getElementById('priceRange');
        if (slider) slider.value = 1200;
        const disp = document.getElementById('priceDisplay');
        if (disp) disp.textContent = 'Up to $1,200';
        applyFacetedFilters();
      }
    });
  }

  facetState.brands.forEach(b => {
    chips.push({
      label: `Brand: ${BRAND_LABELS[b] || b}`,
      type: 'brand',
      action: () => {
        facetState.brands.delete(b);
        const chk = document.querySelector(`.brand-filter[value="${b}"]`);
        if (chk) chk.checked = false;
        applyFacetedFilters();
      }
    });
  });

  facetState.connectivity.forEach(c => {
    chips.push({
      label: `Connectivity: ${CONN_LABELS[c] || c}`,
      type: 'connectivity',
      action: () => {
        facetState.connectivity.delete(c);
        const chk = document.querySelector(`.conn-filter[value="${c}"]`);
        if (chk) chk.checked = false;
        applyFacetedFilters();
      }
    });
  });

  facetState.colors.forEach(col => {
    chips.push({
      label: `Color: ${COLOR_LABELS[col] || col}`,
      type: 'color',
      action: () => {
        facetState.colors.delete(col);
        const btn = document.querySelector(`.swatch-btn[data-color="${col}"]`);
        if (btn) btn.classList.remove('active');
        applyFacetedFilters();
      }
    });
  });

  if (facetState.minRating > 0) {
    chips.push({
      label: `â˜… ${facetState.minRating}+ Rating`,
      type: 'rating',
      action: () => {
        facetState.minRating = 0;
        const rad = document.querySelector('.rating-filter[value="0"]');
        if (rad) rad.checked = true;
        applyFacetedFilters();
      }
    });
  }

  if (facetState.inStockOnly) {
    chips.push({
      label: 'In Stock Only',
      type: 'stock',
      action: () => {
        facetState.inStockOnly = false;
        const chk = document.getElementById('inStockCheckbox');
        if (chk) chk.checked = false;
        applyFacetedFilters();
      }
    });
  }

  if (chips.length === 0) {
    bar.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  bar.style.display = 'flex';
  container.replaceChildren();

  chips.forEach(chip => {
    const chipEl = document.createElement('div');
    chipEl.className = 'filter-chip';

    const lblSpan = document.createElement('span');
    lblSpan.textContent = chip.label;

    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'chip-remove';
    rmBtn.setAttribute('aria-label', `Remove filter ${chip.label}`);
    rmBtn.textContent = '✕';
    rmBtn.addEventListener('click', chip.action);

    chipEl.appendChild(lblSpan);
    chipEl.appendChild(rmBtn);
    container.appendChild(chipEl);
  });
}

function applyFacetedFilters() {
  const cards = Array.from(document.querySelectorAll('#productsGrid .card'));
  let visibleCount = 0;

  // 1. Determine matches
  cards.forEach(card => {
    const id = card.getAttribute('data-id');
    const product = PRODUCT_CATALOG[id];
    if (!product) return;

    const matches = productMatchesPredicate(product);
    if (matches) {
      card.style.display = 'block';
      card.classList.remove('card-hidden');
      card.setAttribute('aria-hidden', 'false');
      visibleCount += 1;
    } else {
      card.style.display = 'none';
      card.classList.add('card-hidden');
      card.setAttribute('aria-hidden', 'true');
    }
  });

  // 2. Sort visible cards
  const grid = document.getElementById('productsGrid');
  if (grid) {
    const sortedCards = cards.filter(card => card.style.display !== 'none');
    sortedCards.sort((a, b) => {
      const idA = a.getAttribute('data-id');
      const idB = b.getAttribute('data-id');
      const prodA = PRODUCT_CATALOG[idA];
      const prodB = PRODUCT_CATALOG[idB];
      if (!prodA || !prodB) return 0;

      switch (facetState.sortBy) {
        case 'price-asc':
          return prodA.price - prodB.price;
        case 'price-desc':
          return prodB.price - prodA.price;
        case 'rating-desc':
          return prodB.rating - prodA.rating;
        default:
          return idA.localeCompare(idB);
      }
    });

    sortedCards.forEach(card => grid.appendChild(card));
  }

  // 3. Update count tallies
  const visibleEl = document.getElementById('visibleProductsCount');
  const totalEl = document.getElementById('totalProductsCount');
  if (visibleEl) visibleEl.textContent = visibleCount;
  if (totalEl) totalEl.textContent = Object.keys(PRODUCT_CATALOG).length;

  // 4. Empty state
  const noResCard = document.getElementById('noResultsCard');
  if (noResCard) {
    noResCard.style.display = visibleCount === 0 ? 'block' : 'none';
  }

  // 5. Update facet live count badges
  updateFacetCounts();

  // 6. Active filter chips
  renderActiveChips();
}

function setCategoryFilter(cat) {
  facetState.category = cat;
  document.querySelectorAll('.category-tabs .tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-cat') === cat);
  });
  applyFacetedFilters();
}

function handleCatalogSort(sortValue) {
  facetState.sortBy = sortValue;
  applyFacetedFilters();
}

function resetFacetedFilters() {
  facetState.searchQuery = '';
  facetState.maxPrice = 1200;
  facetState.category = 'all';
  facetState.brands.clear();
  facetState.connectivity.clear();
  facetState.colors.clear();
  facetState.minRating = 0;
  facetState.inStockOnly = false;
  facetState.sortBy = 'featured';

  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) searchInput.value = '';

  const priceSlider = document.getElementById('priceRange');
  if (priceSlider) priceSlider.value = 1200;
  const priceDisplay = document.getElementById('priceDisplay');
  if (priceDisplay) priceDisplay.textContent = 'Up to $1,200';

  document.querySelectorAll('.brand-filter').forEach(chk => { chk.checked = false; });
  document.querySelectorAll('.conn-filter').forEach(chk => { chk.checked = false; });
  document.querySelectorAll('.swatch-btn').forEach(btn => { btn.classList.remove('active'); });

  const radAll = document.querySelector('.rating-filter[value="0"]');
  if (radAll) radAll.checked = true;

  const stockChk = document.getElementById('inStockCheckbox');
  if (stockChk) stockChk.checked = false;

  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('.category-tabs .tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-cat') === 'all');
  });

  applyFacetedFilters();
}

// Expose handlers globally for HTML attributes
window.resetFacetedFilters = resetFacetedFilters;
window.handleCatalogSort = handleCatalogSort;
window.setCategoryFilter = setCategoryFilter;

function initFacetedFilterListeners() {
  // Category tabs
  document.querySelectorAll('.category-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-cat') || 'all';
      setCategoryFilter(cat);
    });
  });

  // Search input
  const searchInput = document.getElementById('productSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      facetState.searchQuery = e.target.value.trim();
      applyFacetedFilters();
    });
  }

  // Price slider
  const priceSlider = document.getElementById('priceRange');
  const priceDisplay = document.getElementById('priceDisplay');
  if (priceSlider) {
    priceSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      facetState.maxPrice = val;
      if (priceDisplay) priceDisplay.textContent = `Up to $${val.toLocaleString()}`;
      applyFacetedFilters();
    });
  }

  // Brand checkboxes
  document.querySelectorAll('.brand-filter').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const val = e.target.value;
      if (e.target.checked) facetState.brands.add(val);
      else facetState.brands.delete(val);
      applyFacetedFilters();
    });
  });

  // Connectivity checkboxes
  document.querySelectorAll('.conn-filter').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const val = e.target.value;
      if (e.target.checked) facetState.connectivity.add(val);
      else facetState.connectivity.delete(val);
      applyFacetedFilters();
    });
  });

  // Color swatches
  document.querySelectorAll('.swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.getAttribute('data-color');
      if (!color) return;
      if (facetState.colors.has(color)) {
        facetState.colors.delete(color);
        btn.classList.remove('active');
      } else {
        facetState.colors.add(color);
        btn.classList.add('active');
      }
      applyFacetedFilters();
    });
  });

  // Rating radio filters
  document.querySelectorAll('.rating-filter').forEach(radio => {
    radio.addEventListener('change', (e) => {
      facetState.minRating = Number(e.target.value);
      applyFacetedFilters();
    });
  });

  // In Stock checkbox
  const inStockCheckbox = document.getElementById('inStockCheckbox');
  if (inStockCheckbox) {
    inStockCheckbox.addEventListener('change', (e) => {
      facetState.inStockOnly = e.target.checked;
      applyFacetedFilters();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      handleCatalogSort(e.target.value);
    });
  }

  // Initial calculation and counts
  applyFacetedFilters();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFacetedFilterListeners);
} else {
  initFacetedFilterListeners();
}

/* ===== BEGIN Issue #339: Multi-Currency Pricing Engine ===== */
function updateCatalogPrices() {
  const cards = document.querySelectorAll('.products-grid .card[data-id]');
  cards.forEach((card) => {
    const id = card.getAttribute('data-id');
    const priceEl = card.querySelector('.price');
    if (priceEl && PRODUCT_CATALOG[id]) {
      priceEl.textContent = formatMoney(PRODUCT_CATALOG[id].price);
    }
  });
}

function setCurrency(newCode) {
  if (!CURRENCIES[newCode]) return;
  currentCurrency = newCode;
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currentCurrency);
  } catch {
    // Ignore storage restrictions
  }

  const select = document.getElementById('currencySelect');
  if (select && select.value !== currentCurrency) {
    select.value = currentCurrency;
  }

  updateCatalogPrices();
  renderCart();

  // If Quick View modal is active, update displayed totals & option buttons
  const qvModal = document.getElementById('quickViewModal');
  if (qvModal && !qvModal.hidden && qvState.productId) {
    updateQuickViewDisplay();
    const product = PRODUCT_CATALOG[qvState.productId];
    const pillsContainer = document.getElementById('qvOptionPills');
    if (product && product.options && pillsContainer) {
      pillsContainer.innerHTML = '';
      product.options.choices.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `qv-pill-btn ${idx === qvState.optionIdx ? 'active' : ''}`;
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', String(idx === qvState.optionIdx));
        const deltaText = opt.priceDelta > 0 ? ` (+${formatMoney(opt.priceDelta)})` : '';
        btn.textContent = `${opt.name}${deltaText}`;
        btn.addEventListener('click', () => selectQuickViewOption(idx));
        pillsContainer.appendChild(btn);
      });
    }
  }

  // Dispatch global currencychange event for wishlist & comparison drawers
  window.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: currentCurrency } }));

  showToast(`Currency changed to ${currentCurrency} (${CURRENCIES[currentCurrency].symbol})`);
}

function initCurrencyEngine() {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved && CURRENCIES[saved]) {
      currentCurrency = saved;
    }
  } catch {
    currentCurrency = 'USD';
  }

  const select = document.getElementById('currencySelect');
  if (select) {
    select.value = currentCurrency;
    select.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  }

  updateCatalogPrices();
}

// Initialize currency engine once DOM and product catalog are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCurrencyEngine);
} else {
  initCurrencyEngine();
}
/* ===== END Issue #339 ===== */

const qvState = {
  productId: 'p1',
  thumbIdx: 0,
  colorIdx: 0,
  optionIdx: 0,
  qty: 1
};

function openQuickView(productId) {
  const product = PRODUCT_CATALOG[productId];
  if (!product) return;

  qvState.productId = productId;
  qvState.thumbIdx = 0;
  qvState.colorIdx = 0;
  qvState.optionIdx = 0;
  qvState.qty = 1;

  // Populate basic text
  const setText = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setText('qvBadge', product.badge);
  setText('qvCategory', product.categoryLabel);
  setText('qvTitle', product.name);
  setText('qvDesc', product.desc);

  const stockEl = document.getElementById('qvStock');
  if (stockEl) {
    stockEl.className = `stock-badge ${product.stockClass}`;
    stockEl.textContent = product.stockText;
  }

  // Populate Thumbnails
  const thumbsContainer = document.getElementById('qvThumbs');
  if (thumbsContainer) {
    thumbsContainer.innerHTML = '';
    product.thumbs.forEach((th, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `qv-thumb-btn ${idx === 0 ? 'active' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(idx === 0));
      btn.setAttribute('aria-label', th.title);
      btn.innerHTML = `<span class="qv-thumb-icon">${th.icon}</span><span class="qv-thumb-text">${th.label}</span>`;
      btn.addEventListener('click', () => selectQuickViewThumb(idx));
      thumbsContainer.appendChild(btn);
    });
  }

  // Populate Color Swatches
  const colorGroup = document.getElementById('qvColorGroup');
  const swatchesContainer = document.getElementById('qvColorSwatches');
  if (product.colors && product.colors.length > 0) {
    colorGroup.hidden = false;
    swatchesContainer.innerHTML = '';
    product.colors.forEach((col, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `qv-swatch-btn ${idx === 0 ? 'active' : ''}`;
      btn.style.backgroundColor = col.hex;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(idx === 0));
      btn.setAttribute('aria-label', col.name);
      btn.addEventListener('click', () => selectQuickViewColor(idx));
      swatchesContainer.appendChild(btn);
    });
    setText('qvColorName', product.colors[0].name);
  } else {
    colorGroup.hidden = true;
  }

  // Populate Option Pills
  const optionGroup = document.getElementById('qvOptionGroup');
  const pillsContainer = document.getElementById('qvOptionPills');
  if (product.options && product.options.choices.length > 0) {
    optionGroup.hidden = false;
    setText('qvOptionLabel', product.options.label);
    pillsContainer.innerHTML = '';
    product.options.choices.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `qv-pill-btn ${idx === 0 ? 'active' : ''}`;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(idx === 0));
      const deltaText = opt.priceDelta > 0 ? ` (+${formatMoney(opt.priceDelta)})` : '';
      btn.textContent = `${opt.name}${deltaText}`;
      btn.addEventListener('click', () => selectQuickViewOption(idx));
      pillsContainer.appendChild(btn);
    });
    setText('qvOptionValue', product.options.choices[0].name);
  } else {
    optionGroup.hidden = true;
  }

  // Populate Specs Matrix
  const specsContainer = document.getElementById('qvSpecsMatrix');
  if (specsContainer) {
    specsContainer.innerHTML = '';
    product.specs.forEach((spec) => {
      const item = document.createElement('div');
      item.className = 'qv-spec-item';
      item.innerHTML = `<span>${spec.icon}</span><span>${spec.text}</span>`;
      specsContainer.appendChild(item);
    });
  }

  updateQuickViewDisplay();

  // Show modal and backdrop
  const modal = document.getElementById('quickViewModal');
  const backdrop = document.getElementById('quickViewBackdrop');
  if (modal && backdrop) {
    modal.hidden = false;
    // trigger animation frame
    requestAnimationFrame(() => {
      modal.classList.add('open');
      backdrop.classList.add('open');
    });
    document.body.style.overflow = 'hidden';
    const closeBtn = document.getElementById('qvCloseBtn');
    if (closeBtn) closeBtn.focus();
  }
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  const backdrop = document.getElementById('quickViewBackdrop');
  if (modal && backdrop) {
    modal.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => {
      modal.hidden = true;
    }, 300);
  }
}

function selectQuickViewThumb(idx) {
  qvState.thumbIdx = idx;
  const product = PRODUCT_CATALOG[qvState.productId];
  if (!product) return;

  const thumbs = document.querySelectorAll('.qv-thumb-btn');
  thumbs.forEach((t, i) => {
    t.classList.toggle('active', i === idx);
    t.setAttribute('aria-selected', String(i === idx));
  });

  const visualEl = document.getElementById('qvMainVisual');
  const labelEl = document.getElementById('qvViewLabel');
  if (visualEl && product.thumbs[idx]) {
    visualEl.textContent = product.thumbs[idx].icon;
  }
  if (labelEl && product.thumbs[idx]) {
    labelEl.textContent = product.thumbs[idx].title;
  }
}

function selectQuickViewColor(idx) {
  qvState.colorIdx = idx;
  const product = PRODUCT_CATALOG[qvState.productId];
  if (!product || !product.colors[idx]) return;

  const swatches = document.querySelectorAll('.qv-swatch-btn');
  swatches.forEach((s, i) => {
    s.classList.toggle('active', i === idx);
    s.setAttribute('aria-checked', String(i === idx));
  });

  const nameEl = document.getElementById('qvColorName');
  if (nameEl) nameEl.textContent = product.colors[idx].name;
}

function selectQuickViewOption(idx) {
  qvState.optionIdx = idx;
  const product = PRODUCT_CATALOG[qvState.productId];
  if (!product || !product.options.choices[idx]) return;

  const pills = document.querySelectorAll('.qv-pill-btn');
  pills.forEach((p, i) => {
    p.classList.toggle('active', i === idx);
    p.setAttribute('aria-checked', String(i === idx));
  });

  const valEl = document.getElementById('qvOptionValue');
  if (valEl) valEl.textContent = product.options.choices[idx].name;

  updateQuickViewDisplay();
}

function adjustQuickViewQty(delta) {
  qvState.qty = Math.max(1, Math.min(10, qvState.qty + delta));
  updateQuickViewDisplay();
}

function getQuickViewUnitPrice() {
  const product = PRODUCT_CATALOG[qvState.productId];
  if (!product) return 0;
  const optDelta = product.options && product.options.choices[qvState.optionIdx]
    ? product.options.choices[qvState.optionIdx].priceDelta
    : 0;
  return product.price + optDelta;
}

function updateQuickViewDisplay() {
  const unit = getQuickViewUnitPrice();
  const total = unit * qvState.qty;

  const countEl = document.getElementById('qvQtyCount');
  if (countEl) countEl.textContent = qvState.qty;

  const priceEl = document.getElementById('qvPrice');
  if (priceEl) priceEl.textContent = formatMoney(unit);

  const addTotalEl = document.getElementById('qvAddTotal');
  if (addTotalEl) addTotalEl.textContent = formatMoney(total);

  selectQuickViewThumb(qvState.thumbIdx);
}

function addQuickViewToCart() {
  const product = PRODUCT_CATALOG[qvState.productId];
  if (!product) return;

  const color = product.colors && product.colors[qvState.colorIdx] ? product.colors[qvState.colorIdx].name : '';
  const opt = product.options && product.options.choices[qvState.optionIdx] ? product.options.choices[qvState.optionIdx].name : '';
  const unitPrice = getQuickViewUnitPrice();

  // Create or add into cart
  const itemKey = `${product.id}-${qvState.colorIdx}-${qvState.optionIdx}`;
  const customTitle = `${product.name} (${color ? color.split(' ')[0] : ''}${opt ? ', ' + opt.split(' ')[0] : ''})`;

  if (!cart[itemKey]) {
    cart[itemKey] = {
      id: itemKey,
      name: customTitle,
      price: unitPrice,
      qty: qvState.qty,
      img: product.thumbs[0].icon
    };
  } else {
    cart[itemKey].qty = Math.min(20, cart[itemKey].qty + qvState.qty);
  }

  renderCart();
  showToast(`Added ${qvState.qty}x ${product.name} to cart!`);

  // Visual feedback on the button
  const btn = document.getElementById('qvAddToCartBtn');
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = '✓ Added to Cart!';
    btn.style.backgroundColor = '#22c55e';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = '';
    }, 1500);
  }
}

function openCartFromQuickView() {
  closeQuickView();
  setTimeout(() => {
    toggleCartDrawer();
  }, 250);
}

// Escape key closes Quick View modal
document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('quickViewModal');
  if (event.key === 'Escape' && modal && !modal.hidden) {
    closeQuickView();
  }
});
/* ===== END issue #63 ===== */



/* ===== BEGIN issue #189: Customer Reviews & Rating Breakdown Analytics Widget ===== */
const INITIAL_REVIEWS = [
  {
    id: 'rev-1',
    productId: 'p1',
    productName: 'CyberDeck Pro Mechanical',
    author: 'Elena Rostova',
    role: 'Principal Systems Architect',
    rating: 5,
    headline: 'Flawless ergonomics and unmatched switch acoustics',
    comment: 'The split tenting angle saved my wrists during 12-hour distributed system debugging sessions. South-facing LEDs paired with the Gateron Oil Kings produce an incredibly deep, marbly acoustic profile with zero ping. The custom OLED telemetry display tracking active layer states is brilliant.',
    date: '2 days ago',
    timestamp: Date.now() - 2 * 86400000,
    verified: true,
    helpfulCount: 38,
    userVoted: false
  },
  {
    id: 'rev-2',
    productId: 'p3',
    productName: 'Horizon 32" Curved OLED',
    author: 'Marcus Vance',
    role: 'Staff Graphics Engineer',
    rating: 5,
    headline: 'True 10-bit color, ink blacks, and zero motion blur',
    comment: 'Coding in Neovim and dark IDEs with QD-OLED contrast is genuinely transformative. Text fringing is practically non-existent thanks to the updated subpixel matrix. The 240Hz refresh rate makes scrolling through massive repos silky smooth, and the single-cable 90W USB-C dock powers my setup effortlessly.',
    date: '4 days ago',
    timestamp: Date.now() - 4 * 86400000,
    verified: true,
    helpfulCount: 29,
    userVoted: false
  },
  {
    id: 'rev-3',
    productId: 'p2',
    productName: 'Acoustic Pulse ANC Headset',
    author: 'Devon K.',
    role: 'Full-Stack Developer & Podcaster',
    rating: 5,
    headline: 'Active noise cancellation that eliminates mechanical clatter',
    comment: 'The 40dB hybrid ANC isolates noisy open-office chatter and heavy keystrokes completely without introducing ear canal pressure. The cooling-gel pads stay comfortable through full 8-hour sprint cycles. The detachable broadcast mic has crystal-clear voice rejection.',
    date: '1 week ago',
    timestamp: Date.now() - 7 * 86400000,
    verified: true,
    helpfulCount: 24,
    userVoted: false
  },
  {
    id: 'rev-4',
    productId: 'p1',
    productName: 'CyberDeck Pro Mechanical',
    author: 'Chloe Chen',
    role: 'Open-Source Core Maintainer',
    rating: 5,
    headline: 'The definitive split keyboard for terminal purists',
    comment: 'QMK/VIA programming worked immediately out of the box. Flashing keymaps on Linux was effortless with zero driver hurdles. Gasket mount flex is subtle yet absorbs high-speed typing fatigue wonderfully.',
    date: '1 week ago',
    timestamp: Date.now() - 8 * 86400000,
    verified: true,
    helpfulCount: 19,
    userVoted: false
  },
  {
    id: 'rev-5',
    productId: 'p2',
    productName: 'Acoustic Pulse ANC Headset',
    author: 'Liam O\'Connor',
    role: 'Audio Programmer',
    rating: 4,
    headline: 'Superb spatial imaging, companion app could be snappier',
    comment: 'Low-latency lossless 2.4GHz wireless is rock solid across my entire apartment with zero audible dropouts. The beryllium drivers deliver crisp highs and accurate mids. Companion Linux config tool took a moment to setup, but overall hardware quality is exceptional.',
    date: '2 weeks ago',
    timestamp: Date.now() - 14 * 86400000,
    verified: true,
    helpfulCount: 15,
    userVoted: false
  },
  {
    id: 'rev-6',
    productId: 'p3',
    productName: 'Horizon 32" Curved OLED',
    author: 'Aria Thorne',
    role: 'Creative Technologist',
    rating: 5,
    headline: 'The 1800R panoramic curve wraps your peripheral vision perfectly',
    comment: 'The subtle curve prevents neck strain when viewing multiple tiled terminal windows side-by-side. The anti-reflective coating handles glare even in a bright daylight studio.',
    date: '2 weeks ago',
    timestamp: Date.now() - 15 * 86400000,
    verified: true,
    helpfulCount: 12,
    userVoted: false
  },
  {
    id: 'rev-7',
    productId: 'p1',
    productName: 'CyberDeck Pro Mechanical',
    author: 'Kaelen Brody',
    role: 'Hardware Hobbyist',
    rating: 4,
    headline: 'Solid CNC chassis, hot-swap sockets are premium quality',
    comment: 'Tested with both Holy Panda X and Boba U4T switches. The south-facing sockets fit Kailh hot-swap tight with zero pin bending. Battery life holds up to the 200-hour claim with RGB brightness turned to 40%.',
    date: '3 weeks ago',
    timestamp: Date.now() - 21 * 86400000,
    verified: true,
    helpfulCount: 11,
    userVoted: false
  },
  {
    id: 'rev-8',
    productId: 'p2',
    productName: 'Acoustic Pulse ANC Headset',
    author: 'Samantha Reed',
    role: 'DevOps Engineer',
    rating: 4,
    headline: 'Great battery longevity and seamless multi-device Bluetooth',
    comment: 'Switching seamlessly between my work ThinkPad and mobile phone is instant. 55-hour battery life means I only charge it every two weeks.',
    date: '3 weeks ago',
    timestamp: Date.now() - 23 * 86400000,
    verified: true,
    helpfulCount: 8,
    userVoted: false
  },
  {
    id: 'rev-9',
    productId: 'p1',
    productName: 'CyberDeck Pro Mechanical',
    author: 'Vikram Joshi',
    role: 'Mechanical CAD Designer',
    rating: 3,
    headline: 'Steep learning curve for split ortho, but excellent hardware',
    comment: 'The build quality is undisputed. However, if you are moving from a standard 75% stagger layout, expect a 10-day adaptation period for muscle memory. An included wrist rest would have completed the package.',
    date: '1 month ago',
    timestamp: Date.now() - 30 * 86400000,
    verified: false,
    helpfulCount: 7,
    userVoted: false
  },
  {
    id: 'rev-10',
    productId: 'p3',
    productName: 'Horizon 32" Curved OLED',
    author: 'Tyler Hayes',
    role: 'Game Developer',
    rating: 4,
    headline: 'Incredible HDR brightness and color calibration',
    comment: 'HDR highlight peaks are intense and immersive. Desk stand is heavy-duty solid steel, though I opted for the gas-spring arm to reclaim desk real estate.',
    date: '1 month ago',
    timestamp: Date.now() - 32 * 86400000,
    verified: true,
    helpfulCount: 6,
    userVoted: false
  }
];

const reviewsState = {
  reviews: [...INITIAL_REVIEWS],
  selectedProduct: 'all',
  selectedStar: 'all',
  verifiedOnly: false,
  searchTerm: '',
  sortBy: 'recent',
  pickerRating: 5
};

function escapeReviewHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return 'N';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function renderStarString(rating) {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return 'â˜…'.repeat(full) + 'â˜†'.repeat(5 - full);
}

function calculateAnalytics(reviewsList) {
  const total = reviewsList.length;
  if (total === 0) {
    return {
      total: 0,
      average: 0,
      counts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      percentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recommendPct: 0
    };
  }

  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sum = 0;
  let recommendCount = 0;

  reviewsList.forEach((r) => {
    sum += r.rating;
    if (counts[r.rating] !== undefined) {
      counts[r.rating] += 1;
    }
    if (r.rating >= 4) {
      recommendCount += 1;
    }
  });

  const average = Number((sum / total).toFixed(1));
  const percentages = {
    5: Math.round((counts[5] / total) * 100),
    4: Math.round((counts[4] / total) * 100),
    3: Math.round((counts[3] / total) * 100),
    2: Math.round((counts[2] / total) * 100),
    1: Math.round((counts[1] / total) * 100)
  };
  const recommendPct = Math.round((recommendCount / total) * 100);

  return { total, average, counts, percentages, recommendPct };
}

function updateAnalyticsCard() {
  const baseList = reviewsState.selectedProduct === 'all'
    ? reviewsState.reviews
    : reviewsState.reviews.filter((r) => r.productId === reviewsState.selectedProduct);

  const analytics = calculateAnalytics(baseList);

  const scoreEl = document.getElementById('overallScoreNumber');
  if (scoreEl) scoreEl.textContent = analytics.average.toFixed(1);

  const starsEl = document.getElementById('overallStars');
  if (starsEl) {
    starsEl.textContent = renderStarString(analytics.average);
    starsEl.setAttribute('aria-label', `${analytics.average} out of 5 stars`);
  }

  const countLabelEl = document.getElementById('overallCountLabel');
  if (countLabelEl) {
    const prodName = reviewsState.selectedProduct === 'all'
      ? 'store items'
      : (PRODUCT_CATALOG[reviewsState.selectedProduct] ? PRODUCT_CATALOG[reviewsState.selectedProduct].name : 'product');
    countLabelEl.textContent = `Based on ${analytics.total} verified reviews across ${prodName}`;
  }

  const recEl = document.getElementById('recommendPercent');
  if (recEl) recEl.textContent = `${analytics.recommendPct}%`;

  // Render breakdown distribution rows (5 down to 1)
  const breakdownContainer = document.getElementById('breakdownRows');
  if (breakdownContainer) {
    breakdownContainer.innerHTML = '';
    [5, 4, 3, 2, 1].forEach((star) => {
      const cnt = analytics.counts[star] || 0;
      const pct = analytics.percentages[star] || 0;
      const isActive = reviewsState.selectedStar === star;

      const row = document.createElement('div');
      row.className = `breakdown-row ${isActive ? 'active' : ''}`;
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.setAttribute('aria-label', `Filter by ${star} star reviews, currently ${cnt} reviews (${pct}%)`);
      row.innerHTML = `
        <span class="breakdown-star-label">${star} <span class="star-icon">â˜…</span></span>
        <div class="breakdown-track">
          <div class="breakdown-fill" style="width: ${pct}%"></div>
        </div>
        <span class="breakdown-count">${cnt}</span>
        <span class="breakdown-percent">${pct}%</span>
      `;
      row.addEventListener('click', () => {
        if (reviewsState.selectedStar === star) {
          setStarFilter('all');
        } else {
          setStarFilter(star);
        }
      });
      breakdownContainer.appendChild(row);
    });
  }

  // Update count labels on filter buttons
  const countAll = document.getElementById('countStarAll');
  if (countAll) countAll.textContent = analytics.total;
  [5, 4, 3, 2, 1].forEach((star) => {
    const el = document.getElementById(`countStar${star}`);
    if (el) el.textContent = analytics.counts[star] || 0;
  });
}

function renderReviewsFeed() {
  let list = [...reviewsState.reviews];

  // 1. Filter by product
  if (reviewsState.selectedProduct !== 'all') {
    list = list.filter((r) => r.productId === reviewsState.selectedProduct);
  }

  // 2. Filter by star rating
  if (reviewsState.selectedStar !== 'all') {
    list = list.filter((r) => r.rating === reviewsState.selectedStar);
  }

  // 3. Filter by verified only
  if (reviewsState.verifiedOnly) {
    list = list.filter((r) => r.verified === true);
  }

  // 4. Search query
  if (reviewsState.searchTerm.trim() !== '') {
    const query = reviewsState.searchTerm.toLowerCase().trim();
    list = list.filter((r) =>
      r.headline.toLowerCase().includes(query) ||
      r.comment.toLowerCase().includes(query) ||
      r.author.toLowerCase().includes(query) ||
      r.productName.toLowerCase().includes(query)
    );
  }

  // 5. Sort list
  list.sort((a, b) => {
    if (reviewsState.sortBy === 'highest') {
      return b.rating - a.rating || b.timestamp - a.timestamp;
    }
    if (reviewsState.sortBy === 'lowest') {
      return a.rating - b.rating || b.timestamp - a.timestamp;
    }
    if (reviewsState.sortBy === 'helpful') {
      return b.helpfulCount - a.helpfulCount || b.timestamp - a.timestamp;
    }
    return b.timestamp - a.timestamp; // default: recent
  });

  // Update active filter banner
  const banner = document.getElementById('activeFilterBanner');
  const bannerText = document.getElementById('filterBannerText');
  const isFiltered = reviewsState.selectedProduct !== 'all' ||
    reviewsState.selectedStar !== 'all' ||
    reviewsState.verifiedOnly ||
    reviewsState.searchTerm.trim() !== '';

  if (banner && bannerText) {
    if (isFiltered) {
      const filtersDesc = [];
      if (reviewsState.selectedProduct !== 'all') {
        const pName = PRODUCT_CATALOG[reviewsState.selectedProduct] ? PRODUCT_CATALOG[reviewsState.selectedProduct].name : 'Product';
        filtersDesc.push(`Gear: ${pName}`);
      }
      if (reviewsState.selectedStar !== 'all') {
        filtersDesc.push(`${reviewsState.selectedStar}-Star reviews`);
      }
      if (reviewsState.verifiedOnly) {
        filtersDesc.push('Verified Buyers');
      }
      if (reviewsState.searchTerm.trim() !== '') {
        filtersDesc.push(`Keyword "${reviewsState.searchTerm}"`);
      }
      bannerText.textContent = `Filtering by: ${filtersDesc.join(' Â· ')} (${list.length} results)`;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  // Render cards
  const feed = document.getElementById('reviewsFeed');
  if (!feed) return;

  if (list.length === 0) {
    feed.innerHTML = `
      <div class="empty-reviews-state">
        <h4>No matching reviews found</h4>
        <p>Try clearing filters or search keywords to view all customer telemetry.</p>
        <button type="button" class="clear-filter-btn" style="margin-top: 12px; font-weight: 600;" onclick="clearAllFilters()">Reset All Filters</button>
      </div>
    `;
    return;
  }

  feed.innerHTML = list
    .map((rev) => {
      const safeAuthor = escapeReviewHtml(rev.author);
      const safeRole = escapeReviewHtml(rev.role);
      const safeHeadline = escapeReviewHtml(rev.headline);
      const safeComment = escapeReviewHtml(rev.comment);
      const safeProduct = escapeReviewHtml(rev.productName);
      const initials = getInitials(rev.author);
      const starString = renderStarString(rev.rating);

      return `
        <article class="review-card" data-id="${rev.id}">
          <header class="review-card-header">
            <div class="reviewer-info">
              <div class="reviewer-avatar" aria-hidden="true">${initials}</div>
              <div class="reviewer-meta">
                <div class="reviewer-name-row">
                  <span class="reviewer-name">${safeAuthor}</span>
                  ${rev.verified ? '<span class="verified-badge"><span aria-hidden="true">âœ“</span> Verified Buyer</span>' : ''}
                </div>
                ${safeRole ? `<span class="reviewer-role">${safeRole}</span>` : ''}
              </div>
            </div>
            <div class="review-meta-right">
              <span class="review-product-tag">${safeProduct}</span>
              <time class="review-date">${rev.date}</time>
            </div>
          </header>
          <div class="review-rating-stars" aria-label="${rev.rating} out of 5 stars">${starString}</div>
          <h4 class="review-headline">${safeHeadline}</h4>
          <p class="review-comment">${safeComment}</p>
          <footer class="review-card-footer">
            <span>Was this telemetry helpful to you?</span>
            <button type="button" class="helpful-btn ${rev.userVoted ? 'voted' : ''}" onclick="voteReviewHelpful('${rev.id}')" aria-label="Mark review as helpful, currently ${rev.helpfulCount}">
              <span>ðŸ‘ Helpful</span>
              <span class="helpful-count">(${rev.helpfulCount})</span>
            </button>
          </footer>
        </article>
      `;
    })
    .join('');
}

function handleProductFilterChange(productId) {
  reviewsState.selectedProduct = productId;
  updateAnalyticsCard();
  renderReviewsFeed();
}

function filterReviewsForProduct(productId) {
  reviewsState.selectedProduct = productId;
  const selectEl = document.getElementById('reviewProductSelect');
  if (selectEl) selectEl.value = productId;

  updateAnalyticsCard();
  renderReviewsFeed();

  const section = document.getElementById('reviewsSection');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setStarFilter(star) {
  reviewsState.selectedStar = star;
  const buttons = document.querySelectorAll('.star-filter-btn');
  buttons.forEach((btn) => {
    const btnStar = btn.getAttribute('data-star');
    const isAct = (star === 'all' && btnStar === 'all') || (String(star) === btnStar);
    btn.classList.toggle('active', isAct);
  });

  updateAnalyticsCard();
  renderReviewsFeed();
}

function toggleVerifiedOnly(checked) {
  reviewsState.verifiedOnly = Boolean(checked);
  renderReviewsFeed();
}

function handleReviewSearch(query) {
  reviewsState.searchTerm = query || '';
  renderReviewsFeed();
}

function setReviewSort(sortVal) {
  reviewsState.sortBy = sortVal;
  renderReviewsFeed();
}

function clearAllFilters() {
  reviewsState.selectedProduct = 'all';
  reviewsState.selectedStar = 'all';
  reviewsState.verifiedOnly = false;
  reviewsState.searchTerm = '';

  const prodSelect = document.getElementById('reviewProductSelect');
  if (prodSelect) prodSelect.value = 'all';

  const check = document.getElementById('verifiedOnlyCheckbox');
  if (check) check.checked = false;

  const searchInp = document.getElementById('reviewSearchInput');
  if (searchInp) searchInp.value = '';

  const buttons = document.querySelectorAll('.star-filter-btn');
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-star') === 'all');
  });

  updateAnalyticsCard();
  renderReviewsFeed();
}

function voteReviewHelpful(reviewId) {
  const rev = reviewsState.reviews.find((r) => r.id === reviewId);
  if (!rev) return;

  if (rev.userVoted) {
    rev.helpfulCount -= 1;
    rev.userVoted = false;
    showToast('Removed helpful vote.');
  } else {
    rev.helpfulCount += 1;
    rev.userVoted = true;
    showToast('Marked as helpful feedback!');
  }

  renderReviewsFeed();
}

/* Modal Form Logic */
function openWriteReviewModal() {
  const modal = document.getElementById('writeReviewModal');
  const backdrop = document.getElementById('writeReviewBackdrop');
  if (modal && backdrop) {
    // If a product is currently selected in reviews section, default form to it
    const formProductSelect = document.getElementById('formProductSelect');
    if (formProductSelect && reviewsState.selectedProduct !== 'all') {
      formProductSelect.value = reviewsState.selectedProduct;
    }
    setPickerRating(5);
    modal.hidden = false;
    modal.classList.add('open');
    backdrop.classList.add('open');
    const firstInp = document.getElementById('reviewerName');
    if (firstInp) firstInp.focus();
  }
}

function closeWriteReviewModal() {
  const modal = document.getElementById('writeReviewModal');
  const backdrop = document.getElementById('writeReviewBackdrop');
  if (modal && backdrop) {
    modal.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(() => {
      modal.hidden = true;
    }, 250);
  }
}

const RATING_DESCRIPTIONS = {
  1: '1 / 5 â€” Poor (Needs Improvement)',
  2: '2 / 5 â€” Fair (Below Expectation)',
  3: '3 / 5 â€” Average (Adequate)',
  4: '4 / 5 â€” Very Good (Recommended)',
  5: '5 / 5 â€” Exceptional (Highly Recommended)'
};

function setPickerRating(val) {
  reviewsState.pickerRating = val;
  const btns = document.querySelectorAll('.star-pick-btn');
  btns.forEach((btn) => {
    const starVal = Number(btn.getAttribute('data-val'));
    btn.classList.toggle('active', starVal <= val);
  });
  const label = document.getElementById('pickerRatingLabel');
  if (label) label.textContent = RATING_DESCRIPTIONS[val] || `${val} / 5`;
}

function handleReviewSubmit(e) {
  e.preventDefault();

  const prodId = document.getElementById('formProductSelect').value;
  const name = document.getElementById('reviewerName').value.trim();
  const role = document.getElementById('reviewerRole').value.trim();
  const headline = document.getElementById('reviewHeadline').value.trim();
  const comment = document.getElementById('reviewComment').value.trim();
  const verified = document.getElementById('formVerifiedCheck').checked;

  if (!name || !headline || !comment) {
    showToast('Please fill in all required review fields.');
    return;
  }

  const pCatalog = PRODUCT_CATALOG[prodId];
  const prodName = pCatalog ? pCatalog.name : 'Developer Gear';

  const newRev = {
    id: `rev-${Date.now()}`,
    productId: prodId,
    productName: prodName,
    author: name,
    role: role || 'Verified Customer',
    rating: reviewsState.pickerRating,
    headline,
    comment,
    date: 'Just now',
    timestamp: Date.now(),
    verified,
    helpfulCount: 0,
    userVoted: false
  };

  reviewsState.reviews.unshift(newRev);

  // Reset form
  const form = document.getElementById('writeReviewForm');
  if (form) form.reset();

  closeWriteReviewModal();
  updateAnalyticsCard();
  renderReviewsFeed();
  showToast('Thank you! Your verified review has been published.');
}

// Escape key listener for write review modal
document.addEventListener('keydown', (event) => {
  const modal = document.getElementById('writeReviewModal');
  if (event.key === 'Escape' && modal && !modal.hidden) {
    closeWriteReviewModal();
  }
});

// Initialize reviews analytics and feed on load
updateAnalyticsCard();
renderReviewsFeed();
/* ===== END issue #189 ===== */


// Global window bindings for inline HTML event handlers
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.checkout = checkout;
window.openQuickView = openQuickView;
window.adjustQuickViewQty = adjustQuickViewQty;
window.addQuickViewToCart = addQuickViewToCart;
window.openCartFromQuickView = openCartFromQuickView;
window.handleProductFilterChange = handleProductFilterChange;
window.filterReviewsForProduct = filterReviewsForProduct;
window.setStarFilter = setStarFilter;
window.toggleVerifiedOnly = toggleVerifiedOnly;
window.handleReviewSearch = handleReviewSearch;
window.setReviewSort = setReviewSort;
window.clearAllFilters = clearAllFilters;
window.voteReviewHelpful = voteReviewHelpful;
window.openWriteReviewModal = openWriteReviewModal;
window.closeWriteReviewModal = closeWriteReviewModal;
window.setPickerRating = setPickerRating;
window.handleReviewSubmit = handleReviewSubmit;

/* ===== BEGIN issue #188: Wishlist / Favorites Drawer ===== */
// Hearts on the product cards save product ids to localStorage. The drawer
// and the badge read their data from the product cards, so there is no
// second copy of names or prices to keep in sync.
(function initWishlist() {
  const WISH_KEY = 'nexusStoreWishlist';
  const navBtn = document.getElementById('wishNavBtn');
  const drawer = document.getElementById('wishDrawer');
  const backdrop = document.getElementById('wishBackdrop');
  const closeBtn = document.getElementById('wishClose');
  const listEl = document.getElementById('wishList');
  const emptyEl = document.getElementById('wishEmpty');
  const footerEl = document.getElementById('wishFooter');
  const countEl = document.getElementById('wishCount');
  const titleCountEl = document.getElementById('wishTitleCount');
  const statusEl = document.getElementById('wishStatus');
  if (!navBtn || !drawer || !backdrop || !listEl) return;

  const cards = Array.from(document.querySelectorAll('.products-grid .card[data-id]'));
  const knownIds = cards.map((card) => card.dataset.id);
  let saved = loadWishlist();
  let lastFocus = null;

  // Only ids that match a real product survive, so a hand-edited or old
  // localStorage value can not break the page.
  function loadWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WISH_KEY));
      if (!Array.isArray(raw)) return [];
      const clean = [];
      raw.forEach((id) => {
        if (typeof id === 'string' && knownIds.includes(id) && !clean.includes(id)) clean.push(id);
      });
      return clean;
    } catch {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(saved));
    } catch {
      // storage can be blocked (private mode), the wishlist then lasts for this visit only
    }
  }

  function productInfo(id) {
    const card = document.querySelector(`.products-grid .card[data-id="${id}"]`);
    if (!card) return null;
    const stock = card.querySelector('.stock-badge');
    const priceText = card.querySelector('.price').textContent.trim();
    return {
      id,
      name: card.querySelector('h3').textContent.trim(),
      price: priceText,
      amount: parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0,
      icon: card.querySelector('.card-img').textContent.trim(),
      stockText: stock ? stock.textContent.trim() : '',
      stockClass: stock ? stock.className : 'stock-badge'
    };
  }

  // The card's own Add to Cart button turns into quantity controls once the
  // item is in the cart, so call addToCart() directly. renderCart() uses the
  // product names without the inch mark, so strip it here to keep one cart line.
  function addToCartFromWishlist(info) {
    const basePrice = (typeof PRODUCT_CATALOG !== 'undefined' && PRODUCT_CATALOG[info.id]) ? PRODUCT_CATALOG[info.id].price : info.amount;
    addToCart(info.id, info.name.replace(/"/g, ''), basePrice, info.icon);
  }

  function announce(message) {
    if (!statusEl) return;
    statusEl.textContent = '';
    // a short delay makes screen readers re-read the same message
    setTimeout(() => { statusEl.textContent = message; }, 30);
  }

  function itemWord(n) {
    return n === 1 ? '1 item' : `${n} items`;
  }

  function renderItem(info) {
    const li = document.createElement('li');
    li.className = 'wish-item';
    li.dataset.id = info.id;

    const icon = document.createElement('span');
    icon.className = 'wish-item-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = info.icon;

    const body = document.createElement('div');
    body.className = 'wish-item-info';
    const name = document.createElement('h3');
    name.textContent = info.name;
    const price = document.createElement('span');
    price.className = 'wish-item-price';
    const basePrice = (typeof PRODUCT_CATALOG !== 'undefined' && PRODUCT_CATALOG[info.id]) ? PRODUCT_CATALOG[info.id].price : info.amount;
    price.textContent = formatMoney(basePrice);
    const stock = document.createElement('span');
    stock.className = info.stockClass;
    stock.textContent = info.stockText;
    body.append(name, price, stock);

    const actions = document.createElement('div');
    actions.className = 'wish-item-actions';
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'wish-add';
    add.dataset.id = info.id;
    add.textContent = 'Add to Cart';
    add.setAttribute('aria-label', `Add ${info.name} to cart`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'wish-remove';
    remove.dataset.id = info.id;
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${info.name} from wishlist`);
    actions.append(add, remove);

    li.append(icon, body, actions);
    return li;
  }

  function render() {
    const n = saved.length;

    document.querySelectorAll('.wish-btn').forEach((btn) => {
      const on = saved.includes(btn.dataset.wish);
      btn.classList.toggle('is-saved', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    countEl.textContent = String(n);
    countEl.classList.toggle('has-items', n > 0);
    navBtn.setAttribute('aria-label', `Wishlist, ${itemWord(n)}`);
    titleCountEl.textContent = `(${n})`;

    listEl.replaceChildren();
    // newest first
    saved.slice().reverse().forEach((id) => {
      const info = productInfo(id);
      if (info) listEl.appendChild(renderItem(info));
    });
    emptyEl.hidden = n > 0;
    listEl.hidden = n === 0;
    footerEl.hidden = n === 0;
  }

  function bumpBadge() {
    countEl.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.classList.add('bump');
  }

  function toggleSaved(id) {
    const info = productInfo(id);
    if (!info) return;
    const was = saved.includes(id);
    saved = was ? saved.filter((x) => x !== id) : saved.concat(id);
    persist();
    render();
    bumpBadge();
    const msg = was ? `Removed ${info.name} from wishlist.` : `Saved ${info.name} to wishlist.`;
    showToast(msg);
    announce(`${msg} ${itemWord(saved.length)} in your wishlist.`);
  }

  function removeFromDrawer(id) {
    const info = productInfo(id);
    const items = Array.from(listEl.querySelectorAll('.wish-item'));
    const idx = items.findIndex((li) => li.dataset.id === id);
    saved = saved.filter((x) => x !== id);
    persist();
    render();
    bumpBadge();
    if (info) announce(`Removed ${info.name} from wishlist. ${itemWord(saved.length)} left.`);
    // keep keyboard focus inside the drawer
    const remaining = listEl.querySelectorAll('.wish-remove');
    if (remaining.length) remaining[Math.min(idx, remaining.length - 1)].focus();
    else document.getElementById('wishBrowse').focus();
  }

  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    navBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }

  function closeDrawer(restoreFocus) {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    navBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (restoreFocus) {
      const target = lastFocus && document.contains(lastFocus) ? lastFocus : navBtn;
      target.focus();
    }
  }

  // Delegated click for the hearts on the product cards
  document.addEventListener('click', (event) => {
    const heart = event.target.closest('.wish-btn');
    if (heart) toggleSaved(heart.dataset.wish);
  });

  navBtn.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', () => closeDrawer(true));
  backdrop.addEventListener('click', () => closeDrawer(false));

  listEl.addEventListener('click', (event) => {
    const remove = event.target.closest('.wish-remove');
    if (remove) {
      removeFromDrawer(remove.dataset.id);
      return;
    }
    const add = event.target.closest('.wish-add');
    if (add) {
      const info = productInfo(add.dataset.id);
      if (info) addToCartFromWishlist(info);
    }
  });

  document.getElementById('wishAddAll').addEventListener('click', () => {
    let added = 0;
    saved.forEach((id) => {
      const info = productInfo(id);
      if (info) {
        addToCartFromWishlist(info);
        added += 1;
      }
    });
    if (added) {
      showToast(`Added ${itemWord(added)} from your wishlist to cart.`);
      announce(`Added ${itemWord(added)} to cart.`);
    }
  });

  document.getElementById('wishClear').addEventListener('click', () => {
    saved = [];
    persist();
    render();
    bumpBadge();
    announce('Wishlist cleared.');
    document.getElementById('wishBrowse').focus();
  });

  document.getElementById('wishBrowse').addEventListener('click', () => {
    closeDrawer(false);
    const first = document.querySelector('.wish-btn');
    const grid = document.getElementById('productsGrid');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (grid) grid.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    if (first) first.focus({ preventScroll: true });
  });

  // Escape closes, Tab stays inside the open drawer
  document.addEventListener('keydown', (event) => {
    if (!drawer.classList.contains('open')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeDrawer(true);
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('button:not([disabled])')).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Another tab changed the list
  window.addEventListener('storage', (event) => {
    if (event.key === WISH_KEY) {
      saved = loadWishlist();
      render();
    }
  });

  window.addEventListener('currencychange', () => {
    render();
  });

  render();
})();
/* ===== END issue #188 ===== */

/* ===== BEGIN Issue #283 & #433: Multi-Product Specification Comparison Matrix Drawer ===== */
(function () {
  'use strict';

  const PRODUCT_SPECS = {
    p1: {
      id: 'p1',
      name: 'CyberDeck Pro Mechanical',
      img: 'âŒ¨ï¸',
      price: 249.00,
      rating: 4.9,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$249.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.9 / 5.0 (72 reviews)',
        'Processor / Core': 'ARM Cortex-M4F 120MHz (QMK/VIA)',
        'Battery Life': '140 Hours (RGB Off) / 45 Hours (RGB On)',
        'Connectivity': 'Tri-Mode: 2.4GHz + Bluetooth 5.3 + USB-C',
        'Weight': '780g (Aircraft-grade Aluminum)',
        'Warranty': '2 Years Full Hardware Replacement'
      }
    },
    p2: {
      id: 'p2',
      name: 'Acoustic Pulse ANC Headset',
      img: 'ðŸŽ§',
      price: 199.00,
      rating: 4.8,
      inStock: true,
      availability: 'Only 3 Left',
      specs: {
        'Pricing': '$199.00',
        'Availability': 'Only 3 Left',
        'User Rating': 'â˜… 4.8 / 5.0 (46 reviews)',
        'Processor / Core': 'Dual-Core 32-bit DSP + ANC Neural Engine',
        'Battery Life': '60 Hours (ANC On) / 100 Hours (ANC Off)',
        'Connectivity': 'Wireless 2.4GHz + Bluetooth 5.3 + 3.5mm',
        'Weight': '245g (Memory Foam & Titanium)',
        'Warranty': '1 Year Global Manufacturer Coverage'
      }
    },
    p3: {
      id: 'p3',
      name: 'Horizon 32" Curved OLED',
      img: 'ðŸ–¥ï¸',
      price: 899.00,
      rating: 4.9,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$899.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.9 / 5.0 (30 reviews)',
        'Processor / Core': 'Quantum QD Neo Display Engine (240Hz)',
        'Battery Life': 'AC Powered (120W PSU, 0.5W Standby)',
        'Connectivity': '2x HDMI 2.1 + 1x DP 2.1 + USB-C PD 90W',
        'Weight': '6.8kg (Ergonomic Heavy-Duty Stand)',
        'Warranty': '3 Years Burn-In & Panel Protection'
      }
    },
    p4: {
      id: 'p4',
      name: 'Nexus Neo 65% Low-Profile',
      img: 'âŒ¨ï¸',
      price: 149.00,
      rating: 4.7,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$149.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.7 / 5.0 (54 reviews)',
        'Processor / Core': 'Nordic nRF52840 Ultra-Low-Power SoC',
        'Battery Life': '120 Hours Continuous Wireless',
        'Connectivity': 'Bluetooth 5.3 + USB-C Wired',
        'Weight': '520g (CNC Anodized Aluminum)',
        'Warranty': '2 Years Hardware Coverage'
      }
    },
    p5: {
      id: 'p5',
      name: 'Vortex Reference Studio Monitors',
      img: 'ðŸ”Š',
      price: 349.00,
      rating: 4.6,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$349.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.6 / 5.0 (28 reviews)',
        'Processor / Core': 'Dual Class-D Bi-Amp + Room Correction DSP',
        'Battery Life': 'AC Studio Mains (2x 90W RMS)',
        'Connectivity': 'Balanced TRS + RCA + Optical S/PDIF',
        'Weight': '4.9kg per pair (Damped MDF Enclosure)',
        'Warranty': '2 Years Studio Monitor Warranty'
      }
    },
    p6: {
      id: 'p6',
      name: 'Apex UltraWide 49" 240Hz',
      img: 'ðŸ–¥ï¸',
      price: 1199.00,
      rating: 4.9,
      inStock: false,
      availability: 'Backorder',
      specs: {
        'Pricing': '$1,199.00',
        'Availability': 'Backorder',
        'User Rating': 'â˜… 4.9 / 5.0 (19 reviews)',
        'Processor / Core': 'Dual-Engine 5120x1440 240Hz KVM Controller',
        'Battery Life': 'AC Powered (Internal 240W PSU, USB-C PD)',
        'Connectivity': 'USB-C 96W + Dual HDMI 2.1 + DP 2.1 + KVM',
        'Weight': '11.4kg (1000R Curved Alloy Frame)',
        'Warranty': '3 Years Zero-Bright-Dot & Burn-In'
      }
    },
    p7: {
      id: 'p7',
      name: 'HyperStream Studio Mic & Arm',
      img: 'ðŸŽ™ï¸',
      price: 179.00,
      rating: 4.5,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$179.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.5 / 5.0 (39 reviews)',
        'Processor / Core': '24-Bit / 192kHz Broadcast ADC + FET Preamp',
        'Battery Life': 'USB-C Bus Powered (Zero Battery Required)',
        'Connectivity': 'USB-C + 3.5mm Zero-Latency Monitor Out',
        'Weight': '1.35kg (Capsule + Articulated Boom Arm)',
        'Warranty': '2 Years Studio Replacement'
      }
    },
    p8: {
      id: 'p8',
      name: 'Keychronix Ergo Alice Custom',
      img: 'âŒ¨ï¸',
      price: 289.00,
      rating: 4.8,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$289.00',
        'Availability': 'In Stock',
        'User Rating': 'â˜… 4.8 / 5.0 (33 reviews)',
        'Processor / Core': 'STM32F402 + Gasket Poron Acoustic Matrix',
        'Battery Life': '180 Hours (4,000mAh Li-Po)',
        'Connectivity': 'Tri-Mode: 2.4GHz + BT 5.3 + USB-C',
        'Weight': '1.42kg (Brass Counterweight Chassis)',
        'Warranty': '2 Years Enthusiast Hardware Support'
      }
    }
  };

  const SPEC_KEYS = [
    'Pricing',
    'Availability',
    'User Rating',
    'Processor / Core',
    'Battery Life',
    'Connectivity',
    'Weight',
    'Warranty'
  ];

  // In-memory comparisonList array (max 3 items)
  const comparisonList = [];
  window.comparisonList = comparisonList;

  function initComparisonMatrix() {
    const compareBar = document.getElementById('compareBar');
    const compareCount = document.getElementById('compareCount');
    const compareBarThumbs = document.getElementById('compareBarThumbs');
    const compareClearBtn = document.getElementById('compareClearBtn');
    const compareOpenBtn = document.getElementById('compareOpenBtn');
    const compareFooterHint = document.getElementById('compareFooterHint');

    const compareBackdrop = document.getElementById('compareBackdrop');
    const compareDrawer = document.getElementById('compareDrawer');
    const compareCloseBtn = document.getElementById('compareCloseBtn');
    const compareCloseBottomBtn = document.getElementById('compareCloseBottomBtn');
    const compareDiffToggle = document.getElementById('compareDiffToggle');
    const compareOnlyDiffToggle = document.getElementById('compareOnlyDiffToggle');
    const compareTableWrapper = document.getElementById('compareTableWrapper');
    const compareAddAllBtn = document.getElementById('compareAddAllBtn');

    const checkboxes = document.querySelectorAll('.compare-checkbox');

    function addToComparison(id) {
      if (!PRODUCT_SPECS[id] || comparisonList.includes(id)) return false;
      if (comparisonList.length >= 3) return false;
      comparisonList.push(id);
      return true;
    }

    function removeFromComparison(id) {
      const idx = comparisonList.indexOf(id);
      if (idx !== -1) comparisonList.splice(idx, 1);
    }

    function updateCompareBar() {
      const count = comparisonList.length;
      if (compareCount) compareCount.textContent = count;
      if (compareFooterHint) compareFooterHint.textContent = `Comparing ${count} of 3 hardware slots`;

      if (!compareBar) return;

      if (count > 0) {
        compareBar.hidden = false;
        if (compareBarThumbs) {
          compareBarThumbs.innerHTML = comparisonList
            .map((id) => {
              const p = PRODUCT_SPECS[id];
              return `<span class="compare-thumb-pill" title="${p ? p.name : id}">${p ? p.img : 'ðŸ“¦'}</span>`;
            })
            .join('');
        }
      } else {
        compareBar.hidden = true;
      }
    }

    function renderMatrixTable() {
      if (!compareTableWrapper) return;

      if (comparisonList.length === 0) {
        compareTableWrapper.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <p style="font-size: 1.1rem; margin-bottom: 12px;">No products selected for comparison.</p>
            <p style="font-size: 0.85rem;">Check the "Compare" box on up to 3 catalog items to inspect pricing, availability, ratings, battery life, and specs side-by-side.</p>
          </div>
        `;
        return;
      }

      const products = comparisonList.map((id) => PRODUCT_SPECS[id]).filter(Boolean);
      const minPrice = Math.min(...products.map((p) => p.price));
      const maxRating = Math.max(...products.map((p) => p.rating));

      let html = `<table class="compare-matrix-table">`;
      html += `<thead><tr><th class="compare-spec-col">Feature / Specification</th>`;
      products.forEach((p) => {
        const isBestPrice = products.length > 1 && p.price === minPrice;
        const isTopRated = products.length > 1 && p.rating === maxRating;
        html += `
          <th class="compare-item-header">
            <div class="comp-prod-visual">${p.img}</div>
            <div class="comp-prod-name">${p.name}</div>
            <div class="comp-prod-badges">
              ${isBestPrice ? '<span class="comp-winner-pill best-price">Best Value</span>' : ''}
              ${isTopRated ? '<span class="comp-winner-pill top-rated">Top Rated</span>' : ''}
            </div>
            <div class="comp-prod-price">${formatMoney(p.price)}</div>
            <div class="comp-header-btns">
              <button type="button" class="btn-remove-comp" data-remove-id="${p.id}" aria-label="Remove ${p.name} from comparison">Remove &times;</button>
            </div>
          </th>
        `;
      });
      html += `</tr></thead><tbody>`;

      // Spec rows
      SPEC_KEYS.forEach((specKey) => {
        const values = products.map((p) => {
          if (specKey === 'Price') {
            return formatMoney(p.price);
          }
          return p.specs[specKey] || 'N/A';
        });
        const hasDiff = products.length > 1 && new Set(values).size > 1;
        const rowClass = hasDiff ? 'is-diff' : 'is-same';

        html += `<tr class="${rowClass}"><td class="compare-spec-col">${specKey}</td>`;
        values.forEach((val) => {
          if (specKey === 'Availability') {
            const cls = val === 'In Stock' ? 'in-stock' : 'low-stock';
            html += `<td><span class="comp-avail-chip ${cls}">${val}</span></td>`;
          } else {
            html += `<td>${val}</td>`;
          }
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      compareTableWrapper.innerHTML = html;

      compareTableWrapper.querySelectorAll('.btn-remove-comp').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-remove-id');
          removeFromComparison(id);
          const cb = document.querySelector(`.compare-checkbox[data-compare="${id}"]`);
          if (cb) cb.checked = false;
          updateCompareBar();
          renderMatrixTable();
          if (comparisonList.length === 0) {
            closeDrawer();
          }
        });
      });
    }

    function openDrawer() {
      if (!compareDrawer || !compareBackdrop) return;
      if (comparisonList.length === 0) {
        if (typeof showToast === 'function') {
          showToast('Select at least 1 product to compare!');
        }
        return;
      }
      renderMatrixTable();
      compareDrawer.classList.add('open');
      compareBackdrop.classList.add('open');
      if (compareDiffToggle && compareDiffToggle.checked) {
        compareDrawer.classList.add('show-diff');
      }
      if (compareOnlyDiffToggle && compareOnlyDiffToggle.checked) {
        compareDrawer.classList.add('only-diff');
      }
      compareDrawer.focus();
    }

    function closeDrawer() {
      if (!compareDrawer || !compareBackdrop) return;
      compareDrawer.classList.remove('open');
      compareBackdrop.classList.remove('open');
    }

    checkboxes.forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-compare');
        if (cb.checked) {
          if (!addToComparison(id)) {
            cb.checked = false;
            if (typeof showToast === 'function') {
              showToast('Maximum 3 items can be compared at once.');
            }
            return;
          }
        } else {
          removeFromComparison(id);
        }
        updateCompareBar();
        if (compareDrawer && compareDrawer.classList.contains('open')) {
          renderMatrixTable();
        }
      });
    });

    if (compareClearBtn) {
      compareClearBtn.addEventListener('click', () => {
        comparisonList.length = 0;
        checkboxes.forEach((cb) => { cb.checked = false; });
        updateCompareBar();
        closeDrawer();
      });
    }

    if (compareOpenBtn) compareOpenBtn.addEventListener('click', openDrawer);
    if (compareCloseBtn) compareCloseBtn.addEventListener('click', closeDrawer);
    if (compareCloseBottomBtn) compareCloseBottomBtn.addEventListener('click', closeDrawer);
    if (compareBackdrop) compareBackdrop.addEventListener('click', closeDrawer);

    if (compareDiffToggle && compareDrawer) {
      compareDrawer.classList.add('show-diff');
      compareDiffToggle.addEventListener('change', () => {
        compareDrawer.classList.toggle('show-diff', compareDiffToggle.checked);
      });
    }

    if (compareOnlyDiffToggle && compareDrawer) {
      compareOnlyDiffToggle.addEventListener('change', () => {
        compareDrawer.classList.toggle('only-diff', compareOnlyDiffToggle.checked);
      });
    }

    if (compareAddAllBtn) {
      compareAddAllBtn.addEventListener('click', () => {
        let addedCount = 0;
        comparisonList.forEach((id) => {
          const p = PRODUCT_SPECS[id];
          if (p && typeof addToCart === 'function') {
            addToCart(p.id, p.name, p.price, p.img);
            addedCount += 1;
          }
        });
        if (typeof showToast === 'function') {
          showToast(`Added ${addedCount} compared item(s) to cart!`);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && compareDrawer && compareDrawer.classList.contains('open')) {
        closeDrawer();
      }
    });

    // React to currency engine updates
    window.addEventListener('currencychange', () => {
      if (selectedCompare.size > 0 && compareDrawer && compareDrawer.classList.contains('open')) {
        renderMatrixTable();
      }
    });

    updateCompareBar();
  }

  document.addEventListener('DOMContentLoaded', initComparisonMatrix);
})();
/* ===== END Issue #283 & #433 ===== */


/* ===== BEGIN Issue #401: Product Stock Inventory Alert Notification Modal ===== */
(function initStockAlertModule() {
  const STORAGE_KEY = 'cyber_gear_stock_alerts';
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function getSavedAlerts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveAlerts(alerts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch {
      // storage quota or private browsing
    }
    updateBadge();
  }

  function updateBadge() {
    const alerts = getSavedAlerts();
    const badge = document.getElementById('stockAlertsBadge');
    if (badge) {
      if (alerts.length > 0) {
        badge.textContent = alerts.length;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
    const countBadge = document.getElementById('watchlistCountBadge');
    if (countBadge) {
      countBadge.textContent = `${alerts.length} Active`;
    }
  }

  function renderWatchlist() {
    const list = document.getElementById('watchlistItemsList');
    if (!list) return;
    const alerts = getSavedAlerts();

    list.replaceChildren();

    if (alerts.length === 0) {
      const emptyHint = document.createElement('div');
      emptyHint.className = 'watchlist-empty-hint';
      emptyHint.textContent = 'No active stock alerts. Subscribe to backordered items above!';
      list.appendChild(emptyHint);
      return;
    }

    alerts.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'watchlist-card';
      card.setAttribute('data-index', String(idx));

      const left = document.createElement('div');
      left.className = 'watchlist-card-left';

      const prodName = document.createElement('span');
      prodName.className = 'watchlist-prod-name';
      prodName.textContent = `${item.productName || 'Gear'} (${item.variant || 'Standard'})`;

      const variantEmail = document.createElement('span');
      variantEmail.className = 'watchlist-variant-email';
      variantEmail.textContent = `âœ‰ï¸ ${item.email || ''} â€¢ Added ${item.date || 'Recently'}`;

      left.appendChild(prodName);
      left.appendChild(variantEmail);

      const right = document.createElement('div');
      right.className = 'watchlist-card-right';

      const chip = document.createElement('span');
      chip.className = 'watchlist-status-chip';
      chip.textContent = 'Monitoring Restock';

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'watchlist-remove-btn';
      removeBtn.setAttribute('title', 'Cancel this alert');
      removeBtn.setAttribute('aria-label', `Cancel stock alert for ${item.productName || 'item'}`);
      removeBtn.textContent = 'âœ•';
      removeBtn.addEventListener('click', () => {
        removeAlert(idx);
      });

      right.appendChild(chip);
      right.appendChild(removeBtn);

      card.appendChild(left);
      card.appendChild(right);

      list.appendChild(card);
    });
  }

  function populateProductSelect(selectedId = 'p6') {
    const select = document.getElementById('stockAlertProductSelect');
    if (!select) return;
    select.replaceChildren();

    if (typeof PRODUCT_CATALOG !== 'undefined') {
      Object.keys(PRODUCT_CATALOG).forEach((id) => {
        const p = PRODUCT_CATALOG[id];
        const stockTag = p.inStock ? '(In Stock)' : '(Backorder / Sold Out)';
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${p.name} ${stockTag}`;
        if (id === selectedId) opt.selected = true;
        select.appendChild(opt);
      });
    } else {
      const items = [
        { id: 'p6', text: 'Apex UltraWide 49" 240Hz (Backorder / Sold Out)' },
        { id: 'p1', text: 'CyberDeck Pro Mechanical (In Stock)' },
        { id: 'p2', text: 'AeroPulse Wireless ANC (In Stock)' }
      ];
      items.forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.text;
        if (item.id === selectedId) opt.selected = true;
        select.appendChild(opt);
      });
    }
  }

  function populateVariants(productId) {
    const variantSelect = document.getElementById('stockAlertVariantSelect');
    const previewName = document.getElementById('alertProdName');
    const previewPrice = document.getElementById('alertProdPrice');
    const previewIcon = document.getElementById('alertProdIcon');
    if (!variantSelect) return;
    variantSelect.replaceChildren();

    let p = null;
    if (typeof PRODUCT_CATALOG !== 'undefined' && PRODUCT_CATALOG[productId]) {
      p = PRODUCT_CATALOG[productId];
    }

    if (p) {
      if (previewName) previewName.textContent = p.name;
      if (previewPrice) {
        previewPrice.textContent = `$${p.price.toFixed(2)} â€¢ ${p.inStock ? 'In Stock (Variants Available)' : 'Currently Backordered'}`;
      }
      if (previewIcon && p.thumbs && p.thumbs[0]) {
        previewIcon.textContent = p.thumbs[0].icon || 'ðŸ–¥ï¸';
      }

      let hasOptions = false;
      if (p.colors && p.colors.length > 0) {
        p.colors.forEach((c) => {
          const opt = document.createElement('option');
          opt.value = `Color: ${c.name}`;
          opt.textContent = `Color: ${c.name}`;
          variantSelect.appendChild(opt);
          hasOptions = true;
        });
      }
      if (p.options && p.options.length > 0) {
        p.options.forEach((o) => {
          const opt = document.createElement('option');
          opt.value = `Finish: ${o.name}`;
          opt.textContent = `Finish: ${o.name}`;
          variantSelect.appendChild(opt);
          hasOptions = true;
        });
      }
      if (!hasOptions) {
        const opt = document.createElement('option');
        opt.value = 'Standard Edition';
        opt.textContent = 'Standard Edition';
        variantSelect.appendChild(opt);
      }
    } else {
      if (previewName) previewName.textContent = 'Apex UltraWide 49" 240Hz';
      if (previewPrice) previewPrice.textContent = '$1,199.00 â€¢ Currently Backordered';
      if (previewIcon) previewIcon.textContent = 'ðŸ–¥ï¸';

      const opt1 = document.createElement('option');
      opt1.value = 'Cosmic Black (Heavy-Duty Arm)';
      opt1.textContent = 'Cosmic Black (Heavy-Duty Arm)';
      variantSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = 'Anodized Silver (Desk Clamp)';
      opt2.textContent = 'Anodized Silver (Desk Clamp)';
      variantSelect.appendChild(opt2);
    }
  }

  function validateEmail() {
    const input = document.getElementById('stockAlertEmail');
    const wrap = input ? input.closest('.input-with-icon-wrap') : null;
    const statusText = document.getElementById('emailValidationStatus');
    const errorHint = document.getElementById('stockAlertEmailError');
    const icon = document.getElementById('emailInputStateIcon');
    if (!input) return false;

    const val = input.value.trim();
    if (!val) {
      if (wrap) {
        wrap.classList.remove('is-valid', 'is-invalid');
      }
      if (statusText) {
        statusText.textContent = 'Format: user@domain.com';
        statusText.className = 'validation-status-text';
      }
      if (errorHint) errorHint.style.display = 'none';
      if (icon) icon.textContent = 'âœ‰ï¸';
      return false;
    }

    const isValid = EMAIL_REGEX.test(val);
    if (isValid) {
      if (wrap) {
        wrap.classList.add('is-valid');
        wrap.classList.remove('is-invalid');
      }
      if (statusText) {
        statusText.textContent = 'Valid Email Format âœ“';
        statusText.className = 'validation-status-text valid';
      }
      if (errorHint) errorHint.style.display = 'none';
      if (icon) icon.textContent = 'âœ…';
    } else {
      if (wrap) {
        wrap.classList.add('is-invalid');
        wrap.classList.remove('is-valid');
      }
      if (statusText) {
        statusText.textContent = 'Invalid Email Format âœ•';
        statusText.className = 'validation-status-text invalid';
      }
      if (errorHint) errorHint.style.display = 'block';
      if (icon) icon.textContent = 'âš ï¸';
    }
    return isValid;
  }

  function openModal(productId = 'p6') {
    populateProductSelect(productId);
    populateVariants(productId);

    const emailInput = document.getElementById('stockAlertEmail');
    if (emailInput && !emailInput.value) {
      try {
        const lastEmail = localStorage.getItem('cyber_gear_last_alert_email');
        if (lastEmail) emailInput.value = lastEmail;
      } catch {
        // ignore
      }
    }
    validateEmail();
    renderWatchlist();
    updateBadge();

    const backdrop = document.getElementById('stockAlertBackdrop');
    const modal = document.getElementById('stockAlertModal');
    if (backdrop && modal) {
      backdrop.classList.add('active');
      modal.removeAttribute('hidden');
      modal.classList.add('active');
      if (emailInput) emailInput.focus();
    }
  }

  function closeModal() {
    const backdrop = document.getElementById('stockAlertBackdrop');
    const modal = document.getElementById('stockAlertModal');
    if (backdrop && modal) {
      backdrop.classList.remove('active');
      modal.classList.remove('active');
      setTimeout(() => {
        if (!modal.classList.contains('active')) {
          modal.setAttribute('hidden', '');
        }
      }, 300);
    }
  }

  function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!validateEmail()) {
      const emailInput = document.getElementById('stockAlertEmail');
      if (emailInput) emailInput.focus();
      return;
    }

    const prodSelect = document.getElementById('stockAlertProductSelect');
    const variantSelect = document.getElementById('stockAlertVariantSelect');
    const emailInput = document.getElementById('stockAlertEmail');
    const priorityDrop = document.getElementById('prefPriorityDrop');

    const productId = prodSelect ? prodSelect.value : 'p6';
    let prodName = 'Hardware Gear';
    if (typeof PRODUCT_CATALOG !== 'undefined' && PRODUCT_CATALOG[productId]) {
      prodName = PRODUCT_CATALOG[productId].name;
    } else if (prodSelect && prodSelect.selectedOptions && prodSelect.selectedOptions[0]) {
      prodName = prodSelect.selectedOptions[0].text.split('(')[0].trim();
    }

    const variant = variantSelect ? variantSelect.value : 'Standard';
    const email = emailInput ? emailInput.value.trim() : '';
    const priority = priorityDrop ? priorityDrop.checked : true;

    const newAlert = {
      id: `alert_${Date.now()}`,
      productId: productId,
      productName: prodName,
      variant: variant,
      email: email,
      priority: priority,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    const alerts = getSavedAlerts();
    // Check if already subscribed to this product + variant + email
    const exists = alerts.some((a) => a.productId === productId && a.variant === variant && a.email.toLowerCase() === email.toLowerCase());

    if (!exists) {
      alerts.unshift(newAlert);
      saveAlerts(alerts);
    }

    try {
      localStorage.setItem('cyber_gear_last_alert_email', email);
    } catch {
      // ignore
    }

    renderWatchlist();
    updateBadge();

    const toastMsg = `ðŸ”” Restock alert subscribed for ${prodName} (${variant})! Dispatch set to ${email}.`;
    if (typeof showToast === 'function') {
      showToast(toastMsg);
    } else {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = toastMsg;
        toast.className = 'toast show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3500);
      }
    }

    // Close after short pause
    setTimeout(() => {
      closeModal();
    }, 700);
  }

  function removeAlert(index) {
    const alerts = getSavedAlerts();
    if (index >= 0 && index < alerts.length) {
      const removed = alerts.splice(index, 1)[0];
      saveAlerts(alerts);
      renderWatchlist();
      updateBadge();
      if (typeof showToast === 'function') {
        showToast(`Stock alert for ${removed.productName} removed.`);
      }
    }
  }

  // Bind global helpers
  window.openStockAlertModal = openModal;
  window.closeStockAlertModal = closeModal;
  window.handleStockAlertSubmit = handleSubmit;
  window.removeStockAlert = removeAlert;
  window.handleAlertProductChange = function(productId) {
    populateVariants(productId);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('stockAlertEmail');
    if (emailInput) {
      emailInput.addEventListener('input', validateEmail);
      emailInput.addEventListener('blur', validateEmail);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('stockAlertModal');
        if (modal && modal.classList.contains('active')) {
          closeModal();
        }
      }
    });

    updateBadge();
  });
})();
/* ===== END Issue #401: Product Stock Inventory Alert Notification Modal ===== */

/* ===== END Issue #283 ===== */

/* ===== BEGIN Issue #434: Canvas Invoice Generator & Promo Matrix Controller ===== */
function drawCanvasRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawReceiptBarcode(ctx, codeText, startX, startY, width, height) {
  const seed = String(codeText || 'NX-2026-4340');
  const bars = [];
  for (let i = 0; i < seed.length; i += 1) {
    const ch = seed.charCodeAt(i);
    bars.push(2, (ch % 3) + 1, ((ch >> 2) % 2) + 1, ((ch >> 4) % 3) + 1);
  }
  // Start and end guard bars
  const pattern = [2, 1, 2, 1, ...bars, 2, 1, 2];
  const totalUnits = pattern.reduce((a, b) => a + b, 0);
  const unitW = width / totalUnits;

  let cursorX = startX;
  pattern.forEach((units, idx) => {
    const barW = units * unitW;
    if (idx % 2 === 0) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cursorX, startY, Math.max(1, barW - 0.35), height);
    }
    cursorX += barW;
  });

  ctx.fillStyle = '#475569';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`* ${seed} · AUTH-CRC94 *`, startX + width / 2, startY + height + 16);
  ctx.textAlign = 'left';
}

function generateInvoiceReceipt(orderData, targetCanvas) {
  const canvas = targetCanvas || document.getElementById('invoiceReceiptCanvas') || document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const data = orderData || promoEngine.calculateOrderSummary([], null, { state: 'CA', zip: '94107' });
  const items = Array.isArray(data.items) ? data.items : [];
  const dpr = Math.max(window.devicePixelRatio || 1, 2);
  const logicalWidth = 460;
  const rowHeight = 36;
  const rowsCount = Math.max(1, items.length);
  const logicalHeight = Math.max(660, 465 + rowsCount * rowHeight);

  canvas.width = Math.round(logicalWidth * dpr);
  canvas.height = Math.round(logicalHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Crisp paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  // Top amber accent header bar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, logicalWidth, 82);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 78, logicalWidth, 4);

  // Brand + Invoice badge
  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 18px "Inter", sans-serif';
  ctx.fillText('⚡ NEXUS STORE', 24, 34);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillText('NEXT-GEN DEVELOPER HARDWARE · SF, CA', 24, 54);

  drawCanvasRoundRect(ctx, logicalWidth - 148, 22, 124, 28, 6);
  ctx.fillStyle = data.status === 'PAID RECEIPT' ? '#059669' : '#f59e0b';
  ctx.fill();
  ctx.fillStyle = data.status === 'PAID RECEIPT' ? '#ffffff' : '#0f172a';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(data.status || 'VERIFIED QUOTE', logicalWidth - 86, 40);
  ctx.textAlign = 'left';

  // Metadata strip
  let y = 106;
  ctx.fillStyle = '#475569';
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillText('INVOICE ID', 24, y);
  ctx.fillText('DATE ISSUED', 176, y);
  ctx.fillText('DESTINATION', 320, y);

  y += 16;
  const dateObj = data.issuedAt instanceof Date ? data.issuedAt : new Date();
  const formattedDate = dateObj.toISOString().slice(0, 10);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillText(String(data.invoiceId || 'NX-2026-4340'), 24, y);
  ctx.fillText(formattedDate, 176, y);
  ctx.fillText(`${data.address.state} ${data.address.zip || '94107'}`, 320, y);

  y += 22;
  ctx.fillStyle = '#475569';
  ctx.font = '500 11px "Inter", sans-serif';
  ctx.fillText(`Billed To: ${String(data.customerName || 'Alex Rivera · Nexus Labs').slice(0, 44)}`, 24, y);

  // Dashed separator
  y += 14;
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(logicalWidth - 24, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Table header
  y += 22;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(24, y - 14, logicalWidth - 48, 24);
  ctx.fillStyle = '#334155';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillText('ITEM & CATEGORY', 30, y + 2);
  ctx.textAlign = 'center';
  ctx.fillText('QTY', 278, y + 2);
  ctx.textAlign = 'right';
  ctx.fillText('UNIT', 352, y + 2);
  ctx.fillText('TOTAL', logicalWidth - 30, y + 2);
  ctx.textAlign = 'left';

  y += 26;
  if (items.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillText('No items in order. Add gear to generate receipt.', 30, y);
    y += rowHeight;
  } else {
    items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(24, y - 16, logicalWidth - 48, rowHeight - 2);
      }
      const lineTotal = item.price * item.qty;
      const title = item.name.length > 29 ? `${item.name.slice(0, 27)}…` : item.name;
      ctx.fillStyle = '#0f172a';
      ctx.font = '600 12px "Inter", sans-serif';
      ctx.fillText(title, 30, y);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.fillText(String(item.category || 'hardware').toUpperCase(), 30, y + 13);

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`x${item.qty}`, 278, y + 4);
      ctx.textAlign = 'right';
      ctx.fillText(formatMoney(item.price), 352, y + 4);
      ctx.fillText(formatMoney(lineTotal), logicalWidth - 30, y + 4);
      ctx.textAlign = 'left';
      y += rowHeight;
    });
  }

  // Divider before summary
  y += 6;
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(24, y);
  ctx.lineTo(logicalWidth - 24, y);
  ctx.stroke();

  const drawSummaryRow = (label, value, color = '#0f172a', bold = false) => {
    y += 22;
    ctx.fillStyle = bold ? '#0f172a' : '#475569';
    ctx.font = `${bold ? '700' : '500'} 12px "Inter", sans-serif`;
    ctx.fillText(label, 28, y);
    ctx.fillStyle = color;
    ctx.font = `${bold ? '700' : '600'} 12px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(value, logicalWidth - 28, y);
    ctx.textAlign = 'left';
  };

  drawSummaryRow('Order Subtotal', formatMoney(data.subtotal));

  if (data.tierResult && data.tierResult.discountAmount > 0) {
    drawSummaryRow(
      `${data.tierResult.tierName} (${Math.round(data.tierResult.rate * 100)}% Off)`,
      `-${formatMoney(data.tierResult.discountAmount)}`,
      '#059669'
    );
  }

  if (data.couponResult && data.couponResult.valid) {
    const couponSuffix =
      data.couponResult.type === 'bogo'
        ? ` (${data.couponResult.freeItemsCount} Free Unit)`
        : data.couponResult.type === 'freeship'
          ? ' (Shipping Waived)'
          : '';
    drawSummaryRow(
      `Promo Code: ${data.couponResult.code}${couponSuffix}`,
      data.couponResult.discountAmount > 0 ? `-${formatMoney(data.couponResult.discountAmount)}` : 'FREE SHIP',
      '#059669'
    );
  }

  const shipText =
    data.taxAndShipping.shippingAmount === 0 && data.subtotal > 0
      ? 'FREE ($0.00)'
      : formatMoney(data.taxAndShipping.shippingAmount);
  drawSummaryRow(
    `Shipping (${data.address.shippingMethod === 'express' ? 'Express' : 'Standard'})`,
    shipText,
    data.taxAndShipping.shippingAmount === 0 && data.subtotal > 0 ? '#059669' : '#0f172a'
  );

  const taxPct = (data.taxAndShipping.taxRate * 100).toFixed(2).replace(/\.00$/, '');
  drawSummaryRow(`Est. Tax (${data.address.state} · ${taxPct}%)`, formatMoney(data.taxAndShipping.taxAmount));

  // Grand total card
  y += 18;
  drawCanvasRoundRect(ctx, 24, y, logicalWidth - 48, 52, 10);
  ctx.fillStyle = '#0f172a';
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10px "JetBrains Mono", monospace';
  ctx.fillText('GRAND TOTAL (USD)', 38, y + 20);

  if (data.totalSavings > 0) {
    ctx.fillStyle = '#34d399';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText(`YOU SAVED ${formatMoney(data.totalSavings)}`, 38, y + 39);
  } else {
    ctx.fillStyle = '#64748b';
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillText('Add $200+ or promo code to save', 38, y + 39);
  }

  ctx.fillStyle = '#f59e0b';
  ctx.font = '700 22px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(formatMoney(data.grandTotal), logicalWidth - 38, y + 35);
  ctx.textAlign = 'left';

  // Barcode footer
  y += 76;
  ctx.strokeStyle = '#e2e8f0';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(24, y - 10);
  ctx.lineTo(logicalWidth - 24, y - 10);
  ctx.stroke();
  ctx.setLineDash([]);

  drawReceiptBarcode(ctx, data.invoiceId, 70, y + 4, logicalWidth - 140, 44);

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/png'),
    fileName: `nexus-invoice-${String(data.invoiceId || 'receipt').toLowerCase()}.png`
  };
}

window.generateInvoiceReceipt = generateInvoiceReceipt;

(function initPromoInvoiceStudioModule() {
  const studioState = {
    mode: 'preset',
    presetName: 'bundle3',
    couponCode: 'BUNDLE3',
    invoiceId: 'NX-2026-4340',
    status: 'VERIFIED QUOTE',
    items: [
      { id: 'p1', name: 'CyberDeck Pro Mechanical', category: 'keyboards', price: 249.00, qty: 2, img: '⌨️' },
      { id: 'p4', name: 'Nexus Neo 65% Low-Profile', category: 'keyboards', price: 149.00, qty: 1, img: '⌨️' },
      { id: 'p2', name: 'Acoustic Pulse ANC Headset', category: 'audio', price: 199.00, qty: 1, img: '🎧' }
    ]
  };

  let lastRenderedInvoice = null;

  function getAddressFromInputs() {
    const nameEl = document.getElementById('estCustomerName');
    const stateEl = document.getElementById('estStateSelect');
    const zipEl = document.getElementById('estZipInput');
    const shipEl = document.getElementById('estShippingSpeed');
    return {
      customerName: nameEl ? nameEl.value.trim() || 'Alex Rivera · Nexus Labs' : 'Alex Rivera · Nexus Labs',
      state: stateEl ? stateEl.value : 'CA',
      zip: zipEl ? zipEl.value.trim() || '94107' : '94107',
      shippingMethod: shipEl ? shipEl.value : 'standard'
    };
  }

  function getActiveOrderItems() {
    if (studioState.mode === 'live') {
      return Object.values(cart).map((item) => ({
        ...item,
        category: item.category || (ITEM_META_FALLBACK[item.id] ? ITEM_META_FALLBACK[item.id].category : 'general')
      }));
    }
    return studioState.items;
  }

  function renderStudio() {
    const itemsListEl = document.getElementById('studioItemsList');
    if (!itemsListEl) return;

    const items = getActiveOrderItems();
    const address = getAddressFromInputs();
    const summary = promoEngine.calculateOrderSummary(items, studioState.couponCode, address, {
      invoiceId: studioState.invoiceId,
      status: studioState.status
    });

    // 1. Tier Progress Bar & Hints
    const tierBadge = document.getElementById('activeTierBadge');
    const tierHint = document.getElementById('tierNextHint');
    const tierSavings = document.getElementById('tierSavingsValue');
    const tierMeter = document.getElementById('tierMeterFill');
    const tierPct = Math.round(summary.tierResult.rate * 100);

    if (tierBadge) tierBadge.textContent = `${summary.tierResult.tierName} · ${tierPct}%`;
    if (tierSavings) tierSavings.textContent = `-${formatMoney(summary.tierResult.discountAmount)}`;
    if (tierMeter) tierMeter.style.width = `${summary.tierResult.progressPercent}%`;
    if (tierHint) {
      tierHint.textContent = summary.tierResult.nextTierName
        ? `Add ${formatMoney(summary.tierResult.amountToNextTier)} to unlock ${summary.tierResult.nextTierName} (${Math.round(summary.tierResult.nextTierRate * 100)}% off)`
        : 'Maximum Enterprise Rig Tier (15% off) unlocked!';
    }

    document.querySelectorAll('.tier-milestone').forEach((el) => {
      const tierKey = el.getAttribute('data-tier');
      const tierObj = promoEngine.tiers.find((t) => t.id === tierKey);
      el.classList.toggle('unlocked', Boolean(tierObj && summary.subtotal >= tierObj.minSpend));
    });

    // 2. Source pill & Line Items
    const sourcePill = document.getElementById('orderSourcePill');
    if (sourcePill) {
      if (studioState.mode === 'live') {
        sourcePill.textContent = `Live Store Cart (${items.length} SKU)`;
      } else {
        const labels = { bundle3: 'BUNDLE3 Trio', cyber20: 'CYBER20 Rig', freeship: 'FREESHIP Order' };
        sourcePill.textContent = `Preset: ${labels[studioState.presetName] || 'Custom Builder'}`;
      }
    }

    const freeUnitIds = new Set(
      summary.couponResult.valid && summary.couponResult.freeUnits
        ? summary.couponResult.freeUnits.map((u) => u.id)
        : []
    );

    if (items.length === 0) {
      const emptyRow = document.createElement('div');
      emptyRow.className = 'studio-item-row';
      const hint = document.createElement('span');
      hint.className = 'tier-hint';
      hint.textContent = 'No items in order yet. Click "+ Add Item" or select a preset above.';
      emptyRow.appendChild(hint);
      itemsListEl.replaceChildren(emptyRow);
    } else {
      itemsListEl.replaceChildren();
      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'studio-item-row';

        const left = document.createElement('div');
        left.className = 'studio-item-left';

        const emoji = document.createElement('span');
        emoji.className = 'studio-item-emoji';
        emoji.textContent = item.img || '📦';

        const info = document.createElement('div');
        const title = document.createElement('div');
        title.className = 'studio-item-title';
        title.textContent = item.name;

        const meta = document.createElement('div');
        meta.className = 'studio-item-meta';

        const catTag = document.createElement('span');
        catTag.className = 'studio-cat-tag';
        catTag.textContent = item.category;

        const priceSpan = document.createElement('span');
        priceSpan.textContent = `${formatMoney(item.price)} ea`;

        meta.appendChild(catTag);
        meta.appendChild(priceSpan);

        if (freeUnitIds.has(item.id)) {
          const bogo = document.createElement('span');
          bogo.className = 'studio-bogo-tag';
          bogo.textContent = 'BOGO FREE UNIT';
          meta.appendChild(bogo);
        }

        info.appendChild(title);
        info.appendChild(meta);
        left.appendChild(emoji);
        left.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'studio-item-actions';

        const qtyControls = document.createElement('div');
        qtyControls.className = 'qty-controls';

        const decBtn = document.createElement('button');
        decBtn.type = 'button';
        decBtn.className = 'qty-btn studio-qty-btn';
        decBtn.setAttribute('data-id', item.id);
        decBtn.setAttribute('data-delta', '-1');
        decBtn.setAttribute('aria-label', `Decrease ${item.name} quantity`);
        decBtn.textContent = '-';

        const countSpan = document.createElement('span');
        countSpan.className = 'qty-count';
        countSpan.textContent = String(item.qty);

        const incBtn = document.createElement('button');
        incBtn.type = 'button';
        incBtn.className = 'qty-btn studio-qty-btn';
        incBtn.setAttribute('data-id', item.id);
        incBtn.setAttribute('data-delta', '1');
        incBtn.setAttribute('aria-label', `Increase ${item.name} quantity`);
        incBtn.textContent = '+';

        qtyControls.appendChild(decBtn);
        qtyControls.appendChild(countSpan);
        qtyControls.appendChild(incBtn);

        const lineTotal = document.createElement('span');
        lineTotal.className = 'studio-line-total';
        lineTotal.textContent = formatMoney(item.price * item.qty);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'studio-remove-btn';
        removeBtn.setAttribute('data-remove-id', item.id);
        removeBtn.setAttribute('aria-label', `Remove ${item.name}`);
        removeBtn.textContent = '×';

        actions.appendChild(qtyControls);
        actions.appendChild(lineTotal);
        actions.appendChild(removeBtn);

        row.appendChild(left);
        row.appendChild(actions);

        itemsListEl.appendChild(row);
      });
    }

    // 3. Promo input, pills & feedback
    const couponInput = document.getElementById('studioCouponInput');
    if (couponInput && document.activeElement !== couponInput) {
      couponInput.value = studioState.couponCode || '';
    }

    const promoBadge = document.getElementById('activePromoStatusBadge');
    const feedbackEl = document.getElementById('studioCouponFeedback');
    if (studioState.couponCode) {
      if (summary.couponResult.valid) {
        if (promoBadge) {
          promoBadge.textContent = `${summary.couponResult.code} ACTIVE`;
          promoBadge.classList.add('active');
        }
        if (feedbackEl) {
          feedbackEl.textContent = summary.couponResult.reason;
          feedbackEl.classList.remove('error');
        }
      } else {
        if (promoBadge) {
          promoBadge.textContent = `${studioState.couponCode} UNMET`;
          promoBadge.classList.remove('active');
        }
        if (feedbackEl) {
          feedbackEl.textContent = summary.couponResult.reason;
          feedbackEl.classList.add('error');
        }
      }
    } else {
      if (promoBadge) {
        promoBadge.textContent = 'No Code Applied';
        promoBadge.classList.remove('active');
      }
      if (feedbackEl) {
        feedbackEl.textContent = 'Select a quick promo chip or enter a custom code above.';
        feedbackEl.classList.remove('error');
      }
    }

    document.querySelectorAll('.coupon-quick-pill').forEach((pill) => {
      pill.classList.toggle('active', pill.getAttribute('data-code') === studioState.couponCode);
    });

    // 4. Rule-Based Discount Matrix
    const matrixBody = document.getElementById('discountMatrixBody');
    if (matrixBody) {
      matrixBody.replaceChildren();
      summary.matrixRows.forEach((row) => {
        const tr = document.createElement('tr');
        if (row.applied) tr.className = 'rule-active';

        const tdTitle = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = row.title;
        tdTitle.appendChild(strong);

        const tdCond = document.createElement('td');
        tdCond.textContent = row.condition;

        const tdStatus = document.createElement('td');
        const pillCls = row.status === 'ACTIVE' ? 'active' : row.status === 'READY' ? 'ready' : 'locked';
        const pill = document.createElement('span');
        pill.className = `matrix-status-pill ${pillCls}`;
        pill.textContent = row.status;
        tdStatus.appendChild(pill);

        const tdImpact = document.createElement('td');
        tdImpact.className = `matrix-impact ${row.impact > 0 ? 'positive' : ''}`;
        tdImpact.textContent = row.impact > 0 ? `-${formatMoney(row.impact)}` : '$0.00';

        tr.appendChild(tdTitle);
        tr.appendChild(tdCond);
        tr.appendChild(tdStatus);
        tr.appendChild(tdImpact);

        matrixBody.appendChild(tr);
      });
    }

    // 5. Tax Pill & KPIs
    const taxRatePill = document.getElementById('taxRatePill');
    if (taxRatePill) {
      const pct = (summary.taxAndShipping.taxRate * 100).toFixed(2).replace(/\.00$/, '');
      taxRatePill.textContent = `${summary.address.state} · ${pct}%`;
    }

    const headerId = document.getElementById('invoiceHeaderId');
    if (headerId) headerId.textContent = `Invoice #${summary.invoiceId}`;
    const grossEl = document.getElementById('studioGrossTotal');
    const savingsEl = document.getElementById('studioTotalSavings');
    const taxShipEl = document.getElementById('studioTaxShipTotal');
    const grandEl = document.getElementById('studioGrandTotal');

    if (grossEl) grossEl.textContent = formatMoney(summary.subtotal);
    if (savingsEl) savingsEl.textContent = `-${formatMoney(summary.totalSavings)}`;
    if (taxShipEl) taxShipEl.textContent = formatMoney(summary.taxAndShipping.taxAmount + summary.taxAndShipping.shippingAmount);
    if (grandEl) grandEl.textContent = formatMoney(summary.grandTotal);

    // 6. Render High-DPI HTML5 Canvas Invoice
    const canvas = document.getElementById('invoiceReceiptCanvas');
    lastRenderedInvoice = generateInvoiceReceipt(summary, canvas);
  }

  function applyPreset(presetName) {
    studioState.presetName = presetName;
    studioState.status = 'VERIFIED QUOTE';
    if (presetName === 'bundle3') {
      studioState.mode = 'preset';
      studioState.couponCode = 'BUNDLE3';
      studioState.items = [
        { id: 'p1', name: 'CyberDeck Pro Mechanical', category: 'keyboards', price: 249.00, qty: 2, img: '⌨️' },
        { id: 'p4', name: 'Nexus Neo 65% Low-Profile', category: 'keyboards', price: 149.00, qty: 1, img: '⌨️' },
        { id: 'p2', name: 'Acoustic Pulse ANC Headset', category: 'audio', price: 199.00, qty: 1, img: '🎧' }
      ];
    } else if (presetName === 'cyber20') {
      studioState.mode = 'preset';
      studioState.couponCode = 'CYBER20';
      studioState.items = [
        { id: 'p3', name: 'Horizon 32" Curved OLED', category: 'displays', price: 899.00, qty: 1, img: '🖥️' },
        { id: 'p1', name: 'CyberDeck Pro Mechanical', category: 'keyboards', price: 249.00, qty: 1, img: '⌨️' },
        { id: 'p5', name: 'Vortex Reference Studio Monitors', category: 'audio', price: 349.00, qty: 1, img: '🔊' }
      ];
    } else if (presetName === 'freeship') {
      studioState.mode = 'preset';
      studioState.couponCode = 'FREESHIP';
      studioState.items = [
        { id: 'p4', name: 'Nexus Neo 65% Low-Profile', category: 'keyboards', price: 149.00, qty: 1, img: '⌨️' },
        { id: 'p7', name: 'HyperStream Studio Mic & Arm', category: 'audio', price: 179.00, qty: 1, img: '🎙️' }
      ];
    } else if (presetName === 'live') {
      studioState.mode = 'live';
      studioState.couponCode = appliedCoupon || '';
    }

    document.querySelectorAll('.promo-preset-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-preset') === presetName);
    });
    renderStudio();
  }

  function adjustStudioItemQty(id, delta) {
    if (studioState.mode === 'live') {
      updateQuantity(id, delta);
      return;
    }
    const target = studioState.items.find((it) => it.id === id);
    if (!target) return;
    target.qty += delta;
    if (target.qty <= 0) {
      studioState.items = studioState.items.filter((it) => it.id !== id);
    }
    renderStudio();
  }

  function addItemToStudio(id) {
    const meta = ITEM_META_FALLBACK[id];
    if (!meta) return;
    if (studioState.mode === 'live') {
      addToCart(id, meta.name, meta.price, meta.img);
      return;
    }
    const existing = studioState.items.find((it) => it.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      studioState.items.push({ id, name: meta.name, category: meta.category, price: meta.price, qty: 1, img: meta.img });
    }
    renderStudio();
  }

  function nextInvoiceSerial() {
    const randomPart = Math.floor(1000 + Math.random() * 8999);
    studioState.invoiceId = `NX-2026-${randomPart}`;
  }

  window.syncPromoStudioWithCart = function syncPromoStudioWithCart() {
    const hasCartItems = Object.keys(cart).length > 0;
    if (hasCartItems && studioState.mode !== 'live') {
      studioState.mode = 'live';
      studioState.couponCode = appliedCoupon || studioState.couponCode;
      document.querySelectorAll('.promo-preset-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === 'live');
      });
    } else if (!hasCartItems && studioState.mode === 'live') {
      applyPreset('bundle3');
      return;
    }
    renderStudio();
  };

  window.captureCheckoutInvoice = function captureCheckoutInvoice(checkedOutItems, couponUsed) {
    nextInvoiceSerial();
    studioState.mode = 'preset';
    studioState.presetName = 'checkout';
    studioState.status = 'PAID RECEIPT';
    studioState.couponCode = couponUsed || '';
    studioState.items = checkedOutItems.map((it) => ({ ...it }));
    document.querySelectorAll('.promo-preset-btn').forEach((btn) => btn.classList.remove('active'));
    renderStudio();
  };

  function wireStudioEvents() {
    const section = document.getElementById('promoInvoiceSection');
    if (!section) return;

    document.querySelectorAll('.promo-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        if (preset === 'live' && Object.keys(cart).length === 0) {
          showToast('Live cart is empty — add items from catalog or click "Load Into Cart".');
        }
        applyPreset(preset);
      });
    });

    const itemsListEl = document.getElementById('studioItemsList');
    if (itemsListEl) {
      itemsListEl.addEventListener('click', (event) => {
        const qtyBtn = event.target.closest('.studio-qty-btn');
        if (qtyBtn) {
          adjustStudioItemQty(qtyBtn.getAttribute('data-id'), Number(qtyBtn.getAttribute('data-delta')));
          return;
        }
        const remBtn = event.target.closest('.studio-remove-btn');
        if (remBtn) {
          const rid = remBtn.getAttribute('data-remove-id');
          if (studioState.mode === 'live') {
            if (cart[rid]) {
              delete cart[rid];
              renderCart();
            }
          } else {
            studioState.items = studioState.items.filter((it) => it.id !== rid);
            renderStudio();
          }
        }
      });
    }

    const addBtn = document.getElementById('studioAddItemBtn');
    const selectEl = document.getElementById('studioProductSelect');
    if (addBtn && selectEl) {
      addBtn.addEventListener('click', () => addItemToStudio(selectEl.value));
    }

    const applyBtn = document.getElementById('studioCouponApplyBtn');
    const clearBtn = document.getElementById('studioCouponClearBtn');
    const inputEl = document.getElementById('studioCouponInput');

    if (applyBtn && inputEl) {
      applyBtn.addEventListener('click', () => {
        studioState.couponCode = normalizeCode(inputEl.value);
        if (studioState.mode === 'live' && promoEngine.coupons[studioState.couponCode]) {
          appliedCoupon = studioState.couponCode;
          saveCoupon();
          renderCart();
        } else {
          renderStudio();
        }
      });
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyBtn.click();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        studioState.couponCode = '';
        if (studioState.mode === 'live') {
          removeCoupon();
        } else {
          renderStudio();
        }
      });
    }

    document.querySelectorAll('.coupon-quick-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const code = pill.getAttribute('data-code');
        studioState.couponCode = code;
        if (studioState.mode === 'live') {
          applyCoupon(code);
        } else {
          renderStudio();
        }
      });
    });

    ['estCustomerName', 'estStateSelect', 'estZipInput', 'estShippingSpeed'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', renderStudio);
        el.addEventListener('change', renderStudio);
      }
    });

    const downloadBtn = document.getElementById('downloadInvoiceBtn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        renderStudio();
        if (!lastRenderedInvoice || !lastRenderedInvoice.dataUrl) return;
        const link = document.createElement('a');
        link.href = lastRenderedInvoice.dataUrl;
        link.download = lastRenderedInvoice.fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
        showToast(`Downloaded ${lastRenderedInvoice.fileName}`);
      });
    }

    const regenBtn = document.getElementById('regenInvoiceBtn');
    if (regenBtn) {
      regenBtn.addEventListener('click', () => {
        nextInvoiceSerial();
        renderStudio();
        showToast(`Generated ${studioState.invoiceId}`);
      });
    }

    const pushCartBtn = document.getElementById('pushOrderToCartBtn');
    if (pushCartBtn) {
      pushCartBtn.addEventListener('click', () => {
        const items = getActiveOrderItems();
        items.forEach((it) => {
          cart[it.id] = { ...it };
        });
        if (studioState.couponCode && promoEngine.coupons[studioState.couponCode]) {
          appliedCoupon = studioState.couponCode;
          saveCoupon();
        }
        studioState.mode = 'live';
        renderCart();
        toggleCartDrawer();
      });
    }

    renderStudio();
  }

  document.addEventListener('DOMContentLoaded', wireStudioEvents);
})();
/* ===== END Issue #434 ===== */

// ===== Issue #338: Recently Viewed Items Carousel with localStorage Sync =====
(function initRecentlyViewedCarousel() {
  if (typeof document === 'undefined') return;

  const STORAGE_KEY = 'cf_ecommerce_recently_viewed';
  const MAX_ITEMS = 6;
  const DEFAULT_ITEMS = ['p1', 'p2', 'p3', 'p6'];

  function getHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [...DEFAULT_ITEMS];
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Storage unavailable or disabled
    }
  }

  function recordView(productId) {
    if (!productId || typeof PRODUCT_CATALOG === 'undefined' || !PRODUCT_CATALOG[productId]) return;

    let history = getHistory();
    history = history.filter((id) => id !== productId);
    history.unshift(productId);
    if (history.length > MAX_ITEMS) {
      history = history.slice(0, MAX_ITEMS);
    }
    saveHistory(history);
    render();
  }

  function clearHistory() {
    saveHistory([]);
    render();
    showToast('Recently viewed browsing history cleared.');
  }

  function render() {
    const carousel = document.getElementById('recentlyViewedCarousel');
    if (!carousel) return;

    carousel.replaceChildren();

    const history = getHistory();
    const validProducts = history
      .map((id) => (typeof PRODUCT_CATALOG !== 'undefined' ? PRODUCT_CATALOG[id] : null))
      .filter(Boolean);

    if (validProducts.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'rv-empty-state';
      emptyDiv.textContent = 'No recently viewed items. Browse our developer workstation gear above!';
      carousel.appendChild(emptyDiv);
      return;
    }

    validProducts.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'rv-card';
      card.setAttribute('data-product-id', p.id);

      // Thumbnail
      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'rv-thumb-wrap';
      const icon = (p.thumbs && p.thumbs[0] && p.thumbs[0].icon) ? p.thumbs[0].icon : '📦';
      thumbWrap.textContent = icon;
      thumbWrap.addEventListener('click', () => {
        openQuickView(p.id);
      });

      if (p.badge) {
        const badge = document.createElement('span');
        badge.className = 'rv-badge-pill';
        badge.textContent = p.badge;
        thumbWrap.appendChild(badge);
      }

      // Info
      const info = document.createElement('div');
      info.className = 'rv-card-info';

      const cat = document.createElement('span');
      cat.className = 'rv-category';
      cat.textContent = p.categoryLabel || p.category || 'GEAR';

      const name = document.createElement('h4');
      name.className = 'rv-name';
      name.textContent = p.name;
      name.title = p.name;
      name.addEventListener('click', () => {
        openQuickView(p.id);
      });

      const priceRow = document.createElement('div');
      priceRow.className = 'rv-price-row';

      const price = document.createElement('span');
      price.className = 'rv-price';
      price.textContent = '$' + p.price.toFixed(2);

      const rating = document.createElement('span');
      rating.className = 'rv-rating';
      rating.textContent = '★ ' + (p.rating || 4.8);

      priceRow.appendChild(price);
      priceRow.appendChild(rating);

      info.appendChild(cat);
      info.appendChild(name);
      info.appendChild(priceRow);

      // Actions row
      const actions = document.createElement('div');
      actions.className = 'rv-actions-row';

      const btnInspect = document.createElement('button');
      btnInspect.type = 'button';
      btnInspect.className = 'btn-rv-inspect';
      btnInspect.textContent = 'Quick View';
      btnInspect.addEventListener('click', () => {
        openQuickView(p.id);
      });

      const btnAdd = document.createElement('button');
      btnAdd.type = 'button';
      btnAdd.className = 'btn-rv-add';
      btnAdd.textContent = '+ Add to Cart';
      btnAdd.addEventListener('click', () => {
        const itemImg = (p.thumbs && p.thumbs[0] && p.thumbs[0].icon) ? p.thumbs[0].icon : '📦';
        addToCart(p.id, p.name, p.price, itemImg);
      });

      actions.appendChild(btnInspect);
      actions.appendChild(btnAdd);

      card.appendChild(thumbWrap);
      card.appendChild(info);
      card.appendChild(actions);

      carousel.appendChild(card);
    });
  }

  function setup() {
    const root = document.getElementById('recentlyViewedSection');
    if (!root) return;

    const btnLeft = document.getElementById('btnRvScrollLeft');
    const btnRight = document.getElementById('btnRvScrollRight');
    const btnClear = document.getElementById('btnRvClearHistory');
    const carousel = document.getElementById('recentlyViewedCarousel');

    if (btnLeft && carousel) {
      btnLeft.addEventListener('click', () => {
        carousel.scrollBy({ left: -260, behavior: 'smooth' });
      });
    }

    if (btnRight && carousel) {
      btnRight.addEventListener('click', () => {
        carousel.scrollBy({ left: 260, behavior: 'smooth' });
      });
    }

    if (btnClear) {
      btnClear.addEventListener('click', clearHistory);
    }

    // Wrap window.openQuickView to record view
    if (typeof window.openQuickView === 'function') {
      const origQuickView = window.openQuickView;
      window.openQuickView = function(productId) {
        recordView(productId);
        return origQuickView.apply(this, arguments);
      };
    }

    // Attach click listeners to catalog cards to capture views
    const productsGrid = document.getElementById('productsGrid');
    if (productsGrid) {
      productsGrid.addEventListener('click', (e) => {
        const card = e.target.closest('[data-product-id], .product-card');
        if (card) {
          const pid = card.getAttribute('data-product-id') || card.getAttribute('data-id');
          if (pid) recordView(pid);
        }
      });
    }

    // Expose helper globally
    window.recordRecentlyViewedProduct = recordView;

    // Initial render
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

// ============================================================================
// EcommerceStoreExportEngine - Issue #574
// Client-side export engine & formatted summary report generator
// ============================================================================
class EcommerceStoreExportEngine {
  constructor(cart, catalog = []) {
    this.cart = cart || null;
    this.catalog = catalog || [];
  }

  escapeCSV(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  getItems() {
    if (this.cart) {
      if (typeof this.cart.getItems === 'function') {
        return this.cart.getItems();
      }
      if (Array.isArray(this.cart.items)) {
        return this.cart.items;
      }
      if (typeof this.cart.items === 'object' && this.cart.items !== null) {
        return Object.values(this.cart.items);
      }
    }
    if (typeof window !== 'undefined' && window.cart && typeof window.cart.items === 'object') {
      return Object.values(window.cart.items);
    }
    if (typeof window !== 'undefined' && Array.isArray(window.PRODUCTS)) {
      return window.PRODUCTS.slice(0, 10).map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        quantity: 1
      }));
    }
    return [];
  }

  toJSONBlob(data = null) {
    const items = this.getItems();
    const exportData = data || {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      cart: items,
      totals: this.cart && typeof this.cart.getTotals === 'function' ? this.cart.getTotals() : null
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
  }

  toCSVString(items = null) {
    const itemList = items || this.getItems();
    const headers = ['id', 'name', 'price', 'quantity', 'subtotal'];
    const rows = [headers.join(',')];
    for (const item of itemList) {
      const id = this.escapeCSV(item.id);
      const name = this.escapeCSV(item.name || item.title || 'Item');
      const price = Number(item.price || 0).toFixed(2);
      const qty = Number(item.quantity || item.qty || 1);
      const subtotal = (price * qty).toFixed(2);
      rows.push([id, name, price, qty, subtotal].join(','));
    }
    return rows.join('\r\n');
  }

  toCSVBlob(items = null) {
    const csvStr = this.toCSVString(items);
    return new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  }

  toMarkdownAudit(items = null) {
    const itemList = items || this.getItems();
    let md = `# E-Commerce Store Export Audit Report\n\n`;
    md += `_Generated on: ${new Date().toISOString()}_\n\n`;
    md += `| ID | Item Name | Unit Price | Qty | Subtotal |\n`;
    md += `|---|---|---|---|---|\n`;
    let grandTotal = 0;
    for (const item of itemList) {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || item.qty || 1);
      const sub = price * qty;
      grandTotal += sub;
      md += `| ${item.id} | ${item.name || item.title || 'Item'} | $${price.toFixed(2)} | ${qty} | $${sub.toFixed(2)} |\n`;
    }
    md += `\n**Grand Total:** $${grandTotal.toFixed(2)}\n`;
    return md;
  }

  triggerDownload(filename, blob, mimeType = 'application/octet-stream') {
    if (typeof window === 'undefined' || !window.document || !window.document.createElement) return false;
    const finalBlob = blob instanceof Blob ? blob : new Blob([blob], { type: mimeType });
    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  initUI() {
    if (typeof window === 'undefined' || !window.document || !window.document.getElementById) return;
    const triggerBtn = document.getElementById('exportDropdownTriggerBtn');
    const dropdownMenu = document.getElementById('exportDropdownMenu');
    const jsonBtn = document.getElementById('exportJsonBtn');
    const csvBtn = document.getElementById('exportCsvBtn');
    const mdBtn = document.getElementById('exportMarkdownBtn');

    if (triggerBtn && dropdownMenu) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.classList.toggle('active');
        triggerBtn.setAttribute('aria-expanded', String(isOpen));
        dropdownMenu.setAttribute('aria-hidden', String(!isOpen));
      });

      document.addEventListener('click', (e) => {
        if (!triggerBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
          dropdownMenu.classList.remove('active');
          triggerBtn.setAttribute('aria-expanded', 'false');
          dropdownMenu.setAttribute('aria-hidden', 'true');
        }
      });
    }

    if (jsonBtn) {
      jsonBtn.addEventListener('click', () => {
        const blob = this.toJSONBlob();
        this.triggerDownload(`store-export-${Date.now()}.json`, blob, 'application/json');
        if (dropdownMenu) dropdownMenu.classList.remove('active');
      });
    }

    if (csvBtn) {
      csvBtn.addEventListener('click', () => {
        const blob = this.toCSVBlob();
        this.triggerDownload(`store-export-${Date.now()}.csv`, blob, 'text/csv');
        if (dropdownMenu) dropdownMenu.classList.remove('active');
      });
    }

    if (mdBtn) {
      mdBtn.addEventListener('click', () => {
        const mdText = this.toMarkdownAudit();
        if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(mdText).catch(() => {});
        }
        const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
        this.triggerDownload(`store-audit-${Date.now()}.md`, blob, 'text/markdown');
        if (dropdownMenu) dropdownMenu.classList.remove('active');
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.EcommerceStoreExportEngine = EcommerceStoreExportEngine;
  if (document && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      const engine = new EcommerceStoreExportEngine();
      engine.initUI();
    });
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.EcommerceStoreExportEngine = EcommerceStoreExportEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EcommerceStoreExportEngine };
}






// ==========================================================================
// Issue #571: Adaptive User Settings & Preference Persistence State Engine
// ==========================================================================

const ECOMMERCE_DEFAULT_PREFERENCES = {
  theme: 'dark',
  layout: 'grid',
  soundEffects: true,
  highContrast: false,
  currency: 'USD',
  itemsPerPage: 12,
  autoSaveCart: true
};

class EcommerceStorePreferenceManager {
  constructor(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    this.storage = storage;
    this.storageKey = 'ecommerce_store_user_preferences_v1';
    this.preferences = { ...ECOMMERCE_DEFAULT_PREFERENCES };
    this.listeners = new Set();
    this.load();
  }

  load() {
    if (!this.storage) return this.preferences;
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          this.preferences = { ...ECOMMERCE_DEFAULT_PREFERENCES, ...parsed };
        }
      }
    } catch {
      // Fallback to memory
    }
    this.applyToDOM();
    return this.preferences;
  }

  get(key) {
    return this.preferences[key] !== undefined ? this.preferences[key] : ECOMMERCE_DEFAULT_PREFERENCES[key];
  }

  getAll() {
    return { ...this.preferences };
  }

  save(key, val) {
    if (key in ECOMMERCE_DEFAULT_PREFERENCES) {
      this.preferences[key] = val;
      this.persist();
      this.applyToDOM();
      this.notify(key, val);
      return true;
    }
    return false;
  }

  persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch {
      // Storage quota or unavailable
    }
  }

  resetDefaults() {
    this.preferences = { ...ECOMMERCE_DEFAULT_PREFERENCES };
    this.persist();
    this.applyToDOM();
    this.notify('*', this.preferences);
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify({
      ...this.preferences,
      exportedAt: new Date().toISOString(),
      store: 'Nexus E-Commerce Showcase'
    }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) return false;
      let updated = false;
      for (const [k, v] of Object.entries(parsed)) {
        if (k in ECOMMERCE_DEFAULT_PREFERENCES) {
          this.preferences[k] = v;
          updated = true;
        }
      }
      if (updated) {
        this.persist();
        this.applyToDOM();
        this.notify('*', this.preferences);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(key, val) {
    for (const cb of this.listeners) {
      try { cb(key, val, this.preferences); } catch {}
    }
  }

  applyToDOM() {
    if (typeof document === 'undefined') return;
    const body = document.body;
    if (!body) return;

    if (this.preferences.highContrast) {
      body.classList.add('high-contrast-mode');
    } else {
      body.classList.remove('high-contrast-mode');
    }

    if (this.preferences.theme && document.documentElement) {
      document.documentElement.setAttribute('data-theme', this.preferences.theme);
    }

    if (this.preferences.layout) {
      const catalogGrid = document.querySelector('.products-grid, .product-grid, #productsGrid');
      if (catalogGrid) {
        catalogGrid.setAttribute('data-layout', this.preferences.layout);
      }
    }
  }
}

function initEcommercePreferencesUI() {
  if (typeof document === 'undefined') return;

  const prefManager = new EcommerceStorePreferenceManager();
  window.ecommerceStorePreferenceManager = prefManager;

  const modal = document.getElementById('ecommerce-store-preferences-modal');
  const openBtn = document.getElementById('openPreferencesBtn');
  const closeBtn = document.getElementById('closePreferencesBtn');
  const backdrop = document.getElementById('prefBackdrop');

  if (!modal) return;

  function openModal() {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    syncInputs();
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }

  function syncInputs() {
    const p = prefManager.getAll();
    const themeSel = document.getElementById('prefThemeSelect');
    const layoutSel = document.getElementById('prefLayoutSelect');
    const currSel = document.getElementById('prefCurrencySelect');
    const itemsSel = document.getElementById('prefItemsPerPage');
    const soundTgl = document.getElementById('prefSoundToggle');
    const contrastTgl = document.getElementById('prefContrastToggle');
    const autoSaveTgl = document.getElementById('prefAutoSaveToggle');

    if (themeSel) themeSel.value = p.theme;
    if (layoutSel) layoutSel.value = p.layout;
    if (currSel) currSel.value = p.currency;
    if (itemsSel) itemsSel.value = String(p.itemsPerPage);
    if (soundTgl) soundTgl.checked = Boolean(p.soundEffects);
    if (contrastTgl) contrastTgl.checked = Boolean(p.highContrast);
    if (autoSaveTgl) autoSaveTgl.checked = Boolean(p.autoSaveCart);
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (backdrop) backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  const themeSel = document.getElementById('prefThemeSelect');
  if (themeSel) themeSel.addEventListener('change', () => prefManager.save('theme', themeSel.value));

  const layoutSel = document.getElementById('prefLayoutSelect');
  if (layoutSel) layoutSel.addEventListener('change', () => prefManager.save('layout', layoutSel.value));

  const currSel = document.getElementById('prefCurrencySelect');
  if (currSel) currSel.addEventListener('change', () => {
    prefManager.save('currency', currSel.value);
    if (typeof setCurrency === 'function') {
      setCurrency(currSel.value);
    }
  });

  const itemsSel = document.getElementById('prefItemsPerPage');
  if (itemsSel) itemsSel.addEventListener('change', () => prefManager.save('itemsPerPage', Number(itemsSel.value)));

  const soundTgl = document.getElementById('prefSoundToggle');
  if (soundTgl) soundTgl.addEventListener('change', () => prefManager.save('soundEffects', soundTgl.checked));

  const contrastTgl = document.getElementById('prefContrastToggle');
  if (contrastTgl) contrastTgl.addEventListener('change', () => prefManager.save('highContrast', contrastTgl.checked));

  const autoSaveTgl = document.getElementById('prefAutoSaveToggle');
  if (autoSaveTgl) autoSaveTgl.addEventListener('change', () => prefManager.save('autoSaveCart', autoSaveTgl.checked));

  const resetBtn = document.getElementById('prefResetBtn');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    prefManager.resetDefaults();
    syncInputs();
    if (typeof showToast === 'function') showToast('Preferences reset to defaults.');
  });

  const exportBtn = document.getElementById('prefExportBtn');
  if (exportBtn) exportBtn.addEventListener('click', () => {
    const jsonStr = prefManager.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus-preferences-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('Preferences exported successfully.');
  });

  syncInputs();
}

window.EcommerceStorePreferenceManager = EcommerceStorePreferenceManager;
window.initEcommercePreferencesUI = initEcommercePreferencesUI;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEcommercePreferencesUI);
  } else {
    initEcommercePreferencesUI();
  }
}



// ==========================================================================
// Issue #573: Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
// ==========================================================================

class EcommerceStoreTelemetryVisualizer {
  constructor(canvas = null, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    this.timeWindow = options.timeWindow || '24H';
    this.padding = options.padding || 24;
    this.cursor = null;

    this.datasets = {
      '1H': [120, 135, 128, 142, 160, 155, 172, 168, 190, 210, 205, 230],
      '24H': [450, 480, 420, 510, 590, 640, 720, 700, 780, 840, 910, 960, 1020, 1100],
      '7D': [2800, 3100, 2950, 3400, 3900, 4200, 4800, 5100, 5600, 6200]
    };
  }

  getDataForWindow(windowKey) {
    return this.datasets[windowKey] || this.datasets['24H'];
  }

  setTimeWindow(windowKey) {
    if (this.datasets[windowKey]) {
      this.timeWindow = windowKey;
      this.render();
    }
  }

  normalizeData(values) {
    if (!Array.isArray(values) || values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return values.map(() => 0.5);
    return values.map(v => (v - min) / (max - min));
  }

  interpolatePoints(points, targetCount = 30) {
    if (!Array.isArray(points) || points.length === 0) return [];
    if (points.length >= targetCount || points.length === 1) return [...points];

    const result = [];
    const step = (points.length - 1) / (targetCount - 1);

    for (let i = 0; i < targetCount; i++) {
      const idx = i * step;
      const lower = Math.floor(idx);
      const upper = Math.min(points.length - 1, Math.ceil(idx));
      const fraction = idx - lower;
      const interpolated = points[lower] + (points[upper] - points[lower]) * fraction;
      result.push(Number(interpolated.toFixed(2)));
    }
    return result;
  }

  calculateCoordinates(normalizedPoints, width, height, padding = this.padding) {
    if (!Array.isArray(normalizedPoints) || normalizedPoints.length === 0) return [];
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;
    const count = normalizedPoints.length;

    return normalizedPoints.map((normY, i) => {
      const x = padding + (i / Math.max(1, count - 1)) * drawWidth;
      const y = padding + (1.0 - normY) * drawHeight;
      return { x, y };
    });
  }

  findNearestPoint(mouseX, rawPoints, width, padding = this.padding) {
    if (!Array.isArray(rawPoints) || rawPoints.length === 0) return null;
    const drawWidth = width - padding * 2;
    const count = rawPoints.length;

    let clampedX = Math.max(padding, Math.min(width - padding, mouseX));
    const ratio = (clampedX - padding) / drawWidth;
    const exactIndex = ratio * (count - 1);
    const index = Math.round(Math.max(0, Math.min(count - 1, exactIndex)));

    return {
      index,
      value: rawPoints[index],
      ratio
    };
  }

  render() {
    if (!this.canvas || !this.ctx) return;
    const { canvas, ctx } = this;
    const width = canvas.width;
    const height = canvas.height;
    const padding = this.padding;

    ctx.clearRect(0, 0, width, height);

    const rawData = this.getDataForWindow(this.timeWindow);
    const normalized = this.normalizeData(rawData);
    const coords = this.calculateCoordinates(normalized, width, height, padding);
    if (coords.length < 2) return;

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = padding; y <= height - padding; y += (height - padding * 2) / 4) {
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Gradient fill under the curve
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.01)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, height - padding);
    ctx.lineTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.lineTo(coords[coords.length - 1].x, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Glowing stroke line
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw data circles
    coords.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw hover cursor line & dot if active
    if (this.cursor) {
      const nearest = this.findNearestPoint(this.cursor.x, rawData, width, padding);
      if (nearest) {
        const pointCoord = coords[nearest.index];

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pointCoord.x, padding);
        ctx.lineTo(pointCoord.x, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(pointCoord.x, pointCoord.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }
}

function initEcommerceTelemetryUI() {
  if (typeof document === 'undefined') return;

  const canvas = document.getElementById('ecommerce-store-telemetry-canvas');
  if (!canvas) return;

  const visualizer = new EcommerceStoreTelemetryVisualizer(canvas);
  window.ecommerceStoreTelemetryVisualizer = visualizer;

  const tooltip = document.getElementById('telemetryTooltip');
  const buttons = document.querySelectorAll('.telemetry-win-btn');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) {
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = (rect.height || 220) * (window.devicePixelRatio || 1);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      visualizer.render();
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      visualizer.setTimeWindow(btn.dataset.window);
    });
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    visualizer.cursor = { x, y };
    visualizer.render();

    if (tooltip) {
      const raw = visualizer.getDataForWindow(visualizer.timeWindow);
      const nearest = visualizer.findNearestPoint(x, raw, rect.width, visualizer.padding);
      if (nearest) {
        tooltip.hidden = false;
        tooltip.style.left = `${x + 12}px`;
        tooltip.style.top = `${y - 20}px`;
        tooltip.innerHTML = `<strong>Volume: $${nearest.value.toLocaleString()}</strong><span>Snapshot #${nearest.index + 1}</span>`;
      }
    }
  });

  canvas.addEventListener('mouseleave', () => {
    visualizer.cursor = null;
    visualizer.render();
    if (tooltip) tooltip.hidden = true;
  });

  visualizer.render();
}

window.EcommerceStoreTelemetryVisualizer = EcommerceStoreTelemetryVisualizer;
window.initEcommerceTelemetryUI = initEcommerceTelemetryUI;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEcommerceTelemetryUI);
  } else {
    initEcommerceTelemetryUI();
  }
}
