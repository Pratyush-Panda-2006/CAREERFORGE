import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadSoundscapeSynth } from './ambient-soundscape.js';

describe('SaasLaunchpadSoundscapeSynth', () => {
  it('initializes with default audio channels, presets, and master volume', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    assert.equal(synth.masterGain, 0.7);
    assert.equal(synth.isPlaying, false);
    assert.ok(synth.channels.rain);
    assert.ok(synth.channels.wind);
    assert.ok(synth.channels.whiteNoise);
    assert.ok(synth.channels.chimes);
    assert.ok(synth.presets["Cloud Architect Zen"]);
  });

  it('clamps gain values strictly between 0.0 and 1.0', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    assert.equal(synth.clampGain(-0.5), 0);
    assert.equal(synth.clampGain(1.75), 1);
    assert.equal(synth.clampGain(0.456), 0.46);
    assert.equal(synth.clampGain(NaN), 0);
  });

  it('calculates acoustic filter frequency bounds correctly', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    assert.equal(synth.calculateFilterFrequency(800, 200), 1000);
    assert.equal(synth.calculateFilterFrequency(10, -50), 20);
    assert.equal(synth.calculateFilterFrequency(22000, 500), 20000);
  });

  it('generates synthetic noise buffer accurately', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    const buffer = synth.generateNoiseBuffer('white', 0.1, 1000);
    assert.equal(buffer.length, 100);
    assert.ok(buffer.some((v) => v !== 0));

    const pinkBuffer = synth.generateNoiseBuffer('pink', 0.1, 1000);
    assert.equal(pinkBuffer.length, 100);
  });

  it('applies presets and serializes acoustic mixer state', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    const testPreset = "Deployment Pipeline Harmony";
    synth.applyPreset(testPreset);
    assert.equal(synth.activePreset, testPreset);
    assert.equal(synth.channels.rain.gain, 0.2);
    assert.equal(synth.channels.wind.gain, 0.55);

    const serialized = synth.serializeState();
    assert.equal(serialized.activePreset, testPreset);
    assert.equal(serialized.isPlaying, false);
    assert.equal(serialized.channels.chimes.gain, 0.25);
  });

  it('handles startAmbience and stopAmbience state transitions', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    const testPreset = "Executive Strategy Lounge";
    synth.startAmbience(testPreset);
    assert.equal(synth.isPlaying, true);
    assert.equal(synth.activePreset, testPreset);
    synth.stopAmbience();
    assert.equal(synth.isPlaying, false);
  });

  it('throws on invalid channel manipulation and unknown presets', () => {
    const synth = new SaasLaunchpadSoundscapeSynth();
    assert.throws(() => {
      synth.adjustChannelGain('nonexistent', 0.5);
    }, /Unknown audio channel/);
    assert.throws(() => {
      synth.applyPreset('Invalid Preset');
    }, /Preset not found/);
  });
});
