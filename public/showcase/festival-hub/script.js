document.addEventListener('DOMContentLoaded', () => {
  console.log('Pulse Wave Festival Hub loaded');
  initFestivalCountdown();
  initStageFilters();
  initScheduleTabs();
  initTicketCalculator();
});

// ---------------------------------------------------------------
// Live Event Countdown Timer (Issue #27)
// ---------------------------------------------------------------
function initFestivalCountdown() {
  const daysEl = document.getElementById('days');
  const hoursEl = document.getElementById('hours');
  const minsEl = document.getElementById('mins');
  const secsEl = document.getElementById('secs');

  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  // Compute festival target timestamp (stored in session to keep ticking consistently)
  const STORAGE_KEY = 'pulsewave_festival_target_ts';
  let targetTs = parseInt(sessionStorage.getItem(STORAGE_KEY), 10);

  if (!targetTs || isNaN(targetTs) || targetTs <= Date.now()) {
    // 42 days, 18 hours, 35 minutes, 20 seconds from first load
    targetTs = Date.now() + (42 * 86400 + 18 * 3600 + 35 * 60 + 20) * 1000;
    sessionStorage.setItem(STORAGE_KEY, String(targetTs));
  }

  function updateCountdown() {
    const now = Date.now();
    const diff = Math.max(0, targetTs - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
    secsEl.textContent = String(secs).padStart(2, '0');
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ---------------------------------------------------------------
// Artist Stage Filter Pills (Issue #28)
// ---------------------------------------------------------------
function initStageFilters() {
  const filterPills = document.querySelectorAll('.stage-pill');
  const artistCards = document.querySelectorAll('.lineup-grid .artist-card');
  const statusEl = document.getElementById('lineupStatusBar');

  if (!filterPills.length || !artistCards.length) return;

  const STAGE_NAMES = {
    'all': 'all festival stages',
    'main-stage': 'the Main Stage',
    'neon-arena': 'the Neon Arena',
    'bass-vault': 'the Bass Vault'
  };

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const selectedStage = pill.getAttribute('data-stage');

      // Update active state on pills
      filterPills.forEach((p) => {
        const isActive = p === pill;
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      // Filter cards with smooth entrance
      let visibleCount = 0;
      artistCards.forEach((card) => {
        const cardStage = card.getAttribute('data-stage');
        const matches = selectedStage === 'all' || cardStage === selectedStage;
        card.classList.toggle('is-hidden', !matches);
        if (matches) visibleCount++;
      });

      // Update status message
      if (statusEl) {
        const stageLabel = STAGE_NAMES[selectedStage] || 'selected stage';
        statusEl.textContent = `Showing ${visibleCount} artist${visibleCount === 1 ? '' : 's'} on ${stageLabel}`;
      }
    });
  });
}

// ---------------------------------------------------------------
// Schedule Tabs & Favorite Bookmarking
// ---------------------------------------------------------------
function initScheduleTabs() {
  const lineupTab = document.getElementById('lineup-tab');
  const scheduleTab = document.getElementById('schedule-tab');
  const lineupView = document.getElementById('lineup-view');
  const scheduleView = document.getElementById('schedule-view');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const scheduleEmpty = document.getElementById('schedule-empty');
  const favCountEl = document.getElementById('favorite-count');

  if (!lineupTab || !scheduleTab || !lineupView || !scheduleView) return;

  const favorites = new Set();

  function updateScheduleUI() {
    if (favCountEl) favCountEl.textContent = String(favorites.size);

    if (scheduleGrid && scheduleEmpty) {
      scheduleGrid.replaceChildren();
      if (favorites.size === 0) {
        scheduleEmpty.hidden = false;
      } else {
        scheduleEmpty.hidden = true;
        favorites.forEach((artistId) => {
          const original = document.querySelector(`.artist-card[data-artist-id="${artistId}"]`);
          if (original) {
            const clone = original.cloneNode(true);
            const favBtn = clone.querySelector('.favorite-button');
            if (favBtn) {
              favBtn.addEventListener('click', () => {
                toggleFavorite(artistId);
              });
            }
            scheduleGrid.appendChild(clone);
          }
        });
      }
    }
  }

  function toggleFavorite(artistId) {
    if (favorites.has(artistId)) {
      favorites.delete(artistId);
    } else {
      favorites.add(artistId);
    }

    document.querySelectorAll(`.artist-card[data-artist-id="${artistId}"] .favorite-button`).forEach((btn) => {
      const isFav = favorites.has(artistId);
      btn.classList.toggle('is-favorite', isFav);
      btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
      btn.querySelector('span').textContent = isFav ? '♥' : '♡';
    });

    updateScheduleUI();
  }

  document.querySelectorAll('.artist-card .favorite-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.artist-card');
      if (card && card.dataset.artistId) {
        toggleFavorite(card.dataset.artistId);
      }
    });
  });

  lineupTab.addEventListener('click', () => {
    lineupTab.classList.add('active');
    lineupTab.setAttribute('aria-selected', 'true');
    scheduleTab.classList.remove('active');
    scheduleTab.setAttribute('aria-selected', 'false');
    lineupView.hidden = false;
    scheduleView.hidden = true;
  });

  scheduleTab.addEventListener('click', () => {
    scheduleTab.classList.add('active');
    scheduleTab.setAttribute('aria-selected', 'true');
    lineupTab.classList.remove('active');
    lineupTab.setAttribute('aria-selected', 'false');
    scheduleView.hidden = false;
    lineupView.hidden = true;
    updateScheduleUI();
  });
}

