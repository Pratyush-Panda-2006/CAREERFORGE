/**
 * SaaS Launchpad - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 *
 * Provides continuous speech recognition integration with a headless simulator fallback,
 * grammar matching for SaaS dashboard commands, speech synthesis responses, accessibility high contrast toggling,
 * event emission, and command history logging.
 */

export class SaasLaunchpadVoiceCommander {
  /**
   * @param {Object} options
   * @param {string} [options.lang='en-US']
   * @param {boolean} [options.continuous=false]
   * @param {boolean} [options.interimResults=false]
   * @param {boolean} [options.highContrast=false]
   * @param {string} [options.activePage='dashboard']
   * @param {string} [options.currentPlan='starter']
   * @param {string} [options.metricsFilter='all']
   */
  constructor(options = {}) {
    this.options = {
      lang: 'en-US',
      continuous: false,
      interimResults: false,
      highContrast: false,
      activePage: 'dashboard',
      currentPlan: 'starter',
      metricsFilter: 'all',
      ...options
    };

    this.status = 'idle'; // 'idle' | 'listening' | 'processing' | 'synthesizing' | 'error'
    this.isListening = false;
    this.highContrast = Boolean(this.options.highContrast);
    this.activePage = this.options.activePage;
    this.currentPlan = this.options.currentPlan;
    this.metricsFilter = this.options.metricsFilter;
    this.invitedMembers = [];
    this.lastExport = null;
    this.commandHistory = [];
    this.listeners = {};

    this.recognition = null;
    this.initSpeechRecognition();
  }

  /**
   * Initialize browser SpeechRecognition if supported.
   */
  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = this.options.continuous;
          this.recognition.interimResults = this.options.interimResults;
          this.recognition.lang = this.options.lang;

          this.recognition.onstart = () => {
            this.isListening = true;
            this.setStatus('listening');
            this.emit('listeningChange', true);
          };

          this.recognition.onresult = (event) => {
            if (event.results && event.results.length > 0) {
              const lastResult = event.results[event.results.length - 1];
              const transcript = lastResult[0]?.transcript?.trim();
              if (transcript) {
                this.emit('speechResult', transcript);
                this.processTranscript(transcript);
              }
            }
          };

          this.recognition.onerror = (event) => {
            this.setStatus('error');
            this.emit('error', event.error || event);
          };

