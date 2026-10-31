// Sonora AI Voice Studio & Neural Tuner Engine
// Real-time Pitch, Speed & Emotion Modulation

const VOICE_MODELS = {
  aria: {
    id: 'aria',
    name: 'Aria',
    tagline: 'Studio Warmth • Conversational',
    lang: 'en-US',
    basePitch: 1.0,
    baseSpeed: 1.0,
    baseFreq: 220,
    sampleText: 'Hello! I am Aria. You are listening to real-time neural synthesis with custom pitch and pacing.'
  },
  marcus: {
    id: 'marcus',
    name: 'Marcus',
    tagline: 'Deep Broadcast • Narration',
    lang: 'en-GB',
    basePitch: 0.85,
    baseSpeed: 0.95,
    baseFreq: 130,
    sampleText: 'Greetings. This is Marcus. Delivering broadcast authority, deep vocal formants, and resonance.'
  },
  elena: {
    id: 'elena',
    name: 'Elena',
    tagline: 'Cybernetic Synth • AI Assistant',
    lang: 'en-US',
    basePitch: 1.15,
    baseSpeed: 1.05,
    baseFreq: 280,
    sampleText: 'System operational. Elena neural synth online, calibrated for ultra-crisp phonetic clarity.'
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    tagline: 'Energetic Streamer • Dynamic',
    lang: 'en-US',
    basePitch: 1.25,
    baseSpeed: 1.20,
    baseFreq: 260,
    sampleText: "What's up! Leo here, running at maximum throttle with high-energy dynamic inflection!"
  }
};

const EMOTION_PRESETS = {
  neutral: {
    pitch: 1.00,
    speed: 1.00,
    title: 'Neutral 😐',
    feedback: 'Neutral emotion applied: balanced fundamental frequency and natural conversational pacing.'
  },
  cheerful: {
    pitch: 1.25,
    speed: 1.15,
    title: 'Cheerful 😊',
    feedback: 'Cheerful emotion applied: +3.9 semitone pitch contour and bright, uplifted tempo.'
  },
  professional: {
    pitch: 0.90,
    speed: 0.95,
    title: 'Professional 👔',
    feedback: 'Professional emotion applied: measured cadence with authoritative, grounded acoustic resonance.'
  },
  energetic: {
    pitch: 1.35,
    speed: 1.30,
    title: 'Energetic ⚡',
    feedback: 'Energetic emotion applied: high-impact pitch shift with rapid, dynamic speech rhythm.'
  }
};

// Global preview sample trigger
window.playVoiceSample = function playVoiceSample() {
  const previewBtn = document.getElementById('btnPreviewTunedVoice');
  if (previewBtn) {
    previewBtn.click();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initVoiceStudioTuner();
  initTtsStudio();
  initMultiTrackWaveform();
});

