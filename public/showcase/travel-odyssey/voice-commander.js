/**
 * Travel Odyssey - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Modular expedition acoustic engine, intent parser, speech feedback synthesizer,
 * and high-contrast accessibility controller.
 */

export class TravelOdysseyVoiceCommander {
  /**
   * Static Voice Grammar Registry
   */
  static GRAMMAR_REGISTRY = [
    {
      action: 'NAVIGATE_PAGE',
      title: 'Deck Navigation',
      description: 'Switch between voyage decks (itinerary, flights, accommodations, map, settings)',
      examples: [
        'navigate to flights',
        'go to itinerary',
        'open accommodations',
        'show map',
        'switch to settings'
      ],
      parameters: ['page']
    },
    {
      action: 'BOOK_FLIGHT',
      title: 'Flight Reservation',
      description: 'Initiate flight ticket booking with target destination parameter extraction',
      examples: [
        'book flight to Tokyo',
        'reserve flight to Paris',
        'book ticket to Reykjavik'
      ],
      parameters: ['destination']
    },
    {
      action: 'SEARCH_FLIGHTS',
      title: 'Flight Exploration',
      description: 'Query available expedition airline routes and flights',
      examples: [
        'search flights to Honolulu',
        'find flights to Zurich',
        'search flights'
      ],
      parameters: ['destination']
    },
    {
      action: 'SET_DESTINATION',
      title: 'Destination Selector',
      description: 'Set or update the active expedition journey destination',
      examples: [
        'set destination to Iceland',
        'change destination to Kyoto',
        'travel to Rome'
      ],
      parameters: ['destination']
    },
    {
      action: 'FILTER_BUDGET',
      title: 'Expedition Budget Tier',
      description: 'Filter voyage plans by budget tier (luxury, moderate, backpacker)',
      examples: [
        'filter budget luxury',
        'set budget to backpacker',
        'budget moderate'
      ],
      parameters: ['tier']
    },
    {
      action: 'TOGGLE_HIGH_CONTRAST',
      title: 'A11y High Contrast',
      description: 'Toggle high-contrast accessibility mode for visual clarity & WCAG compliance',
      examples: [
        'toggle high contrast',
        'enable high contrast',
        'disable high contrast'
      ],
      parameters: ['enabled']
    },
    {
      action: 'EXPORT_ITINERARY',
      title: 'Export Itinerary',
      description: 'Export travel itinerary as JSON, PDF, or CSV document',
      examples: [
        'export itinerary as pdf',
        'export itinerary as json',
        'export itinerary to csv'
      ],
      parameters: ['format']
    },
    {
      action: 'HELP',
      title: 'Acoustic Voice Help',
      description: 'List available voice commander operations and acoustic phrases',
      examples: [
        'help',
        'voice commands',
        'what can I say'
      ],
      parameters: []
    }
  ];

