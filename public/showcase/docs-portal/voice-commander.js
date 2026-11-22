/**
 * Docs Portal - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Hands-free documentation navigation, search, code copying, and speech synthesis assistant.
 * Issue #2046 (NSoC '26 Level 3)
 */

export const DOCS_SECTIONS = {
  'api reference': { slug: 'api-reference', title: 'API Reference' },
  'guides': { slug: 'guides', title: 'Guides' },
  'tutorials': { slug: 'tutorials', title: 'Tutorials' },
  'changelog': { slug: 'changelog', title: 'Changelog' },
  'getting started': { slug: 'getting-started', title: 'Getting Started' },
  'architecture': { slug: 'architecture', title: 'Architecture' },
  'overview': { slug: 'overview', title: 'Overview' }
};

export const DOCS_COMMAND_ACTIONS = {
  SEARCH_DOCS: 'SEARCH_DOCS',
  NAVIGATE_SECTION: 'NAVIGATE_SECTION',
  COPY_CODE: 'COPY_CODE',
  READ_ARTICLE: 'READ_ARTICLE',
  TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
  ZOOM_FONT: 'ZOOM_FONT',
  HELP: 'HELP',
  UNKNOWN_COMMAND: 'UNKNOWN_COMMAND'
};

export class DocsPortalVoiceCommander {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxHistory=50]
   * @param {Object} [options.speechSynth]
   * @param {boolean} [options.highContrast=false]
   * @param {number} [options.fontSizeZoom=100]
   * @param {string} [options.currentSection='overview']
   */
  constructor(options = {}) {
    this.maxHistory = options.maxHistory || 50;
    this.isListening = false;
    this.status = 'Idle'; // 'Idle' | 'Listening' | 'Processing' | 'Synthesizing'
    this.highContrast = Boolean(options.highContrast);
    this.fontSizeZoom = typeof options.fontSizeZoom === 'number' ? options.fontSizeZoom : 100;
    this.currentSection = options.currentSection || 'overview';
    this.lastQuery = '';
    this.lastCopied = null;
    this.lastResponse = options.initialResponse || 'Docs Portal Voice Commander standby. Ready for voice commands.';
    this.history = [];

    this.speechSynth = options.speechSynth || options.synth || (
      typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
    );

    this.recognition = null;
    this.listeners = {};
    this.customCommands = [];
    this.domBound = false;
    this.elements = {};
    this.toastTimeout = null;

    this.initSpeechRecognition();
  }

  /**
   * Initializes browser SpeechRecognition if available
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
            this.setStatus('Listening');
          };

          this.recognition.onresult = (event) => {
            const current = event.resultIndex !== undefined ? event.resultIndex : event.results.length - 1;
            const transcript = event.results[current][0]?.transcript || '';
            this.dispatchCommand(transcript);
          };

          this.recognition.onerror = (e) => {
            this.emit('speech-error', e);
          };

          this.recognition.onend = () => {
            if (this.isListening) {
              try {
                this.recognition.start();
              } catch {
                this.stopListening();
              }
            } else {
              this.setStatus('Idle');
            }
          };
        } catch {
          this.recognition = null;
        }
      }
    }
  }

  /**
   * Event Emitter: subscribe to event
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  on(event, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Event Emitter: unsubscribe from event
   * @param {string} event
   * @param {Function} [callback]
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    if (!callback) {
      delete this.listeners[event];
      return;
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Event Emitter: dispatch event
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]) {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in DocsPortalVoiceCommander listener for "${event}":`, err);
      }
    }
  }

  /**
   * Register a custom voice grammar rule
   * @param {string} id
   * @param {RegExp} pattern
   * @param {string} action
   * @param {string|Function} response
   */
  registerCommand(id, pattern, action, response) {
    this.customCommands.unshift({ id, pattern, action, response });
  }

  /**
   * Check listening state
   * @returns {boolean}
   */
  isListeningState() {
    return this.isListening;
  }

  /**
   * Return current status
   * @returns {string}
   */
  getStatus() {
    return this.status;
  }

  /**
   * Update current status & emit event
   * @param {string} status
   */
  setStatus(status) {
    const prev = this.status;
    this.status = status;
    this.emit('status-change', { status, previous: prev });
    if (this.domBound) {
      this.updateStatusUI();
    }
  }

  /**
   * Return snapshot of internal state
   * @returns {Object}
   */
  getState() {
    return {
      isListening: this.isListening,
      status: this.status,
      highContrast: this.highContrast,
      fontSizeZoom: this.fontSizeZoom,
      currentSection: this.currentSection,
      lastQuery: this.lastQuery,
      lastCopied: this.lastCopied,
      lastResponse: this.lastResponse,
      historyCount: this.history.length
    };
  }

  /**
   * Return last generated response
   * @returns {string}
   */
  getLastResponse() {
    return this.lastResponse;
  }

  /**
   * Starts listening for voice commands (Web Speech API or headless simulator fallback)
   * @returns {boolean}
   */
  startListening() {
    if (this.isListening) return true;
    this.isListening = true;
    this.setStatus('Listening');
    this.emit('listening-start');

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch {
        // Recognition already active or headless simulator fallback
      }
    }

    if (this.domBound) {
      this.updateListeningUI(true);
    }
    return true;
  }

  /**
   * Stops listening for voice commands
   * @returns {boolean}
   */
  stopListening() {
    if (!this.isListening) return false;
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.setStatus('Idle');
    this.emit('listening-stop');

    if (this.domBound) {
      this.updateListeningUI(false);
    }
    return false;
  }

  /**
   * Toggles listening mode
   * @returns {boolean}
   */
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    }
    this.startListening();
    return true;
  }

  /**
   * Parses spoken transcript against documentation voice grammars
   * @param {string} transcript
   * @returns {Object}
   */
  parseVoiceGrammar(transcript) {
    const text = String(transcript || '').trim();

    if (!text) {
      return {
        matched: false,
        action: DOCS_COMMAND_ACTIONS.UNKNOWN_COMMAND,
        commandId: 'empty',
        transcript: '',
        confidence: 0,
        payload: {},
        response: 'Command not recognized. Say "help" to review available documentation commands.'
      };
    }

    // 1. Check custom registered commands
    for (const cmd of this.customCommands) {
      const match = text.match(cmd.pattern);
      if (match) {
        const responseText = typeof cmd.response === 'function' ? cmd.response(match) : cmd.response;
        return {
          matched: true,
          action: cmd.action,
          commandId: cmd.id,
          transcript: text,
          confidence: 1,
          payload: { match: match.slice(1) },
          response: responseText
        };
      }
    }

    // 2. HELP: "help", "list commands", "what can I say"
    if (/^(?:help|list\s+commands|what\s+can\s+i\s+say|show\s+commands|available\s+commands)$/i.test(text)) {
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.HELP,
        commandId: 'cmd_help',
        transcript: text,
        confidence: 1,
        payload: {
          commands: [
            'SEARCH_DOCS',
            'NAVIGATE_SECTION',
            'COPY_CODE',
            'READ_ARTICLE',
            'TOGGLE_HIGH_CONTRAST',
            'ZOOM_FONT',
            'HELP'
          ]
        },
        response: 'Available voice commands: search docs for <query>, navigate to <section>, copy code snippet, read aloud, toggle contrast, increase or decrease font size, and help.'
      };
    }

    // 3. ZOOM_FONT: "increase font size", "decrease font size", "reset zoom"
    if (/^(?:increase\s+font(?:\s*size)?|zoom\s+in|enlarge\s+font|larger\s+text|bigger\s+text)$/i.test(text)) {
      const newZoom = Math.min(200, this.fontSizeZoom + 15);
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.ZOOM_FONT,
        commandId: 'cmd_zoom_increase',
        transcript: text,
        confidence: 1,
        payload: { direction: 'increase', zoomLevel: newZoom },
        response: `Font size increased to ${newZoom}%.`
      };
    }

    if (/^(?:decrease\s+font(?:\s*size)?|zoom\s+out|shrink\s+font|smaller\s+text)$/i.test(text)) {
      const newZoom = Math.max(70, this.fontSizeZoom - 15);
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.ZOOM_FONT,
        commandId: 'cmd_zoom_decrease',
        transcript: text,
        confidence: 1,
        payload: { direction: 'decrease', zoomLevel: newZoom },
        response: `Font size decreased to ${newZoom}%.`
      };
    }

    if (/^(?:reset\s+zoom|reset\s+font(?:\s*size)?|normal\s+font(?:\s*size)?|default\s+zoom)$/i.test(text)) {
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.ZOOM_FONT,
        commandId: 'cmd_zoom_reset',
        transcript: text,
        confidence: 1,
        payload: { direction: 'reset', zoomLevel: 100 },
        response: 'Font zoom reset to 100%.'
      };
    }

    // 4. TOGGLE_HIGH_CONTRAST: "toggle contrast", "high contrast mode", "accessibility mode"
    if (/^(?:toggle\s+contrast|high\s+contrast(?:\s+mode)?|accessibility\s+mode|enable\s+contrast|disable\s+contrast)$/i.test(text)) {
      let target;
      if (/enable/i.test(text)) {
        target = true;
      } else if (/disable/i.test(text)) {
        target = false;
      } else {
        target = !this.highContrast;
      }
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST,
        commandId: 'cmd_toggle_contrast',
        transcript: text,
        confidence: 1,
        payload: { highContrast: target },
        response: `High contrast mode ${target ? 'enabled' : 'disabled'}.`
      };
    }

    // 5. READ_ARTICLE: "read section", "read aloud", "speak summary"
    if (/^(?:read\s+section|read\s+aloud|speak\s+summary|read\s+article|narrate\s+section)$/i.test(text)) {
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.READ_ARTICLE,
        commandId: 'cmd_read_article',
        transcript: text,
        confidence: 1,
        payload: { target: this.currentSection, mode: 'read-aloud' },
        response: 'Reading active documentation article aloud.'
      };
    }

    // 6. COPY_CODE: "copy code snippet", "copy example", "copy block"
    if (/^(?:copy\s+(?:code\s*snippet|example|block|code)|copy)$/i.test(text)) {
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.COPY_CODE,
        commandId: 'cmd_copy_code',
        transcript: text,
        confidence: 1,
        payload: { snippetId: 'code-sample-active', copied: true },
        response: 'Code snippet copied to clipboard.'
      };
    }

    // 7. NAVIGATE_SECTION: "go to api reference", "open guides", "navigate to tutorials", "jump to changelog"
    const navMatch = text.match(/^(?:go\s+to|open|navigate\s+to|jump\s+to)\s+(.+)$/i);
    if (navMatch) {
      const rawSection = navMatch[1].trim().toLowerCase();
      const mapped = DOCS_SECTIONS[rawSection];
      const slug = mapped ? mapped.slug : rawSection.replace(/[^a-z0-9]+/g, '-');
      const title = mapped ? mapped.title : rawSection.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION,
        commandId: 'cmd_navigate_section',
        transcript: text,
        confidence: 1,
        payload: { section: rawSection, slug, title },
        response: `Navigating to ${title} section.`
      };
    }

    // 8. SEARCH_DOCS: "search docs for <query>", "find <query>", "search <query>"
    const searchMatch = text.match(/^(?:search\s+docs\s+for|search\s+for|find|lookup|search)\s+(.+)$/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      return {
        matched: true,
        action: DOCS_COMMAND_ACTIONS.SEARCH_DOCS,
        commandId: 'cmd_search_docs',
        transcript: text,
        confidence: 1,
        payload: { query },
        response: `Searching documentation for "${query}".`
      };
    }

    // 9. Unknown / Unrecognized Command Fallback
    return {
      matched: false,
      action: DOCS_COMMAND_ACTIONS.UNKNOWN_COMMAND,
      commandId: 'cmd_unknown',
      transcript: text,
      confidence: 0,
      payload: {},
      response: `Command not recognized: "${text}". Say "help" to review available documentation commands.`
    };
  }

  /**
   * Executes a command action and mutates internal state
   * @param {string} action
   * @param {Object} [payload={}]
   * @returns {Object}
   */
  executeCommand(action, payload = {}) {
    let result = {};

    switch (action) {
      case DOCS_COMMAND_ACTIONS.SEARCH_DOCS:
        this.lastQuery = payload.query || '';
        result = { success: true, action, query: this.lastQuery };
        break;

      case DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION:
        this.currentSection = payload.slug || payload.section || 'overview';
        result = { success: true, action, section: this.currentSection, title: payload.title };
        break;

      case DOCS_COMMAND_ACTIONS.COPY_CODE:
        this.lastCopied = payload.codeSnippet || 'import { DocsPortalClient } from "@careerforge/docs-portal";';
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            navigator.clipboard.writeText(this.lastCopied);
          } catch {}
        }
        result = { success: true, action, copied: true, snippet: this.lastCopied };
        break;

      case DOCS_COMMAND_ACTIONS.READ_ARTICLE:
        result = { success: true, action, reading: true, target: payload.target || this.currentSection };
        break;

      case DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST:
        if (typeof payload.highContrast === 'boolean') {
          this.highContrast = payload.highContrast;
        } else {
          this.highContrast = !this.highContrast;
        }
        result = { success: true, action, highContrast: this.highContrast };
        break;

      case DOCS_COMMAND_ACTIONS.ZOOM_FONT: {
        if (typeof payload.zoomLevel === 'number') {
          this.fontSizeZoom = Math.max(70, Math.min(200, payload.zoomLevel));
        } else if (payload.direction === 'increase') {
          this.fontSizeZoom = Math.min(200, this.fontSizeZoom + 15);
        } else if (payload.direction === 'decrease') {
          this.fontSizeZoom = Math.max(70, this.fontSizeZoom - 15);
        } else {
          this.fontSizeZoom = 100;
        }
        const dir = payload.direction || (payload.zoomLevel ? 'custom' : 'reset');
        result = { success: true, action, direction: dir, zoomLevel: this.fontSizeZoom };
        break;
      }

      case DOCS_COMMAND_ACTIONS.HELP:
        result = { success: true, action, commands: payload.commands || [] };
        break;

      default:
        result = { success: false, action: DOCS_COMMAND_ACTIONS.UNKNOWN_COMMAND };
        break;
    }

    this.emit('command-executed', { action, payload, result, state: this.getState() });
    this.emit('state-change', this.getState());

    if (this.domBound) {
      this.updateDocsUI();
    }

    return result;
  }

  /**
   * Synthesizes audio speech response via Web Speech Synthesis or headless fallback
   * @param {string} msg
   * @param {Object} [options]
   * @returns {string}
   */
  synthesizeResponse(msg, options = {}) {
    const text = String(msg || '').trim();
    this.lastResponse = text;
    this.setStatus('Synthesizing');
    this.emit('synthesize', { message: text });

    if (this.speechSynth) {
      try {
        if (typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = options.lang || 'en-US';
          utterance.rate = options.rate || 1.0;
          utterance.pitch = options.pitch || 1.0;

          utterance.onend = () => {
            this.setStatus(this.isListening ? 'Listening' : 'Idle');
            this.emit('synthesize-end', { message: text });
          };
          utterance.onerror = () => {
            this.setStatus(this.isListening ? 'Listening' : 'Idle');
            this.emit('synthesize-error', { message: text });
          };

          this.speechSynth.cancel?.();
          this.speechSynth.speak(utterance);
        } else {
          // Mock speech synth fallback for test environments
          this.speechSynth.speak?.(text);
          this.setStatus(this.isListening ? 'Listening' : 'Idle');
          this.emit('synthesize-end', { message: text });
        }
      } catch {
        this.setStatus(this.isListening ? 'Listening' : 'Idle');
      }
    } else {
      // Headless / non-browser fallback
      this.setStatus(this.isListening ? 'Listening' : 'Idle');
      this.emit('synthesize-end', { message: text });
    }

    return text;
  }

  /**
   * Full pipeline: parses transcript, executes action, synthesizes audio response, and records history
   * @param {string} transcript
   * @returns {Object}
   */
  dispatchCommand(transcript) {
    this.setStatus('Processing');
    const parsed = this.parseVoiceGrammar(transcript);
    const execResult = this.executeCommand(parsed.action, parsed.payload);
    const responseMsg = parsed.response;
    this.lastResponse = responseMsg;

    const historyEntry = {
      id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: Date.now(),
      transcript: parsed.transcript,
      action: parsed.action,
      payload: parsed.payload,
      response: responseMsg,
      matched: parsed.matched,
      status: parsed.matched ? 'success' : 'fallback',
      state: this.getState()
    };

    this.history.unshift(historyEntry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.emit('history-update', { history: this.getCommandHistory(), latest: historyEntry });

    if (this.domBound) {
      this.renderHistory();
      this.showToast(responseMsg);
    }

    this.synthesizeResponse(responseMsg);

    return {
      parsed,
      response: responseMsg,
      execResult,
      historyEntry,
      state: this.getState()
    };
  }

  /**
   * Return copy of command history entries
   * @returns {Array<Object>}
   */
  getCommandHistory() {
    return [...this.history];
  }

  /**
   * Clear command history entries
   * @returns {Array}
   */
  clearHistory() {
    this.history = [];
    this.emit('history-cleared');
    if (this.domBound) {
      this.renderHistory();
    }
    return [];
  }

  /**
   * Bind interactive UI DOM elements
   * @param {Document|HTMLElement} [root=document]
   */
  bindDOM(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root) return;

    this.elements = {
      micBtn: root.getElementById('micBtn'),
      micLabel: root.getElementById('micLabel'),
      statusPill: root.getElementById('statusPill'),
      statusText: root.getElementById('statusText'),
      waveVisualizer: root.getElementById('waveVisualizer'),
      commandHistory: root.getElementById('commandHistory'),
      clearHistoryBtn: root.getElementById('clearHistoryBtn'),
      mockInput: root.getElementById('mockInput'),
      dispatchBtn: root.getElementById('dispatchBtn'),
      toastEl: root.getElementById('speechToast'),
      activeSectionName: root.getElementById('activeSectionName'),
      activeSectionBody: root.getElementById('activeSectionBody'),
      searchResultBanner: root.getElementById('searchResultBanner'),
      searchQueryDisplay: root.getElementById('searchQueryDisplay'),
      contrastBadge: root.getElementById('contrastBadge'),
      zoomBadge: root.getElementById('zoomBadge'),
      docContainer: root.getElementById('docContainer'),
      codeSnippetEl: root.getElementById('codeSnippetEl'),
      copyCodeBtn: root.getElementById('copyCodeBtn')
    };

    this.domBound = true;

    // Mic button
    if (this.elements.micBtn) {
      this.elements.micBtn.addEventListener('click', () => {
        this.toggleListening();
      });
    }

    // Mock dispatch
    const handleManual = () => {
      const val = this.elements.mockInput?.value?.trim();
      if (val) {
        this.dispatchCommand(val);
        if (this.elements.mockInput) this.elements.mockInput.value = '';
      }
    };

    if (this.elements.dispatchBtn) {
      this.elements.dispatchBtn.addEventListener('click', handleManual);
    }

    if (this.elements.mockInput) {
      this.elements.mockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleManual();
      });
    }

    // Clear history
    if (this.elements.clearHistoryBtn) {
      this.elements.clearHistoryBtn.addEventListener('click', () => {
        this.clearHistory();
      });
    }

    // Quick command suggestion chips
    root.querySelectorAll?.('[data-voice-cmd]')?.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-voice-cmd');
        if (cmd) this.dispatchCommand(cmd);
      });
    });

    // Code copy button
    if (this.elements.copyCodeBtn) {
      this.elements.copyCodeBtn.addEventListener('click', () => {
        this.dispatchCommand('copy code snippet');
      });
    }

    this.updateStatusUI();
    this.updateDocsUI();
    this.renderHistory();
  }

  /**
   * Update listening UI elements
   * @param {boolean} isListening
   */
  updateListeningUI(isListening) {
    if (this.elements.micBtn) {
      this.elements.micBtn.classList.toggle('active', isListening);
      this.elements.micBtn.setAttribute('aria-pressed', String(isListening));
    }
    if (this.elements.micLabel) {
      this.elements.micLabel.textContent = isListening ? 'Listening Active...' : 'Activate Voice Mic';
    }
    if (this.elements.waveVisualizer) {
      this.elements.waveVisualizer.classList.toggle('active', isListening);
    }
  }

  /**
   * Update status indicators in UI
   */
  updateStatusUI() {
    if (this.elements.statusText) {
      this.elements.statusText.textContent = this.status;
    }
    if (this.elements.statusPill) {
      this.elements.statusPill.className = `status-pill status-${this.status.toLowerCase()}`;
    }
    if (this.elements.waveVisualizer) {
      this.elements.waveVisualizer.classList.toggle('active', this.status === 'Listening' || this.status === 'Synthesizing');
    }
  }

  /**
   * Update Documentation portal view based on current commander state
   */
  updateDocsUI() {
    if (this.elements.contrastBadge) {
      this.elements.contrastBadge.textContent = this.highContrast ? 'High Contrast ON' : 'Standard Contrast';
      this.elements.contrastBadge.classList.toggle('active', this.highContrast);
    }

    if (this.elements.docContainer) {
      this.elements.docContainer.classList.toggle('high-contrast-mode', this.highContrast);
      this.elements.docContainer.style.setProperty('--font-zoom-factor', (this.fontSizeZoom / 100).toString());
    }

    if (typeof document !== 'undefined') {
      document.body?.classList.toggle('high-contrast', this.highContrast);
    }

    if (this.elements.zoomBadge) {
      this.elements.zoomBadge.textContent = `Font Zoom: ${this.fontSizeZoom}%`;
    }

    if (this.elements.activeSectionName) {
      const mapped = Object.values(DOCS_SECTIONS).find(s => s.slug === this.currentSection);
      this.elements.activeSectionName.textContent = mapped ? mapped.title : this.currentSection;
    }

    if (this.elements.searchResultBanner) {
      if (this.lastQuery) {
        this.elements.searchResultBanner.style.display = 'block';
        if (this.elements.searchQueryDisplay) {
          this.elements.searchQueryDisplay.textContent = `"${this.lastQuery}"`;
        }
      } else {
        this.elements.searchResultBanner.style.display = 'none';
      }
    }
  }

  /**
   * Render command history log
   */
  renderHistory() {
    if (!this.elements.commandHistory) return;

    if (this.history.length === 0) {
      this.elements.commandHistory.innerHTML = '<div class="history-empty">No voice commands recorded yet. Speak or type a command above.</div>';
      return;
    }

    this.elements.commandHistory.innerHTML = this.history.map(item => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString();
      let badgeClass = 'badge-success';
      if (!item.matched) badgeClass = 'badge-fallback';
      else if (item.action === DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST) badgeClass = 'badge-accent';

      return `
        <div class="history-item ${item.matched ? 'item-success' : 'item-fallback'}">
          <div class="history-header">
            <span class="history-transcript">"${this.escapeHtml(item.transcript)}"</span>
            <span class="history-badge ${badgeClass}">${item.action}</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <p class="history-response">${this.escapeHtml(item.response)}</p>
        </div>
      `;
    }).join('');
  }

  /**
   * Display toast announcement
   * @param {string} msg
   * @param {number} [duration=3200]
   */
  showToast(msg, duration = 3200) {
    if (!this.elements.toastEl) return;
    this.elements.toastEl.textContent = msg;
    this.elements.toastEl.classList.add('visible');
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.elements.toastEl?.classList.remove('visible');
    }, duration);
  }

  /**
   * Escape HTML utility
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Auto-bind when loaded in browser environment
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new DocsPortalVoiceCommander();
    commander.bindDOM(document);
  });
}

export default DocsPortalVoiceCommander;
