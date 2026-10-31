// Vanguard Real Estate Mortgage Calculator & Amortization Engine
const CIRCUMFERENCE = 2 * Math.PI * 65; // ~408.407 for r=65

let currentLoanYears = 30;

function formatCurrency(val) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(Math.round(val));
}

function formatShortCurrency(val) {
  if (val >= 1000000) {
    return '$' + (val / 1000000).toFixed(1) + 'M';
  } else if (val >= 1000) {
    return '$' + (val / 1000).toFixed(0) + 'K';
  }
  return '$' + Math.round(val);
}

function calculateMortgage() {
  const homePriceInput = document.getElementById('home-price-input');
  const downPaymentRange = document.getElementById('down-payment-range');
  const interestRateInput = document.getElementById('interest-rate-input');
  const taxRateInput = document.getElementById('tax-rate-input');
  const insRateInput = document.getElementById('ins-rate-input');
  const hoaInput = document.getElementById('hoa-input');

  const homePrice = Math.max(parseFloat(homePriceInput.value) || 0, 10000);
  const downPct = Math.min(Math.max(parseFloat(downPaymentRange.value) || 0, 0), 100);
  const interestRate = Math.max(parseFloat(interestRateInput.value) || 0, 0.01);
  const taxRate = Math.max(parseFloat(taxRateInput.value) || 0, 0);
  const insRate = Math.max(parseFloat(insRateInput.value) || 0, 0);
  const hoaFees = Math.max(parseFloat(hoaInput.value) || 0, 0);

  // Calculations
  const downPaymentAmount = homePrice * (downPct / 100);
  const loanPrincipal = Math.max(homePrice - downPaymentAmount, 0);
  const numberOfPayments = currentLoanYears * 12;
  const monthlyRate = (interestRate / 100) / 12;

  // Monthly Principal & Interest: M = P [ i(1 + i)^n ] / [ (1 + i)^n – 1]
  let monthlyPI = 0;
  if (monthlyRate > 0 && loanPrincipal > 0) {
    const compound = Math.pow(1 + monthlyRate, numberOfPayments);
    monthlyPI = loanPrincipal * ((monthlyRate * compound) / (compound - 1));
  } else if (numberOfPayments > 0) {
    monthlyPI = loanPrincipal / numberOfPayments;
  }

  // Monthly Escrow components
  const monthlyTax = (homePrice * (taxRate / 100)) / 12;
  const monthlyIns = (homePrice * (insRate / 100)) / 12;
  const monthlyHOA = hoaFees;

  const totalMonthly = monthlyPI + monthlyTax + monthlyIns + monthlyHOA;

  // Update Input Badges
  const hpBadge = document.getElementById('home-price-badge');
  if (hpBadge) hpBadge.textContent = formatCurrency(homePrice);

  const dpPctBadge = document.getElementById('down-payment-pct-badge');
  if (dpPctBadge) dpPctBadge.textContent = `${downPct}%`;

  const dpDollars = document.getElementById('down-payment-dollars');
  if (dpDollars) dpDollars.textContent = formatCurrency(downPaymentAmount);

  const irBadge = document.getElementById('interest-rate-badge');
  if (irBadge) irBadge.textContent = `${interestRate.toFixed(2)}%`;

  // Update Total Monthly Output
  const totalMonthlyEl = document.getElementById('total-monthly-payment');
  if (totalMonthlyEl) totalMonthlyEl.textContent = formatCurrency(totalMonthly);

  const donutLoanVal = document.getElementById('donut-loan-val');
  if (donutLoanVal) donutLoanVal.textContent = formatShortCurrency(loanPrincipal);

  // Update Legend Values & Percentages
  const piPct = totalMonthly > 0 ? (monthlyPI / totalMonthly) * 100 : 0;
  const taxPct = totalMonthly > 0 ? (monthlyTax / totalMonthly) * 100 : 0;
  const insPct = totalMonthly > 0 ? (monthlyIns / totalMonthly) * 100 : 0;
  const hoaPct = totalMonthly > 0 ? (monthlyHOA / totalMonthly) * 100 : 0;

  updateElementText('legend-principal-val', formatCurrency(monthlyPI));
  updateElementText('legend-principal-pct', `${piPct.toFixed(1)}%`);

  updateElementText('legend-taxes-val', formatCurrency(monthlyTax));
  updateElementText('legend-taxes-pct', `${taxPct.toFixed(1)}%`);

  updateElementText('legend-insurance-val', formatCurrency(monthlyIns));
  updateElementText('legend-insurance-pct', `${insPct.toFixed(1)}%`);

  updateElementText('legend-hoa-val', formatCurrency(monthlyHOA));
  updateElementText('legend-hoa-pct', `${hoaPct.toFixed(1)}%`);

  // Update SVG Donut Segments
  updateDonutChart(piPct, taxPct, insPct, hoaPct);

  // Update Amortization Schedule
  generateAmortizationSchedule(loanPrincipal, monthlyRate, monthlyPI, numberOfPayments, downPaymentAmount);
}

