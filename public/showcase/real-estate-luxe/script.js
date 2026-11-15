// Manual gallery: no autoplay, so visitors control reading and navigation pace.
(() => {
  const gallery = document.querySelector('.property-gallery');
  if (!gallery) return;
  const photos = [
    { file: 'pool-residence.jpg', title: 'Poolside residence', alt: 'Modern residence beside a swimming pool with lounge chairs', credit: 'Salman Saqib', url: 'https://unsplash.com/photos/a-modern-house-with-a-pool-and-lounge-chairs-WaC-JFfF21M' },
    { file: 'garden-residence.jpg', title: 'Garden residence', alt: 'Modern stone residence with large windows overlooking a lush garden', credit: 'Aalo Lens', url: 'https://unsplash.com/photos/modern-house-with-large-windows-and-lush-garden-eWOgoFHlE8g' },
    { file: 'white-residence.jpg', title: 'White residence', alt: 'White residence with glass garage doors and landscaped plants', credit: 'GoodLifeConstruction', url: 'https://unsplash.com/photos/modern-white-house-with-glass-garage-doors-and-plants-MUiv6OcHoto' }
  ];
  const image = gallery.querySelector('#gallery-image');
  const error = gallery.querySelector('#gallery-error');
  const status = gallery.querySelector('#gallery-status');
  const credit = gallery.querySelector('#gallery-credit');
  const dots = Array.from(gallery.querySelectorAll('.gallery-dots button'));
  let index = 0;
  image.addEventListener('error', () => { image.hidden = true; error.hidden = false; });
  image.addEventListener('load', () => { image.hidden = false; error.hidden = true; });
  function showPhoto(next) {
    index = (next + photos.length) % photos.length;
    const photo = photos[index];
    error.hidden = true;
    image.hidden = false;
    image.alt = photo.alt;
    image.src = `images/${photo.file}`;
    status.textContent = `Photo ${index + 1} of ${photos.length} — ${photo.title}`;
    credit.textContent = `${photo.credit} / Unsplash`;
    credit.href = photo.url;
    dots.forEach((dot, position) => dot.setAttribute('aria-pressed', String(position === index)));
  }
  gallery.querySelector('.gallery-prev').addEventListener('click', () => showPhoto(index - 1));
  gallery.querySelector('.gallery-next').addEventListener('click', () => showPhoto(index + 1));
  dots.forEach((dot, position) => dot.addEventListener('click', () => showPhoto(position)));
  gallery.addEventListener('keydown', (event) => {
    // Do not intercept navigation keys on the attribution link.
    if (!event.target.closest('button')) return;
    const next = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: photos.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    showPhoto(next);
  });
  // Handle an image that failed before the script attached its listeners.
  if (image.complete && image.naturalWidth === 0) { image.hidden = true; error.hidden = false; }
})();

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

  // Update 15-Year vs 30-Year Trajectory & Yield (Issue #447)
  updateAmortizationTrajectory(homePrice, loanPrincipal, interestRate);
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

