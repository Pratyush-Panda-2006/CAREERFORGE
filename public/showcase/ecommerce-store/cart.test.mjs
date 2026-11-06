import test from 'node:test';
import assert from 'node:assert/strict';

// Core cart and checkout pricing rules matching Nexus Store specification
const SHIPPING_FEE = 12.00;
const FREE_SHIPPING_THRESHOLD = 150.00;
const TAX_RATE = 0.08;

const COUPONS = {
  CAREER20: { type: 'percent', value: 0.20, label: 'CAREER20: 20% off' },
  SAVE15: { type: 'percent', value: 0.15, label: 'SAVE15: 15% off' },
  FIXED25: { type: 'fixed', value: 25.00, label: 'FIXED25: $25 off order' },
  FREESHIP: { type: 'freeship', value: 0, label: 'FREESHIP: free delivery' }
};

// Pure cart management class for testing state operations
class ShoppingCart {
  constructor() {
    this.items = {}; // { [id]: { id, name, price, qty, img } }
    this.appliedCoupon = null;
  }

  addItem(id, name, price, img = '📦', qty = 1) {
    if (typeof price !== 'number' || isNaN(price) || price < 0) {
      throw new TypeError('Item price must be a non-negative number');
    }
    if (typeof qty !== 'number' || qty <= 0) {
      throw new TypeError('Quantity must be a positive integer');
    }

    if (!this.items[id]) {
      this.items[id] = { id, name, price, qty, img };
    } else {
      this.items[id].qty += qty;
    }
    return this.items[id];
  }

  updateQuantity(id, delta) {
    if (!this.items[id]) return null;
    this.items[id].qty += delta;
    if (this.items[id].qty <= 0) {
      delete this.items[id];
      return null;
    }
    return this.items[id];
  }

  removeItem(id) {
    if (this.items[id]) {
      delete this.items[id];
      return true;
    }
    return false;
  }

  clear() {
    this.items = {};
    this.appliedCoupon = null;
  }

  applyCoupon(rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!code) {
      return { success: false, error: 'Promo code cannot be empty.' };
    }
    if (!COUPONS[code]) {
      return { success: false, error: `"${code}" is not a valid promo code.` };
    }
    this.appliedCoupon = code;
    return { success: true, coupon: COUPONS[code] };
  }

  removeCoupon() {
    this.appliedCoupon = null;
  }

  calculateTotals() {
    const itemList = Object.values(this.items);
    let subtotal = 0;
    let totalItems = 0;

    for (const item of itemList) {
      subtotal += item.price * item.qty;
      totalItems += item.qty;
    }

    // Round subtotal to 2 decimals
    subtotal = Math.round(subtotal * 100) / 100;

    // Discount calculation
    let discount = 0;
    const coupon = this.appliedCoupon ? COUPONS[this.appliedCoupon] : null;

    if (coupon) {
      if (coupon.type === 'percent') {
        discount = Math.round(subtotal * coupon.value * 100) / 100;
      } else if (coupon.type === 'fixed') {
        discount = Math.min(subtotal, coupon.value);
      }
    }

    // Subtotal after discount cannot be negative
    const discountedSubtotal = Math.max(0, subtotal - discount);

    // Shipping fee calculation:
    // Free if cart is empty, or coupon is 'freeship', or subtotal exceeds threshold
    let shipping = 0;
    if (subtotal > 0) {
      if (coupon && coupon.type === 'freeship') {
        shipping = 0;
      } else if (subtotal >= FREE_SHIPPING_THRESHOLD) {
        shipping = 0; // Free shipping threshold met
      } else {
        shipping = SHIPPING_FEE;
      }
    }

    // Sales tax on taxable discounted amount
    const tax = Math.round(discountedSubtotal * TAX_RATE * 100) / 100;

    // Total order amount
    const total = Math.round((discountedSubtotal + shipping + tax) * 100) / 100;

    return {
      totalItems,
      subtotal,
      discount,
      discountedSubtotal,
      shipping,
      isFreeShipping: shipping === 0 && subtotal > 0,
      tax,
      total
    };
  }
}

// =================== TEST CASES ===================

test('Empty cart initialization and default zeroed totals', () => {
  const cart = new ShoppingCart();
  const totals = cart.calculateTotals();

  assert.equal(totals.totalItems, 0);
  assert.equal(totals.subtotal, 0);
  assert.equal(totals.discount, 0);
  assert.equal(totals.shipping, 0);
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 0);
  assert.equal(totals.isFreeShipping, false);
});

test('Adding items to cart and quantity accumulation', () => {
  const cart = new ShoppingCart();
  cart.addItem('p1', 'CyberDeck Pro Mechanical', 249.00, '⌨️');

  assert.ok(cart.items['p1'], 'Item p1 should exist in cart');
  assert.equal(cart.items['p1'].qty, 1);
  assert.equal(cart.items['p1'].price, 249.00);

  // Add same item again -> increments quantity
  cart.addItem('p1', 'CyberDeck Pro Mechanical', 249.00, '⌨️');
  assert.equal(cart.items['p1'].qty, 2);

  // Add distinct second item
  cart.addItem('p2', 'Acoustic Pulse ANC Headset', 199.00, '🎧');
  assert.equal(Object.keys(cart.items).length, 2);

  const totals = cart.calculateTotals();
  assert.equal(totals.totalItems, 3);
  assert.equal(totals.subtotal, 249.00 * 2 + 199.00); // 697.00
});