function updateElementText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateDonutChart(piPct, taxPct, insPct, hoaPct) {
  const segPI = document.getElementById('seg-principal');
  const segTax = document.getElementById('seg-taxes');
  const segIns = document.getElementById('seg-insurance');
  const segHOA = document.getElementById('seg-hoa');

  if (!segPI || !segTax || !segIns || !segHOA) return;

  const lenPI = (piPct / 100) * CIRCUMFERENCE;
  const lenTax = (taxPct / 100) * CIRCUMFERENCE;
  const lenIns = (insPct / 100) * CIRCUMFERENCE;
  const lenHOA = (hoaPct / 100) * CIRCUMFERENCE;

  // Segment 1 (PI)
  segPI.style.strokeDasharray = `${lenPI} ${CIRCUMFERENCE - lenPI}`;
  segPI.style.strokeDashoffset = `0`;

  // Segment 2 (Tax)
  let offset = -lenPI;
  segTax.style.strokeDasharray = `${lenTax} ${CIRCUMFERENCE - lenTax}`;
  segTax.style.strokeDashoffset = `${offset}`;

  // Segment 3 (Insurance)
  offset -= lenTax;
  segIns.style.strokeDasharray = `${lenIns} ${CIRCUMFERENCE - lenIns}`;
  segIns.style.strokeDashoffset = `${offset}`;

  // Segment 4 (HOA)
  offset -= lenIns;
  segHOA.style.strokeDasharray = `${lenHOA} ${CIRCUMFERENCE - lenHOA}`;
  segHOA.style.strokeDashoffset = `${offset}`;
}

