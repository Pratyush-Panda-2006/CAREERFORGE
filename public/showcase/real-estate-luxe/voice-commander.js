/**
 * Real Estate Luxe - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Hands-free luxury property search, VIP viewing concierge, mortgage estimation,
 * and WCAG accessibility speech dispatching.
 */

/**
 * Parses numeric amounts from voice transcripts.
 * Supports "$5M", "5 million", "500k", "1,500,000", "2.5m", "10 million", etc.
 * @param {string} str - Raw speech substring
 * @returns {number|null} - Parsed integer or null
 */
export function parseAmount(str) {
  if (!str) return null;
  const clean = String(str).toLowerCase().replace(/,/g, '').trim();

  const wordMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  const match = clean.match(/\$?\s*(\d+(?:\.\d+)?|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b)\s*(k|thousand|m|million|mil|b|billion)?/i);
  if (!match) return null;

  let base = wordMap[match[1]] !== undefined ? wordMap[match[1]] : parseFloat(match[1]);
  if (isNaN(base)) return null;

  const unit = match[2] ? match[2].toLowerCase() : '';
  if (unit === 'k' || unit === 'thousand') {
    base *= 1000;
  } else if (unit === 'm' || unit === 'million' || unit === 'mil') {
    base *= 1000000;
  } else if (unit === 'b' || unit === 'billion') {
    base *= 1000000000;
  }
  return Math.round(base);
}

/**
 * Parses bedroom count from speech transcripts.
 * Supports "4 bedrooms", "minimum 5 beds", "three bedrooms", etc.
 * @param {string} str - Speech substring
 * @returns {number|null} - Parsed bedroom count or null
 */
export function parseBedrooms(str) {
  if (!str) return null;
  const wordMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };
  const match = String(str).toLowerCase().match(/(?:minimum|min|at\s+least)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed|beds|bedroom|bedrooms)/i);
  if (!match) return null;
  const val = wordMap[match[1]] !== undefined ? wordMap[match[1]] : parseInt(match[1], 10);
  return isNaN(val) ? null : val;
}

/**
 * Calculates estimated monthly mortgage payments for luxury properties.
 * Formula: M = P * (r(1+r)^n) / ((1+r)^n - 1)
 * @param {number} homePrice - Purchase price
 * @param {number} downPaymentPercent - Percentage down (default 20%)
 * @param {number} annualRate - Annual interest rate (default 6.5%)
 * @param {number} years - Loan tenure in years (default 30)
 * @returns {number} - Estimated monthly payment rounded to nearest integer
 */
export function calculateMortgagePayment(homePrice, downPaymentPercent = 20, annualRate = 6.5, years = 30) {
  const principal = homePrice * (1 - downPaymentPercent / 100);
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return Math.round(principal / numPayments);
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  return Math.round(monthlyPayment);
}

/**
 * Capitalizes city name nicely.
 */
