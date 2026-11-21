/**
 * Neurotech Interface - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Captures spoken input via Web Speech API, matches speech patterns against recognized
 * action grammars, executes accessibility & telemetry shortcuts, and provides audio synthesis responses.
 */

export class NeurotechInterfaceVoiceCommander {
  constructor(options = {}) {
    this.options = {
      lang: 'en-US',
      continuous: false,
      interimResults: false,
      voicePitch: 1.0,
      voiceRate: 1.0,
      voiceVolume: 1.0,
      ...options
    };

    this.isListening = false;
    this.history = [];
    this.activeGrammars = this.initGrammars();

    // Voice recognition & speech synthesis handles
    this.recognition = null;
    this.synthesis = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    this.onStatusChange = options.onStatusChange || null;
    this.onCommandMatch = options.onCommandMatch || null;
    this.onError = options.onError || null;

    this.initRecognition();
  }

  /**
   * Initialize recognized action grammars with regular expressions, action intents,
   * accessibility callbacks, and spoken confirmations.
   */
  initGrammars() {
    return [
      {
        id: 'go_to_dashboard',
        regex: /^(?:go\s+to\s+dashboard|open\s+dashboard|dashboard)$/i,
        category: 'navigation',
        description: 'Navigate to main neural interface dashboard',
        response: 'Navigating to neural telemetry dashboard.',
        handler: () => ({ action: 'navigate', target: 'dashboard' })
      },
      {
        id: 'show_help',
        regex: /^(?:show\s+help|help|what\s+can\s+i\s+say|list\s+commands)$/i,
        category: 'help',
        description: 'Display available voice commander commands and guidance',
        response: 'Available commands include: go to dashboard, show help, start listening, stop listening, read page, and clear history.',
        handler: () => ({ action: 'help' })
      },
      {
        id: 'start_listening',
        regex: /^(?:start\s+listening|listen|mic\s+on|activate\s+mic)$/i,
        category: 'control',
        description: 'Activate continuous voice command capture',
        response: 'Voice recognition listener engaged.',
        handler: () => ({ action: 'start_listening' })
      },
      {
        id: 'stop_listening',
        regex: /^(?:stop\s+listening|halt\s+listening|mic\s+off|deactivate\s+mic)$/i,
        category: 'control',
        description: 'Deactivate voice command capture',
        response: 'Voice recognition listener stopped.',
        handler: () => ({ action: 'stop_listening' })
      },
      {
        id: 'read_page',
        regex: /^(?:read\s+page|read\s+summary|screen\s+reader|read\s+telemetry)$/i,
        category: 'accessibility',
        description: 'Speak current page content and neural telemetry summary',
        response: 'Reading page: Neurotech Voice Commander active. Audio and grammar dispatch systems operational.',
        handler: () => ({ action: 'read_page' })
      },
      {
        id: 'clear_history',
        regex: /^(?:clear\s+history|clear\s+log|clear\s+console|reset\s+history)$/i,
        category: 'utility',
        description: 'Clear command history log and console stream',
        response: 'Command stream console history cleared.',
        handler: () => ({ action: 'clear_history' })
      },
      {
        id: 'toggle_telemetry',
        regex: /^(?:toggle|switch|show|hide)\s+(?:telemetry|stream|eeg|feed|data)$/i,
        category: 'telemetry',
        description: 'Toggle real-time neural telemetry stream',
        response: 'Toggling neural telemetry stream display.',
        handler: () => ({ action: 'toggle_telemetry' })
      },
      {
        id: 'calibrate_sensors',
        regex: /^(?:calibrate|reset|align|sync)\s+(?:sensor|sensors|electrode|electrodes|headset|hardware)$/i,
        category: 'calibration',
        description: 'Initiate sensor calibration and impedance alignment',
        response: 'Initiating sensor calibration and impedance alignment.',
        handler: () => ({ action: 'calibrate_sensors' })
      },
      {
        id: 'filter_alpha',
        regex: /^(?:filter|isolate|focus|enable)\s+(?:alpha|alpha\s+wave|alpha\s+band)$/i,
        category: 'filter',
        description: 'Isolate alpha band frequency (8-13 Hz)',
        response: 'Alpha wave bandpass filter engaged.',
        handler: () => ({ action: 'filter_alpha' })
      },
      {
        id: 'emergency_stop',
        regex: /^(?:emergency\s+stop|stop\s+all|halt\s+interface|freeze\s+system)$/i,
        category: 'system',
        description: 'Halt all neural stream capture and recording',
        response: 'Emergency neural capture stopped immediately.',
        handler: () => ({ action: 'emergency_stop' })
      }
    ];
  }

