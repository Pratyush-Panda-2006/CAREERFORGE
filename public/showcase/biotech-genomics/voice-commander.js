/**
 * BiotechGenomicsVoiceCommander
 * 
 * Web Speech API Voice Commander & Accessibility Speech Dispatcher for Biotech Genomics.
 * Provides spoken command grammar parsing, parameter extraction, audio synthesis feedback,
 * high-contrast accessibility controls, and fallback simulation for headless/test environments.
 */

export class BiotechGenomicsVoiceCommander {
  /**
   * @param {Object} options
   * @param {string} [options.lang='en-US']
   * @param {number} [options.confidenceThreshold=0.5]
   * @param {boolean} [options.continuous=true]
   * @param {boolean} [options.interimResults=true]
   * @param {boolean} [options.autoSynthesizeFeedback=true]
   * @param {number} [options.historyLimit=100]
   * @param {boolean} [options.highContrast=false]
   * @param {boolean} [options.darkMode=true]
   */
  constructor(options = {}) {
    this.lang = options.lang || 'en-US';
    this.confidenceThreshold = typeof options.confidenceThreshold === 'number' ? options.confidenceThreshold : 0.5;
    this.continuous = options.continuous !== false;
    this.interimResults = options.interimResults !== false;
    this.autoSynthesizeFeedback = options.autoSynthesizeFeedback !== false;
    this.historyLimit = options.historyLimit || 100;

    // Accessibility state
    this.highContrast = Boolean(options.highContrast);
    this.darkMode = options.darkMode !== false;

    // Runtime state
    this.isListening = false;
    this.isSpeaking = false;
    this.lastTranscript = '';
    this.lastResult = null;

    // Storage
    this.history = [];
    this.commands = [];
    this.listeners = new Map();

    // Check browser speech capabilities
    this.hasSpeechRecognition = typeof window !== 'undefined' &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    this.hasSpeechSynthesis = typeof window !== 'undefined' &&
      Boolean(window.speechSynthesis);
    this.isSimulator = !this.hasSpeechRecognition;

    this.recognition = null;
    this.activeUtterance = null;

    // Sequence / domain context mock store
    this.context = {
      activeGene: 'BRCA1',
      activeFilter: 'all',
      activeZoom: '1x',
      activeVariant: 'all',
      dataset: 'Human GRCh38.p14 Reference Genome',
      summary: 'Biotech Genomics Workspace ready. Active chromosome locus 17q21.31, containing 24 exons.'
    };

    // Register built-in biotech domain grammars
    this._registerDefaultGrammars();

    // Initialize native recognition if supported
    if (this.hasSpeechRecognition) {
      this._initRecognition();
    }
  }

  // ==========================================
  // Event Emitter Implementation
  // ==========================================

