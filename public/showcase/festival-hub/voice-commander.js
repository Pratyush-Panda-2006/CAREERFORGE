/**
 * Festival Hub - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2034 - NSoC '26 Level 3 Feature
 */

export const INTENTS = {
  NAVIGATE_PAGE: 'NAVIGATE_PAGE',
  FIND_ARTIST: 'FIND_ARTIST',
  FILTER_GENRE: 'FILTER_GENRE',
  BOOK_PASS: 'BOOK_PASS',
  TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
  SET_REMINDER: 'SET_REMINDER',
  HELP: 'HELP',
  UNKNOWN: 'UNKNOWN'
};

export const PAGES = ['lineup', 'stages', 'schedule', 'tickets', 'map'];
export const GENRES = ['electronic', 'rock', 'jazz', 'indie', 'hiphop'];
export const PASS_TIERS = ['vip', 'general', 'weekend'];

export class FestivalHubVoiceCommander {
  /**
   * @param {Object} options Configuration options
   * @param {boolean} [options.highContrast=false] Initial high contrast accessibility mode
   * @param {boolean} [options.synthEnabled=true] Whether audio speech synthesis feedback is enabled
   * @param {number} [options.rate=1.0] Speech synthesis rate
   * @param {number} [options.pitch=1.0] Speech synthesis pitch
   * @param {string} [options.lang='en-US'] Language for speech recognition and synthesis
   * @param {boolean} [options.continuous=false] Continuous speech recognition mode
   * @param {boolean} [options.interimResults=false] Interim speech recognition results
   * @param {number} [options.confidenceThreshold=0.5] Minimum confidence required to execute voice commands
   * @param {Function} [options.onCommand] Optional callback fired when any command is processed
   * @param {boolean} [options.debug=false] Debug logging flag
   */
  constructor(options = {}) {
    this.highContrast = Boolean(options.highContrast);
    this.synthEnabled = options.synthEnabled !== false;
    this.rate = typeof options.rate === 'number' ? options.rate : 1.0;
    this.pitch = typeof options.pitch === 'number' ? options.pitch : 1.0;
    this.lang = options.lang || 'en-US';
    this.continuous = Boolean(options.continuous);
    this.interimResults = Boolean(options.interimResults);
    this.confidenceThreshold = typeof options.confidenceThreshold === 'number' ? options.confidenceThreshold : 0.5;
    this.onCommand = typeof options.onCommand === 'function' ? options.onCommand : null;
    this.debug = Boolean(options.debug);

    this.isListening = false;
    this.spokenMessages = [];
    this.commandHistory = [];
    this.events = {};

    this.state = {
      currentPage: 'lineup',
      activeGenreFilter: null,
      selectedPassTier: null,
      searchedArtist: null,
      lastSearchQuery: null,
      reminders: [],
      highContrast: this.highContrast
    };

    this.grammarRegistry = [
      { intent: INTENTS.HELP, description: 'List available voice commands' },
      { intent: INTENTS.TOGGLE_HIGH_CONTRAST, description: 'Toggle WCAG AAA high-contrast accessibility mode' },
      { intent: INTENTS.BOOK_PASS, description: 'Book festival tickets by tier (VIP, General, Weekend)' },
      { intent: INTENTS.FILTER_GENRE, description: 'Filter festival lineup by music genre' },
      { intent: INTENTS.SET_REMINDER, description: 'Set alert reminder for artist or stage performance' },
      { intent: INTENTS.NAVIGATE_PAGE, description: 'Navigate festival deck (lineup, stages, schedule, tickets, map)' },
      { intent: INTENTS.FIND_ARTIST, description: 'Search festival roster for specific artist' }
    ];

    this.recognition = this.initSpeechRecognition();
  }

  // ==========================================
  // Web Speech API Initialization
  // ==========================================