test('Quantity updates and automatic removal when quantity reaches zero', () => {
  const cart = new ShoppingCart();
  cart.addItem('p1', 'CyberDeck Pro Mechanical', 249.00, '⌨️', 2);

  cart.updateQuantity('p1', 1);
  assert.equal(cart.items['p1'].qty, 3);

  cart.updateQuantity('p1', -2);
  assert.equal(cart.items['p1'].qty, 1);

  // Decrement to zero -> removes item from cart
  const result = cart.updateQuantity('p1', -1);
  assert.equal(result, null);
  assert.equal(cart.items['p1'], undefined);
  assert.equal(Object.keys(cart.items).length, 0);
});

test('Direct item removal and cart clear operations', () => {
  const cart = new ShoppingCart();
  cart.addItem('p1', 'Item 1', 10.00);
  cart.addItem('p2', 'Item 2', 20.00);

  const removed = cart.removeItem('p1');
  assert.equal(removed, true);
  assert.equal(cart.items['p1'], undefined);
  assert.ok(cart.items['p2']);

  const notFound = cart.removeItem('non_existent');
  assert.equal(notFound, false);

  cart.clear();
  assert.equal(Object.keys(cart.items).length, 0);
});

test('Subtotal accuracy with floating-point precision rounding', () => {
  const cart = new ShoppingCart();
  // Classic JS floating point inaccuracy test: 0.1 + 0.2 !== 0.3
  cart.addItem('p_small_1', 'Precision Cable', 19.99, '🔌', 3); // 59.97
  cart.addItem('p_small_2', 'Keycap Set', 14.15, '🔘', 2);      // 28.30
  cart.addItem('p_small_3', 'Switch Lube', 6.33, '🧴', 1);       // 6.33
  // Sum = 59.97 + 28.30 + 6.33 = 94.60

  const totals = cart.calculateTotals();
  assert.equal(totals.subtotal, 94.60);
});

test('Promo code percentage discounts and code case-insensitive normalization', () => {
  const cart = new ShoppingCart();
  cart.addItem('p2', 'Acoustic Pulse ANC Headset', 200.00);

  // Lowercase with extra whitespace should normalize to CAREER20 (20% off)
  const res = cart.applyCoupon('  career20  ');
  assert.equal(res.success, true);
  assert.equal(cart.appliedCoupon, 'CAREER20');

  const totals = cart.calculateTotals();
  assert.equal(totals.subtotal, 200.00);
  assert.equal(totals.discount, 40.00); // 20% of 200
  assert.equal(totals.discountedSubtotal, 160.00);
});

test('Fixed dollar discount promo codes and cap at subtotal value', () => {
  const cart = new ShoppingCart();
  cart.addItem('p_mousepad', 'Gaming Mousepad', 20.00);

  // Apply $25 fixed discount on $20 order
  cart.applyCoupon('FIXED25');
  const totals = cart.calculateTotals();

  // Discount should not exceed order subtotal ($20 max discount, subtotal cannot be negative)
  assert.equal(totals.subtotal, 20.00);
  assert.equal(totals.discount, 20.00);
  assert.equal(totals.discountedSubtotal, 0);
});

test('Invalid and empty coupon rejection rules', () => {
  const cart = new ShoppingCart();
  const emptyRes = cart.applyCoupon('');
  assert.equal(emptyRes.success, false);

  const fakeRes = cart.applyCoupon('INVALID_CODE_999');
  assert.equal(fakeRes.success, false);
  assert.match(fakeRes.error, /not a valid promo code/);
});

test('Sales tax calculations adhere to 8% rate on discounted subtotal', () => {
  const cart = new ShoppingCart();
  cart.addItem('p1', 'CyberDeck Pro Mechanical', 100.00);
  cart.applyCoupon('SAVE15'); // 15% off -> discounted subtotal = 85.00

  const totals = cart.calculateTotals();
  // 85.00 * 0.08 = 6.80
  assert.equal(totals.tax, 6.80);
});

test('Shipping fee waiver via FREESHIP promo code', () => {
  const cart = new ShoppingCart();
  cart.addItem('p_small', 'Cleaning Brush', 25.00); // Below $150 threshold

  const beforePromo = cart.calculateTotals();
  assert.equal(beforePromo.shipping, 12.00);

  cart.applyCoupon('FREESHIP');
  const afterPromo = cart.calculateTotals();
  assert.equal(afterPromo.shipping, 0.00);
  assert.equal(afterPromo.isFreeShipping, true);
});

test('Automatic free shipping threshold over $150.00', () => {
  const cart = new ShoppingCart();
  cart.addItem('p_tier1', 'Studio Stand', 149.99);
  assert.equal(cart.calculateTotals().shipping, 12.00, 'Orders under $150 must incur $12 shipping');

  // Add small item bringing total to $154.99
  cart.addItem('p_tier2', 'Cable Tie', 5.00);
  const totals = cart.calculateTotals();
  assert.equal(totals.subtotal, 154.99);
  assert.equal(totals.shipping, 0.00, 'Orders of $150 or more must qualify for free shipping');
  assert.equal(totals.isFreeShipping, true);
});

test('Reject invalid item parameters gracefully', () => {
  const cart = new ShoppingCart();
  assert.throws(() => cart.addItem('bad_price', 'Item', -10), TypeError);
  assert.throws(() => cart.addItem('bad_price_nan', 'Item', NaN), TypeError);
  assert.throws(() => cart.addItem('bad_qty', 'Item', 10, '📦', 0), TypeError);
});
