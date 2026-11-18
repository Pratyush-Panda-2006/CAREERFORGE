/**
 * Quantum Forge - Client-Side Stress Testing & Telemetry Benchmark Engine
 * Issue #806 - NSoC '26 Level 3 Feature
 */

export class QuantumForgeBenchmarkSuite {
  constructor(options = {}) {
    this.name = options.name || 'Quantum Forge Benchmark Suite';
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

    // Simulated 4-Qubit State Vector Complex Tensor Product & Unitary Gate Synthesis Workload
    const workload = customWorkload || (() => {
      let state = [1, 0, 0, 0, 0, 0, 0, 0]; // 3-qubit basis state |000>
      const invSqrt2 = 1 / Math.sqrt(2);
      for (let g = 0; g < 30; g++) {
        // Apply simulated Hadamard & Phase Rotations across amplitudes
        const next = new Array(8).fill(0);
        for (let i = 0; i < 8; i += 2) {
          next[i] = (state[i] + state[i + 1]) * invSqrt2;
          next[i + 1] = (state[i] - state[i + 1]) * invSqrt2;
        }
        state = next;
      }
      return state[0];
    });

    const startTotal = performance.now();
    for (let i = 0; i < iterations; i++) {
      const lat = this.measureLatency(workload);
      this.sampleBuffer.push(lat);
    }
    const endTotal = performance.now();
    const elapsedMs = Math.max(0.001, endTotal - startTotal);

    const sorted = [...this.sampleBuffer].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = sum / sorted.length;

    let peakMemory = 0;
    if (typeof performance !== 'undefined' && performance.memory) {
      peakMemory = Number((performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2));
    }

    this.summary = {
      totalIterations: iterations,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      opsPerSec: Math.round((iterations / (elapsedMs / 1000)) * 100) / 100,
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      avgLatencyMs: Number(avg.toFixed(3)),
      peakMemoryMb: peakMemory
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

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.QuantumForgeBenchmarkSuite = QuantumForgeBenchmarkSuite;

  document.addEventListener('DOMContentLoaded', () => {
    const suite = new QuantumForgeBenchmarkSuite();
    const runBtn = document.getElementById('run-benchmark-btn');
    const iterInput = document.getElementById('benchmark-iterations');

    const opsEl = document.getElementById('metric-ops');
    const p50El = document.getElementById('metric-p50');
    const p95El = document.getElementById('metric-p95');
    const p99El = document.getElementById('metric-p99');
    const avgEl = document.getElementById('metric-avg');

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const iters = iterInput ? parseInt(iterInput.value, 10) || 500 : 500;
        runBtn.textContent = 'Running Stress Test...';
        runBtn.disabled = true;

        setTimeout(() => {
          const results = suite.runThroughputTest(iters);
          if (opsEl) opsEl.textContent = results.opsPerSec.toLocaleString();
          if (p50El) p50El.textContent = results.p50 + ' ms';
          if (p95El) p95El.textContent = results.p95 + ' ms';
          if (p99El) p99El.textContent = results.p99 + ' ms';
          if (avgEl) avgEl.textContent = results.avgLatencyMs + ' ms';

          runBtn.textContent = 'Run Benchmark';
          runBtn.disabled = false;
        }, 50);
      });
    }
  });
}
