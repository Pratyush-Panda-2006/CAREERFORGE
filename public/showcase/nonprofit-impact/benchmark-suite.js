/** Local synthetic workload only; these numbers do not describe production service performance.
 * RAF intervals measure frame throughput. Operation samples exclude the wait between frames.
 * Percentiles use nearest rank. Heap size is a page-wide, nonstandard browser snapshot.
 * Clock, frame scheduling, memory and workload adapters are injectable for deterministic tests.
 */
function orderedSamples(samples) {
  if (!Array.isArray(samples) || samples.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new TypeError('Samples must be finite nonnegative numbers.');
  }
  return [...samples].sort((a, b) => a - b);
}
const rank = (sorted, p) => sorted.length ? sorted[Math.max(0, Math.ceil(p / 100 * sorted.length) - 1)] : null;
export function percentile(samples, p) {
  if (!Number.isFinite(p) || p < 0 || p > 100) throw new RangeError('Percentile must be between 0 and 100.');
  return rank(orderedSamples(samples), p);
}

function impactWork(index, factor) {
  let checksum = index | 0;
  for (let i = 0; i < 64 * factor; i++) checksum = Math.imul(checksum ^ (i + 1), 16777619);
  return checksum;
}
function heapSnapshot() {
  const bytes = globalThis.performance?.memory?.usedJSHeapSize;
  return Number.isFinite(bytes) && bytes >= 0 ? bytes : null;
}

export class NonprofitImpactBenchmarkSuite {
  constructor({ now = () => performance.now(), requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
    cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis), readMemory = heapSnapshot,
    operation = null, onProgress = () => {}, batchSize = 100, frameBudgetMs = 4, maxDurationMs = 10000 } = {}) {
    if (typeof now !== 'function' || typeof requestFrame !== 'function' || typeof cancelFrame !== 'function' ||
        typeof readMemory !== 'function' || typeof onProgress !== 'function' ||
        (operation !== null && typeof operation !== 'function') || !Number.isInteger(batchSize) ||
        batchSize < 1 || batchSize > 500 || !Number.isFinite(frameBudgetMs) || frameBudgetMs <= 0 || frameBudgetMs > 8 ||
        !Number.isFinite(maxDurationMs) || maxDurationMs < 100 || maxDurationMs > 30000) {
      throw new TypeError('Invalid benchmark adapters or safety bounds.');
    }
    Object.assign(this, { now, requestFrame, cancelFrame, readMemory, operation, onProgress, batchSize, frameBudgetMs, maxDurationMs });
    this.token = 0;
    this.running = false;
    this.reset();
  }

  reset() {
    this.status = 'idle';
    this.target = 0;
    this.completed = 0;
    this.latencies = [];
    this.frames = [];
    this.elapsedMs = 0;
    this.checksum = 0;
    this.frameId = null;
    this.phase = 'Steady';
  }

  measureLatency(operation = () => impactWork(this.completed, 1)) {
    if (this.latencies.length >= 50000) throw new Error('Sample capacity reached. Start a fresh run.');
    const start = this.now();
    const result = operation();
    const elapsed = this.now() - start;
    if (!Number.isFinite(elapsed) || elapsed < 0) throw new Error('The measurement clock must be monotonic.');
    this.checksum = (this.checksum ^ (Number(result) || 0)) >>> 0;
    this.latencies.push(elapsed);
    return elapsed;
  }

  getSummaryMetrics() {
    const sorted = orderedSamples(this.latencies);
    const intervals = this.frames.slice(1).map((time, index) => time - this.frames[index]);
    const frameSpan = this.frames.length > 1 ? this.frames.at(-1) - this.frames[0] : 0;
    let memoryBytes = null;
    try {
      const value = this.readMemory();
      if (Number.isFinite(value) && value >= 0) memoryBytes = value;
    } catch { /* Unsupported or restricted memory APIs are not a failed benchmark. */ }
    return {
      status: this.status, completed: this.completed, target: this.target, phase: this.phase,
      elapsedMs: this.elapsedMs, samples: sorted.length, checksum: this.checksum,
      fps: frameSpan > 0 ? intervals.length * 1000 / frameSpan : null,
      longestFrameMs: intervals.length ? Math.max(...intervals) : null,
      operationsPerSecond: this.elapsedMs > 0 ? this.completed * 1000 / this.elapsedMs : null,
      latency: { p50: rank(sorted, 50), p95: rank(sorted, 95), p99: rank(sorted, 99) },
      memoryBytes,
    };
  }

  runThroughputTest(iterations, { spikeFactor = 1 } = {}) {
    if (this.running) throw new Error('A benchmark is already running.');
    if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 50000 ||
        !Number.isInteger(spikeFactor) || spikeFactor < 1 || spikeFactor > 32) {
      throw new RangeError('Use 1–50,000 iterations and a spike factor of 1–32.');
    }
    const startedAt = this.now();
    if (!Number.isFinite(startedAt)) throw new Error('A finite measurement clock is required.');
    this.reset();
    this.target = iterations;
    this.status = 'running';
    this.running = true;
    const token = ++this.token;
    this.startedAt = startedAt;
    let publishedAt = startedAt;
    return new Promise((resolve, reject) => {
      this.settlement = { resolve, reject };
      const step = (timestamp) => {
        if (!this.running || token !== this.token) return;
        try {
          if (!Number.isFinite(timestamp) || (this.frames.length && timestamp < this.frames.at(-1))) {
            throw new Error('Animation frame timestamps must be monotonic.');
          }
          this.elapsedMs = this.now() - startedAt;
          if (!Number.isFinite(this.elapsedMs) || this.elapsedMs < 0) throw new Error('The measurement clock must be monotonic.');
          if (this.elapsedMs >= this.maxDurationMs) { this.finish('limit'); return; }
          this.frames.push(timestamp);
          const frameStart = this.now();
          for (let i = 0; i < this.batchSize && this.completed < iterations; i++) {
            if (i > 0 && this.now() - frameStart >= this.frameBudgetMs) break;
            const factor = Math.floor(this.completed / 250) % 2 ? spikeFactor : 1;
            this.phase = factor > 1 ? 'Simulated spike' : 'Steady';
            this.measureLatency(() => this.operation ? this.operation(this.completed) : impactWork(this.completed, factor));
            this.completed += 1;
          }
          this.elapsedMs = this.now() - startedAt;
          if (this.completed === iterations) { this.finish('complete'); return; }
          if (this.elapsedMs >= this.maxDurationMs) { this.finish('limit'); return; }
          if (this.now() - publishedAt >= 150) {
            this.onProgress(this.getSummaryMetrics());
            publishedAt = this.now();
          }
          if (!this.running || token !== this.token) return;
          this.frameId = this.requestFrame(step);
        } catch (error) { this.finish('error', error); }
      };
      try {
        this.onProgress(this.getSummaryMetrics());
        if (this.running && token === this.token) this.frameId = this.requestFrame(step);
      } catch (error) { this.finish('error', error); }
    });
  }

  finish(status, error = null) {
    if (!this.running) return;
    this.running = false;
    this.token += 1;
    if (this.frameId !== null) this.cancelFrame(this.frameId);
    this.frameId = null;
    this.status = status;
    const elapsed = this.now() - this.startedAt;
    if (Number.isFinite(elapsed) && elapsed >= 0) this.elapsedMs = elapsed;
    const settlement = this.settlement;
    this.settlement = null;
    if (error) { settlement.reject(error); return; }
    try {
      const summary = this.getSummaryMetrics();
      this.onProgress(summary);
      settlement.resolve(summary);
    } catch (callbackError) { this.status = 'error'; settlement.reject(callbackError); }
  }

  stop() { this.finish('stopped'); }
}

