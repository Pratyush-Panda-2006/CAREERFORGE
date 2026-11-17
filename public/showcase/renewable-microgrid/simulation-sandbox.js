/**
 * Renewable Microgrid - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Issue #978 - NSoC '26 Level 3 Feature
 */

export class RenewableMicrogridMonteCarloEngine {
  constructor(options = {}) {
    this.baseLoad = options.baseLoad !== undefined ? options.baseLoad : 100; // kW
    this.solarCapacity = options.solarCapacity !== undefined ? options.solarCapacity : 120; // kW
    this.windCapacity = options.windCapacity !== undefined ? options.windCapacity : 80; // kW
    this.results = [];
    this.stats = null;
  }

  // Box-Muller normal distribution random generator
  _generateGaussian() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  runSimulation(trials = 1000, volatility = 0.2) {
    const trialCount = Math.max(10, Math.floor(trials));
    const vol = Math.max(0.01, volatility);
    const outcomes = new Float64Array(trialCount);

    const baseProduction = this.solarCapacity * 0.5 + this.windCapacity * 0.45;
    const baseNet = baseProduction - this.baseLoad;

    for (let i = 0; i < trialCount; i++) {
      const g = this._generateGaussian();
      // Apply volatility to net output
      const simulatedNet = baseNet + (Math.abs(baseNet) + 50) * g * vol;
      outcomes[i] = Math.round(simulatedNet * 100) / 100;
    }

    // Sort ascending for accurate percentile and order stats
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

  getConfidenceInterval(level = 0.95) {
    const alpha = (1 - level) / 2;
    const lowerP = Math.round(alpha * 100);
    const upperP = Math.round((1 - alpha) * 100);
    const p = this.calculatePercentiles([lowerP, upperP]);
    return {
      level,
      lower: p[lowerP],
      upper: p[upperP]
    };
  }
}
