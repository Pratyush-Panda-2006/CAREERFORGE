import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubSoundscapeSynth } from './ambient-soundscape.js';

test('GamingEsportsHubSoundscapeSynth - initializes with default channels and presets', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  assert.equal(synth.name, 'GamingEsportsHubSoundscapeSynth');
  assert.equal(synth.masterGain, 0.75);
  assert.equal(synth.isPlaying, false);
  assert.ok(synth.channels.rain);
  assert.ok(synth.channels.wind);
  assert.ok(synth.channels.whiteNoise);
  assert.ok(synth.channels.chimes);
  assert.ok(synth.presets['Cyberpunk Arena Match']);
});

test('GamingEsportsHubSoundscapeSynth - clamps gain values between 0.0 and 1.0', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  assert.equal(synth.clampGain(0.55), 0.55);
  assert.equal(synth.clampGain(1.8), 1.0);
  assert.equal(synth.clampGain(-0.5), 0.0);
  assert.equal(synth.clampGain('invalid'), 0.0);
  assert.equal(synth.clampGain(NaN), 0.0);
});

test('GamingEsportsHubSoundscapeSynth - calculates filter frequency bounds accurately', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  assert.equal(synth.calculateFilterFrequency(800, 300), 1100);
  assert.equal(synth.calculateFilterFrequency(22000, 500), 20000);
  assert.equal(synth.calculateFilterFrequency(10, -50), 20);
});

test('GamingEsportsHubSoundscapeSynth - generates synthetic noise buffers', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  const whiteBuffer = synth.generateNoiseBuffer('white', 0.5, 44100);
  assert.equal(whiteBuffer.length, 22050);
  assert.ok(whiteBuffer.some((sample) => sample !== 0));

  const pinkBuffer = synth.generateNoiseBuffer('pink', 0.5, 44100);
  assert.equal(pinkBuffer.length, 22050);
  assert.ok(pinkBuffer.some((sample) => sample !== 0));
});

test('GamingEsportsHubSoundscapeSynth - applies presets and serializes state', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  synth.applyPreset('Chill Lofi Arcade Lounge');
  assert.equal(synth.activePreset, 'Chill Lofi Arcade Lounge');
  assert.equal(synth.masterGain, 0.65);
  assert.equal(synth.channels.chimes.gain, 0.5);

  const state = synth.serializeState();
  assert.equal(state.activePreset, 'Chill Lofi Arcade Lounge');
  assert.equal(state.masterGain, 0.65);
  assert.equal(state.channels.chimes, 0.5);
});

test('GamingEsportsHubSoundscapeSynth - handles channel gain adjustments and errors', () => {
  const synth = new GamingEsportsHubSoundscapeSynth();
  const clamped = synth.adjustChannelGain('chimes', 0.9);
  assert.equal(clamped, 0.9);
  assert.equal(synth.channels.chimes.gain, 0.9);

  synth.adjustChannelGain('master', 0.8);
  assert.equal(synth.masterGain, 0.8);

  assert.throws(() => synth.adjustChannelGain('nonExistentChannel', 0.5), /Unknown audio channel/);
  assert.throws(() => synth.applyPreset('UnknownPreset'), /Unknown soundscape preset/);
});
