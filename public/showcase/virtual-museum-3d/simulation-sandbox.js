/**
 * Virtual Museum 3D - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Executes iterative Monte Carlo numerical trials to project scenario dispersion, variance, and confidence bounds.
 */

export class VirtualMuseum3dMonteCarloEngine {
  constructor() {
    this.results = [];
    this.sortedResults = [];
    this.lastParams = {
      trials: 0,
      volatility: 0,
      baseVal: 0
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

  runSimulation(trials = 1000, volatility = 0.14, baseVal = 320) {
    const validTrials = Math.max(10, Math.floor(Number(trials) || 1000));
    const validVolatility = Math.max(0.01, Number(volatility) || 0.14);
    const validBase = Math.max(1, Number(baseVal) || 320);

    this.lastParams = {
      trials: validTrials,
      volatility: validVolatility,
      baseVal: validBase
    };

    this.results = new Float64Array(validTrials);

    for (let i = 0; i < validTrials; i++) {
      const z = VirtualMuseum3dMonteCarloEngine.randomNormal();
      // Geometric Brownian step outcome for outcome dispersion
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
      percentiles
    };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new VirtualMuseum3dMonteCarloEngine();

    const trialSlider = document.getElementById('trialSlider');
    const trialVal = document.getElementById('trialVal');
    const volatilitySlider = document.getElementById('volatilitySlider');
    const volatilityVal = document.getElementById('volatilityVal');
    const baseSlider = document.getElementById('baseSlider');
    const baseVal = document.getElementById('baseVal');
    const runBtn = document.getElementById('runSimBtn');

    const meanMetric = document.getElementById('meanMetric');
    const stdDevMetric = document.getElementById('stdDevMetric');
    const p50Metric = document.getElementById('p50Metric');
    const p95Metric = document.getElementById('p95Metric');
    const p99Metric = document.getElementById('p99Metric');
    const barContainer = document.getElementById('distributionBarContainer');

    function updateSliderLabels() {
      if (trialVal && trialSlider) trialVal.textContent = trialSlider.value;
      if (volatilityVal && volatilitySlider) volatilityVal.textContent = volatilitySlider.value;
      if (baseVal && baseSlider) baseVal.textContent = baseSlider.value;
    }

    function renderSimulation() {
      const trials = Number(trialSlider?.value || 1000);
      const vol = Number(volatilitySlider?.value || 0.14);
      const base = Number(baseSlider?.value || 320);

      engine.runSimulation(trials, vol, base);
      const summary = engine.getSummary();
      if (!summary) return;

      if (meanMetric) meanMetric.textContent = String(summary.mean);
      if (stdDevMetric) stdDevMetric.textContent = String(summary.stdDev);
      if (p50Metric) p50Metric.textContent = String(summary.percentiles.p50);
      if (p95Metric) p95Metric.textContent = String(summary.percentiles.p95);
      if (p99Metric) p99Metric.textContent = String(summary.percentiles.p99);

      if (barContainer) {
        barContainer.replaceChildren();
        const buckets = 30;
        const counts = new Array(buckets).fill(0);
        const min = summary.min;
        const max = summary.max;
        const range = Math.max(1, max - min);

        for (let i = 0; i < engine.results.length; i++) {
          const b = Math.min(buckets - 1, Math.floor(((engine.results[i] - min) / range) * buckets));
          counts[b]++;
        }

        const maxCount = Math.max(...counts, 1);
        counts.forEach(count => {
          const col = document.createElement('div');
          col.className = 'dist-bar-col';
          const heightPct = Math.max(3, (count / maxCount) * 100);
          col.style.height = `${heightPct}%`;
          col.title = `Count: ${count}`;
          barContainer.appendChild(col);
        });
      }
    }

    trialSlider?.addEventListener('input', updateSliderLabels);
    volatilitySlider?.addEventListener('input', updateSliderLabels);
    baseSlider?.addEventListener('input', updateSliderLabels);
    runBtn?.addEventListener('click', renderSimulation);

    updateSliderLabels();
    renderSimulation();
  });
}
