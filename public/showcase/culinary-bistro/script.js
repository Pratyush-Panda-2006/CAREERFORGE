window.reserveTable = function reserveTable(opener) {
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
  tableId: null,
  tableLabel: '',
  tableHoldId: null,
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

function tableContext() {
  return { date: reservationState.dateIso, time: reservationState.time, party: reservationState.party, area: reservationState.area };
}

function checkSelectedTable(commit = false) {
  const detail = { context: tableContext(), tableId: reservationState.tableId, holdId: reservationState.tableHoldId, commit, valid: false };
  document.dispatchEvent(new CustomEvent('bistro:check-table', { detail }));
  return detail.valid;
}

document.addEventListener('bistro:table-selection', event => {
  const selection = event.detail;
  if (selection && (selection.context.date !== reservationState.dateIso || selection.context.time !== reservationState.time || selection.context.party !== reservationState.party)) return;
  reservationState.tableId = selection?.id || null;
  reservationState.tableLabel = selection?.label || '';
  reservationState.tableHoldId = selection?.holdId || null;
  if (selection) {
    reservationState.area = selection.area;
    document.querySelectorAll('input[name="seatingArea"]').forEach(radio => {
      radio.checked = radio.value === selection.area;
      radio.closest('.seating-card').classList.toggle('active', radio.checked);
    });
  }
  byId('toStep3').disabled = !reservationState.time || !reservationState.tableId;
  updateRecapBars();
});
document.addEventListener('bistro:floorplan-ready', () => updateRecapBars());

function formatDateIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isFutureReservation(dateIso, time, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso) || !/^\d{2}:\d{2}$/.test(time)) return false;
  const seating = new Date(`${dateIso}T${time}`);
  return Number.isFinite(seating.getTime()) && formatDateIso(seating) === dateIso
    && `${String(seating.getHours()).padStart(2, '0')}:${String(seating.getMinutes()).padStart(2, '0')}` === time
    && seating > now;
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
  byId('resDate').min = formatDateIso(new Date());
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
  if (recapArea3) recapArea3.textContent = `${areaStr}${reservationState.tableLabel ? ` · ${reservationState.tableLabel}` : ''}`;
  document.dispatchEvent(new CustomEvent('bistro:reservation-change', { detail: tableContext() }));
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
  byId('vArea').textContent = `${SEATING_NAMES[reservationState.area] || 'Main Dining Room'} · ${reservationState.tableLabel}`;
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
  const area = `${SEATING_NAMES[reservationState.area] || 'Main Dining Room'} · ${reservationState.tableLabel}`;
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
  document.dispatchEvent(new CustomEvent('bistro:table-reset'));
  reservationState.tableId = null;
  reservationState.tableLabel = '';
  reservationState.tableHoldId = null;
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
  ['resName', 'resPhone', 'resEmail', 'resDate'].forEach(id => byId(id).removeAttribute('aria-invalid'));
  ['errName', 'errPhone', 'errEmail', 'errDate', 'errTime', 'reservationFeedback'].forEach(id => { byId(id).hidden = true; });

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
  function validateDate() {
    dateInput.min = formatDateIso(new Date());
    const valid = dateInput.value !== '' && dateInput.validity.valid;
    dateInput.setAttribute('aria-invalid', String(!valid));
    byId('errDate').hidden = valid;
    return valid;
  }
  if (dateInput) {
    dateInput.value = reservationState.dateIso;
    dateInput.min = reservationState.dateIso;
    dateInput.addEventListener('change', () => {
      reservationState.dateIso = dateInput.value;
      reservationState.dateFormatted = formatDisplayDate(dateInput.value);
      document.querySelectorAll('.quick-date-btn').forEach(b => b.classList.remove('active'));
      validateDate();
      updateRecapBars();
    });
    dateInput.addEventListener('blur', validateDate);
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
      validateDate();
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
      if (!validateDate()) {
        if (dateInput) dateInput.focus();
        return;
      }
      reservationState.dateIso = dateInput.value;
      reservationState.dateFormatted = formatDisplayDate(dateInput.value);
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
      byId('errTime').hidden = true;
      if (toStep3Btn) toStep3Btn.disabled = !reservationState.tableId;
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
      if (!checkSelectedTable()) {
        byId('floor-status').textContent = 'Select an available table before continuing. Expired holds must be selected again.';
        byId('floor-table').focus();
        return;
      }
      setWizardStep(3);
    });
  }

  // Step 3 Navigation
  const backToStep2Btn = byId('backToStep2');
  if (backToStep2Btn) {
    backToStep2Btn.addEventListener('click', () => setWizardStep(2));
  }

  // Step 3 Confirmation & Validation
  const guestForm = byId('resGuestForm');
  const fieldChecks = [
    ['resName', 'errName', value => value.trim().length >= 2],
    ['resPhone', 'errPhone', value => value.trim().length >= 5],
    ['resEmail', 'errEmail', value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())]
  ];
  function validateField([inputId, errorId, check]) {
    const input = byId(inputId);
    if (!input) return true;
    const valid = check(input.value);
    input.setAttribute('aria-invalid', String(!valid));
    const errEl = byId(errorId);
    if (errEl) errEl.hidden = valid;
    return valid;
  }
  fieldChecks.forEach(field => {
    const input = byId(field[0]);
    if (!input) return;
    input.addEventListener('blur', () => validateField(field));
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid')) validateField(field);
      if (fieldChecks.every(([id]) => byId(id) && byId(id).getAttribute('aria-invalid') === 'false')) {
        const feedback = byId('reservationFeedback');
        if (feedback) feedback.hidden = true;
      }
    });
  });
  if (guestForm) {
    guestForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!validateDate()) {
        setWizardStep(1);
        dateInput.focus();
        return;
      }
      if (!isFutureReservation(dateInput.value, reservationState.time)) {
        setWizardStep(2);
        byId('errTime').hidden = false;
        document.querySelector('.time-slot-btn').focus();
        return;
      }
      const nameInput = byId('resName');
      const phoneInput = byId('resPhone');
      const emailInput = byId('resEmail');
      const emailVal = emailInput.value.trim();
      const invalidFields = fieldChecks.filter(field => !validateField(field));
      byId('reservationFeedback').hidden = invalidFields.length === 0;
      if (invalidFields.length) { byId(invalidFields[0][0]).focus(); return; }

      if (!checkSelectedTable(true)) {
        setWizardStep(2);
        byId('floor-status').textContent = 'Your table is no longer held. Choose an available table again.';
        byId('floor-table').focus();
        return;
      }

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
      byId('reservationSuccess').focus();
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

// =========================================================================
// Issue #181: Chef Special Tasting Menu Interactive Multi-Course Timeline
// =========================================================================

