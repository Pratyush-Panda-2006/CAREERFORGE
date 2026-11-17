import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
vm.runInNewContext(readFileSync(new URL('./speed-pitch-logic.js', import.meta.url), 'utf8'), sandbox);
const S = sandbox.SpeedPitch;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not within ${eps} of ${b}`);

test('clampSpeed keeps 0.5x to 3.0x and survives bad input', () => {
  assert.equal(S.clampSpeed(0.1), 0.5);
  assert.equal(S.clampSpeed(9), 3);
  assert.equal(S.clampSpeed(1.25), 1.25);
  assert.equal(S.clampSpeed('abc'), 1);
  assert.equal(S.clampSpeed(undefined), 1);
});

test('snapSpeed rounds to the slider step without float noise', () => {
  assert.equal(S.snapSpeed(1.2500001), 1.25);
  assert.equal(S.snapSpeed(1.37), 1.35);
  assert.equal(S.snapSpeed(0), 0.5);
  assert.equal(S.snapSpeed(3.4), 3);
});

test('formatSpeed trims trailing zeros', () => {
  assert.equal(S.formatSpeed(1), '1x');
  assert.equal(S.formatSpeed(1.25), '1.25x');
  assert.equal(S.formatSpeed(1.5), '1.5x');
  assert.equal(S.formatSpeed(99), '3x');
});

test('presets cycle forward and wrap to 1x', () => {
  assert.equal(S.nextPresetSpeed(1), 1.25);
  assert.equal(S.nextPresetSpeed(1.25), 1.5);
  assert.equal(S.nextPresetSpeed(2), 1);
  assert.equal(S.nextPresetSpeed(1.3), 1.5);
  assert.equal(S.nextPresetSpeed(3), 1);
  assert.equal(S.nextPresetSpeed(0.5), 1);
  assert.equal(S.presetIndex(1.5), 2);
  assert.equal(S.presetIndex(1.3), -1);
  assert.equal(S.nearestPresetIndex(1.9), 3);
});

test('grainParams asks the shifter for exactly 1/speed', () => {
  for (const speed of [0.5, 0.75, 1.25, 1.5, 2, 3]) {
    const p = S.grainParams(speed);
    close(p.ratio * speed, 1);
    close(S.semitones(p.ratio), -12 * Math.log2(speed));
  }
  close(S.grainParams(2).semitones, -12);
  close(S.grainParams(0.5).semitones, 12);
});

test('delay sweep slope equals 1 - ratio, so the read rate is the pitch ratio', () => {
  for (const speed of [0.5, 0.8, 1.25, 1.5, 2, 3]) {
    const p = S.grainParams(speed);
    // d(t) = base + sign * D * phase, phase goes 0..1 over one period
    const slope = (p.sign * p.maxDelay) / p.period;
    close(1 - slope, p.ratio);
  }
});

test('faster speech sweeps the delay up (pitch down), slower sweeps it down (pitch up)', () => {
  const fast = S.grainParams(2);
  assert.equal(fast.sign, 1);
  assert.equal(fast.baseDelay, 0);
  const slow = S.grainParams(0.5);
  assert.equal(slow.sign, -1);
  close(slow.baseDelay, slow.maxDelay);
});

test('the delay never goes negative and never exceeds one grain period', () => {
  for (let speed = 0.5; speed <= 3.0001; speed += 0.05) {
    const p = S.grainParams(speed);
    for (let phase = 0; phase <= 1; phase += 0.05) {
      const delay = p.baseDelay + p.sign * p.maxDelay * phase;
      assert.ok(delay >= -1e-12, `negative delay at ${speed}x`);
      assert.ok(delay <= p.period + 1e-12, `delay too long at ${speed}x`);
    }
  }
});

test('1x bypasses the shifter and adds no latency', () => {
  const p = S.grainParams(1);
  assert.equal(p.bypass, true);
  assert.equal(p.sign, 0);
  assert.equal(p.maxDelay, 0);
  assert.equal(p.latency, 0);
  assert.equal(S.grainParams(1.05).bypass, false);
});

test('grainParams clamps out-of-range speeds and honours a custom period', () => {
  assert.equal(S.grainParams(10).speed, 3);
  assert.equal(S.grainParams(0).speed, 0.5);
  const p = S.grainParams(2, 0.2);
  close(p.maxDelay, 0.1);
  assert.equal(S.grainParams(2, -1).period, S.GRAIN_PERIOD);
});

test('the two cross-fade windows always sum to 1', () => {
  for (let phase = 0; phase < 1; phase += 0.01) {
    close(S.fadeGain(phase) + S.fadeGain(phase + 0.5), 1, 1e-12);
  }
  assert.equal(S.fadeGain(0), 0);
  close(S.fadeGain(0.5), 1);
});

test('loop tables are one clean period, offset by half a cycle for the second grain', () => {
  const len = 4800;
  const ramp = S.buildRampTable(len, 0);
  const ramp2 = S.buildRampTable(len, 0.5);
  assert.equal(ramp[0], 0);
  assert.ok(ramp[len - 1] < 1);
  close(ramp2[0], 0.5);
  close(ramp2[len / 2], 0, 1e-6);
  const fade = S.buildFadeTable(len, 0);
  const fade2 = S.buildFadeTable(len, 0.5);
  for (let i = 0; i < len; i += 97) close(fade[i] + fade2[i], 1, 1e-6);
  // the grain is silent exactly where its delay sweep wraps around
  assert.equal(fade[0], 0);
  close(fade2[len / 2], 0, 1e-6);
});

test('correcting a speed-up puts the voice formants back where they started', () => {
  assert.equal(S.outputFactor(2, true), 1);
  assert.equal(S.outputFactor(0.5, true), 1);
  assert.equal(S.outputFactor(1.5, false), 1.5);
  const voice = S.scaledVoice(2);
  assert.equal(voice.f0, S.VOICE_F0 * 2);
  assert.equal(voice.formants[0].freq, S.VOICE_FORMANTS[0].freq * 2);
});

test('voice envelope peaks at its formants and follows the shift factor', () => {
  const f1 = S.VOICE_FORMANTS[0].freq;
  assert.ok(S.voiceEnvelope(f1, 1) > S.voiceEnvelope(f1 * 1.8, 1));
  assert.ok(S.voiceEnvelope(f1 * 2, 2) > S.voiceEnvelope(f1, 2));
  close(S.voiceEnvelope(f1, 1), S.voiceEnvelope(f1 * 2, 2), 1e-9);
});

test('responseCurve covers the log axis with normalised points', () => {
  const curve = S.responseCurve(64, 1);
  assert.equal(curve.length, 64);
  assert.equal(curve[0][0], 0);
  assert.equal(curve[63][0], 1);
  for (const [x, y] of curve) {
    assert.ok(x >= 0 && x <= 1);
    assert.ok(y >= 0 && y <= 1);
  }
  close(S.hzToX(S.xToHz(0.37)), 0.37, 1e-12);
});

test('settings round-trip and reject corrupt storage', () => {
  const raw = S.serializeSettings({ speed: 1.3500001, correction: false });
  assert.deepEqual({ ...S.parseSettings(raw) }, { speed: 1.35, correction: false });
  assert.deepEqual({ ...S.parseSettings('{"speed":9}') }, { speed: 3, correction: true });
  assert.equal(S.parseSettings(null), null);
  assert.equal(S.parseSettings(''), null);
  assert.equal(S.parseSettings('{oops'), null);
  assert.equal(S.parseSettings('7'), null);
  assert.equal(S.parseSettings('{"speed":"fast"}'), null);
});