  /**
   * Initialize speech recognition adapter supporting standard and vendor-prefixed APIs
   */
  initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.updateStatus('unavailable', 'Web Speech API is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.options.lang;
      this.recognition.continuous = this.options.continuous;
      this.recognition.interimResults = this.options.interimResults;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateStatus('listening', 'Microphone active. Awaiting voice command...');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateStatus('idle', 'Commander standby. Press mic to speak.');
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        const errMsg = event?.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : `Speech recognition error: ${event?.error || 'unknown'}`;
        this.updateStatus('error', errMsg);
        if (this.onError) this.onError(event);
      };

      this.recognition.onresult = (event) => {
        const transcript = Array.from(event.results || [])
          .map(res => res[0]?.transcript || '')
          .join('')
          .trim();

        if (transcript) {
          this.handleTranscript(transcript);
        }
      };
    } catch (err) {
      this.updateStatus('unavailable', 'Failed to initialize speech recognition engine.');
    }
  }

  /**
   * Start listening for voice commands
   */
  startListening() {
    if (!this.recognition) {
      this.updateStatus('unavailable', 'Web Speech API not supported in current environment.');
      return false;
    }

    if (this.isListening) {
      return true;
    }

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.updateStatus('error', 'Unable to access microphone.');
      return false;
    }
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Safe no-op on inactive stop
      }
      this.isListening = false;
      this.updateStatus('idle', 'Voice commander stopped.');
    }
  }

  /**
   * Toggle microphone listening state
   */
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return this.startListening();
    }
  }

  /**
   * Match spoken text against recognized action grammars
   * @param {string} transcript - Input speech string
   * @returns {Object} Parse result with matched command or fallback
   */
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        matched: false,
        commandId: null,
        transcript: '',
        category: null,
        response: 'No audible command detected.',
        confidence: 0,
        handler: null
      };
    }

    // Normalize whitespace and lowercase
    const clean = transcript.trim().replace(/\s+/g, ' ').toLowerCase();

    if (!clean) {
      return {
        matched: false,
        commandId: null,
        transcript: '',
        category: null,
        response: 'No audible command detected.',
        confidence: 0,
        handler: null
      };
    }

    for (const grammar of this.activeGrammars) {
      if (grammar.regex.test(clean)) {
        return {
          matched: true,
          commandId: grammar.id,
          transcript: clean,
          category: grammar.category,
          response: grammar.response,
          description: grammar.description,
          confidence: 0.95,
          handler: grammar.handler || null
        };
      }
    }

    return {
      matched: false,
      commandId: null,
      transcript: clean,
      category: 'unknown',
      response: `Command "${clean}" not recognized. Say "show help" for available options.`,
      confidence: 0.1,
      handler: null
    };
  }

  /**
   * Processes a recognized voice transcript, routes actions, updates history, and synthesizes output
   */
  handleTranscript(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    let handlerResult = null;

    if (parsed.matched && typeof parsed.handler === 'function') {
      try {
        handlerResult = parsed.handler();
        if (parsed.commandId === 'clear_history') {
          this.clearHistory();
        } else if (parsed.commandId === 'stop_listening') {
          this.stopListening();
        } else if (parsed.commandId === 'start_listening') {
          this.startListening();
        }
      } catch (err) {
        console.warn('Command handler execution error:', err);
      }
    }

    const entry = {
      ...parsed,
      handlerResult,
      timestamp: new Date().toISOString()
    };

    if (parsed.commandId !== 'clear_history') {
      this.history.unshift(entry);
      if (this.history.length > 50) {
        this.history.pop();
      }
    }

    if (this.onCommandMatch) {
      this.onCommandMatch(entry);
    }

    this.synthesizeResponse(entry.response);
    return entry;
  }

  /**
   * Provide auditory feedback synthesis using Web Speech synthesis API
   * @param {string} msg - Spoken confirmation text
   * @returns {boolean} Whether utterance was dispatched
   */
  synthesizeResponse(msg) {
    if (!msg || typeof msg !== 'string') return false;

    if (!this.synthesis && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    }

    if (!this.synthesis) {
      return false;
    }

    try {
      if (this.synthesis.speaking) {
        this.synthesis.cancel();
      }

      if (typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.pitch = this.options.voicePitch;
        utterance.rate = this.options.voiceRate;
        utterance.volume = this.options.voiceVolume;
        utterance.lang = this.options.lang;

        this.synthesis.speak(utterance);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  }

  /**
   * Helper to notify status listeners
   */
  updateStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange({ state, message, isListening: this.isListening });
    }
  }

  /**
   * Clear recognized command history
   */
  clearHistory() {
    this.history = [];
  }
}