if (typeof document !== 'undefined' && document.querySelector('[data-benchmark-suite]')) {
  const run = document.querySelector('[data-run]');
  const stop = document.querySelector('[data-stop]');
  const iterations = document.querySelector('[data-iterations]');
  const load = document.querySelector('[data-load]');
  const status = document.querySelector('[data-status]');
  const number = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—';
  const suite = new NonprofitImpactBenchmarkSuite({ onProgress: (summary) => {
    run.disabled = summary.status === 'running';
    stop.disabled = summary.status !== 'running';
    iterations.disabled = run.disabled;
    load.disabled = run.disabled;
    document.querySelector('[data-fps]').textContent = number(summary.fps);
    document.querySelector('[data-throughput]').textContent = number(summary.operationsPerSecond, 0);
    document.querySelector('[data-memory]').textContent = summary.memoryBytes === null ? 'Unavailable' : `${number(summary.memoryBytes / 1048576)} MiB`;
    document.querySelector('[data-count]').textContent = `${summary.completed.toLocaleString()} / ${summary.target.toLocaleString()}`;
    document.querySelector('[data-phase]').textContent = summary.phase;
    document.querySelector('[data-duration]').textContent = `${number(summary.elapsedMs / 1000, 2)} seconds`;
    const progress = document.querySelector('progress');
    progress.max = summary.target || 1;
    progress.value = summary.completed;
    const max = summary.latency.p99 || 1;
    for (const p of ['p50', 'p95', 'p99']) {
      document.querySelector(`[data-${p}]`).textContent = `${number(summary.latency[p], 3)} ms`;
      document.querySelector(`[data-bar-${p}]`).style.width = `${Math.min(100, (summary.latency[p] || 0) / max * 100)}%`;
    }
    const labels = { running: 'Running locally. Stop at any time.', complete: 'Run complete.', stopped: 'Stopped. Partial results are shown.', limit: 'Time limit reached. Partial results are shown.' };
    if (labels[summary.status] && status.textContent !== labels[summary.status]) status.textContent = labels[summary.status];
  } });
  run.addEventListener('click', async () => {
    try { await suite.runThroughputTest(Number(iterations.value), { spikeFactor: Number(load.value) }); }
    catch (error) {
      status.textContent = error.message;
      run.disabled = false;
      stop.disabled = true;
      iterations.disabled = false;
      load.disabled = false;
    }
  });
  stop.addEventListener('click', () => suite.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) suite.stop(); });
  window.addEventListener('pagehide', () => suite.stop());
}
