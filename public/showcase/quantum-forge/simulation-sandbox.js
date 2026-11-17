/**
 * Quantum Forge - Monte Carlo Multi-Scenario Simulator & Risk Variance Forecaster
 * Issue #958 - NSoC '26 Level 3 Feature
 */

export class QuantumForgeMonteCarloEngine {
  constructor(options = {}) {
    this.qubits = options.qubits !== undefined ? options.qubits : 16;
    this.gateFidelity = options.gateFidelity !== undefined ? options.gateFidelity : 0.998;
    this.decoherenceTime = options.decoherenceTime !== undefined ? options.decoherenceTime : 150; // microseconds
    this.circuitDepth = options.circuitDepth !== undefined ? options.circuitDepth : 64;
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
   * Run Monte Carlo simulation across N trials
   * @param {number} trials - Total iterations
   * @param {number} volatility - Environmental noise / quantum fluctuation factor
   */
  runSimulation(trials = 1000, volatility = 0.04) {
    const trialCount = Math.max(10, Math.floor(trials));
    const vol = Math.max(0.001, volatility);
    const outcomes = new Float64Array(trialCount);

    // Theoretical baseline circuit fidelity based on gate depth and decoherence factor
    const baseFidelity = Math.pow(this.gateFidelity, this.circuitDepth) * 100;

    for (let i = 0; i < trialCount; i++) {
      const g = this._generateGaussian();
      // Apply noise variance and decoherence jitter
      const simulatedFidelity = baseFidelity + (g * vol * 100);
      // Bound between 0% and 100%
      const bounded = Math.max(0, Math.min(100, simulatedFidelity));
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

  runScenarioComparison() {
    const baseEngine = new QuantumForgeMonteCarloEngine({
      qubits: this.qubits,
      gateFidelity: this.gateFidelity,
      circuitDepth: this.circuitDepth
    });
    const baseSim = baseEngine.runSimulation(500, 0.04);

    const noisyEngine = new QuantumForgeMonteCarloEngine({
      qubits: this.qubits,
      gateFidelity: this.gateFidelity * 0.98,
      circuitDepth: this.circuitDepth * 1.5
    });
    const noisySim = noisyEngine.runSimulation(500, 0.08);

    const shieldedEngine = new QuantumForgeMonteCarloEngine({
      qubits: this.qubits,
      gateFidelity: Math.min(0.9999, this.gateFidelity * 1.01),
      circuitDepth: this.circuitDepth
    });
    const shieldedSim = shieldedEngine.runSimulation(500, 0.015);

    return {
      baseline: { mean: baseEngine.getMean(), stdDev: baseEngine.getStandardDeviation() },
      noisy: { mean: noisyEngine.getMean(), stdDev: noisyEngine.getStandardDeviation() },
      shielded: { mean: shieldedEngine.getMean(), stdDev: shieldedEngine.getStandardDeviation() }
    };
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.QuantumForgeMonteCarloEngine = QuantumForgeMonteCarloEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const runBtn = document.getElementById('run-sim-btn');
    if (!runBtn) return;

    const trialsInput = document.getElementById('sim-trials');
    const volatilityInput = document.getElementById('sim-volatility');
    const qubitsInput = document.getElementById('sim-qubits');
    const depthInput = document.getElementById('sim-depth');

    const meanEl = document.getElementById('stat-mean');
    const stdDevEl = document.getElementById('stat-stddev');
    const minEl = document.getElementById('stat-min');
    const maxEl = document.getElementById('stat-max');
    const p50El = document.getElementById('stat-p50');
    const p95El = document.getElementById('stat-p95');

    const execute = () => {
      const trials = parseInt(trialsInput ? trialsInput.value : '1000', 10);
      const volatility = parseFloat(volatilityInput ? volatilityInput.value : '0.04');
      const qubits = parseInt(qubitsInput ? qubitsInput.value : '16', 10);
      const circuitDepth = parseInt(depthInput ? depthInput.value : '64', 10);

      const engine = new QuantumForgeMonteCarloEngine({ qubits, circuitDepth });
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