const TASTING_COURSES = [
  {
    id: 1,
    roman: 'I',
    type: 'savory',
    stage: 'Amuse-Bouche',
    titleFr: "L'Éveil des Sens — Huître & Gelée de Champagne",
    titleEn: 'Brittany Gillardeau Oyster & Champagne Granité',
    emoji: '🦪',
    description: 'Chilled Gillardeau oyster served on crushed sea ice with vintage Champagne granité, shallot mignonette pearls, sea fennel, and fresh cucumber essence.',
    chefInspiration: 'A brisk morning at the fishing port of Cancale, where ocean brine meets the crisp minerality of Reims cellars. This opener awakens the palate with pure maritime energy and delicate effervescence.',
    winePairing: {
      wine: 'NV Delamotte Blanc de Blancs Brut Champagne',
      region: 'Le Mesnil-sur-Oger, Champagne',
      notes: 'Chalky minerality, white flowers, brioche and razor-sharp acidity that electrifies the oyster brine.',
      temp: '6°C',
      varietal: '100% Grand Cru Chardonnay',
      terroir: 'Côte des Blancs Chalk & Limestone',
      flavorProfile: { tannin: 12, acidity: 94, body: 42, sweetness: 15, fruit: 62 }
    },
    provenance: 'Cancale, Brittany & Reims',
    allergens: ['Molluscs', 'Sulfites'],
    sensory: { acidity: 95, richness: 20, complexity: 85 }
  },
  {
    id: 2,
    roman: 'II',
    type: 'savory',
    stage: 'Premier Entrée',
    titleFr: 'La Terre & La Forêt — Velouté de Champignons Sauvages',
    titleEn: 'Foraged Wild Forest Velouté & Périgord Truffle',
    emoji: '🍄',
    description: 'Velvety morel and black trompette reduction finished with roasted hazelnut oil, toasted pain au levain crisp, and shaved black winter truffle tableside.',
    chefInspiration: 'Memories of autumn mushroom foraging in the damp undergrowth of the Fontainebleau forest with my grandfather. The intoxicating scent of oak moss and fallen leaves captured in a single warm bowl.',
    winePairing: {
      wine: '2021 Domaine Huet Vouvray Le Haut-Lieu Demi-Sec',
      region: 'Vouvray, Loire Valley',
      notes: 'Quince, baked orchard pears, acacia honey, and limestone tension balancing the deep earthiness of the truffles.',
      temp: '10°C',
      varietal: '100% Chenin Blanc',
      terroir: 'Première Côte Deep Clay & Tuffeau',
      flavorProfile: { tannin: 22, acidity: 78, body: 68, sweetness: 56, fruit: 84 }
    },
    provenance: 'Fontainebleau & Périgord',
    allergens: ['Dairy', 'Gluten', 'Nuts'],
    sensory: { acidity: 35, richness: 80, complexity: 90 }
  },
  {
    id: 3,
    roman: 'III',
    type: 'savory',
    stage: 'Poisson',
    titleFr: "L'Océan Atlantique — Turbot Rôti au Beurre Noisette",
    titleEn: 'Pan-Roasted Atlantic Turbot & Smoked Parsnip',
    emoji: '🐟',
    description: 'Line-caught Brittany turbot basted in golden foaming butter, served over silky smoked parsnip mousseline, sea asparagus, and citrus yuzu emulsion.',
    chefInspiration: 'A tribute to classic French technique where pristine Atlantic turbot is honored by nutty hazelnut butter and seaside botanicals. Precision cooking ensures the flesh remains succulent and pearlescent.',
    winePairing: {
      wine: '2020 Domaine Leflaive Puligny-Montrachet',
      region: 'Côte de Beaune, Burgundy',
      notes: 'Toasted almond, crushed limestone, lemon curd, and a long saline finish harmonizing with the brown butter.',
      temp: '12°C',
      varietal: '100% Chardonnay',
      terroir: 'Kimmeridgian Clay-Limestone',
      flavorProfile: { tannin: 25, acidity: 82, body: 76, sweetness: 16, fruit: 72 }
    },
    provenance: 'Atlantic Coast & Brittany',
    allergens: ['Fish', 'Dairy'],
    sensory: { acidity: 65, richness: 75, complexity: 88 }
  },
  {
    id: 4,
    roman: 'IV',
    type: 'savory',
    stage: "Viande d'Exception",
    titleFr: 'La Chasse & Terroir — Canard de Challans Rôti aux Cerises',
    titleEn: 'Challans Duck Breast with Spiced Griottines & Foie Gras',
    emoji: '🦆',
    description: 'Dry-aged spiced Challans duck breast, caramelized griottine cherry gastrique, parsnip ribbons, glazed salsify, and pan-seared Landes foie gras.',
    chefInspiration: 'The gentle pastoral hills of the Vendée, blending savory game richness with sweet-tart orchard cherries macerated in kirsch. Duck and cherries are an immortal pair of the French culinary soul.',
    winePairing: {
      wine: '2018 Domaine Georges Roumier Chambolle-Musigny',
      region: 'Côte de Nuits, Burgundy',
      notes: 'Wild strawberries, violets, velvety forest floor tannins, and exotic baking spice matching the spiced duck.',
      temp: '16°C',
      varietal: '100% Pinot Noir',
      terroir: 'Stony Bajocian Limestone',
      flavorProfile: { tannin: 68, acidity: 74, body: 72, sweetness: 20, fruit: 88 }
    },
    provenance: 'Vendée & Landes',
    allergens: ['Dairy', 'Sulfites'],
    sensory: { acidity: 60, richness: 85, complexity: 92 }
  },
  {
    id: 5,
    roman: 'V',
    type: 'savory',
    stage: 'Le Plat Signature',
    titleFr: 'Le Chef-d’Œuvre — Filet de Bœuf Wagyu Saisi & Moelle',
    titleEn: 'Seared Wagyu A5 Filet Mignon & Roasted Bone Marrow',
    emoji: '🥩',
    description: 'Charred A5 Wagyu tenderloin, silky pomme purée robuchon-style, smoked bone marrow croquette, and 48-hour simmered Bordelaise jus with 40-year balsamic.',
    chefInspiration: 'The culmination of balance: melting richness grounded by French culinary heritage and intense reduction sauces simmered over 48 hours. A celebration of patience and absolute ingredient supremacy.',
    winePairing: {
      wine: '2015 Château Margaux Premier Grand Cru Classé',
      region: 'Margaux, Bordeaux',
      notes: 'Cassis, graphite, dried cedar, black truffles, and majestic aristocratic tannins built for prime red meat.',
      temp: '17°C',
      varietal: '90% Cabernet Sauvignon, 7% Merlot, 2% Cabernet Franc, 1% Petit Verdot',
      terroir: 'Deep Günzian Gravel & Silica',
      flavorProfile: { tannin: 92, acidity: 64, body: 95, sweetness: 18, fruit: 82 }
    },
    provenance: 'Périgord & Bordeaux',
    allergens: ['Dairy', 'Gluten', 'Sulfites'],
    sensory: { acidity: 40, richness: 98, complexity: 98 }
  },
  {
    id: 6,
    roman: 'VI',
    type: 'sweet',
    stage: 'L’Entremets Fromager',
    titleFr: 'La Ronde des Fromages — Comté 36 Mois & Rayon de Miel',
    titleEn: '36-Month Aged Comté & Wild Mountain Honeycomb',
    emoji: '🧀',
    description: 'Granular reserve Comté from Fort Saint-Antoine cave affineur, artisanal walnut pain de seigle, wildflower mountain honeycomb, and poached mirabelle plum.',
    chefInspiration: 'The Jura highlands where mountain cows graze on alpine flora, producing cheese of peerless complexity with toasted hazelnut crystals. A contemplative bridge between savory terroirs and dessert.',
    winePairing: {
      wine: '2016 Domaine Macle Château-Chalon Vin Jaune',
      region: 'Château-Chalon, Jura',
      notes: 'Walnut skin, curry leaf, dried apple, fenugreek, and piercing oxidative vitality that elevates aged Comté.',
      temp: '14°C',
      varietal: '100% Savagnin',
      terroir: 'Blue Lias Marl Scree Slopes',
      flavorProfile: { tannin: 42, acidity: 88, body: 80, sweetness: 14, fruit: 65 }
    },
    provenance: 'Fort Saint-Antoine, Jura',
    allergens: ['Dairy', 'Nuts', 'Gluten'],
    sensory: { acidity: 70, richness: 65, complexity: 94 }
  },
  {
    id: 7,
    roman: 'VII',
    type: 'sweet',
    stage: 'Le Grand Dessert',
    titleFr: 'L’Apothéose Gourmande — Sphère au Chocolat Valrhona & Fleur de Sel',
    titleEn: 'Valrhona Guanaja Chocolate Dome & Warm Salted Caramel',
    emoji: '🍫',
    description: 'Crisp 70% Valrhona Guanaja dark chocolate sphere, Tahitian vanilla bean namelaka, praline feuilletine crunch, tableside hot Guérande salted caramel pour, and 24K edible gold.',
    chefInspiration: 'A theatrical finale: melting crisp chocolate under steaming amber caramel, capturing the bittersweet beauty of Parisian twilight over the Seine. Decadent, textural, and memorable.',
    winePairing: {
      wine: "2017 Château d'Yquem Premier Cru Supérieur",
      region: 'Sauternes, Bordeaux',
      notes: 'Candied apricots, saffron, beeswax, orange marmalade, and infinite honeyed botrytis length.',
      temp: '11°C',
      varietal: '75% Sémillon, 25% Sauvignon Blanc',
      terroir: 'Gravel & Clay with Ciron Morning Botrytis Mists',
      flavorProfile: { tannin: 18, acidity: 85, body: 92, sweetness: 96, fruit: 94 }
    },
    provenance: 'Lyon & Guérande',
    allergens: ['Dairy', 'Gluten', 'Soy'],
    sensory: { acidity: 45, richness: 90, complexity: 95 }
  }
];