function generateAmortizationSchedule(principal, monthlyRate, monthlyPayment, totalMonths, initialDownPayment) {
  const tbody = document.getElementById('amortization-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  let balance = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  const totalYears = Math.min(currentLoanYears, Math.ceil(totalMonths / 12));

  for (let year = 1; year <= totalYears; year++) {
    let yearPrincipalPaid = 0;
    let yearInterestPaid = 0;

    for (let month = 1; month <= 12; month++) {
      if (balance <= 0) break;
      const interestForMonth = balance * monthlyRate;
      let principalForMonth = monthlyPayment - interestForMonth;

      if (principalForMonth > balance) {
        principalForMonth = balance;
      }

      balance -= principalForMonth;
      yearPrincipalPaid += principalForMonth;
      yearInterestPaid += interestForMonth;
      cumulativeInterest += interestForMonth;
      cumulativePrincipal += principalForMonth;
    }

    const yearTotalPaid = yearPrincipalPaid + yearInterestPaid;
    const equityBuilt = initialDownPayment + cumulativePrincipal;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="year-badge">Year ${year}</span></td>
      <td class="text-gold">${formatCurrency(yearPrincipalPaid)}</td>
      <td class="text-blue">${formatCurrency(yearInterestPaid)}</td>
      <td>${formatCurrency(yearTotalPaid)}</td>
      <td class="text-dim">${formatCurrency(Math.max(balance, 0))}</td>
      <td class="text-emerald"><strong>${formatCurrency(equityBuilt)}</strong></td>
    `;
    tbody.appendChild(row);
  }
}

// Global hook for Estate Card buttons
window.applyEstatePrice = function(price) {
  const homePriceInput = document.getElementById('home-price-input');
  if (homePriceInput) {
    homePriceInput.value = price;
  }

  // Update active chips
  document.querySelectorAll('.quick-price-chips .chip').forEach(c => {
    c.classList.toggle('active', c.getAttribute('onclick')?.includes(String(price)));
  });

  calculateMortgage();

  const calcSection = document.getElementById('mortgage-calculator');
  if (calcSection) {
    calcSection.scrollIntoView({ behavior: 'smooth' });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Setup inputs
  const inputs = [
    'home-price-input',
    'down-payment-range',
    'interest-rate-input',
    'tax-rate-input',
    'ins-rate-input',
    'hoa-input'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateMortgage);
    }
  });

  // Term Toggles (15 vs 30)
  const term30Btn = document.getElementById('term-30-btn');
  const term15Btn = document.getElementById('term-15-btn');
  const scheduleBtnText = document.getElementById('schedule-btn-text');

  function setLoanTerm(years) {
    currentLoanYears = years;
    if (term30Btn) term30Btn.classList.toggle('active', years === 30);
    if (term15Btn) term15Btn.classList.toggle('active', years === 15);
    if (scheduleBtnText) {
      scheduleBtnText.textContent = `View ${years}-Year Amortization Schedule`;
    }
    calculateMortgage();
  }

  if (term30Btn) term30Btn.addEventListener('click', () => setLoanTerm(30));
  if (term15Btn) term15Btn.addEventListener('click', () => setLoanTerm(15));

  // Amortization Table Drawer Toggle
  const toggleScheduleBtn = document.getElementById('toggle-schedule-btn');
  const drawer = document.getElementById('amortization-drawer');
  const drawerCloseBtn = document.getElementById('drawer-close-btn');
  const toggleIcon = document.getElementById('schedule-toggle-icon');

  function toggleDrawer() {
    if (!drawer) return;
    const isHidden = drawer.style.display === 'none';
    drawer.style.display = isHidden ? 'block' : 'none';
    if (toggleIcon) toggleIcon.textContent = isHidden ? '↑' : '↓';
    if (isHidden) {
      drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  if (toggleScheduleBtn) toggleScheduleBtn.addEventListener('click', toggleDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', toggleDrawer);

  // Initialize
  calculateMortgage();
  console.log('Vanguard Real Estate Mortgage Calculator Engine loaded');
});

/* ==========================================================
   Property comparison (up to 2 estates, side-by-side drawer)
   Cards are rendered by filters.js and re-rendered on every filter
   change, so the checkboxes are added by a MutationObserver and the
   selection lives here, keyed by estate id.
   ========================================================== */
(function () {
  const MAX_COMPARE = 2;
  // Land size is not part of the ESTATES data, so the demo values live here.
  const ACREAGE = {
    'glass-horizon': 2.4,
    'aspen-ridge': 38,
    'azur-chateau': 12.5,
    'cay-island': 40
  };

  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('estate-grid');
    const tray = document.getElementById('cmp-tray');
    const overlay = document.getElementById('cmp-overlay');
    const drawer = document.getElementById('cmp-drawer');
    const table = document.getElementById('cmp-table');
    const chipsEl = document.getElementById('cmp-chips');
    const countEl = document.getElementById('cmp-tray-count');
    const noteEl = document.getElementById('cmp-tray-note');
    const openBtn = document.getElementById('cmp-open');
    const clearBtn = document.getElementById('cmp-clear');
    const closeBtn = document.getElementById('cmp-close');
    const resetBtn = document.getElementById('cmp-reset');
    const statusEl = document.getElementById('cmp-status');
    if (!grid || !tray || !overlay || !drawer || !table || typeof ESTATES === 'undefined') return;

    const byId = {};
    const byName = {};
    ESTATES.forEach(e => { byId[e.id] = e; byName[e.name] = e; });

    let selected = [];
    let lastTrigger = null;
    const inertTargets = ['.hero', '.listings', '.calculator-section', '#cmp-tray']
      .map(sel => document.querySelector(sel)).filter(Boolean);

    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // A warning replaces the tray note for a few seconds, then the normal hint comes back.
    let noteTimer = 0;
    function defaultNote() {
      return selected.length === MAX_COMPARE ? 'Ready to compare.' : 'Select ' + (MAX_COMPARE - selected.length) + ' more to compare side by side.';
    }
    function warn(msg) {
      noteEl.textContent = msg;
      announce(msg);
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => { noteEl.textContent = defaultNote(); }, 4000);
    }

    function announce(msg) {
      statusEl.textContent = '';
      // a short delay makes repeated identical messages get read again
      setTimeout(() => { statusEl.textContent = msg; }, 30);
    }

    /* ---------- card checkboxes ---------- */
    function decorateCards() {
      grid.querySelectorAll('.card').forEach(card => {
        const nameEl = card.querySelector('h3');
        const estate = nameEl && byName[nameEl.textContent.trim()];
        if (!estate) return;
        if (!card.querySelector('.cmp-toggle')) {
          const label = document.createElement('label');
          label.className = 'cmp-toggle';
          label.innerHTML = '<input type="checkbox" class="cmp-check" value="' + escapeHtml(estate.id) + '" aria-label="Compare ' + escapeHtml(estate.name) + '">' +
            '<span class="cmp-toggle-box" aria-hidden="true"></span><span class="cmp-toggle-text">Compare</span>';
          const anchor = card.querySelector('.calc-estate-btn');
          card.insertBefore(label, anchor);
        }
      });
      syncCards();
    }

    function syncCards() {
      const full = selected.length >= MAX_COMPARE;
      grid.querySelectorAll('.cmp-check').forEach(input => {
        const on = selected.includes(input.value);
        input.checked = on;
        input.setAttribute('aria-disabled', String(full && !on));
        const card = input.closest('.card');
        card.classList.toggle('is-compared', on);
        card.classList.toggle('cmp-locked', full && !on);
      });
    }

    new MutationObserver(decorateCards).observe(grid, { childList: true });

    grid.addEventListener('click', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.classList.contains('cmp-check')) return;
      if (!input.checked) return; // unchecking is always allowed
      // click fires after the box toggled, so a checked box here means "add"
      if (selected.length >= MAX_COMPARE) {
        event.preventDefault();
        warn('You can compare ' + MAX_COMPARE + ' estates at a time. Remove one to pick another.');
      }
    });

    grid.addEventListener('change', event => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.classList.contains('cmp-check')) return;
      const id = input.value;
      if (input.checked && !selected.includes(id) && selected.length < MAX_COMPARE) {
        selected.push(id);
        announce(byId[id].name + ' added to comparison. ' + selected.length + ' of ' + MAX_COMPARE + ' selected.');
      } else if (!input.checked) {
        selected = selected.filter(s => s !== id);
        announce(byId[id].name + ' removed from comparison. ' + selected.length + ' of ' + MAX_COMPARE + ' selected.');
      }
      update();
    });

    /* ---------- tray ---------- */
    function update() {
      syncCards();
      const n = selected.length;
      tray.hidden = n === 0;
      document.body.classList.toggle('cmp-has-tray', n > 0);
      countEl.textContent = n + ' / ' + MAX_COMPARE;
      clearTimeout(noteTimer);
      noteEl.textContent = defaultNote();
      chipsEl.innerHTML = selected.map(id =>
        '<li class="cmp-chip"><span>' + escapeHtml(byId[id].name) + '</span>' +
        '<button type="button" class="cmp-chip-x" data-remove="' + escapeHtml(id) + '" aria-label="Remove ' + escapeHtml(byId[id].name) + ' from comparison">&times;</button></li>'
      ).join('');
      openBtn.setAttribute('aria-disabled', String(n < MAX_COMPARE));
    }

    chipsEl.addEventListener('click', event => {
      const btn = event.target.closest('[data-remove]');
      if (!btn) return;
      const id = btn.dataset.remove;
      selected = selected.filter(s => s !== id);
      announce(byId[id].name + ' removed from comparison. ' + selected.length + ' of ' + MAX_COMPARE + ' selected.');
      update();
      // keep keyboard users in the tray, or send them back to the card checkbox
      const next = chipsEl.querySelector('.cmp-chip-x');
      if (next) next.focus();
      else {
        const box = grid.querySelector('.cmp-check[value="' + id + '"]');
        if (box) box.focus();
      }
    });

    function clearAll(message) {
      selected = [];
      update();
      announce(message || 'Comparison cleared.');
    }

    clearBtn.addEventListener('click', () => {
      clearAll();
      const first = grid.querySelector('.cmp-check');
      if (first) first.focus();
    });

    /* ---------- drawer ---------- */
    function row(label, cells, bestIndex, badge) {
      return '<tr><th scope="row">' + label + '</th>' + cells.map((html, i) =>
        '<td class="' + (i === bestIndex ? 'is-best' : '') + '"><span class="cmp-val">' + html + '</span>' +
        (i === bestIndex ? '<span class="cmp-badge">' + badge + '</span>' : '') + '</td>'
      ).join('') + '</tr>';
    }

    // Index of the winning estate for a numeric row, or -1 on a tie / missing data.
    function best(values, higherWins) {
      if (values.some(v => v == null) || values[0] === values[1]) return -1;
      const winner = higherWins ? Math.max(values[0], values[1]) : Math.min(values[0], values[1]);
      return values.indexOf(winner);
    }

    function renderTable() {
      const [a, b] = selected.map(id => byId[id]);
      const pair = [a, b];
      const acres = pair.map(e => (ACREAGE[e.id] == null ? null : ACREAGE[e.id]));
      const perSqft = pair.map(e => e.price / e.sqft);
      const pool = pair.map(e => e.amenities.includes('Infinity Pool'));
      const poolBest = pool[0] === pool[1] ? -1 : (pool[0] ? 0 : 1);

      let html = '<caption class="cmp-sr">Side-by-side comparison of ' + escapeHtml(a.name) + ' and ' + escapeHtml(b.name) + '</caption>';
      html += '<thead><tr><td class="cmp-corner"><span class="cmp-sr">Feature</span></td>' + pair.map(e =>
        '<th scope="col" class="cmp-col-head"><span class="cmp-col-icon" aria-hidden="true">' + e.icon + '</span>' +
        '<span class="cmp-col-name">' + escapeHtml(e.name) + '</span>' +
        '<span class="cmp-col-loc">' + escapeHtml(e.location) + '</span></th>').join('') + '</tr></thead><tbody>';
      html += row('Price', pair.map(e => money(e.price)), best(pair.map(e => e.price), false), 'Lower price');
      html += row('Price per sq ft', perSqft.map(v => money(v)), best(perSqft.map(Math.round), false), 'Better value');
      html += row('Square footage', pair.map(e => e.sqft.toLocaleString('en-US') + ' sq ft'), best(pair.map(e => e.sqft), true), 'More space');
      html += row('Bedrooms', pair.map(e => String(e.beds)), best(pair.map(e => e.beds), true), 'More bedrooms');
      html += row('Bathrooms', pair.map(e => String(e.baths)), best(pair.map(e => e.baths), true), 'More baths');
      html += row('Infinity pool', pool.map(p => p ? 'Yes' : 'No'), poolBest, 'Has pool');
      html += row('Acreage', acres.map(v => v == null ? 'N/A' : v + ' acres'), best(acres, true), 'More land');
      html += row('Property type', pair.map(e => escapeHtml(e.type)), -1, '');
      html += '</tbody><tfoot><tr><th scope="row"><span class="cmp-sr">Actions</span></th>' + pair.map(e =>
        '<td><button type="button" class="cmp-btn cmp-btn-ghost cmp-mortgage" data-mortgage="' + e.price + '">Calculate Mortgage ↗</button></td>').join('') + '</tr></tfoot>';
      table.innerHTML = html;
    }

    function openDrawer() {
      if (selected.length < MAX_COMPARE) {
        const left = MAX_COMPARE - selected.length;
        warn('Select ' + left + ' more ' + (left === 1 ? 'estate' : 'estates') + ' to compare side by side.');
        return;
      }
      lastTrigger = document.activeElement;
      renderTable();
      overlay.hidden = false;
      inertTargets.forEach(el => { el.inert = true; });
      document.body.classList.add('cmp-open');
      // let the browser paint the hidden state first so the slide-in animates
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      drawer.focus();
      announce('Comparing ' + byId[selected[0]].name + ' and ' + byId[selected[1]].name + '.');
    }

    function closeDrawer(restoreFocus) {
      if (overlay.hidden) return;
      overlay.classList.remove('is-open');
      overlay.hidden = true;
      inertTargets.forEach(el => { el.inert = false; });
      document.body.classList.remove('cmp-open');
      if (restoreFocus !== false) {
        const target = lastTrigger && document.contains(lastTrigger) && !lastTrigger.closest('[hidden]') ? lastTrigger : openBtn;
        target.focus();
      }
    }

    openBtn.addEventListener('click', openDrawer);
    closeBtn.addEventListener('click', () => closeDrawer());
    resetBtn.addEventListener('click', () => {
      closeDrawer(false);
      clearAll('Comparison cleared.');
      const first = grid.querySelector('.cmp-check');
      if (first) first.focus();
    });
    overlay.addEventListener('click', event => { if (event.target === overlay) closeDrawer(); });

    table.addEventListener('click', event => {
      const btn = event.target.closest('[data-mortgage]');
      if (!btn) return;
      closeDrawer(false);
      if (typeof applyEstatePrice === 'function') applyEstatePrice(Number(btn.dataset.mortgage));
    });

    document.addEventListener('keydown', event => {
      if (overlay.hidden) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab') return;
      // keep Tab inside the dialog
      const focusable = Array.from(drawer.querySelectorAll('button:not([disabled])')).filter(el => el.offsetParent !== null);
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

    decorateCards();
    update();
  });
})();
