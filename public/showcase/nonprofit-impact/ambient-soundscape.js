export const CHANNELS = Object.freeze(['rain', 'wind', 'noise', 'waves', 'chimes', 'beats']);
const PRESETS = Object.freeze({ canopy: [0.75, 0.35, 0, 0.1, 0.25, 0], coast: [0.1, 0.4, 0, 0.85, 0, 0], focus: [0, 0.15, 0.3, 0, 0.1, 0.4] });
const MAX_MASTER = 0.35;
export function clampGain(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Gain must be a finite number.');
  return Math.max(0, Math.min(1, value));
}
export function lowPassCoefficient(frequency, sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new RangeError('Sample rate must be 8–192 kHz.');
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError('Cutoff must be positive.');
  return 1 - Math.exp(-2 * Math.PI * Math.min(frequency, sampleRate * 0.45) / sampleRate);
}
export function makeNoise(type, sampleRate = 48000, seconds = 4, seed = 713) {
  lowPassCoefficient(1000, sampleRate);
  if (!['white', 'pink'].includes(type)) throw new TypeError('Choose white or pink noise.');
  if (!Number.isFinite(seconds) || seconds < 0.1 || seconds > 8) throw new RangeError('Noise duration must be 0.1–8 seconds.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new TypeError('Seed must be an unsigned 32-bit integer.');
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 * 2 - 1; };
  const rows = Array.from({ length: 12 }, random);
  let sum = rows.reduce((a, b) => a + b, 0);
  const data = new Float32Array(Math.round(sampleRate * seconds));
  let peak = 0;
  for (let i = 0; i < data.length; i++) {
    let value = random();
    if (type === 'pink') {
      // Voss-style octave rows: slower rows retain low-frequency energy.
      const counter = (i + 1) & 4095;
      if (counter) { const row = 31 - Math.clz32(counter & -counter); sum -= rows[row]; rows[row] = random(); sum += rows[row]; }
      value = (sum + value) / 13;
    }
    const fade = Math.min(1, i / (sampleRate * 0.02), (data.length - 1 - i) / (sampleRate * 0.02));
    data[i] = value * fade;
    peak = Math.max(peak, Math.abs(data[i]));
  }
  if (peak) for (let i = 0; i < data.length; i++) data[i] *= 0.8 / peak;
  return data;
}
function presetState(name) {
  if (!Object.hasOwn(PRESETS, name)) throw new TypeError('Unknown soundscape preset.');
  return { version: 1, preset: name, master: 0.4, channels: Object.fromEntries(CHANNELS.map((key, i) => [key, PRESETS[name][i]])) };
}
function validateState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state) || Object.keys(state).sort().join() !== 'channels,master,preset,version') throw new TypeError('Invalid mix schema.');
  if (state.version !== 1 || ![...Object.keys(PRESETS), 'custom'].includes(state.preset)) throw new TypeError('Unsupported mix version or preset.');
  if (typeof state.master !== 'number' || !Number.isFinite(state.master) || state.master < 0 || state.master > 1) throw new TypeError('Invalid master level.');
  if (!state.channels || Object.keys(state.channels).sort().join() !== [...CHANNELS].sort().join()) throw new TypeError('Invalid channel set.');
  for (const key of CHANNELS) if (typeof state.channels[key] !== 'number' || !Number.isFinite(state.channels[key]) || state.channels[key] < 0 || state.channels[key] > 1) throw new TypeError('Invalid channel level.');
  return { ...state, channels: { ...state.channels } };
}
const masterGain = value => clampGain(value) ** 2 * MAX_MASTER;
const channelGain = value => clampGain(value) ** 2 / CHANNELS.length;
function noiseBuffer(context, type, seed) {
  const samples = makeNoise(type, context.sampleRate, 4, seed);
  const buffer = context.createBuffer(1, samples.length, context.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}
function tonalBuffer(context, type) {
  const rate = context.sampleRate;
  const length = rate * (type === 'beats' ? 2 : 6);
  const buffer = context.createBuffer(type === 'beats' ? 2 : 1, length, rate);
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      if (type === 'beats') data[i] = 0.7 * Math.sin(2 * Math.PI * (channel ? 184 : 180) * t);
      else { const age = t % 2; const attack = Math.min(1, age / 0.012); const release = Math.min(1, (2 - age) / 0.025); data[i] = attack * release * Math.exp(-3 * age) * (Math.sin(2 * Math.PI * 523.25 * age) + 0.35 * Math.sin(2 * Math.PI * 783.99 * age)) / 1.35; }
    }
  }
  return buffer;
}

