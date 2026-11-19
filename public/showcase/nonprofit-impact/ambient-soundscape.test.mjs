import test from 'node:test';
import assert from 'node:assert/strict';
import { CHANNELS, NonprofitImpactSoundscapeSynth as Synth, clampGain, lowPassCoefficient, makeNoise, buildSoundscapeGraph } from './ambient-soundscape.js';

test('gain clamping is finite, numeric and bounded', () => {
  assert.equal(clampGain(-5), 0);assert.equal(clampGain(12), 1);assert.equal(clampGain(0.42), 0.42);
  for (const value of [NaN, Infinity, -Infinity, null, '1', undefined]) assert.throws(() => clampGain(value));
});
test('all presets are detached and applying one does not create audio', () => {
  let calls = 0;const s = new Synth(() => {calls++;throw Error('unexpected context');});
  for (const name of ['canopy','coast','focus']) {
    const state = s.applyPreset(name);assert.equal(state.preset, name);assert.equal(state.master, 0.4);
    assert.deepEqual(Object.keys(state.channels), CHANNELS);assert.ok(Object.values(state.channels).every(v => v >= 0 && v <= 1));
    state.channels.rain = -4;assert.ok(s.getState().channels.rain >= 0);
  }
  assert.equal(calls, 0);assert.equal(s.isPlaying(), false);assert.deepEqual([...s.getLevelBins()], Array(16).fill(0));
});
test('custom channel and master values clamp without mutating exported snapshots', () => {
  const s = new Synth();s.adjustChannelGain('rain', 2);s.adjustChannelGain('noise', -2);s.setMasterVolume(1.1);
  assert.equal(s.getState().channels.rain, 1);assert.equal(s.getState().channels.noise, 0);assert.equal(s.getState().master, 1);assert.equal(s.getState().preset, 'custom');
  const saved = s.serializePreset();assert.throws(() => s.adjustChannelGain('__proto__', 1));assert.throws(() => s.setMasterVolume(NaN));assert.equal(s.serializePreset(), saved);
});
test('serialized settings round trip without any audio or transient runtime state', () => {
  const s = new Synth();s.applyPreset('focus');s.adjustChannelGain('beats', 0.65);s.setMasterVolume(0.3);
  const restored = new Synth();restored.restorePreset(s.serializePreset());assert.deepEqual(restored.getState(), s.getState());
  assert.equal(restored.isPlaying(), false);assert.throws(() => restored.generateNoiseBuffer('white'), /Start/);
});
test('malformed or extra settings reject atomically', () => {
  const s = new Synth(), valid = s.getState(), saved = s.serializePreset();
  const invalid = [null, 'x'.repeat(4097), '{}', '[]', '{', JSON.stringify({...valid,version:2}), JSON.stringify({...valid,preset:'unknown'}), JSON.stringify({...valid,master:-1}), JSON.stringify({...valid,extra:true}), JSON.stringify({...valid,channels:{rain:1}}), JSON.stringify({...valid,channels:{...valid.channels,wind:'0'}}), JSON.stringify({...valid,channels:{...valid.channels,unknown:0}})];
  for (const json of invalid) {assert.throws(() => s.restorePreset(json));assert.equal(s.serializePreset(), saved);}
  assert.throws(() => s.applyPreset('unknown'));assert.equal(s.serializePreset(), saved);
});
test('one-pole cutoff coefficient matches physical time constant and clamps Nyquist', () => {
  for (const rate of [8000,16000,44100,48000,96000,192000]) for (const frequency of [20,350,1600,400000]) {
    const alpha = lowPassCoefficient(frequency,rate);assert.ok(alpha>0 && alpha<1);
    const timeConstant = -1 / Math.log(1-alpha);assert.ok(Math.abs(timeConstant - rate/(2*Math.PI*Math.min(frequency,rate*.45))) < 1e-8);
  }
  for (const args of [[0,48000],[-1,48000],[NaN,48000],[1000,0],[1000,200000]]) assert.throws(() => lowPassCoefficient(...args));
});
test('deterministic bounded noise is non-silent and fades both loop edges', () => {
  for (const type of ['white','pink']) {
    const a=makeNoise(type,16000,2,33), b=makeNoise(type,16000,2,33), c=makeNoise(type,16000,2,34);
    assert.deepEqual(a,b);assert.notDeepEqual(a,c);assert.equal(a.length,32000);assert.equal(Math.abs(a[0]),0);assert.equal(Math.abs(a.at(-1)),0);
    let energy=0,peak=0;for(const v of a){assert.ok(Number.isFinite(v));energy+=v*v;peak=Math.max(peak,Math.abs(v));}
    assert.ok(peak<=0.800001 && peak>0.79);assert.ok(Math.sqrt(energy/a.length)>.02);
  }
});
test('pink spectrum has stronger low-frequency power than white noise', () => {
  function power(samples, frequencies) {return frequencies.reduce((total,f)=>{let real=0,imag=0;for(let i=0;i<samples.length;i++){const phase=2*Math.PI*f*i/16000;real+=samples[i]*Math.cos(phase);imag+=samples[i]*Math.sin(phase);}return total+(real*real+imag*imag)/samples.length;},0)/frequencies.length;}
  const low=[100,180,260,340,420,500,580,660],high=[4000,4300,4600,4900,5200,5500,5800,6100];
  const pink=makeNoise('pink',16000,2,121),white=makeNoise('white',16000,2,121);
  assert.ok(power(pink,low)/power(pink,high)>4);assert.ok(power(white,low)/power(white,high)<4);
});
test('noise requests cannot allocate unbounded buffers or accept unknown algorithms', () => {
  for (const args of [['brown'],['pink',0],['white',48000,9],['white',48000,.01],['white',48000,2,-1],['white',48000,2,NaN]]) assert.throws(()=>makeNoise(...args));
  assert.equal(makeNoise('white',8000,.1,0).length,800);
});
test('invalid graph state rejects before allocating audio nodes', () => {
  assert.throws(()=>buildSoundscapeGraph({createGain(){throw Error('should not allocate');}},{}), /schema/);
});
test('unknown presets and failed context creation retain valid settings and can retry', async () => {
  let calls=0;const s=new Synth(()=>{calls++;throw Error('device unavailable');});const before=s.serializePreset();
  await assert.rejects(s.startAmbience('missing'), /Unknown/);assert.equal(calls,0);assert.equal(s.serializePreset(),before);
  await assert.rejects(s.startAmbience(), /device/);await assert.rejects(s.startAmbience(), /device/);assert.equal(calls,2);assert.equal(s.isPlaying(),false);
  await s.pauseAmbience();await s.dispose();
});
test('partial graph failure closes the owned context and allows a fresh retry', async () => {
  let created=0,closed=0;
  const s=new Synth(()=>{created++;return {state:'running',currentTime:0,createGain(){throw Error('graph unavailable');},async close(){closed++;this.state='closed';}};});
  await assert.rejects(s.startAmbience(), /graph unavailable/);await assert.rejects(s.startAmbience(), /graph unavailable/);
  assert.equal(created,2);assert.equal(closed,2);assert.equal(s.isPlaying(),false);
});
