/**
 * Streaming Cinema Hub - Client-Side Hardware & Rendering Telemetry Stress Benchmark Suite
 * Issue #2151 - NSoC '26 Level 3 Feature
 */

export class StreamingCinemaHubStressBenchmarkEngine {
  constructor(options = {}) {
    this.targetFps = options.targetFps || 60;
    this.isRunning = false;
    this.results = null;
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
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  runStressTest(iterations = 1000) {
    const validIterations = Math.max(50, Math.floor(Number(iterations) || 1000));
    this.isRunning = true;
    const startTime = Date.now();

    // 4K Cinema video frame buffer stress simulation
    let accumulator = 0;
    const simulatedFrameDeltas = [];

    for (let i = 0; i < validIterations; i++) {
      const stepStart = performance.now();
      for (let j = 0; j < 500; j++) {
        accumulator += Math.sqrt(i * 1.8 + j * 0.9) * Math.sin(j);
      }
      const stepEnd = performance.now();
      const delta = stepEnd - stepStart + 16.6;
      simulatedFrameDeltas.push(delta);
    }

    const duration = Date.now() - startTime;
    const avgDelta = simulatedFrameDeltas.reduce((a, b) => a + b, 0) / simulatedFrameDeltas.length;
    const effectiveFps = Number((1000 / avgDelta).toFixed(1));
    const jitter = this.measureFrameJitter(simulatedFrameDeltas);
    const simulatedMemoryMB = Number((42 + (validIterations / 500) * 14).toFixed(1));
    const compositeScore = this.computeCompositeScore(effectiveFps, jitter, simulatedMemoryMB);

    this.results = {
      iterations: validIterations,
      durationMs: duration,
      effectiveFps,
      jitterMs: jitter,
      estimatedMemoryMB: simulatedMemoryMB,
      compositeScore,
      rating: compositeScore >= 80 ? 'OPTIMAL' : compositeScore >= 60 ? 'STABLE' : 'DEGRADED',
      completedAt: new Date().toISOString()
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
    const engine = new StreamingCinemaHubStressBenchmarkEngine();

    const startBtn = document.getElementById('startBenchmarkBtn');
    const iterInput = document.getElementById('iterationsInput');
    const scoreVal = document.getElementById('compositeScoreVal');
    const fpsVal = document.getElementById('fpsVal');
    const jitterVal = document.getElementById('jitterVal');
    const memoryVal = document.getElementById('memoryVal');
    const ratingBadge = document.getElementById('ratingBadge');
    const progressBar = document.getElementById('benchmarkProgress');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const iters = Number(iterInput?.value) || 1000;
        startBtn.disabled = true;
        startBtn.textContent = 'Benchmarking...';
        if (progressBar) progressBar.style.width = '30%';

        setTimeout(() => {
          const res = engine.runStressTest(iters);
          if (progressBar) progressBar.style.width = '100%';

          if (scoreVal) scoreVal.textContent = res.compositeScore;
          if (fpsVal) fpsVal.textContent = `${res.effectiveFps} FPS`;
          if (jitterVal) jitterVal.textContent = `±${res.jitterMs} ms`;
          if (memoryVal) memoryVal.textContent = `${res.estimatedMemoryMB} MB`;

          if (ratingBadge) {
            ratingBadge.textContent = res.rating;
            ratingBadge.className = `status-badge ${res.rating.toLowerCase()}`;
          }

          startBtn.disabled = false;
          startBtn.textContent = 'Rerun Benchmark';
        }, 50);
      });
    }
  });
}