// The same graph is used for live playback and real OfflineAudioContext validation.
export function buildSoundscapeGraph(context, inputState) {
  const state = validateState(inputState);
  const master = context.createGain(); master.gain.value = masterGain(state.master);
  const analyser = context.createAnalyser(); analyser.fftSize = 2048; analyser.minDecibels = -110; analyser.maxDecibels = -25; analyser.smoothingTimeConstant = 0.65;
  master.connect(analyser); analyser.connect(context.destination);
  const sources = [], gains = {}, filters = [];
  for (const [i, key] of CHANNELS.entries()) {
    const source = context.createBufferSource();
    let buffer;
    if (key === 'chimes' || key === 'beats') buffer = tonalBuffer(context, key);
    else {
      buffer = noiseBuffer(context, key === 'noise' ? 'white' : 'pink', 713 + i * 123);
      if (key === 'waves') {
        const samples = buffer.getChannelData(0), alpha = lowPassCoefficient(600, context.sampleRate);
        let previous = 0;
        for (let n = 0; n < samples.length; n++) { previous += alpha * (samples[n] - previous); samples[n] = previous * (0.25 + 0.75 * Math.sin(Math.PI * n / samples.length) ** 2); }
      }
    }
    source.buffer = buffer; source.loop = true;
    const gain = context.createGain(); gain.gain.value = channelGain(state.channels[key]); gains[key] = gain;
    if (key === 'rain' || key === 'wind') {
      const filter = context.createBiquadFilter(); filter.type = key === 'rain' ? 'bandpass' : 'lowpass'; filter.frequency.value = key === 'rain' ? 1600 : 350; filter.Q.value = 0.5;
      source.connect(filter); filter.connect(gain); filters.push(filter);
    } else source.connect(gain);
    gain.connect(master); source.start(); sources.push(source);
  }
  let stopped = false;
  return { master, analyser, sources, gains, stop() {
    if (stopped) return; stopped = true;
    for (const source of sources) { source.stop(); source.disconnect(); }
    for (const node of [...Object.values(gains), ...filters, master, analyser]) node.disconnect();
  } };
}

