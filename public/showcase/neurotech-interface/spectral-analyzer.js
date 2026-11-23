/**
 * NeurotechInterfaceSpectralAnalyzer
 * Autonomous client-side digital signal processing engine for EEG spectral power analysis.
 * Computes Discrete Fourier Transforms (DFT), decomposes frequencies into canonical neuro-bands,
 * and calculates cognitive engagement metrics.
 */

class NeurotechInterfaceSpectralAnalyzer {
  constructor(options = {}) {
    this.sampleRateHz = options.sampleRateHz || 128; // Default 128 Hz clinical EEG standard
    this.bandsConfig = options.bandsConfig || {
      delta: { name: 'Delta', minFreq: 0.5, maxFreq: 4.0, color: '#6366f1', role: 'Deep Sleep / Recovery' },
      theta: { name: 'Theta', minFreq: 4.0, maxFreq: 8.0, color: '#06b6d4', role: 'Meditation / Memory' },
      alpha: { name: 'Alpha', minFreq: 8.0, maxFreq: 13.0, color: '#10b981', role: 'Calm Focus / Alertness' },
      beta:  { name: 'Beta',  minFreq: 13.0, maxFreq: 30.0, color: '#f59e0b', role: 'Active Cognition / Focus' },
      gamma: { name: 'Gamma', minFreq: 30.0, maxFreq: 50.0, color: '#ef4444', role: 'Sensory Binding / Insight' }
    };
  }

  /**
   * Generates synthetic discrete time-series EEG signal
   * @param {number} durationSec - Signal duration in seconds
   * @param {Array<{freq: number, amp: number, phase?: number}>} components - Sine components
   * @param {number} noiseAmp - Gaussian noise amplitude
   * @returns {Float64Array}
   */
  generateSyntheticSignal(durationSec = 1, components = [{ freq: 10, amp: 1.0 }], noiseAmp = 0.05) {
    const N = Math.round(durationSec * this.sampleRateHz);
    const signal = new Float64Array(N);

    for (let n = 0; n < N; n++) {
      const t = n / this.sampleRateHz;
      let val = 0;
      for (const comp of components) {
        const phase = comp.phase || 0;
        val += comp.amp * Math.sin(2 * Math.PI * comp.freq * t + phase);
      }
      if (noiseAmp > 0) {
        val += (Math.random() * 2 - 1) * noiseAmp;
      }
      signal[n] = val;
    }

    return signal;
  }

  /**
   * Computes Discrete Fourier Transform across real-valued time-series signal
   * @param {Array<number>|Float64Array} timeSeries
   * @returns {{
   *   bins: Array<{freq: number, magnitude: number, power: number}>,
   *   nyquistHz: number,
   *   freqResolution: number,
   *   totalEnergyTimeDomain: number,
   *   totalPowerFreqDomain: number,
   *   peakFreq: number,
   *   peakMagnitude: number
   * }}
   */
  computeDFT(timeSeries) {
    if (!timeSeries || timeSeries.length === 0) {
      throw new Error('Invalid signal: timeSeries must be non-empty array');
    }

    const N = timeSeries.length;
    const halfN = Math.floor(N / 2);
    const freqResolution = this.sampleRateHz / N;
    const nyquistHz = this.sampleRateHz / 2;

    const bins = [];
    let totalPower = 0;
    let peakFreq = 0;
    let peakMagnitude = -1;

    // Time domain energy: 1/N * sum(x[n]^2)
    let timeEnergySum = 0;
    for (let n = 0; n < N; n++) {
      timeEnergySum += timeSeries[n] * timeSeries[n];
    }
    const totalEnergyTimeDomain = timeEnergySum / N;

    for (let k = 0; k <= halfN; k++) {
      const freq = k * freqResolution;
      let real = 0;
      let imag = 0;

      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += timeSeries[n] * Math.cos(angle);
        imag -= timeSeries[n] * Math.sin(angle);
      }

      // Scaling factor: 1/N for DC/Nyquist, 2/N for single-sided AC bins
      let scale = (k === 0 || k === halfN) ? (1 / N) : (2 / N);
      const magnitude = Math.sqrt(real * real + imag * imag) * scale;
      const power = magnitude * magnitude;

      bins.push({
        freq: Number(freq.toFixed(2)),
        magnitude: Number(magnitude.toFixed(5)),
        power: Number(power.toFixed(6))
      });

      totalPower += power;

      if (magnitude > peakMagnitude && freq > 0) {
        peakMagnitude = magnitude;
        peakFreq = freq;
      }
    }