function formatCity(str) {
  if (!str) return null;
  return str.trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Capitalizes property or venue names.
 */
function formatPropertyName(str) {
  if (!str) return 'Featured Luxury Property';
  return str.trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Headless fallback mock for SpeechRecognition when running in Node.js or unsupported browsers.
 */
class HeadlessSpeechRecognitionMock {
  constructor(commander) {
    this.commander = commander;
    this.lang = 'en-US';
    this.continuous = false;
    this.interimResults = false;
    this.isMock = true;
  }

  start() {
    if (this.commander) {
      this.commander.setState('LISTENING');
      this.commander.isListening = true;
      this.commander.emit('listeningStarted');
    }
  }

  stop() {
    if (this.commander) {
      this.commander.setState('IDLE');
      this.commander.isListening = false;
      this.commander.emit('listeningStopped');
    }
  }

  abort() {
    this.stop();
  }
}

/**
 * Main Class: RealEstateLuxeVoiceCommander
 */
export class RealEstateLuxeVoiceCommander {
  /**
   * @param {Object} options
   * @param {string} [options.lang='en-US']
   * @param {boolean} [options.continuous=false]
   * @param {boolean} [options.interimResults=false]
   * @param {Object} [options.recognition=null] - Custom SpeechRecognition instance
   * @param {Object} [options.synthesis=null] - Custom SpeechSynthesis instance
   */
  constructor(options = {}) {
    this.lang = options.lang || 'en-US';
    this.continuous = options.continuous !== undefined ? options.continuous : false;
    this.interimResults = options.interimResults !== undefined ? options.interimResults : false;

    // State machine: 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SYNTHESIZING'
    this.state = 'IDLE';
    this.isListening = false;
    this.isHighContrast = false;
    this.commandHistory = [];

    // Luxury Property Filter State
    this.filters = {
      city: null,
      propertyType: null,
      minPrice: null,
      maxPrice: null,
      bedrooms: null
    };

    this.lastRecognized = null;
    this.listeners = new Map();

    this.speechRecognition = options.recognition || this._initSpeechRecognition();
    this.speechSynthesis = options.synthesis || (typeof window !== 'undefined' ? window.speechSynthesis : null);
  }

  /**
   * Initializes browser Web Speech API SpeechRecognition or falls back to headless mock.
   */
  _initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = this.lang;
          rec.continuous = this.continuous;
          rec.interimResults = this.interimResults;

          rec.onstart = () => {
            this.setState('LISTENING');
            this.isListening = true;
            this.emit('listeningStarted');
          };

          rec.onresult = (event) => {
            const transcript = Array.from(event.results)
              .map(result => result[0].transcript)
              .join(' ')
              .trim();
            const confidence = event.results[0] && event.results[0][0] ? event.results[0][0].confidence : 1.0;
            this.handleSpeechResult(transcript, confidence);
          };

          rec.onerror = (event) => {
            this.emit('error', event.error || event);
            this.setState('IDLE');
            this.isListening = false;
          };

          rec.onend = () => {
            if (this.state === 'LISTENING') {
              this.setState('IDLE');
              this.isListening = false;
              this.emit('listeningStopped');
            }
          };

          return rec;
        } catch (e) {
          // Fallback if browser security blocks recognition instance creation
        }
      }
    }
    return new HeadlessSpeechRecognitionMock(this);
  }

  // --- State & Event System ---

  /**
   * Sets internal state and emits stateChanged event.
   * @param {string} newState
   */
  setState(newState) {
    if (this.state === newState) return;
    const prevState = this.state;
    this.state = newState;
    this.emit('stateChanged', { state: newState, prevState });
  }

  /**
   * Subscribes an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    if (typeof callback !== 'function') return this;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return this;
  }

  /**
   * Unsubscribes an event listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    return this;
  }

  /**
   * Emits an event to registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in voice commander event listener for "${event}":`, err);
        }
      }
    }
    return this;
  }

  // --- Voice Control Lifecycle Methods ---

  /**
   * Starts speech recognition listening.
   */
  startListening() {
    if (this.isListening) return;
    this.isListening = true;
    this.setState('LISTENING');
    if (this.speechRecognition && typeof this.speechRecognition.start === 'function') {
      try {
        this.speechRecognition.start();
      } catch (err) {
        // Recognition already active
      }
    }
    this.emit('listeningStarted');
  }

  /**
   * Stops speech recognition listening.
   */
  stopListening() {
    if (!this.isListening) return;
    this.isListening = false;
    this.setState('IDLE');
    if (this.speechRecognition && typeof this.speechRecognition.stop === 'function') {
      try {
        this.speechRecognition.stop();
      } catch (err) {
        // Recognition already stopped
      }
    }
    this.emit('listeningStopped');
  }

  /**
   * Toggles speech recognition listening state.
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

  // --- Voice Grammar Parsing & Action Routing ---

  /**
   * Parses incoming voice transcripts according to luxury real estate grammars.
   * @param {string} transcript - Spoken or simulated transcript
   * @returns {Object} - Parsed grammar result with action and payload
   */
  parseVoiceGrammar(transcript) {
    const rawTranscript = String(transcript || '').trim();
    const clean = rawTranscript.toLowerCase().replace(/[.,!?;:]+$/g, '').trim();

    // 1. HELP Grammar
    if (/^(?:help|list\s+commands|what\s+can\s+i\s+say|show\s+commands|commands)$/i.test(clean)) {
      return {
        action: 'HELP',
        payload: {
          rawTranscript,
          availableCommands: [
            'SEARCH_PROPERTY',
            'FILTER_PRICE',
            'FILTER_BEDROOMS',
            'SCHEDULE_VIEWING',
            'CALCULATE_MORTGAGE',
            'TOGGLE_HIGH_CONTRAST',
            'HELP'
          ]
        },
        confidence: 1.0,
        rawTranscript
      };
    }

    // 2. TOGGLE_HIGH_CONTRAST Grammar
    if (/(?:toggle\s+(?:high\s+)?contrast|high\s+contrast(?:\s+mode)?|accessibility\s+mode|toggle\s+accessibility)/i.test(clean)) {
      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: { rawTranscript },
        confidence: 1.0,
        rawTranscript
      };
    }

    // 3. CALCULATE_MORTGAGE Grammar
    if (/(?:calculate\s+mortgage|estimate\s+(?:monthly\s+)?payment|calculate\s+(?:monthly\s+)?payment|mortgage\s+calculator)/i.test(clean)) {
      return {
        action: 'CALCULATE_MORTGAGE',
        payload: { rawTranscript },
        confidence: 1.0,
        rawTranscript
      };
    }

    // 4. SCHEDULE_VIEWING Grammar
    const viewingMatch = clean.match(/(?:schedule\s+(?:a\s+)?viewing|book\s+(?:a\s+)?(?:private\s+)?tour|request\s+(?:a\s+)?vip\s+showing)(?:\s+(?:for|at)\s+(.+))?/i);
    if (viewingMatch) {
      let type = 'viewing';
      if (/vip\s+showing/i.test(clean)) {
        type = 'vip_showing';
      } else if (/private\s+tour/i.test(clean)) {
        type = 'private_tour';
      }
      const propertyName = viewingMatch[1] ? formatPropertyName(viewingMatch[1]) : 'Featured Luxury Property';
      return {
        action: 'SCHEDULE_VIEWING',
        payload: {
          property: propertyName,
          type,
          rawTranscript
        },
        confidence: 0.95,
        rawTranscript
      };
    }

    // 5. FILTER_BEDROOMS Grammar
    const bedroomMatch = clean.match(/(?:filter\s+)?(?:minimum|min|at\s+least)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:bed|beds|bedroom|bedrooms)/i);
    if (bedroomMatch) {
      const count = parseBedrooms(bedroomMatch[0]);
      if (count !== null) {
        return {
          action: 'FILTER_BEDROOMS',
          payload: {
            bedrooms: count,
            minBedrooms: count,
            rawTranscript
          },
          confidence: 0.95,
          rawTranscript
        };
      }
    }

    // 6. FILTER_PRICE Grammar
    // Check "price between <min> and <max>" or "budget between <min> and <max>"
    const betweenMatch = clean.match(/(?:filter\s+)?(?:price|budget)?\s*between\s+(.+?)\s+and\s+(.+)/i);
    if (betweenMatch) {
      const minPrice = parseAmount(betweenMatch[1]);
      const maxPrice = parseAmount(betweenMatch[2]);
      if (minPrice !== null || maxPrice !== null) {
        return {
          action: 'FILTER_PRICE',
          payload: {
            mode: 'between',
            minPrice,
            maxPrice,
            rawTranscript
          },
          confidence: 0.95,
          rawTranscript
        };
      }
    }

    // Check "filter price above <amount>" or "price above <amount>"
    const aboveMatch = clean.match(/(?:filter\s+)?(?:price|budget)?\s*(?:above|over|exceeding|more\s+than|minimum|min)\s+(.+)/i);
    if (aboveMatch) {
      const minPrice = parseAmount(aboveMatch[1]);
      if (minPrice !== null) {
        return {
          action: 'FILTER_PRICE',
          payload: {
            mode: 'above',
            minPrice,
            maxPrice: null,
            rawTranscript
          },
          confidence: 0.95,
          rawTranscript
        };
      }
    }

    // Check "budget under <amount>" or "price under <amount>"
    const underMatch = clean.match(/(?:filter\s+)?(?:budget|price)?\s*(?:under|below|less\s+than|maximum|max)\s+(.+)/i);
    if (underMatch) {
      const maxPrice = parseAmount(underMatch[1]);
      if (maxPrice !== null) {
        return {
          action: 'FILTER_PRICE',
          payload: {
            mode: 'under',
            minPrice: null,
            maxPrice,
            rawTranscript
          },
          confidence: 0.95,
          rawTranscript
        };
      }
    }

    // 7. SEARCH_PROPERTY Grammar
    const hasSearchKeyword = /\b(?:search|find|show|browse|list|look\s+for)\b/i.test(clean);
    const typeMatch = clean.match(/\b(penthouses?|villas?|estates?|mansions?|condos?|apartments?|chalets?|residences?)\b/i);
    let propertyType = null;
    if (typeMatch) {
      const rawType = typeMatch[1].toLowerCase();
      propertyType = rawType.endsWith('s') ? rawType.slice(0, -1) : rawType;
    }

    const cityMatch = clean.match(/\bin\s+([a-zA-Z\s]+?)(?:\s+(?:under|above|between|with|having|for)|$)/i);
    let city = null;
    if (cityMatch) {
      const candidate = cityMatch[1].trim();
      const forbidden = ['luxury', 'property', 'properties', 'estate', 'estates', 'high', 'contrast', 'villa', 'villas', 'penthouse', 'penthouses'];
      if (!forbidden.includes(candidate.toLowerCase())) {
        city = formatCity(candidate);
      }
    }

    if (hasSearchKeyword || propertyType || (city && /propert/i.test(clean))) {
      return {
        action: 'SEARCH_PROPERTY',
        payload: {
          city: city || null,
          propertyType: propertyType || null,
          query: rawTranscript,
          rawTranscript
        },
        confidence: 0.9,
        rawTranscript
      };
    }

    // 8. UNKNOWN Command Fallback
    return {
      action: 'UNKNOWN',
      payload: {
        rawTranscript,
        confidence: 0
      },
      confidence: 0,
      rawTranscript
    };
  }

  /**
   * Executes recognized action, mutates state, synthesizes voice response, and logs history.
   * @param {string} action - Recognized action name
   * @param {Object} payload - Extracted payload parameters
   * @returns {Object} Command execution record
   */
  executeCommand(action, payload = {}) {
    this.setState('PROCESSING');
    let responseText = '';
    let success = true;

    switch (action) {
      case 'SEARCH_PROPERTY': {
        const { city, propertyType } = payload;
        if (city !== undefined && city !== null) this.filters.city = city;
        if (propertyType !== undefined && propertyType !== null) this.filters.propertyType = propertyType;

        if (city && propertyType) {
          responseText = `Searching for luxury ${propertyType} listings in ${city}.`;
        } else if (city) {
          responseText = `Searching premier luxury properties in ${city}.`;
        } else if (propertyType) {
          responseText = `Displaying our curated portfolio of luxury ${propertyType}s.`;
        } else {
          responseText = `Searching our exclusive luxury property portfolio.`;
        }
        break;
      }
      case 'FILTER_PRICE': {
        const { mode, minPrice, maxPrice } = payload;
        if (minPrice !== undefined) this.filters.minPrice = minPrice;
        if (maxPrice !== undefined) this.filters.maxPrice = maxPrice;

        const formatCurrency = (val) => val ? `$${Number(val).toLocaleString('en-US')}` : '';
        if (mode === 'between' && minPrice && maxPrice) {
          responseText = `Filtering properties between ${formatCurrency(minPrice)} and ${formatCurrency(maxPrice)}.`;
        } else if (mode === 'above' && minPrice) {
          responseText = `Filtering properties priced above ${formatCurrency(minPrice)}.`;
        } else if (mode === 'under' && maxPrice) {
          responseText = `Filtering properties with budget under ${formatCurrency(maxPrice)}.`;
        } else {
          responseText = `Price filter updated.`;
        }
        break;
      }
      case 'FILTER_BEDROOMS': {
        const { bedrooms } = payload;
        this.filters.bedrooms = bedrooms;
        responseText = `Filtering properties with at least ${bedrooms} bedrooms.`;
        break;
      }
      case 'SCHEDULE_VIEWING': {
        const property = payload.property || 'Featured Luxury Property';
        const type = payload.type || 'viewing';
        const label = type === 'private_tour' ? 'Private tour' : type === 'vip_showing' ? 'VIP showing' : 'Private viewing';
        responseText = `${label} requested for ${property}. A luxury concierge specialist will contact you shortly.`;
        break;
      }
      case 'CALCULATE_MORTGAGE': {
        const basePrice = this.filters.maxPrice || this.filters.minPrice || 5000000;
        const payment = calculateMortgagePayment(basePrice);
        responseText = `Estimated mortgage payment for a $${basePrice.toLocaleString('en-US')} luxury portfolio is approximately $${payment.toLocaleString('en-US')} per month with 20% down.`;
        break;
      }
      case 'TOGGLE_HIGH_CONTRAST': {
        this.isHighContrast = !this.isHighContrast;
        responseText = `High contrast accessibility mode is now ${this.isHighContrast ? 'enabled' : 'disabled'}.`;
        this.emit('contrastToggled', this.isHighContrast);
        break;
      }
      case 'HELP': {
        responseText = `Available commands: "search properties in <city>", "find penthouses", "budget under <amount>", "<n> bedrooms", "book private tour", "calculate mortgage", and "toggle contrast".`;
        break;
      }
      case 'UNKNOWN':
      default: {
        success = false;
        responseText = `Command not recognized. Say "help" to hear available luxury voice commands.`;
        break;
      }
    }

    const record = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      transcript: payload.rawTranscript || '',
      action,
      payload,
      status: success ? 'executed' : 'unrecognized',
      response: responseText,
      success
    };

    this.commandHistory.push(record);
    this.emit('commandExecuted', record);

    this.synthesizeResponse(responseText);

    return record;
  }

  /**
   * Synthesizes audio feedback using Web Speech API SpeechSynthesis or mock in headless environment.
   * @param {string} msg - Response text to speak
   * @returns {string} - Spoken message
   */
  synthesizeResponse(msg) {
    this.setState('SYNTHESIZING');
    this.emit('synthesizing', msg);

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = this.lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => {
          this.emit('synthesized', msg);
          this.setState('IDLE');
        };
        utterance.onerror = () => {
          this.emit('synthesized', msg);
          this.setState('IDLE');
        };
        window.speechSynthesis.speak(utterance);
        return msg;
      } catch (e) {
        // Fallback if browser SpeechSynthesis fails
      }
    }

    // Headless / non-browser fallback
    this.emit('synthesized', msg);
    this.setState('IDLE');
    return msg;
  }

  /**
   * Dispatches speech result from recognition event or simulation.
   * @param {string} transcript - Recognized speech string
   * @param {number} [confidence=1.0] - Confidence level
   * @returns {Object} - Executed command record
   */
  handleSpeechResult(transcript, confidence = 1.0) {
    this.setState('PROCESSING');
    this.lastRecognized = { transcript, confidence, timestamp: Date.now() };
    this.emit('speechResult', this.lastRecognized);
    const parsed = this.parseVoiceGrammar(transcript);
    this.emit('commandParsed', parsed);
    const execution = this.executeCommand(parsed.action, parsed.payload);
    return execution;
  }

  /**
   * Headless simulation helper to test voice commands without microphone input.
   * @param {string} transcript - Voice command string to simulate
   * @returns {Object} - Execution record
   */
  simulateSpeech(transcript) {
    return this.handleSpeechResult(transcript, 1.0);
  }

  /**
   * Returns current command history.
   * @returns {Array<Object>}
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Clears recorded command history.
   * @returns {Array}
   */
  clearHistory() {
    this.commandHistory = [];
    this.emit('historyCleared');
    return [];
  }
}

