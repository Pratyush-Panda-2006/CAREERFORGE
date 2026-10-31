document.addEventListener('DOMContentLoaded', () => {
  console.log('VortexDEX Exchange Pro engine ready');
  initMarket();
  initQuickSwap();
});

/* ------------------------------------------------------------------
   Mock market engine. Everything is simulated: a seeded PRNG drives the
   candle history and the once-per-second live ticks, so the same pair and
   interval always start from the same history.
------------------------------------------------------------------- */

const PAIRS = {
  btc: { label: 'BTC-PERP', base: 94250, changePct: 4.82, vol: 0.0016, decimals: 2, seed: 101 },
  eth: { label: 'ETH-PERP', base: 3840.5, changePct: 6.15, vol: 0.0022, decimals: 2, seed: 202 },
  sol: { label: 'SOL-PERP', base: 214.8, changePct: 12.4, vol: 0.0035, decimals: 2, seed: 303 }
};

// stepMs = candle length. rollTicks = how many one-second ticks until a new candle opens
// (accelerated on purpose so the demo visibly rolls candles).
const INTERVALS = {
  '1H': { candles: 60, stepMs: 60 * 1000, rollTicks: 10, volMul: 1 },
  '24H': { candles: 96, stepMs: 15 * 60 * 1000, rollTicks: 15, volMul: 2.2 },
  '1W': { candles: 84, stepMs: 2 * 60 * 60 * 1000, rollTicks: 20, volMul: 4.5 },
  '1M': { candles: 120, stepMs: 6 * 60 * 60 * 1000, rollTicks: 25, volMul: 8 }
};

const VIEW_W = 800;
const VIEW_H = 380;
const PAD = { left: 10, right: 78, top: 14, bottom: 30 };
const SVG_NS = 'http://www.w3.org/2000/svg';

// mulberry32: tiny seeded PRNG returning floats in [0, 1)
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Roughly normal noise in about [-1, 1] (sum of uniforms).
function noise(rng) {
  return (rng() + rng() + rng() - 1.5) / 1.5;
}

// Build a candle history that ends exactly at `endPrice`.
function generateCandles(pair, intervalKey, endPrice, nowMs) {
  const cfg = INTERVALS[intervalKey];
  const p = PAIRS[pair];
  const seedBase = p.seed * 1000 + Object.keys(INTERVALS).indexOf(intervalKey) * 17;
  const rng = makeRng(seedBase);
  const vol = p.vol * cfg.volMul;
  const stepMs = cfg.stepMs;
  const lastStart = Math.floor(nowMs / stepMs) * stepMs;

  const raw = [];
  let price = 100;
  let drift = 0;
  for (let i = 0; i < cfg.candles; i++) {
    drift = drift * 0.9 + noise(rng) * vol * 0.4;
    const open = price;
    const close = open * (1 + drift + noise(rng) * vol);
    const high = Math.max(open, close) * (1 + rng() * vol * 0.8);
    const low = Math.min(open, close) * (1 - rng() * vol * 0.8);
    raw.push({ open, high, low, close });
    price = close;
  }
  const scale = endPrice / raw[raw.length - 1].close;
  return raw.map((c, i) => ({
    t: lastStart - (cfg.candles - 1 - i) * stepMs,
    open: c.open * scale,
    high: c.high * scale,
    low: c.low * scale,
    close: c.close * scale
  }));
}

function movingAverage(candles, period) {
  return candles.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let k = i - period + 1; k <= i; k++) sum += candles[k].close;
    return sum / period;
  });
}