// 15-Year vs 30-Year Amortization Trajectory Chart & Yield Projector (Issue #447)
function updateAmortizationTrajectory(homePrice, loanPrincipal, interestRate) {
  if (loanPrincipal <= 0) return;

  const rateMonthly = (interestRate / 100) / 12;

  // 1. Calculate 15-Year Fixed
  const n15 = 15 * 12;
  const c15 = Math.pow(1 + rateMonthly, n15);
  const pi15 = rateMonthly > 0 ? loanPrincipal * ((rateMonthly * c15) / (c15 - 1)) : loanPrincipal / n15;
  const totalInterest15 = (pi15 * n15) - loanPrincipal;

  // 2. Calculate 30-Year Fixed
  const n30 = 30 * 12;
  const c30 = Math.pow(1 + rateMonthly, n30);
  const pi30 = rateMonthly > 0 ? loanPrincipal * ((rateMonthly * c30) / (c30 - 1)) : loanPrincipal / n30;
  const totalInterest30 = (pi30 * n30) - loanPrincipal;

  const savings = Math.max(0, totalInterest30 - totalInterest15);

  updateElementText('traj-pi-15', formatCurrency(pi15) + ' / mo');
  updateElementText('traj-interest-15', formatShortCurrency(totalInterest15));

  updateElementText('traj-pi-30', formatCurrency(pi30) + ' / mo');
  updateElementText('traj-interest-30', formatShortCurrency(totalInterest30));

  updateElementText('traj-savings-amount', 'Save ' + formatShortCurrency(savings));

  // 3. Compute year-by-year remaining balances for 15-yr and 30-yr
  const balances15 = [loanPrincipal];
  let curBal15 = loanPrincipal;
  for (let m = 1; m <= n15; m++) {
    const interest = curBal15 * rateMonthly;
    const principalPaid = pi15 - interest;
    curBal15 = Math.max(0, curBal15 - principalPaid);
    if (m % 12 === 0) {
      balances15.push(curBal15);
    }
  }

  const balances30 = [loanPrincipal];
  let curBal30 = loanPrincipal;
  for (let m = 1; m <= n30; m++) {
    const interest = curBal30 * rateMonthly;
    const principalPaid = pi30 - interest;
    curBal30 = Math.max(0, curBal30 - principalPaid);
    if (m % 12 === 0) {
      balances30.push(curBal30);
    }
  }

  // 4. Render SVG paths on 700x260 viewport (padding: left 60, right 670, top 20, bottom 220)
  const left = 60;
  const right = 670;
  const top = 20;
  const bottom = 220;
  const width = right - left;
  const height = bottom - top;

  // Grid lines & labels
  const gridG = document.getElementById('traj-grid-lines');
  const axisG = document.getElementById('traj-axis-labels');
  if (gridG && axisG) {
    gridG.innerHTML = '';
    axisG.innerHTML = '';

    // Horizontal grid lines (4 lines: 0%, 25%, 50%, 75%, 100%)
    for (let i = 0; i <= 4; i++) {
      const y = bottom - (i / 4) * height;
      const amt = (i / 4) * loanPrincipal;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', left);
      line.setAttribute('x2', right);
      line.setAttribute('y1', y);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'grid-line');
      gridG.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', left - 8);
      text.setAttribute('y', y + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('class', 'chart-axis-text');
      text.textContent = formatShortCurrency(amt);
      axisG.appendChild(text);
    }

    // Vertical year ticks (Year 0, 5, 10, 15, 20, 25, 30)
    for (let yr = 0; yr <= 30; yr += 5) {
      const x = left + (yr / 30) * width;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('x2', x);
      line.setAttribute('y1', top);
      line.setAttribute('y2', bottom);
      line.setAttribute('class', 'grid-line');
      gridG.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', bottom + 20);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'chart-axis-text');
      text.textContent = `Yr ${yr}`;
      axisG.appendChild(text);
    }
  }

  // Build path D strings
  const path15 = document.getElementById('traj-path-15');
  const path30 = document.getElementById('traj-path-30');

  if (path15) {
    const pts15 = [];
    for (let yr = 0; yr <= 15; yr++) {
      const x = left + (yr / 30) * width;
      const y = bottom - (balances15[yr] / loanPrincipal) * height;
      pts15.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    path15.setAttribute('d', `M ${pts15.join(' L ')}`);
  }

  if (path30) {
    const pts30 = [];
    for (let yr = 0; yr <= 30; yr++) {
      const x = left + (yr / 30) * width;
      const y = bottom - (balances30[yr] / loanPrincipal) * height;
      pts30.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    path30.setAttribute('d', `M ${pts30.join(' L ')}`);
  }

  // 5. Update Investment Yield & Cap Rate Estimator Subcard
  const monthlyRent = Math.round((homePrice * 0.07) / 12);
  const grossYield = ((monthlyRent * 12) / homePrice) * 100;
  const annualExpenses = (homePrice * 0.012) + (homePrice * 0.0035) + 10200 + (monthlyRent * 12 * 0.1);
  const netOperatingIncome = (monthlyRent * 12) - annualExpenses;
  const capRate = Math.max(1.0, (netOperatingIncome / homePrice) * 100);
  const equityRoi = 38.5 + (grossYield * 0.6);

  updateElementText('yield-monthly-rent', formatCurrency(monthlyRent) + ' / mo');
  updateElementText('yield-gross-rate', grossYield.toFixed(2) + '%');
  updateElementText('yield-net-cap', capRate.toFixed(2) + '%');
  updateElementText('yield-5yr-roi', '+' + equityRoi.toFixed(1) + '%');
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

/* ===== BEGIN Issue #357 & #448: Interactive Multi-Level Architectural Floor Plan & Sunlight Simulator ===== */
function calculateMeasurement(p1, p2, scale = 0.05) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distPx = Math.hypot(dx, dy);
  const meters = +(distPx * scale).toFixed(2);
  const feet = +(meters * 3.28084).toFixed(1);
  const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  return { distPx, meters, feet, angleDeg };
}

window.calculateMeasurement = calculateMeasurement;

(function initFloorplanSunlightSimulator() {
  // Rooms Architectural Specs Catalog
  const ROOMS_DATA = {
    foyer: {
      tag: 'GROUND LEVEL · ZONE 01',
      name: 'Grand Foyer',
      dim: "18' 4\" × 22' 0\" · 403 SQ FT",
      dimMetric: "5.59m × 6.70m · 37.4 SQ M",
      sqft: 403,
      sqm: 37.4,
      ceiling: "14' Coffered with Bronze Reveal",
      exposure: 'Southern Ambient Light',
      orientation: 'south',
      flooring: 'Honed Noir St. Laurent Marble',
      glazing: 'Low-E Acoustic Solar Guard 70',
      note: 'The Grand Foyer was engineered to welcome guests with double-height volume, capturing luminous reflection from the exterior water courtyard while maintaining acoustic tranquility.'
    },
    salon: {
      tag: 'GROUND LEVEL · ZONE 02',
      name: 'Great Salon & Living Atrium',
      dim: "35' 0\" × 24' 6\" · 857 SQ FT",
      dimMetric: "10.67m × 7.47m · 79.6 SQ M",
      sqft: 857,
      sqm: 79.6,
      ceiling: "16' Architectural Exposed Timber Beams",
      exposure: 'Dual North-South Cross Illumination',
      orientation: 'south-north',
      flooring: 'White Oak Chevron Parquet (Bleached Finish)',
      glazing: 'Motorized Triple-Pane Structural Glass Curtains',
      note: 'Conceived as the social core of the estate, the Great Salon features 12-foot motorized pocket doors seamlessly blending indoor sanctuary with coastal Pacific horizon.'
    },
    kitchen: {
      tag: 'GROUND LEVEL · ZONE 03',
      name: "Gourmet Chef's Kitchen & Pantry",
      dim: "22' 0\" × 18' 6\" · 407 SQ FT",
      dimMetric: "6.70m × 5.64m · 37.8 SQ M",
      sqft: 407,
      sqm: 37.8,
      ceiling: "12' Flush Drywall with Integrated Linear LED",
      exposure: 'Eastern Morning Solar Light',
      orientation: 'east',
      flooring: 'Large-Format Terrazzo Slabs',
      glazing: 'Clerestory Transom Daylight Monitors',
      note: 'Custom Boffi cabinetry with bookmatched Calacatta Borghini marble monolithic island, equipped with dual Sub-Zero refrigeration columns and La Cornue artisan range.'
    },
    wine: {
      tag: 'GROUND LEVEL · ZONE 04',
      name: 'Sommelier Wine Vault',
      dim: "16' 0\" × 14' 0\" · 224 SQ FT",
      dimMetric: "4.88m × 4.27m · 20.8 SQ M",
      sqft: 224,
      sqm: 20.8,
      ceiling: "10' Vaulted Tuscan Brick Arch",
      exposure: 'Protected Sub-Level (Zero Direct UV Solar)',
      orientation: 'protected',
      flooring: 'Reclaimed Antiqued French Bluestone',
      glazing: 'Argon-Filled Thermal Double Glazing with UV Shield',
      note: 'Engineered with triple-redundant WhisperKOOL environmental climate modules preserving 1,800 reserve bottles at a constant 55°F and 65% relative humidity.'
    },
    library: {
      tag: 'GROUND LEVEL · ZONE 05',
      name: 'Executive Library & Study',
      dim: "24' 0\" × 16' 8\" · 400 SQ FT",
      dimMetric: "7.31m × 5.08m · 37.2 SQ M",
      sqft: 400,
      sqm: 37.2,
      ceiling: "13' Custom Fluted Walnut Millwork",
      exposure: 'Western Sunset & Golden Hour Light',
      orientation: 'west',
      flooring: 'Fumed European Oak Herringbone',
      glazing: 'Floor-to-Ceiling Steel-Framed Casement Windows',
      note: 'Designed for quiet reflection and global executive operations, insulated with hidden acoustic batt walls and concealed humidor cabinet.'
    },
    terrace: {
      tag: 'GROUND LEVEL · ZONE 06 (EXTERIOR)',
      name: 'Infinity Ocean Terrace & Resort Pool',
      dim: "68' 0\" × 26' 0\" · 1,768 SQ FT",
      dimMetric: "20.73m × 7.92m · 164.3 SQ M",
      sqft: 1768,
      sqm: 164.3,
      ceiling: 'Open Sky / Cantilevered Bronze Canopy',
      exposure: 'Full Panoramic 180° Solar Arch (Dawn to Dusk)',
      orientation: 'all',
      flooring: 'Flamed Non-Slip Travertine Pavers',
      glazing: 'Frameless Laminated Structural Glass Balustrade',
      note: 'Suspended 180 feet above the ocean with zero-edge heated saline lap pool, submerged baja shelf sunbeds, and architectural linear fire trough.'
    },
    master: {
      tag: 'UPPER LEVEL · ZONE 07',
      name: 'Master Penthouse Sanctuary Suite',
      dim: "38' 0\" × 22' 0\" · 836 SQ FT",
      dimMetric: "11.58m × 6.70m · 77.7 SQ M",
      sqft: 836,
      sqm: 77.7,
      ceiling: "14' Raised Tray with Hidden Perimeter Cove Light",
      exposure: 'Direct Western Sunset & Golden Hour Glow',
      orientation: 'west',
      flooring: 'Quarter-Sawn White Oak Planks (8" Width)',
      glazing: 'Acoustic Laminated Hurricane Impact Glass',
      note: 'Spans the entire western wing of the upper level with private ocean-facing cantilevered lanai, dual-sided linear gas fireplace, and motorized automated blackout shades.'
    },
    dressing: {
      tag: 'UPPER LEVEL · ZONE 08',
      name: 'Dual Designer Dressing Salons',
      dim: "22' 0\" × 15' 0\" · 330 SQ FT",
      dimMetric: "6.70m × 4.57m · 30.7 SQ M",
      sqft: 330,
      sqm: 30.7,
      ceiling: "11' Flush Ceiling with 98 CRI Vanity Spotlights",
      exposure: 'Filtered Northern Diffused Light (Color Neutral)',
      orientation: 'north',
      flooring: 'Silk-Wool Blend Low-Pile Luxury Carpet',
      glazing: 'Frosted Privacy Clerestory Bands',
      note: 'Equipped with bespoke smoked-glass wardrobe display cases, leather-lined jewelry island drawers, and dedicated climate-controlled handbag gallery.'
    },
    spa: {
      tag: 'UPPER LEVEL · ZONE 09',
      name: 'Spa Wellness Bath & Cedar Sauna',
      dim: "22' 0\" × 15' 0\" · 330 SQ FT",
      dimMetric: "6.70m × 4.57m · 30.7 SQ M",
      sqft: 330,
      sqm: 30.7,
      ceiling: "12' Water-Resistant Tadelakt Plaster Ceiling",
      exposure: 'Eastern Morning Awakening Sun',
      orientation: 'east',
      flooring: 'Bookmatched Statuario Marble Heated Slabs',
      glazing: 'Privacy Smart Glass (Opaque/Clear Electrochromic)',
      note: 'Features an oversized carved marble freestanding soaking tub overlooking the canyon, steam shower with chroma-therapy, and custom Scandinavian red cedar dry sauna.'
    },
    skylounge: {
      tag: 'ROOFTOP LEVEL · ZONE 10',
      name: 'Rooftop Sky Lounge & Cocktail Pavilion',
      dim: "32' 0\" × 18' 0\" · 576 SQ FT",
      dimMetric: "9.75m × 5.48m · 53.5 SQ M",
      sqft: 576,
      sqm: 53.5,
      ceiling: "12' Motorized Louvered Bioclimatic Pergola",
      exposure: 'Panoramic 360° Sky Arc',
      orientation: 'all',
      flooring: 'Textured Flamed Basalt Flagstones',
      glazing: 'Frameless Glass Windbreak Panels',
      note: 'Commanding uninterrupted 360-degree Pacific ocean and Santa Monica mountain views with custom teak banquette seating, integrated quartz bar, and gas fire ribbon.'
    },
    observatory: {
      tag: 'ROOFTOP LEVEL · ZONE 11',
      name: 'Stargazing Telescope Observatory',
      dim: "18' DIA · 254 SQ FT",
      dimMetric: "5.48m DIA · 23.6 SQ M",
      sqft: 254,
      sqm: 23.6,
      ceiling: "16' Motorized Hemispherical Rotating Dome",
      exposure: 'Zenith Night Sky Orientation',
      orientation: 'north',
      flooring: 'Anti-Vibration Carbon Composite Decking',
      glazing: 'Aperture Shutter with Zero Light Pollution Sealing',
      note: 'Equipped with a research-grade PlaneWave CDK17 astrograph telescope on a direct bedrock-isolated concrete pier.'
    },
    sundeck: {
      tag: 'ROOFTOP LEVEL · ZONE 12 (EXTERIOR)',
      name: 'Cantilevered Sky Pool & Sun Deck',
      dim: "68' 0\" × 22' 0\" · 1,496 SQ FT",
      dimMetric: "20.7m × 6.7m · 139.0 SQ M",
      sqft: 1496,
      sqm: 139.0,
      ceiling: 'Open Celestial Sky',
      exposure: 'Full Unobstructed Southern Solar Arc',
      orientation: 'south',
      flooring: 'Cool-Touch Thermo-Ash Decking',
      glazing: 'Structural Acrylic Infinity Spillway',
      note: 'Dramatic glass-bottom cantilever hovering 200 feet over the bluff with hydrotherapy jets and daybed cabanas.'
    },
    alfresco: {
      tag: 'ROOFTOP LEVEL · ZONE 13',
      name: 'Alfresco Teppanyaki Grill & Kitchen',
      dim: "16' 0\" × 14' 0\" · 224 SQ FT",
      dimMetric: "4.88m × 4.27m · 20.8 SQ M",
      sqft: 224,
      sqm: 20.8,
      ceiling: "11' Marine-Grade Stainless Canopy",
      exposure: 'Eastern Morning & Twilight Light',
      orientation: 'east',
      flooring: 'Honed Non-Porous Quartzite Tiles',
      glazing: 'Open-Air Architectural Screen',
      note: 'Complete outdoor culinary theater with Evo Affinity teppanyaki flattop, wood-fired Mugnaini pizza oven, and dual beverage taps.'
    }
  };

  window.ROOMS_DATA = ROOMS_DATA;

  const section = document.getElementById('estate-floorplan-section');
  if (!section) return;

  // State
  let _currentLevel = 'ground';
  let currentRoomId = 'foyer';
  let currentHour = 13; // 1:00 PM

  // DOM Elements
  const tabGround = document.getElementById('tabGroundLevel');
  const tabUpper = document.getElementById('tabUpperLevel');
  const tabRooftop = document.getElementById('tabRooftopLevel');
  const roomsGroundGroup = document.getElementById('roomsGroundLevel');
  const roomsUpperGroup = document.getElementById('roomsUpperLevel');
  const roomsRooftopGroup = document.getElementById('roomsRooftopLevel');

  const sunTimeRange = document.getElementById('sunTimeRange');
  const sunTimeDisplay = document.getElementById('sunTimeDisplay');
  const sunPhaseIcon = document.getElementById('sunPhaseIcon');
  const sunAzimuthDisplay = document.getElementById('sunAzimuthDisplay');
  const sunElevationDisplay = document.getElementById('sunElevationDisplay');
  const solarLightOverlay = document.getElementById('solarLightOverlay');

  const sunVectorLine = document.getElementById('sunVectorLine');
  const sunVectorHead = document.getElementById('sunVectorHead');

  // Sidebar Elements
  const specRoomTag = document.getElementById('specRoomTag');
  const specRoomName = document.getElementById('specRoomName');
  const specRoomDim = document.getElementById('specRoomDim');
  const specCeiling = document.getElementById('specCeiling');
  const specExposure = document.getElementById('specExposure');
  const specFlooring = document.getElementById('specFlooring');
  const specGlazing = document.getElementById('specGlazing');
  const solarAnalysisDesc = document.getElementById('solarAnalysisDesc');
  const daylightFactorVal = document.getElementById('daylightFactorVal');
  const daylightMeterFill = document.getElementById('daylightMeterFill');
  const specArchitectNote = document.getElementById('specArchitectNote');

  // Unit Toggle (Imperial / Metric)
  let currentUnit = 'imperial';
  const btnUnitToggle = document.getElementById('btnUnitToggle');
  const unitToggleLabel = document.getElementById('unitToggleLabel');

  if (btnUnitToggle) {
    btnUnitToggle.addEventListener('click', () => {
      currentUnit = currentUnit === 'imperial' ? 'metric' : 'imperial';
      if (unitToggleLabel) {
        unitToggleLabel.textContent = currentUnit === 'imperial' ? 'Metric (m)' : 'Imperial (ft)';
      }
      if (currentRoomId && ROOMS_DATA[currentRoomId]) {
        selectRoom(currentRoomId);
      }
    });
  }

  // Level Switcher Engine (Ground, Penthouse/Upper, Rooftop Terrace)
  function setLevel(lvl) {
    _currentLevel = lvl;
    const tabs = [
      { tab: tabGround, group: roomsGroundGroup, lvl: 'ground', defaultRoom: 'foyer' },
      { tab: tabUpper, group: roomsUpperGroup, lvl: 'upper', defaultRoom: 'master' },
      { tab: tabRooftop, group: roomsRooftopGroup, lvl: 'rooftop', defaultRoom: 'skylounge' }
    ];

    tabs.forEach(({ tab, group, lvl: l, defaultRoom }) => {
      const isCur = (l === lvl);
      if (tab) {
        tab.classList.toggle('active', isCur);
        tab.setAttribute('aria-selected', String(isCur));
      }
      if (group) {
        group.style.display = isCur ? 'block' : 'none';
      }
      if (isCur) {
        selectRoom(defaultRoom);
      }
    });
  }

  if (tabGround) tabGround.addEventListener('click', () => setLevel('ground'));
  if (tabUpper) tabUpper.addEventListener('click', () => setLevel('upper'));
  if (tabRooftop) tabRooftop.addEventListener('click', () => setLevel('rooftop'));

  // Room Selection Handler
  function selectRoom(roomId) {
    if (!ROOMS_DATA[roomId]) return;
    currentRoomId = roomId;

    // Remove active state from all room SVG groups
    document.querySelectorAll('.room-group').forEach(rg => {
      rg.classList.remove('active');
    });

    const activeEl = document.querySelector(`.room-group[data-room="${roomId}"]`);
    if (activeEl) activeEl.classList.add('active');

    // Update Sidebar Specs
    const d = ROOMS_DATA[roomId];
    if (specRoomTag) specRoomTag.textContent = d.tag;
    if (specRoomName) specRoomName.textContent = d.name;
    if (specRoomDim) specRoomDim.textContent = currentUnit === 'imperial' ? d.dim : (d.dimMetric || d.dim);
    if (specCeiling) specCeiling.textContent = d.ceiling;
    if (specExposure) specExposure.textContent = d.exposure;
    if (specFlooring) specFlooring.textContent = d.flooring;
    if (specGlazing) specGlazing.textContent = d.glazing;
    if (specArchitectNote) specArchitectNote.textContent = `"${d.note}"`;

    updateSolarAnalysis();
  }

  // Interactive Measurement Annotator Tool (Issue #448)
  let isMeasuring = false;
  let measureStart = null;
  const btnMeasureTool = document.getElementById('btnMeasureTool');
  const btnClearMeasure = document.getElementById('btnClearMeasure');
  const measureActivePill = document.getElementById('measureActivePill');
  const blueprintSvg = document.getElementById('blueprintSvg');

  const measureLine = document.getElementById('measureLine');
  const measureStartPoint = document.getElementById('measureStartPoint');
  const measureEndPoint = document.getElementById('measureEndPoint');
  const measureLabelGroup = document.getElementById('measureLabelGroup');
  const measureLabelBg = document.getElementById('measureLabelBg');
  const measureLabelText = document.getElementById('measureLabelText');

  function calculateMeasurement(p1, p2, scale = 0.05) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distPx = Math.hypot(dx, dy);
    const meters = +(distPx * scale).toFixed(2);
    const feet = +(meters * 3.28084).toFixed(1);
    const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
    return { distPx, meters, feet, angleDeg };
  }

  function getSvgCoords(evt) {
    if (!blueprintSvg || typeof blueprintSvg.createSVGPoint !== 'function') {
      return { x: 0, y: 0 };
    }
    const pt = blueprintSvg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = blueprintSvg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
  }

  function renderMeasurement(p1, p2) {
    const meas = calculateMeasurement(p1, p2);
    if (measureLine) {
      measureLine.setAttribute('x1', p1.x);
      measureLine.setAttribute('y1', p1.y);
      measureLine.setAttribute('x2', p2.x);
      measureLine.setAttribute('y2', p2.y);
      measureLine.style.display = 'block';
    }
    if (measureStartPoint) {
      measureStartPoint.setAttribute('cx', p1.x);
      measureStartPoint.setAttribute('cy', p1.y);
      measureStartPoint.style.display = 'block';
    }
    if (measureEndPoint) {
      measureEndPoint.setAttribute('cx', p2.x);
      measureEndPoint.setAttribute('cy', p2.y);
      measureEndPoint.style.display = 'block';
    }
    if (measureLabelGroup && measureLabelText) {
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 - 14;
      measureLabelText.textContent = `${meas.meters}m (${meas.feet}ft)`;
      measureLabelText.setAttribute('x', midX);
      measureLabelText.setAttribute('y', midY + 4);
      if (measureLabelBg) {
        measureLabelBg.setAttribute('x', midX - 55);
        measureLabelBg.setAttribute('y', midY - 10);
        measureLabelBg.setAttribute('width', 110);
        measureLabelBg.setAttribute('height', 24);
      }
      measureLabelGroup.style.display = 'block';
    }
    return meas;
  }

  function clearMeasurement() {
    measureStart = null;
    if (measureLine) measureLine.style.display = 'none';
    if (measureStartPoint) measureStartPoint.style.display = 'none';
    if (measureEndPoint) measureEndPoint.style.display = 'none';
    if (measureLabelGroup) measureLabelGroup.style.display = 'none';
    if (btnClearMeasure) btnClearMeasure.hidden = true;
  }

  if (btnMeasureTool) {
    btnMeasureTool.addEventListener('click', () => {
      isMeasuring = !isMeasuring;
      btnMeasureTool.classList.toggle('active', isMeasuring);
      btnMeasureTool.setAttribute('aria-pressed', String(isMeasuring));
      if (measureActivePill) measureActivePill.hidden = !isMeasuring;
      if (blueprintSvg) blueprintSvg.classList.toggle('measuring-mode', isMeasuring);
      if (!isMeasuring) {
        measureStart = null;
      }
    });
  }

  if (btnClearMeasure) {
    btnClearMeasure.addEventListener('click', clearMeasurement);
  }

  if (blueprintSvg) {
    blueprintSvg.addEventListener('click', (e) => {
      if (!isMeasuring) return;
      const coords = getSvgCoords(e);
      if (!measureStart) {
        measureStart = coords;
        if (measureStartPoint) {
          measureStartPoint.setAttribute('cx', coords.x);
          measureStartPoint.setAttribute('cy', coords.y);
          measureStartPoint.style.display = 'block';
        }
        if (btnClearMeasure) btnClearMeasure.hidden = false;
      } else {
        renderMeasurement(measureStart, coords);
        measureStart = null;
      }
    });

    blueprintSvg.addEventListener('mousemove', (e) => {
      if (!isMeasuring || !measureStart) return;
      const coords = getSvgCoords(e);
      renderMeasurement(measureStart, coords);
    });
  }

  // Pan & Zoom Controls
  let zoomLevel = 1.0;
  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');

  function updateZoom() {
    if (!blueprintSvg) return;
    const baseW = 900;
    const baseH = 600;
    const newW = baseW / zoomLevel;
    const newH = baseH / zoomLevel;
    const newX = (baseW - newW) / 2;
    const newY = (baseH - newH) / 2;
    blueprintSvg.setAttribute('viewBox', `${newX} ${newY} ${newW} ${newH}`);
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      zoomLevel = Math.min(2.5, +(zoomLevel + 0.25).toFixed(2));
      updateZoom();
    });
  }
  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      zoomLevel = Math.max(0.75, +(zoomLevel - 0.25).toFixed(2));
      updateZoom();
    });
  }
  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => {
      zoomLevel = 1.0;
      updateZoom();
    });
  }

  window.calculateMeasurement = calculateMeasurement;
  window.ROOMS_DATA = ROOMS_DATA;

  // Attach Click Listeners to all Room SVG groups
  document.querySelectorAll('.room-group').forEach(rg => {
    rg.addEventListener('click', () => {
      const rid = rg.getAttribute('data-room');
      selectRoom(rid);
    });
    rg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const rid = rg.getAttribute('data-room');
        selectRoom(rid);
      }
    });
  });

  // Time-of-Day Sunlight Simulation Engine
  function updateSolarSimulation(hour) {
    currentHour = hour;

    // Format Hour Display (e.g. 13.5 -> 1:30 PM)
    const intHour = Math.floor(hour);
    const mins = (hour % 1) * 60;
    const isPm = intHour >= 12;
    const displayHour12 = intHour > 12 ? intHour - 12 : (intHour === 0 ? 12 : intHour);
    const minStr = mins === 0 ? '00' : Math.round(mins);
    const ampm = isPm ? 'PM' : 'AM';

    let phaseTitle = '';
    let icon = '☀️';

    if (hour <= 7.0) {
      phaseTitle = 'Sunrise Luminescence';
      icon = '🌅';
    } else if (hour < 11.5) {
      phaseTitle = 'Morning Direct Light';
      icon = '🌤️';
    } else if (hour <= 14.0) {
      phaseTitle = 'Zenith High Noon';
      icon = '☀️';
    } else if (hour < 17.5) {
      phaseTitle = 'Afternoon Angled Sun';
      icon = '☀️';
    } else if (hour <= 19.0) {
      phaseTitle = 'Golden Hour Luminescence';
      icon = '🌇';
    } else {
      phaseTitle = 'Twilight Ambient Dusk';
      icon = '🌙';
    }

    sunTimeDisplay.textContent = `${displayHour12}:${minStr} ${ampm} — ${phaseTitle}`;
    sunPhaseIcon.textContent = icon;

    // Sun Path Calculations (Azimuth: 90° East at 6 AM, 180° South at 1 PM, 270° West at 8 PM)
    // Elevation: 0° at 6 AM and 8 PM, peak 68° at 1 PM (13:00)
    const norm = (hour - 6) / (20 - 6); // 0.0 at 6 AM to 1.0 at 8 PM
    const azimuth = Math.round(90 + norm * 180);
    const elevation = Math.round(Math.sin(norm * Math.PI) * 68);

    sunAzimuthDisplay.textContent = `Azimuth: ${azimuth}° ${azimuth < 135 ? 'E' : (azimuth > 225 ? 'W' : 'S')}`;
    sunElevationDisplay.textContent = `Elevation: ${elevation}°`;

    // Position of Sun Vector around Blueprint SVG (Center is 450, 300; Radius is 270)
    // At East (6 AM, azimuth 90°): Sun is on right (800, 300)
    // At South (1 PM, azimuth 180°): Sun is on bottom (450, 560)
    // At West (8 PM, azimuth 270°): Sun is on left (100, 300)
    const rad = (azimuth - 90) * (Math.PI / 180); // angle from East downwards
    const sunX = Math.round(450 + 340 * Math.cos(rad));
    const sunY = Math.round(300 + 240 * Math.sin(rad));

    sunVectorHead.setAttribute('cx', sunX);
    sunVectorHead.setAttribute('cy', sunY);
    sunVectorLine.setAttribute('x1', 450);
    sunVectorLine.setAttribute('y1', 300);
    sunVectorLine.setAttribute('x2', sunX);
    sunVectorLine.setAttribute('y2', sunY);

    // Color Temperature Overlay
    let overlayBg = 'transparent';
    if (hour <= 7.0) {
      overlayBg = 'radial-gradient(circle at 80% 50%, rgba(251, 146, 60, 0.22) 0%, rgba(59, 130, 246, 0.12) 80%)';
    } else if (hour <= 11.0) {
      overlayBg = 'radial-gradient(circle at 75% 65%, rgba(253, 224, 71, 0.18) 0%, transparent 70%)';
    } else if (hour <= 14.5) {
      overlayBg = 'radial-gradient(circle at 50% 80%, rgba(254, 240, 138, 0.20) 0%, transparent 60%)';
    } else if (hour <= 17.5) {
      overlayBg = 'radial-gradient(circle at 25% 65%, rgba(245, 158, 11, 0.22) 0%, transparent 70%)';
    } else if (hour <= 19.0) {
      overlayBg = 'radial-gradient(circle at 15% 50%, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.2) 50%, transparent 80%)';
    } else {
      overlayBg = 'radial-gradient(circle at 10% 50%, rgba(99, 102, 241, 0.20) 0%, rgba(15, 23, 42, 0.35) 80%)';
    }
    solarLightOverlay.style.background = overlayBg;

    updateSolarAnalysis();
  }

  // Room Solar Exposure Evaluation
  function updateSolarAnalysis() {
    const d = ROOMS_DATA[currentRoomId];
    if (!d) return;

    const hour = currentHour;
    let factor = 75;
    let desc = '';

    if (d.orientation === 'protected') {
      factor = 2;
      desc = "Sub-level thermal wine vault: 100% shielded from solar ultraviolet exposure and infrared heat spikes. Ambient light is 0% natural, maintained under museum-grade cold LED.";
    } else if (d.orientation === 'east') {
      if (hour <= 11) {
        factor = Math.round(85 + (11 - hour) * 3);
        desc = `At ${sunTimeDisplay.textContent.split('—')[0].trim()}, direct eastern morning sun casts invigorating high-lumen natural illumination directly across ${d.name}, elevating wakefulness.`;
      } else {
        factor = Math.max(35, Math.round(75 - (hour - 11) * 6));
        desc = `As the sun transitions past zenith to the southwest, ${d.name} shifts into soft, diffused indirect daylighting with zero unwanted afternoon solar thermal gain.`;
      }
    } else if (d.orientation === 'west') {
      if (hour >= 15) {
        factor = Math.round(88 + (hour - 15) * 2.5);
        desc = `In the afternoon and golden hour, ${d.name} receives prime western solar exposure. Low-angle amber light streams through the glass curtains, framing dramatic sunset panoramas.`;
      } else {
        factor = Math.max(30, Math.round(50 + hour * 2));
        desc = `During morning hours, ${d.name} enjoys gentle ambient indirect illumination, maintaining comfortable ambient cooling before afternoon sunset alignment.`;
      }
    } else if (d.orientation === 'all') {
      factor = Math.round(Math.sin(((hour - 6) / 14) * Math.PI) * 98);
      factor = Math.max(25, factor);
      desc = `The Infinity Terrace boasts 180° uninterrupted coastal exposure. At ${sunTimeDisplay.textContent.split('—')[0].trim()}, solar elevation (${sunElevationDisplay.textContent.replace('Elevation: ', '')}) provides optimal natural tanning and ambient pool warmth.`;
    } else {
      // South / South-North
      factor = Math.round(Math.sin(((hour - 6) / 14) * Math.PI) * 95);
      factor = Math.max(35, factor);
      desc = "Southern architectural orientation delivers balanced, high-efficiency illumination throughout the entire day. Deep overhangs prevent summer glare while capturing full winter sun.";
    }

    factor = Math.max(5, Math.min(100, factor));
    daylightFactorVal.textContent = `${factor}% (${factor > 75 ? 'Optimal Lumens' : (factor > 40 ? 'Moderate Diffused' : 'Low / Ambient')})`;
    daylightMeterFill.style.width = `${factor}%`;
    solarAnalysisDesc.textContent = desc;
  }

  // Slider Event Listener
  sunTimeRange.addEventListener('input', (e) => {
    updateSolarSimulation(parseFloat(e.target.value));
  });

  // Initial State
  updateSolarSimulation(13.0);
  selectRoom('foyer');
})();
/* ===== END Issue #357 ===== */