  /**
   * Generates a unique command ID
   */
  static generateId(prefix = 'cmd') {
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${ts}_${rand}`;
  }

  /**
   * Cleans text transcript by trimming and stripping trailing punctuation
   */
  static cleanText(text) {
    if (typeof text !== 'string') return '';
    return text.trim().replace(/[.,!?;:]+$/, '').trim();
  }

  /**
   * Formats destination string with title capitalization
   */
  static formatDestination(dest) {
    const cleaned = TravelOdysseyVoiceCommander.cleanText(dest);
    if (!cleaned) return '';
    return cleaned.replace(/\b[a-z]/g, char => char.toUpperCase());
  }

  constructor(options = {}) {
    this.lang = options.lang || 'en-US';
    this.speechEnabled = options.speechEnabled !== false;
    this.speechRate = options.speechRate || 1.0;
    this.speechPitch = options.speechPitch || 1.0;
    this.continuous = options.continuous !== false;

    // Custom or mock speech components for testability
    this.debug = Boolean(options.debug);
    this.speechSynthesis = options.speechSynthesis || null;
    this.UtteranceClass = options.UtteranceClass || null;
    this.RecognitionClass = options.RecognitionClass || null;

    // Internal State
    this.isListening = false;
    this.highContrast = Boolean(options.highContrast);
    this.currentPage = options.defaultPage || 'itinerary';
    this.currentDestination = options.defaultDestination || null;
    this.budgetTier = options.defaultBudget || 'moderate';
    this.history = [];

    // Event Emitter Map
    this.events = new Map();

    // Web Speech API recognition instance
    this.recognition = null;

    // Apply initial high contrast if in DOM
    if (this.highContrast && typeof document !== 'undefined') {
      this.applyHighContrastToDOM(true);
    }
  }

  /**
   * Event Emitter: Subscribe
   */
  on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Event Emitter: Unsubscribe
   */
  off(eventName, handler) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(handler);
    }
  }

  /**
   * Event Emitter: Dispatch
   */
  emit(eventName, payload) {
    if (!this.events.has(eventName)) return;
    const handlers = Array.from(this.events.get(eventName));
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (err) {
        // Prevent subscriber errors from crashing the commander engine
        if (this.debug && typeof console !== 'undefined' && console.error) {
          console.error(`[TravelOdysseyVoiceCommander] Listener error for event '${eventName}':`, err);
        }
      }
    }
  }

  /**
   * Returns current engine state snapshot
   */
  getState() {
    return {
      isListening: this.isListening,
      highContrast: this.highContrast,
      currentPage: this.currentPage,
      currentDestination: this.currentDestination,
      budgetTier: this.budgetTier,
      speechEnabled: this.speechEnabled,
      historyCount: this.history.length
    };
  }

  /**
   * Voice Intent Parser & Grammar Matcher
   */
  parseIntent(rawTranscript) {
    if (!rawTranscript || typeof rawTranscript !== 'string') {
      return {
        action: 'UNKNOWN',
        parameters: {},
        confidence: 0,
        feedback: "Command not recognized. Say 'help' for available commands."
      };
    }

    const text = TravelOdysseyVoiceCommander.cleanText(rawTranscript);
    const lower = text.toLowerCase();

    // 1. HELP
    if (/^(?:help|show\s+help|voice\s+commands?|commands?|list\s+commands?|what\s+can\s+i\s+say|assistance|guide)$/i.test(lower)) {
      return {
        action: 'HELP',
        parameters: {},
        confidence: 1.0,
        feedback: "Available voice commands: navigate page, book flight, search flights, set destination, filter budget, toggle high contrast, and export itinerary."
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST
    const contrastMatch = lower.match(/^(?:toggle|enable|disable|turn\s+on|turn\s+off|switch)?\s*(?:high\s+)?contrast(?:\s+mode)?$/i);
    if (contrastMatch || lower === 'high contrast' || lower === 'contrast mode') {
      let enabled;
      if (/enable|turn\s+on/i.test(lower)) {
        enabled = true;
      } else if (/disable|turn\s+off/i.test(lower)) {
        enabled = false;
      } else {
        enabled = !this.highContrast;
      }

      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        parameters: { enabled },
        confidence: 0.98,
        feedback: `High contrast mode ${enabled ? 'enabled' : 'disabled'}.`
      };
    }

    // 3. NAVIGATE_PAGE
    const navMatch = lower.match(/^(?:navigate(?:\s+to)?|go(?:\s+to)?|open|show|switch(?:\s+to)?|view|head(?:\s+to)?)\s+(.+)$/i);
    if (navMatch) {
      const target = navMatch[1].trim();
      let canonicalPage = null;

      if (/^(?:itinerary|schedule|timeline|trip\s+plan|expedition(?:\s+plan)?|voyage\s+log)$/i.test(target)) {
        canonicalPage = 'itinerary';
      } else if (/^(?:flights?|air\s+travel|planes?|airlines?)$/i.test(target)) {
        canonicalPage = 'flights';
      } else if (/^(?:accommodations?|hotels?|lodging|resorts?)$/i.test(target)) {
        canonicalPage = 'accommodations';
      } else if (/^(?:map|navigation|world\s+map|globe|satellite)$/i.test(target)) {
        canonicalPage = 'map';
      } else if (/^(?:settings?|preferences?|configuration|config)$/i.test(target)) {
        canonicalPage = 'settings';
      }

      if (canonicalPage) {
        return {
          action: 'NAVIGATE_PAGE',
          parameters: { page: canonicalPage },
          confidence: 0.96,
          feedback: `Navigating to ${canonicalPage} deck.`
        };
      }
    }

    // 4. BOOK_FLIGHT
    const bookMatch = lower.match(/^(?:book|reserve)\s+(?:a\s+)?(?:flight|ticket|trip)(?:\s+to\s+(.+))?$/i);
    if (bookMatch) {
      const rawDest = bookMatch[1];
      const destination = rawDest ? TravelOdysseyVoiceCommander.formatDestination(rawDest) : null;
      return {
        action: 'BOOK_FLIGHT',
        parameters: { destination },
        confidence: 0.95,
        feedback: destination
          ? `Booking expedition flight to ${destination}.`
          : "Opening flight reservation terminal."
      };
    }

    // 5. SEARCH_FLIGHTS
    const searchFlightsMatch = lower.match(/^(?:search|find|lookup|look\s+up|explore|check)\s+(?:for\s+)?(?:available\s+)?flights?(?:\s+to\s+(.+))?$/i)
      || lower.match(/^flights?\s+to\s+(.+)$/i);
    if (searchFlightsMatch) {
      const rawDest = searchFlightsMatch[1];
      const destination = rawDest ? TravelOdysseyVoiceCommander.formatDestination(rawDest) : null;
      return {
        action: 'SEARCH_FLIGHTS',
        parameters: { destination },
        confidence: 0.94,
        feedback: destination
          ? `Searching available flights to ${destination}.`
          : "Searching available expedition flights."
      };
    }

    // 6. SET_DESTINATION
    const destMatch = lower.match(/^(?:set\s+destination(?:\s+to)?|change\s+destination(?:\s+to)?|destination(?:\s+to|:)?|travel\s+to|fly\s+to|visit|explore)\s+(.+)$/i);
    if (destMatch) {
      const rawDest = destMatch[1];
      const destination = TravelOdysseyVoiceCommander.formatDestination(rawDest);
      return {
        action: 'SET_DESTINATION',
        parameters: { destination },
        confidence: 0.95,
        feedback: `Expedition destination set to ${destination}.`
      };
    }

    // 7. FILTER_BUDGET
    const budgetMatch = lower.match(/^(?:filter(?:\s+by)?\s+budget(?:\s+to)?|set\s+budget(?:\s+to)?|budget(?:\s+filter)?(?:\s+tier)?|filter\s+by|switch\s+to\s+budget)\s+(.+)$/i)
      || lower.match(/^(.+?)\s+budget$/i);
    if (budgetMatch) {
      const tierInput = budgetMatch[1].trim();
      let canonicalTier = null;

      if (/^(?:luxury|lux|premium|first\s+class|five\s+star|5\s+star|vip)$/i.test(tierInput)) {
        canonicalTier = 'luxury';
      } else if (/^(?:moderate|standard|mid-range|mid\s+range|medium|regular|comfort)$/i.test(tierInput)) {
        canonicalTier = 'moderate';
      } else if (/^(?:backpacker|backpacking|budget|economy|cheap|hostel|affordable)$/i.test(tierInput)) {
        canonicalTier = 'backpacker';
      }

      if (canonicalTier) {
        return {
          action: 'FILTER_BUDGET',
          parameters: { tier: canonicalTier },
          confidence: 0.95,
          feedback: `Budget filter set to ${canonicalTier} tier.`
        };
      }
    }

    // 8. EXPORT_ITINERARY
    const exportMatch = lower.match(/^(?:export|download|save)\s+(?:expedition\s+)?itinerary(?:\s+as|\s+to|\s+in)?(?:\s+(json|pdf|csv))?$/i)
      || lower.match(/^(?:export|download|save)\s+(json|pdf|csv)\s+itinerary$/i);
    if (exportMatch) {
      const rawFormat = exportMatch[1] || exportMatch[2] || 'json';
      const format = rawFormat.toLowerCase();
      return {
        action: 'EXPORT_ITINERARY',
        parameters: { format },
        confidence: 0.95,
        feedback: `Exporting expedition itinerary as ${format.toUpperCase()} document.`
      };
    }

    // 9. UNKNOWN
    return {
      action: 'UNKNOWN',
      parameters: {},
      confidence: 0,
      feedback: "Command not recognized. Say 'help' for available commands."
    };
  }

  /**
   * Executes parsed intent and mutates internal state
   */
  executeCommand(intent, rawTranscript = '', confidence = 1.0) {
    const success = intent.action !== 'UNKNOWN';

    switch (intent.action) {
      case 'NAVIGATE_PAGE':
        this.currentPage = intent.parameters.page;
        break;

      case 'SET_DESTINATION':
        if (intent.parameters.destination) {
          this.currentDestination = intent.parameters.destination;
        }
        break;

      case 'BOOK_FLIGHT':
      case 'SEARCH_FLIGHTS':
        if (intent.parameters.destination) {
          this.currentDestination = intent.parameters.destination;
        }
        break;

      case 'FILTER_BUDGET':
        this.budgetTier = intent.parameters.tier;
        break;

      case 'TOGGLE_HIGH_CONTRAST':
        this.toggleHighContrast(intent.parameters.enabled);
        break;

      case 'EXPORT_ITINERARY':
      case 'HELP':
      case 'UNKNOWN':
      default:
        break;
    }

    // Log to history
    const commandLog = {
      id: TravelOdysseyVoiceCommander.generateId(),
      timestamp: new Date().toISOString(),
      transcript: rawTranscript,
      intent: intent.action,
      action: intent.action,
      parameters: { ...intent.parameters },
      success,
      feedback: intent.feedback,
      confidence: typeof confidence === 'number' ? confidence : 1.0
    };

    this.history.unshift(commandLog);

    // Speak audio feedback
    const speechResult = this.speak(intent.feedback);

    // Emit event notifications
    this.emit('command', commandLog);
    this.emit('stateChange', this.getState());

    return {
      success,
      command: commandLog,
      state: this.getState(),
      speech: speechResult
    };
  }

  /**
   * Processes verbal transcript, parses intent, and executes command
   * Full headless test simulation support
   */
  processTranscript(rawTranscript, confidence = 1.0) {
    if (rawTranscript === null || rawTranscript === undefined || typeof rawTranscript !== 'string') {
      return {
        success: false,
        error: 'Empty or invalid transcript',
        transcript: rawTranscript,
        action: null,
        confidence: 0
      };
    }

    const clean = rawTranscript.trim();
    if (clean.length === 0) {
      return {
        success: false,
        error: 'Empty transcript',
        transcript: rawTranscript,
        action: null,
        confidence: 0
      };
    }

    const intent = this.parseIntent(clean);
    return this.executeCommand(intent, clean, confidence);
  }

  /**
   * Audio Feedback Synthesizer
   * Uses SpeechSynthesisUtterance with headless fallback
   */
  speak(text, options = {}) {
    const payload = {
      text: String(text || '').trim(),
      status: 'headless',
      timestamp: new Date().toISOString()
    };

    if (!this.speechEnabled) {
      payload.status = 'muted';
      this.emit('speak', payload);
      return { success: true, ...payload, synthesized: false };
    }

    const synth = this.speechSynthesis || (typeof window !== 'undefined' && window.speechSynthesis);
    const Utterance = this.UtteranceClass || (typeof window !== 'undefined' && window.SpeechSynthesisUtterance);

    if (synth && typeof synth.speak === 'function' && Utterance) {
      try {
        const utterance = new Utterance(payload.text);
        utterance.rate = options.rate || this.speechRate || 1.0;
        utterance.pitch = options.pitch || this.speechPitch || 1.0;
        utterance.lang = options.lang || this.lang || 'en-US';

        synth.speak(utterance);
        payload.status = 'synthesized';
        this.emit('speak', payload);
        return { success: true, ...payload, synthesized: true };
      } catch (err) {
        payload.status = 'headless';
        payload.error = err.message;
        this.emit('speak', payload);
        return { success: true, ...payload, synthesized: false, headless: true };
      }
    }

    // Headless Fallback for Node.js or browsers without SpeechSynthesis
    this.emit('speak', payload);
    return { success: true, ...payload, synthesized: false, headless: true };
  }

  /**
   * Toggle High Contrast Accessibility Mode
   */
  toggleHighContrast(force) {
    if (typeof force === 'boolean') {
      this.highContrast = force;
    } else {
      this.highContrast = !this.highContrast;
    }

    if (typeof document !== 'undefined') {
      this.applyHighContrastToDOM(this.highContrast);
    }

    this.emit('contrastToggle', { highContrast: this.highContrast });
    return this.highContrast;
  }

  /**
   * DOM helper to toggle contrast classes and attributes
   */
  applyHighContrastToDOM(isHigh) {
    if (typeof document === 'undefined') return;
    if (document.body) {
      document.body.classList.toggle('high-contrast', isHigh);
    }
    if (document.documentElement) {
      document.documentElement.setAttribute('data-contrast', isHigh ? 'high' : 'normal');
    }
  }

  /**
   * Web Speech API SpeechRecognition Initializer
   */
  setupRecognition() {
    const SpeechRec = this.RecognitionClass ||
      (typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition));

    if (!SpeechRec) {
      return null;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = this.continuous;
      recognition.interimResults = true;
      recognition.lang = this.lang;

      recognition.onstart = () => {
        this.isListening = true;
        this.emit('listeningChange', { isListening: true });
      };

      recognition.onend = () => {
        this.isListening = false;
        this.emit('listeningChange', { isListening: false });
      };

      recognition.onerror = (event) => {
        this.emit('error', { error: event.error || event });
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        let confidence = 1.0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
            if (typeof item[0].confidence === 'number' && item[0].confidence > 0) {
              confidence = item[0].confidence;
            }
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript) {
          this.emit('transcript', {
            transcript: interimTranscript,
            isFinal: false,
            confidence
          });
        }

        if (finalTranscript) {
          this.emit('transcript', {
            transcript: finalTranscript,
            isFinal: true,
            confidence
          });
          this.processTranscript(finalTranscript, confidence);
        }
      };

      this.recognition = recognition;
      return recognition;
    } catch (err) {
      this.emit('error', { error: err });
      return null;
    }
  }

  /**
   * Activates microphone acoustic listening
   */
  startListening() {
    if (this.isListening) return true;

    if (!this.recognition) {
      this.setupRecognition();
    }

    if (this.recognition && typeof this.recognition.start === 'function') {
      try {
        this.recognition.start();
      } catch (err) {
        this.emit('error', { error: err });
      }
    }

    this.isListening = true;
    this.emit('listeningChange', { isListening: true });
    return true;
  }

  /**
   * Deactivates microphone listening
   */
  stopListening() {
    if (!this.isListening) return false;

    if (this.recognition && typeof this.recognition.stop === 'function') {
      try {
        this.recognition.stop();
      } catch (err) {
        this.emit('error', { error: err });
      }
    }

    this.isListening = false;
    this.emit('listeningChange', { isListening: false });
    return false;
  }

  /**
   * Toggles listening state
   */
  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  /**
   * Returns a shallow copy of command history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears logged command history
   */
  clearHistory() {
    this.history = [];
    this.emit('historyClear', { count: 0 });
    this.emit('stateChange', this.getState());
    return true;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new TravelOdysseyVoiceCommander();

    // DOM References
    const micBtn = document.getElementById('mic-toggle-btn');
    const micStatus = document.getElementById('mic-status-text');
    const visualizer = document.getElementById('acoustic-visualizer');
    const confidenceMeterBar = document.getElementById('confidence-meter-bar');
    const confidenceVal = document.getElementById('confidence-val');
    const transcriptText = document.getElementById('live-transcript-text');
    const speechFeedbackText = document.getElementById('speech-feedback-text');
    const contrastToggleBtn = document.getElementById('contrast-toggle-btn');
    const historyList = document.getElementById('command-history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');

    // State Display Elements
    const statePage = document.getElementById('state-page');
    const stateDest = document.getElementById('state-destination');
    const stateBudget = document.getElementById('state-budget');
    const stateContrast = document.getElementById('state-contrast');

    // Simulation Input
    const simInput = document.getElementById('sim-command-input');
    const simBtn = document.getElementById('sim-command-btn');

    // Update State UI
    function renderState(state) {
      if (statePage) statePage.textContent = state.currentPage;
      if (stateDest) stateDest.textContent = state.currentDestination || 'None (Say: "set destination to [city]")';
      if (stateBudget) {
        stateBudget.textContent = state.budgetTier.toUpperCase();
        stateBudget.className = `badge-pill badge-${state.budgetTier}`;
      }
      if (stateContrast) {
        stateContrast.textContent = state.highContrast ? 'HIGH CONTRAST' : 'STANDARD';
        stateContrast.className = `badge-pill ${state.highContrast ? 'badge-contrast-on' : 'badge-contrast-off'}`;
      }
    }

    // Update History UI
    function renderHistory() {
      if (!historyList) return;
      const history = commander.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-history-item">No voice commands issued yet. Click the microphone or quick chips above.</li>';
        return;
      }

      historyList.innerHTML = history.slice(0, 10).map(item => `
        <li class="history-item ${item.success ? 'history-success' : 'history-fail'}">
          <div class="history-item-top">
            <span class="history-badge ${item.success ? 'badge-ok' : 'badge-err'}">${item.action}</span>
            <span class="history-timestamp">${new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="history-transcript">"${item.transcript}"</div>
          <div class="history-feedback">${item.feedback}</div>
          <div class="history-meta">
            ${item.parameters && Object.keys(item.parameters).length > 0
              ? `<span>Params: <code>${JSON.stringify(item.parameters)}</code></span>`
              : ''}
            <span>Confidence: ${(item.confidence * 100).toFixed(0)}%</span>
          </div>
        </li>
      `).join('');
    }

    // Event Subscriptions
    commander.on('listeningChange', ({ isListening }) => {
      if (micBtn) {
        micBtn.classList.toggle('listening', isListening);
        micBtn.setAttribute('aria-pressed', isListening);
      }
      if (visualizer) visualizer.classList.toggle('active', isListening);
      if (micStatus) {
        micStatus.textContent = isListening
          ? 'Listening... Speak your expedition command'
          : 'Microphone Standby (Click to Activate Voice Control)';
      }
    });

    commander.on('transcript', ({ transcript, isFinal, confidence }) => {
      if (transcriptText) {
        transcriptText.textContent = transcript;
        transcriptText.classList.toggle('interim', !isFinal);
      }
      if (confidenceMeterBar && typeof confidence === 'number') {
        const pct = Math.round(confidence * 100);
        confidenceMeterBar.style.width = `${pct}%`;
        if (confidenceVal) confidenceVal.textContent = `${pct}%`;
      }
    });

    commander.on('speak', ({ text }) => {
      if (speechFeedbackText) {
        speechFeedbackText.textContent = `Acoustic Dispatch: "${text}"`;
      }
    });

    commander.on('stateChange', (state) => {
      renderState(state);
      renderHistory();
    });

    commander.on('contrastToggle', ({ highContrast }) => {
      if (contrastToggleBtn) {
        contrastToggleBtn.setAttribute('aria-checked', highContrast);
      }
    });

    // Wire Interactive Controls
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    if (contrastToggleBtn) {
      contrastToggleBtn.addEventListener('click', () => {
        commander.toggleHighContrast();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
      });
    }

    // Command Simulation Input
    function handleSimulate() {
      if (!simInput) return;
      const cmd = simInput.value.trim();
      if (!cmd) return;
      if (transcriptText) transcriptText.textContent = cmd;
      commander.processTranscript(cmd, 1.0);
      simInput.value = '';
    }

    if (simBtn) {
      simBtn.addEventListener('click', handleSimulate);
    }

    if (simInput) {
      simInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSimulate();
      });
    }

    // Quick Command Chips
    const chips = document.querySelectorAll('.command-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-command');
        if (cmd) {
          if (transcriptText) transcriptText.textContent = cmd;
          commander.processTranscript(cmd, 1.0);
        }
      });
    });

    // Initial render
    renderState(commander.getState());
    renderHistory();
  });
}
