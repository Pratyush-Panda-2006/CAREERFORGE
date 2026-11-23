/**
 * Ecommerce Store - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Hands-free voice shortcut controller and audio synthesis assistant for e-commerce shopping.
 *
 * Provides voice grammar parsing, command execution, shopping state mutations,
 * audio feedback synthesizer with headless fallback, and WCAG AAA contrast toggling.
 */

const WORD_TO_NUMBER = {
  a: 1,
  an: 1,
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
  dozen: 12
};

function parseQuantity(token) {
  if (!token) return 1;
  const lower = String(token).toLowerCase().trim();
  if (WORD_TO_NUMBER[lower] !== undefined) return WORD_TO_NUMBER[lower];
  const parsed = parseInt(lower, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export class EcommerceStoreVoiceCommander {
  constructor(options = {}) {
    this.options = {
      language: options.language || options.lang || 'en-US',
      continuous: options.continuous ?? false,
      interimResults: options.interimResults ?? false,
      enableSpeechSynthesis: options.enableSpeechSynthesis ?? true,
      maxHistory: options.maxHistory || 50,
      synthRate: options.synthRate ?? 1.0,
      synthPitch: options.synthPitch ?? 1.0,
      synthVolume: options.synthVolume ?? 1.0,
      ...options
    };

    // Voice & Dispatcher State
    this.isListening = false;
    this.status = 'IDLE'; // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SYNTHESIZING' | 'ERROR'
    this.currentPage = options.initialPage || 'products';
    this.activeCategory = options.initialCategory || 'all';
    this.highContrast = Boolean(options.highContrast);
    this.cart = Array.isArray(options.initialCart) ? [...options.initialCart] : [];
    this.wishlist = Array.isArray(options.initialWishlist) ? [...options.initialWishlist] : [];
    this.appliedPromo = options.initialPromo || null;
    this.lastSearchQuery = null;
    this.searchHistory = [];
    this.isCheckingOut = false;

    // Command History & Spoken Output Tracking
    this.commandHistory = [];
    this.spokenMessages = [];
    this.lastSpokenMessage = null;
    this.listeners = new Map();

    // Web Speech API references
    this.recognition = null;
    this.synth = options.synth || (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

    this.initSpeechRecognition();
  }

  // --- Event Emitter Pattern ---
  on(event, handler) {
    if (typeof handler !== 'function') return this;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    if (!this.listeners.has(event)) return this;
    if (handler) {
      this.listeners.get(event).delete(handler);
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return false;
    for (const handler of this.listeners.get(event)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`[EcommerceStoreVoiceCommander] Error in listener for "${event}":`, err);
      }
    }
    return true;
  }

  setStatus(newStatus) {
    this.status = newStatus;
    this.emit('statusChange', { status: this.status, isListening: this.isListening });
  }

  // --- Speech Recognition Initialization ---
  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.lang = this.options.language;
          this.recognition.continuous = this.options.continuous;
          this.recognition.interimResults = this.options.interimResults;

          this.recognition.onstart = () => {
            this.isListening = true;
            this.setStatus('LISTENING');
            this.emit('listeningStateChange', { isListening: true, status: this.status });
          };

          this.recognition.onresult = (event) => {
            const current = event.resultIndex || 0;
            const transcript = event.results[current][0].transcript;
            const confidence = event.results[current][0].confidence || 1.0;
            this.processTranscript(transcript, { confidence });
          };

          this.recognition.onerror = (event) => {
            this.setStatus('ERROR');
            this.emit('error', { error: event.error, message: event.message || `Speech recognition error: ${event.error}` });
            this.isListening = false;
            this.emit('listeningStateChange', { isListening: false, status: this.status });
          };

          this.recognition.onend = () => {
            this.isListening = false;
            if (this.status === 'LISTENING') {
              this.setStatus('IDLE');
            }
            this.emit('listeningStateChange', { isListening: false, status: this.status });
          };
        } catch (err) {
          // Recognition setup error fallback
        }
      }
    }
  }

  // --- Listening Control Methods ---
  startListening() {
    if (this.isListening) return true;

    this.isListening = true;
    this.setStatus('LISTENING');
    this.emit('listeningStateChange', { isListening: true, status: this.status });

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        // Recognition start fallback
      }
    }
    return true;
  }

  stopListening() {
    if (!this.isListening) return false;

    this.isListening = false;
    this.setStatus('IDLE');
    this.emit('listeningStateChange', { isListening: false, status: this.status });

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Recognition stop fallback
      }
    }
    return false;
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      this.startListening();
      return true;
    }
  }

  isListeningState() {
    return this.isListening;
  }

  // --- Voice Grammar Registry & Intent Parser ---
  parseVoiceGrammar(transcript) {
    if (transcript === null || transcript === undefined) {
      return {
        matched: false,
        action: 'UNKNOWN',
        payload: { transcript: '' },
        confidence: 0,
        rawTranscript: '',
        error: 'Empty transcript'
      };
    }

    if (typeof transcript !== 'string') {
      return {
        matched: false,
        action: 'UNKNOWN',
        payload: { transcript: '' },
        confidence: 0,
        rawTranscript: '',
        error: 'Invalid transcript type'
      };
    }

    const raw = transcript.trim();
    if (!raw) {
      return {
        matched: false,
        action: 'UNKNOWN',
        payload: { transcript: '' },
        confidence: 0,
        rawTranscript: '',
        error: 'Empty transcript'
      };
    }

    // Normalized clean transcript
    const clean = raw.toLowerCase().replace(/[.?!,;]+$/, '').trim();

    // 1. HELP
    if (/^(?:help|what\s+can\s+i\s+say|commands|show\s+commands|list\s+commands|voice\s+commands)$/i.test(clean)) {
      return {
        matched: true,
        action: 'HELP',
        payload: {},
        rawTranscript: raw
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST
    if (/^(?:toggle\s+(?:high\s+)?contrast|high\s+contrast(?:\s+mode)?|accessibility\s+mode|toggle\s+accessibility|switch\s+contrast)$/i.test(clean)) {
      return {
        matched: true,
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: { enabled: !this.highContrast },
        rawTranscript: raw
      };
    }
    if (/^(?:enable|turn\s+on|activate)\s+(?:high\s+)?contrast(?:\s+mode)?$/i.test(clean)) {
      return {
        matched: true,
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: { enabled: true },
        rawTranscript: raw
      };
    }
    if (/^(?:disable|turn\s+off|deactivate)\s+(?:high\s+)?contrast(?:\s+mode)?$/i.test(clean)) {
      return {
        matched: true,
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: { enabled: false },
        rawTranscript: raw
      };
    }

    // 3. CHECKOUT
    if (/^(?:proceed\s+to\s+checkout|checkout|start\s+checkout|initiate\s+checkout|pay\s+now|complete\s+(?:order|purchase))$/i.test(clean)) {
      return {
        matched: true,
        action: 'CHECKOUT',
        payload: {},
        rawTranscript: raw
      };
    }

    // 4. APPLY_PROMO
    const promoMatch = clean.match(/^(?:apply\s+(?:promo(?:\s+code)?|coupon(?:\s+code)?|discount(?:\s+code)?|voucher)|use\s+(?:promo(?:\s+code)?|coupon(?:\s+code)?)|promo(?:\s+code)?|coupon|redeem\s+(?:code|coupon|promo))\s+([a-z0-9_-]+)$/i);
    if (promoMatch) {
      return {
        matched: true,
        action: 'APPLY_PROMO',
        payload: { code: promoMatch[1].toUpperCase() },
        rawTranscript: raw
      };
    }

    // 5. NAVIGATE_PAGE
    const navMatch = clean.match(/^(?:navigate(?:\s+to)?|go\s+to|open|view|show|visit)\s+(?:the\s+)?(products?|cart|checkout|orders?|wishlist|home)(?:\s+page)?$/i);
    if (navMatch) {
      let page = navMatch[1].toLowerCase();
      if (page === 'product') page = 'products';
      if (page === 'order') page = 'orders';
      if (page === 'home') page = 'products';
      return {
        matched: true,
        action: 'NAVIGATE_PAGE',
        payload: { page },
        rawTranscript: raw
      };
    }

    // 6. FILTER_CATEGORY
    const catMatch = clean.match(/^(?:filter(?:\s+by)?(?:\s+category)?|show\s+category|browse\s+category|category)\s+(electronics|apparel|home|books|all)$/i)
      || clean.match(/^filter\s+(electronics|apparel|home|books|all)$/i)
      || clean.match(/^(electronics|apparel|home|books)\s+category$/i);
    if (catMatch) {
      const category = catMatch[1].toLowerCase();
      return {
        matched: true,
        action: 'FILTER_CATEGORY',
        payload: { category },
        rawTranscript: raw
      };
    }

    // 7. ADD_TO_CART
    const addPrefixMatch = clean.match(/^add\s+to\s+cart\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|a|an)\s+)?(.+)$/i);
    if (addPrefixMatch) {
      const quantity = parseQuantity(addPrefixMatch[1]);
      const product = addPrefixMatch[2].trim();
      return {
        matched: true,
        action: 'ADD_TO_CART',
        payload: { product, quantity },
        rawTranscript: raw
      };
    }

    const addMatch = clean.match(/^(?:add|buy|order|put)\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|a|an)\s+)?(.+?)(?:\s+(?:in|into|to)\s+(?:my\s+)?cart)?$/i);
    if (addMatch) {
      const quantity = parseQuantity(addMatch[1]);
      let product = addMatch[2].trim();
      product = product.replace(/\s+(?:in|into|to)\s+(?:my\s+)?cart$/i, '').trim();
      if (product) {
        return {
          matched: true,
          action: 'ADD_TO_CART',
          payload: { product, quantity },
          rawTranscript: raw
        };
      }
    }

    // 8. SEARCH_PRODUCTS
    const searchMatch = clean.match(/^(?:search(?:\s+for)?|find|look\s+for|lookup|query)\s+(.+)$/i);
    if (searchMatch) {
      const query = searchMatch[1].trim();
      return {
        matched: true,
        action: 'SEARCH_PRODUCTS',
        payload: { query },
        rawTranscript: raw
      };
    }

    // Fallback: Unknown Grammar
    return {
      matched: false,
      action: 'UNKNOWN',
      payload: { transcript: raw },
      confidence: 0,
      rawTranscript: raw
    };
  }

  // --- Command Execution & State Mutations ---
  executeCommand(action, payload = {}, rawTranscript = '') {
    const startTime = Date.now();
    let responseText = '';
    let status = 'SUCCESS';
    let details = {};

    switch (action) {
      case 'NAVIGATE_PAGE': {
        const page = payload.page || 'products';
        this.currentPage = page;
        responseText = `Navigating to ${page} page.`;
        details = { page: this.currentPage };
        this.emit('navigate', { page: this.currentPage });
        break;
      }

      case 'SEARCH_PRODUCTS': {
        const query = payload.query || '';
        this.lastSearchQuery = query;
        if (query) {
          this.searchHistory.push(query);
        }
        responseText = `Searching products for "${query}".`;
        details = { query: this.lastSearchQuery };
        this.emit('search', { query: this.lastSearchQuery });
        break;
      }

      case 'FILTER_CATEGORY': {
        const category = payload.category || 'all';
        this.activeCategory = category;
        responseText = `Filtering catalogue by ${category} category.`;
        details = { category: this.activeCategory };
        this.emit('filterCategory', { category: this.activeCategory });
        break;
      }

      case 'ADD_TO_CART': {
        const quantity = payload.quantity || 1;
        const product = payload.product || 'Product';
        const cartItem = {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: product,
          quantity,
          timestamp: Date.now()
        };
        this.cart.push(cartItem);
        responseText = `Added ${quantity} ${product} to your cart.`;
        details = {
          cartItem,
          totalItems: this.cart.reduce((sum, item) => sum + item.quantity, 0)
        };
        this.emit('cartUpdated', { cart: [...this.cart], item: cartItem });
        break;
      }

      case 'TOGGLE_HIGH_CONTRAST': {
        this.toggleHighContrast(payload.enabled);
        responseText = `High contrast accessibility mode ${this.highContrast ? 'enabled' : 'disabled'}.`;
        details = { highContrast: this.highContrast };
        break;
      }

      case 'APPLY_PROMO': {
        const code = (payload.code || '').toUpperCase();
        this.appliedPromo = code;
        responseText = `Applying promotional discount code "${code}".`;
        details = { promoCode: this.appliedPromo };
        this.emit('promoApplied', { code: this.appliedPromo });
        break;
      }

      case 'CHECKOUT': {
        this.isCheckingOut = true;
        this.currentPage = 'checkout';
        const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        responseText = `Proceeding to checkout with ${itemCount} item${itemCount === 1 ? '' : 's'}.`;
        details = { isCheckingOut: true, itemCount };
        this.emit('checkoutInitiated', { cart: [...this.cart], itemCount });
        break;
      }

      case 'HELP': {
        responseText = 'Available voice commands: navigate to <page>, search for <query>, filter by <category>, add <item> to cart, apply promo <code>, proceed to checkout, toggle high contrast, or say help.';
        details = {
          supportedActions: [
            'NAVIGATE_PAGE',
            'SEARCH_PRODUCTS',
            'FILTER_CATEGORY',
            'ADD_TO_CART',
            'TOGGLE_HIGH_CONTRAST',
            'APPLY_PROMO',
            'CHECKOUT',
            'HELP'
          ]
        };
        this.emit('helpRequested', details);
        break;
      }

      default: {
        status = 'UNRECOGNIZED';
        const text = rawTranscript || payload.transcript || '';
        if (!text) {
          responseText = 'No voice input detected. Please speak clearly.';
        } else {
          responseText = `Command not recognized: "${text}". Say "help" for a list of voice commands.`;
        }
        details = { unparsed: text };
        break;
      }
    }

    const historyRecord = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      transcript: rawTranscript || payload.transcript || '',
      action,
      payload,
      status,
      matched: status === 'SUCCESS',
      confidence: typeof payload.confidence === 'number' ? payload.confidence : 1.0,
      response: responseText,
      details,
      executionTimeMs: Date.now() - startTime,
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.commandHistory.unshift(historyRecord);
    if (this.commandHistory.length > this.options.maxHistory) {
      this.commandHistory.pop();
    }

    this.synthesizeResponse(responseText);
    this.emit('commandExecuted', historyRecord);
    return historyRecord;
  }

  // --- Accessibility Mode Toggling ---
  toggleHighContrast(forcedValue) {
    this.highContrast = typeof forcedValue === 'boolean' ? forcedValue : !this.highContrast;

    if (typeof document !== 'undefined' && document.body) {
      if (this.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }

    this.emit('highContrastToggle', { enabled: this.highContrast });
    return this.highContrast;
  }

  // --- Audio Feedback Synthesizer ---
  synthesizeResponse(message) {
    const text = String(message || '').trim();
    if (!text) return '';

    this.lastSpokenMessage = text;
    this.spokenMessages.push(text);
    this.setStatus('SYNTHESIZING');

    if (this.options.enableSpeechSynthesis && this.synth && typeof window !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        if (this.synth.speaking) {
          this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.options.language;
        utterance.rate = this.options.synthRate;
        utterance.pitch = this.options.synthPitch;
        utterance.volume = this.options.synthVolume;

        utterance.onend = () => {
          this.setStatus('IDLE');
          this.emit('speechSynthesized', { text, spoken: true });
        };

        utterance.onerror = (e) => {
          this.setStatus('IDLE');
          this.emit('speechSynthesized', { text, spoken: false, error: e.error });
        };

        this.synth.speak(utterance);
        return text;
      } catch (err) {
        // Fallback
      }
    }

    // Headless / fallback recording
    this.setStatus('IDLE');
    this.emit('speechSynthesized', { text, spoken: false, headless: true });
    return text;
  }

  // --- Headless Test Simulation & Processing ---
  processTranscript(transcript, options = {}) {
    let confidence = 1.0;
    if (typeof options === 'number') {
      confidence = options;
    } else if (options && typeof options.confidence === 'number') {
      confidence = options.confidence;
    }

    this.setStatus('PROCESSING');
    const parsed = this.parseVoiceGrammar(transcript);
    parsed.confidence = confidence;

    this.emit('commandRecognized', {
      rawTranscript: transcript,
      confidence,
      parsed
    });

    const payloadWithConf = { ...parsed.payload, confidence };
    return this.executeCommand(parsed.action, payloadWithConf, parsed.rawTranscript);
  }

  // --- History & Audit Helpers ---
  getCommandHistory() {
    return [...this.commandHistory];
  }

  clearHistory() {
    this.commandHistory = [];
    this.emit('historyCleared', { timestamp: Date.now() });
    return true;
  }

  getSpokenMessages() {
    return [...this.spokenMessages];
  }

  clearSpokenMessages() {
    this.spokenMessages = [];
    return true;
  }

  getLastSpokenMessage() {
    return this.lastSpokenMessage;
  }
}

