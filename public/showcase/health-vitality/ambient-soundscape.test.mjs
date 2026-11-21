import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalitySoundscapeSynth } from './ambient-soundscape.js';

test('HealthVitalitySoundscapeSynth - initializes with default channels and presets', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  assert.equal(synth.name, 'HealthVitalitySoundscapeSynth');
  assert.equal(synth.masterGain, 0.7);
  assert.equal(synth.isPlaying, false);
  assert.ok(synth.channels.rain);
  assert.ok(synth.channels.wind);
  assert.ok(synth.channels.whiteNoise);
  assert.ok(synth.channels.chimes);
  assert.ok(synth.presets['Deep Zen Meditation']);
});

test('HealthVitalitySoundscapeSynth - clamps gain values between 0.0 and 1.0', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  assert.equal(synth.clampGain(0.45), 0.45);
  assert.equal(synth.clampGain(1.75), 1.0);
  assert.equal(synth.clampGain(-0.3), 0.0);
  assert.equal(synth.clampGain('invalid'), 0.0);
  assert.equal(synth.clampGain(NaN), 0.0);
});

test('HealthVitalitySoundscapeSynth - calculates filter frequency bounds accurately', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  assert.equal(synth.calculateFilterFrequency(500, 200), 700);
  assert.equal(synth.calculateFilterFrequency(25000, 0), 20000);
  assert.equal(synth.calculateFilterFrequency(5, -10), 20);
});

test('HealthVitalitySoundscapeSynth - generates synthetic noise buffers', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  const whiteBuffer = synth.generateNoiseBuffer('white', 0.5, 44100);
  assert.equal(whiteBuffer.length, 22050);
  assert.ok(whiteBuffer.some((sample) => sample !== 0));

  const pinkBuffer = synth.generateNoiseBuffer('pink', 0.5, 44100);
  assert.equal(pinkBuffer.length, 22050);
  assert.ok(pinkBuffer.some((sample) => sample !== 0));
});

test('HealthVitalitySoundscapeSynth - applies presets and serializes state', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  synth.applyPreset('Restorative Circadian Sleep');
  assert.equal(synth.activePreset, 'Restorative Circadian Sleep');
  assert.equal(synth.masterGain, 0.6);
  assert.equal(synth.channels.rain.gain, 0.45);

  const state = synth.serializeState();
  assert.equal(state.activePreset, 'Restorative Circadian Sleep');
  assert.equal(state.masterGain, 0.6);
  assert.equal(state.channels.rain, 0.45);
});

test('HealthVitalitySoundscapeSynth - handles channel gain adjustments and errors', () => {
  const synth = new HealthVitalitySoundscapeSynth();
  const clamped = synth.adjustChannelGain('chimes', 0.85);
  assert.equal(clamped, 0.85);
  assert.equal(synth.channels.chimes.gain, 0.85);

  synth.adjustChannelGain('master', 0.95);
  assert.equal(synth.masterGain, 0.95);

  assert.throws(() => synth.adjustChannelGain('unknownChannel', 0.5), /Unknown audio channel/);
  assert.throws(() => synth.applyPreset('NonExistentPreset'), /Unknown soundscape preset/);
});