          this.recognition.onend = () => {
            this.isListening = false;
            if (this.status === 'listening') {
              this.setStatus('idle');
            }
            this.emit('listeningChange', false);
          };
        } catch (e) {
          this.recognition = null;
        }
      }
    }
  }

  /**
   * Set commander state and emit statusChange.
   * @param {'idle'|'listening'|'processing'|'synthesizing'|'error'} newStatus
   */
  setStatus(newStatus) {
    const oldStatus = this.status;
    if (oldStatus !== newStatus) {
      this.status = newStatus;
      this.emit('statusChange', newStatus, oldStatus);
    }
  }

  /**
   * Start speech recognition or enter headless listening mode.
   */
  startListening() {
    if (this.isListening) return;

    this.isListening = true;
    this.setStatus('listening');
    this.emit('listeningChange', true);

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (e) {
        // May already be active
      }
    }
  }

  /**
   * Stop speech recognition or exit listening mode.
   */
  stopListening() {
    if (!this.isListening) return;

    this.isListening = false;
    if (this.status === 'listening') {
      this.setStatus('idle');
    }
    this.emit('listeningChange', false);

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Recognition might already have stopped
      }
    }
  }

  /**
   * Toggle between listening and idle states.
   * @returns {boolean} Current listening status
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
   * Parse voice grammar from transcript into action and structured payload.
   * Supported actions:
   *  - NAVIGATE_PAGE
   *  - UPGRADE_PLAN
   *  - INVITE_MEMBER
   *  - FILTER_METRICS
   *  - EXPORT_DATA
   *  - TOGGLE_HIGH_CONTRAST
   *  - HELP
   *  - UNKNOWN
   *
   * @param {string} transcript
   * @returns {{ action: string, payload: Object, confidence: number, transcript: string }}
   */
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        action: 'UNKNOWN',
        payload: { raw: '' },
        confidence: 0,
        transcript: ''
      };
    }

    const raw = transcript.trim();
    // Normalize string: lowercase, remove trailing punctuation
    const clean = raw.toLowerCase().replace(/[.,!?;:]+$/, '').trim();

    // 1. HELP
    if (/^(?:help|list\s+commands|what\s+can\s+i\s+say|show\s+commands|commands)$/i.test(clean)) {
      return {
        action: 'HELP',
        payload: {
          raw,
          availableActions: [
            'NAVIGATE_PAGE',
            'UPGRADE_PLAN',
            'INVITE_MEMBER',
            'FILTER_METRICS',
            'EXPORT_DATA',
            'TOGGLE_HIGH_CONTRAST',
            'HELP'
          ]
        },
        confidence: 0.99,
        transcript: raw
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST
    if (/^(?:toggle\s+contrast|high\s+contrast(?:\s+mode)?|accessibility\s+mode|toggle\s+accessibility|enable\s+high\s+contrast|disable\s+high\s+contrast|contrast\s+mode)$/i.test(clean)) {
      const explicitEnable = /enable/i.test(clean);
      const explicitDisable = /disable/i.test(clean);
      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: {
          raw,
          explicit: explicitEnable ? true : (explicitDisable ? false : null)
        },
        confidence: 0.98,
        transcript: raw
      };
    }

    // 3. EXPORT_DATA
    // e.g., "export csv", "download report", "export metrics", "export json", "download metrics"
    const exportMatch = clean.match(/^(?:export|download)\s+(csv|report|metrics|json|pdf|telemetry|data)(?:\s+(?:file|data|report))?$/i);
    if (exportMatch) {
      const format = exportMatch[1].toLowerCase();
      return {
        action: 'EXPORT_DATA',
        payload: {
          raw,
          format
        },
        confidence: 0.95,
        transcript: raw
      };
    }

    // 4. NAVIGATE_PAGE
    // e.g., "go to analytics", "open billing", "view team settings", "navigate to integrations", "go to dashboard", "open settings"
    const navMatch = clean.match(/^(?:go\s+to|open|view|navigate\s+to|switch\s+to)\s+(analytics|billing|team\s+settings|integrations|dashboard|overview|settings|audit\s+trail|metrics)$/i);
    if (navMatch) {
      const page = navMatch[1].toLowerCase();
      return {
        action: 'NAVIGATE_PAGE',
        payload: {
          raw,
          page
        },
        confidence: 0.95,
        transcript: raw
      };
    }

    // 5. FILTER_METRICS
    // e.g., "show last 30 days", "show last 7 days", "filter mrr", "view churn rate", "filter arr"
    const rangeMatch = clean.match(/^(?:show|filter|view|display)\s+(?:the\s+)?(last\s+\d+\s+(?:days?|hours?|months?)|past\s+\d+\s+(?:days?|hours?|months?)|today|yesterday|this\s+month|this\s+quarter|this\s+year)$/i);
    if (rangeMatch) {
      const range = rangeMatch[1].toLowerCase();
      const daysMatch = range.match(/\d+\s+days?/);
      return {
        action: 'FILTER_METRICS',
        payload: {
          raw,
          range,
          days: daysMatch ? parseInt(daysMatch[0], 10) : null
        },
        confidence: 0.95,
        transcript: raw
      };
    }

    const metricMatch = clean.match(/^(?:show|filter|view|display)\s+(mrr|arr|churn(?:\s+rate)?|revenue|conversion(?:\s+rate)?|daily\s+active\s+users|dau|metrics)$/i);
    if (metricMatch) {
      const metric = metricMatch[1].toLowerCase();
      return {
        action: 'FILTER_METRICS',
        payload: {
          raw,
          metric
        },
        confidence: 0.95,
        transcript: raw
      };
    }

    // 6. INVITE_MEMBER
    // e.g., "invite alex@careerforge.io", "add team member dev@company.com", "send invite to sarah", "invite john"
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const emailMatch = clean.match(emailRegex);
    const isInviteCommand = /^(?:invite|add\s+team\s+member|send\s+invite\s+to|add\s+member)\b/i.test(clean);

    if (isInviteCommand) {
      if (emailMatch) {
        const email = emailMatch[1];
        return {
          action: 'INVITE_MEMBER',
          payload: {
            raw,
            email,
            recipient: email
          },
          confidence: 0.98,
          transcript: raw
        };
      }

      const nameMatch = clean.match(/^(?:invite|add\s+team\s+member|send\s+invite\s+to|add\s+member)\s+(?:user\s+)?(.+)$/i);
      if (nameMatch && nameMatch[1]) {
        const name = nameMatch[1].trim();
        return {
          action: 'INVITE_MEMBER',
          payload: {
            raw,
            name,
            recipient: name
          },
          confidence: 0.92,
          transcript: raw
        };
      }
    }

    // 7. UPGRADE_PLAN
    // e.g., "upgrade to pro", "switch to enterprise", "change plan", "upgrade plan", "downgrade to starter"
    const planMatch = clean.match(/^(?:upgrade\s+to|switch\s+to|downgrade\s+to|change\s+plan\s+to|change\s+to)\s+(pro|enterprise|starter|growth|team|free)$/i);
    if (planMatch) {
      const plan = planMatch[1].toLowerCase();
      return {
        action: 'UPGRADE_PLAN',
        payload: {
          raw,
          plan
        },
        confidence: 0.95,
        transcript: raw
      };
    }

    if (/^(?:upgrade\s+plan|change\s+plan|upgrade)$/i.test(clean)) {
      return {
        action: 'UPGRADE_PLAN',
        payload: {
          raw,
          plan: 'pro'
        },
        confidence: 0.90,
        transcript: raw
      };
    }

    // Unknown fallback
    return {
      action: 'UNKNOWN',
      payload: {
        raw
      },
      confidence: 0.1,
      transcript: raw
    };
  }

  /**
   * Execute action and mutate workspace state.
   * @param {string|Object} action - Action name or parsed grammar object
   * @param {Object} [payload={}]
   * @returns {Object} Execution result with message, status, and record
   */
  executeCommand(action, payload = {}) {
    let act = action;
    let pld = payload;

    if (typeof action === 'object' && action !== null && action.action) {
      act = action.action;
      pld = action.payload || {};
    } else if (typeof action === 'string' && (!payload || Object.keys(payload).length === 0)) {
      const parsed = this.parseVoiceGrammar(action);
      if (parsed.action !== 'UNKNOWN') {
        act = parsed.action;
        pld = parsed.payload;
      }
    }

    this.setStatus('processing');

    const result = {
      success: true,
      action: act,
      message: ''
    };

    switch (act) {
      case 'NAVIGATE_PAGE': {
        const page = pld.page || 'dashboard';
        this.activePage = page;
        result.page = page;
        result.message = `Navigated to ${page}.`;
        break;
      }
      case 'UPGRADE_PLAN': {
        const plan = pld.plan || 'pro';
        this.currentPlan = plan;
        result.plan = plan;
        result.message = `Workspace plan updated to ${plan}.`;
        break;
      }
      case 'INVITE_MEMBER': {
        const recipient = pld.recipient || pld.email || pld.name || 'member';
        if (!this.invitedMembers.includes(recipient)) {
          this.invitedMembers.push(recipient);
        }
        result.recipient = recipient;
        result.email = pld.email || (recipient.includes('@') ? recipient : null);
        result.name = pld.name || (!recipient.includes('@') ? recipient : null);
        result.message = `Invitation sent to ${recipient}.`;
        break;
      }
      case 'FILTER_METRICS': {
        const filter = pld.range || pld.metric || 'last 30 days';
        this.metricsFilter = filter;
        result.filter = filter;
        result.range = pld.range || null;
        result.metric = pld.metric || null;
        result.message = `Filtered metrics view by ${filter}.`;
        break;
      }
      case 'EXPORT_DATA': {
        const format = pld.format || 'csv';
        this.lastExport = {
          format,
          timestamp: Date.now()
        };
        result.format = format;
        result.message = `Exporting workspace metrics as ${format.toUpperCase()}.`;
        break;
      }
      case 'TOGGLE_HIGH_CONTRAST': {
        if (typeof pld.explicit === 'boolean') {
          this.highContrast = pld.explicit;
        } else {
          this.highContrast = !this.highContrast;
        }
        result.highContrast = this.highContrast;
        result.message = `High contrast mode ${this.highContrast ? 'enabled' : 'disabled'}.`;
        this.emit('contrastChange', this.highContrast);
        if (typeof document !== 'undefined') {
          document.body.classList.toggle('high-contrast', this.highContrast);
        }
        break;
      }
      case 'HELP': {
        result.commands = [
          'NAVIGATE_PAGE (e.g., "go to analytics", "open billing")',
          'UPGRADE_PLAN (e.g., "upgrade to pro", "switch to enterprise")',
          'INVITE_MEMBER (e.g., "invite user@example.com", "add team member dev@company.com")',
          'FILTER_METRICS (e.g., "show last 30 days", "filter mrr", "view churn rate")',
          'EXPORT_DATA (e.g., "export csv", "download report")',
          'TOGGLE_HIGH_CONTRAST (e.g., "toggle contrast", "accessibility mode")',
          'HELP (e.g., "help", "list commands")'
        ];
        result.message = 'Available voice commands: navigate page, upgrade plan, invite team member, filter metrics, export data, toggle high contrast.';
        break;
      }
      default: {
        result.success = false;
        result.action = 'UNKNOWN';
        const rawText = pld.raw || (typeof action === 'string' ? action : 'unknown input');
        result.raw = rawText;
        result.message = `Command not recognized: "${rawText}". Say "help" to list available commands.`;
        break;
      }
    }

    const record = {
      id: `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action: act,
      payload: pld,
      transcript: pld.raw || pld.transcript || result.message,
      status: result.success ? 'success' : 'unknown',
      success: result.success,
      message: result.message
    };

    this.commandHistory.push(record);
    this.emit('command', { action: act, payload: pld, result, record });

    this.synthesizeResponse(result.message);

    return { ...result, record };
  }

  /**
   * Process speech transcript end-to-end: parse, execute, and return result.
   * @param {string} transcript
   * @returns {{ parsed: Object, result: Object }}
   */
  processTranscript(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    const result = this.executeCommand(parsed.action, {
      ...parsed.payload,
      raw: transcript,
      transcript
    });
    return { parsed, result };
  }

  /**
   * Synthesize audio speech response or run in headless simulator fallback.
   * @param {string} msg
   * @returns {string} The synthesized message
   */
  synthesizeResponse(msg) {
    this.setStatus('synthesizing');
    this.emit('synthesize', msg);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          if (this.status === 'synthesizing') {
            this.setStatus(this.isListening ? 'listening' : 'idle');
          }
        };
        utterance.onerror = () => {
          if (this.status === 'synthesizing') {
            this.setStatus(this.isListening ? 'listening' : 'idle');
          }
        };
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        this.setStatus(this.isListening ? 'listening' : 'idle');
      }
    } else {
      // Headless / fallback environment
      this.setStatus(this.isListening ? 'listening' : 'idle');
    }

    return msg;
  }

  /**
   * Retrieve shallow copy of command execution history.
   * @returns {Array<Object>}
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Clear all command history entries.
   */
  clearHistory() {
    this.commandHistory = [];
    this.emit('historyClear');
  }

  /**
   * Event Emitter - register an event listener.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => this.off(event, callback);
  }

  /**
   * Event Emitter - remove an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  /**
   * Event Emitter - trigger an event.
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        try {
          callback(...args);
        } catch (err) {
          console.error(`Error in VoiceCommander listener for event "${event}":`, err);
        }
      }
    }
  }
}

/**
 * Interactive DOM Driver for browser UI binding
 */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new SaasLaunchpadVoiceCommander();

    const micBtn = document.getElementById('mic-btn');
    const micStatusLabel = document.getElementById('mic-status-label');
    const visualizer = document.getElementById('audio-visualizer');
    const statusPill = document.getElementById('status-pill');

    const activePageBadge = document.getElementById('active-page-badge');
    const currentPlanBadge = document.getElementById('current-plan-badge');
    const metricsFilterBadge = document.getElementById('metrics-filter-badge');
    const contrastBadge = document.getElementById('contrast-badge');

    const historyFeed = document.getElementById('command-history-feed');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const mockForm = document.getElementById('mock-speech-form');
    const mockInput = document.getElementById('mock-speech-input');
    const chips = document.querySelectorAll('.suggestion-chip');

    function updateStateUI() {
      if (activePageBadge) activePageBadge.textContent = commander.activePage.toUpperCase();
      if (currentPlanBadge) currentPlanBadge.textContent = commander.currentPlan.toUpperCase();
      if (metricsFilterBadge) metricsFilterBadge.textContent = commander.metricsFilter.toUpperCase();
      if (contrastBadge) contrastBadge.textContent = commander.highContrast ? 'HIGH CONTRAST' : 'STANDARD';
    }

    function updateStatusUI(status) {
      if (statusPill) {
        statusPill.textContent = status.toUpperCase();
        statusPill.className = `status-pill status-${status}`;
      }
    }

    function updateMicUI(isListening) {
      if (micBtn) {
        if (isListening) {
          micBtn.classList.add('is-listening');
          if (micStatusLabel) micStatusLabel.textContent = 'Listening... (Click to stop)';
        } else {
          micBtn.classList.remove('is-listening');
          if (micStatusLabel) micStatusLabel.textContent = 'Click to activate voice commander';
        }
      }
      if (visualizer) {
        if (isListening) {
          visualizer.classList.add('active');
        } else {
          visualizer.classList.remove('active');
        }
      }
    }

    function appendHistoryItem(record) {
      if (!historyFeed) return;

      const emptyMsg = historyFeed.querySelector('.empty-history-msg');
      if (emptyMsg) {
        emptyMsg.remove();
      }

      const item = document.createElement('div');
      item.className = `history-item history-${record.status}`;

      const timeStr = new Date(record.timestamp).toLocaleTimeString([], { hour12: false });

      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-time">${timeStr}</span>
          <span class="action-tag">${record.action}</span>
          <span class="status-tag status-${record.status}">${record.status.toUpperCase()}</span>
        </div>
        <div class="history-transcript">&ldquo;${escapeHTML(record.transcript)}&rdquo;</div>
        <div class="history-response">&#128483; ${escapeHTML(record.message)}</div>
      `;

      historyFeed.insertBefore(item, historyFeed.firstChild);
    }

    function escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Attach commander event listeners
    commander.on('statusChange', (newStatus) => updateStatusUI(newStatus));
    commander.on('listeningChange', (isListening) => updateMicUI(isListening));
    commander.on('command', ({ record }) => {
      appendHistoryItem(record);
      updateStateUI();
    });
    commander.on('contrastChange', (isHighContrast) => {
      updateStateUI();
      document.body.classList.toggle('high-contrast', isHighContrast);
    });
    commander.on('historyClear', () => {
      if (historyFeed) {
        historyFeed.innerHTML = '<div class="empty-history-msg">No voice commands recorded yet. Speak or type below!</div>';
      }
    });

    // Mic click
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    // Mock speech form
    if (mockForm && mockInput) {
      mockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = mockInput.value.trim();
        if (text) {
          commander.processTranscript(text);
          mockInput.value = '';
        }
      });
    }

    // Suggestion chips
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          commander.processTranscript(cmd);
        }
      });
    });

    // Clear history
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
      });
    }

    // Initial state render
    updateStateUI();
    updateStatusUI(commander.status);

    // Expose for browser debugging
    window.voiceCommander = commander;
  });
}
