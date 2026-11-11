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
  initDawTimeline();
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
  const sampleAudioSettings = {
  aria: { volume: 1, previousVolume: 1, muted: false },
  marcus: { volume: 1, previousVolume: 1, muted: false },
  elena: { volume: 1, previousVolume: 1, muted: false },
  leo: { volume: 1, previousVolume: 1, muted: false }
  };

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
    const audioSettings = sampleAudioSettings[button.dataset.playSample];
    utterance.volume = audioSettings.muted ? 0 : audioSettings.volume;

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

  // Individual voice sample volume and mute controls.
  document.querySelectorAll('.sample-audio-controls').forEach((controls) => {
    const modelId = controls.dataset.model;
    const settings = sampleAudioSettings[modelId];

    if (!settings) return;

    const slider = controls.querySelector('.sample-volume-slider');
    const output = controls.querySelector('.sample-volume-label output');
    const muteBtn = controls.querySelector('.sample-mute-btn');

    function updateVolumeUI() {
      slider.value = settings.volume;
      output.textContent = `${Math.round(settings.volume * 100)}%`;

      muteBtn.textContent = settings.muted ? '🔇 Unmute' : '🔊 Mute';
      muteBtn.setAttribute('aria-pressed', String(settings.muted));
      muteBtn.setAttribute(
        'aria-label',
        `${settings.muted ? 'Unmute' : 'Mute'} ${modelId} preview`
      );
    }

    slider.addEventListener('input', () => {
      settings.volume = Number(slider.value);

      if (settings.volume > 0) {
        settings.previousVolume = settings.volume;
        settings.muted = false;
      } else {
        settings.muted = true;
      }

      if (
        activeSampleUtterance &&
        activeSampleButton?.dataset.playSample === modelId
      ) {
        activeSampleUtterance.volume = settings.muted ? 0 : settings.volume;
      }

      updateVolumeUI();
    });

    muteBtn.addEventListener('click', (event) => {
      event.stopPropagation();

      if (settings.muted) {
        settings.muted = false;
        settings.volume = settings.previousVolume || 1;
      } else {
        settings.previousVolume = settings.volume || 1;
        settings.muted = true;
      }

      if (
        activeSampleUtterance &&
        activeSampleButton?.dataset.playSample === modelId
      ) {
        activeSampleUtterance.volume = settings.muted ? 0 : settings.volume;
      }

      updateVolumeUI();
    });

    updateVolumeUI();
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


// ==========================================================================
// Multi-Track Audio Timeline Editor (DAW) Engine
// Handles clip boundaries, track trimming, gain modulation & WAV mixdown
// ==========================================================================
function initDawTimeline() {
  const dawSection = document.getElementById('daw-timeline');
  if (!dawSection) return;

  const PIXELS_PER_SECOND = 60; // 1 second = 60px
  const TOTAL_DURATION = 16.0;   // 16 seconds timeline

  // State
  const state = {
    isPlaying: false,
    currentTime: 0.0,
    loop: false,
    snap: 0.5,
    tracks: {
      voice: {
        volume: 1.0,
        muted: false,
        solo: false,
        clip: {
          start: 1.0,
          rawDuration: 6.0,
          trimStart: 0.0,
          trimEnd: 0.0
        }
      },
      ambience: {
        volume: 0.6,
        muted: false,
        solo: false,
        preset: 'rain',
        clip: {
          start: 0.0,
          rawDuration: 12.0,
          trimStart: 0.0,
          trimEnd: 0.0
        }
      }
    }
  };

  let audioCtx = null;
  let activeNodes = [];
  let playbackStartTime = 0;
  let animId = null;

  // DOM Elements
  const playBtn = document.getElementById('dawPlayBtn');
  const playIcon = document.getElementById('dawPlayIcon');
  const playText = document.getElementById('dawPlayText');
  const stopBtn = document.getElementById('dawStopBtn');
  const loopBtn = document.getElementById('dawLoopBtn');
  const timecodeEl = document.getElementById('dawTimecode');
  const snapSelect = document.getElementById('dawSnapSelect');
  const exportBtn = document.getElementById('dawExportBtn');
  const statusBar = document.getElementById('dawStatusBar');
  const rulerEl = document.getElementById('dawRuler');
  const playheadEl = document.getElementById('dawPlayhead');
  const scrollableEl = document.getElementById('dawTimelineScrollable');

  // Track 1 DOM
  const muteVoiceBtn = document.getElementById('dawMuteVoice');
  const soloVoiceBtn = document.getElementById('dawSoloVoice');
  const volVoiceInput = document.getElementById('dawVolVoice');
  const volVoiceVal = document.getElementById('dawVolVoiceVal');
  const clipVoiceEl = document.getElementById('dawClipVoice');
  const voiceDurEl = document.getElementById('dawVoiceDuration');
  const waveVoiceCanvas = document.getElementById('dawWaveformVoice');

  // Track 2 DOM
  const muteAmbienceBtn = document.getElementById('dawMuteAmbience');
  const soloAmbienceBtn = document.getElementById('dawSoloAmbience');
  const volAmbienceInput = document.getElementById('dawVolAmbience');
  const volAmbienceVal = document.getElementById('dawVolAmbienceVal');
  const ambiencePresetSelect = document.getElementById('dawAmbiencePreset');
  const clipAmbienceEl = document.getElementById('dawClipAmbience');
  const ambienceDurEl = document.getElementById('dawAmbienceDuration');
  const waveAmbienceCanvas = document.getElementById('dawWaveformAmbience');

  // Helper to format time seconds to 00:00.00
  function formatTime(s) {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  function updateTimecode() {
    if (timecodeEl) {
      timecodeEl.textContent = `${formatTime(state.currentTime)} / ${formatTime(TOTAL_DURATION)}`;
    }
    if (playheadEl) {
      playheadEl.style.left = `${state.currentTime * PIXELS_PER_SECOND}px`;
    }
  }

  // Render Time Ruler ticks
  function renderRuler() {
    if (!rulerEl) return;
    rulerEl.innerHTML = '';
    const totalSeconds = Math.ceil(TOTAL_DURATION);
    for (let s = 0; s <= totalSeconds; s++) {
      const tick = document.createElement('div');
      tick.className = 'daw-ruler-tick';
      tick.style.left = `${s * PIXELS_PER_SECOND}px`;
      tick.textContent = `${s}s`;
      rulerEl.appendChild(tick);
    }
  }

  // Draw simulated waveform bars on canvas
  function drawWaveform(canvas, color, count, seed) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = color;
    const barWidth = w / count;
    for (let i = 0; i < count; i++) {
      const angle = (i * seed * 0.15);
      const amp = Math.sin(angle) * 0.35 + Math.cos(angle * 2.3) * 0.25 + 0.4;
      const barH = Math.max(4, amp * (h - 10));
      const y = (h - barH) / 2;
      ctx.fillRect(i * barWidth + 1, y, Math.max(1, barWidth - 2), barH);
    }
  }

  function updateClipDom(trackKey, clipEl, durEl, canvas) {
    const track = state.tracks[trackKey];
    const effectiveDur = Math.max(0.2, track.clip.rawDuration - track.clip.trimStart - track.clip.trimEnd);
    const leftPx = track.clip.start * PIXELS_PER_SECOND;
    const widthPx = effectiveDur * PIXELS_PER_SECOND;

    clipEl.style.left = `${leftPx}px`;
    clipEl.style.width = `${widthPx}px`;
    clipEl.setAttribute('aria-valuenow', track.clip.start.toFixed(1));
    durEl.textContent = `${effectiveDur.toFixed(1)}s`;

    if (canvas) {
      canvas.width = Math.max(50, Math.floor(widthPx));
      const color = trackKey === 'voice' ? 'rgba(56, 189, 248, 0.75)' : 'rgba(192, 132, 252, 0.75)';
      const seed = trackKey === 'voice' ? 4.2 : 2.7;
      drawWaveform(canvas, color, Math.floor(widthPx / 4), seed);
    }
  }

  function refreshAllClips() {
    updateClipDom('voice', clipVoiceEl, voiceDurEl, waveVoiceCanvas);
    updateClipDom('ambience', clipAmbienceEl, ambienceDurEl, waveAmbienceCanvas);
  }

  // Snap a time value to current grid resolution
  function snapTime(val) {
    if (state.snap <= 0) return Math.max(0, val);
    return Math.max(0, Math.round(val / state.snap) * state.snap);
  }

  // Setup interactive drag & trim handles
  function setupClipInteraction(trackKey, clipEl) {
    let activeDrag = null; // 'move', 'trim-left', 'trim-right'
    let startX = 0;
    let initialStart = 0;
    let initialTrimStart = 0;
    let initialTrimEnd = 0;

    clipEl.addEventListener('mousedown', (e) => {
      const target = e.target;
      startX = e.clientX;
      const track = state.tracks[trackKey];
      initialStart = track.clip.start;
      initialTrimStart = track.clip.trimStart;
      initialTrimEnd = track.clip.trimEnd;

      if (target.classList.contains('daw-trim-left')) {
        activeDrag = 'trim-left';
      } else if (target.classList.contains('daw-trim-right')) {
        activeDrag = 'trim-right';
      } else {
        activeDrag = 'move';
      }

      e.preventDefault();
      document.body.style.cursor = activeDrag === 'move' ? 'grabbing' : 'ew-resize';

      const onMouseMove = (moveEvt) => {
        if (!activeDrag) return;
        const deltaPx = moveEvt.clientX - startX;
        const deltaSec = deltaPx / PIXELS_PER_SECOND;

        if (activeDrag === 'move') {
          const newStart = snapTime(initialStart + deltaSec);
          track.clip.start = Math.max(0, Math.min(TOTAL_DURATION - 0.5, newStart));
          statusBar.textContent = `[${trackKey.toUpperCase()}] Moved clip start to ${track.clip.start.toFixed(2)}s`;
        } else if (activeDrag === 'trim-left') {
          const maxTrim = track.clip.rawDuration - track.clip.trimEnd - 0.5;
          const newTrim = Math.max(0, Math.min(maxTrim, initialTrimStart + deltaSec));
          track.clip.trimStart = snapTime(newTrim);
          statusBar.textContent = `[${trackKey.toUpperCase()}] Trimmed head: +${track.clip.trimStart.toFixed(2)}s`;
        } else if (activeDrag === 'trim-right') {
          const maxTrim = track.clip.rawDuration - track.clip.trimStart - 0.5;
          const newTrim = Math.max(0, Math.min(maxTrim, initialTrimEnd - deltaSec));
          track.clip.trimEnd = snapTime(newTrim);
          statusBar.textContent = `[${trackKey.toUpperCase()}] Trimmed tail: -${track.clip.trimEnd.toFixed(2)}s`;
        }

        refreshAllClips();
      };

      const onMouseUp = () => {
        activeDrag = null;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // Audio Graph Engine
  function getAudioContext() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function stopAudio() {
    activeNodes.forEach((node) => {
      try { node.stop(); } catch { /* ignore already stopped */ }
      try { node.disconnect(); } catch { /* ignore */ }
    });
    activeNodes = [];
  }

  function playTimeline() {
    const ctx = getAudioContext();
    stopAudio();

    const now = ctx.currentTime;
    playbackStartTime = now - state.currentTime;

    const hasSolo = state.tracks.voice.solo || state.tracks.ambience.solo;

    // Schedule Track 1: Voice Synth (Formant speech simulation)
    const voiceTrack = state.tracks.voice;
    const isVoiceAudible = (!voiceTrack.muted && (!hasSolo || voiceTrack.solo));
    const voiceStart = voiceTrack.clip.start;
    const voiceDur = Math.max(0.1, voiceTrack.clip.rawDuration - voiceTrack.clip.trimStart - voiceTrack.clip.trimEnd);
    const voiceEnd = voiceStart + voiceDur;

    if (isVoiceAudible && state.currentTime < voiceEnd) {
      const offsetInClip = Math.max(0, state.currentTime - voiceStart);
      const scheduleTime = Math.max(0, voiceStart - state.currentTime);

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now + scheduleTime);
      // Frequency speech contour
      osc.frequency.exponentialRampToValueAtTime(240, now + scheduleTime + 1.2);
      osc.frequency.exponentialRampToValueAtTime(170, now + scheduleTime + voiceDur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, now + scheduleTime);
      filter.Q.setValueAtTime(4.0, now + scheduleTime);

      gainNode.gain.setValueAtTime(0.001, now + scheduleTime);
      gainNode.gain.exponentialRampToValueAtTime(voiceTrack.volume * 0.4, now + scheduleTime + 0.1);
      gainNode.gain.setValueAtTime(voiceTrack.volume * 0.4, now + scheduleTime + (voiceDur - offsetInClip) - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + scheduleTime + (voiceDur - offsetInClip));

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + scheduleTime);
      osc.stop(now + scheduleTime + (voiceDur - offsetInClip));
      activeNodes.push(osc);
    }

    // Schedule Track 2: Ambience (Pink/white noise or resonant drone)
    const ambTrack = state.tracks.ambience;
    const isAmbAudible = (!ambTrack.muted && (!hasSolo || ambTrack.solo));
    const ambStart = ambTrack.clip.start;
    const ambDur = Math.max(0.1, ambTrack.clip.rawDuration - ambTrack.clip.trimStart - ambTrack.clip.trimEnd);
    const ambEnd = ambStart + ambDur;

    if (isAmbAudible && state.currentTime < ambEnd) {
      const offsetInClip = Math.max(0, state.currentTime - ambStart);
      const scheduleTime = Math.max(0, ambStart - state.currentTime);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const ambGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      if (ambTrack.preset === 'rain') {
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(65, now + scheduleTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now + scheduleTime);
      } else if (ambTrack.preset === 'drone') {
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(110, now + scheduleTime);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now + scheduleTime);
      } else {
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(80, now + scheduleTime);
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now + scheduleTime);
      }

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(112, now + scheduleTime);

      ambGain.gain.setValueAtTime(0.001, now + scheduleTime);
      ambGain.gain.exponentialRampToValueAtTime(ambTrack.volume * 0.25, now + scheduleTime + 0.2);
      ambGain.gain.setValueAtTime(ambTrack.volume * 0.25, now + scheduleTime + (ambDur - offsetInClip) - 0.2);
      ambGain.gain.exponentialRampToValueAtTime(0.001, now + scheduleTime + (ambDur - offsetInClip));

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(ambGain);
      ambGain.connect(ctx.destination);

      osc1.start(now + scheduleTime);
      osc1.stop(now + scheduleTime + (ambDur - offsetInClip));
      osc2.start(now + scheduleTime);
      osc2.stop(now + scheduleTime + (ambDur - offsetInClip));
      activeNodes.push(osc1, osc2);
    }

    state.isPlaying = true;
    playIcon.textContent = '⏸';
    playText.textContent = 'Pause';
    statusBar.textContent = 'Playing multi-track timeline...';

    function tick() {
      if (!state.isPlaying) return;
      const elapsed = ctx.currentTime - playbackStartTime;
      state.currentTime = elapsed;

      if (state.currentTime >= TOTAL_DURATION) {
        if (state.loop) {
          state.currentTime = 0;
          playTimeline();
          return;
        } else {
          stopTimeline();
          state.currentTime = 0;
          updateTimecode();
          return;
        }
      }

      updateTimecode();
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
  }

  function pauseTimeline() {
    state.isPlaying = false;
    stopAudio();
    if (animId) cancelAnimationFrame(animId);
    playIcon.textContent = '▶';
    playText.textContent = 'Resume Timeline';
    statusBar.textContent = `Paused at ${state.currentTime.toFixed(2)}s.`;
  }

  function stopTimeline() {
    state.isPlaying = false;
    stopAudio();
    if (animId) cancelAnimationFrame(animId);
    state.currentTime = 0.0;
    updateTimecode();
    playIcon.textContent = '▶';
    playText.textContent = 'Play Timeline';
    statusBar.textContent = 'Timeline stopped and rewound to 00:00.00.';
  }

  // Ruler scrub interaction
  if (rulerEl) {
    rulerEl.addEventListener('click', (e) => {
      const rect = rulerEl.getBoundingClientRect();
      const clickX = e.clientX - rect.left + scrollableEl.scrollLeft;
      const newTime = Math.max(0, Math.min(TOTAL_DURATION, clickX / PIXELS_PER_SECOND));
      state.currentTime = snapTime(newTime);
      updateTimecode();
      if (state.isPlaying) {
        playTimeline();
      }
    });
  }

  // Transport button events
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      if (state.isPlaying) {
        pauseTimeline();
      } else {
        playTimeline();
      }
    });
  }

  if (stopBtn) {
    stopBtn.addEventListener('click', stopTimeline);
  }

  if (loopBtn) {
    loopBtn.addEventListener('click', () => {
      state.loop = !state.loop;
      loopBtn.setAttribute('aria-pressed', String(state.loop));
      statusBar.textContent = state.loop ? 'Timeline looping enabled.' : 'Timeline looping disabled.';
    });
  }

  if (snapSelect) {
    snapSelect.addEventListener('change', (e) => {
      state.snap = parseFloat(e.target.value);
      statusBar.textContent = `Grid snap set to ${e.target.options[e.target.selectedIndex].text}.`;
    });
  }

  // Track Faders & Buttons
  if (volVoiceInput) {
    volVoiceInput.addEventListener('input', (e) => {
      state.tracks.voice.volume = parseFloat(e.target.value);
      volVoiceVal.textContent = `${Math.round(state.tracks.voice.volume * 100)}%`;
    });
  }

  if (volAmbienceInput) {
    volAmbienceInput.addEventListener('input', (e) => {
      state.tracks.ambience.volume = parseFloat(e.target.value);
      volAmbienceVal.textContent = `${Math.round(state.tracks.ambience.volume * 100)}%`;
    });
  }

  if (ambiencePresetSelect) {
    ambiencePresetSelect.addEventListener('change', (e) => {
      state.tracks.ambience.preset = e.target.value;
      statusBar.textContent = `Ambience soundscape set to: ${e.target.options[e.target.selectedIndex].text}`;
    });
  }

  if (muteVoiceBtn) {
    muteVoiceBtn.addEventListener('click', () => {
      state.tracks.voice.muted = !state.tracks.voice.muted;
      muteVoiceBtn.setAttribute('aria-pressed', String(state.tracks.voice.muted));
      if (state.isPlaying) playTimeline();
    });
  }

  if (muteAmbienceBtn) {
    muteAmbienceBtn.addEventListener('click', () => {
      state.tracks.ambience.muted = !state.tracks.ambience.muted;
      muteAmbienceBtn.setAttribute('aria-pressed', String(state.tracks.ambience.muted));
      if (state.isPlaying) playTimeline();
    });
  }

  if (soloVoiceBtn) {
    soloVoiceBtn.addEventListener('click', () => {
      state.tracks.voice.solo = !state.tracks.voice.solo;
      soloVoiceBtn.setAttribute('aria-pressed', String(state.tracks.voice.solo));
      if (state.isPlaying) playTimeline();
    });
  }

  if (soloAmbienceBtn) {
    soloAmbienceBtn.addEventListener('click', () => {
      state.tracks.ambience.solo = !state.tracks.ambience.solo;
      soloAmbienceBtn.setAttribute('aria-pressed', String(state.tracks.ambience.solo));
      if (state.isPlaying) playTimeline();
    });
  }

  // WAV Mixdown Export Utility using OfflineAudioContext
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  function audioBufferToWav(buffer) {
    const numChannels = 1;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * bytesPerSample;
    const bufferSize = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    const channelData = buffer.getChannelData(0);
    let offset = 44;
    for (let i = 0; i < channelData.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        statusBar.textContent = 'Rendering 16-bit PCM multi-track audio mixdown...';
        const sampleRate = 44100;
        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const offlineCtx = new OfflineContext(1, Math.floor(sampleRate * TOTAL_DURATION), sampleRate);

        const hasSolo = state.tracks.voice.solo || state.tracks.ambience.solo;

        // Render Voice Track
        const voiceTrack = state.tracks.voice;
        if (!voiceTrack.muted && (!hasSolo || voiceTrack.solo)) {
          const vStart = voiceTrack.clip.start;
          const vDur = Math.max(0.1, voiceTrack.clip.rawDuration - voiceTrack.clip.trimStart - voiceTrack.clip.trimEnd);

          const osc = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          const filter = offlineCtx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(180, vStart);
          osc.frequency.exponentialRampToValueAtTime(240, vStart + 1.2);
          osc.frequency.exponentialRampToValueAtTime(170, vStart + vDur);

          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, vStart);

          gain.gain.setValueAtTime(0.001, vStart);
          gain.gain.exponentialRampToValueAtTime(voiceTrack.volume * 0.4, vStart + 0.1);
          gain.gain.setValueAtTime(voiceTrack.volume * 0.4, vStart + vDur - 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, vStart + vDur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(offlineCtx.destination);

          osc.start(vStart);
          osc.stop(vStart + vDur);
        }

        // Render Ambience Track
        const ambTrack = state.tracks.ambience;
        if (!ambTrack.muted && (!hasSolo || ambTrack.solo)) {
          const aStart = ambTrack.clip.start;
          const aDur = Math.max(0.1, ambTrack.clip.rawDuration - ambTrack.clip.trimStart - ambTrack.clip.trimEnd);

          const osc1 = offlineCtx.createOscillator();
          const gain = offlineCtx.createGain();
          const filter = offlineCtx.createBiquadFilter();

          osc1.type = ambTrack.preset === 'rain' ? 'triangle' : 'sawtooth';
          osc1.frequency.setValueAtTime(ambTrack.preset === 'rain' ? 65 : 110, aStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(ambTrack.preset === 'rain' ? 450 : 320, aStart);

          gain.gain.setValueAtTime(0.001, aStart);
          gain.gain.exponentialRampToValueAtTime(ambTrack.volume * 0.25, aStart + 0.2);
          gain.gain.setValueAtTime(ambTrack.volume * 0.25, aStart + aDur - 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, aStart + aDur);

          osc1.connect(filter);
          filter.connect(gain);
          gain.connect(offlineCtx.destination);

          osc1.start(aStart);
          osc1.stop(aStart + aDur);
        }

        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = audioBufferToWav(renderedBuffer);
        const downloadUrl = URL.createObjectURL(wavBlob);

        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'sonora-multitrack-mix.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

        statusBar.textContent = '🎉 Multi-track WAV audio successfully exported and downloaded!';
      } catch (err) {
        statusBar.textContent = `Export failed: ${err.message}`;
      }
    });
  }

  // Setup interactions and initial render
  setupClipInteraction('voice', clipVoiceEl);
  setupClipInteraction('ambience', clipAmbienceEl);
  renderRuler();
  refreshAllClips();
  updateTimecode();
}
