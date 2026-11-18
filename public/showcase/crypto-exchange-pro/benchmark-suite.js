/**
 * Implement client-side stress testing & telemetry benchmark engine - Client-Side Stress Testing & Telemetry Benchmark Engine
 * Evaluates calculation throughput and latency percentiles (P50, P95, P99).
 */

export class CryptoExchangeProBenchmarkSuite {
  constructor(options = {}) {
    this.name = options.name || 'Implement client-side stress testing & telemetry benchmark engine Benchmark';
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

    const workload = customWorkload || (() => {
      let acc = 0;
      for (let i = 0; i < 50; i++) {
        acc += Math.sqrt(i * 1.5 + 0.1);
      }
      return acc;
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

    this.summary = {
      totalIterations: iterations,
      elapsedMs: Number(elapsedMs.toFixed(2)),
      opsPerSec: Math.round((iterations / (elapsedMs / 1000))),
      p50,
      p95,
      p99,
      avgLatencyMs: Number((sumLatency / iterations).toFixed(3))
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
      avgLatencyMs: 0
    };
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const suite = new CryptoExchangeProBenchmarkSuite();

    const iterInput = document.getElementById('iterationCountInput');
    const runBtn = document.getElementById('runBenchmarkBtn');
    const resetBtn = document.getElementById('resetBenchmarkBtn');

    const statOps = document.getElementById('statOpsPerSec');
    const statAvg = document.getElementById('statAvgLatency');
    const statP50 = document.getElementById('statP50');
    const statP95 = document.getElementById('statP95');
    const statP99 = document.getElementById('statP99');

    function updateView() {
      const m = suite.getSummaryMetrics();
      if (statOps) statOps.textContent = `${m.opsPerSec.toLocaleString()} ops/s`;
      if (statAvg) statAvg.textContent = `${m.avgLatencyMs} ms`;
      if (statP50) statP50.textContent = `${m.p50} ms`;
      if (statP95) statP95.textContent = `${m.p95} ms`;
      if (statP99) statP99.textContent = `${m.p99} ms`;
    }

    runBtn?.addEventListener('click', () => {
      const count = Number(iterInput?.value || 1000);
      suite.runThroughputTest(count);
      updateView();
    });

    resetBtn?.addEventListener('click', () => {
      suite.reset();
      updateView();
    });

    suite.runThroughputTest(500);
    updateView();
  });
}
