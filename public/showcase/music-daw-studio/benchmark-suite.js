/**
 * Music DAW Studio - Client-Side Stress Testing & Telemetry Benchmark Engine
 * Issue #860 - NSoC '26 Level 3 Feature
 */

export class MusicDawStudioBenchmarkSuite {
  constructor(options = {}) {
    this.name = options.name || 'Music DAW Audio Buffer Stress Benchmark';
    this.sampleBuffer = [];
    this.isRunning = false;
    this.summary = {
      totalIterations: 0,
      elapsedMs: 0,
      opsPerSec: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      avgLatencyMs: 0
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

    // Music DAW audio DSP filter convolution workload simulation
    const workload = customWorkload || (() => {
      let acc = 0;
      for (let i = 0; i < 50; i++) {
        acc += Math.sin(i * 0.1) * Math.sqrt(i + 1);
      }
      return acc;
    });

    const startTotal = performance.now();

    for (let i = 0; i < iterations; i++) {
      const lat = this.measureLatency(workload);
      this.sampleBuffer.push(lat);
    }

    const elapsedMs = performance.now() - startTotal;
    const sorted = [...this.sampleBuffer].sort((a, b) => a - b);
    const sumLatency = this.sampleBuffer.reduce((a, b) => a + b, 0);

    this.summary = {
      totalIterations: iterations,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      opsPerSec: Math.round((iterations / (elapsedMs / 1000)) || 0),
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
      avgLatencyMs: Number((sumLatency / iterations).toFixed(3))
    };

    this.isRunning = false;
    return this.summary;
  }

  getSummaryMetrics() {
    return { ...this.summary };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const suite = new MusicDawStudioBenchmarkSuite();

    const startBtn = document.getElementById('runBenchmarkBtn');
    const iterInput = document.getElementById('benchmarkIterations');
    const opsSecVal = document.getElementById('opsPerSecVal');
    const avgLatVal = document.getElementById('avgLatencyVal');
    const p95Val = document.getElementById('p95Val');
    const p99Val = document.getElementById('p99Val');

    if (startBtn && iterInput) {
      startBtn.addEventListener('click', () => {
        const iters = parseInt(iterInput.value, 10) || 1000;
        startBtn.disabled = true;
        startBtn.textContent = 'Benchmarking...';

        setTimeout(() => {
          const res = suite.runThroughputTest(iters);
          if (opsSecVal) opsSecVal.textContent = res.opsPerSec.toLocaleString();
          if (avgLatVal) avgLatVal.textContent = `${res.avgLatencyMs} ms`;
          if (p95Val) p95Val.textContent = `${res.p95} ms`;
          if (p99Val) p99Val.textContent = `${res.p99} ms`;

          startBtn.disabled = false;
          startBtn.textContent = 'Rerun Benchmark';
        }, 50);
      });
    }
  });
}