// --- Browser DOM Controller ---
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new EcommerceStoreVoiceCommander();

    // DOM Elements
    const micBtn = document.getElementById('micBtn');
    const micStatus = document.getElementById('micStatus');
    const statusBadge = document.getElementById('statusBadge');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const confidenceBar = document.getElementById('confidenceBar');
    const confidenceVal = document.getElementById('confidenceVal');
    const transcriptBox = document.getElementById('transcriptBox');
    const mockInput = document.getElementById('mockInput');
    const mockSendBtn = document.getElementById('mockSendBtn');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const contrastToggleBtn = document.getElementById('contrastToggleBtn');

    // Telemetry Badges
    const pageBadge = document.getElementById('pageBadge');
    const categoryBadge = document.getElementById('categoryBadge');
    const cartCountBadge = document.getElementById('cartCountBadge');
    const promoBadge = document.getElementById('promoBadge');
    const contrastBadge = document.getElementById('contrastBadge');

    function updateStatusUI(status) {
      if (statusBadge) {
        statusBadge.textContent = status;
        statusBadge.className = `status-pill status-${status.toLowerCase()}`;
      }

      if (micStatus) {
        micStatus.textContent = status === 'LISTENING' ? 'Listening... Speak your shopping command' :
                                status === 'PROCESSING' ? 'Processing speech grammar...' :
                                status === 'SYNTHESIZING' ? 'Synthesizing voice response...' :
                                'Click microphone to speak or use quick commands';
      }

      if (waveVisualizer) {
        if (status === 'LISTENING' || status === 'SYNTHESIZING') {
          waveVisualizer.classList.add('wave-active');
        } else {
          waveVisualizer.classList.remove('wave-active');
        }
      }

      if (micBtn) {
        if (status === 'LISTENING') {
          micBtn.classList.add('mic-active');
          micBtn.setAttribute('aria-pressed', 'true');
        } else {
          micBtn.classList.remove('mic-active');
          micBtn.setAttribute('aria-pressed', 'false');
        }
      }
    }

    function renderHistoryEntry(entry) {
      if (!historyList) return;
      const card = document.createElement('div');
      card.className = `history-card history-${entry.status.toLowerCase()}`;

      const pct = Math.round((entry.confidence || 1.0) * 100);
      card.innerHTML = `
        <div class="history-top">
          <span class="history-action-badge action-${entry.action.toLowerCase()}">${entry.action}</span>
          <span class="history-confidence">${pct}% Conf</span>
          <span class="history-time">${entry.timeFormatted}</span>
        </div>
        <div class="history-heard"><strong>Voice:</strong> "${entry.transcript || '(empty)'}"</div>
        <div class="history-resp"><strong>Dispatcher:</strong> ${entry.response}</div>
      `;

      // Remove empty placeholder if present
      const emptyMsg = historyList.querySelector('.empty-history-msg');
      if (emptyMsg) {
        historyList.removeChild(emptyMsg);
      }

      historyList.prepend(card);
    }

    function updateTelemetry() {
      if (pageBadge) pageBadge.textContent = commander.currentPage.toUpperCase();
      if (categoryBadge) categoryBadge.textContent = commander.activeCategory.toUpperCase();
      if (cartCountBadge) {
        const count = commander.cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountBadge.textContent = `${count} Items`;
      }
      if (promoBadge) promoBadge.textContent = commander.appliedPromo || 'NONE';
      if (contrastBadge) contrastBadge.textContent = commander.highContrast ? 'ON' : 'OFF';
    }

    // Attach Commander Event Listeners
    commander.on('statusChange', ({ status }) => {
      updateStatusUI(status);
    });

    commander.on('listeningStateChange', ({ status }) => {
      updateStatusUI(status);
    });

    commander.on('commandRecognized', ({ rawTranscript, confidence, parsed }) => {
      if (transcriptBox) {
        transcriptBox.textContent = `Heard: "${rawTranscript}" → [${parsed.action}]`;
      }
      if (confidenceBar && confidenceVal) {
        const pct = Math.round(confidence * 100);
        confidenceBar.style.width = `${pct}%`;
        confidenceVal.textContent = `${pct}%`;
      }
    });

    commander.on('commandExecuted', (entry) => {
      renderHistoryEntry(entry);
      updateTelemetry();
      if (transcriptBox) {
        transcriptBox.textContent = `Dispatcher: ${entry.response}`;
      }
    });

    commander.on('highContrastToggle', ({ enabled }) => {
      updateTelemetry();
      if (contrastToggleBtn) {
        contrastToggleBtn.setAttribute('aria-pressed', String(enabled));
      }
    });

    commander.on('historyCleared', () => {
      if (historyList) {
        historyList.innerHTML = '<div class="empty-history-msg">No voice commands recorded yet.</div>';
      }
    });

    // Control Event Handlers
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

    if (mockSendBtn && mockInput) {
      const handleMockSend = () => {
        const val = mockInput.value.trim();
        if (val) {
          commander.processTranscript(val, 0.98);
          mockInput.value = '';
        }
      };

      mockSendBtn.addEventListener('click', handleMockSend);
      mockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleMockSend();
      });
    }

    // Quick Command Chips
    document.querySelectorAll('.quick-command-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd') || chip.textContent.trim();
        if (cmd) {
          commander.processTranscript(cmd, 1.0);
        }
      });
    });

    // Initial State Render
    updateStatusUI('IDLE');
    updateTelemetry();
  });
}

export default EcommerceStoreVoiceCommander;
