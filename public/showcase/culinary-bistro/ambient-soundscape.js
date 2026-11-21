/**
 * CulinaryBistroSoundscapeSynth
 * Procedural Web Audio API ambient soundscape synthesizer and multi-channel acoustic mixer.
 */

export class CulinaryBistroSoundscapeSynth {
  constructor(options = {}) {
    this.masterGain = 0.7;
    this.isPlaying = false;
    this.activePreset = options.defaultPreset || "Parisian Cafe Morning";
    this.audioCtx = null;
    this.masterNode = null;
    this.activeNodes = new Map();
    this.listeners = [];

    this.channels = {
      rain: { name: "Cobblestone Street Rain (Pink)", gain: 0.3, type: 'pink' },
      wind: { name: "Patio Awning Breeze", gain: 0.45, type: 'bandpass' },
      whiteNoise: { name: "Espresso Steam & Room Noise (White)", gain: 0.35, type: 'white' },
      chimes: { name: "Porcelain & Wine Glass Chimes", gain: 0.4, type: 'harmonic' }
    };

    this.presets = {
      "Parisian Cafe Morning": {
            "rain": 0.3,
            "wind": 0.45,
            "whiteNoise": 0.35,
            "chimes": 0.4,
            "master": 0.7
      },
      "Tuscany Vineyard Evening": {
            "rain": 0.2,
            "wind": 0.55,
            "whiteNoise": 0.25,
            "chimes": 0.35,
            "master": 0.65
      },
      "Espresso Roastery Ambience": {
            "rain": 0.15,
            "wind": 0.4,
            "whiteNoise": 0.5,
            "chimes": 0.3,
            "master": 0.75
      }
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
        buffer[i] = (Math.random() * 2 - 1) * 0.2;
      }
    }
    return buffer;
  }

  startAmbience(presetName) {
    if (presetName) {
      this.applyPreset(presetName);
    }
    this.isPlaying = true;
    this.notify();
    return true;
  }

  stopAmbience() {
    this.isPlaying = false;
    this.notify();
    return false;
  }

  applyPreset(presetName) {
    const preset = this.presets[presetName];
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }
    this.activePreset = presetName;
    this.masterGain = preset.master;
    for (const [ch, val] of Object.entries(preset)) {
      if (this.channels[ch]) {
        this.channels[ch].gain = this.clampGain(val);
      }
    }
    this.notify();
  }

  adjustChannelGain(channel, val) {
    if (!this.channels[channel]) {
      throw new Error(`Unknown audio channel: ${channel}`);
    }
    this.channels[channel].gain = this.clampGain(val);
    this.notify();
  }

  adjustMasterGain(val) {
    this.masterGain = this.clampGain(val);
    this.notify();
  }

  serializeState() {
    return {
      activePreset: this.activePreset,
      masterGain: this.masterGain,
      isPlaying: this.isPlaying,
      channels: JSON.parse(JSON.stringify(this.channels))
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.serializeState());
    }
  }
}

// Interactive DOM binding
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const synth = new CulinaryBistroSoundscapeSynth();

    const toggleBtn = document.getElementById('toggle-play-btn');
    const visualizerCard = document.querySelector('.visualizer-card');
    const presetSelect = document.getElementById('preset-selector');
    const masterSlider = document.getElementById('master-gain-slider');
    const masterVal = document.getElementById('master-gain-val');
    const statusText = document.getElementById('mixer-status');

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

    function updateUI(state) {
      if (masterSlider) masterSlider.value = state.masterGain;
      if (masterVal) masterVal.textContent = `${Math.round(state.masterGain * 100)}%`;

      for (const [ch, data] of Object.entries(state.channels)) {
        if (channelSliders[ch]) channelSliders[ch].value = data.gain;
        if (channelVals[ch]) channelVals[ch].textContent = `${Math.round(data.gain * 100)}%`;
      }

      if (toggleBtn) {
        if (state.isPlaying) {
          toggleBtn.textContent = 'Mute Soundscape';
          toggleBtn.classList.add('playing');
          if (visualizerCard) visualizerCard.classList.add('playing');
          if (statusText) statusText.textContent = `Acoustic Engine Active • ${state.activePreset}`;
        } else {
          toggleBtn.textContent = 'Start Ambience';
          toggleBtn.classList.remove('playing');
          if (visualizerCard) visualizerCard.classList.remove('playing');
          if (statusText) statusText.textContent = 'Status: Standby • Procedural Audio Engine Ready';
        }
      }
    }

    synth.subscribe(updateUI);

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (synth.isPlaying) {
          synth.stopAmbience();
        } else {
          synth.startAmbience(presetSelect ? presetSelect.value : null);
        }
      });
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        synth.applyPreset(e.target.value);
      });
    }

    if (masterSlider) {
      masterSlider.addEventListener('input', (e) => {
        synth.adjustMasterGain(parseFloat(e.target.value));
      });
    }

    for (const [ch, slider] of Object.entries(channelSliders)) {
      if (slider) {
        slider.addEventListener('input', (e) => {
          synth.adjustChannelGain(ch, parseFloat(e.target.value));
        });
      }
    }
  });
}
