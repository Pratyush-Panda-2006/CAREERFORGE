/**
 * Developer Portfolio - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2042 - Level 3 Core Feature
 *
 * Implements real-time voice command routing, natural language grammar parsing,
 * speech synthesis dispatching, simulated headless fallback for headless/Node test environments,
 * and reactive event emitter bindings for developer portfolio navigation and filtering.
 */

export class DeveloperPortfolioVoiceCommander {
  /**
   * Default configuration options
   */
  static DEFAULT_OPTIONS = {
    lang: 'en-US',
    continuous: true,
    interimResults: false,
    autoSynthesize: false,
    synthRate: 1.0,
    synthPitch: 1.0
  };

  /**
   * Supported portfolio sections
   */
  static SECTIONS = ['home', 'about', 'skills', 'projects', 'experience', 'education', 'contact'];

  /**
   * Supported action types
   */
  static ACTIONS = {
    NAVIGATE_SECTION: 'NAVIGATE_SECTION',
    FILTER_TECH_STACK: 'FILTER_TECH_STACK',
    DOWNLOAD_RESUME: 'DOWNLOAD_RESUME',
    READ_BIO: 'READ_BIO',
    TOGGLE_HIGH_CONTRAST: 'TOGGLE_HIGH_CONTRAST',
    TOGGLE_THEME: 'TOGGLE_THEME',
    HELP: 'HELP',
    UNKNOWN: 'UNKNOWN'
  };

  /**
   * Bio description used by speech dispatcher
   */
  static BIO_SUMMARY =
    'Senior Full-Stack Engineer and System Architect specializing in distributed systems, cloud computing, and high-performance modern web platforms.';

  /**
   * @param {object} [options={}]
   */
  constructor(options = {}) {
    this.options = { ...DeveloperPortfolioVoiceCommander.DEFAULT_OPTIONS, ...options };

    // State machine
    this.status = 'idle'; // 'idle' | 'listening' | 'processing' | 'synthesizing' | 'error'
    this.isListening = false;
    this.currentSection = 'home';
    this.activeFilter = null;
    this.isHighContrast = false;
    this.currentTheme = 'dark';
    this.lastSpokenMessage = '';

    // History stream
    this.history = [];

    // Event listener map: eventName -> Set<Function>
    this.events = new Map();

    // Speech engine handles
    this.recognition = null;
    this.synth = null;

    // Initialize Web Speech API / Headless Fallback
    this.initSpeechEngines();
  }

  /**
   * Initializes SpeechRecognition and SpeechSynthesis or headless fallbacks
   */
  initSpeechEngines() {
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
            this.emit('start');
          };

          this.recognition.onresult = (event) => {
            const lastIdx = event.results.length - 1;
            const transcript = event.results[lastIdx][0].transcript.trim();
            this.emit('speechResult', { transcript });
            this.processTranscript(transcript);
          };

          this.recognition.onerror = (event) => {
            this.setStatus('error');
            this.emit('error', event.error);
          };

