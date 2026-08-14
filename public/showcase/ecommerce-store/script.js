// Cart state dictionary: { [id]: { name, price, qty, img } }
const cart = {};

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

  // Update Grand Total
  const cartTotalEl = document.getElementById('cartTotal');
  if (cartTotalEl) {
    cartTotalEl.innerText = `$${totalPrice.toFixed(2)}`;
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
    drawerBody.innerHTML = '<div class="empty-cart">Your cart is currently empty.</div>';
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
            <div class="price-sub">$${(item.price * item.qty).toFixed(2)} ($${item.price.toFixed(2)} x ${item.qty})</div>
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
