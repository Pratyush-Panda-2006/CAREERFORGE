import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelSoundscapeSynth } from './ambient-soundscape.js';

describe('CybersecuritySentinelSoundscapeSynth', () => {
  it('initializes with default cybersecurity channels, presets, and master volume', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    assert.equal(synth.masterGain, 0.7);
    assert.equal(synth.isPlaying, false);
    assert.ok(synth.channels.rain);
    assert.ok(synth.channels.wind);
    assert.ok(synth.channels.whiteNoise);
    assert.ok(synth.channels.chimes);
    assert.ok(synth.presets['SOC Incident Response Focus']);
  });

  it('clamps gain values strictly between 0.0 and 1.0', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    assert.equal(synth.clampGain(-0.5), 0);
    assert.equal(synth.clampGain(1.75), 1);
    assert.equal(synth.clampGain(0.456), 0.46);
    assert.equal(synth.clampGain(NaN), 0);
  });

  it('calculates acoustic filter frequency bounds correctly', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    assert.equal(synth.calculateFilterFrequency(800, 200), 1000);
    assert.equal(synth.calculateFilterFrequency(10, -50), 20);
    assert.equal(synth.calculateFilterFrequency(22000, 500), 20000);
  });

  it('generates synthetic noise buffer accurately', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    const buffer = synth.generateNoiseBuffer('white', 0.1, 1000);
    assert.equal(buffer.length, 100);
    assert.ok(buffer.some((v) => v !== 0));

    const pinkBuffer = synth.generateNoiseBuffer('pink', 0.1, 1000);
    assert.equal(pinkBuffer.length, 100);
  });

  it('applies presets and serializes acoustic mixer state', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    synth.applyPreset('Red Team Penetration Flow');
    assert.equal(synth.activePreset, 'Red Team Penetration Flow');
    assert.equal(synth.channels.rain.gain, 0.2);
    assert.equal(synth.channels.chimes.gain, 0.45);

    const serialized = synth.serializeState();
    assert.equal(serialized.activePreset, 'Red Team Penetration Flow');
    assert.equal(serialized.isPlaying, false);
    assert.equal(serialized.channels.chimes.gain, 0.45);
  });

  it('throws on invalid channel manipulation and unknown presets', () => {
    const synth = new CybersecuritySentinelSoundscapeSynth();
    assert.throws(() => {
      synth.adjustChannelGain('nonexistent', 0.5);
    }, /Unknown audio channel/);
    assert.throws(() => {
      synth.applyPreset('Invalid Preset');
    }, /Preset not found/);
  });
});
