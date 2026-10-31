function reserveTable(opener) {
  openReservationModal(opener || byId('reserveBtn'));
}

// ---------------------------------------------------------------
// Takeout order builder. All money is kept in cents.
// ---------------------------------------------------------------
const TAX_RATE = 0.085;
const DEFAULT_TIP = 18;

const DISHES = {
  wagyu: {
    name: 'Seared Wagyu Ribeye',
    price: 6800,
    blurb: 'Truffled potato puree, wild chanterelles, and aged Bordeaux reduction.',
    choices: [
      { id: 'cook', label: 'Cooking preference', options: [
        { label: 'Rare', price: 0 },
        { label: 'Medium rare', price: 0 },
        { label: 'Medium', price: 0 },
        { label: 'Well done', price: 0 }
      ], selected: 1 }
    ],
    sides: [
      { label: 'Haricots verts', price: 600 },
      { label: 'Roasted mushrooms', price: 800 },
      { label: 'Garden salad', price: 500 }
    ]
  },
  bisque: {
    name: 'Brittany Lobster Bisque',
    price: 3400,
    blurb: 'Cognac flambeed lobster foam, saffron tuile, and micro tarragon.',
    choices: [
      { id: 'spice', label: 'Seasoning', options: [
        { label: 'Mild', price: 0 },
        { label: 'Classic', price: 0 },
        { label: 'Extra pepper', price: 0 }
      ], selected: 1 },
      { id: 'bread', label: 'Bread', options: [
        { label: 'Baguette', price: 0 },
        { label: 'Gluten-free toast', price: 300 }
      ], selected: 0 }
    ],
    sides: [
      { label: 'Side salad', price: 500 },
      { label: 'Cheese gougeres', price: 700 }
    ]
  }
};

const order = { lines: [], tip: DEFAULT_TIP, placed: false };
const draft = { dishId: null, qty: 1, opener: null };
let openDialog = null; // the dialog element currently shown

function euro(cents) {
  return `€${(cents / 100).toFixed(2)}`;
}

function byId(id) { return document.getElementById(id); }

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v);
  });
  children.forEach((c) => c && node.append(c));
  return node;
}

function linePrice(line) {
  return (line.unit) * line.qty;
}

