import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreSoundscapeSynth } from './ambient-soundscape.js';

test('EcommerceStoreSoundscapeSynth - initializes with default channels and presets', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  assert.equal(synth.name, 'EcommerceStoreSoundscapeSynth');
  assert.equal(synth.masterGain, 0.7);
  assert.equal(synth.isPlaying, false);
  assert.ok(synth.channels.rain);
  assert.ok(synth.channels.wind);
  assert.ok(synth.channels.whiteNoise);
  assert.ok(synth.channels.chimes);
  assert.ok(synth.presets['Luxury Boutique Browsing']);
});

test('EcommerceStoreSoundscapeSynth - clamps gain values between 0.0 and 1.0', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  assert.equal(synth.clampGain(0.45), 0.45);
  assert.equal(synth.clampGain(1.75), 1.0);
  assert.equal(synth.clampGain(-0.3), 0.0);
  assert.equal(synth.clampGain('invalid'), 0.0);
  assert.equal(synth.clampGain(NaN), 0.0);
});

test('EcommerceStoreSoundscapeSynth - calculates filter frequency bounds accurately', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  assert.equal(synth.calculateFilterFrequency(500, 200), 700);
  assert.equal(synth.calculateFilterFrequency(25000, 0), 20000);
  assert.equal(synth.calculateFilterFrequency(5, -10), 20);
});

test('EcommerceStoreSoundscapeSynth - generates synthetic noise buffers', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  const whiteBuffer = synth.generateNoiseBuffer('white', 0.5, 44100);
  assert.equal(whiteBuffer.length, 22050);
  assert.ok(whiteBuffer.some((sample) => sample !== 0));

  const pinkBuffer = synth.generateNoiseBuffer('pink', 0.5, 44100);
  assert.equal(pinkBuffer.length, 22050);
  assert.ok(pinkBuffer.some((sample) => sample !== 0));
});

test('EcommerceStoreSoundscapeSynth - applies presets and serializes state', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  synth.applyPreset('Cozy Retail Flow');
  assert.equal(synth.activePreset, 'Cozy Retail Flow');
  assert.equal(synth.masterGain, 0.65);
  assert.equal(synth.channels.rain.gain, 0.45);

  const state = synth.serializeState();
  assert.equal(state.activePreset, 'Cozy Retail Flow');
  assert.equal(state.masterGain, 0.65);
  assert.equal(state.channels.rain, 0.45);
});

test('EcommerceStoreSoundscapeSynth - handles channel gain adjustments and errors', () => {
  const synth = new EcommerceStoreSoundscapeSynth();
  const clamped = synth.adjustChannelGain('chimes', 0.85);
  assert.equal(clamped, 0.85);
  assert.equal(synth.channels.chimes.gain, 0.85);

  synth.adjustChannelGain('master', 0.95);
  assert.equal(synth.masterGain, 0.95);

  assert.throws(() => synth.adjustChannelGain('unknownChannel', 0.5), /Unknown audio channel/);
  assert.throws(() => synth.applyPreset('NonExistentPreset'), /Unknown soundscape preset/);
});
