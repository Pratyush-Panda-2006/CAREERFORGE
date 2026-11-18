/**
 * Travel Odyssey - Client-Side Stress Testing & Telemetry Benchmark Engine
 * Issue #766 - NSoC '26 Level 3 Feature
 */

export class TravelOdysseyBenchmarkSuite {
  constructor(options = {}) {
    this.name = options.name || 'Travel Odyssey Benchmark Engine';
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

    // Simulated Global Route Pathfinding Workload: Haversine distance & multi-stop route optimization
    const workload = customWorkload || (() => {
      let totalDistanceKm = 0;
      for (let i = 0; i < 50; i++) {
        const lat1 = (i * 1.5) % 90;
        const lon1 = (i * 3.2) % 180;
        const lat2 = ((i + 1) * 2.1) % 90;
        const lon2 = ((i + 1) * 4.4) % 180;

        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalDistanceKm += 6371 * c;
      }
      return totalDistanceKm;
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

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.TravelOdysseyBenchmarkSuite = TravelOdysseyBenchmarkSuite;

  document.addEventListener('DOMContentLoaded', () => {
    const suite = new TravelOdysseyBenchmarkSuite();
    const runBtn = document.getElementById('run-benchmark-btn');
    const iterInput = document.getElementById('benchmark-iterations');

    const opsEl = document.getElementById('metric-ops');
    const p50El = document.getElementById('metric-p50');
    const p95El = document.getElementById('metric-p95');
    const p99El = document.getElementById('metric-p99');
    const avgEl = document.getElementById('metric-avg');

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const iters = parseInt(iterInput ? iterInput.value : '2000', 10);
        runBtn.disabled = true;
        runBtn.textContent = 'Benchmarking...';

        setTimeout(() => {
          const metrics = suite.runThroughputTest(iters);
          if (opsEl) opsEl.textContent = `${metrics.opsPerSec} ops/s`;
          if (p50El) p50El.textContent = `${metrics.p50} ms`;
          if (p95El) p95El.textContent = `${metrics.p95} ms`;
          if (p99El) p99El.textContent = `${metrics.p99} ms`;
          if (avgEl) avgEl.textContent = `${metrics.avgLatencyMs} ms`;

          runBtn.disabled = false;
          runBtn.textContent = 'Run Benchmark Engine';
        }, 50);
      });
    }
  });
}
