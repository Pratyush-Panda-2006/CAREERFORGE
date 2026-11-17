/**
 * Biotech Genomics - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Issue #962 - NSoC '26 Level 3 Feature
 */

export class BiotechGenomicsMonteCarloEngine {
  constructor(options = {}) {
    this.sampleSize = options.sampleSize !== undefined ? options.sampleSize : 500;
    this.baselineEfficacy = options.baselineEfficacy !== undefined ? options.baselineEfficacy : 78.5; // percentage
    this.mutationRate = options.mutationRate !== undefined ? options.mutationRate : 0.02;
    this.toxicityThreshold = options.toxicityThreshold !== undefined ? options.toxicityThreshold : 15.0; // percentage
    this.results = [];
    this.stats = null;
  }

  // Box-Muller Gaussian random generator
  _generateGaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * Run Monte Carlo simulation across N clinical or genomic trials
   * @param {number} trials - Total iterations
   * @param {number} volatility - Biological variance factor
   */
  runSimulation(trials = 1000, volatility = 0.05) {
    const trialCount = Math.max(10, Math.floor(trials));
    const vol = Math.max(0.001, volatility);
    const outcomes = new Float64Array(trialCount);

    const baseYield = this.baselineEfficacy * (1 - this.mutationRate);

    for (let i = 0; i < trialCount; i++) {
      const g = this._generateGaussian();
      // Apply biological stochastic variation
      const simulatedEfficacy = baseYield + (g * vol * 100);
      // Bounded between 0% and 100%
      const bounded = Math.max(0, Math.min(100, simulatedEfficacy));
      outcomes[i] = Math.round(bounded * 100) / 100;
    }

    outcomes.sort();
    this.results = Array.from(outcomes);
    this.stats = this._computeStatistics();
    return this.results;
  }

  _computeStatistics() {
    if (!this.results || this.results.length === 0) return null;

    const n = this.results.length;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += this.results[i];
    const mean = sum / n;

    let varSum = 0;
    for (let i = 0; i < n; i++) {
      const diff = this.results[i] - mean;
      varSum += diff * diff;
    }
    const standardDeviation = Math.sqrt(varSum / n);

    return {
      count: n,
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      min: this.results[0],
      max: this.results[n - 1]
    };
  }

  getStandardDeviation() {
    if (!this.stats) this.stats = this._computeStatistics();
    return this.stats ? this.stats.standardDeviation : 0;
  }

  getMean() {
    if (!this.stats) this.stats = this._computeStatistics();
    return this.stats ? this.stats.mean : 0;
  }

  calculatePercentiles(percentiles = [5, 25, 50, 75, 95]) {
    if (!this.results || this.results.length === 0) {
      this.runSimulation();
    }

    const n = this.results.length;
    const out = {};

    percentiles.forEach(p => {
      const rank = (p / 100) * (n - 1);
      const low = Math.floor(rank);
      const high = Math.ceil(rank);
      const weight = rank - low;

      const val = low === high
        ? this.results[low]
        : this.results[low] * (1 - weight) + this.results[high] * weight;

      out[p] = Math.round(val * 100) / 100;
    });

    return out;
  }

  runCohortComparison() {
    const wildtypeEngine = new BiotechGenomicsMonteCarloEngine({
      baselineEfficacy: this.baselineEfficacy,
      mutationRate: this.mutationRate
    });
    wildtypeEngine.runSimulation(500, 0.04);

    const editedEngine = new BiotechGenomicsMonteCarloEngine({
      baselineEfficacy: Math.min(99.5, this.baselineEfficacy * 1.15),
      mutationRate: this.mutationRate * 0.3
    });
    editedEngine.runSimulation(500, 0.025);

    const offTargetEngine = new BiotechGenomicsMonteCarloEngine({
      baselineEfficacy: this.baselineEfficacy * 0.85,
      mutationRate: this.mutationRate * 2.5
    });
    offTargetEngine.runSimulation(500, 0.08);

    return {
      wildtype: { mean: wildtypeEngine.getMean(), stdDev: wildtypeEngine.getStandardDeviation() },
      crisprEdited: { mean: editedEngine.getMean(), stdDev: editedEngine.getStandardDeviation() },
      offTargetStress: { mean: offTargetEngine.getMean(), stdDev: offTargetEngine.getStandardDeviation() }
    };
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.BiotechGenomicsMonteCarloEngine = BiotechGenomicsMonteCarloEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-sim-btn');
    if (!runBtn) return;

    const trialsInput = document.getElementById('sim-trials');
    const volInput = document.getElementById('sim-volatility');
    const efficacyInput = document.getElementById('sim-efficacy');
    const mutationInput = document.getElementById('sim-mutation');

    const meanEl = document.getElementById('stat-mean');
    const stdDevEl = document.getElementById('stat-stddev');
    const minEl = document.getElementById('stat-min');
    const maxEl = document.getElementById('stat-max');
    const p50El = document.getElementById('stat-p50');
    const p95El = document.getElementById('stat-p95');

    const execute = () => {
      const trials = parseInt(trialsInput ? trialsInput.value : '1000', 10);
      const volatility = parseFloat(volInput ? volInput.value : '0.05');
      const baselineEfficacy = parseFloat(efficacyInput ? efficacyInput.value : '78.5');
      const mutationRate = parseFloat(mutationInput ? mutationInput.value : '0.02');

      const engine = new BiotechGenomicsMonteCarloEngine({ baselineEfficacy, mutationRate });
      engine.runSimulation(trials, volatility);

      const percentiles = engine.calculatePercentiles([50, 95]);

      if (meanEl) meanEl.textContent = `${engine.getMean()}%`;
      if (stdDevEl) stdDevEl.textContent = `±${engine.getStandardDeviation()}%`;
      if (minEl) minEl.textContent = `${engine.stats.min}%`;
      if (maxEl) maxEl.textContent = `${engine.stats.max}%`;
      if (p50El) p50El.textContent = `${percentiles[50]}%`;
      if (p95El) p95El.textContent = `${percentiles[95]}%`;
    };

    runBtn.addEventListener('click', execute);
    execute();
  });
}
