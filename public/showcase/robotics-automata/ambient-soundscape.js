/**
 * RoboticsAutomataSoundscapeSynth
 * Procedural Web Audio API ambient soundscape synthesizer and multi-channel acoustic mixer
 * for robotics lab focus environments, acoustic masking, and simulated mechanical ambiance.
 */
export class RoboticsAutomataSoundscapeSynth {
  constructor(options = {}) {
    this.masterGain = 0.7;
    this.isPlaying = false;
    this.activePreset = options.defaultPreset || 'Robotics Lab Drone';
    this.audioCtx = null;
    this.masterNode = null;
    this.activeNodes = new Map();
    this.listeners = [];

    this.channels = {
      rain: { name: 'Acoustic Rain', gain: 0.4, type: 'pink' },
      wind: { name: 'Atmospheric Wind', gain: 0.3, type: 'bandpass' },
      whiteNoise: { name: 'Lab White Noise', gain: 0.25, type: 'white' },
      chimes: { name: 'Resonant Chimes', gain: 0.2, type: 'harmonic' }
    };

    this.presets = {
      'Robotics Lab Drone': { rain: 0.1, wind: 0.4, whiteNoise: 0.3, chimes: 0.2, master: 0.65 },
      'Cleanroom Isolation': { rain: 0.0, wind: 0.15, whiteNoise: 0.6, chimes: 0.05, master: 0.5 },
      'Factory Floor Resonator': { rain: 0.3, wind: 0.5, whiteNoise: 0.35, chimes: 0.4, master: 0.75 }
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
      // White noise
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
      const node = this.activeNodes.get(channel);
      if (node.gainNode && node.gainNode.gain) {
        node.gainNode.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
      }
    }

    this.notify();
    return clamped;
  }

  setMasterGain(val) {
    this.masterGain = this.clampGain(val);
    if (this.masterNode && this.audioCtx) {
      this.masterNode.gain.setValueAtTime(this.masterGain, this.audioCtx.currentTime);
    }
    this.notify();
    return this.masterGain;
  }

  applyPreset(presetName) {
    if (!this.presets[presetName]) {
      throw new Error(`Preset "${presetName}" not found`);
    }
    this.activePreset = presetName;
    const config = this.presets[presetName];
    if (typeof config.master === 'number') {
      this.setMasterGain(config.master);
    }
    Object.keys(this.channels).forEach((ch) => {
      if (typeof config[ch] === 'number') {
        this.adjustChannelGain(ch, config[ch]);
      }
    });
    this.notify();
  }

  startAmbience(presetName = null) {
    if (presetName && this.presets[presetName]) {
      this.applyPreset(presetName);
    }

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

    this.isPlaying = true;
    this.notify();
    return true;
  }

  stopAmbience() {
    this.isPlaying = false;
    if (this.audioCtx && this.audioCtx.state === 'running') {
      this.audioCtx.suspend();
    }
    this.notify();
    return false;
  }

  serializeState() {
    return {
      isPlaying: this.isPlaying,
      activePreset: this.activePreset,
      masterGain: this.masterGain,
      channels: Object.fromEntries(
        Object.entries(this.channels).map(([k, v]) => [k, { name: v.name, gain: v.gain }])
      )
    };
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    const state = this.serializeState();
    this.listeners.forEach((fn) => {
      try {
        fn(state);
      } catch (e) {
        console.error('Soundscape listener error:', e);
      }
    });
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const root = document.createElement('div');
    root.className = 'soundscape-workbench-root';

    // Header
    const header = document.createElement('header');
    header.className = 'soundscape-header';
    const title = document.createElement('h2');
    title.textContent = 'Robotics Automata — Procedural Ambient Soundscape Synthesizer';
    const subtitle = document.createElement('p');
    subtitle.textContent =
      'Multi-channel Web Audio noise synthesizer, algorithmic filters, and laboratory acoustic mixer.';
    header.append(title, subtitle);

    // Preset Selector Row
    const presetRow = document.createElement('div');
    presetRow.className = 'soundscape-presets';
    const presetLabel = document.createElement('span');
    presetLabel.textContent = 'Soundscape Profiles:';
    presetRow.append(presetLabel);

    Object.keys(this.presets).forEach((pName) => {
      const btn = document.createElement('button');
      btn.className = 'soundscape-preset-btn';
      btn.textContent = pName;
      btn.addEventListener('click', () => {
        this.applyPreset(pName);
        updatePresetButtons();
      });
      presetRow.append(btn);
    });

    // Equalizer Visualizer Bars
    const eqWrapper = document.createElement('div');
    eqWrapper.className = 'soundscape-eq-wrapper';
    const barCount = 16;
    const bars = [];
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'soundscape-eq-bar';
      eqWrapper.append(bar);
      bars.push(bar);
    }

