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
      { icon: '⌨️', label: 'Front Split', title: 'Ergonomic Split Layout' },
      { icon: '🖲️', label: '7° Tent', title: 'Integrated Tent Stand' },
      { icon: '🔌', label: 'PCB Matrix', title: 'Hot-Swap Sockets' },
      { icon: '📦', label: 'Unboxing', title: 'Braided Cable & Case' }
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
      { icon: '🎧', label: 'Studio Front', title: 'Studio Acoustic Profile' },
      { icon: '🎒', label: 'Folded', title: 'Foldable Travel Shell' },
      { icon: '🔊', label: 'Beryllium', title: '50mm Drivers' },
      { icon: '🎙️', label: 'Broadcast', title: 'Detachable Boom Mic' }
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
      { icon: '🖥️', label: '1800R Front', title: 'Panoramic 1800R Curve' },
      { icon: '✨', label: 'Aura Halo', title: 'Ambient RGB Backlight' },
      { icon: '📐', label: '4.5mm Slim', title: 'Razor-Thin OLED Panel' },
      { icon: '⚡', label: '90W Hub', title: 'Single-Cable USB-C Hub' }
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
      { icon: '🎯', text: '3840 x 2160 UHD @ 240Hz' },
      { icon: '⚡', text: '0.03ms (GtG) Pixel Response' },
      { icon: '🎨', text: '99% DCI-P3 & Delta E < 1' },
      { icon: '🔌', text: '90W USB-C + Dual HDMI 2.1' }
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
      { icon: '⌨️', label: 'Top View', title: '65% Compact Layout' },
      { icon: '📐', label: 'Side Profile', title: '12mm Thin Chassis' },
      { icon: '🔋', label: 'Battery', title: '120h Bluetooth Endurance' },
      { icon: '📦', label: 'Travel Case', title: 'Magnetic Travel Sleeve' }
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
      { icon: '⚡', text: 'Bluetooth 5.3 Low-Latency' },
      { icon: '🔋', text: '120h Operating Time' },
      { icon: '🪶', text: 'Ultra-slim 12mm Profile' },
      { icon: '🛡️', text: 'CNC Anodized Aluminum Top' }
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
      { icon: '🔊', label: 'Pair Front', title: 'Dual Bi-Amp Monoliths' },
      { icon: '🎛️', label: 'Back DSP', title: 'Room Acoustics Equalizer' },
      { icon: '🔌', label: 'Balanced I/O', title: 'XLR & TRS Balanced In' },
      { icon: '📦', label: 'Isolation', title: 'Acoustic Foam Decouplers' }
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
      { icon: '🔊', text: '100W Class-D Bi-Amplified' },
      { icon: '📈', text: '38Hz – 24kHz Flat Response' },
      { icon: '🎛️', text: 'Integrated 32-bit DSP Room EQ' },
      { icon: '🔌', text: 'XLR, 1/4" TRS & USB-C DAC' }
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
      { icon: '🖥️', label: 'Panoramic 32:9', title: 'Dual 1440p Workspace' },
      { icon: '🔄', label: 'KVM Hub', title: 'Dual PC Control Matrix' },
      { icon: '🌈', label: 'Mini-LED HDR', title: 'HDR 1000 Zone Dimming' },
      { icon: '📦', label: 'Heavy Arm', title: 'Integrated Heavy-Duty Stand' }
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
      { icon: '🎯', text: '5120 x 1440 Dual QHD @ 240Hz' },
      { icon: '⚡', text: '0.03ms GtG Response Time' },
      { icon: '🔄', text: 'Integrated USB-C KVM Switch' },
      { icon: '✨', text: 'Quantum Dot Mini-LED 1000 nits' }
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
      { icon: '🎙️', label: 'Capsule Front', title: '25mm Gold-Sputtered Capsule' },
      { icon: '🦾', label: 'Boom Arm', title: 'Gas-Spring Low Profile Arm' },
      { icon: '🔇', label: 'Tap Mute', title: 'Capacitive Tap-to-Mute' },
      { icon: '📦', label: 'Full Kit', title: 'Shockmount & Pop Filter' }
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
      { icon: '🎙️', text: '24-bit / 192kHz Studio Recording' },
      { icon: '🎯', text: 'Cardioid & Omnidirectional Modes' },
      { icon: '🎧', text: 'Zero-Latency 3.5mm Headphone Jack' },
      { icon: '🔌', text: 'Plug & Play USB-C Bus Powered' }
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
      { icon: '⌨️', label: 'Split Angle', title: 'Natural Wrist Ergonomics' },
      { icon: '🎛️', label: 'Rotary Knob', title: 'CNC Aluminum Volume Dial' },
      { icon: '🪙', label: 'Brass Weight', title: '2.4kg Solid Brass Base' },
      { icon: '📦', label: 'Carrying Case', title: 'Custom Hard EVA Case' }
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
      { icon: '⚡', text: 'Tri-Mode: 2.4GHz / BT 5.1 / USB-C' },
      { icon: '🪙', text: '2.4kg CNC Brass Weighted Case' },
      { icon: '🎛️', text: 'Programmable Rotary Media Dial' },
      { icon: '⚙️', text: 'VIA / QMK Full Key Remapping' }
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
      label: `★ ${facetState.minRating}+ Rating`,
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
  container.innerHTML = '';

  chips.forEach(chip => {
    const chipEl = document.createElement('div');
    chipEl.className = 'filter-chip';
    chipEl.innerHTML = `<span>${chip.label}</span><button type="button" class="chip-remove" aria-label="Remove filter ${chip.label}">✕</button>`;
    chipEl.querySelector('.chip-remove').addEventListener('click', chip.action);
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

/* ===== BEGIN Issue #283 & #433: Multi-Product Specification Comparison Matrix Drawer ===== */
(function () {
  'use strict';

  const PRODUCT_SPECS = {
    p1: {
      id: 'p1',
      name: 'CyberDeck Pro Mechanical',
      img: '⌨️',
      price: 249.00,
      rating: 4.9,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$249.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.9 / 5.0 (72 reviews)',
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
      img: '🎧',
      price: 199.00,
      rating: 4.8,
      inStock: true,
      availability: 'Only 3 Left',
      specs: {
        'Pricing': '$199.00',
        'Availability': 'Only 3 Left',
        'User Rating': '★ 4.8 / 5.0 (46 reviews)',
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
      img: '🖥️',
      price: 899.00,
      rating: 4.9,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$899.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.9 / 5.0 (30 reviews)',
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
      img: '⌨️',
      price: 149.00,
      rating: 4.7,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$149.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.7 / 5.0 (54 reviews)',
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
      img: '🔊',
      price: 349.00,
      rating: 4.6,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$349.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.6 / 5.0 (28 reviews)',
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
      img: '🖥️',
      price: 1199.00,
      rating: 4.9,
      inStock: false,
      availability: 'Backorder',
      specs: {
        'Pricing': '$1,199.00',
        'Availability': 'Backorder',
        'User Rating': '★ 4.9 / 5.0 (19 reviews)',
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
      img: '🎙️',
      price: 179.00,
      rating: 4.5,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$179.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.5 / 5.0 (39 reviews)',
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
      img: '⌨️',
      price: 289.00,
      rating: 4.8,
      inStock: true,
      availability: 'In Stock',
      specs: {
        'Pricing': '$289.00',
        'Availability': 'In Stock',
        'User Rating': '★ 4.8 / 5.0 (33 reviews)',
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
