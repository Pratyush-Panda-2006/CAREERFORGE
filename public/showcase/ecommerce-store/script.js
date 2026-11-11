// Cart state dictionary: { [id]: { name, price, qty, img } }
const cart = {};

// Promo coupon engine. type "percent" takes value off the subtotal,
// type "freeship" waives the flat shipping fee.
const COUPONS = {
  CAREER20: { type: 'percent', value: 0.2, label: 'CAREER20: 20% off' },
  FREESHIP: { type: 'freeship', value: 0, label: 'FREESHIP: free delivery' }
};
const SHIPPING_FEE = 12;
const TAX_RATE = 0.08;
const COUPON_KEY = 'nexusStoreCoupon';
let appliedCoupon = null;

// Multi-currency exchange rate tables and locale configurations
const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', rate: 1.0, locale: 'en-US', digits: 2 },
  EUR: { code: 'EUR', symbol: '€', rate: 0.92, locale: 'de-DE', digits: 2 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.78, locale: 'en-GB', digits: 2 },
  JPY: { code: 'JPY', symbol: '¥', rate: 152.0, locale: 'ja-JP', digits: 0 },
  CAD: { code: 'CAD', symbol: 'CA$', rate: 1.38, locale: 'en-CA', digits: 2 },
  INR: { code: 'INR', symbol: '₹', rate: 83.5, locale: 'en-IN', digits: 2 },
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
    if (COUPONS[saved]) appliedCoupon = saved;
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