function calcBill(lines, tipPercent) {
  const subtotal = lines.reduce((sum, l) => sum + linePrice(l), 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const tip = Math.round(subtotal * (tipPercent / 100));
  return { subtotal, tax, tip, total: subtotal + tax + tip };
}

// ---------- dialog helpers (focus handling, Escape, simple focus trap)
const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function showDialog(dialog, opener, focusEl) {
  openDialog = dialog;
  dialog.hidden = false;
  byId('overlay').hidden = false;
  dialog._opener = opener;
  (focusEl || dialog.querySelector(FOCUSABLE)).focus();
}

function hideDialog(dialog) {
  dialog.hidden = true;
  byId('overlay').hidden = true;
  openDialog = null;
  const opener = dialog._opener;
  if (opener && document.contains(opener)) opener.focus();
}

document.addEventListener('keydown', (event) => {
  if (!openDialog) return;
  if (event.key === 'Escape') {
    hideDialog(openDialog);
    return;
  }
  if (event.key !== 'Tab') return;
  const items = [...openDialog.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

// ---------- dish modal
function buildChoiceGroup(dishId, choice) {
  const fs = el('fieldset', { class: 'field-group' }, el('legend', { text: choice.label }));
  choice.options.forEach((opt, i) => {
    const input = el('input', { type: 'radio', name: `choice-${choice.id}`, value: String(i) });
    if (i === choice.selected) input.checked = true;
    const text = opt.price ? `${opt.label} (+${euro(opt.price)})` : opt.label;
    fs.append(el('label', { class: 'opt' }, input, el('span', { text })));
  });
  return fs;
}

function openDish(dishId, opener) {
  const dish = DISHES[dishId];
  draft.dishId = dishId;
  draft.qty = 1;
  byId('dishTitle').textContent = dish.name;
  byId('dishDesc').textContent = `${dish.blurb} ${euro(dish.price)} each.`;
  byId('dishNote').value = '';
  const box = byId('dishOptions');
  box.replaceChildren();
  dish.choices.forEach((c) => box.append(buildChoiceGroup(dishId, c)));
  const sides = el('fieldset', { class: 'field-group' }, el('legend', { text: 'Add a side (optional)' }));
  dish.sides.forEach((side, i) => {
    const input = el('input', { type: 'checkbox', name: 'side', value: String(i) });
    sides.append(el('label', { class: 'opt' }, input, el('span', { text: `${side.label} (+${euro(side.price)})` })));
  });
  box.append(sides);
  updateDishPrice();
  showDialog(byId('dishDialog'), opener, byId('dishForm').querySelector('input'));
}

function readDraft() {
  const dish = DISHES[draft.dishId];
  const form = byId('dishForm');
  let unit = dish.price;
  const picks = [];
  dish.choices.forEach((c) => {
    const chosen = form.querySelector(`input[name="choice-${c.id}"]:checked`);
    const opt = c.options[chosen ? Number(chosen.value) : c.selected];
    unit += opt.price;
    picks.push(opt.label);
  });
  const sideLabels = [];
  form.querySelectorAll('input[name="side"]:checked').forEach((box) => {
    const side = dish.sides[Number(box.value)];
    unit += side.price;
    sideLabels.push(side.label);
  });
  const note = byId('dishNote').value.trim().replace(/\s+/g, ' ');
  return { picks, sideLabels, note, unit };
}

function updateDishPrice() {
  const { unit } = readDraft();
  byId('dishQty').textContent = String(draft.qty);
  byId('dishAdd').textContent = `Add to order · ${euro(unit * draft.qty)}`;
}

function describeLine(line) {
  const parts = [...line.picks];
  if (line.sideLabels.length) parts.push(`with ${line.sideLabels.join(', ')}`);
  if (line.note) parts.push(`Note: ${line.note}`);
  return parts.join(' / ');
}

function addDraftToOrder() {
  const dish = DISHES[draft.dishId];
  const d = readDraft();
  const key = JSON.stringify([draft.dishId, d.picks, d.sideLabels, d.note]);
  const existing = order.lines.find((l) => l.key === key);
  if (existing) existing.qty = Math.min(20, existing.qty + draft.qty);
  else order.lines.push({ key, name: dish.name, picks: d.picks, sideLabels: d.sideLabels, note: d.note, unit: d.unit, qty: draft.qty });
  order.placed = false;
  renderOrder();
}

// ---------- cart rendering
function qtyButton(label, text, handler) {
  const b = el('button', { type: 'button', class: 'qty-btn', 'aria-label': label, text });
  b.addEventListener('click', handler);
  return b;
}

function renderOrder() {
  const bill = calcBill(order.lines, order.tip);
  const count = order.lines.reduce((n, l) => n + l.qty, 0);
  byId('trayCount').textContent = String(count);
  byId('trayTotal').textContent = euro(bill.total);
  byId('cartEmpty').hidden = order.lines.length > 0;
  byId('placeOrder').disabled = order.lines.length === 0;
  byId('billSubtotal').textContent = euro(bill.subtotal);
  byId('billTax').textContent = euro(bill.tax);
  byId('billTipLabel').textContent = `Tip (${order.tip}%)`;
  byId('billTip').textContent = euro(bill.tip);
  byId('billTotal').textContent = euro(bill.total);

  const list = byId('cartLines');
  list.replaceChildren();
  order.lines.forEach((line, idx) => {
    const info = el('div', { class: 'line-info' },
      el('div', { class: 'line-name', text: line.name }),
      el('div', { class: 'line-opts', text: describeLine(line) }),
      el('div', { class: 'line-price', text: `${euro(line.unit)} each = ${euro(linePrice(line))}` }));
    const qty = el('div', { class: 'qty', role: 'group', 'aria-label': `Quantity of ${line.name}` },
      qtyButton(`Decrease ${line.name}`, '-', () => changeQty(idx, -1)),
      el('output', { text: String(line.qty) }),
      qtyButton(`Increase ${line.name}`, '+', () => changeQty(idx, 1)));
    list.append(el('li', { class: 'cart-line' }, info, qty));
  });
}

function changeQty(idx, delta) {
  const line = order.lines[idx];
  if (!line) return;
  line.qty = Math.min(20, line.qty + delta);
  if (line.qty <= 0) order.lines.splice(idx, 1);
  renderOrder();
  // keep keyboard focus on a sensible button after the list rebuilds
  const target = order.lines[idx] ? byId('cartLines').children[idx].querySelector('.qty-btn') : byId('cartClose');
  if (target) target.focus();
}

function placeOrder() {
  if (!order.lines.length) return;
  const bill = calcBill(order.lines, order.tip);
  const no = `LB-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  byId('receiptNo').textContent = `Order ${no}`;
  const lines = byId('receiptLines');
  lines.replaceChildren();
  order.lines.forEach((l) => {
    lines.append(el('li', {},
      el('span', { class: 'r-name', text: `${l.qty} x ${l.name}` }),
      el('span', { class: 'r-price', text: euro(linePrice(l)) }),
      el('span', { class: 'r-opts', text: describeLine(l) })));
  });
  const rb = byId('receiptBill');
  rb.replaceChildren();
  [['Subtotal', bill.subtotal], ['Tax (8.5%)', bill.tax], [`Tip (${order.tip}%)`, bill.tip], ['Total', bill.total]].forEach(([k, v], i) => {
    rb.append(el('div', { class: i === 3 ? 'bill-total' : '' }, el('dt', { text: k }), el('dd', { text: euro(v) })));
  });
  byId('cartView').hidden = true;
  byId('receipt').hidden = false;
  byId('cartTitle').textContent = 'Order confirmed';
  byId('receiptNo').focus();
  order.placed = true;
}

function newOrder() {
  order.lines = [];
  order.placed = false;
  order.tip = DEFAULT_TIP;
  document.querySelector('input[name="tip"][value="18"]').checked = true;
  byId('cartView').hidden = false;
  byId('receipt').hidden = true;
  byId('cartTitle').textContent = 'Your takeout order';
  renderOrder();
  hideDialog(byId('cartPanel'));
}

function openCart(opener) {
  if (order.placed) {
    // reopening after a confirmation shows the receipt again
    byId('cartView').hidden = true;
    byId('receipt').hidden = false;
  }
  showDialog(byId('cartPanel'), opener, byId('cartClose'));
}

(function initOrderBuilder() {
  if (!byId('dishDialog')) return;
  document.querySelectorAll('[data-order]').forEach((btn) => {
    btn.addEventListener('click', () => openDish(btn.dataset.order, btn));
  });
  byId('orderOnline').addEventListener('click', () => {
    const menu = byId('menu');
    menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const first = menu.querySelector('[data-order]');
    if (first) first.focus({ preventScroll: true });
  });
  byId('trayBtn').addEventListener('click', (e) => openCart(e.currentTarget));
  byId('overlay').addEventListener('click', () => { if (openDialog) hideDialog(openDialog); });
  byId('dishClose').addEventListener('click', () => hideDialog(byId('dishDialog')));
  byId('cartClose').addEventListener('click', () => hideDialog(byId('cartPanel')));

  byId('dishForm').addEventListener('change', updateDishPrice);
  byId('dishForm').addEventListener('submit', (event) => {
    event.preventDefault();
    addDraftToOrder();
    hideDialog(byId('dishDialog'));
    byId('trayBtn').focus();
  });
  byId('dishMinus').addEventListener('click', () => { draft.qty = Math.max(1, draft.qty - 1); updateDishPrice(); });
  byId('dishPlus').addEventListener('click', () => { draft.qty = Math.min(10, draft.qty + 1); updateDishPrice(); });

  byId('tipGroup').addEventListener('change', (event) => {
    if (event.target.name === 'tip') {
      order.tip = Number(event.target.value);
      renderOrder();
    }
  });
  byId('placeOrder').addEventListener('click', placeOrder);
  byId('newOrder').addEventListener('click', newOrder);
  renderOrder();
})();

// ---------------------------------------------------------------
// Interactive Multi-step Table Reservation Wizard & Voucher Logic
// ---------------------------------------------------------------
const SEATING_NAMES = {
  main: 'Main Dining Room',
  counter: "Chef's Tasting Counter",
  terrace: 'Glass Garden Terrace',
  vault: 'Private Wine Vault'
};

const reservationState = {
  step: 1,
  party: 2,
  partyLabel: '2 Pair',
  dateIso: '',
  dateFormatted: '',
  area: 'main',
  time: '',
  guest: {
    name: '',
    phone: '',
    email: '',
    occasion: 'Romantic Date Night',
    dietary: [],
    notes: ''
  },
  code: ''
};

function formatDateIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(isoStr) {
  if (!isoStr) return '';
  const parts = isoStr.split('-').map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function openReservationModal(opener) {
  const modal = byId('reservationModal');
  if (!reservationState.dateIso) {
    const today = new Date();
    reservationState.dateIso = formatDateIso(today);
    reservationState.dateFormatted = formatDisplayDate(reservationState.dateIso);
    const dateInput = byId('resDate');
    if (dateInput) {
      dateInput.value = reservationState.dateIso;
      dateInput.min = reservationState.dateIso;
    }
  }
  showDialog(modal, opener || byId('reserveBtn'));
  setWizardStep(reservationState.step || 1);
}

function setWizardStep(targetStep) {
  reservationState.step = targetStep;

  // Toggle step panels
  const s1 = byId('wizardStep1');
  const s2 = byId('wizardStep2');
  const s3 = byId('wizardStep3');
  const sc = byId('wizardStepConfirm');
  [s1, s2, s3, sc].forEach((st) => {
    if (st) st.hidden = true;
  });

  if (targetStep === 1 && s1) s1.hidden = false;
  else if (targetStep === 2 && s2) s2.hidden = false;
  else if (targetStep === 3 && s3) s3.hidden = false;
  else if (targetStep === 'confirm' && sc) sc.hidden = false;

  // Update Stepper indicators
  const ind1 = byId('stepIndicator1');
  const ind2 = byId('stepIndicator2');
  const ind3 = byId('stepIndicator3');
  const line1 = byId('stepLine1');
  const line2 = byId('stepLine2');

  [ind1, ind2, ind3].forEach((ind) => {
    if (ind) ind.classList.remove('active', 'completed');
  });
  if (line1) line1.classList.remove('completed');
  if (line2) line2.classList.remove('completed');

  if (targetStep === 1) {
    if (ind1) ind1.classList.add('active');
  } else if (targetStep === 2) {
    if (ind1) ind1.classList.add('completed');
    if (line1) line1.classList.add('completed');
    if (ind2) ind2.classList.add('active');
  } else if (targetStep === 3) {
    if (ind1) ind1.classList.add('completed');
    if (line1) line1.classList.add('completed');
    if (ind2) ind2.classList.add('completed');
    if (line2) line2.classList.add('completed');
    if (ind3) ind3.classList.add('active');
  } else if (targetStep === 'confirm') {
    if (ind1) ind1.classList.add('completed');
    if (line1) line1.classList.add('completed');
    if (ind2) ind2.classList.add('completed');
    if (line2) line2.classList.add('completed');
    if (ind3) ind3.classList.add('completed');
  }

  updateRecapBars();
}

function updateRecapBars() {
  const partyStr = `👥 ${reservationState.partyLabel || `${reservationState.party} Guests`}`;
  const dateStr = reservationState.dateFormatted || reservationState.dateIso;
  const areaStr = SEATING_NAMES[reservationState.area] || 'Main Dining Room';

  const recapPartyDate = byId('recapPartyDate');
  if (recapPartyDate) recapPartyDate.textContent = `${partyStr} • ${dateStr}`;

  const recapArea = byId('recapArea');
  if (recapArea) recapArea.textContent = areaStr;

  const recapFull = byId('recapFullSelection');
  if (recapFull) {
    const timeStr = reservationState.time ? ` • ${reservationState.time}` : '';
    recapFull.textContent = `${partyStr} • ${dateStr}${timeStr}`;
  }

  const recapArea3 = byId('recapAreaStep3');
  if (recapArea3) recapArea3.textContent = areaStr;
}

function generateBookingVoucher() {
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const code = `LUM-${randNum}`;
  reservationState.code = code;

  byId('voucherCode').textContent = code;
  byId('vName').textContent = reservationState.guest.name;
  byId('vDate').textContent = reservationState.dateFormatted;
  byId('vTime').textContent = reservationState.time;
  byId('vParty').textContent = `${reservationState.partyLabel || `${reservationState.party} Guests`}`;
  byId('vArea').textContent = SEATING_NAMES[reservationState.area] || 'Main Dining Room';
  byId('vOccasion').textContent = reservationState.guest.occasion;

  const dietaryWrap = byId('vDietaryWrap');
  const dietaryText = byId('vDietary');
  const details = [];
  if (reservationState.guest.dietary && reservationState.guest.dietary.length) {
    details.push(reservationState.guest.dietary.join(', '));
  }
  if (reservationState.guest.notes) {
    details.push(`"${reservationState.guest.notes}"`);
  }

  if (details.length) {
    dietaryWrap.hidden = false;
    dietaryText.textContent = details.join(' — ');
  } else {
    dietaryWrap.hidden = true;
  }
}

function downloadCalendarEvent() {
  const code = reservationState.code || 'LUM-RESERVATION';
  const name = reservationState.guest.name || 'Valued Guest';
  const party = reservationState.partyLabel || `${reservationState.party} Guests`;
  const area = SEATING_NAMES[reservationState.area] || 'Main Dining Room';
  const dateClean = (reservationState.dateIso || '').replace(/-/g, '');
  const timeClean = (reservationState.time || '19:30').replace(':', '') + '00';

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lumière Bistro Paris//Table Reservation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:res-${code}@lumierebistro.paris`,
    `DTSTAMP:${dateClean}T120000Z`,
    `DTSTART:${dateClean}T${timeClean}`,
    `SUMMARY:Table Reservation - Lumière Artisanal Bistro (${code})`,
    `DESCRIPTION:Tasting Table Reservation for ${name} (${party}). Seating Area: ${area}. Reference: ${code}. Address: 42 Rue de la Paix, 75002 Paris.`,
    'LOCATION:42 Rue de la Paix, 75002 Paris, France',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lumiere_Reservation_${code}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function resetReservation() {
  reservationState.step = 1;
  reservationState.time = '';
  reservationState.guest = {
    name: '',
    phone: '',
    email: '',
    occasion: 'Romantic Date Night',
    dietary: [],
    notes: ''
  };

  const form = byId('resGuestForm');
  if (form) form.reset();

  const slotBtns = document.querySelectorAll('.time-slot-btn');
  slotBtns.forEach(btn => btn.classList.remove('active'));

  const toStep3Btn = byId('toStep3');
  if (toStep3Btn) toStep3Btn.disabled = true;

  setWizardStep(1);
}

function initReservationWizard() {
  const today = new Date();
  reservationState.dateIso = formatDateIso(today);
  reservationState.dateFormatted = formatDisplayDate(reservationState.dateIso);

  const dateInput = byId('resDate');
  if (dateInput) {
    dateInput.value = reservationState.dateIso;
    dateInput.min = reservationState.dateIso;
    dateInput.addEventListener('change', () => {
      if (dateInput.value) {
        reservationState.dateIso = dateInput.value;
        reservationState.dateFormatted = formatDisplayDate(dateInput.value);
        document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
        updateRecapBars();
      }
    });
  }

  // Quick Dates
  const quickDateBtns = document.querySelectorAll('.quick-date-btn');
  quickDateBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      quickDateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const target = new Date();
      if (btn.dataset.offset !== undefined) {
        target.setDate(target.getDate() + Number(btn.dataset.offset));
      } else if (btn.dataset.preset === 'friday') {
        const day = target.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        target.setDate(target.getDate() + diff);
      } else if (btn.dataset.preset === 'saturday') {
        const day = target.getDay();
        const diff = (6 - day + 7) % 7 || 7;
        target.setDate(target.getDate() + diff);
      }

      const iso = formatDateIso(target);
      reservationState.dateIso = iso;
      reservationState.dateFormatted = formatDisplayDate(iso);
      if (dateInput) dateInput.value = iso;
      updateRecapBars();
    });
  });

  // Party Size Pills
  const partyPills = document.querySelectorAll('.party-pill');
  partyPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      partyPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      reservationState.party = Number(pill.dataset.guests);
      reservationState.partyLabel = pill.textContent.trim().replace(/^👤|👥|✨/, '').trim();
      updateRecapBars();
    });
  });

  // Seating Area Radio Cards
  const seatingCards = document.querySelectorAll('.seating-card');
  seatingCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio) {
      radio.addEventListener('change', () => {
        seatingCards.forEach(c => c.classList.remove('active'));
        if (radio.checked) {
          card.classList.add('active');
          reservationState.area = radio.value;
          updateRecapBars();
        }
      });
    }
  });

  // Step 1 -> Step 2
  const toStep2Btn = byId('toStep2');
  if (toStep2Btn) {
    toStep2Btn.addEventListener('click', () => {
      if (!reservationState.dateIso) {
        if (dateInput) dateInput.focus();
        return;
      }
      setWizardStep(2);
    });
  }

  // Step 2 Time Slot Buttons
  const slotBtns = document.querySelectorAll('.time-slot-btn');
  const toStep3Btn = byId('toStep3');
  slotBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      slotBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      reservationState.time = btn.dataset.time;
      if (toStep3Btn) toStep3Btn.disabled = false;
      updateRecapBars();
    });
  });

  // Step 2 Navigation
  const backToStep1Btn = byId('backToStep1');
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener('click', () => setWizardStep(1));
  }
  if (toStep3Btn) {
    toStep3Btn.addEventListener('click', () => {
      if (!reservationState.time) return;
      setWizardStep(3);
    });
  }

  // Step 3 Navigation
  const backToStep2Btn = byId('backToStep2');
  if (backToStep2Btn) {
    backToStep2Btn.addEventListener('click', () => setWizardStep(2));
  }

  // Step 3 Confirmation & Validation
  const confirmBtn = byId('confirmReservation');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const nameInput = byId('resName');
      const phoneInput = byId('resPhone');
      const emailInput = byId('resEmail');
      const errName = byId('errName');
      const errPhone = byId('errPhone');
      const errEmail = byId('errEmail');

      let valid = true;

      // Validate Name
      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        errName.hidden = false;
        valid = false;
      } else {
        errName.hidden = true;
      }

      // Validate Phone
      if (!phoneInput.value.trim() || phoneInput.value.trim().length < 5) {
        errPhone.hidden = false;
        valid = false;
      } else {
        errPhone.hidden = true;
      }

      // Validate Email
      const emailVal = emailInput.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailVal || !emailRegex.test(emailVal)) {
        errEmail.hidden = false;
        valid = false;
      } else {
        errEmail.hidden = true;
      }

      if (!valid) return;

      // Collect guest details
      reservationState.guest.name = nameInput.value.trim();
      reservationState.guest.phone = phoneInput.value.trim();
      reservationState.guest.email = emailVal;
      reservationState.guest.occasion = byId('resOccasion').value;
      reservationState.guest.notes = byId('resSpecialNotes').value.trim();

      // Collect dietary tags
      const checkedDiets = document.querySelectorAll('#dietaryTags input[type="checkbox"]:checked');
      reservationState.guest.dietary = Array.from(checkedDiets).map(c => c.value);

      // Generate voucher & show confirmation
      generateBookingVoucher();
      setWizardStep('confirm');
    });
  }

  // Voucher Action Buttons
  const vCalBtn = byId('vCalBtn');
  if (vCalBtn) vCalBtn.addEventListener('click', downloadCalendarEvent);

  const vPrintBtn = byId('vPrintBtn');
  if (vPrintBtn) vPrintBtn.addEventListener('click', () => window.print());

  const vNewBtn = byId('vNewBtn');
  if (vNewBtn) vNewBtn.addEventListener('click', resetReservation);

  // Close Button
  const closeBtn = byId('reservationClose');
  if (closeBtn) closeBtn.addEventListener('click', () => hideDialog(byId('reservationModal')));

  // Reserve Table Hero Button
  const reserveBtn = byId('reserveBtn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', () => openReservationModal(reserveBtn));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReservationWizard);
} else {
  initReservationWizard();
}
