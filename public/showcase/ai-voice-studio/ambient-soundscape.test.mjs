import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioSoundscapeSynth } from './ambient-soundscape.js';

describe('AiVoiceStudioSoundscapeSynth', () => {
  let synth;

  beforeEach(() => {
    synth = new AiVoiceStudioSoundscapeSynth();
  });

  it('instantiates correctly with proper name, channels, and presets', () => {
    assert.equal(synth.name, 'AiVoiceStudioSoundscapeSynth');
    assert.equal(synth.isPlaying, false);
    assert.equal(synth.masterGain, 0.75);
    assert.ok(synth.channels.rain);
    assert.ok(synth.channels.wind);
    assert.ok(synth.channels.whiteNoise);
    assert.ok(synth.channels.chimes);
    assert.ok(synth.presets['Studio Vocal Isolation']);
  });

  it('clamps gain values strictly between 0.0 and 1.0', () => {
    assert.equal(synth.clampGain(-0.5), 0);
    assert.equal(synth.clampGain(1.5), 1);
    assert.equal(synth.clampGain(0.4234), 0.42);
    assert.equal(synth.clampGain('invalid'), 0);
  });

  it('calculates frequency filter math with proper audible range bounding', () => {
    // Standard cutoff + modulation
    assert.equal(synth.calculateFilterFrequency(1000, 200), 1200);

    // Below audible minimum (20 Hz)
    assert.equal(synth.calculateFilterFrequency(10, -50), 20);

    // Above audible maximum (20000 Hz)
    assert.equal(synth.calculateFilterFrequency(18000, 5000), 20000);
  });

  it('generates non-empty white and pink noise sample buffers', () => {
    const whiteBuf = synth.generateNoiseBuffer('white', 0.1, 44100);
    assert.ok(whiteBuf instanceof Float32Array);
    assert.equal(whiteBuf.length, 4410);

    const pinkBuf = synth.generateNoiseBuffer('pink', 0.1, 44100);
    assert.ok(pinkBuf instanceof Float32Array);
    assert.equal(pinkBuf.length, 4410);
  });

  it('adjusts channel gains and throws error on unknown channel', () => {
    const adjusted = synth.adjustChannelGain('rain', 0.85);
    assert.equal(adjusted, 0.85);
    assert.equal(synth.channels.rain.gain, 0.85);

    assert.throws(() => {
      synth.adjustChannelGain('unknownChannel', 0.5);
    }, /Unknown audio channel/);
  });

  it('serializes state accurately and switches presets', () => {
    synth.startAmbience('Deep Binaural Meditation');
    assert.equal(synth.isPlaying, true);
    assert.equal(synth.activePreset, 'Deep Binaural Meditation');

    const state = synth.serializeState();
    assert.equal(state.isPlaying, true);
    assert.equal(state.activePreset, 'Deep Binaural Meditation');
    assert.equal(state.masterGain, 0.7);
  });
});
