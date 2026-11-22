/**
 * AI Voice Studio - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Hands-free vocal shortcut controller, neural voice synthesizer director, and accessibility speech dispatcher.
 */

export class AiVoiceStudioVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.recognition = options.recognition || null;
    this.synth = options.synth || options.speechSynth || (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
    this.maxHistory = options.maxHistory || 50;
    this.commandHistory = [];
    this.events = {};
    this.customCommands = [];

    // Voice Studio synthesizer parameters
    this.currentModel = options.currentModel || 'eleven-multilingual-v2';
    this.currentPitch = typeof options.currentPitch === 'number' ? options.currentPitch : 1.0;
    this.currentSpeed = typeof options.currentSpeed === 'number' ? options.currentSpeed : 1.0;
    this.isHighContrast = !!options.isHighContrast;
    this.isDarkMode = options.isDarkMode !== undefined ? !!options.isDarkMode : true;
    this.lastResponse = options.lastResponse || 'AI Voice Studio Commander standby. Ready for speech commands.';

    // Default predefined grammar specifications
    this.grammars = [
      // 1. Model Selection & Voice Generation
      {
        id: 'select_model',
        intent: 'SELECT_MODEL',
        action: 'SELECT_MODEL',
        pattern: /(?:generate\s+voice|select\s+model|choose\s+model|switch\s+to\s+model|use\s+model|choose\s+voice|set\s+model)\s+([a-zA-Z0-9_\-\.]+)/i,
        extract: (match) => ({
          model: match[1].toLowerCase()
        }),
        buildResponse: (params) => `Voice model switched to "${params.model}".`,
        handler: (params, self) => {
          self.currentModel = params.model;
          self.emit('modelChange', { model: params.model });
        }
      },
      // 2. Pitch Adjustment
      {
        id: 'adjust_pitch',
        intent: 'ADJUST_PITCH',
        action: 'ADJUST_PITCH',
        pattern: /(?:adjust|set|change)?\s*pitch\s+(?:to\s+)?(high|low|medium|normal|default|[0-9]+(?:\.[0-9]+)?)/i,
        extract: (match) => {
          const raw = match[1].toLowerCase();
          let pitchVal = 1.0;
          if (raw === 'high') {
            pitchVal = 1.5;
          } else if (raw === 'low') {
            pitchVal = 0.7;
          } else if (raw === 'medium' || raw === 'normal' || raw === 'default') {
            pitchVal = 1.0;
          } else {
            const num = parseFloat(raw);
            pitchVal = isNaN(num) ? 1.0 : Math.max(0.5, Math.min(2.0, num));
          }
          return {
            pitch: pitchVal,
            value: pitchVal,
            raw,
            level: raw
          };
        },
        buildResponse: (params) => `Pitch adjusted to ${params.pitch} (${params.raw}).`,
        handler: (params, self) => {
          self.currentPitch = params.pitch;
          self.emit('pitchChange', { pitch: params.pitch, raw: params.raw });
        }
      },
      // 3. Speed / Tempo Adjustment
      {
        id: 'adjust_speed',
        intent: 'ADJUST_SPEED',
        action: 'ADJUST_SPEED',
        pattern: /(?:adjust|set|change)?\s*(?:speed|tempo|rate)\s+(?:to\s+)?(fast|slow|normal|default|rapid|[0-9]+(?:\.[0-9]+)?x?)/i,
        extract: (match) => {
          const raw = match[1].toLowerCase();
          let speedVal = 1.0;
          if (raw === 'fast' || raw === 'rapid') {
            speedVal = 1.5;
          } else if (raw === 'slow') {
            speedVal = 0.75;
          } else if (raw === 'normal' || raw === 'default') {
            speedVal = 1.0;
          } else {
            const cleanNum = raw.replace(/x$/, '');
            const num = parseFloat(cleanNum);
            speedVal = isNaN(num) ? 1.0 : Math.max(0.5, Math.min(3.0, num));
          }
          return {
            speed: speedVal,
            rate: speedVal,
            value: speedVal,
            raw
          };
        },
        buildResponse: (params) => `Playback speed adjusted to ${params.speed}x.`,
        handler: (params, self) => {
          self.currentSpeed = params.speed;
          self.emit('speedChange', { speed: params.speed, rate: params.speed, raw: params.raw });
        }
      },
      // 4. Render Speech
      {
        id: 'render_speech',
        intent: 'RENDER_SPEECH',
        action: 'RENDER_SPEECH',
        pattern: /(?:render|synthesize|build|process)\s+(?:speech|audio|voice)/i,
        extract: () => ({
          model: this.currentModel,
          pitch: this.currentPitch,
          speed: this.currentSpeed
        }),
        buildResponse: (params) => `Rendering speech with model ${params.model} at pitch ${params.pitch} and speed ${params.speed}x.`,
        handler: (params, self) => {
          self.emit('renderSpeech', {
            model: self.currentModel,
            pitch: self.currentPitch,
            speed: self.currentSpeed
          });
        }
      },
      // 5. Export Audio (WAV / MP3 / OGG / FLAC)
      {
        id: 'export_audio',
        intent: 'EXPORT_AUDIO',
        action: 'EXPORT_AUDIO',
        pattern: /(?:export|save|download)\s+(?:audio\s+)?(wav|mp3|ogg|flac|audio)/i,
        extract: (match) => {
          const rawFmt = match[1].toLowerCase();
          const format = rawFmt === 'audio' ? 'wav' : rawFmt;
          return { format };
        },
        buildResponse: (params) => `Exporting studio master audio in ${params.format.toUpperCase()} format.`,
        handler: (params, self) => {
          self.emit('exportAudio', { format: params.format });
        }
      },
      // 6. Accessibility - Toggle Contrast
      {
        id: 'toggle_contrast',
        intent: 'TOGGLE_CONTRAST',
        action: 'TOGGLE_CONTRAST',
        pattern: /(?:toggle|enable|activate|switch)\s+(?:high\s+)?contrast/i,
        extract: () => ({
          highContrast: !this.isHighContrast
        }),
        buildResponse: (params) => `High contrast accessibility display ${params.highContrast ? 'enabled' : 'disabled'}.`,
        handler: (params, self) => {
          self.isHighContrast = !self.isHighContrast;
          self.emit('contrastChange', { isHighContrast: self.isHighContrast });
        }
      },
      // 7. Accessibility - Activate Dark Mode
      {
        id: 'activate_dark_mode',
        intent: 'ACTIVATE_DARK_MODE',
        action: 'ACTIVATE_DARK_MODE',
        pattern: /(?:activate|enable|toggle|switch\s+to)\s+dark\s+mode/i,
        extract: () => ({
          darkMode: true
        }),
        buildResponse: () => 'Dark mode studio console activated.',
        handler: (params, self) => {
          self.isDarkMode = true;
          self.emit('themeChange', { isDarkMode: true });
        }
      },
      // 8. Preview Audio / Speak Text
      {
        id: 'preview_audio',
        intent: 'PREVIEW_AUDIO',
        action: 'PREVIEW_AUDIO',
        pattern: /(?:preview|audition|play)\s*(?:audio|speech|sample)?|speak\s+text/i,
        extract: () => ({
          model: this.currentModel,
          pitch: this.currentPitch,
          speed: this.currentSpeed
        }),
        buildResponse: () => 'Auditioning current voice studio synthesis preview.',
        handler: (params, self) => {
          self.emit('previewAudio', {
            model: self.currentModel,
            pitch: self.currentPitch,
            speed: self.currentSpeed
          });
        }
      },
      // 9. Command Help
      {
        id: 'help',
        intent: 'HELP',
        action: 'HELP',
        pattern: /(?:help|commands|what\s+can\s+i\s+say|supported\s+commands)/i,
        extract: () => ({}),
        buildResponse: () => 'Supported commands: select model <name>, adjust pitch <high|low|value>, adjust speed <fast|slow|rate>, render speech, export audio wav|mp3, toggle contrast, activate dark mode, and preview audio.',
        handler: (params, self) => {
          self.emit('helpRequested');
        }
      }
    ];

    this.initSpeechRecognition();
  }

  /**
   * Initializes Web Speech API Recognition instance when available.
   */
  initSpeechRecognition() {
    if (!this.recognition && typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';

          this.recognition.onresult = (event) => {
            const current = event.resultIndex;
            const transcript = event.results[current][0].transcript;
            this.handleTranscript(transcript);
          };

          this.recognition.onerror = (event) => {
            this.emit('error', event);
            this.isListening = false;
            this.emit('listeningChange', { isListening: false });
          };

          this.recognition.onend = () => {
            this.isListening = false;
            this.emit('listeningChange', { isListening: false });
          };
        } catch {
          // Fallback to simulation mode gracefully
        }
      }
    }
  }

  /**
   * Starts listening for voice input.
   */
  startListening() {
    if (this.isListening) return true;
    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        this.emit('listeningChange', { isListening: true });
        return true;
      } catch {
        this.isListening = false;
        return false;
      }
    }
    // Headless / fallback simulation mode
    this.isListening = true;
    this.emit('listeningChange', { isListening: true });
    return true;
  }

  /**
   * Stops listening for voice input.
   */
  stopListening() {
    if (!this.isListening) return false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // no-op
      }
    }
    this.isListening = false;
    this.emit('listeningChange', { isListening: false });
    return false;
  }

  /**
   * Toggles listening state between active and idle.
   */
  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  /**
   * Returns current listening state.
   */
  isListeningState() {
    return this.isListening;
  }

  /**
   * Register a custom domain command grammar with execution handler.
   * @param {string|RegExp} pattern 
   * @param {Function} handler 
   * @param {string} description 
   */
  registerCommand(pattern, handler, description = '') {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const cmd = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      pattern: regex,
      handler,
      description
    };
    this.customCommands.unshift(cmd);
    return cmd.id;
  }

  /**
   * Robust regex grammar matcher with token normalization and parameter extraction.
   * @param {string} transcript Spoken utterance
   * @returns {Object} Parse result with intent, parameters, confidence, and execution callback
   */
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        matched: false,
        intent: 'UNKNOWN',
        action: 'UNKNOWN_GRAMMAR',
        transcript: '',
        normalizedTranscript: '',
        parameters: {},
        params: {},
        confidence: 0,
        response: 'No audible speech detected. Say "help" to review available studio voice commands.',
        callback: () => {},
        execute: () => {}
      };
    }

    const raw = transcript.trim();
    // Token normalization: collapse whitespace, trim punctuation
    const normalized = raw.replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');

    if (!normalized) {
      return {
        matched: false,
        intent: 'UNKNOWN',
        action: 'UNKNOWN_GRAMMAR',
        transcript: raw,
        normalizedTranscript: '',
        parameters: {},
        params: {},
        confidence: 0,
        response: 'Audible speech was empty. Say "help" to review available studio voice commands.',
        callback: () => {},
        execute: () => {}
      };
    }

    // 1. Check custom user-registered commands
    for (const custom of this.customCommands) {
      const match = normalized.match(custom.pattern);
      if (match) {
        const params = { match: match.slice(1).filter(Boolean) };
        const responseText = custom.description || 'Custom voice studio directive executed.';
        const cb = () => {
          if (typeof custom.handler === 'function') {
            custom.handler(match, this);
          }
        };
        return {
          matched: true,
          intent: 'CUSTOM_COMMAND',
          action: 'CUSTOM_COMMAND',
          grammarId: custom.id,
          transcript: raw,
          normalizedTranscript: normalized,
          parameters: params,
          params,
          confidence: 1.0,
          response: responseText,
          callback: cb,
          execute: cb
        };
      }
    }

    // 2. Check built-in AI Voice Studio grammars
    for (const rule of this.grammars) {
      const match = normalized.match(rule.pattern);
      if (match) {
        const params = rule.extract(match);
        const responseText = rule.buildResponse(params);
        const cb = () => {
          if (typeof rule.handler === 'function') {
            rule.handler(params, this);
          }
        };
        return {
          matched: true,
          intent: rule.intent,
          action: rule.action,
          grammarId: rule.id,
          transcript: raw,
          normalizedTranscript: normalized,
          parameters: params,
          params,
          confidence: 1.0,
          response: responseText,
          callback: cb,
          execute: cb
        };
      }
    }

    // 3. Fallback for unrecognized phrases
    const fallbackResponse = `Command "${normalized}" not recognized. Say "help" for a list of available voice commands.`;
    const fallbackCb = () => {
      this.emit('unrecognized', { transcript: normalized });
    };

    return {
      matched: false,
      intent: 'FALLBACK',
      action: 'UNRECOGNIZED_COMMAND',
      grammarId: null,
      transcript: raw,
      normalizedTranscript: normalized,
      parameters: {},
      params: {},
      confidence: 0.1,
      response: fallbackResponse,
      callback: fallbackCb,
      execute: fallbackCb
    };
  }

  /**
   * Dispatches speech output via Web Speech API speechSynthesis.speak()
   * @param {string} msg Message to speak
   * @param {Object} options Optional speech parameters (pitch, rate/speed, voice, lang)
   * @returns {string} Synthesized message text
   */
  synthesizeResponse(msg, options = {}) {
    const text = String(msg || '').trim();
    this.lastResponse = text;

    if (this.synth && typeof window !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        if (this.synth.speaking) {
          this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.pitch = typeof options.pitch === 'number' ? options.pitch : this.currentPitch;
        utterance.rate = typeof options.rate === 'number'
          ? options.rate
          : (typeof options.speed === 'number' ? options.speed : this.currentSpeed);

        if (options.voice) {
          utterance.voice = options.voice;
        }
        if (options.lang) {
          utterance.lang = options.lang;
        }
        this.synth.speak(utterance);
      } catch {
        // Fallback gracefully without throwing
      }
    }

    this.emit('synthesize', { message: text, options });
    return text;
  }

  /**
   * Processes a recognized voice utterance, executes action, synthesizes vocal feedback,
   * and records to history.
   * @param {string} transcript Spoken string
   */
  handleTranscript(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);

    // Execute grammar callback
    if (typeof parsed.callback === 'function') {
      try {
        parsed.callback(parsed.parameters);
      } catch (err) {
        console.error('AiVoiceStudioVoiceCommander callback execution error:', err);
      }
    }

    // Synthesize vocal confirmation response
    const synthText = this.synthesizeResponse(parsed.response, {
      pitch: this.currentPitch,
      rate: this.currentSpeed
    });

    const record = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transcript: parsed.transcript,
      normalizedTranscript: parsed.normalizedTranscript,
      intent: parsed.intent,
      action: parsed.action,
      matched: parsed.matched,
      parameters: parsed.parameters,
      confidence: parsed.confidence,
      response: synthText,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.commandHistory.unshift(record);
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory.pop();
    }

    this.emit('command', record);
    return record;
  }

  /**
   * Subscribes to commander event notifications.
   * @param {string} event Event name
   * @param {Function} fn Handler
   */
  on(event, fn) {
    if (typeof fn !== 'function') return () => {};
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(fn);
    return () => this.off(event, fn);
  }

  /**
   * Unsubscribes from commander event notifications.
   * @param {string} event 
   * @param {Function} fn 
   */
  off(event, fn) {
    if (!this.events[event]) return;
    if (!fn) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event].filter(h => h !== fn);
    }
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} event 
   * @param {*} data 
   */
  emit(event, data) {
    if (this.events[event]) {
      [...this.events[event]].forEach(fn => {
        try {
          fn(data);
        } catch (err) {
          console.error(`AiVoiceStudioVoiceCommander event listener error for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Retrieves snapshot of command history.
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Clears command history stream.
   */
  clearHistory() {
    this.commandHistory = [];
    this.emit('historyClear');
  }

  /**
   * Gets the last synthesized vocal response message.
   */
  getLastResponse() {
    return this.lastResponse;
  }
}

// Browser Interactive Console Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new AiVoiceStudioVoiceCommander();

    // DOM Elements
    const toggleMicBtn = document.getElementById('toggleVoiceBtn');
    const micRingContainer = document.getElementById('micRingContainer');
    const statusBadge = document.getElementById('commanderStatusBadge');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const historyContainer = document.getElementById('commandHistoryContainer');
    const synthOutput = document.getElementById('synthesizerOutput');
    const speechToast = document.getElementById('speechToast');
    const clearStreamBtn = document.getElementById('clearStreamBtn');
    const previewAudioBtn = document.getElementById('previewAudioBtn');
    const renderSpeechBtn = document.getElementById('renderSpeechBtn');
    const toggleContrastBtn = document.getElementById('toggleContrastBtn');

    // Synthesis Parameter Inputs
    const modelSelect = document.getElementById('paramModelSelect');
    const pitchSlider = document.getElementById('paramPitchSlider');
    const pitchDisplay = document.getElementById('paramPitchVal');
    const speedSlider = document.getElementById('paramSpeedSlider');
    const speedDisplay = document.getElementById('paramSpeedVal');

    let toastTimer = null;

    function showToast(msg) {
      if (!speechToast) return;
      if (toastTimer) clearTimeout(toastTimer);
      speechToast.textContent = msg;
      speechToast.classList.add('visible');
      toastTimer = setTimeout(() => {
        speechToast.classList.remove('visible');
      }, 3200);
    }

    function updateUiParameters() {
      if (modelSelect) modelSelect.value = commander.currentModel;
      if (pitchSlider) pitchSlider.value = commander.currentPitch;
      if (pitchDisplay) pitchDisplay.textContent = `${commander.currentPitch.toFixed(2)}`;
      if (speedSlider) speedSlider.value = commander.currentSpeed;
      if (speedDisplay) speedDisplay.textContent = `${commander.currentSpeed.toFixed(2)}x`;
    }

    function updateUiListeningState(listening) {
      if (listening) {
        micRingContainer?.classList.add('active');
        toggleMicBtn?.classList.add('active');
        toggleMicBtn?.setAttribute('aria-pressed', 'true');
        waveVisualizer?.classList.add('active');
        if (statusBadge) {
          statusBadge.textContent = 'Microphone Active — Listening...';
          statusBadge.className = 'status-badge status-listening';
        }
      } else {
        micRingContainer?.classList.remove('active');
        toggleMicBtn?.classList.remove('active');
        toggleMicBtn?.setAttribute('aria-pressed', 'false');
        waveVisualizer?.classList.remove('active');
        if (statusBadge) {
          statusBadge.textContent = 'Microphone Idle';
          statusBadge.className = 'status-badge';
        }
      }
    }

    function renderHistory() {
      if (!historyContainer) return;
      historyContainer.replaceChildren();

      const items = commander.getCommandHistory();
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'stream-empty';
        empty.textContent = 'Awaiting vocal commands or simulated input stream...';
        historyContainer.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = `stream-item ${item.matched ? 'matched' : 'unrecognized'}`;

        const left = document.createElement('div');
        left.className = 'item-left';

        const tr = document.createElement('span');
        tr.className = 'item-transcript';
        tr.textContent = `"${item.transcript}"`;

        const act = document.createElement('span');
        act.className = 'item-action';
        act.textContent = `Intent: ${item.intent || item.action}`;

        left.appendChild(tr);
        left.appendChild(act);

        const right = document.createElement('div');
        right.className = 'item-right';

        const badge = document.createElement('span');
        badge.className = `badge-pill ${item.matched ? 'pill-success' : 'pill-warning'}`;
        badge.textContent = item.matched ? 'MATCHED' : 'UNRECOGNIZED';

        const time = document.createElement('span');
        time.className = 'item-time';
        time.textContent = item.timeFormatted;

        right.appendChild(badge);
        right.appendChild(time);

        row.appendChild(left);
        row.appendChild(right);
        historyContainer.appendChild(row);
      });
    }

    // Event listener bindings on commander instance
    commander.on('modelChange', ({ model }) => {
      updateUiParameters();
      showToast(`Model updated: ${model}`);
    });

    commander.on('pitchChange', ({ pitch }) => {
      updateUiParameters();
      showToast(`Pitch set: ${pitch.toFixed(2)}`);
    });

    commander.on('speedChange', ({ speed }) => {
      updateUiParameters();
      showToast(`Speed set: ${speed.toFixed(2)}x`);
    });

    commander.on('contrastChange', ({ isHighContrast }) => {
      document.body.classList.toggle('high-contrast', isHighContrast);
      showToast(`High contrast ${isHighContrast ? 'enabled' : 'disabled'}`);
    });

    commander.on('themeChange', ({ isDarkMode }) => {
      document.body.classList.toggle('dark-mode', isDarkMode);
      showToast('Dark mode activated');
    });

    commander.on('synthesize', ({ message }) => {
      if (synthOutput) {
        synthOutput.textContent = `"${message}"`;
      }
    });

    commander.on('renderSpeech', (params) => {
      showToast(`Speech rendering started (${params.model})`);
    });

    commander.on('exportAudio', ({ format }) => {
      showToast(`Audio export queued: ${format.toUpperCase()}`);
    });

    commander.on('previewAudio', () => {
      showToast('Auditioning voice preview');
    });

    // Mic Button Click
    toggleMicBtn?.addEventListener('click', () => {
      if (commander.isListeningState()) {
        commander.stopListening();
        updateUiListeningState(false);
        showToast('Microphone deactivated.');
      } else {
        const started = commander.startListening();
        updateUiListeningState(started);
        showToast('Listening... Speak a studio voice command.');
      }
    });

    // Clear History Button Click
    clearStreamBtn?.addEventListener('click', () => {
      commander.clearHistory();
      renderHistory();
      showToast('Command history stream cleared.');
    });

    // Preview Audio Button Click
    previewAudioBtn?.addEventListener('click', () => {
      const res = commander.handleTranscript('preview audio');
      renderHistory();
      showToast(`Action: ${res.intent}`);
    });

    // Render Speech Button Click
    renderSpeechBtn?.addEventListener('click', () => {
      const res = commander.handleTranscript('render speech');
      renderHistory();
      showToast(`Action: ${res.intent}`);
    });

    // Toggle Contrast Button Click
    toggleContrastBtn?.addEventListener('click', () => {
      const res = commander.handleTranscript('toggle contrast');
      renderHistory();
    });

    // Manual slider changes
    pitchSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      commander.currentPitch = val;
      if (pitchDisplay) pitchDisplay.textContent = val.toFixed(2);
    });

    speedSlider?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      commander.currentSpeed = val;
      if (speedDisplay) speedDisplay.textContent = `${val.toFixed(2)}x`;
    });

    modelSelect?.addEventListener('change', (e) => {
      commander.currentModel = e.target.value;
      showToast(`Model set to: ${e.target.value}`);
    });

    // Spoken Phrase Quick Simulation Chips
    document.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-phrase');
        if (phrase) {
          const res = commander.handleTranscript(phrase);
          renderHistory();
          updateUiParameters();
          showToast(`Executed: ${res.intent}`);
        }
      });
    });

    // Initial state setup
    updateUiParameters();
    renderHistory();
  });
}