export class NonprofitImpactSoundscapeSynth {
  #state = presetState('canopy'); #context = null; #graph = null; #busy = false; #playing = false;
  constructor(contextFactory = () => {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
    return new Audio();
  }) { this.contextFactory = contextFactory; }
  getState() { return { ...this.#state, channels: { ...this.#state.channels } }; }
  serializePreset() { return JSON.stringify(this.getState(), null, 2); }
  restorePreset(json) {
    if (typeof json !== 'string' || json.length > 4096) throw new TypeError('Mix JSON must fit within 4 KiB.');
    this.#state = validateState(JSON.parse(json)); this.#syncGains(); return this.getState();
  }
  applyPreset(name) { this.#state = presetState(name); this.#syncGains(); return this.getState(); }
  adjustChannelGain(channel, value) {
    if (!CHANNELS.includes(channel)) throw new TypeError('Unknown channel.');
    const level = clampGain(value); this.#state.channels[channel] = level; this.#state.preset = 'custom'; this.#syncGains(); return level;
  }
  setMasterVolume(value) { this.#state.master = clampGain(value); this.#syncGains(); return this.#state.master; }
  #syncGains() {
    if (!this.#graph) return;
    const time = this.#context.currentTime;
    this.#graph.master.gain.setTargetAtTime(masterGain(this.#state.master), time, 0.025);
    for (const key of CHANNELS) this.#graph.gains[key].gain.setTargetAtTime(channelGain(this.#state.channels[key]), time, 0.025);
  }
  generateNoiseBuffer(type) {
    if (!this.#context) throw new Error('Start the mixer before requesting an AudioBuffer.');
    return noiseBuffer(this.#context, type, 713);
  }
  isPlaying() { return this.#playing && this.#context?.state === 'running'; }
  async startAmbience(preset) {
    if (this.#busy) throw new Error('An audio operation is already in progress.');
    if (preset !== undefined) this.applyPreset(preset);
    this.#busy = true;
    let context;
    try {
      if (!this.#context) this.#context = this.contextFactory();
      context = this.#context;
      if (!this.#graph) this.#graph = buildSoundscapeGraph(context, { ...this.#state, master: 0 });
      if (!this.isPlaying()) {
        // Reset both the intrinsic value and its automation before resuming.
        this.#graph.master.gain.cancelScheduledValues(context.currentTime);
        this.#graph.master.gain.value = 0;
      }
      await context.resume();
      if (this.#context !== context || context.state !== 'running') throw new Error('Audio did not start. Try the play control again.');
      this.#syncGains(); this.#playing = true;
    } catch (error) {
      this.#playing = false;
      if (this.#graph && context) this.#graph.master.gain.setValueAtTime(0, context.currentTime);
      else if (context) {
        if (this.#context === context) this.#context = null;
        if (context.state !== 'closed') await context.close();
      }
      throw error;
    } finally { this.#busy = false; }
  }
  async pauseAmbience() {
    if (this.#busy) throw new Error('An audio operation is already in progress.');
    if (!this.#context) return;
    this.#busy = true;
    try { await this.#context.suspend(); this.#playing = false; }
    finally { this.#busy = false; }
  }
  getLevelBins() {
    const bins = new Uint8Array(16);
    if (!this.isPlaying()) return bins;
    const data = new Uint8Array(this.#graph.analyser.frequencyBinCount); this.#graph.analyser.getByteFrequencyData(data);
    // Logarithmic bands preserve the low-frequency detail of a quiet soundscape.
    for (let i = 0; i < bins.length; i++) {
      const start = Math.floor(data.length ** (i / bins.length));
      const end = Math.max(start + 1, Math.floor(data.length ** ((i + 1) / bins.length)));
      bins[i] = Math.max(...data.subarray(start, end));
    }
    return bins;
  }
  async dispose() {
    const context = this.#context; this.#playing = false; this.#context = null;
    this.#graph?.stop(); this.#graph = null;
    if (context && context.state !== 'closed') await context.close();
  }
}

if (typeof document !== 'undefined' && document.getElementById('soundscape')) {
  const synth = new NonprofitImpactSoundscapeSynth();
  const byId = id => document.getElementById(id);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const bars = Array.from({ length: 16 }, (_, i) => { const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); rect.setAttribute('x', String(i * 22 + 4)); rect.setAttribute('y', '78'); rect.setAttribute('width', '12'); rect.setAttribute('height', '2'); byId('spectrum').append(rect); return rect; });
  let busy = false, frame = 0, lastFrame = 0;
  const report = (text, error = false) => { byId('notice').textContent = text; byId('notice').classList.toggle('error', error); byId('notice').setAttribute('role', error ? 'alert' : 'status'); };
  function clearMeter() { cancelAnimationFrame(frame); frame = 0; for (const bar of bars) { bar.setAttribute('height', '2'); bar.setAttribute('y', '78'); } }
  function meter(time) {
    frame = 0;
    if (!synth.isPlaying() || motion.matches) { clearMeter(); return; }
    if (time - lastFrame > 80) { lastFrame = time; synth.getLevelBins().forEach((level, i) => { const height = Math.max(2, level / 255 * 76); bars[i].setAttribute('height', String(height)); bars[i].setAttribute('y', String(80 - height)); }); }
    frame = requestAnimationFrame(meter);
  }
  function refresh() {
    const state = synth.getState();
    byId('master').value = String(Math.round(state.master * 100)); byId('master-value').textContent = `${Math.round(state.master * 100)}%`; byId('dial').style.setProperty('--turn', `${-135 + state.master * 270}deg`);
    for (const key of CHANNELS) { byId(key).value = String(Math.round(state.channels[key] * 100)); byId(`${key}-value`).textContent = `${Math.round(state.channels[key] * 100)}%`; }
    document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === state.preset)));
    byId('play').textContent = synth.isPlaying() ? 'Pause soundscape' : 'Start listening';
    byId('play').setAttribute('aria-pressed', String(synth.isPlaying())); byId('state').textContent = synth.isPlaying() ? 'Playing · local synthesis' : 'Paused · no audio running';
    byId('meter-note').textContent = motion.matches ? 'Spectrum hidden for reduced motion.' : 'Live frequency levels from the audio output.';
    if (!synth.isPlaying() || motion.matches) clearMeter(); else if (!frame) frame = requestAnimationFrame(meter);
  }
  async function toggle() {
    if (busy) return;
    const restoreFocus = document.activeElement === byId('play');
    busy = true; byId('play').disabled = true;
    try { if (synth.isPlaying()) { await synth.pauseAmbience(); report('Paused. Your mix is retained.'); } else { await synth.startAmbience(); report('Soundscape started. Adjust any channel to shape the mix.'); } }
    catch (error) { report(error.message, true); }
    finally {
      busy = false; byId('play').disabled = false; refresh();
      if (restoreFocus && !document.hidden && [document.body, byId('play')].includes(document.activeElement)) byId('play').focus({ preventScroll: true });
    }
  }
  byId('play').addEventListener('click', toggle);
  byId('master').addEventListener('input', event => { synth.setMasterVolume(event.target.valueAsNumber / 100); refresh(); });
  for (const key of CHANNELS) byId(key).addEventListener('input', event => { synth.adjustChannelGain(key, event.target.valueAsNumber / 100); refresh(); });
  document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => { synth.applyPreset(button.dataset.preset); refresh(); report(`${button.textContent} preset loaded${synth.isPlaying() ? '.' : '. Press Start listening to hear it.'}`); }));
  byId('silence').addEventListener('click', () => { for (const key of CHANNELS) synth.adjustChannelGain(key, 0); refresh(); report('All channel levels are zero. Choose a preset to restore a mix.'); });
  byId('save').addEventListener('click', () => {
    const link = document.createElement('a'); let url;
    try { url = URL.createObjectURL(new Blob([synth.serializePreset()], { type: 'application/json' })); link.href = url; link.download = 'nonprofit-soundscape-mix.json'; document.body.append(link); link.click(); report('Mix settings downloaded. Audio and personal data are not recorded.'); }
    catch { report('Download could not start. Your mix is retained; try again.', true); }
    finally { link.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000); }
  });
  motion.addEventListener('change', refresh);
  const release = () => { clearMeter(); synth.dispose().catch(() => {}); refresh(); report('Audio stopped while the page was hidden. Press Start listening to resume.'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  window.addEventListener('pagehide', release);
  refresh();
}
