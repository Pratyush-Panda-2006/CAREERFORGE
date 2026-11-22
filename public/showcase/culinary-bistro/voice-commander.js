/**
 * Culinary Bistro - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Provides hands-free restaurant ordering, kitchen dispatching, table status checks,
 * dietary filtering, and high-contrast accessibility controls.
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

export class CulinaryBistroVoiceCommander {
  constructor(options = {}) {
    this.options = {
      language: options.language || 'en-US',
      continuous: options.continuous ?? false,
      interimResults: options.interimResults ?? false,
      enableSpeechSynthesis: options.enableSpeechSynthesis ?? true,
      ...options
    };

    this.isListening = false;
    this.status = 'IDLE'; // 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SYNTHESIZING' | 'ERROR'
    this.highContrast = Boolean(options.highContrast);
    this.activeFilter = null; // null | 'vegan' | 'vegetarian' | 'gluten-free' | 'allergen' | etc.

    this.tables = options.initialTables || {
      1: { seats: 2, status: 'Occupied', guest: 'M. Dubois', orderCount: 2 },
      2: { seats: 4, status: 'Available', guest: null, orderCount: 0 },
      3: { seats: 4, status: 'Occupied', guest: 'L. Chen', orderCount: 1 },
      4: { seats: 6, status: 'Reserved', guest: 'Elena Rostova (19:30)', orderCount: 0 },
      5: { seats: 2, status: 'Available', guest: null, orderCount: 0 },
      6: { seats: 8, status: 'Occupied', guest: 'Tech Chef Summit', orderCount: 4 },
      7: { seats: 2, status: 'Available', guest: null, orderCount: 0 },
      8: { seats: 4, status: 'Reserved', guest: 'Sommelier Tasting (20:00)', orderCount: 0 }
    };

    this.kitchenQueue = [];
    this.history = [];
    this.listeners = new Map();
    this.recognition = null;
    this.synthesizer = null;

    this.initSpeechEngines();
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
    if (!this.listeners.has(event)) return;
    for (const handler of this.listeners.get(event)) {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in listener for event "${event}":`, err);
      }
    }
  }

  setStatus(newStatus) {
    this.status = newStatus;
    this.emit('statusChange', { status: this.status });
  }

  // --- Speech Engine Initialization ---
  initSpeechEngines() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
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
          this.processTranscript(transcript, confidence);
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
      }

      if ('speechSynthesis' in window) {
        this.synthesizer = window.speechSynthesis;
      }
    }
  }

  // --- Listening Control Methods ---
  startListening() {
    if (this.isListening) return;

    if (this.recognition) {
      try {
        this.recognition.start();
      } catch (err) {
        this.isListening = true;
        this.setStatus('LISTENING');
        this.emit('listeningStateChange', { isListening: true, status: this.status });
      }
    } else {
      // Headless / Simulator fallback
      this.isListening = true;
      this.setStatus('LISTENING');
      this.emit('listeningStateChange', { isListening: true, status: this.status });
    }
  }

  stopListening() {
    if (!this.isListening) return;

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignored
      }
    }
    this.isListening = false;
    this.setStatus('IDLE');
    this.emit('listeningStateChange', { isListening: false, status: this.status });
  }

  toggleListening() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
    return this.isListening;
  }

  // --- Voice Grammar Parsing ---
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        action: 'UNKNOWN',
        payload: { transcript: '' },
        confidence: 0,
        rawTranscript: ''
      };
    }

    const raw = transcript.trim();
    // Normalize string: lowercase, strip ending punctuation
    const clean = raw.toLowerCase().replace(/[.?!,;]+$/, '').trim();

    // Helper to parse quantity words or digits
    const parseQty = (token) => {
      if (!token) return 1;
      const lower = token.toLowerCase();
      if (WORD_TO_NUMBER[lower] !== undefined) return WORD_TO_NUMBER[lower];
      const parsed = parseInt(lower, 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    };

    // Helper to parse table number words or digits
    const parseTableNum = (token) => {
      if (!token) return null;
      const lower = token.toLowerCase();
      if (WORD_TO_NUMBER[lower] !== undefined) return WORD_TO_NUMBER[lower];
      const parsed = parseInt(lower, 10);
      return Number.isFinite(parsed) ? parsed : null;
    };

    // 1. HELP
    if (/^(help|list commands|what can i say|commands|show commands)$/i.test(clean)) {
      return { action: 'HELP', payload: {}, rawTranscript: raw };
    }

    // 2. TOGGLE_HIGH_CONTRAST
    if (/^(?:toggle\s+(?:high\s+)?contrast|high\s+contrast(?:\s+mode)?|accessibility\s+mode|toggle\s+accessibility)$/i.test(clean)) {
      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: { enabled: !this.highContrast },
        rawTranscript: raw
      };
    }

    // 3. DIETARY_FILTER
    // e.g. "show vegan options", "gluten free menu", "allergen filter", "display vegetarian options", "halal options"
    const dietaryMatch = clean.match(/(?:show|filter|display)?\s*(vegan|vegetarian|gluten\s*free|dairy\s*free|allergen|halal|kosher)\s*(?:options?|menu|filter|items?)?/i);
    if (dietaryMatch && !clean.startsWith('order') && !clean.startsWith('add')) {
      let filterType = dietaryMatch[1].toLowerCase().replace(/\s+/g, '-');
      if (filterType === 'gluten-free' || filterType === 'glutenfree') filterType = 'gluten-free';
      if (filterType === 'dairy-free' || filterType === 'dairyfree') filterType = 'dairy-free';
      return {
        action: 'DIETARY_FILTER',
        payload: { filter: filterType },
        rawTranscript: raw
      };
    }

    // 4. FIRE_KITCHEN_ORDER
    // e.g. "fire course 2", "kitchen rush order", "expedite order", "rush order", "fire course two"
    const fireCourseMatch = clean.match(/^fire\s+course\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
    if (fireCourseMatch) {
      const course = parseQty(fireCourseMatch[1]);
      return {
        action: 'FIRE_KITCHEN_ORDER',
        payload: { course, rush: true },
        rawTranscript: raw
      };
    }
    if (/^(kitchen\s+rush\s+order|expedite\s+(?:the\s+)?order|rush\s+order|fire\s+kitchen(?:\s+order)?)$/i.test(clean)) {
      return {
        action: 'FIRE_KITCHEN_ORDER',
        payload: { course: null, rush: true },
        rawTranscript: raw
      };
    }

    // 5. CALL_SERVER
    // e.g. "call waiter", "call server", "request bill", "need water", "ask for check"
    if (/(call\s+(?:waiter|server)|summon\s+waiter)/i.test(clean)) {
      return { action: 'CALL_SERVER', payload: { request: 'waiter' }, rawTranscript: raw };
    }
    if (/(request\s+(?:the\s+)?(?:bill|check)|ask\s+for\s+(?:bill|check)|get\s+the\s+bill)/i.test(clean)) {
      return { action: 'CALL_SERVER', payload: { request: 'bill' }, rawTranscript: raw };
    }
    if (/(need\s+(?:some\s+)?water|water\s+refill|more\s+water|bring\s+water)/i.test(clean)) {
      return { action: 'CALL_SERVER', payload: { request: 'water' }, rawTranscript: raw };
    }

    // 6. ORDER_ITEM
    // Patterns:
    // "order 2 truffle pasta"
    // "order truffle pasta"
    // "order 2 truffle pasta for table 4" / "to table 4"
    // "add garlic bread to table 3"
    // "add 2 tiramisu to table 4"
    const addOrderMatch = clean.match(/^add\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?(.+?)\s+(?:to|for)\s+table\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)$/i);
    if (addOrderMatch) {
      const quantity = parseQty(addOrderMatch[1] || '1');
      const item = addOrderMatch[2].trim();
      const table = parseTableNum(addOrderMatch[3]);
      return {
        action: 'ORDER_ITEM',
        payload: { quantity, item, table },
        rawTranscript: raw
      };
    }

    const orderMatch = clean.match(/^(?:please\s+)?order\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+)?(.+?)(?:\s+(?:for|to)\s+table\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten))?$/i);
    if (orderMatch) {
      const quantity = parseQty(orderMatch[1] || '1');
      const item = orderMatch[2].trim();
      const table = parseTableNum(orderMatch[3]);
      return {
        action: 'ORDER_ITEM',
        payload: { quantity, item, table: table || null },
        rawTranscript: raw
      };
    }

    // 7. CHECK_TABLE_STATUS
    // e.g. "table 4 status", "check table 4", "table four status", "show reservations", "show all tables"
    if (/^(?:show\s+reservations|check\s+reservations|show\s+all\s+tables|view\s+reservations)$/i.test(clean)) {
      return { action: 'CHECK_TABLE_STATUS', payload: { table: null, all: true }, rawTranscript: raw };
    }

    const tableMatch = clean.match(/^(?:check\s+table|table)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:\s+status)?$/i);
    if (tableMatch) {
      const tableNum = parseTableNum(tableMatch[1]);
      return {
        action: 'CHECK_TABLE_STATUS',
        payload: { table: tableNum, all: false },
        rawTranscript: raw
      };
    }

    // Fallback: Unknown grammar
    return {
      action: 'UNKNOWN',
      payload: { transcript: raw },
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
      case 'ORDER_ITEM': {
        const quantity = payload.quantity || 1;
        const item = payload.item || 'Special of the Day';
        const table = payload.table || 1;

        const orderTicket = {
          orderId: `ORD-${Date.now().toString().slice(-4)}`,
          item,
          quantity,
          table,
          time: new Date().toLocaleTimeString(),
          expedited: false
        };

        this.kitchenQueue.push(orderTicket);

        if (this.tables[table]) {
          this.tables[table].orderCount = (this.tables[table].orderCount || 0) + quantity;
          if (this.tables[table].status === 'Available') {
            this.tables[table].status = 'Occupied';
          }
        }

        responseText = `Ordered ${quantity} ${item}${payload.table ? ` for Table ${table}` : ''}. Sent to the kitchen line.`;
        details = { orderTicket };
        break;
      }

      case 'CHECK_TABLE_STATUS': {
        if (payload.all) {
          const total = Object.keys(this.tables).length;
          const occupied = Object.values(this.tables).filter(t => t.status === 'Occupied').length;
          const reserved = Object.values(this.tables).filter(t => t.status === 'Reserved').length;
          const available = Object.values(this.tables).filter(t => t.status === 'Available').length;
          responseText = `Culinary Bistro seating: ${available} available, ${occupied} occupied, and ${reserved} reserved of ${total} tables.`;
          details = { summary: { total, available, occupied, reserved } };
        } else {
          const tableNum = payload.table;
          const tableInfo = this.tables[tableNum];
          if (tableInfo) {
            responseText = `Table ${tableNum} is currently ${tableInfo.status}.${tableInfo.guest ? ` Guest: ${tableInfo.guest}.` : ''} Total active orders: ${tableInfo.orderCount}.`;
            details = { table: tableNum, info: tableInfo };
          } else {
            responseText = `Table ${tableNum} was not found in the floor plan. We have tables 1 through 8.`;
            status = 'ERROR';
          }
        }
        break;
      }

      case 'CALL_SERVER': {
        const req = payload.request || 'assistance';
        if (req === 'bill') {
          responseText = `A bill and payment terminal have been requested for your table. Your server will arrive promptly.`;
        } else if (req === 'water') {
          responseText = `Carafe of chilled mineral water is on the way to your table.`;
        } else {
          responseText = `Server has been alerted. An associate will be with your table shortly.`;
        }
        details = { request: req, dispatchedAt: new Date().toLocaleTimeString() };
        break;
      }

      case 'DIETARY_FILTER': {
        const filter = payload.filter || 'all';
        this.activeFilter = filter;
        responseText = `Menu filter set to ${filter.toUpperCase()}. Highlighting certified ${filter} dishes.`;
        details = { activeFilter: this.activeFilter };
        break;
      }

      case 'FIRE_KITCHEN_ORDER': {
        const course = payload.course;
        if (course) {
          responseText = `Course ${course} fired! Kitchen expedition alert sent to the head chef line.`;
        } else {
          responseText = `Kitchen rush order dispatched! Highest priority assigned to active tickets.`;
        }
        // Mark all kitchen tickets expedited
        this.kitchenQueue.forEach(ticket => { ticket.expedited = true; });
        details = { course, rush: true, ticketsExpedited: this.kitchenQueue.length };
        break;
      }

      case 'TOGGLE_HIGH_CONTRAST': {
        this.toggleHighContrast();
        responseText = `Accessibility high-contrast mode ${this.highContrast ? 'enabled' : 'disabled'}.`;
        details = { highContrast: this.highContrast };
        break;
      }

      case 'HELP': {
        responseText = `Culinary Bistro Voice Commands: Say "order 2 truffle pasta", "table 4 status", "call waiter", "request bill", "show vegan options", "fire course 2", or "toggle contrast".`;
        details = {
          supportedGrammars: [
            'ORDER_ITEM',
            'CHECK_TABLE_STATUS',
            'CALL_SERVER',
            'DIETARY_FILTER',
            'FIRE_KITCHEN_ORDER',
            'TOGGLE_HIGH_CONTRAST',
            'HELP'
          ]
        };
        break;
      }

      default: {
        status = 'UNKNOWN';
        responseText = `Command not recognized: "${rawTranscript || payload.transcript || ''}". Say "help" for a list of voice commands.`;
        details = { unparsed: rawTranscript || payload.transcript };
        break;
      }
    }

    const historyEntry = {
      id: `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      rawTranscript: rawTranscript || payload.transcript || '',
      action,
      payload,
      status,
      response: responseText,
      details,
      executionTimeMs: Date.now() - startTime
    };

    this.history.unshift(historyEntry);

    // Synthesize vocal confirmation
    if (this.options.enableSpeechSynthesis) {
      this.synthesizeResponse(responseText);
    } else {
      this.setStatus('IDLE');
    }

    this.emit('commandExecuted', historyEntry);
    return historyEntry;
  }

  // --- Voice Synthesis Dispatcher ---
  synthesizeResponse(message) {
    if (!message) return;

    this.setStatus('SYNTHESIZING');

    if (this.synthesizer && typeof window !== 'undefined') {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.lang = this.options.language;

        utterance.onend = () => {
          this.setStatus('IDLE');
          this.emit('speechSynthesized', { text: message, spoken: true });
        };

        utterance.onerror = (e) => {
          this.setStatus('IDLE');
          this.emit('speechSynthesized', { text: message, spoken: false, error: e.error });
        };

        this.synthesizer.speak(utterance);
        return;
      } catch (err) {
        // Fallback for headless or error
      }
    }

    // Headless / Mock synthesis
    this.emit('speechSynthesized', { text: message, spoken: false, simulated: true });
    this.setStatus('IDLE');
  }

  // --- Full Pipeline: Transcript -> Parse -> Execute ---
  processTranscript(transcript, confidence = 1.0) {
    this.setStatus('PROCESSING');
    const parsed = this.parseVoiceGrammar(transcript);
    parsed.confidence = confidence;

    this.emit('commandRecognized', {
      rawTranscript: transcript,
      confidence,
      parsed
    });

    return this.executeCommand(parsed.action, parsed.payload, transcript);
  }

  // --- Accessibility Toggle ---
  toggleHighContrast(forcedValue) {
    this.highContrast = typeof forcedValue === 'boolean' ? forcedValue : !this.highContrast;

    if (typeof document !== 'undefined') {
      if (this.highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }

    this.emit('highContrastToggle', { enabled: this.highContrast });
    return this.highContrast;
  }

  // --- History & Audit ---
  getCommandHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
    this.emit('historyCleared', { timestamp: Date.now() });
    return true;
  }
}

// --- Browser DOM Controller ---
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new CulinaryBistroVoiceCommander();

    // DOM References
    const micBtn = document.getElementById('micBtn');
    const micStatus = document.getElementById('micStatus');
    const statusBadge = document.getElementById('statusBadge');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const transcriptBox = document.getElementById('transcriptBox');
    const mockInput = document.getElementById('mockInput');
    const mockSendBtn = document.getElementById('mockSendBtn');
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const contrastToggleBtn = document.getElementById('contrastToggleBtn');
    const activeFilterBadge = document.getElementById('activeFilterBadge');
    const kitchenQueueBadge = document.getElementById('kitchenQueueBadge');
    const highContrastBadge = document.getElementById('highContrastBadge');

    // UI Render Helpers
    function updateStatusUI(status) {
      if (!statusBadge) return;
      statusBadge.textContent = status;
      statusBadge.className = `status-pill status-${status.toLowerCase()}`;

      if (micStatus) {
        micStatus.textContent = status === 'LISTENING' ? 'Listening... Speak now' :
                                status === 'PROCESSING' ? 'Processing grammar...' :
                                status === 'SYNTHESIZING' ? 'Speaking response...' :
                                'Click microphone to speak';
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
        } else {
          micBtn.classList.remove('mic-active');
        }
      }
    }

    function renderHistoryEntry(entry) {
      if (!historyList) return;
      const li = document.createElement('div');
      li.className = `history-card history-${entry.status.toLowerCase()}`;

      const timeStr = new Date(entry.timestamp).toLocaleTimeString();
      li.innerHTML = `
        <div class="history-top">
          <span class="history-action-badge action-${entry.action.toLowerCase()}">${entry.action}</span>
          <span class="history-status status-tag-${entry.status.toLowerCase()}">${entry.status}</span>
          <span class="history-time">${timeStr}</span>
        </div>
        <div class="history-heard"><strong>Voice:</strong> "${entry.rawTranscript || '(none)'}"</div>
        <div class="history-resp"><strong>Dispatcher:</strong> ${entry.response}</div>
      `;

      historyList.prepend(li);
    }

    function updateStateBadges() {
      if (activeFilterBadge) {
        activeFilterBadge.textContent = commander.activeFilter ? commander.activeFilter.toUpperCase() : 'NONE';
      }
      if (kitchenQueueBadge) {
        kitchenQueueBadge.textContent = `${commander.kitchenQueue.length} Orders`;
      }
      if (highContrastBadge) {
        highContrastBadge.textContent = commander.highContrast ? 'ON' : 'OFF';
      }
    }

    // Attach Commander Event Listeners
    commander.on('statusChange', ({ status }) => {
      updateStatusUI(status);
    });

    commander.on('listeningStateChange', ({ isListening, status }) => {
      updateStatusUI(status);
    });

    commander.on('commandRecognized', ({ rawTranscript, parsed }) => {
      if (transcriptBox) {
        transcriptBox.textContent = `Recognized: "${rawTranscript}" → [${parsed.action}]`;
      }
    });

    commander.on('commandExecuted', (entry) => {
      renderHistoryEntry(entry);
      updateStateBadges();
      if (transcriptBox) {
        transcriptBox.textContent = `Dispatcher: ${entry.response}`;
      }
    });

    commander.on('highContrastToggle', ({ enabled }) => {
      updateStateBadges();
      if (contrastToggleBtn) {
        contrastToggleBtn.setAttribute('aria-pressed', String(enabled));
      }
    });

    commander.on('historyCleared', () => {
      if (historyList) {
        historyList.innerHTML = '<div class="empty-history-msg">No voice commands recorded yet.</div>';
      }
    });

    // Button & DOM Event Handlers
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
          commander.processTranscript(val, 1.0);
          mockInput.value = '';
        }
      };

      mockSendBtn.addEventListener('click', handleMockSend);
      mockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleMockSend();
      });
    }

    // Quick Command Chip Clicks
    document.querySelectorAll('.quick-command-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd') || chip.textContent.trim();
        if (cmd) {
          commander.processTranscript(cmd, 1.0);
        }
      });
    });

    // Initial state
    updateStatusUI('IDLE');
    updateStateBadges();
  });
}

export default CulinaryBistroVoiceCommander;