    return {
      bins,
      nyquistHz,
      freqResolution: Number(freqResolution.toFixed(3)),
      totalEnergyTimeDomain: Number(totalEnergyTimeDomain.toFixed(5)),
      totalPowerFreqDomain: Number(totalPower.toFixed(5)),
      peakFreq: Number(peakFreq.toFixed(2)),
      peakMagnitude: Number(peakMagnitude.toFixed(4))
    };
  }

  /**
   * Partitions frequency spectrum into canonical neuro-bands
   * @param {Array<{freq: number, magnitude: number, power: number}>} bins
   * @returns {{
   *   bands: Object,
   *   dominantBand: string,
   *   totalBandPower: number
   * }}
   */
  extractBands(bins) {
    if (!bins || !Array.isArray(bins) || bins.length === 0) {
      throw new Error('Invalid spectrum bins provided');
    }

    const bandResults = {};
    let totalBandPower = 0;

    for (const [key, cfg] of Object.entries(this.bandsConfig)) {
      bandResults[key] = {
        name: cfg.name,
        color: cfg.color,
        role: cfg.role,
        minFreq: cfg.minFreq,
        maxFreq: cfg.maxFreq,
        power: 0,
        relativePowerPct: 0,
        peakFreq: 0,
        maxMagnitude: 0
      };
    }

    for (const bin of bins) {
      for (const [key, cfg] of Object.entries(this.bandsConfig)) {
        if (bin.freq >= cfg.minFreq && bin.freq < cfg.maxFreq) {
          bandResults[key].power += bin.power;
          totalBandPower += bin.power;

          if (bin.magnitude > bandResults[key].maxMagnitude) {
            bandResults[key].maxMagnitude = bin.magnitude;
            bandResults[key].peakFreq = bin.freq;
          }
        }
      }
    }

    let dominantBand = 'alpha';
    let maxBandPower = -1;

    for (const key of Object.keys(bandResults)) {
      const p = bandResults[key].power;
      bandResults[key].power = Number(p.toFixed(5));
      const relPct = totalBandPower > 0 ? (p / totalBandPower) * 100 : 0;
      bandResults[key].relativePowerPct = Number(relPct.toFixed(2));

      if (p > maxBandPower) {
        maxBandPower = p;
        dominantBand = key;
      }
    }

    return {
      bands: bandResults,
      dominantBand,
      totalBandPower: Number(totalBandPower.toFixed(5))
    };
  }

  /**
   * Calculates Cognitive Engagement Index: Beta / (Alpha + Theta)
   * @param {Object} bands
   * @returns {{
   *   index: number,
   *   classification: string,
   *   alertnessLevel: string,
   *   description: string
   * }}
   */
  calculateCognitiveEngagement(bands) {
    const alpha = (bands.alpha && bands.alpha.power) || 0;
    const theta = (bands.theta && bands.theta.power) || 0;
    const beta  = (bands.beta && bands.beta.power) || 0;

    const denom = alpha + theta;
    const ratio = denom > 0.000001 ? beta / denom : 0;
    const index = Number(ratio.toFixed(3));

    let classification = 'Calm Focus';
    let alertnessLevel = 'Moderate';
    let description = 'Balanced mental state suitable for analytical focus and active working memory.';

    if (index < 0.25) {
      classification = 'Deep Relaxation';
      alertnessLevel = 'Low';
      description = 'Pronounced slow-wave sync. High theta/alpha activity associated with deep rest or early drowsiness.';
    } else if (index < 0.65) {
      classification = 'Calm Alertness';
      alertnessLevel = 'Optimal';
      description = 'Synchronized alpha rhythm dominant. Clear, stress-free mindfulness and steady absorption.';
    } else if (index < 1.30) {
      classification = 'High Cognitive Engagement';
      alertnessLevel = 'High';
      description = 'Beta rhythm dominance indicating active task execution, complex calculations, and intense attention.';
    } else {
      classification = 'Hyper-Arousal / Cognitive Load';
      alertnessLevel = 'Extreme';
      description = 'Elevated high-frequency beta activity corresponding to cognitive fatigue, high stress, or hyper-vigilance.';
    }

    return {
      index,
      classification,
      alertnessLevel,
      description
    };
  }

  /**
   * Complete end-to-end analysis of time-series signal
   */
  analyze(timeSeries) {
    const dft = this.computeDFT(timeSeries);
    const bandData = this.extractBands(dft.bins);
    const engagement = this.calculateCognitiveEngagement(bandData.bands);

    return {
      dft,
      bandData,
      engagement
    };
  }

  /**
   * DOM UI Controller
   */
  initUI(containerId = 'spectral-analyzer-container') {
    const root = document.getElementById(containerId);
    if (!root) return;

    const presets = {
      alpha: {
        title: 'Calm Meditation (Alpha Peak - 10 Hz)',
        components: [{ freq: 10, amp: 1.6 }, { freq: 6, amp: 0.3 }],
        noise: 0.04
      },
      beta: {
        title: 'Intense Problem Solving (Beta Surge - 22 Hz)',
        components: [{ freq: 22, amp: 1.5 }, { freq: 10, amp: 0.3 }],
        noise: 0.05
      },
      delta: {
        title: 'Deep Restorative Sleep (Delta Slow-wave - 2 Hz)',
        components: [{ freq: 2, amp: 2.0 }, { freq: 10, amp: 0.1 }],
        noise: 0.03
      },
      gamma: {
        title: 'Sensory Binding / Epiphany (Gamma Burst - 40 Hz)',
        components: [{ freq: 40, amp: 1.4 }, { freq: 18, amp: 0.4 }],
        noise: 0.06
      },
      mixed: {
        title: 'Multi-Channel Composite EEG (Mixed Waves)',
        components: [{ freq: 3, amp: 0.6 }, { freq: 7, amp: 0.8 }, { freq: 10, amp: 1.2 }, { freq: 20, amp: 0.9 }],
        noise: 0.08
      }
    };

    let activePreset = 'alpha';

    const render = () => {
      const cfg = presets[activePreset];
      const signal = this.generateSyntheticSignal(1.0, cfg.components, cfg.noise);
      const res = this.analyze(signal);

      // Update Waveform Canvas
      const waveCanvas = document.getElementById('wave-canvas');
      if (waveCanvas && waveCanvas.getContext) {
        const ctx = waveCanvas.getContext('2d');
        const W = waveCanvas.width;
        const H = waveCanvas.height;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = W / signal.length;
        for (let i = 0; i < signal.length; i++) {
          const y = (H / 2) - (signal[i] * (H / 4));
          const x = i * step;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Update PSD Spectrum Canvas
      const psdCanvas = document.getElementById('psd-canvas');
      if (psdCanvas && psdCanvas.getContext) {
        const ctx = psdCanvas.getContext('2d');
        const W = psdCanvas.width;
        const H = psdCanvas.height;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);

        const bins = res.dft.bins.filter(b => b.freq <= 50);
        const barWidth = (W / bins.length) - 1;

        let maxPower = 0.0001;
        for (const b of bins) {
          if (b.power > maxPower) maxPower = b.power;
        }

        bins.forEach((b, idx) => {
          const barHeight = Math.min(H - 10, (b.power / maxPower) * (H - 20));
          const x = idx * (barWidth + 1);
          const y = H - barHeight;

          // Color by band
          let fill = '#64748b';
          if (b.freq < 4) fill = '#6366f1';
          else if (b.freq < 8) fill = '#06b6d4';
          else if (b.freq < 13) fill = '#10b981';
          else if (b.freq < 30) fill = '#f59e0b';
          else fill = '#ef4444';

          ctx.fillStyle = fill;
          ctx.fillRect(x, y, barWidth, barHeight);
        });
      }

      // Update UI Stats
      const domPeak = document.getElementById('metric-peak-freq');
      if (domPeak) domPeak.textContent = `${res.dft.peakFreq} Hz`;

      const domDominant = document.getElementById('metric-dominant-band');
      if (domDominant) {
        const b = res.bandData.bands[res.bandData.dominantBand];
        domDominant.textContent = `${b.name} (${b.relativePowerPct}%)`;
        domDominant.style.color = b.color;
      }

      const domEngagement = document.getElementById('metric-engagement-index');
      if (domEngagement) domEngagement.textContent = res.engagement.index.toFixed(3);

      const domStateBadge = document.getElementById('metric-state-badge');
      if (domStateBadge) {
        domStateBadge.textContent = res.engagement.classification;
      }

      const domDesc = document.getElementById('metric-engagement-desc');
      if (domDesc) domDesc.textContent = res.engagement.description;

      // Update Band Progress Bars
      const bands = res.bandData.bands;
      for (const [key, b] of Object.entries(bands)) {
        const barEl = document.getElementById(`band-bar-${key}`);
        const valEl = document.getElementById(`band-val-${key}`);
        if (barEl) barEl.style.width = `${b.relativePowerPct}%`;
        if (valEl) valEl.textContent = `${b.relativePowerPct}% (${b.power.toFixed(4)} μV²)`;
      }
    };

    const presetSelect = document.getElementById('preset-selector');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        activePreset = e.target.value;
        render();
      });
    }

    const recomputeBtn = document.getElementById('recompute-btn');
    if (recomputeBtn) {
      recomputeBtn.addEventListener('click', () => {
        render();
      });
    }

    render();
  }
}

// Support dual export: ES Module and Browser Global
if (typeof window !== 'undefined') {
  window.NeurotechInterfaceSpectralAnalyzer = NeurotechInterfaceSpectralAnalyzer;
  window.addEventListener('DOMContentLoaded', () => {
    const autoInit = document.getElementById('spectral-analyzer-container');
    if (autoInit) {
      const analyzer = new NeurotechInterfaceSpectralAnalyzer();
      analyzer.initUI();
    }
  });
}

export { NeurotechInterfaceSpectralAnalyzer };