          this.recognition.onend = () => {
            if (this.isListening && this.options.continuous) {
              try {
                this.recognition.start();
              } catch (_) {
                this.isListening = false;
                this.setStatus('idle');
                this.emit('stop');
              }
            } else {
              this.isListening = false;
              this.setStatus('idle');
              this.emit('stop');
            }
          };
        } catch (_) {
          this.recognition = null;
        }
      }

      if ('speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
      }
    }
  }

  /**
   * Internal status updater with event emission
   * @param {string} newStatus
   */
  setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.emit('statusChange', { status: this.status });
    }
  }

  /**
   * Start listening for voice input
   * @returns {boolean}
   */
  startListening() {
    if (this.isListening) return false;

    this.isListening = true;
    this.setStatus('listening');
    this.emit('start');

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (_) {
        // Recognition might already be running
      }
    }
    return true;
  }

  /**
   * Stop listening for voice input
   * @returns {boolean}
   */
  stopListening() {
    if (!this.isListening) return false;

    this.isListening = false;
    this.setStatus('idle');
    this.emit('stop');

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (_) {
        // Ignore stop error
      }
    }
    return true;
  }

  /**
   * Toggle listening state
   * @returns {boolean} Current listening state
   */
  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  /**
   * Natural Language Grammar Parser
   * Maps spoken transcript into structured portfolio action & payload
   *
   * @param {string} transcript
   * @returns {{ action: string, payload: object, confidence: number }}
   */
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.UNKNOWN,
        payload: { raw: '' },
        confidence: 0
      };
    }

    const clean = transcript
      .trim()
      .toLowerCase()
      .replace(/[.,!?;:]+$/, '')
      .trim();

    if (!clean) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.UNKNOWN,
        payload: { raw: transcript },
        confidence: 0
      };
    }

    // 1. HELP GRAMMAR
    if (/^(?:help|list\s+commands?|what\s+can\s+i\s+say|available\s+commands|show\s+help)$/i.test(clean)) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.HELP,
        payload: {
          commands: [
            'go to [section]',
            'show [section]',
            'filter by [technology]',
            'clear tech filter',
            'download resume',
            'read bio',
            'toggle contrast',
            'switch theme',
            'help'
          ]
        },
        confidence: 1.0
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST GRAMMAR
    if (
      /^(?:(?:toggle|switch|enable|disable)\s+)?(?:high\s*contrast(?:\s*mode)?|accessibility\s*mode)$/i.test(clean) ||
      clean === 'toggle contrast'
    ) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.TOGGLE_HIGH_CONTRAST,
        payload: {},
        confidence: 0.95
      };
    }

    // 3. TOGGLE_THEME GRAMMAR
    const themeMatch = clean.match(
      /^(?:(?:switch|toggle)\s+theme|toggle\s+(dark|light)\s+mode|(dark|light)\s+mode)$/i
    );
    if (themeMatch) {
      const explicitMode = themeMatch[1] || themeMatch[2];
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.TOGGLE_THEME,
        payload: {
          theme: explicitMode ? explicitMode.toLowerCase() : 'toggle'
        },
        confidence: 0.95
      };
    }

    // 4. DOWNLOAD_RESUME GRAMMAR
    if (/^(?:download|get|save|export)\s+(?:resume|cv)$/i.test(clean)) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.DOWNLOAD_RESUME,
        payload: {},
        confidence: 0.95
      };
    }

    // 5. READ_BIO GRAMMAR
    if (/^(?:read\s+bio|tell\s+me\s+about\s+yourself|read\s+summary|who\s+are\s+you|describe\s+yourself)$/i.test(clean)) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.READ_BIO,
        payload: {},
        confidence: 0.95
      };
    }

    // 6. CLEAR TECH FILTER GRAMMAR
    if (/^(?:(?:clear|reset|remove)\s+(?:tech\s+)?filter|show\s+all(?:\s+projects)?)$/i.test(clean)) {
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK,
        payload: {
          tech: null,
          clear: true
        },
        confidence: 0.95
      };
    }

    // 7. FILTER_TECH_STACK GRAMMAR
    // Matches "filter by react", "filter typescript", "show python projects"
    const filterByMatch = clean.match(/^filter\s+(?:by\s+)?([a-z0-9#+.\s-]+)$/i);
    if (filterByMatch) {
      const tech = filterByMatch[1].trim();
      if (tech === 'all' || tech === 'none' || tech === 'clear') {
        return {
          action: DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK,
          payload: { tech: null, clear: true },
          confidence: 0.95
        };
      }
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK,
        payload: { tech, clear: false },
        confidence: 0.9
      };
    }

    const showTechMatch = clean.match(/^show\s+([a-z0-9#+.\s-]+?)\s+projects?$/i);
    if (showTechMatch) {
      const tech = showTechMatch[1].trim();
      if (tech === 'all') {
        return {
          action: DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK,
          payload: { tech: null, clear: true },
          confidence: 0.95
        };
      }
      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK,
        payload: { tech, clear: false },
        confidence: 0.9
      };
    }

    // 8. NAVIGATE_SECTION GRAMMAR
    // Matches "go to projects", "show about me", "open experience", "view contact", "jump to skills", etc.
    const navMatch = clean.match(
      /^(?:go\s+to|show|open|view|jump\s+to|navigate\s+to|scroll\s+to)\s+(projects?|about(?:\s+me)?|experience|contact|skills?|education|home)$/i
    );
    if (navMatch) {
      let section = navMatch[1].toLowerCase().trim();
      if (section.startsWith('about')) section = 'about';
      else if (section === 'project') section = 'projects';
      else if (section === 'skill') section = 'skills';

      return {
        action: DeveloperPortfolioVoiceCommander.ACTIONS.NAVIGATE_SECTION,
        payload: { section },
        confidence: 0.95
      };
    }

    // Unknown command
    return {
      action: DeveloperPortfolioVoiceCommander.ACTIONS.UNKNOWN,
      payload: { raw: transcript },
      confidence: 0
    };
  }

  /**
   * Synthesize verbal speech output using Web Speech API or mock fallback
   * @param {string} msg
   * @returns {Promise<{ message: string, synthesized: boolean }>}
   */
  synthesizeResponse(msg) {
    this.setStatus('synthesizing');
    this.lastSpokenMessage = msg;
    this.emit('synthesize', { message: msg });

    return new Promise((resolve) => {
      if (this.synth && typeof SpeechSynthesisUtterance !== 'undefined') {
        try {
          this.synth.cancel();
          const utterance = new SpeechSynthesisUtterance(msg);
          utterance.lang = this.options.lang;
          utterance.rate = this.options.synthRate || 1.0;
          utterance.pitch = this.options.synthPitch || 1.0;

          utterance.onend = () => {
            this.setStatus(this.isListening ? 'listening' : 'idle');
            resolve({ message: msg, synthesized: true });
          };

          utterance.onerror = () => {
            this.setStatus(this.isListening ? 'listening' : 'idle');
            resolve({ message: msg, synthesized: false });
          };

          this.synth.speak(utterance);
          return;
        } catch (_) {
          // Fall through to headless resolution
        }
      }

      // Headless or unsupported fallback
      this.setStatus(this.isListening ? 'listening' : 'idle');
      resolve({ message: msg, synthesized: false });
    });
  }

  /**
   * Executes structured voice action, mutates portfolio state, records history, and dispatches synthesis
   *
   * @param {string} action
   * @param {object} [payload={}]
   * @param {string} [transcript='']
   * @returns {{ success: boolean, action: string, payload: object, message: string, entry: object }}
   */
  executeCommand(action, payload = {}, transcript = '') {
    this.setStatus('processing');
    this.emit('command', { action, payload, transcript });

    let message = '';
    let success = true;

    switch (action) {
      case DeveloperPortfolioVoiceCommander.ACTIONS.NAVIGATE_SECTION: {
        const section = payload.section || 'home';
        this.currentSection = section;
        message = `Navigating to ${section} section.`;
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.FILTER_TECH_STACK: {
        if (payload.clear) {
          this.activeFilter = null;
          message = 'Cleared technology filter. Showing all projects.';
        } else {
          this.activeFilter = payload.tech;
          message = `Filtered projects by ${payload.tech}.`;
        }
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.DOWNLOAD_RESUME: {
        message = 'Initiating resume download. Preparing PDF artifact.';
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.READ_BIO: {
        message = DeveloperPortfolioVoiceCommander.BIO_SUMMARY;
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.TOGGLE_HIGH_CONTRAST: {
        this.isHighContrast = !this.isHighContrast;
        message = `High contrast accessibility mode ${this.isHighContrast ? 'enabled' : 'disabled'}.`;
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.TOGGLE_THEME: {
        if (payload.theme === 'light') {
          this.currentTheme = 'light';
        } else if (payload.theme === 'dark') {
          this.currentTheme = 'dark';
        } else {
          this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        }
        message = `Switched theme to ${this.currentTheme} mode.`;
        break;
      }

      case DeveloperPortfolioVoiceCommander.ACTIONS.HELP: {
        message =
          'Available commands: "go to [section]", "filter by [tech]", "clear tech filter", "download resume", "read bio", "toggle contrast", "switch theme", "help".';
        break;
      }

      default: {
        action = DeveloperPortfolioVoiceCommander.ACTIONS.UNKNOWN;
        success = false;
        message = `Command "${transcript || 'unknown'}" not recognized. Say "help" for available commands.`;
        break;
      }
    }

    const entry = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      transcript: transcript || (action === DeveloperPortfolioVoiceCommander.ACTIONS.UNKNOWN ? '' : action.toLowerCase()),
      action,
      payload,
      status: success ? 'success' : 'unrecognized',
      message
    };

    this.history.push(entry);
    this.emit('historyUpdate', entry);

    if (this.options.autoSynthesize) {
      this.synthesizeResponse(message);
    } else {
      this.setStatus(this.isListening ? 'listening' : 'idle');
    }

    return {
      success,
      action,
      payload,
      message,
      entry
    };
  }

  /**
   * Process raw speech transcript: parse grammar and execute action
   * @param {string} transcript
   * @returns {{ success: boolean, action: string, payload: object, message: string, entry: object }}
   */
  processTranscript(transcript) {
    const { action, payload } = this.parseVoiceGrammar(transcript);
    return this.executeCommand(action, payload, transcript);
  }

  /**
   * Headless speech simulator fallback
   * Emits simulated speech input and executes command
   *
   * @param {string} transcript
   * @returns {{ success: boolean, action: string, payload: object, message: string, entry: object }}
   */
  simulateSpeechInput(transcript) {
    this.emit('speechResult', { transcript, simulated: true });
    return this.processTranscript(transcript);
  }

  /**
   * Get historical command list
   * @returns {Array<object>}
   */
  getCommandHistory() {
    return [...this.history];
  }

  /**
   * Clear command history
   * @returns {Array}
   */
  clearHistory() {
    this.history = [];
    this.emit('historyClear');
    return [];
  }

  /**
   * Register event listener
   * @param {string} event
   * @param {Function} handler
   * @returns {DeveloperPortfolioVoiceCommander}
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
   * Unregister event listener
   * @param {string} event
   * @param {Function} handler
   * @returns {DeveloperPortfolioVoiceCommander}
   */
  off(event, handler) {
    if (this.events.has(event)) {
      this.events.get(event).delete(handler);
    }
    return this;
  }

  /**
   * Emit event to registered listeners
   * @param {string} event
   * @param {...*} args
   */
  emit(event, ...args) {
    if (this.events.has(event)) {
      for (const handler of this.events.get(event)) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`Error in voice commander event listener for "${event}":`, err);
        }
      }
    }
  }

  /**
   * Binds interactive DOM elements when running in browser
   * @param {Document|HTMLElement} [root=document]
   */
  attachUI(root = typeof document !== 'undefined' ? document : null) {
    if (!root) return;

    const micBtn = root.getElementById('mic-activation-btn');
    const statusPill = root.getElementById('commander-status-pill');
    const statusDot = root.getElementById('commander-status-dot');
    const statusText = root.getElementById('commander-status-text');
    const visualizer = root.getElementById('commander-audio-visualizer');
    const historyList = root.getElementById('commander-history-list');
    const clearHistoryBtn = root.getElementById('clear-history-btn');
    const mockInput = root.getElementById('mock-voice-input');
    const mockSubmitBtn = root.getElementById('mock-voice-submit');
    const sectionDisplay = root.getElementById('active-section-display');
    const techDisplay = root.getElementById('active-tech-display');
    const contrastDisplay = root.getElementById('active-contrast-display');
    const themeDisplay = root.getElementById('active-theme-display');
    const synthSpeechDisplay = root.getElementById('synth-speech-display');
    const quickChips = root.querySelectorAll('.voice-chip');

    const updateStatusUI = (status) => {
      if (statusText) statusText.textContent = status.toUpperCase();
      if (statusPill) {
        statusPill.setAttribute('data-status', status);
      }
      if (micBtn) {
        if (status === 'listening') {
          micBtn.classList.add('is-listening');
          micBtn.setAttribute('aria-pressed', 'true');
        } else {
          micBtn.classList.remove('is-listening');
          micBtn.setAttribute('aria-pressed', 'false');
        }
      }
      if (visualizer) {
        if (status === 'listening' || status === 'synthesizing') {
          visualizer.classList.add('is-active');
        } else {
          visualizer.classList.remove('is-active');
        }
      }
    };

    const updatePortfolioStateUI = () => {
      if (sectionDisplay) sectionDisplay.textContent = this.currentSection.toUpperCase();
      if (techDisplay) {
        techDisplay.textContent = this.activeFilter ? this.activeFilter.toUpperCase() : 'ALL (NO FILTER)';
      }
      if (contrastDisplay) {
        contrastDisplay.textContent = this.isHighContrast ? 'ENABLED (AAA)' : 'STANDARD';
      }
      if (themeDisplay) {
        themeDisplay.textContent = this.currentTheme.toUpperCase();
      }
      if (synthSpeechDisplay) {
        synthSpeechDisplay.textContent = this.lastSpokenMessage || 'Awaiting speech synthesis dispatch...';
      }

      // Sync body classes
      if (typeof document !== 'undefined') {
        document.body.classList.toggle('high-contrast-mode', this.isHighContrast);
        document.body.classList.toggle('light-theme-mode', this.currentTheme === 'light');
      }

      // Highlight active section cards
      const sectionCards = root.querySelectorAll('.portfolio-section-card');
      sectionCards.forEach((card) => {
        const sec = card.getAttribute('data-section');
        if (sec === this.currentSection) {
          card.classList.add('is-active-section');
        } else {
          card.classList.remove('is-active-section');
        }
      });

      // Highlight active tech tags
      const techTags = root.querySelectorAll('.tech-stack-tag');
      techTags.forEach((tag) => {
        const tech = tag.getAttribute('data-tech');
        if (this.activeFilter && tech === this.activeFilter.toLowerCase()) {
          tag.classList.add('is-active-tech');
        } else {
          tag.classList.remove('is-active-tech');
        }
      });
    };

    const renderHistoryFeed = () => {
      if (!historyList) return;
      if (this.history.length === 0) {
        historyList.innerHTML =
          '<div class="history-empty"><span class="terminal-dim">// No voice commands recorded. Say a command or click a chip.</span></div>';
        return;
      }

      historyList.innerHTML = this.history
        .slice(-15)
        .reverse()
        .map((item) => {
          const time = new Date(item.timestamp).toLocaleTimeString();
          const badgeClass = item.status === 'success' ? 'badge-success' : 'badge-unrecognized';
          return `
            <div class="history-item ${badgeClass}">
              <div class="history-meta">
                <span class="history-time">[${time}]</span>
                <span class="history-transcript">"${escapeHtml(item.transcript || '<empty>')}"</span>
                <span class="history-action-badge">${item.action}</span>
              </div>
              <div class="history-message">${escapeHtml(item.message)}</div>
            </div>
          `;
        })
        .join('');
    };

    // Helper to escape HTML in strings
    const escapeHtml = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Event listeners from commander
    this.on('statusChange', ({ status }) => updateStatusUI(status));
    this.on('historyUpdate', () => {
      renderHistoryFeed();
      updatePortfolioStateUI();
    });
    this.on('historyClear', () => renderHistoryFeed());
    this.on('synthesize', ({ message }) => {
      if (synthSpeechDisplay) synthSpeechDisplay.textContent = message;
    });

    // DOM event listeners
    micBtn?.addEventListener('click', () => {
      this.toggleListening();
    });

    clearHistoryBtn?.addEventListener('click', () => {
      this.clearHistory();
    });

    const submitMock = () => {
      if (!mockInput) return;
      const val = mockInput.value.trim();
      if (val) {
        this.simulateSpeechInput(val);
        mockInput.value = '';
      }
    };

    mockSubmitBtn?.addEventListener('click', submitMock);
    mockInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitMock();
      }
    });

    quickChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-command');
        if (cmd) {
          this.simulateSpeechInput(cmd);
        }
      });
    });

    // Initial renders
    updateStatusUI(this.status);
    updatePortfolioStateUI();
    renderHistoryFeed();
  }
}

// Browser global binding
if (typeof window !== 'undefined') {
  window.DeveloperPortfolioVoiceCommander = DeveloperPortfolioVoiceCommander;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      // Auto-initialize if UI container is present
      const autoContainer = document.getElementById('developer-portfolio-voice-app');
      if (autoContainer && !window._voiceCommanderInstance) {
        window._voiceCommanderInstance = new DeveloperPortfolioVoiceCommander({
          autoSynthesize: true
        });
        window._voiceCommanderInstance.attachUI(document);
      }
    });
  }
}

export default DeveloperPortfolioVoiceCommander;
