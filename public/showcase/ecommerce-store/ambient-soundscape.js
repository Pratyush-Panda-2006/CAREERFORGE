/**
 * EcommerceStoreSoundscapeSynth
 * Procedural Web Audio API ambient soundscape synthesizer and multi-channel acoustic mixer
 * for boutique digital stores, retail focus, checkout success chimes, and shopping flow.
 */

export class EcommerceStoreSoundscapeSynth {
  constructor(options = {}) {
    this.name = 'EcommerceStoreSoundscapeSynth';
    this.masterGain = 0.7;
    this.isPlaying = false;
    this.activePreset = options.defaultPreset || 'Luxury Boutique Browsing';
    this.audioCtx = null;
    this.masterNode = null;
    this.activeNodes = new Map();
    this.listeners = [];

    this.channels = {
      rain: { name: 'Rainy Day Window Shopping (Pink)', gain: 0.35, type: 'pink' },
      wind: { name: 'Boutique Floor Airflow (Wind)', gain: 0.4, type: 'bandpass' },
      whiteNoise: { name: 'Register Scanner Dither & Crowd Hum', gain: 0.25, type: 'white' },
      chimes: { name: 'Checkout Success & Glass Chimes', gain: 0.3, type: 'harmonic' }
    };

    this.presets = {
      'Luxury Boutique Browsing': { rain: 0.35, wind: 0.4, whiteNoise: 0.25, chimes: 0.3, master: 0.7 },
      'Cozy Retail Flow': { rain: 0.45, wind: 0.25, whiteNoise: 0.15, chimes: 0.2, master: 0.65 },
      'Night Owl Flash Sale': { rain: 0.2, wind: 0.35, whiteNoise: 0.3, chimes: 0.45, master: 0.75 }
    };
  }

  /**
   * Clamps gain values strictly between 0.0 and 1.0.
   * @param {number} val
   * @returns {number}
   */
  clampGain(val) {
    if (typeof val !== 'number' || Number.isNaN(val)) return 0;
    return Math.max(0, Math.min(1, Math.round(val * 100) / 100));
  }

  /**
   * Calculates bandpass/lowpass filter frequency with modulation clamping.
   * @param {number} cutoff
   * @param {number} modulation
   * @returns {number}
   */
  calculateFilterFrequency(cutoff, modulation = 0) {
    const minFreq = 20;
    const maxFreq = 20000;
    const computed = (Number(cutoff) || 1000) + (Number(modulation) || 0);
    return Math.max(minFreq, Math.min(maxFreq, Math.round(computed)));
  }

  /**
   * Generates white or pink noise audio sample buffer.
   * @param {'white'|'pink'} type
   * @param {number} lengthSeconds
   * @param {number} sampleRate
   * @returns {Float32Array}
   */
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

  /**
   * Adjusts gain for a specific channel.
   * @param {'rain'|'wind'|'whiteNoise'|'chimes'|'master'} channel
   * @param {number} val
   */
  adjustChannelGain(channel, val) {
    const clamped = this.clampGain(val);
    if (channel === 'master') {
      this.masterGain = clamped;
      if (this.masterNode && this.audioCtx) {
        this.masterNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
      }
    } else if (this.channels[channel]) {
      this.channels[channel].gain = clamped;
      const node = this.activeNodes.get(channel);
      if (node && this.audioCtx) {
        node.gainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.05);
      }
    } else {
      throw new Error(`Unknown audio channel: ${channel}`);
    }
    this.notifyState();
    return clamped;
  }

  /**
   * Starts or restarts ambient sound playback with a selected preset.
   * @param {string} presetName
   */
  startAmbience(presetName) {
    if (presetName && this.presets[presetName]) {
      this.applyPreset(presetName);
    }

    if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioCtxClass();
        this.masterNode = this.audioCtx.createGain();
        this.masterNode.gain.setValueAtTime(this.masterGain, this.audioCtx.currentTime);
        this.masterNode.connect(this.audioCtx.destination);
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.initNodes();
    }

    this.isPlaying = true;
    this.notifyState();
    return this.isPlaying;
  }

  /**
   * Stops ambient sound playback and releases audio nodes.
   */
  stopAmbience() {
    this.isPlaying = false;
    this.activeNodes.forEach((node) => {
      try {
        if (node.source && typeof node.source.stop === 'function') {
          node.source.stop();
        }
        if (node.source && typeof node.source.disconnect === 'function') {
          node.source.disconnect();
        }
      } catch {
        // Node already stopped
      }
    });
    this.activeNodes.clear();
    this.notifyState();
  }

  /**
   * Applies channel levels from a designated acoustic preset.
   * @param {string} presetName
   */
  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      throw new Error(`Unknown soundscape preset: ${presetName}`);
    }

    this.activePreset = presetName;
    Object.keys(this.channels).forEach((ch) => {
      if (typeof preset[ch] === 'number') {
        this.adjustChannelGain(ch, preset[ch]);
      }
    });
    if (typeof preset.master === 'number') {
      this.adjustChannelGain('master', preset.master);
    }
    return true;
  }

  /**
   * Serializes current synthesizer configuration and active state.
   * @returns {Object}
   */
  serializeState() {
    return {
      isPlaying: this.isPlaying,
      activePreset: this.activePreset,
      masterGain: this.masterGain,
      channels: {
        rain: this.channels.rain.gain,
        wind: this.channels.wind.gain,
        whiteNoise: this.channels.whiteNoise.gain,
        chimes: this.channels.chimes.gain
      }
    };
  }

  initNodes() {
    if (!this.audioCtx || !this.masterNode) return;
    this.activeNodes.clear();

    const sampleRate = this.audioCtx.sampleRate || 44100;

    // Pink Noise (Window Shopping Rain)
    const pinkData = this.generateNoiseBuffer('pink', 3, sampleRate);
    const pinkBuffer = this.audioCtx.createBuffer(1, pinkData.length, sampleRate);
    pinkBuffer.copyToChannel(pinkData, 0);
    const pinkSource = this.audioCtx.createBufferSource();
    pinkSource.buffer = pinkBuffer;
    pinkSource.loop = true;
    const pinkGain = this.audioCtx.createGain();
    pinkGain.gain.setValueAtTime(this.channels.rain.gain, this.audioCtx.currentTime);
    pinkSource.connect(pinkGain).connect(this.masterNode);
    pinkSource.start();
    this.activeNodes.set('rain', { source: pinkSource, gainNode: pinkGain });

    // White Noise (Scanner Dither & Hum)
    const whiteData = this.generateNoiseBuffer('white', 3, sampleRate);
    const whiteBuffer = this.audioCtx.createBuffer(1, whiteData.length, sampleRate);
    whiteBuffer.copyToChannel(whiteData, 0);
    const whiteSource = this.audioCtx.createBufferSource();
    whiteSource.buffer = whiteBuffer;
    whiteSource.loop = true;
    const whiteFilter = this.audioCtx.createBiquadFilter();
    whiteFilter.type = 'lowpass';
    whiteFilter.frequency.setValueAtTime(1050, this.audioCtx.currentTime);
    const whiteGain = this.audioCtx.createGain();
    whiteGain.gain.setValueAtTime(this.channels.whiteNoise.gain, this.audioCtx.currentTime);
    whiteSource.connect(whiteFilter).connect(whiteGain).connect(this.masterNode);
    whiteSource.start();
    this.activeNodes.set('whiteNoise', { source: whiteSource, gainNode: whiteGain });

    // Bandpass Wind (Floor Airflow)
    const windSource = this.audioCtx.createBufferSource();
    windSource.buffer = pinkBuffer;
    windSource.loop = true;
    const windFilter = this.audioCtx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(340, this.audioCtx.currentTime);
    windFilter.Q.setValueAtTime(2.5, this.audioCtx.currentTime);
    const windGain = this.audioCtx.createGain();
    windGain.gain.setValueAtTime(this.channels.wind.gain, this.audioCtx.currentTime);
    windSource.connect(windFilter).connect(windGain).connect(this.masterNode);
    windSource.start();
    this.activeNodes.set('wind', { source: windSource, gainNode: windGain });

    // Harmonic Chimes (Checkout Bell 587 Hz)
    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime);
    const chimesGain = this.audioCtx.createGain();
    chimesGain.gain.setValueAtTime(this.channels.chimes.gain * 0.15, this.audioCtx.currentTime);
    osc.connect(chimesGain).connect(this.masterNode);
    osc.start();
    this.activeNodes.set('chimes', { source: osc, gainNode: chimesGain });
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  notifyState() {
    const state = this.serializeState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
        // Safe dispatch
      }
    });
  }
}