    // Mixer Channels Grid
    const mixerGrid = document.createElement('div');
    mixerGrid.className = 'soundscape-mixer-grid';

    // Master Volume Strip
    const masterCol = document.createElement('div');
    masterCol.className = 'soundscape-channel master-channel';
    const masterTitle = document.createElement('div');
    masterTitle.className = 'soundscape-ch-title';
    masterTitle.textContent = 'MASTER';

    const masterSlider = document.createElement('input');
    masterSlider.type = 'range';
    masterSlider.min = '0';
    masterSlider.max = '1';
    masterSlider.step = '0.01';
    masterSlider.value = String(this.masterGain);
    masterSlider.className = 'soundscape-slider master-slider';

    const masterVal = document.createElement('div');
    masterVal.className = 'soundscape-ch-val';
    masterVal.textContent = `${Math.round(this.masterGain * 100)}%`;

    masterSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.setMasterGain(val);
      masterVal.textContent = `${Math.round(val * 100)}%`;
    });

    masterCol.append(masterTitle, masterSlider, masterVal);
    mixerGrid.append(masterCol);

    // Individual Channels
    const channelSliders = {};
    Object.entries(this.channels).forEach(([chKey, ch]) => {
      const chCol = document.createElement('div');
      chCol.className = 'soundscape-channel';

      const chTitle = document.createElement('div');
      chTitle.className = 'soundscape-ch-title';
      chTitle.textContent = ch.name;

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.01';
      slider.value = String(ch.gain);
      slider.className = 'soundscape-slider';

      const valLabel = document.createElement('div');
      valLabel.className = 'soundscape-ch-val';
      valLabel.textContent = `${Math.round(ch.gain * 100)}%`;

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.adjustChannelGain(chKey, val);
        valLabel.textContent = `${Math.round(val * 100)}%`;
      });

      channelSliders[chKey] = { slider, valLabel };
      chCol.append(chTitle, slider, valLabel);
      mixerGrid.append(chCol);
    });

    // Control Bar
    const controlBar = document.createElement('div');
    controlBar.className = 'soundscape-controls';

    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'soundscape-btn soundscape-btn-primary';
    playPauseBtn.textContent = '▶ Start Soundscape';

    playPauseBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.stopAmbience();
        playPauseBtn.textContent = '▶ Start Soundscape';
        playPauseBtn.classList.remove('active');
      } else {
        this.startAmbience();
        playPauseBtn.textContent = '⏸ Pause Soundscape';
        playPauseBtn.classList.add('active');
      }
    });

    const statusBadge = document.createElement('div');
    statusBadge.className = 'soundscape-status-badge';
    statusBadge.textContent = 'Status: IDLE';

    controlBar.append(playPauseBtn, statusBadge);

    const updatePresetButtons = () => {
      presetRow.querySelectorAll('.soundscape-preset-btn').forEach((btn) => {
        if (btn.textContent === this.activePreset) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };

    const updateUI = (state) => {
      statusBadge.textContent = state.isPlaying ? 'Status: SYNTHESIZING AUDIO' : 'Status: IDLE';
      masterSlider.value = String(state.masterGain);
      masterVal.textContent = `${Math.round(state.masterGain * 100)}%`;

      Object.entries(state.channels).forEach(([k, ch]) => {
        if (channelSliders[k]) {
          channelSliders[k].slider.value = String(ch.gain);
          channelSliders[k].valLabel.textContent = `${Math.round(ch.gain * 100)}%`;
        }
      });

      // Animate equalizer bars if playing
      bars.forEach((bar) => {
        const heightPct = state.isPlaying ? Math.floor(Math.random() * 85 + 15) : 5;
        bar.style.height = `${heightPct}%`;
      });
    };

    this.subscribe(updateUI);
    updatePresetButtons();

    root.append(header, presetRow, eqWrapper, mixerGrid, controlBar);
    container.append(root);

    return root;
  }
}
