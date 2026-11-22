/**
 * Podcast Audio Stream - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2078 - Nexus Spring of Code 2026 (NSoC '26)
 *
 * Dedicated modular voice recognition and accessibility controller for Podcast Audio Stream.
 * Features hands-free vocal shortcuts, podcast playback controls, skip/rewind duration extraction,
 * playback speed adjustment, show notes speech synthesis, and live stream telemetry.
 */

// Common spoken number words dictionary
const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  ninety: 90
};

/**
 * Parses numeric seconds from numbers or words
 * @param {string|number} val
 * @returns {number|null}
 */
export function parseSeconds(val) {
  if (typeof val === 'number') return Math.max(0, val);
  if (!val) return null;
  const clean = String(val).trim().toLowerCase();
  if (NUMBER_WORDS[clean] !== undefined) {
    return NUMBER_WORDS[clean];
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : Math.max(0, parsed);
}

/**
 * Parses playback rate / speed multiplier from numbers, phrases or words
 * @param {string|number} val
 * @returns {number|null}
 */
export function parsePlaybackRate(val) {
  if (typeof val === 'number') return Math.min(3.0, Math.max(0.5, val));
  if (!val) return null;
  const clean = String(val).trim().toLowerCase().replace(/x$/i, '');
  if (clean === 'half' || clean === 'point five') return 0.5;
  if (clean === 'normal' || clean === 'default' || clean === 'standard') return 1.0;
  if (clean === 'one and a quarter') return 1.25;
  if (clean === 'one and a half') return 1.5;
  if (clean === 'one and three quarters') return 1.75;
  if (clean === 'double') return 2.0;
  if (clean === 'triple') return 3.0;
  if (NUMBER_WORDS[clean] !== undefined) {
    return Math.min(3.0, Math.max(0.5, NUMBER_WORDS[clean]));
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : Math.min(3.0, Math.max(0.5, parsed));
}

/**
 * Default Podcast Grammars
 */
export const PODCAST_GRAMMARS = [
  {
    id: 'play_episode',
    pattern: /(?:play|start|load|listen\s+to)\s+(?:episode|ep|track)\s+(?:#|number\s+)?(.+)/i,
    intent: 'PLAY_EPISODE',
    extractParams: (match) => ({ episode: match[1].trim() }),
    buildResponse: (params) => `Now playing episode: ${params.episode}.`
  },
  {
    id: 'resume_audio',
    pattern: /^(?:resume|play|unpause|continue)\s*(?:audio|playback|episode|stream|podcast)?$/i,
    intent: 'RESUME_PLAYBACK',
    extractParams: () => ({}),
    buildResponse: () => 'Resuming podcast audio playback.'
  },
  {
    id: 'pause_audio',
    pattern: /^(?:pause|stop|freeze|halt)\s*(?:audio|playback|episode|stream|podcast)?$/i,
    intent: 'PAUSE_PLAYBACK',
    extractParams: () => ({}),
    buildResponse: () => 'Podcast audio playback paused.'
  },
  {
    id: 'skip_forward',
    pattern: /(?:skip\s+forward|skip\s+ahead|fast\s+forward|jump\s+forward|advance)\s*(?:by\s+)?(\d+(?:\.\d+)?|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|fifty|sixty)?\s*(?:seconds?|secs?|s)?/i,
    intent: 'SKIP_FORWARD',
    extractParams: (match) => {
      const sec = parseSeconds(match[1]);
      return { seconds: sec !== null ? sec : 30 };
    },
    buildResponse: (params) => `Skipped forward ${params.seconds} seconds.`
  },
  {
    id: 'rewind',
    pattern: /(?:rewind|skip\s+back|jump\s+back|go\s+back)\s*(?:by\s+)?(\d+(?:\.\d+)?|one|two|three|four|five|ten|fifteen|twenty|thirty|forty|fifty|sixty)?\s*(?:seconds?|secs?|s)?/i,
    intent: 'REWIND',
    extractParams: (match) => {
      const sec = parseSeconds(match[1]);
      return { seconds: sec !== null ? sec : 15 };
    },
    buildResponse: (params) => `Rewound ${params.seconds} seconds.`
  },
  {
    id: 'adjust_speed',
    pattern: /(?:adjust\s+speed|playback\s+rate|play\s+at|change\s+speed(?:\s+to)?|set\s+speed(?:\s+to)?|speed)\s*(?:to\s+)?(\d+(?:\.\d+)?x?|half|double|triple|one\s+and\s+a\s+half|one\s+and\s+a\s+quarter|one|two)/i,
    intent: 'ADJUST_SPEED',
    extractParams: (match) => {
      const rate = parsePlaybackRate(match[1]);
      return { rate: rate !== null ? rate : 1.0 };
    },
    buildResponse: (params) => `Adjusted playback speed to ${params.rate}x.`
  },
  {
    id: 'search_podcast',
    pattern: /(?:search\s+(?:for\s+)?podcast|find\s+episode|lookup\s+episode|search\s+for|search)\s+(.+)/i,
    intent: 'SEARCH_PODCAST',
    extractParams: (match) => ({ query: match[1].trim() }),
    buildResponse: (params) => `Searching podcast archive for "${params.query}".`
  },
  {
    id: 'bookmark_timestamp',
    pattern: /(?:bookmark\s*(?:timestamp|audio|time)?|save\s*(?:highlight|bookmark|timestamp)|add\s*bookmark)/i,
    intent: 'BOOKMARK_TIMESTAMP',
    extractParams: () => ({}),
    buildResponse: (params, commander) => {
      const timeStr = commander ? commander.formatTime(commander.playback.currentTime) : '00:00';
      return `Timestamp bookmarked at ${timeStr}.`;
    }
  },
  {
    id: 'toggle_contrast',
    pattern: /(?:toggle\s*contrast|activate\s*dark\s*mode|toggle\s*dark\s*mode|enable\s*high\s*contrast|toggle\s*high\s*contrast|high\s*contrast|accessibility\s*mode)/i,
    intent: 'TOGGLE_CONTRAST',
    extractParams: () => ({}),
    buildResponse: () => 'Accessibility high-contrast mode toggled.'
  },
  {
    id: 'read_summary',
    pattern: /(?:read\s*(?:episode\s*)?summary|read\s*show\s*notes|read\s*(?:episode\s*)?description|describe\s*episode)/i,
    intent: 'READ_SUMMARY',
    extractParams: () => ({}),
    buildResponse: (params, commander) => {
      const summary = commander?.playback?.currentEpisode?.summary || 'Episode summary is unavailable.';
      return `Reading episode show notes: ${summary}`;
    }
  },
  {
    id: 'help',
    pattern: /(?:help|what\s+can\s+i\s+say|list\s+commands|commands\s+list)/i,
    intent: 'HELP',
    extractParams: () => ({}),
    buildResponse: () => 'Available commands: play episode, resume audio, pause audio, skip forward, rewind, adjust speed, search podcast, bookmark timestamp, toggle contrast, and read episode summary.'
  }
];

export class PodcastAudioStreamVoiceCommander {
  /**
   * @param {Object} options
   * @param {Object} [options.speechSynth] - SpeechSynthesis instance or mock
   * @param {number} [options.maxHistory=50] - Maximum history items retained
   * @param {Object} [options.initialEpisode] - Initial episode metadata
   */
  constructor(options = {}) {
    this.isListening = false;
    this.recognition = null;
    this.speechSynth = options.speechSynth !== undefined
      ? options.speechSynth
      : (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

    this.maxHistory = options.maxHistory || 50;
    this.history = [];
    this.listeners = {};
    this.customCommands = [];
    this.lastResponse = 'Podcast Voice Commander initialized. Ready for spoken navigation.';

    // Interactive Podcast Audio Stream Playback State
    this.playback = {
      isPlaying: false,
      currentTime: 145, // in seconds (02:25)
      duration: 2280, // in seconds (38:00)
      playbackRate: 1.0,
      volume: 0.9,
      contrastMode: 'dark',
      currentEpisode: options.initialEpisode || {
        id: 'ep-142',
        title: 'Episode 142: Real-Time Audio Streaming Architecture',
        channel: 'Tech Horizon Studio',
        summary: 'In this episode, we explore low-latency Web Audio streaming, browser Web Speech recognition pipelines, and DSP pitch-shifting algorithms for high-throughput mobile streaming.'
      },
      bookmarks: [
        { id: 1, time: 65, label: '01:05 - Introduction & Audio DSP' },
        { id: 2, time: 145, label: '02:25 - Web Speech API Integration' }
      ]
    };

    this.initSpeechRecognition();
  }

  /**
   * Initializes browser SpeechRecognition if supported
   */
  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        try {
          this.recognition = new SpeechRecognitionCtor();
          this.recognition.continuous = true;
          this.recognition.interimResults = false;
          this.recognition.lang = 'en-US';

          this.recognition.onstart = () => {
            this.isListening = true;
            this.emit('listening_start', { isListening: true });
          };

          this.recognition.onend = () => {
            this.isListening = false;
            this.emit('listening_stop', { isListening: false });
          };

          this.recognition.onerror = (event) => {
            this.isListening = false;
            this.emit('error', event);
          };

          this.recognition.onresult = (event) => {
            const current = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
            const transcript = event.results[current]?.[0]?.transcript || '';
            if (transcript.trim()) {
              this.executeCommand(transcript);
            }
          };
        } catch {
          this.recognition = null;
        }
      }
    }
  }

  /**
   * Starts voice capture
   * @returns {boolean}
   */
  startListening() {
    if (this.isListening) return true;
    this.isListening = true;
    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Recognition already active
      }
    }
    this.emit('listening_start', { isListening: true });
    return true;
  }

  /**
   * Stops voice capture
   * @returns {boolean}
   */
  stopListening() {
    if (!this.isListening) return false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore errors on stopping
      }
    }
    this.emit('listening_stop', { isListening: false });
    return false;
  }

  /**
   * Toggles listening state
   * @returns {boolean} Current listening state
   */
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
    return this.isListening;
  }

  /**
   * Returns whether the commander is currently listening
   * @returns {boolean}
   */
  isListeningState() {
    return this.isListening;
  }

  /**
   * Registers a custom command pattern
   * @param {string|RegExp} patternOrId
   * @param {RegExp|Function} handlerOrPattern
   * @param {string|Function} [descriptionOrHandler]
   * @param {string} [maybeDescription]
   */
  registerCommand(patternOrId, handlerOrPattern, descriptionOrHandler, maybeDescription) {
    let id, pattern, handler, description;

    if (typeof patternOrId === 'string' && handlerOrPattern instanceof RegExp) {
      id = patternOrId;
      pattern = handlerOrPattern;
      handler = typeof descriptionOrHandler === 'function' ? descriptionOrHandler : null;
      description = maybeDescription || '';
    } else {
      pattern = patternOrId;
      handler = typeof handlerOrPattern === 'function' ? handlerOrPattern : null;
      description = typeof descriptionOrHandler === 'string' ? descriptionOrHandler : '';
      id = `custom_${this.customCommands.length + 1}`;
    }

    this.customCommands.unshift({ id, pattern, handler, description });
  }

  /**
   * Parses voice transcript against domain grammars
   * @param {string} transcript
   * @returns {Object}
   */
  parseVoiceGrammar(transcript = '') {
    const raw = String(transcript || '').trim();
    if (!raw) {
      const unknownRes = {
        matched: false,
        intent: 'UNKNOWN',
        action: 'UNKNOWN',
        transcript: '',
        confidence: 0,
        params: {},
        callback: null,
        response: 'No audible speech detected. Please speak a podcast voice command.',
        timestamp: Date.now()
      };
      return unknownRes;
    }

    // Token normalization
    const normalized = raw
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. Check custom registered commands first
    for (const custom of this.customCommands) {
      const match = raw.match(custom.pattern) || normalized.match(custom.pattern);
      if (match) {
        const params = { match: match.slice(1) };
        const result = {
          matched: true,
          id: custom.id,
          intent: custom.id.toUpperCase(),
          action: custom.id.toUpperCase(),
          transcript: raw,
          confidence: 1.0,
          params,
          callback: () => {
            if (typeof custom.handler === 'function') {
              return custom.handler(match, params);
            }
            return null;
          },
          response: custom.description || `Executed custom voice command: ${custom.id}.`,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // 2. Check built-in podcast grammars
    for (const rule of PODCAST_GRAMMARS) {
      const match = raw.match(rule.pattern) || normalized.match(rule.pattern);
      if (match) {
        const params = rule.extractParams(match);
        const response = rule.buildResponse(params, this);
        const callback = this._createExecutionCallback(rule.intent, params);

        const result = {
          matched: true,
          id: rule.id,
          intent: rule.intent,
          action: rule.intent,
          transcript: raw,
          confidence: 0.95,
          params,
          callback,
          response,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // 3. Fallback for unrecognized phrases
    const fallback = {
      matched: false,
      id: 'fallback',
      intent: 'FALLBACK',
      action: 'FALLBACK',
      transcript: raw,
      confidence: 0,
      params: {},
      callback: null,
      response: `Command not recognized: "${raw}". Say "help" to review available podcast voice commands.`,
      timestamp: Date.now()
    };
    this._recordHistory(fallback);
    return fallback;
  }

  /**
   * Creates execution callback for matched grammar intents
   * @param {string} intent
   * @param {Object} params
   * @returns {Function}
   */
  _createExecutionCallback(intent, params) {
    return () => {
      switch (intent) {
        case 'PLAY_EPISODE':
          if (params.episode) {
            this.playback.currentEpisode.title = `Episode: ${params.episode}`;
          }
          this.playback.isPlaying = true;
          this.emit('playback_update', this.playback);
          return params;

        case 'RESUME_PLAYBACK':
          this.playback.isPlaying = true;
          this.emit('playback_update', this.playback);
          return this.playback;

        case 'PAUSE_PLAYBACK':
          this.playback.isPlaying = false;
          this.emit('playback_update', this.playback);
          return this.playback;

        case 'SKIP_FORWARD': {
          const sec = params.seconds || 30;
          this.playback.currentTime = Math.min(this.playback.duration, this.playback.currentTime + sec);
          this.emit('playback_update', this.playback);
          return { currentTime: this.playback.currentTime };
        }

        case 'REWIND': {
          const sec = params.seconds || 15;
          this.playback.currentTime = Math.max(0, this.playback.currentTime - sec);
          this.emit('playback_update', this.playback);
          return { currentTime: this.playback.currentTime };
        }

        case 'ADJUST_SPEED': {
          const rate = params.rate || 1.0;
          this.playback.playbackRate = rate;
          this.emit('playback_update', this.playback);
          return { playbackRate: rate };
        }

        case 'SEARCH_PODCAST':
          this.emit('search', params);
          return params;

        case 'BOOKMARK_TIMESTAMP': {
          const newBookmark = {
            id: Date.now(),
            time: Math.floor(this.playback.currentTime),
            label: `${this.formatTime(this.playback.currentTime)} - Highlight Bookmark`
          };
          this.playback.bookmarks.unshift(newBookmark);
          this.emit('playback_update', this.playback);
          return newBookmark;
        }

        case 'TOGGLE_CONTRAST':
          this.playback.contrastMode = this.playback.contrastMode === 'high-contrast' ? 'dark' : 'high-contrast';
          this.emit('contrast_change', { mode: this.playback.contrastMode });
          return { mode: this.playback.contrastMode };

        case 'READ_SUMMARY':
          this.synthesizeResponse(this.playback.currentEpisode.summary);
          return { summary: this.playback.currentEpisode.summary };

        default:
          return null;
      }
    };
  }

  /**
   * Dispatches voice synthesis output via SpeechSynthesis API
   * @param {string} msg
   * @param {Object} [options={}]
   * @returns {string|null}
   */
  synthesizeResponse(msg, options = {}) {
    const text = String(msg || '').trim();
    if (!text) return null;

    this.lastResponse = text;
    this.emit('speech_start', { text, options });

    if (this.speechSynth) {
      try {
        if (typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = options.rate !== undefined ? options.rate : (this.playback.playbackRate || 1.0);
          utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0;
          utterance.volume = options.volume !== undefined ? options.volume : (this.playback.volume || 1.0);
          if (options.lang) utterance.lang = options.lang;

          utterance.onend = () => {
            this.emit('speech_end', { text });
          };
          utterance.onerror = (err) => {
            this.emit('speech_error', err);
          };

          if (typeof this.speechSynth.cancel === 'function') {
            this.speechSynth.cancel();
          }
          this.speechSynth.speak(utterance);
          return text;
        } else if (typeof this.speechSynth.speak === 'function') {
          this.speechSynth.speak(text);
          this.emit('speech_end', { text });
          return text;
        }
      } catch (err) {
        this.emit('speech_error', err);
      }
    }

    // Graceful fallback for headless/test environments
    this.emit('speech_end', { text, simulated: true });
    return text;
  }

  /**
   * Executes a vocal transcript: parses, invokes callback, synthesizes response, logs history
   * @param {string} transcript
   * @returns {Object}
   */
  executeCommand(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    if (parsed.matched && typeof parsed.callback === 'function') {
      try {
        parsed.callback();
      } catch (err) {
        this.emit('error', err);
      }
    }
    this.synthesizeResponse(parsed.response);
    this.emit('command', parsed);
    return parsed;
  }

  /**
   * Subscribes to commander events
   * @param {string} event
   * @param {Function} fn
   * @returns {Function} Unsubscribe function
   */
  on(event, fn) {
    if (typeof fn !== 'function') return () => {};
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  /**
   * Unsubscribes from commander events
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== fn);
  }

  /**
   * Emits an event to registered listeners
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const fn of [...this.listeners[event]]) {
      try {
        fn(data);
      } catch (e) {
        // Prevent listener error from breaking commander pipeline
      }
    }
  }

  /**
   * Records an entry into the command history
   * @param {Object} entry
   */
  _recordHistory(entry) {
    const formatted = {
      ...entry,
      id: entry.id || `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timeFormatted: new Date().toLocaleTimeString()
    };
    this.history.unshift(formatted);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.emit('history_update', this.getCommandHistory());
  }

  /**
   * Returns a copy of the command history
   * @returns {Array<Object>}
   */
  getCommandHistory() {
    return [...this.history];
  }

  /**
   * Clears the command history
   */
  clearHistory() {
    this.history = [];
    this.emit('history_cleared');
    this.emit('history_update', []);
  }

  /**
   * Formats seconds into HH:MM:SS or MM:SS
   * @param {number} totalSeconds
   * @returns {string}
   */
  formatTime(totalSeconds) {
    const sec = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const remainingSeconds = sec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`;
    }
    return `${pad(minutes)}:${pad(remainingSeconds)}`;
  }

  /**
   * Seeks playback to given timestamp
   * @param {number} seconds
   */
  seek(seconds) {
    this.playback.currentTime = Math.max(0, Math.min(this.playback.duration, seconds));
    this.emit('playback_update', this.playback);
  }

  /**
   * Gets current playback state clone
   * @returns {Object}
   */
  getPlaybackState() {
    return { ...this.playback, bookmarks: [...this.playback.bookmarks] };
  }

  /**
   * Returns the last synthesized response string
   * @returns {string}
   */
  getLastResponse() {
    return this.lastResponse;
  }
}

// Browser UI Driver Execution
if (typeof document !== 'undefined') {
  const initUi = () => {
    const micBtn = document.getElementById('micToggleBtn');
    if (!micBtn) return; // Exit if DOM elements not present on this page

    const commander = new PodcastAudioStreamVoiceCommander();

    // UI Element Selectors
    const micRingContainer = document.getElementById('micRingContainer');
    const micStatusBadge = document.getElementById('micStatusBadge');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const speechToast = document.getElementById('speechToast');

    // Playback Scrub Controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const rewindBtn = document.getElementById('rewindBtn');
    const skipBtn = document.getElementById('skipBtn');
    const scrubRange = document.getElementById('scrubRange');
    const currentTimeLabel = document.getElementById('currentTimeLabel');
    const totalDurationLabel = document.getElementById('totalDurationLabel');
    const speedSelect = document.getElementById('speedSelect');
    const episodeTitleEl = document.getElementById('episodeTitle');
    const bookmarksList = document.getElementById('bookmarksList');
    const addBookmarkBtn = document.getElementById('addBookmarkBtn');

    // Speech Dispatcher Controls
    const readSummaryBtn = document.getElementById('readSummaryBtn');
    const synthOutput = document.getElementById('synthOutput');
    const contrastToggleBtn = document.getElementById('contrastToggleBtn');

    // Command History Console
    const historyContainer = document.getElementById('commandHistoryContainer');
    const clearStreamBtn = document.getElementById('clearStreamBtn');
    const manualVoiceInput = document.getElementById('manualVoiceInput');
    const submitVoiceBtn = document.getElementById('submitVoiceBtn');

    let toastTimer = null;
    function showToast(text) {
      if (!speechToast) return;
      speechToast.textContent = text;
      speechToast.classList.add('visible');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        speechToast.classList.remove('visible');
      }, 3500);
    }

    function updateListeningUi(isListening) {
      if (isListening) {
        micRingContainer?.classList.add('active');
        micBtn?.classList.add('active');
        waveVisualizer?.classList.add('active');
        if (micStatusBadge) {
          micStatusBadge.textContent = 'Listening for Voice Commands...';
          micStatusBadge.className = 'status-badge status-listening';
        }
      } else {
        micRingContainer?.classList.remove('active');
        micBtn?.classList.remove('active');
        waveVisualizer?.classList.remove('active');
        if (micStatusBadge) {
          micStatusBadge.textContent = 'Microphone Idle';
          micStatusBadge.className = 'status-badge';
        }
      }
    }

    function updatePlaybackUi(state) {
      if (scrubRange) {
        scrubRange.max = state.duration;
        scrubRange.value = state.currentTime;
      }
      if (currentTimeLabel) {
        currentTimeLabel.textContent = commander.formatTime(state.currentTime);
      }
      if (totalDurationLabel) {
        totalDurationLabel.textContent = commander.formatTime(state.duration);
      }
      if (episodeTitleEl) {
        episodeTitleEl.textContent = state.currentEpisode.title;
      }
      if (speedSelect) {
        speedSelect.value = state.playbackRate;
      }
      if (playPauseBtn && playPauseIcon) {
        if (state.isPlaying) {
          playPauseBtn.classList.add('playing');
          playPauseIcon.innerHTML = `
            <rect x="6" y="4" width="4" height="16" fill="currentColor"/>
            <rect x="14" y="4" width="4" height="16" fill="currentColor"/>
          `;
        } else {
          playPauseBtn.classList.remove('playing');
          playPauseIcon.innerHTML = `
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
          `;
        }
      }

      // Render Bookmarks
      if (bookmarksList) {
        bookmarksList.innerHTML = state.bookmarks.map((b) => `
          <button class="bookmark-chip" data-time="${b.time}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span>${b.label}</span>
          </button>
        `).join('') || '<span class="empty-bookmarks">No timestamps bookmarked yet</span>';

        bookmarksList.querySelectorAll('.bookmark-chip').forEach((chip) => {
          chip.addEventListener('click', () => {
            const time = parseFloat(chip.getAttribute('data-time'));
            if (!isNaN(time)) {
              commander.seek(time);
              showToast(`Navigated to bookmarked timestamp: ${commander.formatTime(time)}`);
            }
          });
        });
      }
    }

    function renderHistory() {
      if (!historyContainer) return;
      const items = commander.getCommandHistory();
      if (items.length === 0) {
        historyContainer.innerHTML = '<div class="stream-empty">Awaiting voice command input stream...</div>';
        return;
      }

      historyContainer.innerHTML = items.map((item) => {
        const badgeClass = item.matched ? 'badge-success' : 'badge-fallback';
        return `
          <div class="stream-item ${badgeClass}">
            <div class="item-header">
              <span class="item-transcript">"${escapeHtml(item.transcript)}"</span>
              <span class="item-intent">${item.intent}</span>
            </div>
            <p class="item-response">${escapeHtml(item.response)}</p>
            <div class="item-footer">
              <span class="item-confidence">${Math.round((item.confidence || 0) * 100)}% Confidence</span>
              <span class="item-time">${item.timeFormatted}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function escapeHtml(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Event Bindings
    commander.on('listening_start', () => updateListeningUi(true));
    commander.on('listening_stop', () => updateListeningUi(false));
    commander.on('playback_update', (st) => updatePlaybackUi(st));
    commander.on('history_update', () => renderHistory());
    commander.on('speech_start', ({ text }) => {
      if (synthOutput) synthOutput.textContent = `"${text}"`;
      waveVisualizer?.classList.add('synthesizing');
    });
    commander.on('speech_end', () => {
      waveVisualizer?.classList.remove('synthesizing');
    });
    commander.on('contrast_change', ({ mode }) => {
      document.body.classList.toggle('high-contrast-mode', mode === 'high-contrast');
      showToast(`Accessibility contrast: ${mode}`);
    });

    micBtn.addEventListener('click', () => {
      commander.toggleListening();
      if (commander.isListeningState()) {
        showToast('Listening... Speak a podcast voice command.');
      }
    });

    playPauseBtn?.addEventListener('click', () => {
      if (commander.playback.isPlaying) {
        commander.executeCommand('pause audio');
      } else {
        commander.executeCommand('resume audio');
      }
    });

    rewindBtn?.addEventListener('click', () => {
      commander.executeCommand('rewind 15 seconds');
    });

    skipBtn?.addEventListener('click', () => {
      commander.executeCommand('skip forward 30 seconds');
    });

    scrubRange?.addEventListener('input', (e) => {
      commander.seek(parseFloat(e.target.value));
    });

    speedSelect?.addEventListener('change', (e) => {
      commander.executeCommand(`adjust speed ${e.target.value}x`);
    });

    addBookmarkBtn?.addEventListener('click', () => {
      commander.executeCommand('bookmark timestamp');
    });

    readSummaryBtn?.addEventListener('click', () => {
      commander.executeCommand('read show notes');
      showToast('Reading show notes audio synthesis...');
    });

    contrastToggleBtn?.addEventListener('click', () => {
      commander.executeCommand('toggle contrast');
    });

    clearStreamBtn?.addEventListener('click', () => {
      commander.clearHistory();
      renderHistory();
      showToast('Voice command history cleared.');
    });

    const handleManualSubmit = () => {
      const text = manualVoiceInput?.value?.trim();
      if (text) {
        commander.executeCommand(text);
        if (manualVoiceInput) manualVoiceInput.value = '';
      }
    };

    submitVoiceBtn?.addEventListener('click', handleManualSubmit);
    manualVoiceInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleManualSubmit();
    });

    // Quick Command Chip Triggers
    document.querySelectorAll('.voice-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const phrase = chip.getAttribute('data-phrase');
        if (phrase) {
          commander.executeCommand(phrase);
        }
      });
    });

    // Initial UI Render
    updatePlaybackUi(commander.getPlaybackState());
    renderHistory();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUi);
  } else {
    initUi();
  }
}

export default PodcastAudioStreamVoiceCommander;