/* ===== BEGIN Issue #419: 360° Virtual Reality Panoramic Room Viewer Modal ===== */
(function initVrPanoramicViewerModule() {
  const ROOMS = {
    salon: {
      name: 'Grand Ocean Salon',
      status: 'Grand Ocean Salon · 4K HDR Ambient Environment Active',
      bgGradient: 'radial-gradient(ellipse at 50% 40%, rgba(30, 41, 59, 0.9) 0%, rgba(11, 17, 30, 0.98) 70%), linear-gradient(180deg, #090e1a 0%, #172554 40%, #1e1b4b 60%, #030712 100%)',
      hotspots: [
        {
          id: 'hs-marble',
          yaw: 45,
          pitch: -8,
          title: 'Bookmatched Calacatta Gold Marble',
          tag: 'FINISH & MATERIAL',
          desc: 'Single-slab Italian Calacatta gold marble with integrated radiant floor heating and continuous vein flow.',
          origin: 'Carrara, Italy',
          artisan: 'Studio Marmi'
        },
        {
          id: 'hs-glass',
          yaw: 180,
          pitch: 12,
          title: 'Switchable Smart Privacy Glazing',
          tag: 'ARCHITECTURAL TECH',
          desc: 'Electrochromic double-glazed acoustic glass transitioning from optically clear to 99% UV blackout via Lutron HomeWorks.',
          origin: 'Saint-Gobain, France',
          artisan: 'Quantum Glaze'
        },
        {
          id: 'hs-fire',
          yaw: 275,
          pitch: -10,
          title: '12-Foot Linear Ethanol Fireplace',
          tag: 'LUXURY AMENITY',
          desc: 'Custom zero-emission ventless ribbon burner encased in patinated architectural bronze.',
          origin: 'Melbourne, Australia',
          artisan: 'EcoSmart Studio'
        },
        {
          id: 'hs-sound',
          yaw: 330,
          pitch: 22,
          title: 'Directional Acoustic Transducers',
          tag: 'AUDIO INTEGRATION',
          desc: 'Flush-mounted invisible drywall speakers tuned specifically to the double-height volume of the salon.',
          origin: 'Struer, Denmark',
          artisan: 'Bang & Olufsen'
        }
      ]
    },
    kitchen: {
      name: 'Sommelier Wine Vault & Chef Atelier',
      status: 'Wine Vault & Atelier · Dual Climate Systems Active',
      bgGradient: 'radial-gradient(ellipse at 50% 50%, rgba(30, 27, 75, 0.9) 0%, rgba(15, 23, 42, 0.98) 70%), linear-gradient(180deg, #111827 0%, #312e81 40%, #1f2937 80%, #030712 100%)',
      hotspots: [
        {
          id: 'hs-cellar',
          yaw: 90,
          pitch: 5,
          title: 'Sub-Zero Dual-Zone Wine Columns',
          tag: 'CLIMATE TECH',
          desc: 'UV-resistant glass enclosures preserving 1,400 premier cru bottles at 55°F with vibration dampening.',
          origin: 'Madison, WI',
          artisan: 'Sub-Zero Classic'
        },
        {
          id: 'hs-range',
          yaw: 210,
          pitch: -6,
          title: 'La Cornue Château 150 Range',
          tag: 'CULINARY ART',
          desc: 'Handcrafted gas oven in matte carbon enamel with polished brass fittings and French simmer plate.',
          origin: 'Paris, France',
          artisan: 'La Cornue'
        }
      ]
    },
    master: {
      name: 'Master Sky Sanctuary',
      status: 'Master Penthouse Suite · Coastal Sunrise Orientation',
      bgGradient: 'radial-gradient(ellipse at 50% 45%, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.98) 75%), linear-gradient(180deg, #090d16 0%, #1e1b4b 35%, #0f172a 75%, #020617 100%)',
      hotspots: [
        {
          id: 'hs-terrace',
          yaw: 160,
          pitch: 0,
          title: 'Private Horizon Balcony Deck',
          tag: 'OUTDOOR LIVING',
          desc: 'Seamless threshold transition to private oceanview cantilevered terrace with integrated glass fire trough.',
          origin: 'Malibu, CA',
          artisan: 'Vanguard Millwork'
        },
        {
          id: 'hs-tub',
          yaw: 300,
          pitch: -12,
          title: 'Monolithic Fluted Soaking Tub',
          tag: 'SPA APPOINTMENT',
          desc: 'Sculpted from a single block of volcanic basalt, weighing 1,800 lbs with floor-mounted Dornbracht filler.',
          origin: 'Iserlohn, Germany',
          artisan: 'Dornbracht'
        }
      ]
    },
    terrace: {
      name: 'Cantilevered Horizon Deck & Pool',
      status: 'Infinity Ocean Terrace · 180° Unobstructed Pacific Exposure',
      bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(14, 165, 233, 0.15) 0%, rgba(11, 17, 30, 0.95) 75%), linear-gradient(180deg, #0369a1 0%, #0284c7 25%, #075985 55%, #0b111e 90%)',
      hotspots: [
        {
          id: 'hs-pool',
          yaw: 190,
          pitch: -15,
          title: 'Glass-Bottom Cantilever Pool',
          tag: 'STRUCTURAL FEAT',
          desc: '4-inch acrylic cantilever projecting 16 feet past the cliff face over the breaking surf below.',
          origin: 'Grand Junction, CO',
          artisan: 'Reynolds Polymer'
        },
        {
          id: 'hs-grill',
          yaw: 340,
          pitch: -4,
          title: 'Alfresco Teppanyaki Grill Island',
          tag: 'ENTERTAINING',
          desc: 'Commercial-grade marine 316 stainless steel cooking center with induction wok burners.',
          origin: 'Milan, Italy',
          artisan: 'Officine Gullo'
        }
      ]
    }
  };

  let currentRoomKey = 'salon';
  let yaw = 0; // horizontal angle 0-360
  let pitch = 0; // vertical angle -45 to 45
  let fov = 75; // field of view 50-90
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startYaw = 0;
  let startPitch = 0;
  let autoOrbit = false;
  let autoOrbitFrame = null;

  function getCardinalDirection(deg) {
    const normalized = (deg % 360 + 360) % 360;
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(normalized / 45) % 8;
    return `${Math.round(normalized)}° ${dirs[idx]}`;
  }

  function updateView() {
    const panLayer = document.getElementById('vrPanLayer');
    const coordYaw = document.getElementById('vrCoordYaw');
    const coordPitch = document.getElementById('vrCoordPitch');
    const coordFov = document.getElementById('vrCoordFov');
    const compassNeedle = document.getElementById('vrCompassNeedle');
    const headingText = document.getElementById('vrHeadingText');

    if (coordYaw) coordYaw.textContent = `YAW: ${((yaw % 360 + 360) % 360).toFixed(1)}°`;
    if (coordPitch) coordPitch.textContent = `PITCH: ${pitch.toFixed(1)}°`;
    if (coordFov) coordFov.textContent = `FOV: ${fov}°`;

    if (compassNeedle) {
      compassNeedle.style.transform = `rotate(${-yaw}deg)`;
    }
    if (headingText) {
      headingText.textContent = `Heading: ${getCardinalDirection(yaw)}`;
    }

    if (panLayer) {
      const pxX = -((yaw % 360 + 360) % 360) * 8;
      const pxY = pitch * 4;
      panLayer.style.backgroundPosition = `${pxX}px ${pxY}px`;
      panLayer.style.transform = `scale(${75 / fov})`;
    }

    renderHotspots();
  }

  function renderHotspots() {
    const layer = document.getElementById('vrHotspotsLayer');
    if (!layer) return;

    const room = ROOMS[currentRoomKey];
    if (!room) return;

    layer.replaceChildren();

    const stage = document.getElementById('vrViewportStage');
    const width = stage ? stage.offsetWidth : 800;
    const height = stage ? stage.offsetHeight : 500;

    room.hotspots.forEach((hs) => {
      // Calculate angular distance from current yaw
      let diffYaw = (hs.yaw - yaw) % 360;
      if (diffYaw > 180) diffYaw -= 360;
      if (diffYaw < -180) diffYaw += 360;

      const diffPitch = hs.pitch - pitch;

      // Check if within FOV (roughly +- fov/2 horizontally and vertically)
      const halfFovX = (fov / 2) * 1.3;
      const halfFovY = (fov / 2) * 0.9;

      if (Math.abs(diffYaw) < halfFovX && Math.abs(diffPitch) < halfFovY) {
        const posX = width / 2 + (diffYaw / halfFovX) * (width / 2);
        const posY = height / 2 - (diffPitch / halfFovY) * (height / 2);

        const pin = document.createElement('div');
        pin.className = 'vr-hotspot-pin';
        pin.style.left = `${posX.toFixed(1)}px`;
        pin.style.top = `${posY.toFixed(1)}px`;
        pin.tabIndex = 0;
        pin.setAttribute('role', 'button');
        pin.setAttribute('aria-label', `Inspect ${hs.title}`);

        const ring = document.createElement('span');
        ring.className = 'hotspot-ring';

        const core = document.createElement('span');
        core.className = 'hotspot-core';
        core.textContent = '✦';

        const pill = document.createElement('span');
        pill.className = 'hotspot-label-pill';
        pill.textContent = hs.title;

        pin.appendChild(ring);
        pin.appendChild(core);
        pin.appendChild(pill);

        pin.addEventListener('click', (e) => {
          e.stopPropagation();
          showHotspotDetail(hs);
        });

        layer.appendChild(pin);
      }
    });
  }

  function showHotspotDetail(hs) {
    const popover = document.getElementById('vrHotspotPopover');
    if (!popover) return;

    const tagEl = document.getElementById('hotspotTag');
    const titleEl = document.getElementById('hotspotTitle');
    const descEl = document.getElementById('hotspotDesc');
    const originEl = document.getElementById('hotspotOrigin');
    const artisanEl = document.getElementById('hotspotArtisan');

    if (tagEl) tagEl.textContent = hs.tag || 'SPECIFICATION';
    if (titleEl) titleEl.textContent = hs.title;
    if (descEl) descEl.textContent = hs.desc;
    if (originEl) originEl.textContent = `Origin: ${hs.origin || 'International'}`;
    if (artisanEl) artisanEl.textContent = `Artisan: ${hs.artisan || 'Vanguard Collection'}`;

    popover.removeAttribute('hidden');
  }

  function closeHotspotDetail() {
    const popover = document.getElementById('vrHotspotPopover');
    if (popover) {
      popover.setAttribute('hidden', '');
    }
  }

  function switchRoom(roomKey) {
    if (!ROOMS[roomKey]) return;
    currentRoomKey = roomKey;
    closeHotspotDetail();

    const panLayer = document.getElementById('vrPanLayer');
    const room = ROOMS[roomKey];
    if (panLayer && room) {
      panLayer.style.backgroundImage = room.bgGradient;
    }

    const statusEl = document.getElementById('vrRoomStatusText');
    if (statusEl && room) {
      statusEl.textContent = room.status;
    }

    // Update active tab button
    document.querySelectorAll('.vr-room-btn').forEach((btn) => {
      const isTarget = btn.getAttribute('data-room') === roomKey;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    updateView();
  }

  function startAutoOrbit() {
    autoOrbit = true;
    const btnText = document.getElementById('orbitBtnText');
    const btn = document.getElementById('btnToggleAutoOrbit');
    if (btnText) btnText.textContent = 'Stop Orbit';
    if (btn) btn.classList.add('active');

    function step() {
      if (!autoOrbit) return;
      if (!isDragging) {
        yaw = (yaw + 0.12) % 360;
        updateView();
      }
      autoOrbitFrame = requestAnimationFrame(step);
    }
    cancelAnimationFrame(autoOrbitFrame);
    autoOrbitFrame = requestAnimationFrame(step);
  }

  function stopAutoOrbit() {
    autoOrbit = false;
    cancelAnimationFrame(autoOrbitFrame);
    const btnText = document.getElementById('orbitBtnText');
    const btn = document.getElementById('btnToggleAutoOrbit');
    if (btnText) btnText.textContent = 'Auto-Orbit';
    if (btn) btn.classList.remove('active');
  }

  function toggleAutoOrbit() {
    if (autoOrbit) {
      stopAutoOrbit();
    } else {
      startAutoOrbit();
    }
  }

  function toggleFullscreen() {
    const container = document.getElementById('vrModalContainer');
    if (container) {
      container.classList.toggle('is-fullscreen');
      updateView();
    }
  }

  function openModal() {
    const backdrop = document.getElementById('vrTourBackdrop');
    const modal = document.getElementById('vrTourModal');
    if (backdrop && modal) {
      backdrop.classList.add('active');
      modal.removeAttribute('hidden');
      modal.classList.add('active');
      switchRoom(currentRoomKey);
      startAutoOrbit();
    }
  }

  function closeModal() {
    stopAutoOrbit();
    closeHotspotDetail();
    const backdrop = document.getElementById('vrTourBackdrop');
    const modal = document.getElementById('vrTourModal');
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

  function initListeners() {
    const stage = document.getElementById('vrViewportStage');
    if (stage) {
      stage.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startYaw = yaw;
        startPitch = pitch;
        stage.classList.add('is-dragging');
        closeHotspotDetail();
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        yaw = (startYaw - dx * 0.25) % 360;
        pitch = Math.max(-42, Math.min(42, startPitch + dy * 0.2));
        updateView();
      });

      window.addEventListener('mouseup', () => {
        if (isDragging) {
          isDragging = false;
          stage.classList.remove('is-dragging');
        }
      });

      // Touch events
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          startYaw = yaw;
          startPitch = pitch;
          closeHotspotDetail();
        }
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;

        yaw = (startYaw - dx * 0.3) % 360;
        pitch = Math.max(-42, Math.min(42, startPitch + dy * 0.25));
        updateView();
      }, { passive: true });

      window.addEventListener('touchend', () => {
        isDragging = false;
      });

      // Wheel Zoom
      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        fov = Math.max(50, Math.min(90, fov + (e.deltaY > 0 ? 3 : -3)));
        updateView();
      }, { passive: false });
    }

    // Controls
    const orbitBtn = document.getElementById('btnToggleAutoOrbit');
    if (orbitBtn) orbitBtn.addEventListener('click', toggleAutoOrbit);

    const fsBtn = document.getElementById('btnToggleFullscreen');
    if (fsBtn) fsBtn.addEventListener('click', toggleFullscreen);

    const closeHsBtn = document.getElementById('btnHotspotClose');
    if (closeHsBtn) closeHsBtn.addEventListener('click', closeHotspotDetail);

    const zoomInBtn = document.getElementById('btnVrZoomIn');
    if (zoomInBtn) zoomInBtn.addEventListener('click', () => {
      fov = Math.max(50, fov - 5);
      updateView();
    });

    const zoomOutBtn = document.getElementById('btnVrZoomOut');
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => {
      fov = Math.min(90, fov + 5);
      updateView();
    });

    const zoomResetBtn = document.getElementById('btnVrReset');
    if (zoomResetBtn) zoomResetBtn.addEventListener('click', () => {
      fov = 75;
      yaw = 0;
      pitch = 0;
      updateView();
    });

    // Room nav buttons
    document.querySelectorAll('.vr-room-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const roomKey = btn.getAttribute('data-room');
        if (roomKey) switchRoom(roomKey);
      });
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('vrTourModal');
      if (modal && !modal.hasAttribute('hidden')) {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') { yaw = (yaw - 4) % 360; updateView(); }
        if (e.key === 'ArrowRight') { yaw = (yaw + 4) % 360; updateView(); }
        if (e.key === 'ArrowUp') { pitch = Math.min(42, pitch + 3); updateView(); }
        if (e.key === 'ArrowDown') { pitch = Math.max(-42, pitch - 3); updateView(); }
      }
    });

    window.addEventListener('resize', updateView);
  }

  window.openVrTourModal = openModal;
  window.closeVrTourModal = closeModal;
  window.switchVrRoom = switchRoom;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initListeners);
  } else {
    initListeners();
  }
})();
/* ===== END Issue #419: 360° Virtual Reality Panoramic Room Viewer Modal ===== */
