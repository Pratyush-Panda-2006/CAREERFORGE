const average = (values) => values.reduce((sum, n) => sum + n, 0) / values.length;
function finite(value, minimum = 0) {
  if (!Number.isFinite(value) || value < minimum) throw new RangeError('Measurements must be finite and nonnegative.');
  return value;
}
export class WeatherRadarAtlasStressBenchmarkEngine {
  #active = null;
  #intervals = [];
  #costs = [];
  #last = null;
  constructor(options = {}) {
    this.requestFrame = options.requestFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
    this.cancelFrame = options.cancelFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis);
    this.now = options.now ?? (() => performance.now());
    this.work = options.work ?? (() => {});
    this.readHeap = options.readHeap ?? (() => globalThis.performance?.memory?.usedJSHeapSize ?? null);
    for (const fn of [this.now, this.work, this.readHeap]) if (typeof fn !== 'function') throw new TypeError('Expected measurement functions.');
  }
  get isRunning() { return this.#active !== null; }
  measureFrameJitter(intervals = this.#intervals) {
    if (!Array.isArray(intervals) || intervals.length > 1200) throw new RangeError('Use a bounded array of frame intervals.');
    for (const value of intervals) finite(value, Number.MIN_VALUE);
    if (intervals.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < intervals.length; i++) total += Math.abs(intervals[i] - intervals[i - 1]);
    return total / (intervals.length - 1);
  }
  computeCompositeScore(fps, jitterMs, layoutMs) {
    finite(fps); finite(jitterMs); finite(layoutMs);
    // A repeatable page-workload index, not a hardware rating. Heap is not scored.
    return Math.max(0, Math.min(100, Math.round(60 * Math.min(1, fps / 60) + 20 / (1 + jitterMs / 4) + 20 / (1 + layoutMs / 4))));
  }
  #heap() {
    try { const n = this.readHeap(); return Number.isFinite(n) && n >= 0 ? n : null; }
    catch { return null; }
  }
  #summary(status, firstHeap, lastHeap) {
    const frames = this.#intervals.length;
    const fps = frames ? 1000 / average(this.#intervals) : null;
    const jitterMs = frames ? this.measureFrameJitter() : null;
    const layoutMs = frames ? average(this.#costs) : null;
    return { status, frames, fps, jitterMs, layoutMs,
      score: frames ? this.computeCompositeScore(fps, jitterMs, layoutMs) : null,
      heapMiB: lastHeap === null ? null : lastHeap / 1048576,
      heapChangeMiB: firstHeap === null || lastHeap === null ? null : (lastHeap - firstHeap) / 1048576 };
  }
  getSummary() { return this.#last ? { ...this.#last } : null; }
  getFrameSamples() { return { intervals: [...this.#intervals], layoutCosts: [...this.#costs] }; }
  #finish(run, status, error) {
    if (this.#active !== run) return;
    this.#active = null;
    if (run.raf !== null) this.cancelFrame(run.raf);
    if (error) { run.reject(error); return; }
    this.#last = this.#summary(status, run.heap, this.#heap());
    run.resolve(this.getSummary());
  }
  stop() {
    const run = this.#active;
    if (!run) return false;
    this.#finish(run, 'cancelled'); return true;
  }
  async runStressTest(iterations = 120, { onProgress = () => {} } = {}) {
    if (!Number.isInteger(iterations) || iterations < 2 || iterations > 600) throw new RangeError('Choose 2–600 measured frames.');
    if (this.isRunning) throw new Error('A benchmark is already running.');
    if (typeof this.requestFrame !== 'function' || typeof this.cancelFrame !== 'function') throw new Error('Animation-frame measurement is unavailable.');
    if (typeof onProgress !== 'function') throw new TypeError('Expected a progress callback.');
    this.#intervals = []; this.#costs = [];
    return new Promise((resolve, reject) => {
      const run = { resolve, reject, raf: null, previous: null, heap: this.#heap() };
      this.#active = run;
      const schedule = () => { run.raf = this.requestFrame(tick); };
      const tick = (timestamp) => {
        if (this.#active !== run) return;
        run.raf = null;
        try {
          finite(timestamp);
          if (run.previous === null) { run.previous = timestamp; schedule(); return; }
          const interval = timestamp - run.previous; finite(interval, Number.MIN_VALUE); run.previous = timestamp;
          const start = finite(this.now()); this.work(this.#intervals.length);
          const cost = finite(this.now() - start);
          this.#intervals.push(interval); this.#costs.push(cost);
          if (this.#intervals.length % 6 === 0 || this.#intervals.length === iterations) onProgress(this.#summary('running', run.heap, null));
          if (this.#active !== run) return;
          if (this.#intervals.length === iterations) this.#finish(run, 'completed'); else schedule();
        } catch (error) { this.#finish(run, 'failed', error); }
      };
      try { schedule(); } catch (error) { this.#finish(run, 'failed', error); }
    });
  }
}

function mount() {
  const root = document.querySelector('[data-stress-lab]'); if (!root) return;
  const get = (id) => root.querySelector(`#${id}`), host = get('workload');
  let cells = [], lastResult = null;
  const engine = new WeatherRadarAtlasStressBenchmarkEngine({ work(frame) {
    for (let i = 0; i < cells.length; i++) {
      const value = (Math.sin(frame / 10 + i * .41) + 1) / 2;
      cells[i].style.height = `${4 + 10 * value}px`;
      cells[i].style.opacity = String(.35 + .65 * value);
    }
    // Force style/layout after real DOM mutation; this is a proxy, not GPU paint time.
    host.getBoundingClientRect();
  } });
  const format = (value, unit = '') => value === null ? 'Unavailable' : `${value.toFixed(2)}${unit}`;
  function render(result) {
    get('fps-value').textContent = format(result.fps);
    get('jitter-value').textContent = format(result.jitterMs, ' ms');
    get('layout-value').textContent = format(result.layoutMs, ' ms');
    get('heap-value').textContent = format(result.heapMiB, ' MiB');
    get('heap-change').textContent = result.heapChangeMiB === null ? 'No comparable heap samples' : `Change ${format(result.heapChangeMiB, ' MiB')}`;
    get('score-value').textContent = result.score === null ? '—' : String(result.score);
    get('fps-ring').style.strokeDashoffset = String(283 * (1 - Math.min(1, (result.fps ?? 0) / 120)));
    get('progress').value = result.frames; get('frame-count').textContent = `${result.frames} measured frames`;
  }
  const notice = (text, error = false) => { get('status').textContent = text; get('status').setAttribute('role', error ? 'alert' : 'status'); };
  get('form').addEventListener('invalid', () => notice('Choose 12–600 whole frames. The previous report is retained.', true), true);
  get('form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (engine.isRunning) return;
    const count = get('iterations').valueAsNumber;
    cells = Array.from({ length: 64 }, () => document.createElement('span')); host.replaceChildren(...cells);
    get('node-count').textContent = String(host.childElementCount);
    get('start').disabled = true; get('iterations').disabled = true; get('stop').disabled = false;
    get('progress').max = count; get('progress').value = 0; get('frame-count').textContent = 'Waiting for the first frame';
    root.setAttribute('aria-busy', 'true'); notice('Measuring this page’s rendering workload…');
    try {
      const result = await engine.runStressTest(count, { onProgress: render }); render(result);
      lastResult = { ...result }; get('report').textContent = JSON.stringify(result, null, 2);
      notice(result.status === 'completed' ? 'Completed. This report stays local until you reload or run again.' : 'Stopped. Partial measurements are shown.');
    } catch (error) { if (lastResult) { get('progress').max = Math.max(1, lastResult.frames); render(lastResult); } notice(`Benchmark failed: ${error.message}. The previous report is retained.`, true); }
    finally {
      host.replaceChildren(); cells = []; get('node-count').textContent = '0';
      root.setAttribute('aria-busy', 'false'); get('start').disabled = false; get('iterations').disabled = false; get('stop').disabled = true;
    }
  });
  get('stop').addEventListener('click', () => engine.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) engine.stop(); });
  window.addEventListener('pagehide', () => engine.stop());
}
if (typeof document !== 'undefined') mount();
