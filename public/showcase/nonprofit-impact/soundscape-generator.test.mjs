import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactSoundscapeGenerator } from './soundscape-generator.js';

describe('NonprofitImpactSoundscapeGenerator', () => {
  it('computes acoustic harmonic frequencies and amplitudes', () => {
    const gen = new NonprofitImpactSoundscapeGenerator();
    const h = gen.getHarmonics(100, 3);
    assert.equal(h.length, 3);
    assert.equal(h[0].frequency, 100);
    assert.equal(h[1].frequency, 200);
    assert.equal(h[2].amplitude, 0.33);
  });

  it('computes sound envelope timings with attack, sustain, release bounds', () => {
    const gen = new NonprofitImpactSoundscapeGenerator();
    const env = gen.computeEnvelope(4, 0.5, 0.5);
    assert.equal(env.totalDuration, 4);
    assert.equal(env.attackDuration, 0.5);
    assert.equal(env.sustainDuration, 3.0);
    assert.equal(env.releaseDuration, 0.5);
  });

  it('retrieves configured ambient soundscape presets', () => {
    const gen = new NonprofitImpactSoundscapeGenerator();
    const preset = gen.getPreset('oceanShore');
    assert.equal(preset.baseFreq, 60);
    assert.equal(preset.gain, 0.8);
  });
});