function formatPrice(v, decimals) {
  return v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatTime(ms, intervalKey) {
  const opts = intervalKey === '1H' || intervalKey === '24H'
    ? { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }
    : { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', hour12: false };
  return new Date(ms).toLocaleString('en-GB', opts) + ' UTC';
}

function svgEl(name, attrs, text) {
  const el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
  if (text !== undefined) el.textContent = text;
  return el;
}

function initMarket() {
  const svg = document.getElementById('chart');
  if (!svg) return;
  const wrap = document.getElementById('chart-wrap');
  const tip = document.getElementById('chart-tip');
  const status = document.getElementById('chart-status');

  const state = {
    pair: 'btc',
    interval: '24H',
    hover: null, // { index, y } in svg coordinates, or null
    tick: 0
  };

  // One live engine per pair: current price, its own seeded RNG, 24h reference price.
  const engines = {};
  Object.keys(PAIRS).forEach((key) => {
    const p = PAIRS[key];
    engines[key] = {
      price: p.base,
      ref: p.base / (1 + p.changePct / 100),
      rng: makeRng(p.seed * 7919)
    };
  });

  let candles = [];
  let asks = [];
  let bids = [];
  let obRng = makeRng(4242);

  function buildSeries() {
    candles = generateCandles(state.pair, state.interval, engines[state.pair].price, Date.now());
  }

  function buildBook() {
    const mid = engines[state.pair].price;
    const tickSize = mid * 0.00012;
    asks = [];
    bids = [];
    for (let i = 0; i < 8; i++) {
      asks.push({ price: mid + tickSize * (i + 1), size: 0.2 + obRng() * 3 });
      bids.push({ price: mid - tickSize * (i + 1), size: 0.2 + obRng() * 3 });
    }
  }

  // ---- live tick: runs once per second -------------------------------
  function tickEngines() {
    state.tick++;
    Object.keys(PAIRS).forEach((key) => {
      const e = engines[key];
      const p = PAIRS[key];
      const step = noise(e.rng) * p.vol * 0.9;
      e.price = Math.max(e.price * (1 + step), 0.01);
    });

    const price = engines[state.pair].price;
    const cfg = INTERVALS[state.interval];
    const last = candles[candles.length - 1];
    if (state.tick % cfg.rollTicks === 0) {
      candles.push({ t: last.t + cfg.stepMs, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price });
      candles.shift();
    } else {
      last.close = price;
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
    }
    buildBook();
    renderAll();
  }

  // ---- rendering -----------------------------------------------------
  function renderTicker() {
    Object.keys(PAIRS).forEach((key) => {
      const e = engines[key];
      const p = PAIRS[key];
      const priceEl = document.getElementById('tick-' + key + '-price');
      const changeEl = document.getElementById('tick-' + key + '-change');
      const pct = ((e.price - e.ref) / e.ref) * 100;
      if (priceEl) priceEl.textContent = '$' + formatPrice(e.price, p.decimals);
      if (changeEl) {
        changeEl.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
        changeEl.setAttribute('data-dir', pct >= 0 ? 'up' : 'down');
      }
    });
  }

  function renderStats() {
    const p = PAIRS[state.pair];
    const e = engines[state.pair];
    const pct = ((e.price - e.ref) / e.ref) * 100;
    const hi = Math.max(...candles.map((c) => c.high));
    const lo = Math.min(...candles.map((c) => c.low));
    document.getElementById('stat-last').textContent = '$' + formatPrice(e.price, p.decimals);
    const ch = document.getElementById('stat-change');
    ch.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%';
    ch.setAttribute('data-dir', pct >= 0 ? 'up' : 'down');
    document.getElementById('stat-high').textContent = '$' + formatPrice(hi, p.decimals);
    document.getElementById('stat-low').textContent = '$' + formatPrice(lo, p.decimals);
  }

  function fillBookBody(tbody, rows, cls, maxTotal, decimals) {
    tbody.textContent = '';
    let running = 0;
    const withTotals = rows.map((r) => { running += r.size; return { price: r.price, size: r.size, total: running }; });
    withTotals.forEach((r) => {
      const tr = document.createElement('tr');
      tr.className = cls;
      tr.style.setProperty('--depth', Math.round((r.total / maxTotal) * 100) + '%');
      [formatPrice(r.price, decimals), r.size.toFixed(3), r.total.toFixed(3)].forEach((txt, i) => {
        const td = document.createElement('td');
        td.textContent = txt;
        if (i === 0) td.className = 'ob-price';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function renderBook() {
    const p = PAIRS[state.pair];
    const maxTotal = Math.max(asks.reduce((a, r) => a + r.size, 0), bids.reduce((a, r) => a + r.size, 0));
    // asks are shown with the highest price on top so the best ask sits next to the mid price
    fillBookBody(document.querySelector('#ob-asks tbody'), asks, 'ob-ask', maxTotal, p.decimals);
    const askRows = document.querySelector('#ob-asks tbody');
    Array.from(askRows.children).reverse().forEach((tr) => askRows.appendChild(tr));
    fillBookBody(document.querySelector('#ob-bids tbody'), bids, 'ob-bid', maxTotal, p.decimals);
    const mid = document.getElementById('ob-mid');
    mid.textContent = '$' + formatPrice(engines[state.pair].price, p.decimals);
    const first = candles[0].open;
    mid.setAttribute('data-dir', engines[state.pair].price >= first ? 'up' : 'down');
  }

  function renderChart() {
    const p = PAIRS[state.pair];
    const n = candles.length;
    const plotW = VIEW_W - PAD.left - PAD.right;
    const plotH = VIEW_H - PAD.top - PAD.bottom;
    const slot = plotW / n;
    const bodyW = Math.max(slot * 0.62, 1.5);

    let hi = -Infinity;
    let lo = Infinity;
    candles.forEach((c) => { hi = Math.max(hi, c.high); lo = Math.min(lo, c.low); });
    const padPx = (hi - lo) * 0.08 || hi * 0.01;
    hi += padPx;
    lo -= padPx;
    const yOf = (v) => PAD.top + ((hi - v) / (hi - lo)) * plotH;
    const xOf = (i) => PAD.left + slot * i + slot / 2;
    const priceAt = (y) => hi - ((y - PAD.top) / plotH) * (hi - lo);

    svg.textContent = '';

    // grid + price axis
    for (let g = 0; g <= 5; g++) {
      const v = lo + ((hi - lo) * g) / 5;
      const y = yOf(v);
      svg.appendChild(svgEl('line', { x1: PAD.left, x2: VIEW_W - PAD.right, y1: y, y2: y, class: 'grid-line' }));
      svg.appendChild(svgEl('text', { x: VIEW_W - PAD.right + 6, y: y + 4, class: 'axis-label' }, formatPrice(v, p.decimals)));
    }
    // time axis
    for (let g = 0; g < 5; g++) {
      const idx = Math.round(((n - 1) * g) / 4);
      const label = formatTime(candles[idx].t, state.interval).replace(' UTC', '');
      const anchor = g === 0 ? 'start' : g === 4 ? 'end' : 'middle';
      svg.appendChild(svgEl('text', { x: xOf(idx), y: VIEW_H - 10, class: 'axis-label', 'text-anchor': anchor }, label));
    }

    // candles
    candles.forEach((c, i) => {
      const up = c.close >= c.open;
      const cls = up ? 'candle-up' : 'candle-down';
      const x = xOf(i);
      svg.appendChild(svgEl('line', { x1: x, x2: x, y1: yOf(c.high), y2: yOf(c.low), class: 'wick ' + cls }));
      const top = yOf(Math.max(c.open, c.close));
      const h = Math.max(Math.abs(yOf(c.open) - yOf(c.close)), 1);
      svg.appendChild(svgEl('rect', { x: x - bodyW / 2, y: top, width: bodyW, height: h, class: 'body ' + cls }));
    });

    // moving averages
    [[7, 'ma7'], [25, 'ma25']].forEach(([period, cls]) => {
      const ma = movingAverage(candles, period);
      const pts = [];
      ma.forEach((v, i) => { if (v !== null) pts.push(xOf(i).toFixed(1) + ',' + yOf(v).toFixed(1)); });
      if (pts.length > 1) svg.appendChild(svgEl('polyline', { points: pts.join(' '), class: 'ma-line ' + cls }));
    });

    // last price marker
    const lastY = yOf(candles[n - 1].close);
    svg.appendChild(svgEl('line', { x1: PAD.left, x2: VIEW_W - PAD.right, y1: lastY, y2: lastY, class: 'last-line' }));
    svg.appendChild(svgEl('rect', { x: VIEW_W - PAD.right, y: lastY - 9, width: PAD.right, height: 18, class: 'last-tag' }));
    svg.appendChild(svgEl('text', { x: VIEW_W - PAD.right + 6, y: lastY + 4, class: 'last-tag-text' }, formatPrice(candles[n - 1].close, p.decimals)));

    // crosshair + tooltip
    if (state.hover && state.hover.index >= 0 && state.hover.index < n) {
      const c = candles[state.hover.index];
      const x = xOf(state.hover.index);
      const y = Math.min(Math.max(state.hover.y, PAD.top), PAD.top + plotH);
      svg.appendChild(svgEl('line', { x1: x, x2: x, y1: PAD.top, y2: PAD.top + plotH, class: 'crosshair' }));
      svg.appendChild(svgEl('line', { x1: PAD.left, x2: VIEW_W - PAD.right, y1: y, y2: y, class: 'crosshair' }));
      svg.appendChild(svgEl('rect', { x: VIEW_W - PAD.right, y: y - 9, width: PAD.right, height: 18, class: 'cross-tag' }));
      svg.appendChild(svgEl('text', { x: VIEW_W - PAD.right + 6, y: y + 4, class: 'cross-tag-text' }, formatPrice(priceAt(y), p.decimals)));
      showTip(c, x);
    } else {
      tip.hidden = true;
    }
  }

  function showTip(c, svgX) {
    const p = PAIRS[state.pair];
    const chg = ((c.close - c.open) / c.open) * 100;
    tip.textContent = '';
    const head = document.createElement('div');
    head.className = 'tip-time';
    head.textContent = formatTime(c.t, state.interval);
    tip.appendChild(head);
    [['O', c.open], ['H', c.high], ['L', c.low], ['C', c.close]].forEach(([k, v]) => {
      const row = document.createElement('div');
      row.className = 'tip-row';
      const a = document.createElement('span');
      const b = document.createElement('span');
      a.textContent = k;
      b.textContent = formatPrice(v, p.decimals);
      row.append(a, b);
      tip.appendChild(row);
    });
    const ch = document.createElement('div');
    ch.className = 'tip-chg';
    ch.setAttribute('data-dir', chg >= 0 ? 'up' : 'down');
    ch.textContent = (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%';
    tip.appendChild(ch);
    tip.hidden = false;
    // keep the tooltip inside the wrapper: flip to the left of the crosshair on the right half
    const ratio = svgX / VIEW_W;
    tip.style.left = ratio < 0.55 ? 'calc(' + (ratio * 100) + '% + 14px)' : 'auto';
    tip.style.right = ratio < 0.55 ? 'auto' : 'calc(' + ((1 - ratio) * 100) + '% + 14px)';
  }

  function renderAll() {
    renderTicker();
    renderStats();
    renderBook();
    renderChart();
  }

  // ---- interaction ---------------------------------------------------
  function setPressed(groupId, attr, value) {
    document.querySelectorAll('#' + groupId + ' .toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
    });
  }

  function announce() {
    status.textContent = PAIRS[state.pair].label + ' chart, interval ' + state.interval + ', ' + candles.length + ' candles.';
  }

  document.getElementById('interval-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-interval]');
    if (!btn || btn.dataset.interval === state.interval) return;
    state.interval = btn.dataset.interval;
    state.hover = null;
    state.tick = 0;
    setPressed('interval-group', 'data-interval', state.interval);
    buildSeries();
    renderAll();
    announce();
  });

  document.getElementById('pair-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pair]');
    if (!btn || btn.dataset.pair === state.pair) return;
    state.pair = btn.dataset.pair;
    state.hover = null;
    state.tick = 0;
    setPressed('pair-group', 'data-pair', state.pair);
    buildSeries();
    buildBook();
    renderAll();
    announce();
  });

  function pointerToHover(e) {
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    const slot = (VIEW_W - PAD.left - PAD.right) / candles.length;
    const index = Math.floor((x - PAD.left) / slot);
    if (index < 0 || index >= candles.length) return null;
    return { index, y };
  }

  svg.addEventListener('pointermove', (e) => { state.hover = pointerToHover(e); renderChart(); });
  svg.addEventListener('pointerleave', () => { state.hover = null; renderChart(); });
  svg.addEventListener('pointerdown', (e) => { state.hover = pointerToHover(e); renderChart(); });

  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Escape') return;
    e.preventDefault();
    if (e.key === 'Escape') { state.hover = null; renderChart(); return; }
    const last = candles.length - 1;
    const cur = state.hover ? state.hover.index : last + (e.key === 'ArrowLeft' ? 1 : -1);
    const next = Math.min(Math.max(cur + (e.key === 'ArrowRight' ? 1 : -1), 0), last);
    state.hover = { index: next, y: 0 };
    // park the horizontal crosshair on the candle close
    const hi = Math.max(...candles.map((c) => c.high));
    const lo = Math.min(...candles.map((c) => c.low));
    const padPx = (hi - lo) * 0.08 || hi * 0.01;
    const plotH = VIEW_H - PAD.top - PAD.bottom;
    state.hover.y = PAD.top + ((hi + padPx - candles[next].close) / (hi - lo + 2 * padPx)) * plotH;
    renderChart();
  });
  svg.addEventListener('blur', () => { state.hover = null; renderChart(); });

  buildSeries();
  buildBook();
  renderAll();
  announce();

  setInterval(() => { if (!document.hidden) tickEngines(); }, 1000);
}

/* ===============================================================
   Quick Swap Order Execution Panel (Issue #53)
   =============================================================== */
function initQuickSwap() {
  const swapCard = document.getElementById('swapCard');
  if (!swapCard) return;

  const TOKEN_CONFIG = {
    ETH: { name: 'Ethereum', priceUsd: 3840.50, decimals: 4, symbol: 'ETH' },
    BTC: { name: 'Bitcoin', priceUsd: 94250.00, decimals: 5, symbol: 'BTC' },
    SOL: { name: 'Solana', priceUsd: 214.80, decimals: 2, symbol: 'SOL' },
    USDC: { name: 'USD Coin', priceUsd: 1.00, decimals: 2, symbol: 'USDC' },
    USDT: { name: 'Tether USD', priceUsd: 1.00, decimals: 2, symbol: 'USDT' },
    VORTEX: { name: 'Vortex Token', priceUsd: 8.45, decimals: 2, symbol: 'VORTEX' }
  };

  const wallet = {
    ETH: 4.5000,
    BTC: 0.25000,
    SOL: 18.50,
    USDC: 5000.00,
    USDT: 2500.00,
    VORTEX: 250.00
  };

  let payToken = 'ETH';
  let receiveToken = 'USDC';
  let slippage = 0.5; // percent
  let gasSpeed = 'fast';

  const GAS_FEES = {
    standard: { gwei: '10 Gwei', usd: 0.95 },
    fast: { gwei: '15 Gwei', usd: 1.42 },
    instant: { gwei: '25 Gwei', usd: 2.35 }
  };

  // DOM elements
  const payInput = document.getElementById('swapPayAmount');
  const receiveInput = document.getElementById('swapReceiveAmount');
  const paySelect = document.getElementById('payTokenSelect');
  const receiveSelect = document.getElementById('receiveTokenSelect');
  const payBalanceEl = document.getElementById('payBalance');
  const receiveBalanceEl = document.getElementById('receiveBalance');
  const payMaxBtn = document.getElementById('payMaxBtn');
  const payFiatEl = document.getElementById('payFiatVal');
  const receiveFiatEl = document.getElementById('receiveFiatVal');
  const flipBtn = document.getElementById('swapFlipBtn');
  const rateDisplay = document.getElementById('rateDisplay');
  const minReceivedDisplay = document.getElementById('minReceivedDisplay');
  const priceImpactDisplay = document.getElementById('priceImpactDisplay');
  const gasFeeDisplay = document.getElementById('gasFeeDisplay');
  const executeBtn = document.getElementById('executeSwapBtn');
  const swapBtnText = document.getElementById('swapBtnText');
  const slippagePills = document.querySelectorAll('.slip-btn');
  const customSlipInput = document.getElementById('customSlipInput');
  const currentSlipLabel = document.getElementById('currentSlippageLabel');
  const slippageWarning = document.getElementById('slippageWarning');
  const settingsBtn = document.getElementById('swapSettingsBtn');
  const settingsPanel = document.getElementById('swapSettingsPanel');
  const gasBtns = document.querySelectorAll('.gas-btn');
  const swapForm = document.getElementById('swapForm');
  const receiptCard = document.getElementById('swapReceiptCard');
  const receiptDismissBtn = document.getElementById('receiptDismissBtn');

  function formatUnits(amount, token) {
    const dec = TOKEN_CONFIG[token] ? TOKEN_CONFIG[token].decimals : 4;
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: Math.min(2, dec),
      maximumFractionDigits: dec
    });
  }

  function formatUsd(amount) {
    return '$' + Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function updateBalances() {
    if (payBalanceEl) payBalanceEl.textContent = formatUnits(wallet[payToken] || 0, payToken);
    if (receiveBalanceEl) receiveBalanceEl.textContent = formatUnits(wallet[receiveToken] || 0, receiveToken);
  }

  function calculateSwap() {
    const rawPay = parseFloat(payInput.value);
    const payPrice = TOKEN_CONFIG[payToken].priceUsd;
    const receivePrice = TOKEN_CONFIG[receiveToken].priceUsd;

    // Exchange rate
    const unitRate = payPrice / receivePrice;
    if (rateDisplay) {
      rateDisplay.textContent = `1 ${payToken} = ${formatUnits(unitRate, receiveToken)} ${receiveToken}`;
    }

    // Gas fee display
    if (gasFeeDisplay) {
      const g = GAS_FEES[gasSpeed] || GAS_FEES.fast;
      gasFeeDisplay.textContent = `~${formatUsd(g.usd)} (${g.gwei})`;
    }

    if (isNaN(rawPay) || rawPay <= 0) {
      receiveInput.value = '';
      if (payFiatEl) payFiatEl.textContent = '≈ $0.00 USD';
      if (receiveFiatEl) receiveFiatEl.textContent = '≈ $0.00 USD';
      if (minReceivedDisplay) minReceivedDisplay.textContent = '--';
      if (priceImpactDisplay) priceImpactDisplay.textContent = '< 0.01%';
      executeBtn.disabled = true;
      executeBtn.classList.remove('insufficient');
      swapBtnText.textContent = 'Enter an amount';
      return;
    }

    const payUsd = rawPay * payPrice;
    const grossReceive = payUsd / receivePrice;

    // Price impact curve
    const impactPct = Math.min(2.5, (payUsd / 250000) * 100);
    const netReceive = grossReceive * (1 - impactPct / 100);

    const receiveDecimals = TOKEN_CONFIG[receiveToken].decimals;
    receiveInput.value = netReceive.toFixed(receiveDecimals);

    if (payFiatEl) payFiatEl.textContent = `≈ ${formatUsd(payUsd)} USD`;
    if (receiveFiatEl) receiveFiatEl.textContent = `≈ ${formatUsd(netReceive * receivePrice)} USD`;

    // Minimum received based on slippage
    const minReceived = netReceive * (1 - slippage / 100);
    if (minReceivedDisplay) {
      minReceivedDisplay.textContent = `${formatUnits(minReceived, receiveToken)} ${receiveToken}`;
    }

    if (priceImpactDisplay) {
      priceImpactDisplay.textContent = impactPct < 0.01 ? '< 0.01%' : `${impactPct.toFixed(2)}%`;
      priceImpactDisplay.className = impactPct > 1.0 ? 'breakdown-val' : 'breakdown-val green';
    }

    // Balance check
    const currentBalance = wallet[payToken] || 0;
    if (rawPay > currentBalance) {
      executeBtn.disabled = true;
      executeBtn.classList.add('insufficient');
      swapBtnText.textContent = `Insufficient ${payToken} balance`;
    } else {
      executeBtn.disabled = false;
      executeBtn.classList.remove('insufficient');
      swapBtnText.textContent = `Swap ${payToken} for ${receiveToken} ⚡`;
    }
  }

  // Token Select Handlers
  if (paySelect) {
    paySelect.addEventListener('change', () => {
      payToken = paySelect.value;
      if (payToken === receiveToken) {
        const otherTokens = Object.keys(TOKEN_CONFIG).filter(t => t !== payToken);
        receiveToken = otherTokens[0] || 'USDC';
        if (receiveSelect) receiveSelect.value = receiveToken;
      }
      updateBalances();
      calculateSwap();
    });
  }

  if (receiveSelect) {
    receiveSelect.addEventListener('change', () => {
      receiveToken = receiveSelect.value;
      if (receiveToken === payToken) {
        const otherTokens = Object.keys(TOKEN_CONFIG).filter(t => t !== receiveToken);
        payToken = otherTokens[0] || 'ETH';
        if (paySelect) paySelect.value = payToken;
      }
      updateBalances();
      calculateSwap();
    });
  }

  // Pay Input Handler
  if (payInput) {
    payInput.addEventListener('input', calculateSwap);
  }

  // Max Button Handler
  if (payMaxBtn) {
    payMaxBtn.addEventListener('click', () => {
      const bal = wallet[payToken] || 0;
      payInput.value = bal;
      calculateSwap();
    });
  }

  // Flip Button Handler
  if (flipBtn) {
    flipBtn.addEventListener('click', () => {
      const tempToken = payToken;
      payToken = receiveToken;
      receiveToken = tempToken;

      if (paySelect) paySelect.value = payToken;
      if (receiveSelect) receiveSelect.value = receiveToken;

      updateBalances();
      calculateSwap();
    });
  }

  // Slippage Pills Handler
  slippagePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      slippagePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      if (customSlipInput) customSlipInput.value = '';
      slippage = parseFloat(pill.dataset.slip);
      if (currentSlipLabel) currentSlipLabel.textContent = `${slippage}%`;
      if (slippageWarning) slippageWarning.hidden = (slippage <= 2.0);
      calculateSwap();
    });
  });

  // Custom Slippage Input
  if (customSlipInput) {
    customSlipInput.addEventListener('input', () => {
      const val = parseFloat(customSlipInput.value);
      if (!isNaN(val) && val > 0) {
        slippagePills.forEach(p => p.classList.remove('active'));
        slippage = val;
        if (currentSlipLabel) currentSlipLabel.textContent = `${slippage}%`;
        if (slippageWarning) slippageWarning.hidden = (slippage <= 2.0);
        calculateSwap();
      }
    });
  }

  // Settings Panel Toggle
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.hidden = !settingsPanel.hidden;
    });
  }

  // Gas Speed Buttons
  gasBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      gasBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gasSpeed = btn.dataset.speed;
      calculateSwap();
    });
  });

  // Execute Swap Action
  if (executeBtn) {
    executeBtn.addEventListener('click', () => {
      const payAmt = parseFloat(payInput.value);
      const recAmt = parseFloat(receiveInput.value);

      if (isNaN(payAmt) || payAmt <= 0 || payAmt > (wallet[payToken] || 0)) return;

      // Update mock balances
      wallet[payToken] -= payAmt;
      wallet[receiveToken] = (wallet[receiveToken] || 0) + recAmt;

      // Generate random transaction hash
      const randHex = Array.from({ length: 4 }, () => Math.random().toString(16).substring(2, 6)).join('');
      const txHash = `0x7a${randHex}4e92`;

      // Fill in receipt
      const rcSwapped = document.getElementById('rcSwapped');
      const rcReceived = document.getElementById('rcReceived');
      const rcTxHash = document.getElementById('rcTxHash');
      const rcGas = document.getElementById('rcGas');

      if (rcSwapped) rcSwapped.textContent = `${payAmt} ${payToken}`;
      if (rcReceived) rcReceived.textContent = `${recAmt} ${receiveToken}`;
      if (rcTxHash) rcTxHash.textContent = txHash;
      if (rcGas) rcGas.textContent = formatUsd(GAS_FEES[gasSpeed].usd);

      // Show receipt card
      if (swapForm) swapForm.hidden = true;
      if (receiptCard) receiptCard.hidden = false;
      updateBalances();
    });
  }

  // Dismiss Receipt Action
  if (receiptDismissBtn) {
    receiptDismissBtn.addEventListener('click', () => {
      if (receiptCard) receiptCard.hidden = true;
      if (swapForm) swapForm.hidden = false;
      if (payInput) payInput.value = '';
      calculateSwap();
    });
  }

  updateBalances();
  calculateSwap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuickSwap);
} else {
  initQuickSwap();
}

