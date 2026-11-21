/**
 * Supply Chain Logistics - Client-Side Hardware & Rendering Telemetry Stress Benchmark Suite
 * Issue #2137 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsStressBenchmarkEngine {
  constructor(options = {}) {
    this.targetFps = options.targetFps || 60;
    this.isRunning = false;
    this.results = null;
    this.frameTimestamps = [];
  }

  measureFrameJitter(deltas = []) {
    if (!deltas || deltas.length < 2) return 0;
    const diffs = [];
    for (let i = 1; i < deltas.length; i++) {
      diffs.push(Math.abs(deltas[i] - deltas[i - 1]));
    }
    const sum = diffs.reduce((acc, v) => acc + v, 0);
    return Number((sum / diffs.length).toFixed(2));
  }

  computeCompositeScore(fps = 60, jitter = 0, memoryMB = 50) {
    const fpsComponent = Math.min(60, Math.max(0, fps)) * (50 / 60);
    const jitterPenalty = Math.min(30, Math.max(0, jitter * 2));
    const memScore = Math.max(0, 30 - Math.min(30, (memoryMB / 200) * 30));

    const raw = fpsComponent + (20 - (jitterPenalty * (20 / 30))) + memScore;
    const clamped = Math.max(0, Math.min(100, Math.round(raw)));
    return clamped;
  }

  runStressTest(iterations = 1000) {
    const validIterations = Math.max(50, Math.floor(Number(iterations) || 1000));
    this.isRunning = true;
    const startTime = Date.now();

    let accumulator = 0;
    for (let i = 0; i < validIterations; i++) {
      accumulator += Math.sin(i) * Math.cos(i);
    }

    const durationMs = Math.max(1, Date.now() - startTime);
    const simulatedFps = Math.min(60, Math.max(15, Number((1000 / (durationMs / (validIterations / 100))).toFixed(1))));

    const mockDeltas = [16.6, 17.1, 16.2, 19.4, 16.5, 17.0, 18.2];
    const jitter = this.measureFrameJitter(mockDeltas);
    const simulatedMem = Number((35 + (validIterations / 500) * 5.2).toFixed(1));
    const composite = this.computeCompositeScore(simulatedFps, jitter, simulatedMem);

    let rating = 'DEGRADED';
    if (composite >= 80) rating = 'OPTIMAL';
    else if (composite >= 60) rating = 'STABLE';

    this.results = {
      iterations: validIterations,
      durationMs,
      simulatedFps,
      jitter,
      simulatedMem,
      compositeScore: composite,
      rating,
      accumulatorSummary: Number(accumulator.toFixed(4))
    };

    this.isRunning = false;
    return this.results;
  }

  getSummary() {
    return this.results;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBenchmarkBtn');
    const iterationsInput = document.getElementById('iterationsInput');
    const progressBar = document.getElementById('benchmarkProgress');
    const logBox = document.getElementById('stressTestLog');
    const ratingBadge = document.getElementById('ratingBadge');

    const scoreVal = document.getElementById('compositeScoreVal');
    const fpsVal = document.getElementById('avgFpsVal');
    const jitterVal = document.getElementById('frameJitterVal');
    const memVal = document.getElementById('memoryAllocVal');
    const domVal = document.getElementById('domLatencyVal');

    if (!startBtn) return;

    const engine = new SupplyChainLogisticsStressBenchmarkEngine();

    function appendLog(msg, type = 'info-msg') {
      if (!logBox) return;
      const el = document.createElement('div');
      el.className = `log-entry ${type}`;
      el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
      logBox.appendChild(el);
      logBox.scrollTop = logBox.scrollHeight;
    }

    startBtn.addEventListener('click', () => {
      startBtn.disabled = true;
      progressBar.style.width = '20%';
      appendLog('Initiating hardware & rendering stress benchmark...');

      setTimeout(() => {
        progressBar.style.width = '60%';
        const iters = Number(iterationsInput.value) || 1000;
        const res = engine.runStressTest(iters);

        progressBar.style.width = '100%';
        scoreVal.textContent = String(res.compositeScore);
        fpsVal.textContent = `${res.simulatedFps} FPS`;
        jitterVal.textContent = `${res.jitter} ms`;
        memVal.textContent = `${res.simulatedMem} MB`;
        domVal.textContent = `${res.durationMs} ms`;

        ratingBadge.textContent = res.rating;
        ratingBadge.className = `rating-badge badge-${res.rating.toLowerCase()}`;

        appendLog(`Benchmark completed. Composite Score: ${res.compositeScore}/100 (${res.rating})`);
        startBtn.disabled = false;
      }, 200);
    });
  });
}
