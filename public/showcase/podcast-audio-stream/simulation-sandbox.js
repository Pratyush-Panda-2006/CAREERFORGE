/**
 * Podcast Audio Stream - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Issue #926 - NSoC '26 Level 3 Feature
 */

export class PodcastAudioStreamMonteCarloEngine {
  constructor() {
    this.results = [];
    this.sortedResults = [];
    this.lastParams = {
      trials: 0,
      volatility: 0,
      baseListeners: 0
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

  runSimulation(trials = 1000, volatility = 0.15, baseListeners = 15000) {
    const validTrials = Math.max(10, Math.floor(Number(trials) || 1000));
    const validVolatility = Math.max(0.01, Number(volatility) || 0.15);
    const validBase = Math.max(1, Number(baseListeners) || 15000);

    this.lastParams = {
      trials: validTrials,
      volatility: validVolatility,
      baseListeners: validBase
    };

    this.results = new Float64Array(validTrials);

    for (let i = 0; i < validTrials; i++) {
      const z = PodcastAudioStreamMonteCarloEngine.randomNormal();
      // Geometric Brownian step outcome for stream audience listener forecast
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
    const getP = (p) => {
      const idx = Math.min(this.sortedResults.length - 1, Math.floor((p / 100) * this.sortedResults.length));
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
    if (!this.results || this.results.length === 0) {
      return { count: 0, mean: 0, min: 0, max: 0, stdDev: 0, percentiles: this.calculatePercentiles() };
    }
    const n = this.results.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.results[i];
    const mean = Math.round(sum / n);

    return {
      count: n,
      mean,
      min: this.sortedResults[0],
      max: this.sortedResults[n - 1],
      stdDev: this.getStandardDeviation(),
      percentiles: this.calculatePercentiles()
    };
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.PodcastAudioStreamMonteCarloEngine = PodcastAudioStreamMonteCarloEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new PodcastAudioStreamMonteCarloEngine();
    const btnRun = document.getElementById('btnRunSimulation');
    const trialsInput = document.getElementById('trialsRange');
    const volInput = document.getElementById('volatilityRange');
    const trialsVal = document.getElementById('trialsValue');
    const volVal = document.getElementById('volatilityValue');

    const meanEl = document.getElementById('metricMean');
    const stdDevEl = document.getElementById('metricStdDev');
    const p10El = document.getElementById('metricP10');
    const p50El = document.getElementById('metricP50');
    const p90El = document.getElementById('metricP90');

    function updateLabels() {
      if (trialsVal && trialsInput) trialsVal.textContent = trialsInput.value;
      if (volVal && volInput) volVal.textContent = `${Math.round(volInput.value * 100)}%`;
    }

    trialsInput?.addEventListener('input', updateLabels);
    volInput?.addEventListener('input', updateLabels);

    function executeSimulation() {
      const trials = parseInt(trialsInput?.value || '1000', 10);
      const vol = parseFloat(volInput?.value || '0.15');
      engine.runSimulation(trials, vol, 15000);
      const summary = engine.getSummary();

      if (meanEl) meanEl.textContent = summary.mean.toLocaleString();
      if (stdDevEl) stdDevEl.textContent = `±${summary.stdDev.toLocaleString()}`;
      if (p10El) p10El.textContent = summary.percentiles.p10.toLocaleString();
      if (p50El) p50El.textContent = summary.percentiles.p50.toLocaleString();
      if (p90El) p90El.textContent = summary.percentiles.p90.toLocaleString();
    }

    btnRun?.addEventListener('click', executeSimulation);
    updateLabels();
    executeSimulation();
  });
}
