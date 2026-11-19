export const TARGETS = Object.freeze(['route', 'weather', 'dispatch', 'surface']);
const LIMIT = 1000000, MAX_MS = 86400000;

export function sanitizeEvent(name, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (name === 'scroll' && Number.isFinite(data.depth)) {
    return Object.freeze({ type: 'scroll', depth: Math.floor(Math.max(0, Math.min(100, data.depth)) / 5) * 5 });
  }
  if (name !== 'click' || !TARGETS.includes(data.target)) return null;
  let cell = null;
  if (data.xCell !== undefined || data.yCell !== undefined) {
    if (!Number.isInteger(data.xCell) || data.xCell < 0 || data.xCell > 7 || !Number.isInteger(data.yCell) || data.yCell < 0 || data.yCell > 5) return null;
    cell = Object.freeze([data.xCell, data.yCell]);
  }
  // Copy only the fixed vocabulary and coarse cell; never retain arbitrary input.
  return Object.freeze({ type: 'click', target: data.target, cell });
}

export class DroneDeliverySkywayAnalyticsEngine {
  #clock; #last; #enabled = false; #visible = true; #duration = 0;
  #clicks = 0; #eventCount = 0; #depth = 0; #events = [];
  #targets = Object.fromEntries(TARGETS.map(target => [target, 0]));
  #cells = Array(48).fill(0);
  constructor({ clock = () => performance.now() } = {}) {
    if (typeof clock !== 'function') throw new TypeError('A monotonic clock function is required.');
    this.#clock = clock; this.#last = this.#readClock();
  }
  #readClock() {
    const value = this.#clock();
    if (!Number.isFinite(value)) throw new RangeError('The session clock is unavailable.');
    return value;
  }
  #settle() {
    const now = Math.max(this.#last, this.#readClock());
    if (this.#enabled && this.#visible) this.#duration = Math.min(MAX_MS, this.#duration + now - this.#last);
    this.#last = now;
  }
  get running() { return this.#enabled; }
  start() { this.#settle(); this.#enabled = true; }
  pause() { this.#settle(); this.#enabled = false; }
  setVisible(visible) {
    if (typeof visible !== 'boolean') throw new TypeError('Visibility must be a boolean.');
    this.#settle(); this.#visible = visible;
  }
  computeSessionDuration() { this.#settle(); return Math.floor(this.#duration); }
  getScrollDepthPercentage() { return this.#depth; }
  trackEvent(name, data) {
    const clean = sanitizeEvent(name, data);
    if (!clean || !this.#enabled || !this.#visible) return false;
    if (clean.type === 'click' && this.#clicks >= LIMIT) return false;
    if (clean.type === 'scroll' && clean.depth <= this.#depth) return false;
    this.#settle();
    if (clean.type === 'click') {
      this.#clicks++; this.#targets[clean.target]++;
      if (clean.cell) this.#cells[clean.cell[1] * 8 + clean.cell[0]]++;
    } else this.#depth = clean.depth;
    this.#eventCount++;
    this.#events.push(Object.freeze({ atMs: Math.floor(this.#duration), ...clean }));
    if (this.#events.length > 100) this.#events.shift();
    return true;
  }
  clear() {
    this.#settle(); this.#enabled = false; this.#duration = 0; this.#clicks = 0;
    this.#eventCount = 0; this.#depth = 0; this.#events = [];
    this.#targets = Object.fromEntries(TARGETS.map(target => [target, 0]));
    this.#cells = Array(48).fill(0);
  }
  snapshot() {
    const activeMs = this.computeSessionDuration();
    return Object.freeze({
      schemaVersion: 1, state: !this.#enabled ? 'paused' : this.#visible ? 'collecting' : 'hidden',
      activeMs, clicks: this.#clicks, acceptedEvents: this.#eventCount, maximumScrollPercent: this.#depth,
      targets: Object.freeze({ ...this.#targets }),
      heatmap: Object.freeze({ columns: 8, rows: 6, cells: Object.freeze([...this.#cells]) }),
      events: Object.freeze([...this.#events])
    });
  }
}

function mount(root) {
  const engine = new DroneDeliverySkywayAnalyticsEngine();
  const stage = root.querySelector('[data-interaction-area]'), toggle = root.querySelector('[data-toggle]');
  const status = root.querySelector('#collection-status'), grid = root.querySelector('[data-heatmap]');
  const labels = { route: 'Plan route', weather: 'Check conditions', dispatch: 'Preview dispatch', surface: 'Interaction area' };
  let started = false, scrollFrame = 0, ticker = null;
  for (let i = 0; i < 48; i++) {
    const cell = document.createElement('span'); cell.setAttribute('aria-hidden', 'true'); grid.append(cell);
  }
  const seconds = ms => (ms / 1000).toFixed(1) + ' s';
  function render() {
    const report = engine.snapshot();
    toggle.textContent = engine.running ? 'Pause collection' : started ? 'Resume collection' : 'Start collection';
    toggle.setAttribute('aria-pressed', String(engine.running));
    root.querySelector('[data-state]').textContent = report.state === 'collecting' ? 'Collecting' : report.state === 'hidden' ? 'Hidden tab · paused' : 'Paused';
    root.querySelector('[data-duration]').textContent = seconds(report.activeMs);
    root.querySelector('[data-clicks]').textContent = report.clicks.toLocaleString();
    root.querySelector('[data-depth]').textContent = report.maximumScrollPercent + '%';
    root.querySelector('[data-events]').textContent = report.acceptedEvents.toLocaleString();
    for (const target of TARGETS) root.querySelector('[data-target-count="' + target + '"]').textContent = report.targets[target].toLocaleString();
    const maximum = Math.max(1, ...report.heatmap.cells), pointerCount = report.heatmap.cells.reduce((a, b) => a + b, 0);
    Array.from(grid.children).forEach((cell, i) => {
      cell.dataset.count = String(report.heatmap.cells[i]);
      cell.style.backgroundColor = 'rgb(130 198 223 / ' + (report.heatmap.cells[i] ? .25 + .75 * report.heatmap.cells[i] / maximum : .06) + ')';
    });
    grid.setAttribute('aria-label', pointerCount + ' pointer clicks aggregated into 48 coarse cells');
    const log = root.querySelector('[data-event-log]'); log.replaceChildren();
    if (!report.events.length) {
      const empty = document.createElement('li'); empty.className = 'empty'; empty.textContent = 'No measurements yet. Start collection, then try the interaction area.'; log.append(empty);
    }
    for (const entry of [...report.events].reverse()) {
      const row = document.createElement('li'), time = document.createElement('span');
      time.className = 'event-time'; time.textContent = '+' + seconds(entry.atMs);
      const text = entry.type === 'scroll' ? 'Scroll depth reached ' + entry.depth + '%' : labels[entry.target] + (entry.cell ? ' · cell ' + (entry.cell[0] + 1) + ', ' + (entry.cell[1] + 1) : ' · keyboard / non-pointer');
      row.append(time, document.createTextNode(text)); log.append(row);
    }
  }
  function measureScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const distance = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      // scrollHeight rounds to pixels while scrollY can end on a half-pixel.
      const depth = distance <= 0 || scrollY >= distance - 1 ? 100 : scrollY / distance * 100;
      if (engine.trackEvent('scroll', { depth })) render();
    });
  }
  toggle.addEventListener('click', () => {
    if (engine.running) { engine.pause(); status.textContent = 'Collection paused. Measurements remain in memory until cleared or this page reloads.'; }
    else { engine.start(); started = true; measureScroll(); status.textContent = 'Collection started. Only the described interaction counts, coarse cells, scroll depth and visible time are measured.'; }
    render();
  });
  stage.addEventListener('click', event => {
    const target = event.target.closest('[data-analytics-target]')?.dataset.analyticsTarget;
    const data = { target };
    if (event.detail > 0) {
      const box = stage.getBoundingClientRect();
      data.xCell = Math.max(0, Math.min(7, Math.floor((event.clientX - box.left) / Math.max(1, box.width) * 8)));
      data.yCell = Math.max(0, Math.min(5, Math.floor((event.clientY - box.top) / Math.max(1, box.height) * 6)));
    }
    if (engine.trackEvent('click', data)) { render(); root.querySelector('[data-stage-message]').textContent = 'Interaction counted. No text or form value was read.'; }
    else root.querySelector('[data-stage-message]').textContent = engine.running ? 'This target is outside the allowed measurement set.' : 'Collection is paused. Use ' + (started ? 'Resume collection' : 'Start collection') + ' to count this interaction.';
  });
  root.querySelector('[data-clear]').addEventListener('click', () => {
    if (!window.confirm('Clear these measurements? Download a report first if you need to keep them.')) return;
    engine.clear(); started = false; render(); status.textContent = 'Measurements cleared. Collection is paused.';
  });
  root.querySelector('[data-export]').addEventListener('click', () => {
    let url, anchor;
    try {
      const blob = new Blob([JSON.stringify(engine.snapshot(), null, 2)], { type: 'application/json' });
      url = URL.createObjectURL(blob); anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'drone-session.json'; document.body.append(anchor); anchor.click();
      status.textContent = 'Report download requested. It contains only the allowlisted measurements shown here.';
    } catch {
      status.textContent = 'Report download failed. Measurements are unchanged; retry the download.';
    } finally {
      anchor?.remove();
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });
  window.addEventListener('scroll', measureScroll, { passive: true });
  window.addEventListener('resize', measureScroll);
  document.addEventListener('visibilitychange', () => { engine.setVisible(!document.hidden); render(); });
  function startTicker() {
    if (ticker === null) ticker = setInterval(() => { root.querySelector('[data-duration]').textContent = seconds(engine.computeSessionDuration()); }, 250);
  }
  window.addEventListener('pagehide', () => { engine.pause(); clearInterval(ticker); ticker = null; if (scrollFrame) cancelAnimationFrame(scrollFrame); scrollFrame = 0; });
  window.addEventListener('pageshow', () => { startTicker(); render(); });
  engine.setVisible(!document.hidden); startTicker(); render();
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('drone-analytics');
  if (root) mount(root);
}
