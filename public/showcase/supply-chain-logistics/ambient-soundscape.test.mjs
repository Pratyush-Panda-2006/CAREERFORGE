import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsSoundscapeSynth } from './ambient-soundscape.js';

describe('SupplyChainLogisticsSoundscapeSynth', () => {
  it('initializes with default channels, presets, and master volume', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    assert.equal(synth.masterGain, 0.7);
    assert.equal(synth.isPlaying, false);
    assert.ok(synth.channels.rain);
    assert.ok(synth.channels.wind);
    assert.ok(synth.channels.whiteNoise);
    assert.ok(synth.channels.chimes);
    assert.ok(synth.presets['Cargo Vessel Ocean Swell']);
  });

  it('clamps gain values strictly between 0.0 and 1.0', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    assert.equal(synth.clampGain(-0.5), 0);
    assert.equal(synth.clampGain(1.75), 1);
    assert.equal(synth.clampGain(0.456), 0.46);
    assert.equal(synth.clampGain(NaN), 0);
  });

  it('calculates acoustic filter frequency bounds correctly', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    // Normal addition
    assert.equal(synth.calculateFilterFrequency(800, 200), 1000);
    // Lower frequency clamp (20Hz limit)
    assert.equal(synth.calculateFilterFrequency(10, -50), 20);
    // Upper frequency clamp (20000Hz limit)
    assert.equal(synth.calculateFilterFrequency(22000, 500), 20000);
  });

  it('generates synthetic noise buffer accurately', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    const buffer = synth.generateNoiseBuffer('white', 0.1, 1000);
    assert.equal(buffer.length, 100);
    assert.ok(buffer.some((v) => v !== 0));

    const pinkBuffer = synth.generateNoiseBuffer('pink', 0.1, 1000);
    assert.equal(pinkBuffer.length, 100);
  });

  it('applies presets and serializes acoustic mixer state', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    synth.applyPreset('Warehouse Ambient Floor');
    assert.equal(synth.activePreset, 'Warehouse Ambient Floor');
    assert.equal(synth.channels.rain.gain, 0.05);
    assert.equal(synth.channels.whiteNoise.gain, 0.6);

    const serialized = synth.serializeState();
    assert.equal(serialized.activePreset, 'Warehouse Ambient Floor');
    assert.equal(serialized.isPlaying, false);
    assert.equal(serialized.channels.whiteNoise.gain, 0.6);
  });

  it('throws on invalid channel manipulation', () => {
    const synth = new SupplyChainLogisticsSoundscapeSynth();
    assert.throws(() => {
      synth.adjustChannelGain('nonexistent', 0.5);
    }, /Unknown audio channel/);
  });
});
