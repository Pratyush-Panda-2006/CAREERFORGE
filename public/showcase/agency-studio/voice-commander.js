/**
 * Agency Studio - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2030 - NSoC '26 Level 3 Feature
 */

export class AgencyStudioVoiceCommander {
  /**
   * @param {Object} options Configuration options
   */
  constructor(options = {}) {
    this.options = {
      lang: 'en-US',
      confidenceThreshold: 0.5,
      highContrast: false,
      activePage: 'campaigns',
      activeTheme: 'dark',
      activeFilter: 'all',
      speechSynthesisEnabled: true,
      autoExecute: true,
      ...options
    };

    this.isListening = false;
    this.highContrast = Boolean(this.options.highContrast);
    this.activePage = this.options.activePage;
    this.activeTheme = this.options.activeTheme;
    this.activeFilter = this.options.activeFilter;
    this.activeCampaign = null;
    this.campaigns = [];
    this.lastExport = null;
    this.history = [];
    this.spokenMessages = [];
    this.lastSynthesizedSpeech = null;
    this.events = new Map();
    this.recognition = null;

    this.initSpeechRecognition();
  }

  /**
   * Initialize browser SpeechRecognition if supported
   */
  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = this.options.lang || 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.emit('listening-start');
          };

          this.recognition.onend = () => {
            this.isListening = false;
            this.emit('listening-stop');
          };

          this.recognition.onerror = (event) => {
            this.emit('error', event ? event.error : 'Unknown recognition error');
          };

          this.recognition.onresult = (event) => {
            if (!event || !event.results) return;
            let interimTranscript = '';
            let finalTranscript = '';
            let confidence = 0.9;

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const res = event.results[i];
              if (res[0]) {
                if (res.isFinal) {
                  finalTranscript += res[0].transcript;
                  if (typeof res[0].confidence === 'number' && res[0].confidence > 0) {
                    confidence = res[0].confidence;
                  }
                } else {
                  interimTranscript += res[0].transcript;
                }
              }
            }

            if (interimTranscript) {
              this.emit('interim-transcript', { transcript: interimTranscript });
            }

            if (finalTranscript) {
              this.processTranscript(finalTranscript.trim(), { confidence });
            }
          };
        } catch (e) {
          this.recognition = null;
        }
      }
    }
  }

  /**
   * Check if Web Speech API recognition is available
   */
  isSpeechRecognitionSupported() {
    return (
      typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  /**
   * Check if SpeechSynthesis is available
   */
  isSpeechSynthesisSupported() {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  /**
   * Subscribe to custom events
   * @param {string} event Event name
   * @param {Function} handler Callback function
   */
  on(event, handler) {
    if (typeof handler !== 'function') return this;
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return this;
  }

  /**
   * Unsubscribe from custom events
   * @param {string} event Event name
   * @param {Function} [handler] Callback function (removes all if omitted)
   */
  off(event, handler) {
    if (this.events.has(event)) {
      if (handler) {
        this.events.get(event).delete(handler);
      } else {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit custom event to subscribers
   * @param {string} event Event name
   * @param {*} payload Event payload
   */
  emit(event, payload) {
    if (this.events.has(event)) {
      for (const handler of this.events.get(event)) {
        try {
          handler(payload);
        } catch (err) {
          // Prevent handler failure from halting dispatcher
        }
      }
    }
    return this;
  }

  /**
   * Start listening for voice commands
   */
  startListening() {
    this.isListening = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition might already be running
      }
    }
    this.emit('listening-start');
    return this.isListening;
  }

  /**
   * Stop listening for voice commands
   */
  stopListening() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Recognition might already be stopped
      }
    }
    this.emit('listening-stop');
    return this.isListening;
  }

  /**
   * Toggle speech listening on/off
   */
  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  /**
   * Parse a raw speech transcript into a recognized intent/action and parameters
   * @param {string} transcript Speech transcript
   * @returns {Object} Parsed grammar result
   */
  parseVoiceGrammar(transcript) {
    if (
      transcript === null ||
      transcript === undefined ||
      typeof transcript !== 'string' ||
      !transcript.trim()
    ) {
      return {
        action: 'EMPTY',
        params: {},
        confidence: 0,
        raw: transcript === null || transcript === undefined ? '' : String(transcript)
      };
    }

    const text = transcript.trim();
    const normalized = text
      .toLowerCase()
      .replace(/[.,!?;:]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. HELP
    if (/^(?:help|commands|command\s+list|show\s+help|what\s+can\s+i\s+say|list\s+commands|voice\s+commands)$/i.test(normalized)) {
      return {
        action: 'HELP',
        params: {},
        confidence: 0.98,
        raw: text
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST (accessibility)
    if (/(?:high\s+contrast|contrast\s+mode|accessibility\s+contrast|accessibility\s+mode)/i.test(normalized)) {
      let mode = 'toggle';
      let enable = null;
      if (/(?:enable|turn\s+on|activate|\bon\b)/i.test(normalized)) {
        mode = 'on';
        enable = true;
      } else if (/(?:disable|turn\s+off|deactivate|\boff\b)/i.test(normalized)) {
        mode = 'off';
        enable = false;
      }
      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        params: { mode, enable },
        confidence: 0.96,
        raw: text
      };
    }

    // 3. NAVIGATE_PAGE (campaigns, creatives, briefs, analytics, settings)
    const navMatch = normalized.match(
      /^(?:go\s+to|navigate\s+to|open|view|show|display|switch\s+to|page)\s+(campaigns?|creatives?|briefs?|analytics|settings)\b/i
    ) || normalized.match(
      /(?:navigate|go)\s+to\s+(campaigns?|creatives?|briefs?|analytics|settings)\b/i
    );

    if (navMatch) {
      const pageKey = navMatch[1].toLowerCase();
      const pageMap = {
        campaign: 'campaigns',
        campaigns: 'campaigns',
        creative: 'creatives',
        creatives: 'creatives',
        brief: 'briefs',
        briefs: 'briefs',
        analytic: 'analytics',
        analytics: 'analytics',
        setting: 'settings',
        settings: 'settings'
      };
      return {
        action: 'NAVIGATE_PAGE',
        params: { page: pageMap[pageKey] || pageKey },
        confidence: 0.95,
        raw: text
      };
    }

    // 4. CREATE_CAMPAIGN (client name / campaign title extraction)
    const createRegex = /^(?:create|new|start|add|build)\s+campaign\s+(.+?)(?:\s+(?:for|client)\s+(.+))?$/i;
    const createMatch = text.match(createRegex);
    if (createMatch) {
      const title = createMatch[1].trim();
      const client = createMatch[2] ? createMatch[2].trim() : null;
      return {
        action: 'CREATE_CAMPAIGN',
        params: { title, client },
        confidence: 0.92,
        raw: text
      };
    }

    // Alternative phrasing: "create <title> campaign for <client>"
    const altCreateRegex = /^(?:create|new|start)\s+(.+?)\s+campaign(?:\s+(?:for|client)\s+(.+))?$/i;
    const altMatch = text.match(altCreateRegex);
    if (altMatch && !/^(?:theme|filter|brief)/i.test(altMatch[1])) {
      const title = altMatch[1].trim();
      const client = altMatch[2] ? altMatch[2].trim() : null;
      return {
        action: 'CREATE_CAMPAIGN',
        params: { title, client },
        confidence: 0.9,
        raw: text
      };
    }

    // 5. SWITCH_THEME (dark, neon, minimal, retro)
    const themeMatch = normalized.match(
      /(?:switch|change|set)\s+theme(?:\s+to)?\s+(dark|neon|minimal|retro)\b/i
    ) || normalized.match(
      /^theme\s+(dark|neon|minimal|retro)\b/i
    ) || normalized.match(
      /^(dark|neon|minimal|retro)\s+theme$/i
    );

    if (themeMatch) {
      const theme = themeMatch[1].toLowerCase();
      return {
        action: 'SWITCH_THEME',
        params: { theme },
        confidence: 0.95,
        raw: text
      };
    }

    // 6. FILTER_ASSETS (video, copy, graphics, photography, all)
    const filterMatch = normalized.match(
      /(?:filter\s+assets?\s+(?:by\s+)?|filter\s+|show\s+)(video|copy|graphics|photography|all)(?:\s+assets?)?\b/i
    );

    if (filterMatch) {
      const filter = filterMatch[1].toLowerCase();
      return {
        action: 'FILTER_ASSETS',
        params: { filter },
        confidence: 0.93,
        raw: text
      };
    }

    // 7. EXPORT_BRIEF (json, pdf, markdown)
    const exportMatch = normalized.match(
      /(?:export|download|save|generate)\s+(?:brief\s+)?(?:as\s+|to\s+|in\s+)?(json|pdf|markdown|md)\b/i
    ) || normalized.match(
      /(?:export|download|save)\s+brief\b/i
    );

    if (exportMatch) {
      let format = exportMatch[1] ? exportMatch[1].toLowerCase() : 'pdf';
      if (format === 'md') format = 'markdown';
      return {
        action: 'EXPORT_BRIEF',
        params: { format },
        confidence: 0.94,
        raw: text
      };
    }

    // Fallback: UNKNOWN intent
    return {
      action: 'UNKNOWN',
      params: { raw: text },
      confidence: 0.0,
      raw: text
    };
  }

  /**
   * Execute parsed command, mutate internal state, and return execution report
   * @param {Object} parsed Parsed command object
   */
  executeCommand(parsed) {
    if (!parsed || parsed.action === 'EMPTY') {
      return {
        success: false,
        action: 'EMPTY',
        feedback: 'No voice input provided.',
        params: {},
        confidence: 0
      };
    }

    let feedback = '';
    let success = true;

    switch (parsed.action) {
      case 'NAVIGATE_PAGE': {
        this.activePage = parsed.params.page;
        feedback = `Navigating to ${parsed.params.page} view.`;
        this.emit('navigate', { page: this.activePage });
        break;
      }

      case 'CREATE_CAMPAIGN': {
        const campaign = {
          id: `camp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: parsed.params.title,
          client: parsed.params.client || 'Internal Studio',
          createdAt: new Date().toISOString()
        };
        this.campaigns.push(campaign);
        this.activeCampaign = campaign;
        feedback = parsed.params.client
          ? `Created campaign "${campaign.title}" for client ${campaign.client}.`
          : `Created campaign "${campaign.title}".`;
        this.emit('campaign-created', campaign);
        break;
      }

      case 'SWITCH_THEME': {
        this.activeTheme = parsed.params.theme;
        feedback = `Studio theme switched to ${this.activeTheme}.`;
        this.emit('theme-changed', { theme: this.activeTheme });
        break;
      }

      case 'FILTER_ASSETS': {
        this.activeFilter = parsed.params.filter;
        feedback = `Assets filtered by ${this.activeFilter}.`;
        this.emit('filter-changed', { filter: this.activeFilter });
        break;
      }

      case 'TOGGLE_HIGH_CONTRAST': {
        if (parsed.params.enable === true) {
          this.highContrast = true;
        } else if (parsed.params.enable === false) {
          this.highContrast = false;
        } else {
          this.highContrast = !this.highContrast;
        }
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.toggle('high-contrast', this.highContrast);
        }
        feedback = this.highContrast
          ? 'High contrast accessibility mode enabled.'
          : 'High contrast accessibility mode disabled.';
        this.emit('contrast-changed', { highContrast: this.highContrast });
        break;
      }

      case 'EXPORT_BRIEF': {
        const format = parsed.params.format || 'pdf';
        this.lastExport = {
          format,
          timestamp: new Date().toISOString()
        };
        feedback = `Exporting creative brief in ${format.toUpperCase()} format.`;
        this.emit('brief-exported', this.lastExport);
        break;
      }

      case 'HELP': {
        feedback =
          'Available commands: navigate to page, create campaign, switch theme, filter assets, toggle high contrast, and export brief.';
        this.emit('help-requested', {
          availableCommands: [
            'NAVIGATE_PAGE',
            'CREATE_CAMPAIGN',
            'SWITCH_THEME',
            'FILTER_ASSETS',
            'TOGGLE_HIGH_CONTRAST',
            'EXPORT_BRIEF',
            'HELP'
          ]
        });
        break;
      }

      case 'UNKNOWN':
      default: {
        success = false;
        feedback = 'Command not recognized. Say "help" to review available voice commands.';
        this.emit('command-unrecognized', { rawTranscript: parsed.raw });
        break;
      }
    }

    return {
      success,
      action: parsed.action,
      params: parsed.params,
      confidence: parsed.confidence,
      feedback
    };
  }

  /**
   * Process a speech transcript, parse grammar, execute command, synthesize feedback, and log history
   * @param {string} transcript Raw speech transcript
   * @param {Object} [options] Custom execution options
   */
  processTranscript(transcript, options = {}) {
    const raw = transcript;
    this.emit('transcript', { transcript: raw });

    const parsed = this.parseVoiceGrammar(raw);
    const confidence = options.confidence !== undefined ? options.confidence : parsed.confidence;

    let executionResult;
    if (parsed.action === 'EMPTY') {
      executionResult = {
        success: false,
        action: 'EMPTY',
        feedback: 'No voice input detected.',
        params: {},
        confidence: 0
      };
    } else if (this.options.autoExecute) {
      executionResult = this.executeCommand(parsed);
    } else {
      executionResult = {
        success: parsed.action !== 'UNKNOWN',
        action: parsed.action,
        params: parsed.params,
        confidence,
        feedback: `Parsed action ${parsed.action}`
      };
    }

    // Synthesize audio feedback
    if (this.options.speechSynthesisEnabled && executionResult.feedback) {
      this.synthesizeResponse(executionResult.feedback);
    }

    // History record
    const entry = {
      id: options.id || `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      rawTranscript: typeof raw === 'string' ? raw : String(raw || ''),
      action: parsed.action,
      params: parsed.params,
      confidence,
      status: executionResult.success
        ? 'success'
        : parsed.action === 'EMPTY'
        ? 'empty'
        : 'unrecognized',
      feedback: executionResult.feedback
    };

    this.history.push(entry);
    this.emit('command', entry);

    return {
      id: entry.id,
      action: entry.action,
      params: entry.params,
      confidence: entry.confidence,
      success: executionResult.success,
      feedback: entry.feedback,
      timestamp: entry.timestamp,
      entry
    };
  }

  /**
   * Synthesize audio response with Web Speech API or headless fallback
   * @param {string} message Text message to speak
   * @param {Object} [options] Synthesizer configuration
   */
  synthesizeResponse(message, options = {}) {
    if (!message || typeof message !== 'string') return null;

    this.spokenMessages.push(message);
    this.lastSynthesizedSpeech = message;

    this.emit('speech-synthesized', { text: message });

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    ) {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.lang = options.lang || this.options.lang || 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        // Headless or permission fallback
      }
    }

    return message;
  }

  /**
   * Toggle or set high contrast mode explicitly
   * @param {boolean} [force] Optional forced boolean
   */
  toggleHighContrast(force) {
    if (typeof force === 'boolean') {
      this.highContrast = force;
    } else {
      this.highContrast = !this.highContrast;
    }

    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('high-contrast', this.highContrast);
    }

    this.emit('contrast-changed', { highContrast: this.highContrast });
    return this.highContrast;
  }

  /**
   * Retrieve immutable copy of command history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear command history log
   */
  clearHistory() {
    this.history = [];
    this.emit('history-cleared');
    return this;
  }
}
