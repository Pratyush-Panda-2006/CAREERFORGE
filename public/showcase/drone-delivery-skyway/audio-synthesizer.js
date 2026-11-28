// Interface sounds for Skyway Express, generated with the Web Audio API.

// Each sound is a list of notes: [frequency in Hz, wave shape, length in seconds, start offset].
export const SOUNDS = {
  click: [[880, 'triangle', 0.05, 0]],
  navigation: [[392, 'sine', 0.09, 0], [587.33, 'sine', 0.12, 0.07]],
  success: [[523.25, 'sine', 0.12, 0], [659.25, 'sine', 0.12, 0.1], [783.99, 'sine', 0.22, 0.2]],
  warning: [[740, 'square', 0.12, 0], [740, 'square', 0.12, 0.2]],
  error: [[160, 'sawtooth', 0.18, 0], [120, 'sawtooth', 0.28, 0.2]],
};

const SILENCE = 0.0001;

export class DroneDeliverySkywaySoundSynthesizer {
  constructor({ createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)() } = {}) {
    this.createContext = createContext;
    this.context = null;
    this.output = null;
    this.analyser = null;
    this.volume = 0.5;
    this.muted = false;
    // Context time at which the last queued note finishes.
    this.busyUntil = 0;
  }

  // Browsers only allow audio after a click or key press, so the context is built on first use.
  ensureContext() {
    if (!this.context) {
      this.context = this.createContext();
      this.output = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.output.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      this.updateOutput();
    }
    if (this.context.state === 'suspended') this.context.resume();
    return this.context;
  }

  updateOutput() {
    if (this.output) this.output.gain.value = this.muted ? 0 : this.volume;
  }

  // Level from 0 to 1. Values outside the range are clamped; non numbers are ignored.
  setVolume(level) {
    if (typeof level === 'number' && Number.isFinite(level)) {
      this.volume = Math.min(1, Math.max(0, level));
      this.updateOutput();
    }
    return this.volume;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.updateOutput();
    return this.muted;
  }

  // Plays a single note. `offset` delays the start so that notes can form a chime.
  playTone(freq, type = 'sine', duration = 0.15, offset = 0) {
    if (!Number.isFinite(freq) || freq <= 0 || !Number.isFinite(duration) || duration <= 0) return false;
    const context = this.ensureContext();
    const start = context.currentTime + offset;
    const end = start + duration;

    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, start);

    // A quick rise and fall avoids the click a hard start or stop would make.
    const shape = context.createGain();
    shape.gain.setValueAtTime(SILENCE, start);
    shape.gain.linearRampToValueAtTime(0.8, start + Math.min(0.008, duration / 4));
    shape.gain.exponentialRampToValueAtTime(SILENCE, end);

    oscillator.connect(shape);
    shape.connect(this.output);
    oscillator.onended = () => shape.disconnect();
    oscillator.start(start);
    oscillator.stop(end);
    this.busyUntil = Math.max(this.busyUntil, end);
    return true;
  }

  play(name) {
    if (!Object.hasOwn(SOUNDS, name)) return false;
    SOUNDS[name].forEach((note) => this.playTone(...note));
    return true;
  }

  playClick() { return this.play('click'); }
  playNavigationSweep() { return this.play('navigation'); }
  playSuccessChime() { return this.play('success'); }
  playWarningBeep() { return this.play('warning'); }
  playErrorBuzzer() { return this.play('error'); }

  isPlaying() {
    return Boolean(this.context) && this.context.currentTime < this.busyUntil;
  }
}

// Converts analyser bytes (0 to 255, silence at 128) into canvas points.
export function scopePoints(samples, width, height) {
  const step = samples.length > 1 ? width / (samples.length - 1) : 0;
  return Array.from(samples, (value, i) => [i * step, (value / 255) * height]);
}

export function mountSoundboard(doc, synth, requestFrame = (fn) => globalThis.requestAnimationFrame(fn)) {
  const slider = doc.getElementById('volume');
  const level = doc.getElementById('level');
  const mute = doc.getElementById('mute');
  const status = doc.getElementById('status');
  const wave = doc.getElementById('wave');
  const canvas = doc.getElementById('scope');
  const pen = canvas.getContext('2d');
  let drawing = false;

  function trace(samples) {
    pen.clearRect(0, 0, canvas.width, canvas.height);
    pen.strokeStyle = '#38bdf8';
    pen.lineWidth = 2;
    pen.beginPath();
    scopePoints(samples, canvas.width, canvas.height).forEach(([x, y], i) => {
      if (i === 0) pen.moveTo(x, y);
      else pen.lineTo(x, y);
    });
    pen.stroke();
  }

  const flat = () => trace([127.5, 127.5]);

  // Redraws only while a note is sounding, then settles back to a flat line.
  function animate() {
    if (!synth.isPlaying()) {
      drawing = false;
      wave.classList.remove('active');
      flat();
      return;
    }
    const samples = new Uint8Array(synth.analyser.fftSize);
    synth.analyser.getByteTimeDomainData(samples);
    trace(samples);
    requestFrame(animate);
  }

  function applyVolume() {
    synth.setVolume(Number(slider.value) / 100);
    level.textContent = `${slider.value}%`;
  }

  slider.addEventListener('input', applyVolume);
  mute.addEventListener('change', () => {
    synth.setMuted(mute.checked);
    status.textContent = mute.checked ? 'Sound is muted.' : 'Sound is on.';
  });
  doc.querySelectorAll('[data-sound]').forEach((button) => button.addEventListener('click', () => {
    try {
      synth.play(button.dataset.sound);
    } catch {
      status.textContent = 'This browser cannot play Web Audio.';
      return;
    }
    status.textContent = synth.muted
      ? `Muted. Turn sound on to hear "${button.textContent}".`
      : `Playing "${button.textContent}".`;
    wave.classList.toggle('active', !synth.muted);
    if (!drawing) {
      drawing = true;
      requestFrame(animate);
    }
  }));

  applyVolume();
  synth.setMuted(mute.checked);
  flat();
}

if (typeof document !== 'undefined') {
  mountSoundboard(document, new DroneDeliverySkywaySoundSynthesizer());
}
