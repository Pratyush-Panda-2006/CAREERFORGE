export class PetAdoptionHavenSoundSynthesizer {
  // The context is created on the first sound, because browsers only allow audio after a user gesture.
  constructor({ createContext = () => new (globalThis.AudioContext || globalThis.webkitAudioContext)(), volume = 0.4 } = {}) {
    this.createContext = createContext;
    this.context = null;
    this.muted = false;
    this.volume = 0;
    this.setVolume(volume);
  }

  connect() {
    if (!this.context) {
      this.context = this.createContext();
      this.master = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.master.connect(this.analyser);
      this.analyser.connect(this.context.destination);
      this.applyGain();
    }
    if (this.context.state === 'suspended') this.context.resume();
    return this.context;
  }

  applyGain() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  // Takes a level from 0 to 1 and returns the value actually used.
  setVolume(level) {
    if (Number.isFinite(level)) this.volume = Math.min(1, Math.max(0, level));
    this.applyGain();
    return this.volume;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    this.applyGain();
  }

  // Plays one note. `delay` lets chimes queue notes after each other. Durations are in seconds.
  playTone(freq, type = 'sine', duration = 0.15, delay = 0) {
    if (!(freq > 0) || !(duration > 0)) return false;
    const context = this.connect();
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    // Short fades at both ends stop the speaker from popping.
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(1, start + Math.min(0.01, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration);
    return true;
  }

  playClick() {
    this.playTone(660, 'triangle', 0.05);
  }

  playNavigation() {
    this.playTone(440, 'sine', 0.08);
    this.playTone(587.33, 'sine', 0.08, 0.06);
  }

  playSuccessChime() {
    [523.25, 659.25, 783.99].forEach((freq, i) => this.playTone(freq, 'sine', 0.18, i * 0.1));
  }

  playWarning() {
    this.playTone(392, 'square', 0.12);
    this.playTone(392, 'square', 0.12, 0.18);
  }

  playErrorBuzzer() {
    this.playTone(150, 'sawtooth', 0.35);
    this.playTone(110, 'sawtooth', 0.35);
  }
}

if (typeof document !== 'undefined') {
  const synth = new PetAdoptionHavenSoundSynthesizer();
  const $ = (id) => document.getElementById(id);
  const canvas = $('scope');
  const pen = canvas.getContext('2d');
  const sounds = {
    click: () => synth.playClick(),
    navigation: () => synth.playNavigation(),
    success: () => synth.playSuccessChime(),
    warning: () => synth.playWarning(),
    error: () => synth.playErrorBuzzer(),
  };
  let frame = 0;

  const trace = (samples) => {
    pen.clearRect(0, 0, canvas.width, canvas.height);
    pen.strokeStyle = '#fb7185';
    pen.lineWidth = 2;
    pen.beginPath();
    samples.forEach((sample, i) => {
      const x = (i / (samples.length - 1)) * canvas.width;
      const y = (sample / 255) * canvas.height;
      if (i === 0) pen.moveTo(x, y);
      else pen.lineTo(x, y);
    });
    pen.stroke();
  };

  // Runs the oscilloscope for a second after the latest sound, then stops.
  const watch = () => {
    cancelAnimationFrame(frame);
    const samples = new Uint8Array(synth.analyser.fftSize);
    const until = performance.now() + 1000;
    const draw = () => {
      synth.analyser.getByteTimeDomainData(samples);
      trace(samples);
      if (performance.now() < until) frame = requestAnimationFrame(draw);
    };
    draw();
  };

  trace(new Uint8Array([128, 128]));
  document.querySelector('.board').addEventListener('click', (event) => {
    const name = event.target.dataset.sound;
    if (!sounds[name]) return;
    try {
      sounds[name]();
      watch();
      $('status').textContent = synth.muted ? `Muted: ${name} sound not audible.` : `Played the ${name} sound.`;
    } catch {
      $('status').textContent = 'This browser does not support Web Audio.';
    }
  });
  $('volume').addEventListener('input', (event) => {
    synth.setVolume(event.target.value / 100);
    $('level').textContent = `${event.target.value}%`;
  });
  $('mute').addEventListener('change', (event) => synth.setMuted(event.target.checked));
}
