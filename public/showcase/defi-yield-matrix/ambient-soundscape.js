/**
 * DefiYieldMatrixSoundscapeSynth
 * Procedural Web Audio API ambient soundscape synthesizer and multi-channel acoustic mixer
 * for high-frequency liquidity farming focus, algorithmic trading tranquil masking, and DeFi operator presence.
 */

export class DefiYieldMatrixSoundscapeSynth {
  constructor(options = {}) {
    this.masterGain = 0.7;
    this.isPlaying = false;
    this.activePreset = options.defaultPreset || 'Liquidity Pool Depth';
    this.audioCtx = null;
    this.masterNode = null;
    this.activeNodes = new Map();
    this.listeners = [];

    this.channels = {
      rain: { name: 'Stablecoin Flow Waves', gain: 0.35, type: 'pink' },
      wind: { name: 'AMM Arbitrage Breeze', gain: 0.45, type: 'bandpass' },
      whiteNoise: { name: 'Validator Node Drone', gain: 0.2, type: 'white' },
      chimes: { name: 'Yield Harvest Chimes', gain: 0.3, type: 'harmonic' }
    };

    this.presets = {
      'Liquidity Pool Depth': { rain: 0.4, wind: 0.35, whiteNoise: 0.2, chimes: 0.25, master: 0.7 },
      'High-Yield Arbitrage Focus': { rain: 0.15, wind: 0.6, whiteNoise: 0.35, chimes: 0.4, master: 0.65 },
      'Staking Sanctuary Zen': { rain: 0.5, wind: 0.25, whiteNoise: 0.15, chimes: 0.45, master: 0.75 }
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
    this.notifyListeners({ type: 'channel_gain', channel, gain: clamped });
    return clamped;
  }

  setMasterGain(val) {
    const clamped = this.clampGain(val);
    this.masterGain = clamped;
    this.notifyListeners({ type: 'master_gain', gain: clamped });
    return clamped;
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }
    this.activePreset = presetName;
    if (typeof preset.master === 'number') this.masterGain = this.clampGain(preset.master);
    if (typeof preset.rain === 'number') this.channels.rain.gain = this.clampGain(preset.rain);
    if (typeof preset.wind === 'number') this.channels.wind.gain = this.clampGain(preset.wind);
    if (typeof preset.whiteNoise === 'number') this.channels.whiteNoise.gain = this.clampGain(preset.whiteNoise);
    if (typeof preset.chimes === 'number') this.channels.chimes.gain = this.clampGain(preset.chimes);

    this.notifyListeners({ type: 'preset_applied', preset: presetName });
    return this.serializeState();
  }

  serializeState() {
    return {
      masterGain: this.masterGain,
      isPlaying: this.isPlaying,
      activePreset: this.activePreset,
      channels: {
        rain: { ...this.channels.rain },
        wind: { ...this.channels.wind },
        whiteNoise: { ...this.channels.whiteNoise },
        chimes: { ...this.channels.chimes }
      }
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notifyListeners(evt) {
    this.listeners.forEach(fn => {
      try {
        fn(evt, this.serializeState());
      } catch (err) {
        console.error('Error invoking soundscape listener', err);
      }
    });
  }

  startAmbience(preset = null) {
    if (preset && this.presets[preset]) {
      this.applyPreset(preset);
    }
    this.isPlaying = true;
    this.notifyListeners({ type: 'playback_state', isPlaying: true });
    return this.isPlaying;
  }

  stopAmbience() {
    this.isPlaying = false;
    this.notifyListeners({ type: 'playback_state', isPlaying: false });
    return this.isPlaying;
  }
}

// Browser DOM UI controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const synth = new DefiYieldMatrixSoundscapeSynth();

    const masterSlider = document.getElementById('master-gain-slider');
    const masterVal = document.getElementById('master-gain-val');
    const toggleBtn = document.getElementById('toggle-play-btn');
    const presetSelect = document.getElementById('preset-selector');
    const channelsContainer = document.getElementById('channels-container');
    const meterBars = document.querySelectorAll('.eq-bar');

    function updateUI() {
      if (masterSlider) masterSlider.value = synth.masterGain;
      if (masterVal) masterVal.textContent = `${Math.round(synth.masterGain * 100)}%`;
      if (toggleBtn) {
        toggleBtn.textContent = synth.isPlaying ? 'Mute Soundscape' : 'Start Soundscape';
        toggleBtn.className = synth.isPlaying ? 'sound-btn playing' : 'sound-btn';
      }
      if (presetSelect) presetSelect.value = synth.activePreset;

      Object.entries(synth.channels).forEach(([key, ch]) => {
        const slider = document.getElementById(`channel-${key}`);
        const label = document.getElementById(`channel-val-${key}`);
        if (slider) slider.value = ch.gain;
        if (label) label.textContent = `${Math.round(ch.gain * 100)}%`;
      });
    }

    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        synth.setMasterGain(parseFloat(e.target.value));
        updateUI();
      });
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (synth.isPlaying) {
          synth.stopAmbience();
        } else {
          synth.startAmbience();
        }
        updateUI();
      });
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        synth.applyPreset(e.target.value);
        updateUI();
      });
    }

    // Render channels safely
    if (channelsContainer) {
      channelsContainer.replaceChildren();
      Object.entries(synth.channels).forEach(([key, ch]) => {
        const row = document.createElement('div');
        row.className = 'channel-row';

        const info = document.createElement('div');
        info.className = 'channel-info';

        const name = document.createElement('span');
        name.className = 'channel-name';
        name.textContent = ch.name;

        const val = document.createElement('span');
        val.id = `channel-val-${key}`;
        val.className = 'channel-val';
        val.textContent = `${Math.round(ch.gain * 100)}%`;

        info.append(name, val);

        const input = document.createElement('input');
        input.type = 'range';
        input.id = `channel-${key}`;
        input.min = '0';
        input.max = '1';
        input.step = '0.01';
        input.value = ch.gain;
        input.className = 'channel-slider';
        input.addEventListener('input', (e) => {
          synth.adjustChannelGain(key, parseFloat(e.target.value));
          val.textContent = `${Math.round(parseFloat(e.target.value) * 100)}%`;
        });

        row.append(info, input);
        channelsContainer.append(row);
      });
    }

    // Simulated visualizer animation
    setInterval(() => {
      if (!synth.isPlaying) {
        meterBars.forEach(bar => { bar.style.height = '4px'; });
        return;
      }
      meterBars.forEach(bar => {
        const rand = Math.random() * synth.masterGain * 80 + 10;
        bar.style.height = `${Math.round(rand)}%`;
      });
    }, 150);

    updateUI();
  });
}
