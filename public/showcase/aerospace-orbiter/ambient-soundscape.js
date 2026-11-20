/**
 * AerospaceOrbiterSoundscapeSynth
 * Procedural Web Audio API ambient soundscape synthesizer and multi-channel acoustic mixer
 * for deep space mission concentration, orbital re-entry focus, and telemetry acoustic presence.
 */

export class AerospaceOrbiterSoundscapeSynth {
  constructor(options = {}) {
    this.masterGain = 0.7;
    this.isPlaying = false;
    this.activePreset = options.defaultPreset || 'Deep Space Orbital Drift';
    this.audioCtx = null;
    this.masterNode = null;
    this.activeNodes = new Map();
    this.listeners = [];

    this.channels = {
      rain: { name: 'Orbital Ion Drift Flux', gain: 0.35, type: 'pink' },
      wind: { name: 'Atmospheric Re-entry Solar Wind', gain: 0.4, type: 'bandpass' },
      whiteNoise: { name: 'Telemetry Life Support Drone', gain: 0.25, type: 'white' },
      chimes: { name: 'Gravitational Wave Beacon Chimes', gain: 0.3, type: 'harmonic' }
    };

    this.presets = {
      'Deep Space Orbital Drift': { rain: 0.35, wind: 0.4, whiteNoise: 0.25, chimes: 0.3, master: 0.7 },
      'Lunar Orbit Trans-Injection Focus': { rain: 0.2, wind: 0.55, whiteNoise: 0.3, chimes: 0.45, master: 0.65 },
      'Planetary Atmospheric Entry Zen': { rain: 0.5, wind: 0.25, whiteNoise: 0.15, chimes: 0.5, master: 0.75 }
    };
  }

  clampGain(val) {
    if (typeof val !== 'number' || Number.isNaN(val)) return 0;
    return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
  }

  calculateFilterFrequency(cutoff, modulation = 0) {
    const minFreq = 20;
    const maxFreq = 20000;
    const computed = (Number(cutoff) || 1000) + (Number(modulation) || 0);
    return Math.max(minFreq, Math.min(maxFreq, Math.round(computed)));
  }

  generateNoiseBuffer(type = 'white', lengthSeconds = 2, sampleRate = 44100) {
    const totalSamples = Math.floor(lengthSeconds * sampleRate);
    const buffer = new Float32Array(totalSamples);

    if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < totalSamples; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        buffer[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      for (let i = 0; i < totalSamples; i++) {
        buffer[i] = Math.random() * 2 - 1;
      }
    }
    return buffer;
  }

  adjustChannelGain(channel, val) {
    if (!this.channels[channel]) {
      throw new Error(`Unknown audio channel: ${channel}`);
    }
    const clamped = this.clampGain(val);
    this.channels[channel].gain = clamped;
    if (this.activeNodes.has(channel) && this.audioCtx) {
      const nodeObj = this.activeNodes.get(channel);
      if (nodeObj.gainNode) {
        nodeObj.gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
      }
    }
    this.notifyListeners({ type: 'channel_gain', channel, gain: clamped });
    return clamped;
  }

  setMasterGain(val) {
    const clamped = this.clampGain(val);
    this.masterGain = clamped;
    if (this.masterNode && this.audioCtx) {
      this.masterNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
    this.notifyListeners({ type: 'master_gain', gain: clamped });
    return clamped;
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }
    this.activePreset = presetName;
    if (typeof preset.master === 'number') this.setMasterGain(preset.master);
    if (typeof preset.rain === 'number') this.adjustChannelGain('rain', preset.rain);
    if (typeof preset.wind === 'number') this.adjustChannelGain('wind', preset.wind);
    if (typeof preset.whiteNoise === 'number') this.adjustChannelGain('whiteNoise', preset.whiteNoise);
    if (typeof preset.chimes === 'number') this.adjustChannelGain('chimes', preset.chimes);

    this.notifyListeners({ type: 'preset_applied', preset: presetName });
    return this.serializeState();
  }

