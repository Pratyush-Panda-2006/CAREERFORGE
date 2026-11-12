document.addEventListener('DOMContentLoaded', () => {
  console.log('Pulse Wave Festival Hub loaded');
  initFestivalCountdown();
  initFestivalWeather();
  initStageFilters();
  initScheduleTabs();
  initTicketCalculator();
  initPackingChecklist();
  initCyberSoundboard();
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
// Schedule Tabs, Itinerary Drawer, Conflict Detection & ICS Export (Issue #437)
// ---------------------------------------------------------------
const ITINERARY_STORAGE_KEY = 'pulsewave_itinerary_v1';

const ARTIST_SCHEDULE_DATA = {
  'aura-matrix': { id: 'aura-matrix', name: 'AURA MATRIX', stage: 'neon-arena', stageLabel: 'Neon Arena', day: '2026-10-24', dayLabel: 'Day 01 · Oct 24', start: '19:30', end: '21:20', genre: 'Electro House & Laser Show' },
  'neon-apex': { id: 'neon-apex', name: 'NEON APEX', stage: 'main-stage', stageLabel: 'Main Stage', day: '2026-10-24', dayLabel: 'Day 01 · Oct 24', start: '21:00', end: '22:30', genre: 'Cyberpunk Synthwave' },
  'sub-zero': { id: 'sub-zero', name: 'SUB ZERO BASS', stage: 'bass-vault', stageLabel: 'Bass Vault', day: '2026-10-24', dayLabel: 'Day 01 · Oct 24', start: '23:00', end: '24:30', genre: 'Sub-Bass Riddim & Dubstep' },
  'neural-collider': { id: 'neural-collider', name: 'NEURAL COLLIDER', stage: 'bass-vault', stageLabel: 'Bass Vault', day: '2026-10-25', dayLabel: 'Day 02 · Oct 25', start: '20:45', end: '22:15', genre: 'Neurofunk Drum & Bass' },
  'synth-pulse': { id: 'synth-pulse', name: 'SYNTH PULSE', stage: 'neon-arena', stageLabel: 'Neon Arena', day: '2026-10-25', dayLabel: 'Day 02 · Oct 25', start: '21:15', end: '22:45', genre: 'Analog Modular & Chiptune' },
  'cyber-kinetic': { id: 'cyber-kinetic', name: 'CYBER KINETIC', stage: 'main-stage', stageLabel: 'Main Stage', day: '2026-10-25', dayLabel: 'Day 02 · Oct 25', start: '22:30', end: '24:00', genre: 'Melodic Techno Live' },
  'solar-flare': { id: 'solar-flare', name: 'SOLAR FLARE', stage: 'main-stage', stageLabel: 'Main Stage', day: '2026-10-26', dayLabel: 'Day 03 · Oct 26', start: '20:00', end: '21:45', genre: 'Progressive Trance' },
  'quantum-drop': { id: 'quantum-drop', name: 'QUANTUM DROP', stage: 'bass-vault', stageLabel: 'Bass Vault', day: '2026-10-26', dayLabel: 'Day 03 · Oct 26', start: '21:30', end: '23:00', genre: 'Future Bass & Cyber Trap' },
  'hex-void': { id: 'hex-void', name: 'HEX VOID', stage: 'neon-arena', stageLabel: 'Neon Arena', day: '2026-10-26', dayLabel: 'Day 03 · Oct 26', start: '22:45', end: '24:15', genre: 'Industrial Darkwave EBM' }
};

function timeStrToMins(hhmm) {
  const [h, m] = String(hhmm || '18:00').split(':').map(Number);
  return (h < 6 ? h + 24 : h) * 60 + (m || 0);
}

function formatDisplayTime(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number);
  const normH = h >= 24 ? h - 24 : h;
  return `${String(normH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
}

function detectItineraryConflicts(items) {
  const conflicts = [];
  const conflictingIds = new Set();
  const sorted = [...items].sort((a, b) => (a.day === b.day ? timeStrToMins(a.start) - timeStrToMins(b.start) : a.day.localeCompare(b.day)));

  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const a = sorted[i];
      const b = sorted[j];
      if (a.day !== b.day) continue;
      const aStart = timeStrToMins(a.start);
      const aEnd = timeStrToMins(a.end);
      const bStart = timeStrToMins(b.start);
      const bEnd = timeStrToMins(b.end);
      const overlapStart = Math.max(aStart, bStart);
      const overlapEnd = Math.min(aEnd, bEnd);
      if (overlapEnd > overlapStart) {
        conflictingIds.add(a.id);
        conflictingIds.add(b.id);
        conflicts.push({
          dayLabel: a.dayLabel,
          first: a,
          second: b,
          overlapMinutes: overlapEnd - overlapStart
        });
      }
    }
  }
  return { conflicts, conflictingIds };
}

function toIcsTimestamp(dayStr, hhmm) {
  const [y, mo, d] = dayStr.split('-').map(Number);
  const [rawH, m] = hhmm.split(':').map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, rawH, m || 0, 0));
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00`;
}

function generateItineraryICS(items) {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pulse Wave 2026//Festival Itinerary Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Pulse Wave 2026 Personal Lineup',
    'X-WR-TIMEZONE:Asia/Tokyo'
  ];

  items.forEach((item) => {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.id}-${item.day}@pulsewave2026.jp`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Asia/Tokyo:${toIcsTimestamp(item.day, item.start)}`,
      `DTEND;TZID=Asia/Tokyo:${toIcsTimestamp(item.day, item.end)}`,
      `SUMMARY:${item.name} — ${item.stageLabel}`,
      `LOCATION:${item.stageLabel}, Tokyo Cyber Dome`,
      `DESCRIPTION:${item.genre} (${formatDisplayTime(item.start)}–${formatDisplayTime(item.end)})`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

window.generateItineraryICS = generateItineraryICS;
window.detectItineraryConflicts = detectItineraryConflicts;

function initScheduleTabs() {
  const lineupTab = document.getElementById('lineup-tab');
  const scheduleTab = document.getElementById('schedule-tab');
  const itineraryTab = document.getElementById('itinerary-drawer-tab');
  const lineupView = document.getElementById('lineup-view');
  const scheduleView = document.getElementById('schedule-view');
  const itineraryView = document.getElementById('itinerary-drawer-view');
  const scheduleGrid = document.getElementById('scheduleGrid');
  const scheduleEmpty = document.getElementById('schedule-empty');
  const favCountEl = document.getElementById('favorite-count');
  const itinCountPill = document.getElementById('itinerary-count-pill');
  const itinConflictBadge = document.getElementById('itinerary-conflict-badge');

  if (!lineupTab || !scheduleTab || !lineupView || !scheduleView) return;

  const favorites = new Set();
  let activeDayFilter = 'all';

  function loadSavedItinerary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ITINERARY_STORAGE_KEY) || '[]');
      if (Array.isArray(parsed)) {
        parsed.forEach((id) => {
          if (ARTIST_SCHEDULE_DATA[id]) favorites.add(id);
        });
      }
    } catch {
      // ignore storage access issues
    }
  }

  function saveItinerary() {
    try {
      localStorage.setItem(ITINERARY_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
    } catch {
      // ignore storage access issues
    }
  }

  function syncCardButtons(artistId) {
    const isSaved = favorites.has(artistId);
    document.querySelectorAll(`.artist-card[data-artist-id="${artistId}"]`).forEach((card) => {
      const heartBtn = card.querySelector('.favorite-button');
      if (heartBtn) {
        heartBtn.classList.toggle('is-favorite', isSaved);
        heartBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
        const sp = heartBtn.querySelector('span');
        if (sp) sp.textContent = isSaved ? '♥' : '♡';
      }
      const starBtn = card.querySelector('.itinerary-star-btn');
      if (starBtn) {
        starBtn.classList.toggle('is-bookmarked', isSaved);
        starBtn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
        starBtn.textContent = isSaved ? '★' : '☆';
      }
    });
  }

  function renderItineraryDrawer() {
    const container = document.getElementById('itineraryTracksContainer');
    const conflictBanner = document.getElementById('itineraryConflictBanner');
    const conflictList = document.getElementById('itineraryConflictList');
    const conflictTag = document.getElementById('conflictCountTag');
    const okBanner = document.getElementById('itineraryOkBanner');

    const savedItems = Array.from(favorites)
      .map((id) => ARTIST_SCHEDULE_DATA[id])
      .filter(Boolean)
      .sort((a, b) => (a.day === b.day ? timeStrToMins(a.start) - timeStrToMins(b.start) : a.day.localeCompare(b.day)));

    const { conflicts, conflictingIds } = detectItineraryConflicts(savedItems);

    if (itinConflictBadge) {
      itinConflictBadge.hidden = conflicts.length === 0;
      itinConflictBadge.textContent = `${conflicts.length} ⚠`;
    }

    if (!container) return;

    if (conflictBanner && conflictList && conflictTag && okBanner) {
      if (conflicts.length > 0) {
        conflictBanner.hidden = false;
        okBanner.hidden = true;
        conflictTag.textContent = `${conflicts.length} overlap${conflicts.length === 1 ? '' : 's'}`;
        conflictList.innerHTML = conflicts
          .map(
            (c) =>
              `<li><strong>${c.dayLabel}:</strong> ${c.first.name} (${c.first.stageLabel}, ${formatDisplayTime(c.first.start)}–${formatDisplayTime(c.first.end)}) overlaps <strong>${c.second.name}</strong> (${c.second.stageLabel}, ${formatDisplayTime(c.second.start)}–${formatDisplayTime(c.second.end)}) by <strong>${c.overlapMinutes} min</strong></li>`
          )
          .join('');
      } else {
        conflictBanner.hidden = true;
        okBanner.hidden = savedItems.length === 0;
      }
    }

    const filteredItems = activeDayFilter === 'all' ? savedItems : savedItems.filter((it) => it.day === activeDayFilter);

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="itinerary-empty-box">
          <h4>No Sets Bookmarked ${activeDayFilter === 'all' ? 'Yet' : 'For This Day'}</h4>
          <p>Tap the ★ bookmark icon on any artist card or click "⚡ Load Sample Lineup" above to preview chronological stage tracking &amp; conflict detection.</p>
        </div>
      `;
      return;
    }

    const daysPresent = [...new Set(filteredItems.map((it) => it.day))];
    const minWindowStart = 18 * 60; // 18:00
    const totalWindowMins = 7 * 60; // 18:00 -> 01:00 (420 mins)

    container.innerHTML = daysPresent
      .map((dayKey) => {
        const daySets = filteredItems.filter((it) => it.day === dayKey);
        const dayConflicts = daySets.filter((it) => conflictingIds.has(it.id)).length;
        const rowsHtml = daySets
          .map((item) => {
            const startMin = Math.max(minWindowStart, timeStrToMins(item.start));
            const endMin = Math.min(minWindowStart + totalWindowMins, timeStrToMins(item.end));
            const leftPct = Math.max(0, Math.min(72, ((startMin - minWindowStart) / totalWindowMins) * 100));
            const widthPct = Math.max(25, Math.min(100 - leftPct, ((endMin - startMin) / totalWindowMins) * 100));
            const isConf = conflictingIds.has(item.id);
            return `
              <div class="timeline-lane">
                <div class="timeline-bar ${item.stage} ${isConf ? 'has-conflict' : ''}" style="left: ${leftPct.toFixed(1)}%; width: ${widthPct.toFixed(1)}%;">
                  <div class="timeline-bar-info">
                    <strong>${item.name}</strong>
                    <span>${item.stageLabel} · ${formatDisplayTime(item.start)}–${formatDisplayTime(item.end)}</span>
                  </div>
                  <div class="timeline-bar-right">
                    ${isConf ? '<span class="timeline-conflict-chip">⚠ CONFLICT</span>' : ''}
                    <button type="button" class="timeline-remove-btn" data-remove-artist="${item.id}" aria-label="Remove ${item.name} from itinerary">&times;</button>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <div class="itinerary-day-group">
            <div class="itinerary-day-title">
              <span>${daySets[0].dayLabel} · ${daySets.length} Set${daySets.length === 1 ? '' : 's'}</span>
              <span>${dayConflicts > 0 ? '⚠️ Overlap Alert' : '✓ Clear'}</span>
            </div>
            <div class="timeline-ruler" aria-hidden="true">
              <span>18:00</span><span>19:00</span><span>20:00</span><span>21:00</span><span>22:00</span><span>23:00</span><span>00:00+</span>
            </div>
            <div class="timeline-rows">${rowsHtml}</div>
          </div>
        `;
      })
      .join('');

    container.querySelectorAll('.timeline-remove-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rid = btn.getAttribute('data-remove-artist');
        if (rid && favorites.has(rid)) {
          toggleFavorite(rid);
        }
      });
    });
  }

  function updateScheduleUI() {
    if (favCountEl) favCountEl.textContent = String(favorites.size);
    if (itinCountPill) itinCountPill.textContent = String(favorites.size);

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
            if (favBtn) favBtn.addEventListener('click', () => toggleFavorite(artistId));
            const starBtn = clone.querySelector('.itinerary-star-btn');
            if (starBtn) starBtn.addEventListener('click', () => toggleFavorite(artistId));
            scheduleGrid.appendChild(clone);
          }
        });
      }
    }

    renderItineraryDrawer();
  }

  function toggleFavorite(artistId) {
    if (favorites.has(artistId)) {
      favorites.delete(artistId);
    } else {
      favorites.add(artistId);
    }
    saveItinerary();
    syncCardButtons(artistId);
    updateScheduleUI();
  }

  document.querySelectorAll('.artist-card .favorite-button, .artist-card .itinerary-star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.artist-card');
      if (card && card.dataset.artistId) {
        toggleFavorite(card.dataset.artistId);
      }
    });
  });

  function switchTab(activeKey) {
    const tabs = [
      { key: 'lineup', tab: lineupTab, view: lineupView },
      { key: 'schedule', tab: scheduleTab, view: scheduleView },
      { key: 'itinerary', tab: itineraryTab, view: itineraryView }
    ];
    tabs.forEach((entry) => {
      if (!entry.tab || !entry.view) return;
      const isOn = entry.key === activeKey;
      entry.tab.classList.toggle('active', isOn);
      entry.tab.setAttribute('aria-selected', String(isOn));
      entry.view.hidden = !isOn;
    });
    updateScheduleUI();
  }

  lineupTab.addEventListener('click', () => switchTab('lineup'));
  scheduleTab.addEventListener('click', () => switchTab('schedule'));
  if (itineraryTab && itineraryView) {
    itineraryTab.addEventListener('click', () => switchTab('itinerary'));
  }

  document.querySelectorAll('.itinerary-day-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      activeDayFilter = pill.getAttribute('data-day') || 'all';
      document.querySelectorAll('.itinerary-day-pill').forEach((p) => {
        const on = p === pill;
        p.classList.toggle('active', on);
        p.setAttribute('aria-selected', String(on));
      });
      renderItineraryDrawer();
    });
  });

  const sampleBtn = document.getElementById('loadSampleItineraryBtn');
  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      ['aura-matrix', 'neon-apex', 'neural-collider', 'synth-pulse', 'solar-flare'].forEach((id) => {
        favorites.add(id);
      });
      saveItinerary();
      Object.keys(ARTIST_SCHEDULE_DATA).forEach(syncCardButtons);
      updateScheduleUI();
    });
  }

  const clearBtn = document.getElementById('clearItineraryBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      favorites.clear();
      saveItinerary();
      Object.keys(ARTIST_SCHEDULE_DATA).forEach(syncCardButtons);
      updateScheduleUI();
      const status = document.getElementById('icsStatusStrip');
      if (status) status.textContent = 'Itinerary cleared.';
    });
  }

  const exportIcsBtn = document.getElementById('exportIcsBtn');
  if (exportIcsBtn) {
    exportIcsBtn.addEventListener('click', () => {
      const items = Array.from(favorites).map((id) => ARTIST_SCHEDULE_DATA[id]).filter(Boolean);
      const status = document.getElementById('icsStatusStrip');
      if (items.length === 0) {
        if (status) status.textContent = 'Bookmark at least 1 artist performance before exporting .ics.';
        return;
      }
      const icsText = generateItineraryICS(items);
      const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'pulsewave-2026-itinerary.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (status) {
        status.textContent = `Exported ${items.length} event(s) to pulsewave-2026-itinerary.ics (RFC 5545 VCALENDAR).`;
      }
    });
  }

  loadSavedItinerary();
  Object.keys(ARTIST_SCHEDULE_DATA).forEach(syncCardButtons);
  updateScheduleUI();
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
// Interactive Festival Weather Forecast (Issue #192)
// ---------------------------------------------------------------

function initFestivalWeather() {
  const weatherGrid = document.getElementById('weatherGrid');

  if (!weatherGrid) return;

  const weatherCards = weatherGrid.querySelectorAll('.weather-card');

  const detailIcon = document.getElementById('detailIcon');
  const detailCondition = document.getElementById('detailCondition');
  const detailDescription = document.getElementById('detailDescription');
  const detailSunset = document.getElementById('detailSunset');

  const forecast = [
    {
      icon: '☀️',
      condition: 'Sunny',
      description: 'Clear skies expected throughout the festival day. Perfect conditions for outdoor performances.',
      sunset: '17:00 JST'
    },
    {
      icon: '🌧️',
      condition: 'Light Rain',
      description: 'Occasional light rainfall expected. Festival attendees should consider carrying rain protection.',
      sunset: '16:59 JST'
    },
    {
      icon: '🌙',
      condition: 'Clear Night',
      description: 'A mostly clear evening with comfortable temperatures for the final festival performances.',
      sunset: '16:58 JST'
    }
  ];

  function selectForecast(index) {
    const selected = forecast[index];

    if (!selected) return;

    // Update selected card
    weatherCards.forEach((card, cardIndex) => {
      const isActive = cardIndex === index;

      card.classList.toggle('active', isActive);
      card.setAttribute('aria-pressed', String(isActive));
    });

    // Update forecast details
    detailIcon.textContent = selected.icon;
    detailCondition.textContent = selected.condition;
    detailDescription.textContent = selected.description;
    detailSunset.textContent = selected.sunset;
  }

  weatherCards.forEach((card) => {
    card.addEventListener('click', () => {
      const dayIndex = Number(card.dataset.day);
      selectForecast(dayIndex);
    });
  });

  // Display the first day's forecast by default
  selectForecast(0);
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

// ---------------------------------------------------------------
// Festival Survival Packing Checklist (Issue #287)
// ---------------------------------------------------------------
function initPackingChecklist() {
  const section = document.getElementById('packing-checklist');
  if (!section) return;

  const STORAGE_KEY = 'festival_packing_checklist';
  const checkboxes = Array.from(section.querySelectorAll('.packing-checkbox'));
  const resetBtn = document.getElementById('packing-reset-btn');
  const checkAllBtn = document.getElementById('packing-checkall-btn');

  const countCamping = document.getElementById('count-camping');
  const countGear = document.getElementById('count-gear');
  const countHealth = document.getElementById('count-health');

  const barCamping = document.getElementById('bar-camping');
  const barGear = document.getElementById('bar-gear');
  const barHealth = document.getElementById('bar-health');

  const overallCount = document.getElementById('packing-overall-count');
  const overallPct = document.getElementById('packing-overall-pct');
  const overallBar = document.getElementById('packing-overall-bar');
  const overallTrack = document.getElementById('packing-overall-track');
  const readinessStatus = document.getElementById('packing-readiness-status');

  // Load state from localStorage
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  // Save state to localStorage
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }

  function updateUI() {
    const state = {};
    let totalChecked = 0;
    const catStats = {
      camping: { total: 0, checked: 0 },
      gear: { total: 0, checked: 0 },
      health: { total: 0, checked: 0 }
    };

    checkboxes.forEach((cb) => {
      const cat = cb.getAttribute('data-cat') || 'gear';
      if (!catStats[cat]) catStats[cat] = { total: 0, checked: 0 };
      catStats[cat].total++;

      if (cb.checked) {
        state[cb.id] = true;
        totalChecked++;
        catStats[cat].checked++;
      } else {
        state[cb.id] = false;
      }

      // Toggle row style
      const row = cb.closest('.packing-item-row');
      if (row) {
        row.classList.toggle('is-packed', cb.checked);
      }
    });

    saveState(state);

    // Update categories
    if (countCamping && barCamping && catStats.camping) {
      countCamping.textContent = `${catStats.camping.checked} / ${catStats.camping.total}`;
      const pct = catStats.camping.total > 0 ? (catStats.camping.checked / catStats.camping.total) * 100 : 0;
      barCamping.style.width = `${pct}%`;
    }

    if (countGear && barGear && catStats.gear) {
      countGear.textContent = `${catStats.gear.checked} / ${catStats.gear.total}`;
      const pct = catStats.gear.total > 0 ? (catStats.gear.checked / catStats.gear.total) * 100 : 0;
      barGear.style.width = `${pct}%`;
    }

    if (countHealth && barHealth && catStats.health) {
      countHealth.textContent = `${catStats.health.checked} / ${catStats.health.total}`;
      const pct = catStats.health.total > 0 ? (catStats.health.checked / catStats.health.total) * 100 : 0;
      barHealth.style.width = `${pct}%`;
    }

    // Update overall
    const totalItems = checkboxes.length;
    const overallPercentage = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

    if (overallCount) overallCount.textContent = `${totalChecked} / ${totalItems}`;
    if (overallPct) overallPct.textContent = `${overallPercentage}%`;
    if (overallBar) overallBar.style.width = `${overallPercentage}%`;
    if (overallTrack) overallTrack.setAttribute('aria-valuenow', String(overallPercentage));

    if (readinessStatus) {
      if (overallPercentage === 100) {
        readinessStatus.textContent = 'MISSION READY // DEPLOYED';
        readinessStatus.classList.add('complete');
      } else if (overallPercentage > 0) {
        readinessStatus.textContent = 'PACKING IN PROGRESS';
        readinessStatus.classList.remove('complete');
      } else {
        readinessStatus.textContent = 'PREPARING GEAR';
        readinessStatus.classList.remove('complete');
      }
    }
  }

  // Restore saved state
  const saved = loadState();
  checkboxes.forEach((cb) => {
    if (saved[cb.id] === true) {
      cb.checked = true;
    }
    cb.addEventListener('change', updateUI);
  });

  // Action listeners
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      checkboxes.forEach((cb) => {
        cb.checked = false;
      });
      updateUI();
    });
  }

  if (checkAllBtn) {
    checkAllBtn.addEventListener('click', () => {
      checkboxes.forEach((cb) => {
        cb.checked = true;
      });
      updateUI();
    });
  }

  // Initial calculation
  updateUI();
}

// ---------------------------------------------------------------
// Cyber DJ Synthesizer Launchpad & Soundboard (Issue #343)
// ---------------------------------------------------------------
function initCyberSoundboard() {
  const launchpad = document.getElementById('cyber-launchpad');
  if (!launchpad) return;

  let audioCtx = null;
  let masterGain = null;
  let sequencerInterval = null;
  let currentStep = 0;

  const bpmSlider = document.getElementById('djBpmSlider');
  const bpmDisplay = document.getElementById('djBpmDisplay');
  const bpmPresets = launchpad.querySelectorAll('.btn-bpm-chip');
  const volSlider = document.getElementById('djMasterVol');
  const volDisplay = document.getElementById('djVolDisplay');
  const beatDot = document.getElementById('beatPulseDot');
  const beatStatus = document.getElementById('beatStatusText');
  const seqToggleBtn = document.getElementById('btnSeqToggle');
  const seqBtnText = document.getElementById('seqBtnText');
  const pads = Array.from(launchpad.querySelectorAll('.dj-pad'));

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
      masterGain = audioCtx.createGain();
      const vol = volSlider ? parseInt(volSlider.value, 10) / 100 : 0.8;
      masterGain.gain.setValueAtTime(vol, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Create White Noise buffer helper
  function createNoiseBuffer(ctx, duration) {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // 1. Sub Kick 808
  function playKick() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.35);

    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  // 2. Cyber Snare
  function playSnare() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    // Body
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.1);
    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Snap noise
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.2);
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, t);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(t);
    noise.stop(t + 0.22);
  }

  // 3. Neon Hi-Hat
  function playHiHat() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.08);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 0.06);
  }

  // 4. Glitch Clap
  function playClap() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 0.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(2, t);

    const gain = ctx.createGain();
    // Multi-burst envelope
    gain.gain.setValueAtTime(0, t);
    gain.gain.setValueAtTime(0.7, t + 0.01);
    gain.gain.setValueAtTime(0.1, t + 0.02);
    gain.gain.setValueAtTime(0.7, t + 0.03);
    gain.gain.setValueAtTime(0.1, t + 0.04);
    gain.gain.setValueAtTime(0.9, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 0.25);
  }

  // 5. Sub Bass Drop
  function playBassDrop() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, t);
    filter.Q.setValueAtTime(4, t);

    gain.gain.setValueAtTime(0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.75);
  }

  // 6. Synth Stab (C5 chord)
  function playSynthStab() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;

    [523.25, 659.25, 783.99].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // 7. Laser Chirp FX
  function playLaser() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // 8. Dome Crash
  function playCrash() {
    const ctx = getAudioContext();
    const t = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx, 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, t);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    noise.start(t);
    noise.stop(t + 1.2);
  }

  const SOUND_HANDLERS = [
    playKick,      // 1
    playSnare,     // 2
    playHiHat,     // 3
    playClap,      // 4
    playBassDrop,  // 5
    playSynthStab, // 6
    playLaser,     // 7
    playCrash      // 8
  ];

  function triggerPad(index) {
    if (index >= 0 && index < SOUND_HANDLERS.length) {
      SOUND_HANDLERS[index]();
      const padEl = pads[index];
      if (padEl) {
        padEl.classList.add('active-press');
        setTimeout(() => padEl.classList.remove('active-press'), 140);
      }
    }
  }

  // Bind Pads click
  pads.forEach((pad, idx) => {
    pad.addEventListener('click', () => {
      triggerPad(idx);
    });
  });

  // Global Keyboard listener for keys 1 through 8
  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 8) {
      triggerPad(num - 1);
    }
  });

  // BPM Slider & Presets
  function setBpm(bpm) {
    if (bpmSlider) bpmSlider.value = bpm;
    if (bpmDisplay) bpmDisplay.textContent = `${bpm} BPM`;
    if (sequencerInterval) {
      stopSequencer();
      startSequencer();
    }
  }

  if (bpmSlider) {
    bpmSlider.addEventListener('input', (e) => {
      setBpm(e.target.value);
    });
  }

  bpmPresets.forEach((chip) => {
    chip.addEventListener('click', () => {
      bpmPresets.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const targetBpm = chip.getAttribute('data-bpm');
      setBpm(targetBpm);
    });
  });

  // Master Volume
  if (volSlider) {
    volSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (volDisplay) volDisplay.textContent = `${val}%`;
      if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(val / 100, audioCtx.currentTime);
      }
    });
  }

  // 4/4 Beat Sequencer Loop
  function flashMetronome() {
    if (beatDot) {
      beatDot.classList.add('flash');
      setTimeout(() => beatDot.classList.remove('flash'), 120);
    }
  }

  function startSequencer() {
    const bpm = bpmSlider ? parseInt(bpmSlider.value, 10) : 128;
    const intervalMs = (60000 / bpm) / 2; // 8th note resolution

    currentStep = 0;
    if (beatStatus) beatStatus.textContent = 'LOOP ACTIVE';
    if (seqToggleBtn) seqToggleBtn.classList.add('playing');
    if (seqBtnText) seqBtnText.textContent = 'Stop Beat Loop';

    sequencerInterval = setInterval(() => {
      // 8 steps in a 4/4 bar (0 to 7)
      // Metronome flash on quarter beats
      if (currentStep % 2 === 0) {
        flashMetronome();
      }

      // Step 0: Kick (beat 1)
      if (currentStep === 0) {
        playKick();
      }
      // Step 1: Hat
      else if (currentStep === 1) {
        playHiHat();
      }
      // Step 2: Clap + Snare (beat 2)
      else if (currentStep === 2) {
        playSnare();
        playClap();
      }
      // Step 3: Hat
      else if (currentStep === 3) {
        playHiHat();
      }
      // Step 4: Kick (beat 3)
      else if (currentStep === 4) {
        playKick();
      }
      // Step 5: Hat
      else if (currentStep === 5) {
        playHiHat();
      }
      // Step 6: Clap + Snare (beat 4)
      else if (currentStep === 6) {
        playSnare();
        playClap();
      }
      // Step 7: Offbeat Hat + Synth stab accent
      else if (currentStep === 7) {
        playHiHat();
      }

      currentStep = (currentStep + 1) % 8;
    }, intervalMs);
  }

  function stopSequencer() {
    if (sequencerInterval) {
      clearInterval(sequencerInterval);
      sequencerInterval = null;
    }
    if (beatStatus) beatStatus.textContent = 'PULSE READY';
    if (seqToggleBtn) seqToggleBtn.classList.remove('playing');
    if (seqBtnText) seqBtnText.textContent = 'Start 4/4 Beat Loop';
  }

  if (seqToggleBtn) {
    seqToggleBtn.addEventListener('click', () => {
      if (sequencerInterval) {
        stopSequencer();
      } else {
        startSequencer();
      }
    });
  }
}