// Client DOM binding for standalone showcase usage
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('micToggleBtn');
    const stopBtn = document.getElementById('micStopBtn');
    const statusBadge = document.getElementById('statusBadge');
    const statusDetails = document.getElementById('statusDetails');
    const consoleOutput = document.getElementById('consoleOutput');
    const toastElem = document.getElementById('speechToast');
    const toastMsg = document.getElementById('toastMsg');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const simulatedInput = document.getElementById('simulatedInput');
    const simulatedSubmit = document.getElementById('simulatedSubmit');

    let toastTimer = null;

    const showToast = (message) => {
      if (!toastElem || !toastMsg) return;
      toastMsg.textContent = message;
      toastElem.classList.add('voice-commander-toast-visible');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toastElem.classList.remove('voice-commander-toast-visible');
      }, 4000);
    };

    const appendConsoleLog = (entry) => {
      if (!consoleOutput) return;
      const logLine = document.createElement('div');
      logLine.className = `voice-commander-log-line ${entry.matched ? 'matched' : 'unrecognized'}`;

      const time = new Date(entry.timestamp).toLocaleTimeString();
      logLine.innerHTML = `
        <span class="voice-commander-log-time">[${time}]</span>
        <span class="voice-commander-log-transcript">"${entry.transcript}"</span>
        <span class="voice-commander-log-arrow">→</span>
        <span class="voice-commander-log-response">${entry.response}</span>
      `;
      consoleOutput.prepend(logLine);
    };

    const commander = new NeurotechInterfaceVoiceCommander({
      onStatusChange: ({ state, message, isListening }) => {
        if (statusBadge) {
          statusBadge.textContent = state.toUpperCase();
          statusBadge.className = `voice-commander-status-badge badge-${state}`;
        }
        if (statusDetails) {
          statusDetails.textContent = message;
        }
        if (micBtn) {
          micBtn.setAttribute('aria-pressed', isListening ? 'true' : 'false');
          micBtn.classList.toggle('active', isListening);
        }
        if (stopBtn) {
          stopBtn.disabled = !isListening;
        }
        if (waveVisualizer) {
          waveVisualizer.classList.toggle('animating', isListening);
        }
      },
      onCommandMatch: (entry) => {
        if (entry.commandId === 'clear_history') {
          if (consoleOutput) {
            consoleOutput.innerHTML = '<div class="voice-commander-empty-log">Console feed cleared. Voice actions will appear here.</div>';
          }
        } else {
          appendConsoleLog(entry);
        }
        showToast(entry.response);
      }
    });

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        commander.stopListening();
      });
    }

    if (clearHistoryBtn && consoleOutput) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
        consoleOutput.innerHTML = '<div class="voice-commander-empty-log">Console feed cleared. Voice actions will appear here.</div>';
      });
    }

    if (simulatedSubmit && simulatedInput) {
      const handleSimulated = () => {
        const val = simulatedInput.value.trim();
        if (val) {
          commander.handleTranscript(val);
          simulatedInput.value = '';
        }
      };
      simulatedSubmit.addEventListener('click', handleSimulated);
      simulatedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSimulated();
      });
    }

    document.querySelectorAll('.voice-commander-phrase-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-phrase');
        if (phrase) {
          commander.handleTranscript(phrase);
        }
      });
    });
  });
}