  startAmbience(preset = null) {
    if (preset) {
      this.applyPreset(preset);
    }
    this.isPlaying = true;

    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.masterNode = this.audioCtx.createGain();
        this.masterNode.gain.setValueAtTime(this.masterGain, this.audioCtx.currentTime);
        this.masterNode.connect(this.audioCtx.destination);
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    this.notifyListeners({ type: 'playback_started', state: this.serializeState() });
    return true;
  }

  stopAmbience() {
    this.isPlaying = false;
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
    this.notifyListeners({ type: 'playback_stopped', state: this.serializeState() });
    return false;
  }

  toggleAmbience() {
    return this.isPlaying ? this.stopAmbience() : this.startAmbience();
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== listener);
    };
  }

  notifyListeners(event) {
    for (const fn of this.listeners) {
      try {
        fn(event);
      } catch (err) {
        console.error('Audio synthesizer listener error:', err);
      }
    }
  }

  serializeState() {
    return {
      isPlaying: this.isPlaying,
      masterGain: this.masterGain,
      activePreset: this.activePreset,
      channels: {
        rain: { ...this.channels.rain },
        wind: { ...this.channels.wind },
        whiteNoise: { ...this.channels.whiteNoise },
        chimes: { ...this.channels.chimes }
      }
    };
  }
}

// Browser UI bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const synth = new AerospaceOrbiterSoundscapeSynth();
    const toggleBtn = document.getElementById('toggle-play-btn');
    const visualizerCard = document.querySelector('.visualizer-card');
    const presetSelect = document.getElementById('preset-selector');
    const masterSlider = document.getElementById('master-gain-slider');
    const masterVal = document.getElementById('master-gain-val');
    const statusIndicator = document.getElementById('mixer-status');

    const channelSliders = {
      rain: document.getElementById('slider-rain'),
      wind: document.getElementById('slider-wind'),
      whiteNoise: document.getElementById('slider-whiteNoise'),
      chimes: document.getElementById('slider-chimes')
    };

    const channelVals = {
      rain: document.getElementById('val-rain'),
      wind: document.getElementById('val-wind'),
      whiteNoise: document.getElementById('val-whiteNoise'),
      chimes: document.getElementById('val-chimes')
    };

    function updateUiState() {
      if (masterSlider) masterSlider.value = String(synth.masterGain);
      if (masterVal) masterVal.textContent = `${Math.round(synth.masterGain * 100)}%`;
      for (const [key, slider] of Object.entries(channelSliders)) {
        if (slider && synth.channels[key]) {
          slider.value = String(synth.channels[key].gain);
        }
      }
      for (const [key, label] of Object.entries(channelVals)) {
        if (label && synth.channels[key]) {
          label.textContent = `${Math.round(synth.channels[key].gain * 100)}%`;
        }
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        synth.toggleAmbience();
        if (synth.isPlaying) {
          toggleBtn.textContent = 'Pause Soundscape';
          toggleBtn.classList.add('playing');
          if (visualizerCard) visualizerCard.classList.add('playing');
          if (statusIndicator) statusIndicator.textContent = `Active • Synthesizing "${synth.activePreset}" acoustic waves`;
        } else {
          toggleBtn.textContent = 'Start Soundscape';
          toggleBtn.classList.remove('playing');
          if (visualizerCard) visualizerCard.classList.remove('playing');
          if (statusIndicator) statusIndicator.textContent = 'Paused • Acoustic generators in sleep standby';
        }
      });
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        synth.applyPreset(val);
        updateUiState();
        if (statusIndicator && synth.isPlaying) {
          statusIndicator.textContent = `Active • Synthesizing "${synth.activePreset}" acoustic waves`;
        }
      });
    }

    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        synth.setMasterGain(val);
        if (masterVal) masterVal.textContent = `${Math.round(val * 100)}%`;
      });
    }

    for (const [key, slider] of Object.entries(channelSliders)) {
      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          synth.adjustChannelGain(key, val);
          if (channelVals[key]) channelVals[key].textContent = `${Math.round(val * 100)}%`;
        });
      }
    }

    updateUiState();
  });
}