// ---------- Voice Studio Tuner Engine ----------
function initVoiceStudioTuner() {
  const tunerSection = document.getElementById('studioTuner');
  if (!tunerSection) return;

  const pitchInput = document.getElementById('tunerPitch');
  const speedInput = document.getElementById('tunerSpeed');
  const pitchVal = document.getElementById('tunerPitchVal');
  const speedVal = document.getElementById('tunerSpeedVal');
  const pitchSemitoneBadge = document.getElementById('pitchSemitoneBadge');
  const speedWpmBadge = document.getElementById('speedWpmBadge');
  const emotionBtns = document.querySelectorAll('.emotion-btn');
  const modelCards = document.querySelectorAll('.voice-model-card');
  const activeModelNameEl = document.getElementById('activeModelName');
  const activeEmotionNameEl = document.getElementById('activeEmotionName');
  const telemetryFreqEl = document.getElementById('telemetryFreq');
  const visualizerEl = document.getElementById('telemetryVisualizer');
  const previewBtn = document.getElementById('btnPreviewTunedVoice');
  const syncBtn = document.getElementById('btnSyncWithTTS');
  const resetBtn = document.getElementById('btnResetTuner');
  const feedbackEl = document.getElementById('tunerFeedback');

  let currentModelId = 'aria';
  let currentEmotion = 'neutral';
  let isPlayingAudio = false;
  let activeSampleButton = null;
  let activeSampleUtterance = null;

  function resetSampleButton(button) {
    if (!button) return;
    button.classList.remove('playing');
    button.querySelector('.sample-play-icon').textContent = '▶';
    button.querySelector('.sample-play-label').textContent = 'Play sample';
    const modelName = VOICE_MODELS[button.dataset.playSample]?.name || 'voice';
    button.title = 'Play ' + modelName + ' voice sample';
    button.setAttribute('aria-label', 'Play ' + modelName + ' voice sample');
  }

  function stopActiveSample() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    resetSampleButton(activeSampleButton);
    activeSampleButton = null;
    activeSampleUtterance = null;
  }

  function playModelSample(button) {
    const model = VOICE_MODELS[button.dataset.playSample];
    if (!model) return;

    if (activeSampleButton === button && activeSampleButton.classList.contains('playing')) {
      stopActiveSample();
      feedbackEl.textContent = model.name + ' sample stopped.';
      return;
    }

    stopActiveSample();
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      feedbackEl.textContent = 'Voice sample playback is not supported in this browser.';
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(model.sampleText);
    const voices = synth.getVoices();
    const voice = voices.find((candidate) => candidate.lang.startsWith(model.lang.slice(0, 2))) || voices[0];
    if (voice) utterance.voice = voice;
    utterance.lang = model.lang;
    utterance.pitch = model.basePitch;
    utterance.rate = model.baseSpeed;

    activeSampleButton = button;
    activeSampleUtterance = utterance;
    button.classList.add('playing');
    button.querySelector('.sample-play-icon').textContent = '■';
    button.querySelector('.sample-play-label').textContent = 'Playing…';
    button.title = 'Stop ' + model.name + ' voice sample';
    button.setAttribute('aria-label', 'Stop ' + model.name + ' voice sample');
    feedbackEl.textContent = 'Playing ' + model.name + ' voice sample…';

    const finish = () => {
      if (activeSampleUtterance !== utterance) return;
      resetSampleButton(activeSampleButton);
      activeSampleButton = null;
      activeSampleUtterance = null;
      feedbackEl.textContent = model.name + ' sample playback finished.';
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
  }

  // Update slider fill and telemetry readouts
  function updateSliderDisplay() {
    const pitch = parseFloat(pitchInput.value);
    const speed = parseFloat(speedInput.value);
    const model = VOICE_MODELS[currentModelId] || VOICE_MODELS.aria;

    // Pitch readouts
    pitchVal.textContent = pitch.toFixed(2) + 'x';
    // Semitones: 12 * log2(pitch)
    const semitones = 12 * (Math.log(pitch) / Math.LN2);
    pitchSemitoneBadge.textContent = (semitones >= 0 ? '+' : '') + semitones.toFixed(1) + ' st';

    // Speed readouts
    speedVal.textContent = speed.toFixed(2) + 'x';
    const estimatedWpm = Math.round(150 * speed);
    speedWpmBadge.textContent = estimatedWpm + ' WPM';

    // Telemetry frequency estimation
    const estimatedFreq = Math.round(model.baseFreq * pitch);
    telemetryFreqEl.textContent = estimatedFreq + ' Hz';

    // Custom track gradients
    const pitchPct = ((pitch - 0.5) / 1.5) * 100;
    pitchInput.style.background = `linear-gradient(to right, #06b6d4 0%, #3b82f6 ${pitchPct}%, #1e293b ${pitchPct}%, #1e293b 100%)`;

    const speedPct = ((speed - 0.5) / 1.5) * 100;
    speedInput.style.background = `linear-gradient(to right, #06b6d4 0%, #3b82f6 ${speedPct}%, #1e293b ${speedPct}%, #1e293b 100%)`;

    // Reactive visual feedback on active model card
    triggerCardReactiveFeedback(pitch, speed);
  }

  // Reactive feedback on model cards
  function triggerCardReactiveFeedback(pitch, speed) {
    const activeCard = document.querySelector(`.voice-model-card[data-model-id="${currentModelId}"]`);
    if (!activeCard) return;

    const waveBars = activeCard.querySelectorAll('.model-wave-anim i');
    waveBars.forEach((bar, idx) => {
      // Dynamic height based on pitch and bar index
      const baseHeight = 25 + (pitch - 0.5) * 40;
      const waveSpread = (idx % 2 === 0 ? 1 : 1.3);
      bar.style.height = Math.min(100, Math.max(15, baseHeight * waveSpread)) + '%';
      // Speed impacts animation duration
      bar.style.animationDuration = (0.9 / speed).toFixed(2) + 's';
    });
  }

  // Model Selection
  function selectModel(modelId) {
    if (!VOICE_MODELS[modelId]) return;
    currentModelId = modelId;
    const model = VOICE_MODELS[modelId];

    modelCards.forEach((card) => {
      const isCurrent = card.dataset.modelId === modelId;
      card.classList.toggle('active', isCurrent);
      const btn = card.querySelector('.select-model-btn');
      if (btn) {
        btn.textContent = isCurrent ? 'Selected' : 'Select Model';
      }
    });

    activeModelNameEl.textContent = `${model.name} (${model.tagline.split('•')[0].trim()})`;
    feedbackEl.textContent = `Active voice model switched to ${model.name}. Adjust Pitch and Speed sliders to calibrate voice output.`;

    updateSliderDisplay();
  }

  modelCards.forEach((card) => {
    card.addEventListener('click', () => {
      // Don't duplicate if clicking the button inside
      const modelId = card.dataset.modelId;
      if (modelId) selectModel(modelId);
    });

    const btn = card.querySelector('.select-model-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const modelId = card.dataset.modelId;
        if (modelId) selectModel(modelId);
      });
    }
  });

  // Voice sample previews: only one sample may play at a time.
  document.querySelectorAll('.sample-play-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      playModelSample(button);
    });
  });

  // Sliders Input Listeners
  pitchInput.addEventListener('input', () => {
    // If manually adjusted, clear active emotion button highlight if it doesn't match
    checkCustomEmotionState();
    updateSliderDisplay();
  });

  speedInput.addEventListener('input', () => {
    checkCustomEmotionState();
    updateSliderDisplay();
  });

  function checkCustomEmotionState() {
    const p = parseFloat(pitchInput.value);
    const s = parseFloat(speedInput.value);
    let matched = false;

    emotionBtns.forEach((btn) => {
      const ep = parseFloat(btn.dataset.pitch);
      const es = parseFloat(btn.dataset.speed);
      if (Math.abs(p - ep) < 0.02 && Math.abs(s - es) < 0.02) {
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        currentEmotion = btn.dataset.emotion;
        activeEmotionNameEl.textContent = EMOTION_PRESETS[currentEmotion].title;
        matched = true;
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-checked', 'false');
      }
    });

    if (!matched) {
      currentEmotion = 'custom';
      activeEmotionNameEl.textContent = 'Custom 🎛️';
    }
  }

  // Emotion Preset Selection
  emotionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const emotionKey = btn.dataset.emotion;
      const preset = EMOTION_PRESETS[emotionKey];
      if (!preset) return;

      currentEmotion = emotionKey;

      emotionBtns.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('active', isActive);
        b.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });

      // Smooth slider update
      pitchInput.value = preset.pitch.toFixed(2);
      speedInput.value = preset.speed.toFixed(2);

      activeEmotionNameEl.textContent = preset.title;
      feedbackEl.textContent = preset.feedback;

      updateSliderDisplay();
    });
  });

  // Audio synthesis helper for audio preview
  function playTunedAudio() {
    if (isPlayingAudio) return;

    const model = VOICE_MODELS[currentModelId] || VOICE_MODELS.aria;
    const pitch = parseFloat(pitchInput.value);
    const speed = parseFloat(speedInput.value);

    isPlayingAudio = true;
    previewBtn.disabled = true;
    visualizerEl.classList.add('active');
    feedbackEl.textContent = `Synthesizing ${model.name} [Pitch: ${pitch.toFixed(2)}x, Speed: ${speed.toFixed(2)}x, ${currentEmotion}]...`;

    // Attempt Web Speech API first
    if (window.speechSynthesis && window.SpeechSynthesisUtterance) {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(model.sampleText);
      const voices = synth.getVoices();

      // Find matching voice if available
      const voice = voices.find((v) => v.lang.startsWith(model.lang.slice(0, 2))) || voices[0];
      if (voice) utter.voice = voice;

      utter.pitch = Math.min(2, Math.max(0, pitch));
      utter.rate = Math.min(2, Math.max(0.5, speed));

      utter.onend = () => {
        isPlayingAudio = false;
        previewBtn.disabled = false;
        visualizerEl.classList.remove('active');
        feedbackEl.textContent = `Completed playback of ${model.name} sample.`;
      };

      utter.onerror = () => {
        fallbackOscillatorSynthesis(pitch, speed);
      };

      synth.speak(utter);
    } else {
      fallbackOscillatorSynthesis(pitch, speed);
    }
  }

  // Web Audio API harmonic synthesis fallback
  function fallbackOscillatorSynthesis(pitch, speed) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('No AudioContext');
      const ctx = new AudioCtx();

      const duration = 1.8 / speed;
      const baseFreq = (VOICE_MODELS[currentModelId]?.baseFreq || 220) * pitch;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, ctx.currentTime + duration * 0.5);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + duration);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);

      setTimeout(() => {
        isPlayingAudio = false;
        previewBtn.disabled = false;
        visualizerEl.classList.remove('active');
        feedbackEl.textContent = `Synthetic waveform audition finished.`;
      }, duration * 1000);
    } catch {
      isPlayingAudio = false;
      previewBtn.disabled = false;
      visualizerEl.classList.remove('active');
      feedbackEl.textContent = `Audio audition finished.`;
    }
  }

  previewBtn.addEventListener('click', playTunedAudio);

  // Sync to TTS Studio Form below
  syncBtn.addEventListener('click', () => {
    const ttsRate = document.getElementById('tts-rate');
    const ttsPitch = document.getElementById('tts-pitch');

    if (ttsRate && ttsPitch) {
      ttsRate.value = speedInput.value;
      ttsPitch.value = pitchInput.value;

      // Dispatch event to trigger lower form readouts
      ttsRate.dispatchEvent(new Event('input', { bubbles: true }));
      ttsPitch.dispatchEvent(new Event('input', { bubbles: true }));

      feedbackEl.textContent = `✓ Tuner settings synced to Text-to-Speech Studio (Rate: ${speedInput.value}x, Pitch: ${pitchInput.value}x).`;

      // Smooth scroll down to TTS studio
      const studioSection = document.getElementById('studio');
      if (studioSection) {
        studioSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  // Reset to Defaults
  resetBtn.addEventListener('click', () => {
    pitchInput.value = '1.0';
    speedInput.value = '1.0';
    selectModel('aria');

    const neutralBtn = document.querySelector('.emotion-btn[data-emotion="neutral"]');
    if (neutralBtn) neutralBtn.click();

    updateSliderDisplay();
    feedbackEl.textContent = `Tuner reset to default parameters (Pitch: 1.00x, Speed: 1.00x, Neutral).`;
  });

  // Initialize
  updateSliderDisplay();
}

// ---------- Existing Text-to-Speech Studio ----------
function initTtsStudio() {
  const form = document.getElementById('tts-form');
  if (!form) return;

  const textEl = document.getElementById('tts-text');
  const countEl = document.getElementById('tts-count');
  const voiceEl = document.getElementById('tts-voice');
  const voiceNote = document.getElementById('tts-voice-note');
  const rateEl = document.getElementById('tts-rate');
  const pitchEl = document.getElementById('tts-pitch');
  const rateOut = document.getElementById('tts-rate-out');
  const pitchOut = document.getElementById('tts-pitch-out');
  const playBtn = document.getElementById('tts-play');
  const pauseBtn = document.getElementById('tts-pause');
  const stopBtn = document.getElementById('tts-stop');
  const eq = document.getElementById('tts-eq');
  const statusEl = document.getElementById('tts-status');
  const unsupportedEl = document.getElementById('tts-unsupported');

  form.addEventListener('submit', (e) => e.preventDefault());

  // Slider read-outs and character counter work even without speech support.
  function updateReadouts() {
    rateOut.textContent = Number(rateEl.value).toFixed(1) + 'x';
    pitchOut.textContent = Number(pitchEl.value).toFixed(1);
  }
  function updateCount() {
    countEl.textContent = textEl.value.length + ' / ' + textEl.maxLength;
  }
  rateEl.addEventListener('input', updateReadouts);
  pitchEl.addEventListener('input', updateReadouts);
  textEl.addEventListener('input', updateCount);
  updateReadouts();
  updateCount();

  const supported = Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  if (!supported) {
    unsupportedEl.hidden = false;
    [textEl, voiceEl, rateEl, pitchEl, playBtn, pauseBtn, stopBtn].forEach((el) => { el.disabled = true; });
    statusEl.textContent = 'Speech synthesis is unavailable in this browser.';
    const opt = document.createElement('option');
    opt.textContent = 'No voices available';
    voiceEl.appendChild(opt);
    return;
  }

  const synth = window.speechSynthesis;
  let voices = [];
  let state = 'idle'; // idle | speaking | paused
  let current = null; // the utterance we started most recently

  // ---- voices -----------------------------------------------------
  function populateVoices() {
    voices = synth.getVoices();
    const previous = voiceEl.value;
    voiceEl.textContent = '';

    if (!voices.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Browser default voice';
      voiceEl.appendChild(opt);
      voiceNote.textContent = 'No voice list yet. The browser default will be used; the list fills in if voices load later.';
      return;
    }

    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = v.name + ' (' + v.lang + ')' + (v.default ? ' - default' : '');
      voiceEl.appendChild(opt);
    });

    const lang = (navigator.language || 'en-US').toLowerCase();
    const wanted = voices.find((v) => v.voiceURI === previous)
      || voices.find((v) => v.default)
      || voices.find((v) => v.lang.toLowerCase() === lang)
      || voices[0];
    voiceEl.value = wanted.voiceURI;
    voiceNote.textContent = voices.length + ' voice' + (voices.length === 1 ? '' : 's') + ' available on this device.';
  }

  populateVoices();
  if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', populateVoices);
  else synth.onvoiceschanged = populateVoices;

  // ---- state / UI ----------------------------------------------------
  function setState(next, message) {
    state = next;
    eq.classList.toggle('active', next === 'speaking');
    playBtn.textContent = next === 'paused' ? 'Resume' : 'Play';
    pauseBtn.disabled = next !== 'speaking';
    stopBtn.disabled = next === 'idle';
    playBtn.disabled = next === 'speaking';
    if (message) statusEl.textContent = message;
  }

  function speak() {
    if (state === 'paused') {
      synth.resume();
      setState('speaking', 'Speaking...');
      return;
    }
    const text = textEl.value.trim();
    if (!text) {
      statusEl.textContent = 'Type some text first, then press Play.';
      textEl.focus();
      return;
    }

    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const chosen = voices.find((v) => v.voiceURI === voiceEl.value);
    if (chosen) { utter.voice = chosen; utter.lang = chosen.lang; }
    utter.rate = parseFloat(rateEl.value);
    utter.pitch = parseFloat(pitchEl.value);

    utter.onstart = () => setState('speaking', 'Speaking...');
    utter.onend = () => { if (current === utter) setState('idle', 'Finished.'); };
    utter.onerror = (ev) => {
      if (current !== utter) return;
      if (ev.error === 'canceled' || ev.error === 'interrupted') return;
      setState('idle', 'Speech failed (' + (ev.error || 'unknown error') + ').');
    };

    current = utter;
    setState('speaking', 'Speaking...');
    synth.speak(utter);
  }

  playBtn.addEventListener('click', speak);

  pauseBtn.addEventListener('click', () => {
    if (state !== 'speaking') return;
    synth.pause();
    setState('paused', 'Paused. Press Resume to continue.');
  });

  stopBtn.addEventListener('click', () => {
    current = null;
    if (state === 'paused') synth.resume();
    synth.cancel();
    setState('idle', 'Stopped.');
  });

  [rateEl, pitchEl, voiceEl].forEach((el) => el.addEventListener('change', () => {
    if (state !== 'idle') statusEl.textContent = 'New settings apply the next time you press Play.';
  }));

  window.addEventListener('pagehide', () => synth.cancel());
  setState('idle');
}


// ===============================================================
// Interactive Multi-Track Audio Waveform Generator (Issue #175)
// ===============================================================
function initMultiTrackWaveform() {
  const canvas = document.getElementById('voiceWaveform');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const playBtn = document.getElementById('wfPlayBtn');
  const playLabel = document.getElementById('wfPlayLabel');
  const playIcon = document.getElementById('wfPlayIcon');
  const freezeBtn = document.getElementById('wfFreezeBtn');
  const gainSlider = document.getElementById('wfGainSlider');
  const gainValEl = document.getElementById('wfGainVal');
  const timecodeEl = document.getElementById('wfTimecode');
  const trackTabs = document.querySelectorAll('.track-tab');
  const styleBtns = document.querySelectorAll('.style-btn');

  // Waveform State
  let isPlaying = false;
  let isFrozen = false;
  let activeTrack = 'voice'; // 'voice', 'harmony', 'master'
  let visualStyle = 'bars';  // 'bars', 'wave', 'particles'
  let sensitivityGain = 1.0;
  let _animationFrameId = null;
  let elapsedSec = 0;
  let lastTimestamp = performance.now();

  const BANDS = 64;
  const currentLevels = new Float32Array(BANDS);
  const targetLevels = new Float32Array(BANDS);
  const peakLevels = new Float32Array(BANDS);
  const particles = [];

  // Generate initial frequency seeds
  for (let i = 0; i < BANDS; i++) {
    currentLevels[i] = 0.08 + Math.random() * 0.12;
    targetLevels[i] = currentLevels[i];
    peakLevels[i] = currentLevels[i];
  }

  // Pre-seed floating particles
  for (let p = 0; p < 45; p++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -0.3 - Math.random() * 1.2,
      radius: 1.5 + Math.random() * 2.5,
      alpha: 0.2 + Math.random() * 0.7,
      bandIdx: Math.floor(Math.random() * BANDS)
    });
  }

  // Track Profiles Configuration
  const TRACK_PROFILES = {
    voice: {
      name: 'Neural Voice',
      colorStart: '#06b6d4',
      colorMid: '#38bdf8',
      colorEnd: '#0284c7',
      glow: 'rgba(6, 182, 212, 0.4)',
      accent: '#38bdf8',
      freqFactor: 1.0,
      baseCenter: 24
    },
    harmony: {
      name: 'Ambient Harmony',
      colorStart: '#c084fc',
      colorMid: '#a855f7',
      colorEnd: '#7e22ce',
      glow: 'rgba(168, 85, 247, 0.4)',
      accent: '#c084fc',
      freqFactor: 0.7,
      baseCenter: 14
    },
    master: {
      name: 'Master Output',
      colorStart: '#ec4899',
      colorMid: '#f43f5e',
      colorEnd: '#be185d',
      glow: 'rgba(236, 72, 153, 0.4)',
      accent: '#f472b6',
      freqFactor: 1.2,
      baseCenter: 32
    }
  };

  // Helper: Retrieve active tuner parameters (pitch & speed)
  function getTunerModulation() {
    const pitchSlider = document.getElementById('tunerPitch');
    const speedSlider = document.getElementById('tunerSpeed');
    const pitch = pitchSlider ? parseFloat(pitchSlider.value) : 1.0;
    const speed = speedSlider ? parseFloat(speedSlider.value) : 1.0;
    return { pitch: Math.max(0.5, pitch), speed: Math.max(0.5, speed) };
  }

  // Simulation physics step
  function updatePhysics(dt) {
    if (isFrozen) return;

    const { pitch, speed } = getTunerModulation();
    const profile = TRACK_PROFILES[activeTrack] || TRACK_PROFILES.voice;

    if (isPlaying) {
      elapsedSec += dt * speed;
      if (elapsedSec > 3600) elapsedSec = 0;
    }

    const time = elapsedSec * 3.5 * profile.freqFactor;

    for (let i = 0; i < BANDS; i++) {
      if (isPlaying) {
        // Multi-frequency sinusoidal synthesis with harmonic resonance
        const distFromCenter = Math.abs(i - profile.baseCenter) / BANDS;

        // Formant envelope
        const formant = Math.exp(-distFromCenter * 3.5);

        // Sinusoidal rhythm waves
        const wave1 = Math.sin(time * 2.2 + i * 0.28 * pitch);
        const wave2 = Math.cos(time * 1.5 - i * 0.18);
        const wave3 = Math.sin(time * 4.8 + i * 0.45);
        const noise = (Math.random() - 0.5) * 0.15;

        let composite = (wave1 * 0.45 + wave2 * 0.35 + wave3 * 0.2 + noise) * formant;
        composite = Math.max(0.04, (composite + 0.4) * 0.85);

        targetLevels[i] = composite * sensitivityGain;
      } else {
        // Subtle ambient idle breathing
        const idleWave = Math.sin(performance.now() * 0.002 + i * 0.2);
        targetLevels[i] = (0.06 + Math.abs(idleWave) * 0.08) * sensitivityGain;
      }

      // Smooth lerp to target
      currentLevels[i] += (targetLevels[i] - currentLevels[i]) * 0.22;

      // Peak decay
      if (currentLevels[i] > peakLevels[i]) {
        peakLevels[i] = currentLevels[i];
      } else {
        peakLevels[i] -= 0.015;
      }
      if (peakLevels[i] < 0.05) peakLevels[i] = 0.05;
    }

    // Format timecode (MM:SS.ms)
    const mins = Math.floor(elapsedSec / 60);
    const secs = Math.floor(elapsedSec % 60);
    const centis = Math.floor((elapsedSec * 100) % 100);
    if (timecodeEl) {
      timecodeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')} / 05:00.00`;
    }
  }

  // Render loop
  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    const profile = TRACK_PROFILES[activeTrack] || TRACK_PROFILES.voice;

    ctx.clearRect(0, 0, w, h);

    // Baseline axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.lineTo(w, h * 0.88);
    ctx.stroke();

    if (visualStyle === 'bars') {
      renderSpectrumBars(w, h, profile);
    } else if (visualStyle === 'wave') {
      renderOscilloscopeWave(w, h, profile);
    } else if (visualStyle === 'particles') {
      renderFrequencyParticles(w, h, profile);
    }

    // Interactive connection to header sample play buttons:
    // If a sample is playing in Voice Models, sync active visualizer state!
    const anySamplePlaying = document.querySelector('.sample-play-btn.is-playing');
    if (anySamplePlaying && !isPlaying) {
      setVisualizerPlaying(true);
    }
  }

  // 1. Spectrum Bars Render
  function renderSpectrumBars(w, h, profile) {
    const barSpacing = 3;
    const totalSpacing = (BANDS - 1) * barSpacing;
    const barWidth = Math.max(3, (w - totalSpacing) / BANDS);
    const maxBarHeight = h * 0.76;
    const baseY = h * 0.88;

    for (let i = 0; i < BANDS; i++) {
      const x = i * (barWidth + barSpacing);
      const level = Math.min(1.0, currentLevels[i]);
      const barH = Math.max(4, level * maxBarHeight);
      const y = baseY - barH;

      // Vertical Bar Gradient
      const barGrad = ctx.createLinearGradient(x, baseY, x, y);
      barGrad.addColorStop(0, profile.colorEnd);
      barGrad.addColorStop(0.6, profile.colorMid);
      barGrad.addColorStop(1, profile.colorStart);

      ctx.fillStyle = barGrad;
      ctx.shadowColor = profile.glow;
      ctx.shadowBlur = level > 0.5 ? 12 : 4;

      // Rounded top bar
      ctx.beginPath();
      const r = Math.min(barWidth / 2, 4);
      if (ctx.roundRect) {
        ctx.roundRect(x, y, barWidth, barH, [r, r, 0, 0]);
      } else {
        ctx.rect(x, y, barWidth, barH);
      }
      ctx.fill();

      // Peak hold indicator caps
      const peakY = baseY - Math.min(1.0, peakLevels[i]) * maxBarHeight - 3;
      ctx.fillStyle = profile.accent;
      ctx.shadowColor = profile.accent;
      ctx.shadowBlur = 8;
      ctx.fillRect(x, Math.max(6, peakY), barWidth, 2);

      // Subtle reflection under baseline
      ctx.fillStyle = profile.colorEnd;
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x, baseY + 2, barWidth, barH * 0.25);
      ctx.globalAlpha = 1.0;
    }
    ctx.shadowBlur = 0;
  }

  // 2. Continuous Oscilloscope Wave
  function renderOscilloscopeWave(w, h, profile) {
    const centerY = h * 0.52;
    const maxAmp = h * 0.42;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < BANDS; i++) {
      const x = (i / (BANDS - 1)) * w;
      const level = currentLevels[i];
      const sign = (i % 2 === 0 ? 1 : -1);
      const y = centerY + sign * level * maxAmp;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = ((i - 1) / (BANDS - 1)) * w;
        const prevY = centerY + (i % 2 !== 0 ? 1 : -1) * currentLevels[i - 1] * maxAmp;
        const midX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + y) / 2);
      }
    }

    ctx.strokeStyle = profile.colorStart;
    ctx.lineWidth = 3;
    ctx.shadowColor = profile.glow;
    ctx.shadowBlur = 18;
    ctx.stroke();

    // Mirror harmonic shadow wave
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    for (let i = 0; i < BANDS; i++) {
      const x = (i / (BANDS - 1)) * w;
      const level = currentLevels[i] * 0.5;
      const sign = (i % 2 === 0 ? -1 : 1);
      const y = centerY + sign * level * maxAmp;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = profile.colorEnd;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // 3. Floating Frequency Particles
  function renderFrequencyParticles(w, h, profile) {
    renderSpectrumBars(w, h, profile); // background bars with lowered opacity

    particles.forEach((pt) => {
      if (!isFrozen && isPlaying) {
        pt.x += pt.vx;
        pt.y += pt.vy * (1 + currentLevels[pt.bandIdx] * 2);

        if (pt.y < 0) {
          pt.y = h * 0.88;
          pt.x = Math.random() * w;
        }
        if (pt.x < 0) pt.x = w;
        if (pt.x > w) pt.x = 0;
      }

      const bandEnergy = currentLevels[pt.bandIdx];
      const radius = pt.radius * (1 + bandEnergy * 1.5);

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = profile.colorStart;
      ctx.globalAlpha = Math.min(1.0, pt.alpha + bandEnergy * 0.5);
      ctx.shadowColor = profile.glow;
      ctx.shadowBlur = 10;
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
  }

  // Animation Loop
  function loop(now) {
    const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
    lastTimestamp = now;

    updatePhysics(dt);
    draw();

    _animationFrameId = requestAnimationFrame(loop);
  }

  // Controller Functions
  function setVisualizerPlaying(state) {
    isPlaying = state;
    if (playBtn) {
      playBtn.classList.toggle('is-playing', isPlaying);
      if (playLabel) playLabel.textContent = isPlaying ? 'Pause Real-Time Stream' : 'Start Real-Time Stream';
      if (playIcon) playIcon.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  // Event Listeners
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      setVisualizerPlaying(!isPlaying);
      if (isFrozen) {
        isFrozen = false;
        if (freezeBtn) freezeBtn.classList.remove('is-frozen');
      }
    });
  }

  if (freezeBtn) {
    freezeBtn.addEventListener('click', () => {
      isFrozen = !isFrozen;
      freezeBtn.classList.toggle('is-frozen', isFrozen);
      freezeBtn.querySelector('span').textContent = isFrozen ? '▶ Unfreeze' : '❄️ Freeze';
    });
  }

  if (gainSlider) {
    gainSlider.addEventListener('input', (e) => {
      sensitivityGain = parseFloat(e.target.value);
      if (gainValEl) gainValEl.textContent = `${sensitivityGain.toFixed(1)}x`;
    });
  }

  trackTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      trackTabs.forEach((t) => {
        const isCurrent = (t === tab);
        t.classList.toggle('active', isCurrent);
        t.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      });
      activeTrack = tab.getAttribute('data-track') || 'voice';
    });
  });

  styleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      styleBtns.forEach((b) => b.classList.toggle('active', b === btn));
      visualStyle = btn.getAttribute('data-style') || 'bars';
    });
  });

  // Responsive Canvas Resize Observer
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const rect = entry.contentRect;
      if (rect.width > 0) {
        canvas.width = Math.floor(rect.width * window.devicePixelRatio || 1);
        canvas.height = Math.floor(rect.height * window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      }
    }
  });
  if (canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement);
  }

  // Start animated frame loop
  _animationFrameId = requestAnimationFrame(loop);

  // Hook into tuner preview button to automatically trigger audio visualization
  const tunerPreviewBtn = document.getElementById('btnPreviewTunedVoice');
  if (tunerPreviewBtn) {
    tunerPreviewBtn.addEventListener('click', () => {
      setVisualizerPlaying(true);
      setTimeout(() => {
        if (!document.querySelector('.sample-play-btn.is-playing')) {
          // let it run or settle
        }
      }, 3500);
    });
  }
}
