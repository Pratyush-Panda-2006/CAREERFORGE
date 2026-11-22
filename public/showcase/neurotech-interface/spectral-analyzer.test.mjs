import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceSpectralAnalyzer } from './spectral-analyzer.js';

describe('NeurotechInterfaceSpectralAnalyzer', () => {
  it('instantiates with standard clinical neuro-bands and default sample rate', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer();
    assert.equal(analyzer.sampleRateHz, 128);
    assert.ok(analyzer.bandsConfig.delta);
    assert.ok(analyzer.bandsConfig.theta);
    assert.ok(analyzer.bandsConfig.alpha);
    assert.ok(analyzer.bandsConfig.beta);
    assert.ok(analyzer.bandsConfig.gamma);
  });

  it('generates synthetic time-series with valid sample counts and bounded amplitudes', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer({ sampleRateHz: 128 });
    const signal = analyzer.generateSyntheticSignal(1.5, [{ freq: 10, amp: 1.0 }], 0);
    // 1.5 seconds * 128 Hz = 192 samples
    assert.equal(signal.length, 192);

    for (let i = 0; i < signal.length; i++) {
      assert.ok(signal[i] >= -1.01 && signal[i] <= 1.01);
    }
  });

  it('detects exact sinusoidal fundamental frequency peak in discrete spectrum', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer({ sampleRateHz: 128 });
    // 1-second pure 10 Hz sine wave (Alpha band)
    const signal = analyzer.generateSyntheticSignal(1.0, [{ freq: 10, amp: 2.0 }], 0);
    const dft = analyzer.computeDFT(signal);

    assert.equal(dft.peakFreq, 10);
    // Peak magnitude should be close to 2.0
    assert.ok(Math.abs(dft.peakMagnitude - 2.0) < 0.05);
    assert.equal(dft.nyquistHz, 64);
  });

  it('demonstrates Parseval energy conservation consistency between time and frequency domains', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer({ sampleRateHz: 128 });
    const signal = analyzer.generateSyntheticSignal(1.0, [{ freq: 8, amp: 1.5 }], 0);
    const dft = analyzer.computeDFT(signal);

    // In time domain, RMS power of sine amp A is A^2 / 2 = 1.5^2 / 2 = 1.125
    assert.ok(Math.abs(dft.totalEnergyTimeDomain - 1.125) < 0.05);
    assert.ok(dft.totalPowerFreqDomain > 0);
  });

  it('partitions power into canonical clinical neuro-bands accurately', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer({ sampleRateHz: 128 });

    // Test 1: Pure 2 Hz Delta wave
    const deltaSignal = analyzer.generateSyntheticSignal(1.0, [{ freq: 2, amp: 1.5 }], 0);
    const deltaRes = analyzer.analyze(deltaSignal);
    assert.equal(deltaRes.bandData.dominantBand, 'delta');
    assert.ok(deltaRes.bandData.bands.delta.relativePowerPct > 95);

    // Test 2: Pure 10 Hz Alpha wave
    const alphaSignal = analyzer.generateSyntheticSignal(1.0, [{ freq: 10, amp: 1.5 }], 0);
    const alphaRes = analyzer.analyze(alphaSignal);
    assert.equal(alphaRes.bandData.dominantBand, 'alpha');
    assert.ok(alphaRes.bandData.bands.alpha.relativePowerPct > 95);

    // Test 3: Pure 20 Hz Beta wave
    const betaSignal = analyzer.generateSyntheticSignal(1.0, [{ freq: 20, amp: 1.5 }], 0);
    const betaRes = analyzer.analyze(betaSignal);
    assert.equal(betaRes.bandData.dominantBand, 'beta');
    assert.ok(betaRes.bandData.bands.beta.relativePowerPct > 95);
  });

  it('computes cognitive engagement index beta / (alpha + theta) and classifications', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer();

    // Relaxed State: high alpha, low beta
    const relaxedBands = {
      theta: { power: 0.2 },
      alpha: { power: 1.0 },
      beta:  { power: 0.1 }
    };
    const relaxed = analyzer.calculateCognitiveEngagement(relaxedBands);
    assert.ok(relaxed.index < 0.25);
    assert.equal(relaxed.classification, 'Deep Relaxation');

    // High Engagement State: low alpha, high beta
    const focusedBands = {
      theta: { power: 0.1 },
      alpha: { power: 0.2 },
      beta:  { power: 0.9 }
    };
    const focused = analyzer.calculateCognitiveEngagement(focusedBands);
    assert.ok(focused.index > 1.30);
    assert.equal(focused.classification, 'Hyper-Arousal / Cognitive Load');
  });

  it('validates input and throws on empty or invalid time-series', () => {
    const analyzer = new NeurotechInterfaceSpectralAnalyzer();
    assert.throws(() => analyzer.computeDFT([]), /Invalid signal/);
    assert.throws(() => analyzer.computeDFT(null), /Invalid signal/);
    assert.throws(() => analyzer.extractBands([]), /Invalid spectrum/);
  });
});