// DOM Setup
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const synth = new EcommerceStoreSoundscapeSynth();

    const toggleBtn = document.getElementById('toggle-play-btn');
    const presetSelector = document.getElementById('preset-selector');
    const masterSlider = document.getElementById('master-gain-slider');
    const masterVal = document.getElementById('master-gain-val');
    const statusText = document.getElementById('mixer-status');
    const eqBars = document.querySelectorAll('.eq-bar');

    const channelMap = {
      rain: { slider: document.getElementById('slider-rain'), label: document.getElementById('val-rain') },
      wind: { slider: document.getElementById('slider-wind'), label: document.getElementById('val-wind') },
      whiteNoise: { slider: document.getElementById('slider-whiteNoise'), label: document.getElementById('val-whiteNoise') },
      chimes: { slider: document.getElementById('slider-chimes'), label: document.getElementById('val-chimes') }
    };

    function updateUi(state) {
      if (toggleBtn) {
        toggleBtn.textContent = state.isPlaying ? 'Stop Ambience' : 'Start Ambience';
        toggleBtn.classList.toggle('playing', state.isPlaying);
      }
      if (statusText) {
        statusText.textContent = state.isPlaying
          ? `Status: Live • Preset: [${state.activePreset}] • Master: ${Math.round(state.masterGain * 100)}%`
          : 'Status: Standby • Procedural Audio Engine Ready';
      }
      if (masterVal) {
        masterVal.textContent = `${Math.round(state.masterGain * 100)}%`;
      }
      if (masterSlider) {
        masterSlider.value = state.masterGain;
      }
      Object.keys(channelMap).forEach((ch) => {
        const item = channelMap[ch];
        if (item.slider && item.label && typeof state.channels[ch] === 'number') {
          item.slider.value = state.channels[ch];
          item.label.textContent = `${Math.round(state.channels[ch] * 100)}%`;
        }
      });
      eqBars.forEach((bar) => {
        bar.classList.toggle('active', state.isPlaying);
      });
    }

    synth.subscribe(updateUi);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (synth.isPlaying) {
          synth.stopAmbience();
        } else {
          synth.startAmbience(presetSelector ? presetSelector.value : null);
        }
      });
    }

    if (presetSelector) {
      presetSelector.addEventListener('change', (e) => {
        const target = e.target;
        if (target && target.value) {
          synth.applyPreset(target.value);
        }
      });
    }

    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        const target = e.target;
        if (target) {
          synth.adjustChannelGain('master', parseFloat(target.value));
        }
      });
    }

    Object.keys(channelMap).forEach((ch) => {
      const item = channelMap[ch];
      if (item.slider) {
        item.slider.addEventListener('input', (e) => {
          const target = e.target;
          if (target) {
            synth.adjustChannelGain(ch, parseFloat(target.value));
          }
        });
      }
    });

    updateUi(synth.serializeState());
  });
}