// All money is handled in cents so the totals never pick up float rounding errors.
const TIERS = {
  ga: { name: 'General Admission', cents: 14900 },
  vip: { name: 'VIP Access', cents: 34900 },
  ultra: { name: 'Ultra Platinum', cents: 79900 }
};
const ADDONS = {
  tent: { name: 'Tent Camping', cents: 6000 },
  locker: { name: 'Locker', cents: 2500 },
  fastpass: { name: 'Fast-Pass', cents: 4500 }
};
const MAX_PER_TIER = 10;
const GROUP_MIN_TICKETS = 5;
const GROUP_DISCOUNT = 0.10;
const SERVICE_FEE = 0.08;

function formatMoney(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + '$' + dollars + '.' + String(abs % 100).padStart(2, '0');
}

function clampQty(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, MAX_PER_TIER);
}

// Pure function: quantities + selected add-on keys in, itemised totals out.
function calculateOrder(quantities, selectedAddons) {
  const lines = [];
  let ticketCount = 0;
  let subtotal = 0;

  Object.keys(TIERS).forEach((key) => {
    const qty = quantities[key] || 0;
    if (qty > 0) {
      const amount = qty * TIERS[key].cents;
      lines.push({ label: TIERS[key].name + ' x ' + qty, cents: amount });
      ticketCount += qty;
      subtotal += amount;
    }
  });

  if (ticketCount > 0) {
    selectedAddons.forEach((key) => {
      if (!ADDONS[key]) return;
      const amount = ticketCount * ADDONS[key].cents;
      lines.push({ label: ADDONS[key].name + ' x ' + ticketCount, cents: amount });
      subtotal += amount;
    });
  }

  const discount = ticketCount >= GROUP_MIN_TICKETS ? Math.round(subtotal * GROUP_DISCOUNT) : 0;
  const fee = Math.round((subtotal - discount) * SERVICE_FEE);
  const total = subtotal - discount + fee;
  return { lines, ticketCount, subtotal, discount, fee, total };
}

