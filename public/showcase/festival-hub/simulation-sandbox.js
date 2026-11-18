/**
 * Festival Hub - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Issue #881 - NSoC '26 Level 3 Feature
 */

export class FestivalHubMonteCarloEngine {
  constructor() {
    this.results = [];
    this.sortedResults = [];
    this.lastParams = {
      trials: 0,
      volatility: 0,
      baseAttendance: 0
    };
  }

  // Box-Muller transform for standard normal random sampling
  static randomNormal() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  runSimulation(trials = 1000, volatility = 0.15, baseAttendance = 25000) {
    const validTrials = Math.max(10, Math.floor(Number(trials) || 1000));
    const validVolatility = Math.max(0.01, Number(volatility) || 0.15);
    const validBase = Math.max(1, Number(baseAttendance) || 25000);

    this.lastParams = {
      trials: validTrials,
      volatility: validVolatility,
      baseAttendance: validBase
    };

    this.results = new Float64Array(validTrials);

    for (let i = 0; i < validTrials; i++) {
      const z = FestivalHubMonteCarloEngine.randomNormal();
      // Geometric Brownian step outcome for ticket sales / crowd turnout dispersion
      const outcome = validBase * Math.exp((-0.5 * validVolatility * validVolatility) + (validVolatility * z));
      this.results[i] = Number(outcome.toFixed(0));
    }

    this.sortedResults = Array.from(this.results).sort((a, b) => a - b);
    return Array.from(this.results);
  }

  getStandardDeviation() {
    if (!this.results || this.results.length === 0) return 0;
    const n = this.results.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.results[i];
    const mean = sum / n;

    let varianceSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = this.results[i] - mean;
      varianceSum += diff * diff;
    }
    return Number(Math.sqrt(varianceSum / n).toFixed(2));
  }

  calculatePercentiles() {
    if (!this.sortedResults || this.sortedResults.length === 0) {
      return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
    }
    const n = this.sortedResults.length;
    const getP = (p) => this.sortedResults[Math.min(Math.floor((p / 100) * n), n - 1)];

    return {
      p10: getP(10),
      p25: getP(25),
      p50: getP(50),
      p75: getP(75),
      p90: getP(90),
      p95: getP(95),
      p99: getP(99)
    };
  }

  getSummary() {
    if (!this.results || this.results.length === 0) {
      return { count: 0, mean: 0, stdDev: 0, min: 0, max: 0, percentiles: {} };
    }
    const n = this.results.length;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < n; i++) {
      const v = this.results[i];
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    return {
      count: n,
      mean: Number((sum / n).toFixed(2)),
      stdDev: this.getStandardDeviation(),
      min,
      max,
      percentiles: this.calculatePercentiles()
    };
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.FestivalHubMonteCarloEngine = FestivalHubMonteCarloEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FestivalHubMonteCarloEngine();
    const runBtn = document.getElementById('btn-run-sim');
    const trialsInput = document.getElementById('sim-trials');
    const volInput = document.getElementById('sim-volatility');
    const baseInput = document.getElementById('sim-base');

    const meanEl = document.getElementById('metric-mean');
    const stdDevEl = document.getElementById('metric-stddev');
    const p50El = document.getElementById('metric-p50');
    const p95El = document.getElementById('metric-p95');

    if (runBtn) {
      runBtn.addEventListener('click', () => {
        const trials = parseInt(trialsInput?.value, 10) || 1000;
        const vol = parseFloat(volInput?.value) || 0.15;
        const base = parseInt(baseInput?.value, 10) || 25000;

        runBtn.textContent = 'Simulating...';
        setTimeout(() => {
          engine.runSimulation(trials, vol, base);
          const s = engine.getSummary();

          if (meanEl) meanEl.textContent = s.mean.toLocaleString();
          if (stdDevEl) stdDevEl.textContent = '±' + s.stdDev.toLocaleString();
          if (p50El) p50El.textContent = s.percentiles.p50.toLocaleString();
          if (p95El) p95El.textContent = s.percentiles.p95.toLocaleString();

          runBtn.textContent = 'Run Monte Carlo';
        }, 50);
      });
    }
  });
}