  /**
   * Subscribe to an event
   * @param {string} event
   * @param {Function} fn
   * @returns {Function} Unsubscribe function
   */
  on(event, fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Event listener must be a function');
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event
   * @param {Function} fn
   */
  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(fn);
      if (this.listeners.get(event).size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const fn of Array.from(this.listeners.get(event))) {
        try {
          fn(data);
        } catch (err) {
          console.error(`Error in listener for event "${event}":`, err);
        }
      }
    }
  }

  // ==========================================
  // Default Biotech Grammar Registration
  // ==========================================

  _registerDefaultGrammars() {
    // 1. Search Gene: "search gene <name>", "find gene <name>", "lookup gene <name>"
    this.registerCommand(
      /^(?:search|find|locate|lookup|look\s*up)\s+gene\s+([a-z0-9_\-\.\+]+)$/i,
      (match) => {
        const gene = match.parameters.gene.toUpperCase();
        this.context.activeGene = gene;
        this.emit('action_search', { gene });
        return `Searching genome database for gene ${gene}`;
      },
      'Search for a gene sequence by identifier or symbol (e.g., "search gene BRCA1")',
      {
        id: 'search_gene',
        intent: 'search_gene',
        paramExtractor: (m) => ({ gene: m[1] })
      }
    );

    // 2. Filter Sequence: "filter sequence <type>"
    this.registerCommand(
      /^(?:filter|show|display)\s+sequence\s+([a-z0-9_\-]+)$/i,
      (match) => {
        const type = match.parameters.type.toLowerCase();
        this.context.activeFilter = type;
        this.emit('action_filter', { target: 'sequence', type });
        return `Sequence display filtered by ${type}`;
      },
      'Filter displayed sequences by type or category (e.g., "filter sequence fasta")',
      {
        id: 'filter_sequence',
        intent: 'filter_sequence',
        paramExtractor: (m) => ({ target: 'sequence', type: m[1] })
      }
    );

    // 3. Filter Variant: "filter variant <type>"
    this.registerCommand(
      /^(?:filter|show|display)\s+variant\s+([a-z0-9_\-]+)$/i,
      (match) => {
        const type = match.parameters.type.toLowerCase();
        this.context.activeVariant = type;
        this.emit('action_filter', { target: 'variant', type });
        return `Variant display filtered by ${type}`;
      },
      'Filter genetic variants by classification (e.g., "filter variant pathogenic", "filter variant missense")',
      {
        id: 'filter_variant',
        intent: 'filter_variant',
        paramExtractor: (m) => ({ target: 'variant', type: m[1] })
      }
    );

    // 4. Zoom Sequence: "zoom sequence <level>", "zoom sequence in/out"
    this.registerCommand(
      /^(?:zoom|scale)\s+sequence\s+(in|out|\d+x|\d+\s*bp|\d+%|[a-z0-9]+)$/i,
      (match) => {
        const level = match.parameters.level.toLowerCase();
        this.context.activeZoom = level;
        this.emit('action_zoom', { level });
        return `Sequence viewport zoom adjusted to ${level}`;
      },
      'Zoom the sequence canvas viewport (e.g., "zoom sequence 10x", "zoom sequence in")',
      {
        id: 'zoom_sequence',
        intent: 'zoom_sequence',
        paramExtractor: (m) => ({ level: m[1] })
      }
    );

    // 5. Reset View: "reset view", "reset zoom", "restore view"
    this.registerCommand(
      /^(?:reset|restore|recenter|default)\s+(?:view|canvas|zoom|display)$/i,
      () => {
        this.context.activeZoom = '1x';
        this.emit('action_reset_view', { zoom: '1x' });
        return 'Sequence view reset to default 1x overview';
      },
      'Reset the genomic sequence canvas view to default orientation',
      {
        id: 'reset_view',
        intent: 'reset_view',
        paramExtractor: () => ({ action: 'reset' })
      }
    );

    // 6. Export Genome Data: "export genome data", "export fasta", "export json", "export vcf"
    this.registerCommand(
      /^(?:export|download|save)\s+(genome\s*data|fasta|json|bed|vcf|csv)$/i,
      (match) => {
        const format = match.parameters.format.toLowerCase();
        this.emit('action_export', { format });
        return `Exporting genomic sequence dataset as ${format.toUpperCase()}`;
      },
      'Export genomic sequence annotations and datasets (e.g., "export genome data", "export fasta")',
      {
        id: 'export_data',
        intent: 'export_data',
        paramExtractor: (m) => ({ format: m[1] })
      }
    );

    // 7. Toggle Contrast: "toggle contrast", "toggle high contrast"
    this.registerCommand(
      /^(?:toggle|switch|invert)\s+(?:high\s*)?contrast$/i,
      () => {
        this.highContrast = !this.highContrast;
        this.emit('accessibility_change', {
          highContrast: this.highContrast,
          darkMode: this.darkMode
        });
        this.emit('contrast_toggled', { highContrast: this.highContrast });
        return `High contrast accessibility mode ${this.highContrast ? 'enabled' : 'disabled'}`;
      },
      'Toggle high-contrast accessibility visual mode (e.g., "toggle contrast")',
      {
        id: 'toggle_contrast',
        intent: 'toggle_contrast',
        paramExtractor: () => ({ target: 'contrast' })
      }
    );

    // 8. Dark Mode: "activate dark mode", "enable dark mode", "toggle dark mode"
    this.registerCommand(
      /^(?:activate|enable|turn\s*on|toggle)\s+dark\s*mode$/i,
      () => {
        this.darkMode = true;
        this.emit('accessibility_change', {
          highContrast: this.highContrast,
          darkMode: this.darkMode
        });
        this.emit('dark_mode_changed', { darkMode: true });
        return 'Biotech lab dark mode activated';
      },
      'Activate dark visual theme for laboratory viewing (e.g., "activate dark mode")',
      {
        id: 'activate_dark_mode',
        intent: 'activate_dark_mode',
        paramExtractor: () => ({ target: 'dark_mode' })
      }
    );

    // 9. Read Sequence Details: "read sequence details", "read details"
    this.registerCommand(
      /^(?:read|speak|narrate|announce)\s+(?:sequence\s*details|details)$/i,
      () => {
        const text = `Active sequence is gene ${this.context.activeGene}. Zoom level is ${this.context.activeZoom}. Variant filter is ${this.context.activeVariant}.`;
        this.emit('action_read_details', { details: text });
        return text;
      },
      'Read auditory sequence details and active locus status via speech synthesis',
      {
        id: 'read_details',
        intent: 'read_details',
        paramExtractor: () => ({ topic: 'sequence_details' })
      }
    );

    // 10. Read Summary: "read sequence summary", "read summary"
    this.registerCommand(
      /^(?:read|speak|narrate|announce)\s+(?:sequence\s*summary|genome\s*summary|summary)$/i,
      () => {
        const summary = this.context.summary;
        this.emit('action_read_summary', { summary });
        return summary;
      },
      'Read comprehensive genomic dataset summary and status via speech synthesis',
      {
        id: 'read_summary',
        intent: 'read_summary',
        paramExtractor: () => ({ topic: 'summary' })
      }
    );
  }

  // ==========================================
  // Command Registration & Grammar Matching
  // ==========================================

  /**
   * Register a custom voice command
   * @param {string|RegExp} pattern
   * @param {Function} handler
   * @param {string} [description='']
   * @param {Object} [options={}]
   * @returns {Object} Registered command descriptor
   */
  registerCommand(pattern, handler, description = '', options = {}) {
    if (!pattern) throw new Error('Command pattern is required');
    if (typeof handler !== 'function') throw new TypeError('Command handler must be a function');

    const id = options.id || `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const intent = options.intent || id;

    let regex;
    if (pattern instanceof RegExp) {
      regex = pattern;
    } else if (typeof pattern === 'string') {
      // Convert plain string or parameter tokens like "search gene :gene" into regex
      const tokenRegex = /:([a-zA-Z0-9_]+)/g;
      const tokens = [];
      let tokenIndex = 0;
      const placeholderPattern = pattern.replace(tokenRegex, (match, paramName) => {
        tokens.push(paramName);
        return `__PARAM_TOKEN_${tokenIndex++}__`;
      });

      let escaped = placeholderPattern
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      tokens.forEach((paramName, idx) => {
        escaped = escaped.replace(`__PARAM_TOKEN_${idx}__`, `(?<${paramName}>[a-zA-Z0-9_\\-\\.\\+]+)`);
      });

      regex = new RegExp(`^${escaped}$`, 'i');
    } else {
      throw new TypeError('Pattern must be a string or RegExp');
    }

    const command = {
      id,
      intent,
      pattern: regex,
      rawPattern: pattern,
      handler,
      description,
      paramExtractor: options.paramExtractor || null,
      priority: options.priority || 0
    };

    // Remove existing command with same ID if present
    this.commands = this.commands.filter((c) => c.id !== id);

    // Insert sorted by priority descending
    this.commands.push(command);
    this.commands.sort((a, b) => b.priority - a.priority);

    return command;
  }

  /**
   * Unregister a command by ID
   * @param {string} id
   * @returns {boolean} True if removed
   */
  unregisterCommand(id) {
    const prevLength = this.commands.length;
    this.commands = this.commands.filter((c) => c.id !== id);
    return this.commands.length < prevLength;
  }

  /**
   * Normalize spoken transcript for robust grammar parsing
   * @param {string} text
   * @returns {string}
   */
  normalizeTranscript(text) {
    if (typeof text !== 'string') return '';

    return text
      .trim()
      .toLowerCase()
      // Remove punctuation characters (periods, commas, question marks, exclamation marks, colons, semicolons)
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, ' ')
      // Normalize multiple whitespaces
      .replace(/\s+/g, ' ')
      .trim()
      // Strip conversational courtesy prefixes/fillers
      .replace(/^(?:hey\s+biotech|biotech|please|can\s+you|could\s+you|would\s+you)\s+/i, '')
      .trim();
  }

  /**
   * Parse a transcript against registered voice grammars
   * @param {string} transcript
   * @param {number} [confidence=1.0]
   * @returns {Object} Grammar parse result
   */
  parseVoiceGrammar(transcript, confidence = 1.0) {
    const raw = typeof transcript === 'string' ? transcript : '';
    const normalized = this.normalizeTranscript(raw);

    if (!normalized) {
      return {
        matched: false,
        intent: 'unknown',
        parameters: {},
        confidence: 0,
        rawTranscript: raw,
        normalizedTranscript: '',
        description: 'Empty or invalid speech input',
        handler: null
      };
    }

    for (const cmd of this.commands) {
      const match = cmd.pattern.exec(normalized);
      if (match) {
        let parameters = {};

        // 1. Check custom parameter extractor
        if (typeof cmd.paramExtractor === 'function') {
          parameters = cmd.paramExtractor(match);
        } else if (match.groups) {
          // 2. Named groups from regex
          parameters = { ...match.groups };
        } else if (match.length > 1) {
          // 3. Positional captures
          parameters = { param1: match[1] };
          if (match.length > 2) {
            for (let i = 1; i < match.length; i++) {
              parameters[`param${i}`] = match[i];
            }
          }
        }

        return {
          matched: true,
          commandId: cmd.id,
          intent: cmd.intent,
          parameters,
          confidence,
          rawTranscript: raw,
          normalizedTranscript: normalized,
          description: cmd.description,
          handler: cmd.handler
        };
      }
    }

    // No matching grammar
    return {
      matched: false,
      intent: 'unknown',
      parameters: {},
      confidence,
      rawTranscript: raw,
      normalizedTranscript: normalized,
      description: 'Unknown or unsupported voice grammar',
      handler: null
    };
  }

  /**
   * Parse and execute a voice transcript
   * @param {string} transcript
   * @param {number} [confidence=1.0]
   * @returns {Promise<Object>} Execution result with history log
   */
  async executeTranscript(transcript, confidence = 1.0) {
    const parseResult = this.parseVoiceGrammar(transcript, confidence);
    this.lastTranscript = transcript;
    this.lastResult = parseResult;

    const historyItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      rawTranscript: parseResult.rawTranscript,
      normalizedTranscript: parseResult.normalizedTranscript,
      intent: parseResult.intent,
      parameters: parseResult.parameters,
      confidence: parseResult.confidence,
      status: 'pending',
      feedback: null,
      error: null
    };

    this.emit('command', parseResult);

    if (!parseResult.matched) {
      historyItem.status = 'unrecognized';
      historyItem.feedback = `Unrecognized command: "${transcript}". Say "read summary" or check cheat sheet.`;
      this._addHistory(historyItem);
      this.emit('command_unrecognized', historyItem);

      if (this.autoSynthesizeFeedback) {
        await this.synthesizeResponse('Command not recognized.');
      }
      return historyItem;
    }

    // Execute matching handler
    try {
      let feedback = null;
      if (typeof parseResult.handler === 'function') {
        const handlerOutput = await parseResult.handler(parseResult, this);
        feedback = typeof handlerOutput === 'string' ? handlerOutput : null;
      }

      historyItem.status = 'executed';
      historyItem.feedback = feedback;
      this._addHistory(historyItem);

      this.emit('command_executed', historyItem);

      if (feedback && this.autoSynthesizeFeedback) {
        await this.synthesizeResponse(feedback);
      }

      return historyItem;
    } catch (err) {
      historyItem.status = 'failed';
      historyItem.error = err.message || String(err);
      this._addHistory(historyItem);

      this.emit('command_failed', historyItem);

      if (this.autoSynthesizeFeedback) {
        await this.synthesizeResponse(`Execution error: ${historyItem.error}`);
      }

      return historyItem;
    }
  }

  // ==========================================
  // Web Speech API: Speech Recognition
  // ==========================================

  _initRecognition() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) return;

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = this.continuous;
      this.recognition.interimResults = this.interimResults;
      this.recognition.lang = this.lang;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.emit('listening_start', { lang: this.lang, continuous: this.continuous });
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.emit('listening_stop', {});
      };

      this.recognition.onerror = (event) => {
        this.emit('recognition_error', { error: event.error, message: event.message });
      };

      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0.85;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
            if (item[0].confidence > 0) {
              maxConfidence = item[0].confidence;
            }
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        if (interimTranscript) {
          this.emit('interim_transcript', { transcript: interimTranscript });
        }

        if (finalTranscript) {
          this.emit('final_transcript', {
            transcript: finalTranscript,
            confidence: maxConfidence
          });
          this.executeTranscript(finalTranscript, maxConfidence);
        }
      };
    } catch (err) {
      console.warn('SpeechRecognition initialization error:', err);
      this.isSimulator = true;
    }
  }

  /**
   * Start listening for spoken input
   * @returns {boolean} True if listening started or simulated
   */
  startListening() {
    if (this.isListening) return true;

    if (this.recognition && this.hasSpeechRecognition) {
      try {
        this.recognition.start();
        return true;
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }

    // Fallback simulation mode
    this.isListening = true;
    this.emit('listening_start', { simulated: true, lang: this.lang });
    return true;
  }

  /**
   * Stop listening for spoken input
   * @returns {boolean} True if stopped
   */
  stopListening() {
    if (!this.isListening) return false;

    if (this.recognition && this.hasSpeechRecognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }

    this.isListening = false;
    this.emit('listening_stop', {});
    return true;
  }

  /**
   * Toggle speech listening state
   * @returns {boolean} New listening state
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
   * Programmatically simulate spoken voice input (headless / UI tests)
   * @param {string} transcript
   * @param {number} [confidence=0.95]
   * @returns {Promise<Object>} Execution result
   */
  async simulateSpokenInput(transcript, confidence = 0.95) {
    this.emit('simulated_speech', { transcript, confidence });
    return this.executeTranscript(transcript, confidence);
  }

  // ==========================================
  // Web Speech API: Speech Synthesis Dispatcher
  // ==========================================

  /**
   * Synthesize audio response via Web Speech API or headless simulation
   * @param {string} msg Text to speak
   * @param {Object} [options={}]
   * @returns {Promise<Object>}
   */
  synthesizeResponse(msg, options = {}) {
    if (typeof msg !== 'string' || !msg.trim()) {
      return Promise.resolve({ spoken: false, reason: 'empty_message' });
    }

    const text = msg.trim();
    const rate = options.rate || 1.0;
    const pitch = options.pitch || 1.0;
    const volume = options.volume !== undefined ? options.volume : 1.0;
    const lang = options.lang || this.lang;

    this.isSpeaking = true;
    this.emit('speech_start', { text, rate, pitch, volume, lang });

    if (this.hasSpeechSynthesis && typeof window !== 'undefined' && window.SpeechSynthesisUtterance) {
      return new Promise((resolve) => {
        try {
          const utterance = new window.SpeechSynthesisUtterance(text);
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.volume = volume;
          utterance.lang = lang;
          this.activeUtterance = utterance;

          utterance.onend = () => {
            this.isSpeaking = false;
            this.activeUtterance = null;
            this.emit('speech_end', { text });
            resolve({ spoken: true, text });
          };

          utterance.onerror = (err) => {
            this.isSpeaking = false;
            this.activeUtterance = null;
            this.emit('speech_error', { error: err.error, text });
            resolve({ spoken: false, error: err.error, text });
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          this.isSpeaking = false;
          this.activeUtterance = null;
          resolve({ spoken: false, error: err.message, text });
        }
      });
    }

    // Headless / non-browser fallback simulation
    return new Promise((resolve) => {
      // Small simulated delay for async fidelity
      setTimeout(() => {
        this.isSpeaking = false;
        this.emit('speech_end', { text, simulated: true });
        resolve({ spoken: true, simulated: true, text });
      }, 10);
    });
  }

  /**
   * Cancel any active speech synthesis
   */
  cancelSpeech() {
    if (this.hasSpeechSynthesis && typeof window !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
      } catch (err) {
        console.warn('Speech cancellation error:', err);
      }
    }
    this.isSpeaking = false;
    this.activeUtterance = null;
    this.emit('speech_cancelled', {});
  }

  // ==========================================
  // Accessibility & Visual Mode Controls
  // ==========================================

  /**
   * Toggle high contrast accessibility mode
   * @param {boolean} [enable]
   * @returns {boolean} New state
   */
  toggleContrast(enable) {
    this.highContrast = typeof enable === 'boolean' ? enable : !this.highContrast;
    this.emit('contrast_toggled', { highContrast: this.highContrast });
    this.emit('accessibility_change', {
      highContrast: this.highContrast,
      darkMode: this.darkMode
    });
    return this.highContrast;
  }

  /**
   * Set dark mode state
   * @param {boolean} enable
   * @returns {boolean}
   */
  setDarkMode(enable) {
    this.darkMode = Boolean(enable);
    this.emit('dark_mode_changed', { darkMode: this.darkMode });
    this.emit('accessibility_change', {
      highContrast: this.highContrast,
      darkMode: this.darkMode
    });
    return this.darkMode;
  }

  // ==========================================
  // Command History Management
  // ==========================================

  _addHistory(item) {
    this.history.unshift(item);
    if (this.history.length > this.historyLimit) {
      this.history.pop();
    }
    this.emit('history_updated', {
      latest: item,
      totalCount: this.history.length
    });
  }

  /**
   * Get a copy of the command history
   * @returns {Array<Object>}
   */
  getCommandHistory() {
    return [...this.history];
  }

  /**
   * Clear all command history
   */
  clearHistory() {
    this.history = [];
    this.emit('history_cleared', {});
  }
}

// Global browser window export fallback
if (typeof window !== 'undefined') {
  window.BiotechGenomicsVoiceCommander = BiotechGenomicsVoiceCommander;
}

// Browser DOM bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new BiotechGenomicsVoiceCommander();
    const heroConsole = document.getElementById('hero-console');
    const micToggleBtn = document.getElementById('mic-toggle-btn');
    const micBtnLabel = document.getElementById('mic-btn-label');
    const statusText = document.getElementById('voice-status-text');
    const liveTranscriptBox = document.getElementById('live-transcript-box');
    const streamList = document.getElementById('command-stream-list');
    const cmdCounter = document.getElementById('cmd-counter');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const toastContainer = document.getElementById('toast-container');
    const canvas = document.getElementById('wave-visualizer-canvas');

    const toggleContrastBtn = document.getElementById('toggle-contrast-btn');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');
    const toggleSpeechMuteBtn = document.getElementById('toggle-speech-mute-btn');

    const activeGeneVal = document.getElementById('active-gene-val');
    const activeFilterVal = document.getElementById('active-filter-val');
    const activeZoomVal = document.getElementById('active-zoom-val');

    const manualInput = document.getElementById('manual-speech-input');
    const dispatchManualBtn = document.getElementById('dispatch-manual-btn');

    // Toast helper
    function showToast(title, message) {
      if (!toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'speech-toast';
      toast.innerHTML = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <div class="toast-body">
          <div class="toast-title">${title}</div>
          <div class="toast-msg">${message}</div>
        </div>
      `;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }

    // Update Console Stream List
    function renderCommandStream() {
      if (!streamList) return;
      const history = commander.getCommandHistory();

      if (cmdCounter) {
        cmdCounter.textContent = `${history.length} COMMAND${history.length === 1 ? '' : 'S'}`;
      }

      if (history.length === 0) {
        streamList.innerHTML = `
          <div class="stream-empty-state">
            No voice commands dispatched yet.<br>
            Click the microphone button above or choose a grammar chip to start.
          </div>
        `;
        return;
      }

      streamList.innerHTML = history.map((item) => {
        const time = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const paramsEntries = Object.entries(item.parameters || {});
        const paramsHtml = paramsEntries.length > 0
          ? `<div class="params-badge-row">${paramsEntries.map(([k, v]) => `<span class="param-badge">${k}: <strong>${v}</strong></span>`).join('')}</div>`
          : '';

        return `
          <div class="stream-item status-${item.status}">
            <div class="stream-item-header">
              <span class="intent-tag">[${item.intent}]</span>
              <span class="time-stamp">${time} • ${Math.round(item.confidence * 100)}% conf</span>
            </div>
            <div class="transcript-spoken">"${item.rawTranscript}"</div>
            ${item.feedback ? `<div class="feedback-reply"><span aria-hidden="true">💬</span> ${item.feedback}</div>` : ''}
            ${item.error ? `<div class="feedback-reply" style="color: var(--rose)"><span aria-hidden="true">⚠️</span> ${item.error}</div>` : ''}
            ${paramsHtml}
          </div>
        `;
      }).join('');
    }

    // Audio Wave Visualizer Animation
    let wavePhase = 0;

    function drawWave() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const isListening = commander.isListening;
      const isSpeaking = commander.isSpeaking;

      const baseAmplitude = isSpeaking ? 22 : (isListening ? 16 : 4);
      const frequency = isSpeaking ? 0.04 : (isListening ? 0.03 : 0.015);
      const speed = isSpeaking ? 0.12 : (isListening ? 0.08 : 0.02);

      wavePhase += speed;

      const waves = [
        { color: 'rgba(6, 182, 212, 0.8)', amp: baseAmplitude, freq: frequency, offset: 0 },
        { color: 'rgba(20, 184, 166, 0.6)', amp: baseAmplitude * 0.7, freq: frequency * 1.5, offset: 1.5 },
        { color: 'rgba(16, 185, 129, 0.4)', amp: baseAmplitude * 0.4, freq: frequency * 0.8, offset: 3.0 }
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = w.color;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * w.freq + wavePhase + w.offset) * w.amp;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      requestAnimationFrame(drawWave);
    }

    drawWave();

    // Event Subscriptions
    commander.on('listening_start', () => {
      if (heroConsole) heroConsole.classList.add('listening');
      if (micBtnLabel) micBtnLabel.textContent = 'Active';
      if (statusText) statusText.textContent = 'Listening... Speak gene command, filter, zoom or summary';
      if (micToggleBtn) micToggleBtn.setAttribute('aria-pressed', 'true');
    });

    commander.on('listening_stop', () => {
      if (heroConsole) heroConsole.classList.remove('listening');
      if (micBtnLabel) micBtnLabel.textContent = 'Listen';
      if (statusText) statusText.textContent = 'Microphone Standby • Click Mic or Speak to Activate';
      if (micToggleBtn) micToggleBtn.setAttribute('aria-pressed', 'false');
    });

    commander.on('speech_start', (d) => {
      if (heroConsole) heroConsole.classList.add('speaking');
      if (statusText) statusText.textContent = `Vocal Output: "${d.text}"`;
      showToast('Speech Dispatcher', d.text);
    });

    commander.on('speech_end', () => {
      if (heroConsole) heroConsole.classList.remove('speaking');
      if (statusText && !commander.isListening) {
        statusText.textContent = 'Standby • Audio synthesis complete';
      }
    });

    commander.on('interim_transcript', (d) => {
      if (liveTranscriptBox) {
        liveTranscriptBox.innerHTML = `<span>Hearing: <em>"${d.transcript}"</em></span>`;
      }
    });

    commander.on('final_transcript', (d) => {
      if (liveTranscriptBox) {
        liveTranscriptBox.innerHTML = `<span>Processed: <strong>"${d.transcript}"</strong></span>`;
      }
    });

    commander.on('command_executed', () => {
      renderCommandStream();
    });

    commander.on('command_unrecognized', () => {
      renderCommandStream();
    });

    commander.on('history_cleared', () => {
      renderCommandStream();
    });

    // Domain Action Handlers to update Mock Workspace
    commander.on('action_search', (d) => {
      if (activeGeneVal) activeGeneVal.textContent = d.gene;
    });

    commander.on('action_filter', (d) => {
      if (activeFilterVal) activeFilterVal.textContent = d.type.toUpperCase();
    });

    commander.on('action_zoom', (d) => {
      if (activeZoomVal) activeZoomVal.textContent = d.level.toUpperCase();
    });

    commander.on('action_reset_view', () => {
      if (activeZoomVal) activeZoomVal.textContent = '1X';
    });

    commander.on('contrast_toggled', (d) => {
      if (d.highContrast) {
        document.body.classList.add('high-contrast');
        document.documentElement.setAttribute('data-contrast', 'high');
        if (toggleContrastBtn) {
          toggleContrastBtn.classList.add('active');
          toggleContrastBtn.setAttribute('aria-pressed', 'true');
        }
      } else {
        document.body.classList.remove('high-contrast');
        document.documentElement.removeAttribute('data-contrast');
        if (toggleContrastBtn) {
          toggleContrastBtn.classList.remove('active');
          toggleContrastBtn.setAttribute('aria-pressed', 'false');
        }
      }
    });

    // Button interactions
    if (micToggleBtn) {
      micToggleBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    if (toggleContrastBtn) {
      toggleContrastBtn.addEventListener('click', () => {
        commander.toggleContrast();
      });
    }

    if (toggleThemeBtn) {
      toggleThemeBtn.addEventListener('click', () => {
        const nextDark = !commander.darkMode;
        commander.setDarkMode(nextDark);
        toggleThemeBtn.classList.toggle('active', !nextDark);
        toggleThemeBtn.innerHTML = nextDark
          ? '<span aria-hidden="true">🌙</span> Dark Mode'
          : '<span aria-hidden="true">☀️</span> Light Mode';
      });
    }

    if (toggleSpeechMuteBtn) {
      toggleSpeechMuteBtn.addEventListener('click', () => {
        commander.autoSynthesizeFeedback = !commander.autoSynthesizeFeedback;
        const active = commander.autoSynthesizeFeedback;
        toggleSpeechMuteBtn.classList.toggle('active', !active);
        toggleSpeechMuteBtn.setAttribute('aria-pressed', String(!active));
        toggleSpeechMuteBtn.innerHTML = active
          ? '<span aria-hidden="true">🔊</span> Vocal Feedback'
          : '<span aria-hidden="true">🔇</span> Vocal Muted';
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
      });
    }

    // Grammar Cheat Sheet Click Handling
    document.querySelectorAll('.grammar-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          if (liveTranscriptBox) {
            liveTranscriptBox.innerHTML = `<span>Simulated: <strong>"${cmd}"</strong></span>`;
          }
          commander.simulateSpokenInput(cmd);
        }
      });
    });

    // Manual Input Handling
    function handleManualDispatch() {
      if (!manualInput) return;
      const text = manualInput.value.trim();
      if (text) {
        if (liveTranscriptBox) {
          liveTranscriptBox.innerHTML = `<span>Manual Input: <strong>"${text}"</strong></span>`;
        }
        commander.simulateSpokenInput(text);
        manualInput.value = '';
      }
    }

    if (dispatchManualBtn) {
      dispatchManualBtn.addEventListener('click', handleManualDispatch);
    }
    if (manualInput) {
      manualInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleManualDispatch();
        }
      });
    }
  });
}