function initTicketCalculator() {
  const form = document.getElementById('ticket-form');
  if (!form) return;

  const inputs = {};
  Object.keys(TIERS).forEach((key) => { inputs[key] = document.getElementById('qty-' + key); });
  const addonBoxes = Array.from(form.querySelectorAll('input[name="addon"]'));
  const linesEl = document.getElementById('order-lines');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutMsg = document.getElementById('checkout-msg');

  function render() {
    const quantities = {};
    Object.keys(inputs).forEach((key) => { quantities[key] = clampQty(inputs[key].value); });
    const selected = addonBoxes.filter((b) => b.checked).map((b) => b.value);
    const order = calculateOrder(quantities, selected);

    linesEl.textContent = '';
    if (order.lines.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'order-empty';
      empty.textContent = 'No tickets selected yet.';
      linesEl.appendChild(empty);
    } else {
      order.lines.forEach((line) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        const price = document.createElement('span');
        label.textContent = line.label;
        price.textContent = formatMoney(line.cents);
        li.append(label, price);
        linesEl.appendChild(li);
      });
    }

    document.getElementById('t-subtotal').textContent = formatMoney(order.subtotal);
    document.getElementById('row-discount').hidden = order.discount === 0;
    document.getElementById('t-discount').textContent = formatMoney(-order.discount);
    document.getElementById('t-fee').textContent = formatMoney(order.fee);
    document.getElementById('t-total').textContent = formatMoney(order.total);

    const names = Object.keys(quantities).filter((k) => quantities[k] > 0).map((k) => TIERS[k].name.toUpperCase());
    document.getElementById('holo-tier').textContent = names.length ? names.join(' + ') : 'NO PASS SELECTED';
    document.getElementById('holo-count').textContent = order.ticketCount + (order.ticketCount === 1 ? ' ticket' : ' tickets');

    checkoutBtn.disabled = order.ticketCount === 0;
    checkoutMsg.textContent = '';
  }

  form.addEventListener('click', (e) => {
    const btn = e.target.closest('.step-btn');
    if (!btn) return;
    const input = btn.closest('.tier-card').querySelector('.qty');
    input.value = clampQty(clampQty(input.value) + parseInt(btn.dataset.step, 10));
    render();
  });
  form.addEventListener('input', render);
  form.addEventListener('change', (e) => {
    if (e.target.classList.contains('qty')) e.target.value = clampQty(e.target.value);
    render();
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  checkoutBtn.addEventListener('click', () => {
    if (checkoutBtn.disabled) return;
    const total = document.getElementById('t-total').textContent;
    checkoutMsg.textContent = 'Demo only: no payment is taken. Your order total would be ' + total + '.';
  });

  render();
}

// ---------------------------------------------------------------
// Venue Map Stage Locator (Issue #193)
// Pins on the venue map open a popover with that stage's sets. The
// headliners are read from the lineup cards so they stay in sync.
// ---------------------------------------------------------------
(function initVenueMap() {
  'use strict';
  var frame = document.getElementById('vm-frame');
  var pop = document.getElementById('vm-popover');
  if (!frame || !pop) return;

  var triggers = Array.prototype.slice.call(document.querySelectorAll('#venue-map .vm-pin, #venue-map .vm-chip'));
  var zones = Array.prototype.slice.call(document.querySelectorAll('#venue-map .vm-zone'));
  var kickerEl = document.getElementById('vm-pop-kicker');
  var titleEl = document.getElementById('vm-pop-title');
  var descEl = document.getElementById('vm-pop-desc');
  var setsEl = document.getElementById('vm-pop-sets');
  var daysEl = document.getElementById('vm-days');
  var closeBtn = document.getElementById('vm-pop-close');
  var filterBtn = document.getElementById('vm-pop-filter');
  var narrowQuery = window.matchMedia('(max-width: 760px)');
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  var STAGES = {
    'main-stage': {
      name: 'Main Stage', color: '#ec4899',
      kicker: 'Stage 1 | Capacity 40,000',
      desc: 'The big one. Full LED wall, laser rig and the closing set of every night.',
      support: [
        { day: 'Oct 24', time: '19:30', artist: 'GHOST CIRCUIT', genre: 'Opening set' },
        { day: 'Oct 25', time: '20:30', artist: 'LUMEN DRIFT', genre: 'Opening set' },
        { day: 'Oct 26', time: '18:30', artist: 'KAIRO STATIC', genre: 'Opening set' }
      ]
    },
    'neon-arena': {
      name: 'Neon Arena', color: '#06b6d4',
      kicker: 'Stage 2 | Capacity 15,000',
      desc: 'A domed arena with 360 degree projection, built for lasers and live modular rigs.',
      support: [
        { day: 'Oct 24', time: '18:00', artist: 'PRISM DIVISION', genre: 'Opening set' },
        { day: 'Oct 25', time: '19:45', artist: 'LASER BLOOM', genre: 'Opening set' },
        { day: 'Oct 26', time: '21:00', artist: 'VOLTAGE NUN', genre: 'Opening set' }
      ]
    },
    'bass-vault': {
      name: 'Bass Vault', color: '#10b981',
      kicker: 'Stage 3 | Capacity 12,000',
      desc: 'A concrete bunker with a sub-bass wall. Bring ear protection.',
      support: [
        { day: 'Oct 24', time: '21:45', artist: 'LOW ORBIT', genre: 'Opening set' },
        { day: 'Oct 25', time: '19:15', artist: 'RIFT CARTEL', genre: 'Opening set' },
        { day: 'Oct 26', time: '20:00', artist: 'GRIND THEORY', genre: 'Opening set' }
      ]
    },
    'chill-oasis': {
      name: 'Chill Oasis', color: '#a855f7',
      kicker: 'Stage 4 | Capacity 6,000',
      desc: 'Lakeside lounge with hammocks, soft lighting and slower sets between the big nights.',
      support: [
        { day: 'Oct 24', time: '17:00', artist: 'DAWN STATIC', genre: 'Ambient downtempo' },
        { day: 'Oct 24', time: '19:30', artist: 'MOSSWAVE', genre: 'Balearic chill' },
        { day: 'Oct 25', time: '16:30', artist: 'TIDAL MIND', genre: 'Ambient' },
        { day: 'Oct 25', time: '20:15', artist: 'SOFT CIRCUIT', genre: 'Lo-fi house' },
        { day: 'Oct 26', time: '17:30', artist: 'KOI SIGNAL', genre: 'Deep house' },
        { day: 'Oct 26', time: '22:00', artist: 'AFTERGLOW ENSEMBLE', genre: 'Live ambient closer', headliner: true }
      ]
    }
  };

  var openId = null;
  var openTrigger = null;

  // Headliners come from the lineup cards: "Main Stage • Oct 24 • 21:00".
  function headlinersFor(stageId) {
    var out = [];
    var cards = document.querySelectorAll('.artist-card[data-stage="' + stageId + '"]');
    Array.prototype.forEach.call(cards, function (card) {
      var h = card.querySelector('h3');
      var d = card.querySelector('.artist-details');
      var g = card.querySelector('.artist-genre');
      if (!h || !d) return;
      var parts = d.textContent.split('•').map(function (p) { return p.trim(); });
      if (parts.length < 3) return;
      out.push({ day: parts[1], time: parts[2], artist: h.textContent.trim(), genre: g ? g.textContent.trim() : '', headliner: true });
    });
    return out;
  }

  function setsFor(stageId) {
    var sets = headlinersFor(stageId).concat(STAGES[stageId].support);
    sets.sort(function (a, b) {
      return (a.day + a.time).localeCompare(b.day + b.time);
    });
    return sets;
  }

  var activeDay = null;
  var shownSets = [];

  function renderSets(stageId) {
    shownSets = setsFor(stageId);
    var days = [];
    shownSets.forEach(function (s) { if (days.indexOf(s.day) === -1) days.push(s.day); });
    if (days.indexOf(activeDay) === -1) activeDay = days[0];

    daysEl.textContent = '';
    days.forEach(function (day) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'vm-day-btn';
      btn.textContent = day;
      btn.setAttribute('aria-pressed', day === activeDay ? 'true' : 'false');
      btn.addEventListener('click', function () {
        activeDay = day;
        Array.prototype.forEach.call(daysEl.children, function (other) {
          other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
        });
        renderDay();
        placePopover(frame.querySelector('.vm-pin[data-stage="' + stageId + '"]'));
      });
      daysEl.appendChild(btn);
    });
    renderDay();
  }

  function renderDay() {
    setsEl.textContent = '';
    shownSets.filter(function (s) { return s.day === activeDay; }).forEach(function (s) {
      var li = document.createElement('li');
      if (s.headliner) li.className = 'is-headliner';
      var time = document.createElement('span');
      time.className = 'vm-set-time';
      time.textContent = s.time;
      var info = document.createElement('span');
      info.className = 'vm-set-info';
      var name = document.createElement('strong');
      name.textContent = s.artist;
      var genre = document.createElement('span');
      genre.className = 'vm-set-genre';
      genre.textContent = s.genre;
      info.append(name, genre);
      li.append(time, info);
      if (s.headliner) {
        var tag = document.createElement('span');
        tag.className = 'vm-set-tag';
        tag.textContent = 'Headliner';
        li.appendChild(tag);
      }
      setsEl.appendChild(li);
    });
  }

  // On wide screens the popover floats next to the pin. On narrow screens
  // CSS puts it under the map, so no inline position is used.
  function placePopover(pin) {
    if (narrowQuery.matches) {
      pop.style.left = '';
      pop.style.top = '';
      return;
    }
    var fr = frame.getBoundingClientRect();
    var pr = pin.getBoundingClientRect();
    var px = pr.left - fr.left + pr.width / 2;
    var py = pr.top - fr.top + pr.height / 2;
    var w = pop.offsetWidth;
    var h = pop.offsetHeight;
    var left = px + 64;
    if (left + w > fr.width - 8) left = px - 64 - w;
    left = Math.max(8, Math.min(left, fr.width - w - 8));
    var top = Math.max(8, Math.min(py - h / 2, fr.height - h - 8));
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  }

  function syncTriggers() {
    triggers.forEach(function (t) {
      var on = t.getAttribute('data-stage') === openId;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
    zones.forEach(function (z) {
      z.classList.toggle('is-active', z.getAttribute('data-zone') === openId);
    });
  }

  function openStage(stageId, trigger) {
    var stage = STAGES[stageId];
    if (!stage) return;
    var pin = frame.querySelector('.vm-pin[data-stage="' + stageId + '"]');
    openId = stageId;
    openTrigger = trigger;
    pop.style.setProperty('--vm-accent', stage.color);
    kickerEl.textContent = stage.kicker;
    titleEl.textContent = stage.name;
    descEl.textContent = stage.desc;
    renderSets(stageId);
    filterBtn.hidden = !document.querySelector('.stage-pill[data-stage="' + stageId + '"]');
    // restart the entrance animation when switching between stages
    pop.hidden = true;
    void pop.offsetWidth;
    pop.hidden = false;
    placePopover(pin);
    syncTriggers();
    pop.scrollTop = 0;
    pop.focus({ preventScroll: !narrowQuery.matches });
    if (narrowQuery.matches) {
      pop.scrollIntoView({ block: 'nearest', behavior: reduceQuery.matches ? 'auto' : 'smooth' });
    }
  }

  function closePopover(returnFocus) {
    if (openId === null) return;
    var back = openTrigger;
    openId = null;
    openTrigger = null;
    pop.hidden = true;
    syncTriggers();
    if (returnFocus && back) back.focus();
  }

  triggers.forEach(function (t) {
    t.addEventListener('click', function () {
      var id = t.getAttribute('data-stage');
      if (openId === id) closePopover(true);
      else openStage(id, t);
    });
  });

  closeBtn.addEventListener('click', function () { closePopover(true); });

  filterBtn.addEventListener('click', function () {
    var id = openId;
    var pill = document.querySelector('.stage-pill[data-stage="' + id + '"]');
    if (!pill) return;
    var lineupTab = document.getElementById('lineup-tab');
    var lineupView = document.getElementById('lineup-view');
    if (lineupView && lineupView.hidden && lineupTab) lineupTab.click();
    pill.click();
    closePopover(false);
    pill.scrollIntoView({ block: 'center', behavior: reduceQuery.matches ? 'auto' : 'smooth' });
    pill.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openId !== null) {
      e.preventDefault();
      closePopover(true);
    }
  });

  document.addEventListener('click', function (e) {
    if (openId === null) return;
    if (pop.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#venue-map .vm-pin, #venue-map .vm-chip')) return;
    closePopover(false);
  });

  window.addEventListener('resize', function () {
    if (openId === null) return;
    placePopover(frame.querySelector('.vm-pin[data-stage="' + openId + '"]'));
  });
})();