function initTastingMenuTimeline() {
  const stepperNav = byId('courseStepper');
  const feed = byId('coursesTimelineFeed');
  if (!stepperNav || !feed) return;

  let activeFilter = 'all';
  let wineFlightActive = false;
  let allExpanded = false;

  // 1. Render Stepper Nodes
  function renderStepper() {
    stepperNav.innerHTML = '';
    TASTING_COURSES.forEach((c) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `stepper-node ${c.id === 1 ? 'active' : ''}`;
      btn.id = `stepperNode-${c.id}`;
      btn.setAttribute('data-course-id', c.id);
      btn.setAttribute('aria-label', `Course ${c.roman}: ${c.stage} - ${c.titleEn}`);

      btn.innerHTML = `
        <span class="stepper-badge">${c.roman}</span>
        <span class="stepper-label">${c.stage}</span>
      `;

      btn.addEventListener('click', () => {
        scrollToCourse(c.id);
      });

      stepperNav.appendChild(btn);
    });
  }

  // 2. Render Course Cards in Timeline Feed
  function renderCourses() {
    feed.innerHTML = '';

    TASTING_COURSES.forEach((c) => {
      const card = document.createElement('article');
      card.className = `tasting-course-card ${c.type}`;
      card.id = `courseCard-${c.id}`;
      card.setAttribute('data-id', c.id);
      card.setAttribute('data-type', c.type);

      const isHidden = (activeFilter === 'savory' && c.type !== 'savory') ||
                       (activeFilter === 'sweet' && c.type !== 'sweet');
      if (isHidden) {
        card.classList.add('hidden-course');
      }

      card.innerHTML = `
        <!-- Timeline Connector Node -->
        <div class="timeline-node-pin">
          <span class="node-ring"></span>
          <span class="node-num">${c.roman}</span>
        </div>

        <div class="course-card-inner">
          <div class="course-card-header" id="courseHeader-${c.id}" tabindex="0" role="button" aria-expanded="false" aria-controls="courseDrawer-${c.id}">
            <div class="course-dish-media">
              <span class="dish-emoji" aria-hidden="true">${c.emoji}</span>
              <span class="course-index-tag">ACTE ${c.roman}</span>
            </div>

            <div class="course-title-col">
              <div class="course-meta-tags">
                <span class="course-stage-badge">${c.stage}</span>
                <span class="course-provenance-badge">📍 ${c.provenance}</span>
              </div>
              <h3 class="course-title-fr">${c.titleFr}</h3>
              <h4 class="course-title-en">${c.titleEn}</h4>
              <p class="course-brief-desc">${c.description}</p>
            </div>

            <div class="course-header-actions">
              <button type="button" class="course-expand-btn" aria-label="Toggle Chef Gabriel's inspiration notes for Course ${c.roman}">
                <span class="expand-text">Inspiration &amp; Wine Pairing</span>
                <span class="expand-chevron" aria-hidden="true">▼</span>
              </button>
            </div>
          </div>

          <!-- Expandable Details Drawer -->
          <div class="course-drawer" id="courseDrawer-${c.id}" hidden>
            <div class="drawer-divider"></div>

            <div class="drawer-content-grid">
              <!-- Chef's Inspiration Story -->
              <div class="chef-inspiration-box">
                <div class="box-kicker">
                  <span class="chef-toque">👨‍🍳</span>
                  <span>CHEF GABRIEL LAURENT &mdash; HISTOIRE &amp; INSPIRATION</span>
                </div>
                <blockquote class="chef-quote">
                  <span class="quote-mark open">“</span>
                  ${c.chefInspiration}
                  <span class="quote-mark close">”</span>
                </blockquote>
                <div class="chef-signature">
                  <em>&mdash; Gabriel Laurent, Chef de Cuisine</em>
                </div>
              </div>

              <!-- Sommelier Wine Pairing Box -->
              <div class="wine-pairing-box">
                <div class="box-kicker wine-kicker">
                  <span class="wine-glass-icon">🍷</span>
                  <span>ACCORD METS &amp; VINS &bull; SOMMELIER CRU PAIRING</span>
                  <span class="flight-tag" hidden>✨ Active Flight Included</span>
                </div>
                <div class="wine-bottle-name">${c.winePairing.wine}</div>
                <div class="wine-appellation">AOC ${c.winePairing.region}</div>
                <p class="wine-tasting-notes">${c.winePairing.notes}</p>
                <div class="wine-serving-temp">
                  <span>Optimal Cellar Temperature: <strong>${c.winePairing.temp}</strong></span>
                </div>
                <button type="button" class="btn-wine-radar-trigger" onclick="openWineRadarModal(${c.id})">
                  <span>🍷 Sommelier Flavor Radar &amp; Terroir Notes ↗</span>
                </button>
              </div>
            </div>

            <!-- Sensory & Dietary Highlights Footer -->
            <div class="course-sensory-bar">
              <div class="sensory-metrics">
                <div class="metric-item">
                  <span class="metric-label">Acidity</span>
                  <div class="metric-meter"><div class="meter-bar" style="width: ${c.sensory.acidity}%;"></div></div>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Richness</span>
                  <div class="metric-meter"><div class="meter-bar" style="width: ${c.sensory.richness}%;"></div></div>
                </div>
                <div class="metric-item">
                  <span class="metric-label">Complexity</span>
                  <div class="metric-meter"><div class="meter-bar" style="width: ${c.sensory.complexity}%;"></div></div>
                </div>
              </div>

              <div class="dietary-notices">
                <span class="dietary-title">Allergens:</span>
                ${c.allergens.map(a => `<span class="allergen-pill">${a}</span>`).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      // Event listener to toggle drawer
      const header = card.querySelector('.course-card-header');
      const expandBtn = card.querySelector('.course-expand-btn');

      function toggle() {
        const isCurrentlyExpanded = card.classList.contains('expanded');
        setCourseExpanded(c.id, !isCurrentlyExpanded);
      }

      header.addEventListener('click', (e) => {
        if (!e.target.closest('.course-expand-btn')) {
          toggle();
        }
      });
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });

      // Keyboard accessibility
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });

      feed.appendChild(card);
    });
  }

  function setCourseExpanded(courseId, expand) {
    const card = byId(`courseCard-${courseId}`);
    const header = byId(`courseHeader-${courseId}`);
    const drawer = byId(`courseDrawer-${courseId}`);
    if (!card || !header || !drawer) return;

    if (expand) {
      card.classList.add('expanded');
      header.setAttribute('aria-expanded', 'true');
      drawer.hidden = false;
      const chevron = header.querySelector('.expand-chevron');
      if (chevron) chevron.textContent = '▲';
    } else {
      card.classList.remove('expanded');
      header.setAttribute('aria-expanded', 'false');
      drawer.hidden = true;
      const chevron = header.querySelector('.expand-chevron');
      if (chevron) chevron.textContent = '▼';
    }
  }

  function scrollToCourse(courseId) {
    // Update Stepper active state
    document.querySelectorAll('.stepper-node').forEach((node) => {
      const match = node.getAttribute('data-course-id') === String(courseId);
      node.classList.toggle('active', match);
    });

    const card = byId(`courseCard-${courseId}`);
    if (card) {
      if (card.classList.contains('hidden-course')) {
        // Switch filter to 'all' if the selected course was hidden
        setFilter('all');
      }
      setCourseExpanded(courseId, true);
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('pulse-highlight');
      setTimeout(() => card.classList.remove('pulse-highlight'), 1600);
    }
  }

  function setFilter(type) {
    activeFilter = type;
    document.querySelectorAll('.course-filter-btn').forEach((btn) => {
      const match = btn.getAttribute('data-filter') === type;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match ? 'true' : 'false');
    });

    TASTING_COURSES.forEach((c) => {
      const card = byId(`courseCard-${c.id}`);
      const step = byId(`stepperNode-${c.id}`);
      const hide = (type === 'savory' && c.type !== 'savory') ||
                   (type === 'sweet' && c.type !== 'sweet');
      if (card) card.classList.toggle('hidden-course', hide);
      if (step) step.classList.toggle('stepper-dimmed', hide);
    });
  }

  // Filter Buttons
  document.querySelectorAll('.course-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilter(btn.getAttribute('data-filter'));
    });
  });

  // Expand / Collapse All Stories Toggle
  const expandAllBtn = byId('expandAllCoursesBtn');
  const toggleAllLabel = byId('toggleAllLabel');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      allExpanded = !allExpanded;
      TASTING_COURSES.forEach((c) => {
        setCourseExpanded(c.id, allExpanded);
      });
      if (toggleAllLabel) {
        toggleAllLabel.textContent = allExpanded ? 'Collapse All Stories' : 'Expand All Stories';
      }
      expandAllBtn.querySelector('.icon').textContent = allExpanded ? '📕' : '📖';
    });
  }

  // Wine Pairing Flight Toggle
  const wineToggle = byId('wineFlightToggle');
  const wineFlightState = byId('wineFlightState');
  if (wineToggle) {
    wineToggle.addEventListener('click', () => {
      wineFlightActive = !wineFlightActive;
      wineToggle.setAttribute('aria-pressed', String(wineFlightActive));
      wineToggle.classList.toggle('active', wineFlightActive);
      feed.classList.toggle('wine-flight-active', wineFlightActive);
      if (wineFlightState) {
        wineFlightState.textContent = wineFlightActive ? 'Active (+€95)' : 'Off';
      }
      document.querySelectorAll('.flight-tag').forEach(tag => {
        tag.hidden = !wineFlightActive;
      });
    });
  }

  // Initial Render
  renderStepper();
  renderCourses();
  // Auto-expand Course 1 for immediate delightful preview
  setCourseExpanded(1, true);
}

window.TASTING_COURSES = TASTING_COURSES;
window.initTastingMenuTimeline = initTastingMenuTimeline;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTastingMenuTimeline);
} else {
  initTastingMenuTimeline();
}

// ==========================================================================
// Sommelier Wine Pairing Guide & Flavor Radar Polygon Wheel (Issue #445)
// ==========================================================================

const RADAR_AXES = [
  { key: 'tannin', label: 'Tannins' },
  { key: 'acidity', label: 'Acidity' },
  { key: 'body', label: 'Body' },
  { key: 'sweetness', label: 'Sweetness' },
  { key: 'fruit', label: 'Fruit' }
];

function calculateRadarPoints(flavorProfile = {}, cx = 170, cy = 155, radius = 100) {
  return RADAR_AXES.map((axis, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
    const val = Math.max(0, Math.min(100, Number(flavorProfile[axis.key]) || 0));
    const r = (val / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      val,
      label: axis.label
    };
  });
}

function renderWineRadarSvg(flavorProfile = {}) {
  const cx = 170;
  const cy = 155;
  const radius = 100;
  const numAxes = RADAR_AXES.length;

  const gridEl = byId('wineRadarGrid');
  const polyEl = byId('wineRadarPolygon');
  const pointsEl = byId('wineRadarPoints');
  const labelsEl = byId('wineRadarLabels');

  if (!polyEl) return;

  // Grid concentric webs
  if (gridEl) {
    const levels = [0.25, 0.5, 0.75, 1.0];
    const webs = levels.map(level => {
      const ringPts = RADAR_AXES.map((_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
        const r = radius * level;
        return `${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`;
      }).join(' ');
      return `<polygon points="${ringPts}" class="radar-grid-web" />`;
    });

    const axisSpokes = RADAR_AXES.map((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
      const x2 = cx + radius * Math.cos(angle);
      const y2 = cy + radius * Math.sin(angle);
      return `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="radar-grid-spoke" />`;
    });

    gridEl.innerHTML = webs.join('') + axisSpokes.join('');
  }

  // Calculate points
  const points = calculateRadarPoints(flavorProfile, cx, cy, radius);
  const pointsStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  polyEl.setAttribute('points', pointsStr);

  if (pointsEl) {
    pointsEl.innerHTML = points.map(p => 
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" class="radar-data-dot" />`
    ).join('');
  }

  if (labelsEl) {
    labelsEl.innerHTML = RADAR_AXES.map((axis, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / numAxes;
      const labelRadius = radius + 22;
      const lx = cx + labelRadius * Math.cos(angle);
      const ly = cy + labelRadius * Math.sin(angle) + 4;
      const anchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : (Math.cos(angle) > 0 ? 'start' : 'end');
      return `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" class="radar-axis-label">${axis.label}</text>`;
    }).join('');
  }
}

function openWineRadarModal(courseId = 1) {
  const course = TASTING_COURSES.find(c => c.id === Number(courseId)) || TASTING_COURSES[0];
  const backdrop = byId('sommelierModalBackdrop');
  if (!backdrop) return;

  // Render tabs
  const tabsContainer = byId('sommelierCourseTabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = TASTING_COURSES.map(c => `
      <button type="button" role="tab" class="sommelier-tab-btn ${c.id === course.id ? 'active' : ''}" 
        aria-selected="${c.id === course.id}" onclick="openWineRadarModal(${c.id})">
        <span class="tab-roman">${c.roman}</span>
        <span class="tab-course-name">${c.stage}</span>
      </button>
    `).join('');
  }

  // Populate Wine Card Details
  if (byId('wineTitle')) byId('wineTitle').textContent = course.winePairing.wine;
  if (byId('wineRegionTag')) byId('wineRegionTag').textContent = `AOC ${course.winePairing.region}`;
  if (byId('wineMatchedCourse')) byId('wineMatchedCourse').textContent = `Course ${course.roman}: ${course.titleEn}`;
  if (byId('wineSommelierNotes')) byId('wineSommelierNotes').textContent = course.winePairing.notes;
  if (byId('wineServingTemp')) byId('wineServingTemp').textContent = course.winePairing.temp;
  if (byId('wineVarietal')) byId('wineVarietal').textContent = course.winePairing.varietal || 'N/A';
  if (byId('wineTerroir')) byId('wineTerroir').textContent = course.winePairing.terroir || 'Terroir Privé';

  // Render Radar
  renderWineRadarSvg(course.winePairing.flavorProfile);

  // Render Metrics Chips
  const chipsContainer = byId('radarMetricsChips');
  if (chipsContainer) {
    chipsContainer.innerHTML = RADAR_AXES.map(a => {
      const val = course.winePairing.flavorProfile[a.key] || 0;
      return `
        <div class="radar-metric-chip">
          <span class="chip-label">${a.label}</span>
          <div class="chip-bar-bg"><div class="chip-bar-fill" style="width: ${val}%"></div></div>
          <span class="chip-val">${val}%</span>
        </div>
      `;
    }).join('');
  }

  backdrop.hidden = false;
  document.body.classList.add('sommelier-modal-open');
}

function closeWineRadarModal() {
  const backdrop = byId('sommelierModalBackdrop');
  if (backdrop) backdrop.hidden = true;
  document.body.classList.remove('sommelier-modal-open');
}

function initSommelierModalListeners() {
  const closeBtn = byId('closeSommelierDrawer');
  const backdrop = byId('sommelierModalBackdrop');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeWineRadarModal);
  }
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeWineRadarModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop && !backdrop.hidden) {
      closeWineRadarModal();
    }
  });
}

window.RADAR_AXES = RADAR_AXES;
window.calculateRadarPoints = calculateRadarPoints;
window.renderWineRadarSvg = renderWineRadarSvg;
window.openWineRadarModal = openWineRadarModal;
window.closeWineRadarModal = closeWineRadarModal;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSommelierModalListeners);
} else {
  initSommelierModalListeners();
}


// ==========================================================================
// Kitchen Display System (KDS) & Rush Order Queue Manager Engine
// Calculates course prep lead times, station routing, and fire dispatching
// ==========================================================================
function initKitchenDisplaySystem() {
  const modal = byId('kdsModal');
  const openBtn = byId('openKdsBtn');
  const closeBtn = byId('kdsCloseBtn');
  const backdrop = byId('kdsBackdrop');
  if (!modal || !openBtn) return;

  const ticketsContainer = byId('kdsTicketsContainer');
  const activeCountEl = byId('kdsActiveCount');
  const avgTimeEl = byId('kdsAvgTime');
  const clockEl = byId('kdsClock');
  const soundToggle = byId('kdsSoundToggle');
  const soundIcon = byId('kdsSoundIcon');
  const soundText = byId('kdsSoundText');
  const addRushBtn = byId('kdsAddRushBtn');
  const courseSelect = byId('kdsCourseSelect');
  const statusNote = byId('kdsStatusNote');
  const stationTabs = document.querySelectorAll('.kds-station-tab');

  let soundEnabled = true;
  let activeStation = 'all';
  let activeCourseFilter = 'all';
  let ticketSequence = 105;

  // Realistic sample dining tickets
  let tickets = [
    {
      id: 'T-101',
      table: 'TABLE 04',
      guests: 2,
      server: 'Julien',
      rush: false,
      elapsedSeconds: 180, // 3m (Green)
      courses: [
        {
          name: 'Appetizer',
          status: 'ready', // ready, cooking, held
          items: [
            { name: 'Hamachi Crudo', station: 'garde-manger', mod: 'Extra citrus gel' },
            { name: 'Brittany Lobster Bisque', station: 'garde-manger', mod: '' }
          ]
        },
        {
          name: 'Entrée',
          status: 'cooking',
          items: [
            { name: 'Seared Wagyu Ribeye', station: 'grill', mod: 'Medium-Rare, Truffle sauce' },
            { name: 'Canard de Challans', station: 'grill', mod: 'Cherry reduction' }
          ]
        },
        {
          name: 'Dessert',
          status: 'held',
          items: [
            { name: 'Soufflé Grand Marnier', station: 'pastry', mod: 'Hot chocolate pitcher' }
          ]
        }
      ]
    },
    {
      id: 'T-102',
      table: 'TABLE 12 (VIP)',
      guests: 4,
      server: 'Camille',
      rush: true,
      elapsedSeconds: 680, // 11m (Red flash)
      courses: [
        {
          name: 'Appetizer',
          status: 'ready',
          items: [
            { name: 'Perigord Black Truffle Tartare', station: 'garde-manger', mod: 'Gluten-Free tuile' },
            { name: 'Hamachi Crudo', station: 'garde-manger', mod: '' }
          ]
        },
        {
          name: 'Entrée',
          status: 'cooking',
          items: [
            { name: 'A5 Miyazaki Wagyu', station: 'grill', mod: 'Rare • Rush expedite' },
            { name: 'Rack of Pyrenees Lamb', station: 'grill', mod: 'Herb crust' }
          ]
        },
        {
          name: 'Dessert',
          status: 'held',
          items: [
            { name: 'Mille-Feuille Croustillant', station: 'pastry', mod: 'Tahitian vanilla' }
          ]
        }
      ]
    },
    {
      id: 'T-103',
      table: 'TABLE 07',
      guests: 2,
      server: 'Marc',
      rush: false,
      elapsedSeconds: 420, // 7m (Amber)
      courses: [
        {
          name: 'Appetizer',
          status: 'cooking',
          items: [
            { name: 'Lobster Bisque', station: 'garde-manger', mod: 'Extra saffron' }
          ]
        },
        {
          name: 'Entrée',
          status: 'held',
          items: [
            { name: 'Wild Turbot Meunière', station: 'grill', mod: 'Caper butter' }
          ]
        },
        {
          name: 'Dessert',
          status: 'held',
          items: [
            { name: 'Tarte Tatin Caramélisée', station: 'pastry', mod: 'Crème fraîche' }
          ]
        }
      ]
    },
    {
      id: 'T-104',
      table: 'TABLE 02',
      guests: 1,
      server: 'Sophie',
      rush: false,
      elapsedSeconds: 95, // 1.5m (Green)
      courses: [
        {
          name: 'Appetizer',
          status: 'cooking',
          items: [
            { name: 'Hamachi Crudo', station: 'garde-manger', mod: '' }
          ]
        },
        {
          name: 'Entrée',
          status: 'held',
          items: [
            { name: 'Seared Wagyu Ribeye', station: 'grill', mod: 'Medium' }
          ]
        }
      ]
    }
  ];

  // Play realistic kitchen order bell chime using Web Audio API
  function playKitchenChime(isRush) {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isRush ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isRush ? 880 : 660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isRush ? 1320 : 990, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  // Update clock every second
  function updateClock() {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toTimeString().split(' ')[0];
  }
  setInterval(updateClock, 1000);
  updateClock();

  // Elapsed cooking timer progression loop (every 1 second)
  setInterval(() => {
    tickets.forEach(t => { t.elapsedSeconds += 1; });
    renderTickets();
    updateStationCounts();
  }, 1000);

  function formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getTimerClass(sec, isRush) {
    if (isRush || sec >= 600) return 'red'; // >= 10m
    if (sec >= 300) return 'amber';        // 5-10m
    return 'green';                         // < 5m
  }

  function updateStationCounts() {
    let countAll = 0;
    let countGrill = 0;
    let countGarde = 0;
    let countPastry = 0;

    tickets.forEach(ticket => {
      countAll++;
      ticket.courses.forEach(c => {
        if (c.status === 'cooking' || c.status === 'held') {
          c.items.forEach(it => {
            if (it.station === 'grill') countGrill++;
            if (it.station === 'garde-manger') countGarde++;
            if (it.station === 'pastry') countPastry++;
          });
        }
      });
    });

    const elAll = byId('countAll');
    const elGrill = byId('countGrill');
    const elGarde = byId('countGarde');
    const elPastry = byId('countPastry');
    if (elAll) elAll.textContent = String(countAll);
    if (elGrill) elGrill.textContent = String(countGrill);
    if (elGarde) elGarde.textContent = String(countGarde);
    if (elPastry) elPastry.textContent = String(countPastry);

    if (activeCountEl) activeCountEl.textContent = String(tickets.length);
    if (avgTimeEl) {
      if (tickets.length === 0) {
        avgTimeEl.textContent = '0 min';
      } else {
        const total = tickets.reduce((acc, t) => acc + t.elapsedSeconds, 0);
        avgTimeEl.textContent = `${(total / tickets.length / 60).toFixed(1)} min`;
      }
    }
  }

  function renderTickets() {
    if (!ticketsContainer) return;

    // Filter tickets based on activeStation and activeCourseFilter
    const filtered = tickets.filter(ticket => {
      if (activeCourseFilter !== 'all') {
        const hasCourse = ticket.courses.some(c => c.name.toLowerCase() === activeCourseFilter.toLowerCase());
        if (!hasCourse) return false;
      }
      if (activeStation !== 'all') {
        const hasStation = ticket.courses.some(c =>
          c.items.some(it => it.station === activeStation)
        );
        if (!hasStation) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      ticketsContainer.innerHTML = '<div style="color:#94a3b8; font-size:0.95rem; padding:40px; text-align:center; width:100%;">✨ All tickets bumped! Kitchen queue clear. Click "Add Rush Ticket" to simulate incoming dining orders.</div>';
      return;
    }

    ticketsContainer.innerHTML = '';

    filtered.forEach(ticket => {
      const timerCls = getTimerClass(ticket.elapsedSeconds, ticket.rush);
      const ticketEl = document.createElement('div');
      ticketEl.className = `kds-ticket ${ticket.rush ? 'rush' : ''}`;
      ticketEl.setAttribute('data-id', ticket.id);

      // Clip + Head
      const clip = document.createElement('div');
      clip.className = 'kds-ticket-clip';

      const head = document.createElement('div');
      head.className = 'kds-ticket-head';
      head.innerHTML = `
        <div class="kds-table-row">
          <span class="kds-table-no">${ticket.table}</span>
          <span class="kds-timer-badge ${timerCls}">
            ⏱ ${formatTime(ticket.elapsedSeconds)}
          </span>
        </div>
        <div class="kds-meta-row">
          <span>${ticket.id} • ${ticket.guests} Guests</span>
          <span>Server: ${ticket.server}</span>
        </div>
      `;

      // Body (Courses)
      const body = document.createElement('div');
      body.className = 'kds-ticket-body';

      ticket.courses.forEach((course) => {
        const courseBlock = document.createElement('div');
        courseBlock.className = 'kds-course-block';

        const cHead = document.createElement('div');
        cHead.className = 'kds-course-header';
        cHead.innerHTML = `
          <span>${course.name.toUpperCase()}</span>
          <span class="kds-course-state ${course.status}">${course.status.toUpperCase()}</span>
        `;
        courseBlock.appendChild(cHead);

        const itemsUl = document.createElement('ul');
        itemsUl.className = 'kds-items-list';

        course.items.forEach(item => {
          // If station filter active, optionally highlight
          const isCurrentStation = activeStation === 'all' || item.station === activeStation;
          const li = document.createElement('li');
          li.className = 'kds-item-row';
          li.style.opacity = isCurrentStation ? '1' : '0.4';
          li.innerHTML = `
            <div>
              <span class="kds-item-name">${item.name}</span>
              ${item.mod ? `<div class="kds-item-mod">★ ${item.mod}</div>` : ''}
            </div>
            <span class="kds-station-tag ${item.station}">${item.station.toUpperCase()}</span>
          `;
          itemsUl.appendChild(li);
        });

        courseBlock.appendChild(itemsUl);
        body.appendChild(courseBlock);
      });

      // Footer Actions
      const foot = document.createElement('div');
      foot.className = 'kds-ticket-footer';

      // Check if there is a next course to fire
      const nextHeldIdx = ticket.courses.findIndex(c => c.status === 'held');
      const hasCooking = ticket.courses.some(c => c.status === 'cooking');

      const fireBtn = document.createElement('button');
      fireBtn.type = 'button';
      fireBtn.className = 'kds-ticket-btn fire-btn';
      if (nextHeldIdx !== -1) {
        fireBtn.textContent = `🔥 Fire ${ticket.courses[nextHeldIdx].name}`;
        fireBtn.onclick = () => {
          ticket.courses[nextHeldIdx].status = 'cooking';
          playKitchenChime(true);
          statusNote.textContent = `[${ticket.table}] Fired course: ${ticket.courses[nextHeldIdx].name}! Stations alerted.`;
          renderTickets();
          updateStationCounts();
        };
      } else if (hasCooking) {
        fireBtn.textContent = '🍽️ Plating Course';
        fireBtn.onclick = () => {
          const cookIdx = ticket.courses.findIndex(c => c.status === 'cooking');
          if (cookIdx !== -1) {
            ticket.courses[cookIdx].status = 'ready';
            playKitchenChime(false);
            statusNote.textContent = `[${ticket.table}] Plated course: ${ticket.courses[cookIdx].name}! Ready for service runner.`;
            renderTickets();
            updateStationCounts();
          }
        };
      } else {
        fireBtn.textContent = 'All Plated';
        fireBtn.disabled = true;
      }

      const bumpBtn = document.createElement('button');
      bumpBtn.type = 'button';
      bumpBtn.className = 'kds-ticket-btn bump-btn';
      bumpBtn.textContent = '✓ Bump Ticket';
      bumpBtn.onclick = () => {
        tickets = tickets.filter(t => t.id !== ticket.id);
        playKitchenChime(false);
        statusNote.textContent = `[${ticket.table}] Ticket ${ticket.id} bumped & archived to POS history.`;
        renderTickets();
        updateStationCounts();
      };

      foot.appendChild(fireBtn);
      foot.appendChild(bumpBtn);

      ticketEl.appendChild(clip);
      ticketEl.appendChild(head);
      ticketEl.appendChild(body);
      ticketEl.appendChild(foot);

      ticketsContainer.appendChild(ticketEl);
    });
  }

  // Open & Close Modal
  function openKds() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    renderTickets();
    updateStationCounts();
  }

  function closeKds() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openKds);
  closeBtn.addEventListener('click', closeKds);
  backdrop.addEventListener('click', closeKds);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) {
      closeKds();
    }
  });

  // Sound Toggle
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggle.setAttribute('aria-pressed', String(soundEnabled));
    soundIcon.textContent = soundEnabled ? '🔔' : '🔕';
    soundText.textContent = soundEnabled ? 'Chime ON' : 'Chime MUTED';
    statusNote.textContent = soundEnabled ? 'Kitchen order chimes unmuted.' : 'Kitchen order chimes muted.';
  });

  // Station Filter Tabs
  stationTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      stationTabs.forEach(t => {
        const isSelected = (t === tab);
        t.classList.toggle('active', isSelected);
        t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      activeStation = tab.getAttribute('data-station') || 'all';
      renderTickets();
    });
  });

  // Course Filter Select
  courseSelect.addEventListener('change', (e) => {
    activeCourseFilter = e.target.value;
    renderTickets();
  });

  // Add Rush Ticket Simulation
  addRushBtn.addEventListener('click', () => {
    ticketSequence++;
    const tableNum = Math.floor(Math.random() * 15) + 1;
    const servers = ['Élodie', 'Antoine', 'Lucas', 'Béatrice'];
    const serverName = servers[Math.floor(Math.random() * servers.length)];

    const newTicket = {
      id: `T-${ticketSequence}`,
      table: `TABLE ${String(tableNum).padStart(2, '0')} (RUSH)`,
      guests: Math.floor(Math.random() * 3) + 2,
      server: serverName,
      rush: true,
      elapsedSeconds: 0,
      courses: [
        {
          name: 'Appetizer',
          status: 'cooking',
          items: [
            { name: 'Hamachi Crudo', station: 'garde-manger', mod: 'Allergy alert: Sesame' },
            { name: 'Brittany Lobster Bisque', station: 'garde-manger', mod: '' }
          ]
        },
        {
          name: 'Entrée',
          status: 'held',
          items: [
            { name: 'Seared Wagyu Ribeye', station: 'grill', mod: 'Medium rare' }
          ]
        },
        {
          name: 'Dessert',
          status: 'held',
          items: [
            { name: 'Soufflé Grand Marnier', station: 'pastry', mod: '' }
          ]
        }
      ]
    };

    tickets.unshift(newTicket);
    playKitchenChime(true);
    statusNote.textContent = `⚡ Rush order received for Table ${String(tableNum).padStart(2, '0')}! Added to expediter queue.`;
    renderTickets();
    updateStationCounts();
  });

  // Initial render
  renderTickets();
  updateStationCounts();
}

window.initKitchenDisplaySystem = initKitchenDisplaySystem;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initKitchenDisplaySystem);
} else {
  initKitchenDisplaySystem();
}

/**
 * ============================================================================
 * Issue #393: Artisanal Cocktail Mixology Lab with Flavor Balance Radar Chart
 * Computes Sweet, Bitter, Sour, and Boozy profiles dynamically and renders
 * an interactive SVG radar chart with French craft cocktail recipe cards.
 * ============================================================================
 */
(() => {
  const SPIRITS = {
    cognac: { id: 'cognac', name: 'Single-Barrel Cognac XO', abv: 42, icon: '🥃', sweet: 3.5, bitter: 2.0, sour: 1.0, boozy: 8.5, measure: '45ml (1.5 oz)', notes: 'Rich French oak and dried fig' },
    gin: { id: 'gin', name: 'Wild Botanical Gin', abv: 45, icon: '🍸', sweet: 1.5, bitter: 4.5, sour: 3.0, boozy: 8.0, measure: '45ml (1.5 oz)', notes: 'Crisp juniper and alpine angelica' },
    bourbon: { id: 'bourbon', name: 'Aged Kentucky Bourbon', abv: 47, icon: '🪵', sweet: 4.5, bitter: 3.0, sour: 1.5, boozy: 8.8, measure: '45ml (1.5 oz)', notes: 'Charred oak and caramel sweetness' },
    vodka: { id: 'vodka', name: 'French Wheat Vodka', abv: 40, icon: '🌾', sweet: 1.0, bitter: 1.0, sour: 1.5, boozy: 7.5, measure: '45ml (1.5 oz)', notes: 'Silky smooth with neutral clean finish' }
  };

  const MODIFIERS = {
    honey: { id: 'honey', name: 'Provencal Lavender Honey', icon: '🍯', sweet: 6.5, bitter: 0.5, sour: 0.5, boozy: 0.0, measure: '20ml (0.75 oz)', notes: 'Floral honey and velvety body' },
    lemon: { id: 'lemon', name: 'Meyer Lemon & Bergamot', icon: '🍋', sweet: 1.0, bitter: 1.5, sour: 7.5, boozy: 0.0, measure: '20ml (0.75 oz)', notes: 'Fragrant citrus zest and sharp acid' },
    elderflower: { id: 'elderflower', name: 'St. Germain Elderflower', icon: '🌸', sweet: 5.5, bitter: 0.5, sour: 1.0, boozy: 2.5, measure: '20ml (0.75 oz)', notes: 'White peach and blossom perfume' },
    espresso: { id: 'espresso', name: 'Cold-Brew Espresso Extraction', icon: '☕', sweet: 1.5, bitter: 6.0, sour: 1.0, boozy: 0.0, measure: '20ml (0.75 oz)', notes: 'Dark roasted cacao and dense crema' }
  };

  const BITTERS = {
    gentian: { id: 'gentian', name: 'Alpine Gentian & Peychaud', icon: '🌿', sweet: 0.5, bitter: 7.0, sour: 0.5, boozy: 1.0, measure: '3 dashes', notes: 'Herbaceous bitter bark and anise' },
    orange: { id: 'orange', name: 'Blood Orange & Cardamom', icon: '🍊', sweet: 1.5, bitter: 5.0, sour: 2.5, boozy: 1.0, measure: '3 dashes', notes: 'Spiced citrus rind and cardamom' },
    cacao: { id: 'cacao', name: 'Roasted Cacao & Vanilla', icon: '🍫', sweet: 2.5, bitter: 4.5, sour: 0.5, boozy: 1.0, measure: '3 dashes', notes: 'Bitter dark chocolate and warm bean' }
  };

  const PRESETS = {
    'parisian-boulevardier': {
      spirit: 'cognac',
      modifiers: ['honey'],
      bitters: 'gentian',
      name: 'The Parisian Boulevardier',
      glass: '🥃',
      category: 'Aristocratic Aperitif • 31% ABV',
      notes: 'An aristocratic harmony of oak-aged Cognac XO kissed with wild lavender honey and anchored by herbaceous Alpine gentian bitters.'
    },
    'botanical-bergamot-fizz': {
      spirit: 'gin',
      modifiers: ['lemon', 'elderflower'],
      bitters: 'orange',
      name: 'Botanical Bergamot Bloom',
      glass: '🍸',
      category: 'Fragrant French Fizz • 24% ABV',
      notes: 'Vibrant wild gin lifted with fresh Meyer lemon, elderflower perfume, and aromatic cardamom citrus mist.'
    },
    'smoked-bourbon-old-fashioned': {
      spirit: 'bourbon',
      modifiers: ['honey'],
      bitters: 'cacao',
      name: 'Smoked Cedar Reserve',
      glass: '🥃',
      category: 'Deep Evening Sipper • 35% ABV',
      notes: 'Rich charred bourbon sweetened with raw honey and rounded by warm roasted cacao and spiced vanilla bitters.'
    },
    'espresso-velvet-digestif': {
      spirit: 'vodka',
      modifiers: ['espresso', 'honey'],
      bitters: 'cacao',
      name: 'Espresso Noir Velvet',
      glass: '🍸',
      category: 'Midnight Digestif • 26% ABV',
      notes: 'Velvety wheat vodka layered with cold-brew espresso concentration and rich Venezuelan cacao.'
    }
  };

  function initMixologyLab() {
    const labSection = document.getElementById('mixologyLab');
    if (!labSection) return;

    // Elements
    const presetBtns = labSection.querySelectorAll('.mix-preset-btn');
    const spiritPills = labSection.querySelectorAll('.ing-pill[data-type="spirit"]');
    const modifierPills = labSection.querySelectorAll('.ing-pill[data-type="modifier"]');
    const bittersPills = labSection.querySelectorAll('.ing-pill[data-type="bitters"]');

    // Radar SVG elements
    const radarGrid = document.getElementById('mixRadarGrid');
    const radarPolygon = document.getElementById('mixRadarPolygon');
    const radarPoints = document.getElementById('mixRadarPoints');
    const radarLabels = document.getElementById('mixRadarLabels');

    // Displays
    const balanceTag = document.getElementById('mixologyBalanceTag');
    const valSweet = document.getElementById('valSweet');
    const valBitter = document.getElementById('valBitter');
    const valSour = document.getElementById('valSour');
    const valBoozy = document.getElementById('valBoozy');

    // Recipe Card
    const glassIcon = document.getElementById('recipeGlassIcon');
    const cocktailName = document.getElementById('recipeCocktailName');
    const categoryEl = document.getElementById('recipeCategory');
    const tastingNotes = document.getElementById('recipeTastingNotes');
    const pourList = document.getElementById('recipePourList');
    const shakeBtn = document.getElementById('btnMixShake');
    const resetBtn = document.getElementById('btnMixReset');
    const toast = document.getElementById('mixToast');

    // Lab State
    let selectedSpirit = 'cognac';
    let selectedModifiers = ['honey'];
    let selectedBitters = 'gentian';

    // SVG Geometry
    const CX = 170;
    const CY = 170;
    const MAX_R = 120;

    // 4 Axes: [Key, Label, Angle (Radians)]
    const AXES = [
      { key: 'sweet', label: 'Sweetness', angle: -Math.PI / 2 }, // Top
      { key: 'bitter', label: 'Bitterness', angle: 0 },          // Right
      { key: 'sour', label: 'Acidity', angle: Math.PI / 2 },     // Bottom
      { key: 'boozy', label: 'Spirit ABV', angle: Math.PI }      // Left
    ];

    function drawRadarBaseGrid() {
      radarGrid.replaceChildren();
      radarLabels.replaceChildren();

      // Draw concentric guide circles at 25%, 50%, 75%, 100%
      const levels = [0.25, 0.5, 0.75, 1.0];
      levels.forEach((lvl) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(CX));
        circle.setAttribute('cy', String(CY));
        circle.setAttribute('r', String(MAX_R * lvl));
        circle.setAttribute('fill', lvl === 1.0 ? 'rgba(0,0,0,0.2)' : 'none');
        circle.setAttribute('stroke', 'rgba(212, 175, 55, ' + (lvl === 1.0 ? '0.3' : '0.12') + ')');
        circle.setAttribute('stroke-dasharray', lvl === 1.0 ? 'none' : '3 3');
        radarGrid.appendChild(circle);
      });

      // Draw cross-axis lines and labels
      AXES.forEach((axis) => {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(CX));
        line.setAttribute('y1', String(CY));
        const endX = CX + Math.cos(axis.angle) * MAX_R;
        const endY = CY + Math.sin(axis.angle) * MAX_R;
        line.setAttribute('x2', String(endX));
        line.setAttribute('y2', String(endY));
        line.setAttribute('stroke', 'rgba(212, 175, 55, 0.25)');
        line.setAttribute('stroke-width', '1.5');
        radarGrid.appendChild(line);

        // Axis Label text
        const labelX = CX + Math.cos(axis.angle) * (MAX_R + 22);
        const labelY = CY + Math.sin(axis.angle) * (MAX_R + 18);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(labelX));
        text.setAttribute('y', String(labelY));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', '#d4af37');
        text.setAttribute('font-family', 'Plus Jakarta Sans, sans-serif');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '700');
        text.setAttribute('letter-spacing', '0.5');
        text.textContent = axis.label.toUpperCase();
        radarLabels.appendChild(text);
      });
    }

    function calculateFlavorProfile() {
      const spirit = SPIRITS[selectedSpirit];
      const bitters = BITTERS[selectedBitters];
      const mods = selectedModifiers.map((id) => MODIFIERS[id]).filter(Boolean);

      let totalSweet = spirit.sweet + bitters.sweet;
      let totalBitter = spirit.bitter + bitters.bitter;
      let totalSour = spirit.sour + bitters.sour;
      let totalBoozy = spirit.boozy + bitters.boozy;

      mods.forEach((m) => {
        totalSweet += m.sweet;
        totalBitter += m.bitter;
        totalSour += m.sour;
        totalBoozy += m.boozy;
      });

      // Clamp metrics 1.0 to 10.0
      const sweet = Math.min(10.0, Math.max(1.0, totalSweet));
      const bitter = Math.min(10.0, Math.max(1.0, totalBitter));
      const sour = Math.min(10.0, Math.max(1.0, totalSour));
      const boozy = Math.min(10.0, Math.max(1.0, totalBoozy));

      return { sweet, bitter, sour, boozy, spirit, bitters, mods };
    }

    function updateRadarChart(metrics) {
      const values = {
        sweet: metrics.sweet,
        bitter: metrics.bitter,
        sour: metrics.sour,
        boozy: metrics.boozy
      };

      // Numeric Displays
      valSweet.textContent = metrics.sweet.toFixed(1);
      valBitter.textContent = metrics.bitter.toFixed(1);
      valSour.textContent = metrics.sour.toFixed(1);
      valBoozy.textContent = metrics.boozy.toFixed(1);

      // Sensory Balance Tag
      if (metrics.bitter >= 6.5 && metrics.boozy >= 7.5) {
        balanceTag.textContent = 'Spirit-Forward & Bittersweet';
      } else if (metrics.sour >= 5.5) {
        balanceTag.textContent = 'Bright & Citrus-Refreshed';
      } else if (metrics.sweet >= 6.0) {
        balanceTag.textContent = 'Velvety & Dessert-Aromatic';
      } else {
        balanceTag.textContent = 'Harmonious Terroir Blend';
      }

      // Calculate Polygon points
      const points = [];
      radarPoints.replaceChildren();

      AXES.forEach((axis) => {
        const val = values[axis.key];
        const r = (val / 10.0) * MAX_R;
        const x = CX + Math.cos(axis.angle) * r;
        const y = CY + Math.sin(axis.angle) * r;
        points.push(x.toFixed(1) + ',' + y.toFixed(1));

        // Anchor dot on vertex
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x.toFixed(1));
        circle.setAttribute('cy', y.toFixed(1));
        circle.setAttribute('r', '4.5');
        circle.setAttribute('fill', '#d4af37');
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '1.5');
        radarPoints.appendChild(circle);
      });

      radarPolygon.setAttribute('points', points.join(' '));
    }

    function updateRecipeCard(profile) {
      const { spirit, bitters, mods } = profile;

      // Check if matches preset
      let matchedPreset = Object.values(PRESETS).find((p) => {
        if (p.spirit !== spirit.id || p.bitters !== bitters.id) return false;
        if (p.modifiers.length !== mods.length) return false;
        return p.modifiers.every((m) => mods.some((mod) => mod.id === m));
      });

      if (matchedPreset) {
        cocktailName.textContent = matchedPreset.name;
        glassIcon.textContent = matchedPreset.glass;
        categoryEl.textContent = matchedPreset.category;
        tastingNotes.textContent = matchedPreset.notes;
      } else {
        // Dynamic Bespoke Cocktail Name
        const nameAdj = profile.sour > 5 ? 'L’Agrume' : profile.bitter > 6 ? 'Le Noir' : 'L’Élixir';
        cocktailName.textContent = nameAdj + ' ' + spirit.name.split(' ')[1] + ' Bespoke';
        glassIcon.textContent = spirit.icon;
        categoryEl.textContent = 'Custom Bistro Creation • ~28% ABV';
        tastingNotes.textContent = `A customized artisanal creation marrying ${spirit.name} with ${mods.map((m) => m.name).join(' and ')}, accented by ${bitters.name}.`;
      }

      // Render Pour List (Safe DOM creation)
      pourList.replaceChildren();

      const items = [
        { name: spirit.name, measure: spirit.measure, icon: spirit.icon },
        ...mods.map((m) => ({ name: m.name, measure: m.measure, icon: m.icon })),
        { name: bitters.name, measure: bitters.measure, icon: bitters.icon }
      ];

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'pour-row';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = item.icon + ' ' + item.name;
        row.appendChild(nameSpan);

        const measSpan = document.createElement('span');
        measSpan.className = 'pour-measure';
        measSpan.textContent = item.measure;
        row.appendChild(measSpan);

        pourList.appendChild(row);
      });
    }

    function updateAll() {
      const profile = calculateFlavorProfile();
      updateRadarChart(profile);
      updateRecipeCard(profile);
    }

    // Event Listeners for Spirit Pills (Single choice)
    spiritPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        spiritPills.forEach((p) => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-checked', 'true');
        selectedSpirit = pill.getAttribute('data-id');
        presetBtns.forEach((b) => b.classList.remove('active'));
        updateAll();
      });
    });

    // Event Listeners for Modifier Pills (Up to 2 choices)
    modifierPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const id = pill.getAttribute('data-id');
        const isSelected = selectedModifiers.includes(id);

        if (isSelected) {
          if (selectedModifiers.length > 1) {
            selectedModifiers = selectedModifiers.filter((m) => m !== id);
            pill.classList.remove('active');
            pill.setAttribute('aria-pressed', 'false');
          }
        } else {
          if (selectedModifiers.length >= 2) {
            const removedId = selectedModifiers.shift();
            const removedPill = labSection.querySelector(`.ing-pill[data-id="${removedId}"]`);
            if (removedPill) {
              removedPill.classList.remove('active');
              removedPill.setAttribute('aria-pressed', 'false');
            }
          }
          selectedModifiers.push(id);
          pill.classList.add('active');
          pill.setAttribute('aria-pressed', 'true');
        }
        presetBtns.forEach((b) => b.classList.remove('active'));
        updateAll();
      });
    });

    // Event Listeners for Bitters Pills (Single choice)
    bittersPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        bittersPills.forEach((p) => {
          p.classList.remove('active');
          p.setAttribute('aria-checked', 'false');
        });
        pill.classList.add('active');
        pill.setAttribute('aria-checked', 'true');
        selectedBitters = pill.getAttribute('data-id');
        presetBtns.forEach((b) => b.classList.remove('active'));
        updateAll();
      });
    });

    // Event Listeners for Presets
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        presetBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const presetKey = btn.getAttribute('data-preset');
        const p = PRESETS[presetKey];
        if (!p) return;

        selectedSpirit = p.spirit;
        selectedModifiers = [...p.modifiers];
        selectedBitters = p.bitters;

        // Sync pill UI states
        spiritPills.forEach((pill) => {
          const match = pill.getAttribute('data-id') === selectedSpirit;
          pill.classList.toggle('active', match);
          pill.setAttribute('aria-checked', String(match));
        });

        modifierPills.forEach((pill) => {
          const match = selectedModifiers.includes(pill.getAttribute('data-id'));
          pill.classList.toggle('active', match);
          pill.setAttribute('aria-pressed', String(match));
        });

        bittersPills.forEach((pill) => {
          const match = pill.getAttribute('data-id') === selectedBitters;
          pill.classList.toggle('active', match);
          pill.setAttribute('aria-checked', String(match));
        });

        updateAll();
      });
    });

    // Shake & Pour Action
    shakeBtn.addEventListener('click', () => {
      const card = document.getElementById('mixRecipeCard');
      card.style.transform = 'scale(0.98)';
      shakeBtn.disabled = true;

      setTimeout(() => {
        card.style.transform = '';
        shakeBtn.disabled = false;
        toast.hidden = false;
        toast.textContent = `🍸 Poured & chilled into crystal glass! "${cocktailName.textContent}" served.`;
        setTimeout(() => {
          toast.hidden = true;
        }, 3500);
      }, 300);
    });

    // Reset Lab
    resetBtn.addEventListener('click', () => {
      const firstPreset = presetBtns[0];
      if (firstPreset) firstPreset.click();
    });

    // Initialize base SVG grid and render
    drawRadarBaseGrid();
    updateAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMixologyLab);
  } else {
    initMixologyLab();
  }
})();

/* ==========================================================================
   Issue #330: Seasonal Tasting Menu Wine Pairing Explorer
   ========================================================================== */
(function() {
  'use strict';

  const BASE_PRICE_PER_GUEST = 185.00;
  const SERVICE_RATE = 0.20;

  const COURSES = [
    {
      id: 'course-1',
      order: 'Course I',
      title: 'Hokkaido Scallop Crudo',
      sub: 'Crudo & Amuse-Bouche',
      desc: 'Thinly sliced Hokkaido scallop dressed with yuzu pearls, royal Oscietra caviar, and cold-pressed shiso oil.',
      pairings: {
        none: {
          id: 'c1-none',
          tier: 'none',
          tierLabel: 'No Wine',
          title: 'Filtered Artesian Mineral Water',
          appellation: 'House Still / Sparkling Springs',
          desc: 'Refreshing chilled palate cleanser with crisp effervescence.',
          tannins: 0,
          acidity: 1,
          finish: '5s Clean',
          temp: '4°C',
          surcharge: 0,
          icon: '💧'
        },
        classic: {
          id: 'c1-classic',
          tier: 'classic',
          tierLabel: 'Classic Sommelier',
          title: '2020 Domaine Huet Vouvray Sec "Le Haut-Lieu"',
          appellation: 'AOC Vouvray, Loire Valley, France',
          desc: 'Crisp green apple, quince, crushed flint minerality with razor-sharp Chenin Blanc acidity that electrifies the sweet scallop brine.',
          tannins: 1,
          acidity: 5,
          finish: '40s Crisp Mineral',
          temp: '9°C',
          surcharge: 24,
          icon: '🥂'
        },
        rare: {
          id: 'c1-rare',
          tier: 'rare',
          tierLabel: 'Rare Vintage Reserve',
          title: '2012 Krug Clos d\'Ambonnay Champagne Brut',
          appellation: 'Grand Cru Champagne, France',
          desc: 'Iconic single-walled Pinot Noir vineyard champagne. Toasted brioche, hazelnut praline, and micro-bubble saline tension of legendary depth.',
          tannins: 2,
          acidity: 5,
          finish: '60s Persistent Brioche',
          temp: '10°C',
          surcharge: 85,
          icon: '🍾'
        }
      }
    },
    {
      id: 'course-2',
      order: 'Course II',
      title: 'Hudson Valley Foie Gras Torchon',
      sub: 'Warm Appetizer',
      desc: 'Velvety torchon of foie gras, mission fig and port reduction, smoked fleur de sel, served with warm toasted milk brioche.',
      pairings: {
        none: {
          id: 'c2-none',
          tier: 'none',
          tierLabel: 'No Wine',
          title: 'Infused Spiced Fig & Rooibos Tea',
          appellation: 'Artisanal Herbal Brew',
          desc: 'Earthy warm rooibos infused with dried mission figs and orange peel.',
          tannins: 1,
          acidity: 2,
          finish: '10s Soft Warmth',
          temp: '65°C',
          surcharge: 0,
          icon: '🍵'
        },
        classic: {
          id: 'c2-classic',
          tier: 'classic',
          tierLabel: 'Classic Sommelier',
          title: '2018 Château d\'Yquem 1er Cru Supérieur Sauternes',
          appellation: 'AOC Sauternes, Bordeaux, France',
          desc: 'Candied apricot, honeysuckle, saffron, and botrytis orange peel balanced with vibrant citrus tension that cuts through rich foie gras.',
          tannins: 1,
          acidity: 4,
          finish: '55s Honeycomb & Citrus',
          temp: '11°C',
          surcharge: 38,
          icon: '🍯'
        },
        rare: {
          id: 'c2-rare',
          tier: 'rare',
          tierLabel: 'Rare Vintage Reserve',
          title: '2001 Château Guiraud 1er Cru Classé Sauternes',
          appellation: 'AOC Sauternes, Bordeaux (23-Year Library Cellar)',
          desc: 'A benchmark vintage displaying molten honeycomb, roasted macadamia, and caramelized Seville marmalade with sublime acidity.',
          tannins: 2,
          acidity: 4,
          finish: '70s Golden Caramel',
          temp: '12°C',
          surcharge: 110,
          icon: '🏆'
        }
      }
    },
    {
      id: 'course-3',
      order: 'Course III',
      title: 'Butter-Poached Brittany Blue Lobster',
      sub: 'Seafood Entrée',
      desc: 'Gently poached lobster tail in cultured seaweed butter, caramelized leek fondue, and bouillabaisse saffron emulsion.',
      pairings: {
        none: {
          id: 'c3-none',
          tier: 'none',
          tierLabel: 'No Wine',
          title: 'Sparkling Yuzu & Bergamot Soda',
          appellation: 'House Citrus Tonic',
          desc: 'Fine effervescence with aromatic bergamot oils and Japanese yuzu citrus.',
          tannins: 0,
          acidity: 4,
          finish: '10s Citrus Zest',
          temp: '5°C',
          surcharge: 0,
          icon: '🍋'
        },
        classic: {
          id: 'c3-classic',
          tier: 'classic',
          tierLabel: 'Classic Sommelier',
          title: '2020 Domaine Leflaive Puligny-Montrachet',
          appellation: 'AOC Puligny-Montrachet, Côte de Beaune, Burgundy',
          desc: 'Pure limestone chalk, white peach blossom, and delicate toasted brioche seamlessly integrated with rich lobster emulsion.',
          tannins: 1,
          acidity: 4,
          finish: '50s Mineral Blossom',
          temp: '12°C',
          surcharge: 45,
          icon: '🍷'
        },
        rare: {
          id: 'c3-rare',
          tier: 'rare',
          tierLabel: 'Rare Vintage Reserve',
          title: '2015 Domaine de la Romanée-Conti Montrachet Grand Cru',
          appellation: 'Grand Cru Montrachet, Burgundy, France',
          desc: 'The pinnacle of white Burgundy. Ornate layers of crushed hazelnut, white truffle, poached pear, and limitless energetic mineral drive.',
          tannins: 2,
          acidity: 5,
          finish: '90s Ethereal Silk',
          temp: '13°C',
          surcharge: 240,
          icon: '👑'
        }
      }
    },
    {
      id: 'course-4',
      order: 'Course IV',
      title: 'A5 Miyazaki Wagyu Ribcap',
      sub: 'Main Meat Entrée',
      desc: 'Charcoal-seared Japanese A5 Wagyu ribcap with Périgord black winter truffle pomme purée and 48-hour bone marrow demi-glace.',
      pairings: {
        none: {
          id: 'c4-none',
          tier: 'none',
          tierLabel: 'No Wine',
          title: 'Smoked Tart Cherry & Juniper Cordial',
          appellation: 'House Botanical Elixir',
          desc: 'De-alcoholized tart Morello cherry with roasted pine and smoked juniper notes.',
          tannins: 2,
          acidity: 3,
          finish: '15s Berry Tannin',
          temp: '14°C',
          surcharge: 0,
          icon: '🍒'
        },
        classic: {
          id: 'c4-classic',
          tier: 'classic',
          tierLabel: 'Classic Sommelier',
          title: '2017 Tenuta San Guido Sassicaia Bolgheri',
          appellation: 'DOC Bolgheri Sassicaia, Tuscany, Italy',
          desc: 'Cabernet Sauvignon with intense blackcurrant, wild cedarwood, crushed tobacco, and structured aristocratic tannins matching marbled wagyu.',
          tannins: 4,
          acidity: 4,
          finish: '60s Cedar & Espresso',
          temp: '16°C',
          surcharge: 55,
          icon: '🍷'
        },
        rare: {
          id: 'c4-rare',
          tier: 'rare',
          tierLabel: 'Rare Vintage Reserve',
          title: '2010 Château Margaux 1er Grand Cru Classé',
          appellation: 'AOC Margaux, Bordeaux, France',
          desc: 'Sensational vintage. Perfumed violets, black cassis, cigar box spice, and cashmere tannins delivering supreme elegance alongside black truffle.',
          tannins: 5,
          acidity: 4,
          finish: '80s Velvety Violet',
          temp: '17°C',
          surcharge: 290,
          icon: '🌟'
        }
      }
    },
    {
      id: 'course-5',
      order: 'Course V',
      title: 'Valrhona Grand Cru Dark Chocolate Sphere',
      sub: 'Dessert & Mignardises',
      desc: 'Warm smoked sea salt bourbon caramel poured over 70% Guanaja chocolate sphere, roasted cocoa nib tuile, and Madagascar vanilla bean cream.',
      pairings: {
        none: {
          id: 'c5-none',
          tier: 'none',
          tierLabel: 'No Wine',
          title: 'Single-Estate Ethiopian Yirgacheffe Pour-Over',
          appellation: 'Specialty Coffee Reserve',
          desc: 'Light-roast coffee with jasmine, bergamot, and dried dark stone fruit notes.',
          tannins: 1,
          acidity: 3,
          finish: '20s Cocoa Floral',
          temp: '68°C',
          surcharge: 0,
          icon: '☕'
        },
        classic: {
          id: 'c5-classic',
          tier: 'classic',
          tierLabel: 'Classic Sommelier',
          title: 'Taylor Fladgate 20-Year-Old Tawny Port',
          appellation: 'DOC Douro, Portugal',
          desc: 'Rich walnut, dried plum, butterscotch, and spicy oak aroma that harmonizes effortlessly with bitter chocolate and salted caramel.',
          tannins: 3,
          acidity: 3,
          finish: '45s Walnut & Caramel',
          temp: '15°C',
          surcharge: 22,
          icon: '🍷'
        },
        rare: {
          id: 'c5-rare',
          tier: 'rare',
          tierLabel: 'Rare Vintage Reserve',
          title: '1977 Quinta do Noval Vintage Port',
          appellation: 'DOC Douro, Portugal (Historic 1977 Declaration)',
          desc: 'Legendary declaration vintage. Molten dark raisins, cocoa bean, mahogany cedar, and infinite richness with seamless spirit integration.',
          tannins: 4,
          acidity: 4,
          finish: '75s Vintage Mahogany',
          temp: '16°C',
          surcharge: 130,
          icon: '🏺'
        }
      }
    }
  ];

  // State
  const selectedTiers = {
    'course-1': 'classic',
    'course-2': 'classic',
    'course-3': 'classic',
    'course-4': 'classic',
    'course-5': 'classic'
  };

  let partySize = 2;

  function initSeasonalTastingMenuExplorer() {
    const root = document.getElementById('seasonalTastingMenu');
    if (!root) return;

    const container = document.getElementById('tastingCoursesContainer');
    const partySelect = document.getElementById('pairingPartySelect');
    const popover = document.getElementById('sommNotesPopover');
    const closePopoverBtn = document.getElementById('btnClosePopover');
    const confirmBtn = document.getElementById('btnConfirmPairings');
    const confirmNotice = document.getElementById('tallyConfirmNotice');

    if (!container) return;

    // Party size listener
    if (partySelect) {
      partySelect.addEventListener('change', (e) => {
        partySize = parseInt(e.target.value, 10) || 2;
        updateTally();
      });
    }

    // Preset buttons
    const btnPresetNone = document.getElementById('btnPresetNone');
    const btnPresetClassic = document.getElementById('btnPresetClassic');
    const btnPresetRare = document.getElementById('btnPresetRare');
    const presetBtns = [btnPresetNone, btnPresetClassic, btnPresetRare].filter(Boolean);

    function applyGlobalPreset(presetKey) {
      COURSES.forEach((c) => {
        selectedTiers[c.id] = presetKey;
      });
      presetBtns.forEach((btn) => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === presetKey);
      });
      renderCourses();
      updateTally();
    }

    if (btnPresetNone) btnPresetNone.addEventListener('click', () => applyGlobalPreset('none'));
    if (btnPresetClassic) btnPresetClassic.addEventListener('click', () => applyGlobalPreset('classic'));
    if (btnPresetRare) btnPresetRare.addEventListener('click', () => applyGlobalPreset('rare'));

    // Close Popover listener
    if (closePopoverBtn && popover) {
      closePopoverBtn.addEventListener('click', () => {
        popover.hidden = true;
      });
    }

    // Dismiss popover on outside click
    document.addEventListener('click', (e) => {
      if (popover && !popover.hidden) {
        if (!popover.contains(e.target) && !e.target.closest('.btn-open-notes')) {
          popover.hidden = true;
        }
      }
    });

    // Confirm button listener
    if (confirmBtn && confirmNotice) {
      confirmBtn.addEventListener('click', () => {
        confirmNotice.hidden = false;
        confirmNotice.textContent = `✓ Reservation preferences saved: 5-Course Autumn Degustation for ${partySize} guests with custom cellar pairings.`;
        setTimeout(() => {
          confirmNotice.hidden = true;
        }, 5000);
      });
    }

    // Render course cards with safe DOM methods
    function renderCourses() {
      container.replaceChildren();

      COURSES.forEach((course) => {
        const card = document.createElement('article');
        card.className = 'course-card';
        card.setAttribute('data-course-id', course.id);

        // Header
        const head = document.createElement('div');
        head.className = 'course-card-head';

        const titleCol = document.createElement('div');
        const meta = document.createElement('div');
        meta.className = 'course-meta';

        const orderPill = document.createElement('span');
        orderPill.className = 'course-order-pill';
        orderPill.textContent = course.order;

        const subSpan = document.createElement('span');
        subSpan.className = 'course-sub-label';
        subSpan.style.fontSize = '0.8rem';
        subSpan.style.color = '#9ca3af';
        subSpan.textContent = course.sub;

        meta.appendChild(orderPill);
        meta.appendChild(subSpan);

        const dishTitle = document.createElement('h3');
        dishTitle.className = 'course-dish-name';
        dishTitle.textContent = course.title;

        titleCol.appendChild(meta);
        titleCol.appendChild(dishTitle);
        head.appendChild(titleCol);

        // Description
        const descP = document.createElement('p');
        descP.className = 'course-dish-desc';
        descP.textContent = course.desc;

        // Pairing Controls (pills)
        const controls = document.createElement('div');
        controls.className = 'course-pairing-controls';

        const tierLbl = document.createElement('span');
        tierLbl.className = 'course-tier-label';
        tierLbl.textContent = 'Pairing Option';
        controls.appendChild(tierLbl);

        const pillGroup = document.createElement('div');
        pillGroup.className = 'course-pill-toggles';

        const currentTier = selectedTiers[course.id] || 'classic';

        ['none', 'classic', 'rare'].forEach((tierKey) => {
          const wine = course.pairings[tierKey];
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'pairing-choice-pill' + (currentTier === tierKey ? ' selected' : '');
          pill.setAttribute('data-tier', tierKey);
          pill.setAttribute('aria-pressed', currentTier === tierKey ? 'true' : 'false');

          const iconSpan = document.createElement('span');
          iconSpan.textContent = wine.icon;
          const labelSpan = document.createElement('span');
          labelSpan.textContent = wine.tierLabel;

          const priceSpan = document.createElement('span');
          priceSpan.className = 'choice-price';
          priceSpan.textContent = wine.surcharge === 0 ? '($0)' : `(+$${wine.surcharge})`;

          pill.appendChild(iconSpan);
          pill.appendChild(labelSpan);
          pill.appendChild(priceSpan);

          pill.addEventListener('click', () => {
            selectedTiers[course.id] = tierKey;
            checkPresetStatus();
            renderCourses();
            updateTally();
          });

          pillGroup.appendChild(pill);
        });
        controls.appendChild(pillGroup);

        // Active wine highlight box
        const activeWine = course.pairings[currentTier];
        const wineBox = document.createElement('div');
        wineBox.className = 'active-wine-box';

        const wineInfo = document.createElement('div');
        wineInfo.className = 'wine-box-info';

        const wineIcon = document.createElement('div');
        wineIcon.className = 'wine-icon-badge';
        wineIcon.textContent = activeWine.icon;

        const nameCol = document.createElement('div');
        nameCol.className = 'wine-name-appellation';

        const wineName = document.createElement('strong');
        wineName.className = 'active-wine-name';
        wineName.textContent = activeWine.title;

        const wineApp = document.createElement('span');
        wineApp.className = 'active-wine-appellation';
        wineApp.textContent = `${activeWine.appellation} • ${activeWine.surcharge === 0 ? 'Included' : '+$' + activeWine.surcharge + ' surcharge'}`;

        nameCol.appendChild(wineName);
        nameCol.appendChild(wineApp);

        wineInfo.appendChild(wineIcon);
        wineInfo.appendChild(nameCol);

        const actionsCol = document.createElement('div');
        actionsCol.className = 'wine-box-actions';

        const notesBtn = document.createElement('button');
        notesBtn.type = 'button';
        notesBtn.className = 'btn-open-notes';
        notesBtn.textContent = '🍷 Tasting Notes';
        notesBtn.setAttribute('title', 'View Sommelier Profile');
        notesBtn.addEventListener('click', (e) => {
          showPopover(activeWine, e.currentTarget);
        });

        actionsCol.appendChild(notesBtn);

        wineBox.appendChild(wineInfo);
        wineBox.appendChild(actionsCol);

        card.appendChild(head);
        card.appendChild(descP);
        card.appendChild(controls);
        card.appendChild(wineBox);

        container.appendChild(card);
      });
    }

    function checkPresetStatus() {
      const values = Object.values(selectedTiers);
      const allSame = values.every((v) => v === values[0]);
      presetBtns.forEach((btn) => {
        const p = btn.getAttribute('data-preset');
        btn.classList.toggle('active', allSame && values[0] === p);
      });
    }

    function showPopover(wine, targetEl) {
      if (!popover) return;

      const titleEl = document.getElementById('popoverTitle');
      const tierEl = document.getElementById('popoverTier');
      const appEl = document.getElementById('popoverAppellation');
      const descEl = document.getElementById('popoverDesc');
      const tanninVal = document.getElementById('popoverTanninVal');
      const tanninBar = document.getElementById('popoverTanninBar');
      const acidVal = document.getElementById('popoverAcidityVal');
      const acidBar = document.getElementById('popoverAcidityBar');
      const finishVal = document.getElementById('popoverFinishVal');
      const finishBar = document.getElementById('popoverFinishBar');
      const tempEl = document.getElementById('popoverServingTemp');
      const surchargeEl = document.getElementById('popoverSurcharge');

      if (titleEl) titleEl.textContent = wine.title;
      if (tierEl) tierEl.textContent = wine.tierLabel.toUpperCase();
      if (appEl) appEl.textContent = wine.appellation;
      if (descEl) descEl.textContent = wine.desc;
      if (tanninVal) tanninVal.textContent = `${wine.tannins} / 5`;
      if (tanninBar) tanninBar.style.width = `${wine.tannins * 20}%`;
      if (acidVal) acidVal.textContent = `${wine.acidity} / 5`;
      if (acidBar) acidBar.style.width = `${wine.acidity * 20}%`;
      if (finishVal) finishVal.textContent = wine.finish;
      if (finishBar) finishBar.style.width = '85%';
      if (tempEl) tempEl.textContent = `Serving Temp: ${wine.temp}`;
      if (surchargeEl) surchargeEl.textContent = wine.surcharge === 0 ? 'Included ($0)' : `+$${wine.surcharge} / guest`;

      // Position near target
      const rect = targetEl.getBoundingClientRect();
      const popoverWidth = 320;
      let left = rect.left - popoverWidth - 12;
      let top = rect.top;

      if (left < 10) {
        left = rect.right + 12;
      }
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }
      if (top + 340 > window.innerHeight) {
        top = Math.max(10, window.innerHeight - 360);
      }

      popover.style.left = `${Math.max(10, left)}px`;
      popover.style.top = `${Math.max(10, top)}px`;
      popover.hidden = false;
    }

    function updateTally() {
      const tallyGuestCount = document.getElementById('tallyGuestCount');
      const tallyBaseTotal = document.getElementById('tallyBaseTotal');
      const tallyPairingSurcharge = document.getElementById('tallyPairingSurcharge');
      const tallyBreakdown = document.getElementById('tallyCourseBreakdown');
      const tallySubtotal = document.getElementById('tallySubtotal');
      const tallyGratuity = document.getElementById('tallyGratuity');
      const tallyGrandTotal = document.getElementById('tallyGrandTotal');
      const tallyPerGuest = document.getElementById('tallyPerGuest');

      const baseTotal = BASE_PRICE_PER_GUEST * partySize;
      let surchargePerGuest = 0;

      if (tallyBreakdown) tallyBreakdown.replaceChildren();

      COURSES.forEach((course) => {
        const tier = selectedTiers[course.id] || 'classic';
        const wine = course.pairings[tier];
        surchargePerGuest += wine.surcharge;

        if (tallyBreakdown) {
          const row = document.createElement('div');
          row.className = 'tally-course-item';

          const leftSpan = document.createElement('span');
          leftSpan.className = 'course-wine-tag';
          leftSpan.textContent = `${course.order}: ${wine.tierLabel}`;

          const rightSpan = document.createElement('span');
          rightSpan.className = 'course-wine-cost';
          rightSpan.textContent = wine.surcharge === 0 ? '$0' : `+$${wine.surcharge * partySize}`;

          row.appendChild(leftSpan);
          row.appendChild(rightSpan);
          tallyBreakdown.appendChild(row);
        }
      });

      const totalSurcharge = surchargePerGuest * partySize;
      const subtotal = baseTotal + totalSurcharge;
      const gratuity = subtotal * SERVICE_RATE;
      const grandTotal = subtotal + gratuity;
      const perGuestGrand = grandTotal / partySize;

      if (tallyGuestCount) tallyGuestCount.textContent = String(partySize);
      if (tallyBaseTotal) tallyBaseTotal.textContent = `$${baseTotal.toFixed(2)}`;
      if (tallyPairingSurcharge) tallyPairingSurcharge.textContent = `+$${totalSurcharge.toFixed(2)}`;
      if (tallySubtotal) tallySubtotal.textContent = `$${subtotal.toFixed(2)}`;
      if (tallyGratuity) tallyGratuity.textContent = `$${gratuity.toFixed(2)}`;
      if (tallyGrandTotal) tallyGrandTotal.textContent = `$${grandTotal.toFixed(2)}`;
      if (tallyPerGuest) tallyPerGuest.textContent = `($${perGuestGrand.toFixed(2)} / guest)`;
    }

    // Initial render
    renderCourses();
    updateTally();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSeasonalTastingMenuExplorer);
  } else {
    initSeasonalTastingMenuExplorer();
  }
})();


