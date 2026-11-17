/**
 * Legal Smart Contracts - Client-Side Stress Testing & Telemetry Benchmark Engine
 * Evaluates contract clause parsing throughput, cryptographic gas estimation, and latency percentiles (P50, P95, P99).
 */

export class LegalSmartContractsBenchmarkSuite {
  constructor(options = {}) {
    this.name = options.name || 'Legal Smart Contracts Benchmark Suite';
    this.sampleBuffer = [];
    this.isRunning = false;
    this.summary = {
      totalIterations: 0,
      elapsedMs: 0,
      opsPerSec: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      avgLatencyMs: 0,
      peakMemoryMb: 0
    };
  }

  calculatePercentile(sortedAsc, percentile) {
    if (!sortedAsc || sortedAsc.length === 0) return 0;
    const index = Math.min(
      Math.floor((percentile / 100) * sortedAsc.length),
      sortedAsc.length - 1
    );
    return Number(sortedAsc[index].toFixed(3));
  }

  measureLatency(operationFn) {
    const t0 = performance.now();
    operationFn();
    const t1 = performance.now();
    return Math.max(0.001, t1 - t0);
  }

  runThroughputTest(iterations = 1000, customWorkload = null) {
    this.sampleBuffer = [];
    this.isRunning = true;

    // Default smart contract stress workload: Multi-clause gas calculation & regex validation
    const workload = customWorkload || (() => {
      let gasEstimate = 21000;
      for (let i = 0; i < 40; i++) {
        const clause = `REQUIRE(stakeAmount >= ${100 + i}) && ASSERT(validSigner == true)`;
        const isValid = clause.includes('REQUIRE') && clause.includes('ASSERT');
        if (isValid) {
          gasEstimate += (i * 35) + (clause.length * 8);
        }
      }
      return gasEstimate;
    });

    const startTotal = performance.now();
    for (let i = 0; i < iterations; i++) {
      const lat = this.measureLatency(workload);
      this.sampleBuffer.push(lat);
    }
    const endTotal = performance.now();
    const elapsedMs = Math.max(0.1, endTotal - startTotal);

    const sorted = [...this.sampleBuffer].sort((a, b) => a - b);
    const sumLatency = this.sampleBuffer.reduce((acc, v) => acc + v, 0);

    const p50 = this.calculatePercentile(sorted, 50);
    const p95 = this.calculatePercentile(sorted, 95);
    const p99 = this.calculatePercentile(sorted, 99);

    let memoryMb = 0;
    if (typeof performance !== 'undefined' && performance.memory && performance.memory.usedJSHeapSize) {
      memoryMb = Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2));
    }

    this.summary = {
      totalIterations: iterations,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      opsPerSec: Math.round(iterations / (elapsedMs / 1000)),
      p50,
      p95,
      p99,
      avgLatencyMs: Number((sumLatency / iterations).toFixed(3)),
      peakMemoryMb: memoryMb
    };

    this.isRunning = false;
    return this.summary;
  }

  getSummaryMetrics() {
    return { ...this.summary };
  }

  reset() {
    this.sampleBuffer = [];
    this.isRunning = false;
    this.summary = {
      totalIterations: 0,
      elapsedMs: 0,
      opsPerSec: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      avgLatencyMs: 0,
      peakMemoryMb: 0
    };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fpsMeterEl = document.getElementById('liveFpsMeter');
    if (!fpsMeterEl) return;

    const suite = new LegalSmartContractsBenchmarkSuite();

    const runBtn = document.getElementById('runBenchmarkBtn');
    const resetBtn = document.getElementById('resetBenchmarkBtn');
    const iterationInput = document.getElementById('iterationCountInput');

    const statOps = document.getElementById('statOpsPerSec');
    const statP50 = document.getElementById('statP50');
    const statP95 = document.getElementById('statP95');
    const statP99 = document.getElementById('statP99');
    const statAvg = document.getElementById('statAvgLatency');
    const statMemory = document.getElementById('statMemoryUsage');

    const barP50 = document.getElementById('barP50');
    const barP95 = document.getElementById('barP95');
    const barP99 = document.getElementById('barP99');

    // FPS Loop
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let currentFps = 60;

    function measureFrame(now) {
      frameCount++;
      const delta = now - lastFrameTime;
      if (delta >= 1000) {
        currentFps = Math.round((frameCount * 1000) / delta);
        if (fpsMeterEl) {
          fpsMeterEl.textContent = `${currentFps} FPS`;
          fpsMeterEl.className = `fps-badge ${currentFps >= 50 ? 'fps-good' : currentFps >= 30 ? 'fps-warning' : 'fps-critical'}`;
        }
        frameCount = 0;
        lastFrameTime = now;
      }
      requestAnimationFrame(measureFrame);
    }
    requestAnimationFrame(measureFrame);

    function updateView() {
      const metrics = suite.getSummaryMetrics();
      if (statOps) statOps.textContent = metrics.opsPerSec.toLocaleString() + ' ops/s';
      if (statP50) statP50.textContent = metrics.p50 + ' ms';
      if (statP95) statP95.textContent = metrics.p95 + ' ms';
      if (statP99) statP99.textContent = metrics.p99 + ' ms';
      if (statAvg) statAvg.textContent = metrics.avgLatencyMs + ' ms';
      if (statMemory) statMemory.textContent = metrics.peakMemoryMb ? metrics.peakMemoryMb + ' MB' : 'N/A';

      const maxScale = Math.max(metrics.p99 * 1.2, 0.5);
      if (barP50) barP50.style.width = `${Math.min(100, (metrics.p50 / maxScale) * 100)}%`;
      if (barP95) barP95.style.width = `${Math.min(100, (metrics.p95 / maxScale) * 100)}%`;
      if (barP99) barP99.style.width = `${Math.min(100, (metrics.p99 / maxScale) * 100)}%`;
    }

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const count = parseInt(iterationInput ? iterationInput.value : '2500', 10) || 2500;
        runBtn.disabled = true;
        runBtn.textContent = 'Simulating Load Spikes...';

        setTimeout(() => {
          suite.runThroughputTest(count);
          updateView();
          runBtn.disabled = false;
          runBtn.textContent = '🚀 Start Benchmark Suite';
        }, 50);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        suite.reset();
        updateView();
      });
    }

    updateView();
  });
}