  initSpeechRecognition() {
    if (typeof window === 'undefined') return null;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = this.continuous;
      recognition.interimResults = this.interimResults;
      recognition.lang = this.lang;

      recognition.onstart = () => {
        this.isListening = true;
        this.emit('speechStart', {});
        this.emit('listeningChange', { isListening: true });
      };

      recognition.onend = () => {
        this.isListening = false;
        this.emit('speechEnd', {});
        this.emit('listeningChange', { isListening: false });
      };

      recognition.onresult = (event) => {
        let transcript = '';
        let confidence = 1.0;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          if (typeof event.results[i][0].confidence === 'number') {
            confidence = event.results[i][0].confidence;
          }
        }
        this.emit('transcript', { transcript, confidence, isFinal: true });
        if (confidence >= this.confidenceThreshold) {
          this.processTranscript(transcript, { confidence });
        }
      };

      recognition.onerror = (event) => {
        this.emit('error', { error: event.error });
      };

      return recognition;
    } catch (err) {
      if (this.debug) console.warn('SpeechRecognition initialization error:', err);
      return null;
    }
  }

  startListening() {
    this.isListening = true;
    this.emit('speechStart', {});
    this.emit('listeningChange', { isListening: true });

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        if (this.debug) console.warn('Recognition start exception:', err);
      }
    }
    return this.isListening;
  }

  stopListening() {
    this.isListening = false;
    this.emit('speechEnd', {});
    this.emit('listeningChange', { isListening: false });

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        if (this.debug) console.warn('Recognition stop exception:', err);
      }
    }
    return this.isListening;
  }

  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  // ==========================================
  // Grammar Registry & Intent Parser
  // ==========================================

  /**
   * Parse transcript into structured intent and parameters.
   * Handles null, undefined, malformed, empty or whitespace strings gracefully.
   *
   * @param {string} rawTranscript
   * @returns {{ action: string, params: Object, rawTranscript: string, confidence: number, status?: string, error?: string }}
   */
  parseIntent(rawTranscript) {
    if (rawTranscript === null || rawTranscript === undefined || typeof rawTranscript !== 'string') {
      return {
        action: INTENTS.UNKNOWN,
        params: {},
        rawTranscript: typeof rawTranscript === 'string' ? rawTranscript : '',
        confidence: 0,
        status: 'error',
        error: 'Empty or invalid transcript'
      };
    }

    const clean = rawTranscript.trim().replace(/[.,!?;:]+$/, '');
    if (!clean) {
      return {
        action: INTENTS.UNKNOWN,
        params: {},
        rawTranscript: '',
        confidence: 0,
        status: 'error',
        error: 'Empty or invalid transcript'
      };
    }

    // 1. HELP
    if (/^(help|what can i say|voice commands|list commands|show commands|commands)$/i.test(clean)) {
      return { action: INTENTS.HELP, params: {}, rawTranscript: clean, confidence: 1.0 };
    }

    // 2. TOGGLE_HIGH_CONTRAST
    if (
      /(toggle|enable|disable|switch|turn\s+(?:on|off))\s+(?:high[- ]contrast|accessibility\s+contrast)(?:\s*mode)?/i.test(clean) ||
      /^(?:high[- ]contrast|toggle\s+contrast|accessibility\s+contrast)(?:\s*mode)?$/i.test(clean)
    ) {
      return { action: INTENTS.TOGGLE_HIGH_CONTRAST, params: {}, rawTranscript: clean, confidence: 1.0 };
    }

    // 3. BOOK_PASS
    // Matches: "book pass vip", "book vip pass", "buy general ticket", "purchase weekend pass", "reserve vip pass", "book pass general"
    const bookMatch = clean.match(
      /(?:book|buy|purchase|reserve|get)\s+(?:a\s+)?(?:(vip|general|weekend)\s+(?:tier\s+)?(?:pass|ticket)|pass\s+(?:for\s+)?(vip|general|weekend)|ticket\s+(?:for\s+)?(vip|general|weekend)|(?:pass|ticket)\s+(vip|general|weekend)|(vip|general|weekend)\s+pass)/i
    ) || clean.match(/^(?:book|buy|reserve)\s+(vip|general|weekend)$/i);

    if (bookMatch) {
      const tier = (bookMatch[1] || bookMatch[2] || bookMatch[3] || bookMatch[4] || bookMatch[5]).toLowerCase();
      if (PASS_TIERS.includes(tier)) {
        return {
          action: INTENTS.BOOK_PASS,
          params: { passTier: tier, tier },
          rawTranscript: clean,
          confidence: 1.0
        };
      }
    }

    // 4. FILTER_GENRE
    // Matches: "filter genre electronic", "filter by rock", "indie genre", "show electronic artists", "hip hop genre"
    const filterGenreMatch = clean.match(
      /(?:filter(?:\s+by)?(?:\s+genre)?|genre|show)\s+(?:only\s+)?(electronic|rock|jazz|indie|hip[- ]?hop)(?:\s+(?:music|artists|genre))?/i
    ) || clean.match(/^(?:filter\s+)?(electronic|rock|jazz|indie|hip[- ]?hop)(?:\s+(?:music|genre))?$/i);

    if (filterGenreMatch) {
      const genreRaw = filterGenreMatch[1].toLowerCase().replace(/[- ]/g, '');
      if (GENRES.includes(genreRaw)) {
        return {
          action: INTENTS.FILTER_GENRE,
          params: { genre: genreRaw },
          rawTranscript: clean,
          confidence: 1.0
        };
      }
    }

    // 5. SET_REMINDER
    // Matches: "set reminder for Justice at Main Stage", "remind me about Daft Punk", "remind me to see Neon Trees"
    const reminderMatch = clean.match(
      /(?:set\s+(?:a\s+)?reminder|remind\s+me)(?:\s+(?:for|about|to\s+see))?\s+(.+)/i
    );
    if (reminderMatch) {
      const target = reminderMatch[1].trim();
      const atSplit = target.match(/^(.+?)\s+at\s+(.+)$/i);
      let artist = target;
      let stage = null;

      if (atSplit) {
        artist = atSplit[1].trim();
        stage = atSplit[2].trim();
      }

      return {
        action: INTENTS.SET_REMINDER,
        params: {
          target,
          artist,
          stage
        },
        rawTranscript: clean,
        confidence: 1.0
      };
    }

    // 6. NAVIGATE_PAGE
    // Matches: "go to lineup", "open stages", "show schedule", "view tickets", "festival map", "schedule page", or direct page names
    const navMatch = clean.match(
      /(?:navigate(?:\s+to)?|go\s+to|open|show(?:\s+me)?|view|switch\s+to|take\s+me\s+to)\s+(?:the\s+)?(lineup|stages|schedule|tickets|map)(?:\s+page)?/i
    ) || clean.match(/^(?:the\s+)?(lineup|stages|schedule|tickets|map)(?:\s+page)?$/i);

    if (navMatch) {
      const page = navMatch[1].toLowerCase();
      if (PAGES.includes(page)) {
        return {
          action: INTENTS.NAVIGATE_PAGE,
          params: { page },
          rawTranscript: clean,
          confidence: 1.0
        };
      }
    }

    // 7. FIND_ARTIST
    // Matches: "find artist Daft Punk", "search for Justice", "lookup artist Fred Again", "who is Disclosure", "where is Skrillex", "find Odesza"
    const findMatch = clean.match(
      /^(?:find(?:\s+artist)?|search(?:\s+for)?(?:\s+artist)?|lookup(?:\s+artist)?|look\s+for(?:\s+artist)?|who\s+is|where\s+is|show\s+artist)\s+(.+)$/i
    );
    if (findMatch) {
      const artist = findMatch[1].trim();
      if (artist.length > 0) {
        return {
          action: INTENTS.FIND_ARTIST,
          params: { artist },
          rawTranscript: clean,
          confidence: 1.0
        };
      }
    }

    // UNKNOWN / Fallback
    return {
      action: INTENTS.UNKNOWN,
      params: {},
      rawTranscript: clean,
      confidence: 0,
      status: 'unrecognized',
      feedback: 'Command not recognized. Say help for available commands.'
    };
  }

  // ==========================================
  // Command Execution & State Mutations
  // ==========================================

  /**
   * Execute parsed command action and mutate state.
   *
   * @param {string} action
   * @param {Object} params
   * @returns {string} User-facing audio feedback message
   */
  executeCommand(action, params = {}) {
    let feedback = '';

    switch (action) {
      case INTENTS.NAVIGATE_PAGE: {
        const page = params.page || 'lineup';
        this.state.currentPage = page;
        feedback = `Navigating to ${page} page.`;
        break;
      }

      case INTENTS.FIND_ARTIST: {
        const artist = params.artist || 'Unknown';
        this.state.searchedArtist = artist;
        this.state.lastSearchQuery = artist;
        feedback = `Searching for artist ${artist}.`;
        break;
      }

      case INTENTS.FILTER_GENRE: {
        const genre = params.genre || 'all';
        this.state.activeGenreFilter = genre;
        feedback = `Filtering lineup by ${genre} music.`;
        break;
      }

      case INTENTS.BOOK_PASS: {
        const passTier = params.passTier || 'general';
        this.state.selectedPassTier = passTier;
        feedback = `Booking ${passTier.toUpperCase()} festival pass.`;
        break;
      }

      case INTENTS.TOGGLE_HIGH_CONTRAST: {
        const newMode = this.toggleHighContrast();
        feedback = `High contrast mode ${newMode ? 'enabled' : 'disabled'}.`;
        break;
      }

      case INTENTS.SET_REMINDER: {
        const reminder = {
          id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          target: params.target || 'Festival event',
          artist: params.artist || params.target,
          stage: params.stage || null,
          createdAt: new Date().toISOString()
        };
        this.state.reminders.push(reminder);
        params.reminder = reminder;
        feedback = `Reminder set for ${params.target}.`;
        break;
      }

      case INTENTS.HELP: {
        feedback = 'Available commands: navigate page, find artist, filter genre, book pass, set reminder, toggle high contrast, and help.';
        break;
      }

      default: {
        feedback = 'Command not recognized. Say help for available commands.';
        break;
      }
    }

    return feedback;
  }

  // ==========================================
  // Headless Test Simulation & Processing
  // ==========================================

  /**
   * Process a speech transcript end-to-end.
   * Parses intent, updates state, generates feedback, records history, and emits events.
   *
   * @param {string} transcript
   * @param {Object} [options={}]
   * @param {number} [options.confidence=1.0]
   * @returns {Object} Execution record
   */
  processTranscript(transcript, options = {}) {
    const confidence = typeof options.confidence === 'number' ? options.confidence : 1.0;
    const parsed = this.parseIntent(transcript);
    parsed.confidence = confidence;

    const id = this.generateCommandId();
    const timestamp = new Date().toISOString();

    let feedback = '';
    let status = 'success';

    if (parsed.status === 'error' || parsed.action === INTENTS.UNKNOWN) {
      status = parsed.status === 'error' ? 'error' : 'unrecognized';
      feedback = parsed.error || 'Command not recognized. Say help for available commands.';
    } else {
      feedback = this.executeCommand(parsed.action, parsed.params);
    }

    const record = {
      id,
      action: parsed.action,
      params: parsed.params,
      confidence,
      rawTranscript: typeof transcript === 'string' ? transcript : '',
      timestamp,
      status,
      feedback
    };

    this.commandHistory.unshift(record);

    // Audio speech feedback synthesis
    if (this.synthEnabled && feedback) {
      this.speak(feedback);
    }

    // Event dispatches
    this.emit('command', record);

    if (status === 'success') {
      switch (parsed.action) {
        case INTENTS.NAVIGATE_PAGE:
          this.emit('navigate', parsed.params);
          break;
        case INTENTS.FIND_ARTIST:
          this.emit('findArtist', parsed.params);
          break;
        case INTENTS.FILTER_GENRE:
          this.emit('filterGenre', parsed.params);
          break;
        case INTENTS.BOOK_PASS:
          this.emit('bookPass', parsed.params);
          break;
        case INTENTS.TOGGLE_HIGH_CONTRAST:
          // already emitted inside toggleHighContrast
          break;
        case INTENTS.SET_REMINDER:
          this.emit('setReminder', parsed.params);
          break;
        case INTENTS.HELP:
          this.emit('help', { commands: this.getHelpCommands() });
          break;
      }
    } else if (status === 'error') {
      this.emit('error', { message: record.feedback, record });
    }

    if (typeof this.onCommand === 'function') {
      this.onCommand(record);
    }

    return record;
  }

  // ==========================================
  // Audio Feedback Synthesizer
  // ==========================================

  /**
   * Synthesize audio feedback via SpeechSynthesisUtterance with headless fallback.
   *
   * @param {string} text
   * @param {Object} [options={}]
   * @returns {string} Spoken text
   */
  speak(text, options = {}) {
    if (!text || typeof text !== 'string') return '';

    this.spokenMessages.push(text);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = typeof options.rate === 'number' ? options.rate : this.rate;
        utterance.pitch = typeof options.pitch === 'number' ? options.pitch : this.pitch;
        utterance.lang = options.lang || this.lang;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        if (this.debug) console.warn('SpeechSynthesis error:', err);
      }
    }

    return text;
  }

  clearSpokenMessages() {
    this.spokenMessages = [];
  }

  // ==========================================
  // Accessibility Contrast Mode
  // ==========================================

  /**
   * Toggle or explicitly set high contrast mode.
   *
   * @param {boolean} [forcedValue]
   * @returns {boolean} New high contrast state
   */
  toggleHighContrast(forcedValue) {
    if (typeof forcedValue === 'boolean') {
      this.highContrast = forcedValue;
    } else {
      this.highContrast = !this.highContrast;
    }

    this.state.highContrast = this.highContrast;

    if (typeof document !== 'undefined' && document.body) {
      if (this.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }

    this.emit('contrastChange', { highContrast: this.highContrast });
    return this.highContrast;
  }

  // ==========================================
  // Event Emitter Pattern
  // ==========================================

  on(eventName, handler) {
    if (typeof handler !== 'function') return this;
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(handler);
    return this;
  }

  off(eventName, handler) {
    if (!this.events[eventName]) return this;
    if (!handler) {
      delete this.events[eventName];
    } else {
      this.events[eventName] = this.events[eventName].filter((fn) => fn !== handler);
    }
    return this;
  }

  emit(eventName, data) {
    if (!this.events[eventName]) return false;
    const handlers = [...this.events[eventName]];
    for (const handler of handlers) {
      try {
        handler(data);
      } catch (err) {
        if (this.debug) console.error(`Error in event listener for ${eventName}:`, err);
      }
    }
    return true;
  }

  // ==========================================
  // Command History & ID Generation
  // ==========================================

  generateCommandId() {
    const timestamp = Date.now();
    const rand = Math.random().toString(36).substring(2, 9);
    return `cmd-${timestamp}-${rand}`;
  }

  getHistory() {
    return [...this.commandHistory];
  }

  clearHistory() {
    this.commandHistory = [];
    this.emit('historyClear', {});
  }

  getHelpCommands() {
    return [
      {
        action: INTENTS.NAVIGATE_PAGE,
        description: 'Navigate between festival sections',
        examples: ['go to lineup', 'open stages', 'show schedule', 'tickets', 'view map']
      },
      {
        action: INTENTS.FIND_ARTIST,
        description: 'Search festival artists by name',
        examples: ['find artist Daft Punk', 'search for Justice', 'who is Disclosure']
      },
      {
        action: INTENTS.FILTER_GENRE,
        description: 'Filter lineup by music genre',
        examples: ['filter genre electronic', 'filter by rock', 'indie genre', 'show hiphop']
      },
      {
        action: INTENTS.BOOK_PASS,
        description: 'Reserve or book festival passes',
        examples: ['book vip pass', 'buy general ticket', 'book weekend pass']
      },
      {
        action: INTENTS.SET_REMINDER,
        description: 'Set an alert for an artist or stage',
        examples: ['set reminder for Justice', 'remind me about Daft Punk at Main Stage']
      },
      {
        action: INTENTS.TOGGLE_HIGH_CONTRAST,
        description: 'Toggle accessibility high contrast mode',
        examples: ['toggle high contrast', 'enable contrast']
      },
      {
        action: INTENTS.HELP,
        description: 'List available voice commands',
        examples: ['help', 'what can I say', 'commands']
      }
    ];
  }

  getState() {
    return { ...this.state };
  }

  resetState() {
    this.state = {
      currentPage: 'lineup',
      activeGenreFilter: null,
      selectedPassTier: null,
      searchedArtist: null,
      lastSearchQuery: null,
      reminders: [],
      highContrast: this.highContrast
    };
  }
}

export default FestivalHubVoiceCommander;