// --- Browser DOM UI Controller ---

/**
 * Initializes DOM interactive UI if executed in browser environment.
 */
export function initVoiceCommanderUI() {
  if (typeof document === 'undefined') return null;

  const commander = new RealEstateLuxeVoiceCommander();

  const micBtn = document.getElementById('micToggleBtn');
  const micStatusText = document.getElementById('micStatusText');
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const waveVisualizer = document.getElementById('waveVisualizer');
  const responseBanner = document.getElementById('responseBanner');
  const responseText = document.getElementById('responseText');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const contrastToggleBtn = document.getElementById('contrastToggleBtn');
  const mockInput = document.getElementById('mockInput');
  const mockSubmitBtn = document.getElementById('mockSubmitBtn');
  const filterCity = document.getElementById('filterCity');
  const filterType = document.getElementById('filterType');
  const filterPrice = document.getElementById('filterPrice');
  const filterBeds = document.getElementById('filterBeds');
  const chips = document.querySelectorAll('.command-chip');

  function updateStatusUI(state) {
    if (statusBadge) {
      statusBadge.className = `status-badge status-${state.toLowerCase()}`;
    }
    if (statusText) {
      statusText.textContent = state;
    }
    if (micStatusText) {
      micStatusText.textContent = state === 'LISTENING' ? 'Listening... Speak your command' : 'Click microphone or press [Space] to speak';
    }
    if (waveVisualizer) {
      if (state === 'LISTENING') {
        waveVisualizer.classList.add('active');
      } else {
        waveVisualizer.classList.remove('active');
      }
    }
    if (micBtn) {
      if (state === 'LISTENING') {
        micBtn.classList.add('listening');
        micBtn.setAttribute('aria-pressed', 'true');
      } else {
        micBtn.classList.remove('listening');
        micBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  function updateFiltersUI() {
    if (filterCity) filterCity.textContent = commander.filters.city || 'Any City';
    if (filterType) filterType.textContent = commander.filters.propertyType ? commander.filters.propertyType.toUpperCase() : 'All Types';
    if (filterPrice) {
      const min = commander.filters.minPrice ? `$${Number(commander.filters.minPrice).toLocaleString('en-US')}` : null;
      const max = commander.filters.maxPrice ? `$${Number(commander.filters.maxPrice).toLocaleString('en-US')}` : null;
      if (min && max) filterPrice.textContent = `${min} - ${max}`;
      else if (min) filterPrice.textContent = `> ${min}`;
      else if (max) filterPrice.textContent = `< ${max}`;
      else filterPrice.textContent = 'Any Budget';
    }
    if (filterBeds) {
      filterBeds.textContent = commander.filters.bedrooms ? `${commander.filters.bedrooms}+ Beds` : 'Any Beds';
    }
  }

  function renderHistory() {
    if (!historyList) return;
    const history = commander.getCommandHistory();
    if (history.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <div class="empty-icon">🎙️</div>
          <p>No voice commands recorded yet. Speak into the microphone or click a prompt below.</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = history.slice().reverse().map(item => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString();
      const statusClass = item.success ? 'badge-success' : 'badge-warn';
      const statusLabel = item.success ? 'EXECUTED' : 'UNRECOGNIZED';
      return `
        <div class="history-item ${item.success ? '' : 'unrecognized'}">
          <div class="history-header">
            <span class="action-tag">${item.action}</span>
            <span class="status-pill ${statusClass}">${statusLabel}</span>
            <span class="history-time">${timeStr}</span>
          </div>
          <div class="history-transcript">"${escapeHtml(item.transcript)}"</div>
          <div class="history-response">${escapeHtml(item.response)}</div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  commander.on('stateChanged', ({ state }) => {
    updateStatusUI(state);
  });

  commander.on('contrastToggled', (isContrast) => {
    document.body.classList.toggle('high-contrast', isContrast);
    if (contrastToggleBtn) {
      contrastToggleBtn.textContent = isContrast ? 'Normal Contrast' : 'High Contrast';
      contrastToggleBtn.setAttribute('aria-pressed', String(isContrast));
    }
  });

  commander.on('commandExecuted', (record) => {
    if (responseText) responseText.textContent = record.response;
    if (responseBanner) responseBanner.classList.add('visible');
    updateFiltersUI();
    renderHistory();
  });

  commander.on('historyCleared', () => {
    renderHistory();
  });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      commander.toggleListening();
    });
  }

  if (contrastToggleBtn) {
    contrastToggleBtn.addEventListener('click', () => {
      commander.executeCommand('TOGGLE_HIGH_CONTRAST', { rawTranscript: 'toggle contrast' });
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      commander.clearHistory();
    });
  }

  function runSimulatedPrompt() {
    if (!mockInput) return;
    const val = mockInput.value.trim();
    if (val) {
      commander.simulateSpeech(val);
      mockInput.value = '';
    }
  }

  if (mockSubmitBtn) {
    mockSubmitBtn.addEventListener('click', runSimulatedPrompt);
  }

  if (mockInput) {
    mockInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        runSimulatedPrompt();
      }
    });
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-command') || chip.textContent.trim();
      if (mockInput) mockInput.value = text;
      commander.simulateSpeech(text);
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== mockInput && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      commander.toggleListening();
    }
  });

  updateStatusUI(commander.state);
  updateFiltersUI();
  renderHistory();

  return commander;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initVoiceCommanderUI();
  });
}
