/**
 * AI Voice Studio - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Executes iterative Monte Carlo numerical trials to project synthesis latency, buffer underruns, and variance percentiles.
 */

export class AiVoiceStudioSimulationEngine {
  constructor() {
    this.results = [];
    this.sortedResults = [];
    this.lastParams = {
      trials: 0,
      volatility: 0,
      baseMetric: 0
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

  runSimulation(trials = 1000, volatility = 0.12, baseMetric = 120) {
    const validTrials = Math.max(10, Math.floor(Number(trials) || 1000));
    const validVolatility = Math.max(0.01, Number(volatility) || 0.12);
    const validBase = Math.max(1, Number(baseMetric) || 120);

    this.lastParams = {
      trials: validTrials,
      volatility: validVolatility,
      baseMetric: validBase
    };

    this.results = new Float64Array(validTrials);

    for (let i = 0; i < validTrials; i++) {
      const z = AiVoiceStudioSimulationEngine.randomNormal();
      const outcome = validBase * Math.exp((-0.5 * validVolatility * validVolatility) + (validVolatility * z));
      this.results[i] = Number(outcome.toFixed(2));
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
    const getP = (pct) => {
      const idx = Math.min(n - 1, Math.max(0, Math.floor((pct / 100) * n)));
      return this.sortedResults[idx];
    };

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
    if (!this.results || this.results.length === 0) return null;
    const n = this.results.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.results[i];
    const mean = Number((sum / n).toFixed(2));
    const stdDev = this.getStandardDeviation();
    const percentiles = this.calculatePercentiles();

    return {
      count: n,
      mean,
      stdDev,
      min: this.sortedResults[0],
      max: this.sortedResults[n - 1],
      percentiles,
      params: { ...this.lastParams }
    };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AiVoiceStudioSimulationEngine();

    const trialsInput = document.getElementById('trialsInput');
    const volatilityInput = document.getElementById('volatilityInput');
    const baseLatencyInput = document.getElementById('baseLatencyInput');
    const runBtn = document.getElementById('runSimulationBtn');

    const meanVal = document.getElementById('statMean');
    const stdDevVal = document.getElementById('statStdDev');
    const p50Val = document.getElementById('statP50');
    const p95Val = document.getElementById('statP95');
    const p99Val = document.getElementById('statP99');
    const minMaxVal = document.getElementById('statMinMax');

    function executeSimulation() {
      const trials = Number(trialsInput?.value) || 1000;
      const volatility = Number(volatilityInput?.value) || 0.12;
      const baseMetric = Number(baseLatencyInput?.value) || 120;

      engine.runSimulation(trials, volatility, baseMetric);
      const summary = engine.getSummary();

      if (summary) {
        if (meanVal) meanVal.textContent = `${summary.mean} ms`;
        if (stdDevVal) stdDevVal.textContent = `±${summary.stdDev} ms`;
        if (p50Val) p50Val.textContent = `${summary.percentiles.p50} ms`;
        if (p95Val) p95Val.textContent = `${summary.percentiles.p95} ms`;
        if (p99Val) p99Val.textContent = `${summary.percentiles.p99} ms`;
        if (minMaxVal) minMaxVal.textContent = `${summary.min} / ${summary.max} ms`;
      }
    }

    if (runBtn) {
      runBtn.addEventListener('click', executeSimulation);
    }

    executeSimulation();
  });
}