// Pure helper so the maths is in one place.
function calculateTotals(subtotal, couponCode) {
  const coupon = COUPONS[couponCode] || null;
  const discount = coupon && coupon.type === 'percent' ? subtotal * coupon.value : 0;
  let shipping = subtotal > 0 ? SHIPPING_FEE : 0;
  if (coupon && coupon.type === 'freeship') shipping = 0;
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
  if (!COUPONS[code]) {
    setCouponMessage(`"${code}" is not a valid promo code.`, true);
    return false;
  }
  if (appliedCoupon === code) {
    setCouponMessage(`${code} is already applied.`, true);
    return false;
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
  if (!cart[id]) {
    cart[id] = { id, name, price, qty: 1, img };
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

  // Update order summary (subtotal, discount, shipping, tax, total)
  const totals = calculateTotals(totalPrice, appliedCoupon);
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('cartSubtotal', formatMoney(totals.subtotal));
  setText('cartDiscount', `-${formatMoney(totals.discount)}`);
  setText('cartShipping', totals.shipping === 0 && appliedCoupon === 'FREESHIP' && totals.subtotal > 0 ? 'FREE' : formatMoney(totals.shipping));
  setText('cartTax', formatMoney(totals.tax));
  setText('cartTotal', formatMoney(totals.total));

  const discountRow = document.getElementById('discountRow');
  if (discountRow) discountRow.hidden = !(totals.discount > 0);
  setText('discountLabel', appliedCoupon ? `Discount (${appliedCoupon})` : 'Discount');

  const chip = document.getElementById('promoChip');
  if (chip) {
    chip.hidden = !appliedCoupon;
    if (appliedCoupon) setText('promoChipText', COUPONS[appliedCoupon].label);
  }

  // 2. Render Product Card Buttons / Quantity Controls
  const productIds = ['p1', 'p2', 'p3'];
  productIds.forEach((id) => {
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
      // Revert to original Add to Cart button
      let name = 'Product';
      let price = 0;
      let img = '📦';
      if (id === 'p1') { name = 'CyberDeck Pro Mechanical'; price = 249.00; img = '⌨️'; }
      if (id === 'p2') { name = 'Acoustic Pulse ANC Headset'; price = 199.00; img = '🎧'; }
      if (id === 'p3') { name = 'Horizon 32 Curved OLED'; price = 899.00; img = '🖥️'; }

      container.innerHTML = `
        <button class="add-btn" onclick="addToCart('${id}', '${name}', ${price}, '${img}')">Add to Cart</button>
      `;
    }
  });

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
            <div class="price-sub">${formatMoney(item.price * item.qty)} (${formatMoney(item.price)} × ${item.qty})</div>
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
  showToast('Order placed successfully! Thank you for testing Nexus Store.');
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

// Category Tabs Navigation Listener
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const cat = tab.getAttribute('data-cat');
    const cards = document.querySelectorAll('.card');

    cards.forEach((card) => {
      if (cat === 'all' || card.getAttribute('data-category') === cat) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

/* ===== BEGIN issue #63: Product Quick-View Modal Logic ===== */
const PRODUCT_CATALOG = {
  p1: {
    id: 'p1',
    name: 'CyberDeck Pro Mechanical',
    category: 'keyboards',
    categoryLabel: 'KEYBOARDS',
    price: 249.00,
    badge: 'HOT',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Wireless split ergonomic keyboard engineered with hot-swappable sockets, south-facing RGB matrix, customizable OLED telemetry screen, and CNC anodized aluminum chassis.',
    thumbs: [
      { icon: '⌨️', label: 'Front Split', title: 'Ergonomic Split Layout' },
      { icon: '🖲️', label: '7° Tent', title: 'Integrated Tent Stand' },
      { icon: '🔌', label: 'PCB Matrix', title: 'Hot-Swap Sockets' },
      { icon: '📦', label: 'Unboxing', title: 'Braided Cable & Case' }
    ],
    colors: [
      { id: 'stealth', name: 'Stealth Matte Black', hex: '#18181b' },
      { id: 'synthwave', name: 'Synthwave Violet', hex: '#7c3aed' },
      { id: 'glacier', name: 'Glacier Aluminum', hex: '#e2e8f0' }
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
      { icon: '⚡', text: 'Tri-Mode: 2.4G / BT 5.2 / USB-C' },
      { icon: '🔋', text: '4,000 mAh Li-ion (200 hrs)' },
      { icon: '⚙️', text: 'QMK & VIA Fully Programmable' },
      { icon: '🛡️', text: 'Poron Gasket Acoustic Mount' }
    ]
  },
  p2: {
    id: 'p2',
    name: 'Acoustic Pulse ANC Headset',
    category: 'audio',
    categoryLabel: 'AUDIO & MONITORING',
    price: 199.00,
    badge: 'NEW',
    stockText: 'Only 3 Left',
    stockClass: 'low-stock',
    desc: 'Audiophile active noise-canceling studio headphones with ultra-low latency lossy spatial audio, custom 50mm beryllium biocellulose drivers, and broadcast-grade microphone.',
    thumbs: [
      { icon: '🎧', label: 'Studio Front', title: 'Studio Acoustic Profile' },
      { icon: '🎒', label: 'Folded', title: 'Foldable Travel Shell' },
      { icon: '🔊', label: 'Beryllium', title: '50mm Drivers' },
      { icon: '🎙️', label: 'Broadcast', title: 'Detachable Boom Mic' }
    ],
    colors: [
      { id: 'onyx', name: 'Midnight Onyx Black', hex: '#0f172a' },
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
      { icon: '🔇', text: '40dB Hybrid Active Noise Cancel' },
      { icon: '⏱️', text: '55-Hour Continuous Playback' },
      { icon: '📶', text: 'Lossless 2.4GHz + Dual BT 5.3' },
      { icon: '🎛️', text: 'Built-in 32-bit Quad DAC' }
    ]
  },
  p3: {
    id: 'p3',
    name: 'Horizon 32" Curved OLED',
    category: 'displays',
    categoryLabel: 'DISPLAYS & MONITORS',
    price: 899.00,
    badge: 'PRO',
    stockText: 'In Stock',
    stockClass: 'in-stock',
    desc: 'Immersive 1800R curved 4K UHD Quantum-Dot OLED display calibrated with 240Hz refresh rate, 0.03ms response time, 99% DCI-P3 gamut, and 90W USB-C single-cable dock.',
    thumbs: [
      { icon: '🖥️', label: '1800R Front', title: 'Panoramic 1800R Curve' },
      { icon: '✨', label: 'Aura Halo', title: 'Ambient RGB Backlight' },
      { icon: '📐', label: '4.5mm Slim', title: 'Razor-Thin OLED Panel' },
      { icon: '⚡', label: '90W Hub', title: 'Single-Cable USB-C Hub' }
    ],
    colors: [
      { id: 'titanium', name: 'Space Gray Titanium', hex: '#94a3b8' },
      { id: 'obsidian', name: 'Matte Obsidian Black', hex: '#020617' }
    ],
    options: {
      label: 'Mounting Stand Architecture',
      choices: [
        { id: 'desk', name: 'Heavy Anodized Desktop Stand', priceDelta: 0 },
        { id: 'arm', name: 'Ergonomic Gas-Spring VESA Arm', priceDelta: 45.00 }
      ]
    },
    specs: [
      { icon: '🎯', text: '3840 x 2160 UHD @ 240Hz' },
      { icon: '⚡', text: '0.03ms (GtG) Pixel Response' },
      { icon: '🎨', text: '99% DCI-P3 & Delta E < 1' },
      { icon: '🔌', text: '90W USB-C + Dual HDMI 2.1' }
    ]
  }
};

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
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>✓ Added to Cart!</span>';
    btn.style.backgroundColor = '#22c55e';
    setTimeout(() => {
      btn.innerHTML = originalContent;
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
  return '★'.repeat(full) + '☆'.repeat(5 - full);
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
        <span class="breakdown-star-label">${star} <span class="star-icon">★</span></span>
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
      bannerText.textContent = `Filtering by: ${filtersDesc.join(' · ')} (${list.length} results)`;
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
                  ${rev.verified ? '<span class="verified-badge"><span aria-hidden="true">✓</span> Verified Buyer</span>' : ''}
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
              <span>👍 Helpful</span>
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
  1: '1 / 5 — Poor (Needs Improvement)',
  2: '2 / 5 — Fair (Below Expectation)',
  3: '3 / 5 — Average (Adequate)',
  4: '4 / 5 — Very Good (Recommended)',
  5: '5 / 5 — Exceptional (Highly Recommended)'
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

/* ===== BEGIN Issue #283: Product Comparison Matrix Drawer ===== */
(function () {
  'use strict';

  const PRODUCT_SPECS = {
    p1: {
      id: 'p1',
      name: 'CyberDeck Pro Mechanical',
      img: '⌨️',
      price: 249.00,
      specs: {
        'Processor': 'ARM Cortex-M4F 120MHz Microcontroller',
        'Battery Life': '140 Hours (RGB Off) / 45 Hours (RGB On)',
        'Connectivity': 'Tri-Mode: 2.4GHz + Bluetooth 5.3 + USB-C',
        'Weight': '780g (Aircraft-grade Aluminum)',
        'Price': '$249.00',
        'Warranty': '2 Years Full Hardware Replacement'
      }
    },
    p2: {
      id: 'p2',
      name: 'Acoustic Pulse ANC Headset',
      img: '🎧',
      price: 199.00,
      specs: {
        'Processor': 'Dual-Core 32-bit DSP + ANC Neural Engine',
        'Battery Life': '60 Hours (ANC On) / 100 Hours (ANC Off)',
        'Connectivity': 'Bluetooth 5.4 Low-Latency + 3.5mm Hi-Res',
        'Weight': '245g (Memory Foam & Titanium)',
        'Price': '$199.00',
        'Warranty': '1 Year Global Manufacturer Coverage'
      }
    },
    p3: {
      id: 'p3',
      name: 'Horizon 32" Curved OLED',
      img: '🖥️',
      price: 899.00,
      specs: {
        'Processor': 'Quantum QD Neo Display Engine (240Hz)',
        'Battery Life': 'AC Powered (Internal 120W PSU, 0.5W Standby)',
        'Connectivity': '2x HDMI 2.1 + 1x DP 2.1 + USB-C PD 90W',
        'Weight': '6.8kg (Ergonomic Heavy-Duty Stand)',
        'Price': '$899.00',
        'Warranty': '3 Years Burn-In & Panel Protection'
      }
    }
  };

  const SPEC_KEYS = ['Processor', 'Battery Life', 'Connectivity', 'Weight', 'Price', 'Warranty'];

  const selectedCompare = new Set();

  function initComparisonMatrix() {
    const compareBar = document.getElementById('compareBar');
    const compareCount = document.getElementById('compareCount');
    const compareBarThumbs = document.getElementById('compareBarThumbs');
    const compareClearBtn = document.getElementById('compareClearBtn');
    const compareOpenBtn = document.getElementById('compareOpenBtn');

    const compareBackdrop = document.getElementById('compareBackdrop');
    const compareDrawer = document.getElementById('compareDrawer');
    const compareCloseBtn = document.getElementById('compareCloseBtn');
    const compareCloseBottomBtn = document.getElementById('compareCloseBottomBtn');
    const compareDiffToggle = document.getElementById('compareDiffToggle');
    const compareTableWrapper = document.getElementById('compareTableWrapper');
    const compareAddAllBtn = document.getElementById('compareAddAllBtn');

    const checkboxes = document.querySelectorAll('.compare-checkbox');

    function updateCompareBar() {
      const count = selectedCompare.size;
      if (compareCount) compareCount.textContent = count;

      if (!compareBar) return;

      if (count > 0) {
        compareBar.hidden = false;
        if (compareBarThumbs) {
          compareBarThumbs.innerHTML = Array.from(selectedCompare)
            .map(id => {
              const p = PRODUCT_SPECS[id];
              return `<span class="compare-thumb-pill" title="${p ? p.name : id}">${p ? p.img : '📦'}</span>`;
            })
            .join('');
        }
      } else {
        compareBar.hidden = true;
      }
    }

    function renderMatrixTable() {
      if (!compareTableWrapper) return;
      const ids = Array.from(selectedCompare);

      if (ids.length === 0) {
        compareTableWrapper.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #94a3b8;">
            <p style="font-size: 1.1rem; margin-bottom: 12px;">No products selected for comparison.</p>
            <p style="font-size: 0.85rem;">Check the "Compare" box on 2 or 3 items in the store to view their side-by-side spec matrix.</p>
          </div>
        `;
        return;
      }

      const products = ids.map(id => PRODUCT_SPECS[id]).filter(Boolean);

      let html = `<table class="compare-matrix-table">`;

      // Header row
      html += `<thead><tr><th class="compare-spec-col">Feature / Specification</th>`;
      products.forEach(p => {
        html += `
          <th class="compare-item-header">
            <div class="comp-prod-visual">${p.img}</div>
            <div class="comp-prod-name">${p.name}</div>
            <div class="comp-prod-price">${formatMoney(p.price)}</div>
            <button type="button" class="btn-remove-comp" data-remove-id="${p.id}" aria-label="Remove ${p.name} from comparison">Remove &times;</button>
          </th>
        `;
      });
      html += `</tr></thead><tbody>`;

      // Spec rows
      SPEC_KEYS.forEach(specKey => {
        const values = products.map(p => {
          if (specKey === 'Price') {
            return formatMoney(p.price);
          }
          return p.specs[specKey] || 'N/A';
        });
        // Check if there is a difference across the products
        const hasDiff = products.length > 1 && new Set(values).size > 1;
        const diffClass = hasDiff ? 'is-diff' : '';

        html += `<tr class="${diffClass}"><td class="compare-spec-col">${specKey}</td>`;
        values.forEach(val => {
          html += `<td>${val}</td>`;
        });
        html += `</tr>`;
      });

      html += `</tbody></table>`;
      compareTableWrapper.innerHTML = html;

      // Attach remove button listeners
      compareTableWrapper.querySelectorAll('.btn-remove-comp').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-remove-id');
          selectedCompare.delete(id);
          const cb = document.querySelector(`.compare-checkbox[data-compare="${id}"]`);
          if (cb) cb.checked = false;
          updateCompareBar();
          renderMatrixTable();
          if (selectedCompare.size === 0) {
            closeDrawer();
          }
        });
      });
    }

    function openDrawer() {
      if (!compareDrawer || !compareBackdrop) return;
      if (selectedCompare.size === 0) {
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
      compareDrawer.focus();
    }

    function closeDrawer() {
      if (!compareDrawer || !compareBackdrop) return;
      compareDrawer.classList.remove('open');
      compareBackdrop.classList.remove('open');
    }

    // Checkbox changes
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.getAttribute('data-compare');
        if (cb.checked) {
          if (selectedCompare.size >= 3) {
            cb.checked = false;
            if (typeof showToast === 'function') {
              showToast('Maximum 3 items can be compared at once.');
            }
            return;
          }
          selectedCompare.add(id);
        } else {
          selectedCompare.delete(id);
        }
        updateCompareBar();
        if (compareDrawer && compareDrawer.classList.contains('open')) {
          renderMatrixTable();
        }
      });
    });

    // Clear comparison
    if (compareClearBtn) {
      compareClearBtn.addEventListener('click', () => {
        selectedCompare.clear();
        checkboxes.forEach(cb => { cb.checked = false; });
        updateCompareBar();
        closeDrawer();
      });
    }

    // Open & Close drawer
    if (compareOpenBtn) compareOpenBtn.addEventListener('click', openDrawer);
    if (compareCloseBtn) compareCloseBtn.addEventListener('click', closeDrawer);
    if (compareCloseBottomBtn) compareCloseBottomBtn.addEventListener('click', closeDrawer);
    if (compareBackdrop) compareBackdrop.addEventListener('click', closeDrawer);

    // Difference toggle
    if (compareDiffToggle && compareDrawer) {
      compareDrawer.classList.add('show-diff');
      compareDiffToggle.addEventListener('change', () => {
        if (compareDiffToggle.checked) {
          compareDrawer.classList.add('show-diff');
        } else {
          compareDrawer.classList.remove('show-diff');
        }
      });
    }

    // Add All to Cart
    if (compareAddAllBtn) {
      compareAddAllBtn.addEventListener('click', () => {
        let addedCount = 0;
        selectedCompare.forEach(id => {
          const p = PRODUCT_SPECS[id];
          if (p && typeof addToCart === 'function') {
            addToCart(p.id, p.name, p.price, p.img);
            addedCount++;
          }
        });
        if (typeof showToast === 'function') {
          showToast(`Added ${addedCount} compared item(s) to cart!`);
        }
      });
    }

    // Escape key
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
/* ===== END Issue #283 ===== */
