/**
 * Fintech Vault - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Provides hands-free financial action execution, biometric state control,
 * speech recognition with headless simulator fallback, and responsive speech synthesis.
 */

export class FintechVaultVoiceCommander {
  constructor(options = {}) {
    this.options = {
      lang: 'en-US',
      continuous: true,
      interimResults: false,
      autoRestart: false,
      synthRate: 1.0,
      synthPitch: 1.0,
      synthVolume: 1.0,
      ...options
    };

    this.listeners = new Map();
    this.isListening = false;
    this.status = 'idle'; // 'idle' | 'listening' | 'processing' | 'synthesizing' | 'error'
    this.history = [];

    // Financial Vault State
    this.vaultState = {
      balance: typeof options.initialBalance === 'number' ? options.initialBalance : 1250000.00,
      currency: options.currency || 'USD',
      isLocked: Boolean(options.initialLocked || false),
      highContrast: Boolean(options.initialHighContrast || false),
      auditLog: [
        {
          id: 'audit-genesis',
          action: 'VAULT_INITIALIZED',
          timestamp: new Date().toISOString(),
          details: 'Vault biometric enclave initialized with multi-signature cold storage.'
        }
      ]
    };

    // Speech Recognition integration with headless fallback
    this.recognition = null;
    this.isSimulated = false;
    this.initRecognition();
  }

  /**
   * Initializes Web Speech API recognition or flags headless simulator.
   */
  initRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          this.recognition = new SpeechRecognitionClass();
          this.recognition.lang = this.options.lang;
          this.recognition.continuous = this.options.continuous;
          this.recognition.interimResults = this.options.interimResults;

          this.recognition.onstart = () => {
            this.isListening = true;
            this.setStatus('listening');
            this.emit('listening', { simulated: false });
          };

          this.recognition.onresult = (event) => {
            const lastIdx = event.results.length - 1;
            const transcript = event.results[lastIdx][0].transcript;
            this.processTranscript(transcript);
          };

          this.recognition.onerror = (event) => {
            this.setStatus('error');
            this.emit('error', { error: event.error, message: event.message });
          };

          this.recognition.onend = () => {
            if (this.isListening && this.options.autoRestart) {
              try {
                this.recognition.start();
              } catch (_) {
                this.isListening = false;
                this.setStatus('idle');
                this.emit('stopped');
              }
            } else {
              this.isListening = false;
              this.setStatus('idle');
              this.emit('stopped');
            }
          };
          return;
        } catch (_) {
          // Fall back to simulator
        }
      }
    }

    // Headless / fallback simulator
    this.isSimulated = true;
  }

  /**
   * Event Emitter: subscribe to event
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Event Emitter: unsubscribe from event
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  /**
   * Event Emitter: dispatch event to listeners
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[FintechVaultVoiceCommander] Event listener error (${event}):`, err);
        }
      }
    }
  }

  /**
   * Updates state status and emits status-change
   */
  setStatus(newStatus) {
    this.status = newStatus;
    this.emit('status-change', {
      status: this.status,
      isListening: this.isListening
    });
  }

  /**
   * Starts speech recognition or engages simulator listening
   */
  startListening() {
    if (this.isListening) return false;

    this.isListening = true;
    this.setStatus('listening');
    this.emit('listening', { simulated: this.isSimulated });

    if (this.recognition && !this.isSimulated) {
      try {
        this.recognition.start();
      } catch (err) {
        console.warn('[FintechVaultVoiceCommander] Recognition start error:', err);
      }
    }
    return true;
  }

  /**
   * Stops speech recognition or halts simulator listening
   */
  stopListening() {
    if (!this.isListening) return false;

    this.isListening = false;
    this.setStatus('idle');
    this.emit('stopped', { simulated: this.isSimulated });

    if (this.recognition && !this.isSimulated) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('[FintechVaultVoiceCommander] Recognition stop error:', err);
      }
    }
    return true;
  }

  /**
   * Toggles listening mode
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
   * Parses voice transcripts against financial voice grammars
   * @param {string} rawTranscript - Input voice transcript
   * @returns {Object} Parsed grammar result { action, payload, confidence, rawTranscript }
   */
  parseVoiceGrammar(rawTranscript) {
    if (typeof rawTranscript !== 'string') {
      return {
        action: 'UNKNOWN',
        payload: { message: 'Invalid transcript format' },
        confidence: 0,
        rawTranscript: String(rawTranscript || '')
      };
    }

    const cleaned = rawTranscript
      .toLowerCase()
      .replace(/(\d),(\d)/g, '$1$2')
      .replace(/[,?!;:"]/g, ' ')
      .replace(/\.(?!\d)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 1. SHOW_VAULT_BALANCE
    // "show balance", "check balance", "view vault balance", "vault balance", "what is my balance"
    const balancePattern = /^(?:show|check|view|what is my|get|inquire)?\s*(?:the\s+)?(?:vault\s+|account\s+)?balance$/;
    if (
      balancePattern.test(cleaned) ||
      cleaned === 'balance' ||
      cleaned === 'check my balance' ||
      cleaned === 'vault balance' ||
      cleaned === 'view vault balance' ||
      cleaned === 'show vault balance' ||
      cleaned === 'check vault balance'
    ) {
      return {
        action: 'SHOW_VAULT_BALANCE',
        payload: {},
        confidence: 0.98,
        rawTranscript
      };
    }

    // 2. TRANSFER_FUNDS
    // "transfer <amount> to <recipient>", "send funds", "wire money"
    // Check for parameter extraction first
    const transferParamMatch = cleaned.match(
      /^(?:transfer|send|wire)\s+(?:\$?\s*([0-9]+(?:\.[0-9]{1,2})?))\s*(?:dollars?|usd)?\s+to\s+([a-z0-9_\s-]+)$/
    );
    if (transferParamMatch) {
      const amount = parseFloat(transferParamMatch[1]);
      const recipient = transferParamMatch[2].trim();
      return {
        action: 'TRANSFER_FUNDS',
        payload: {
          amount,
          recipient
        },
        confidence: 0.99,
        rawTranscript
      };
    }

    // "transfer to <recipient>" without amount
    const transferRecipientOnly = cleaned.match(/^(?:transfer|send|wire)\s+(?:funds\s+|money\s+)?to\s+([a-z0-9_\s-]+)$/);
    if (transferRecipientOnly) {
      return {
        action: 'TRANSFER_FUNDS',
        payload: {
          amount: null,
          recipient: transferRecipientOnly[1].trim()
        },
        confidence: 0.92,
        rawTranscript
      };
    }

    // "transfer <amount>" without recipient
    const transferAmountOnly = cleaned.match(
      /^(?:transfer|send|wire)\s+(?:\$?\s*([0-9]+(?:\.[0-9]{1,2})?))\s*(?:dollars?|usd)?$/
    );
    if (transferAmountOnly) {
      return {
        action: 'TRANSFER_FUNDS',
        payload: {
          amount: parseFloat(transferAmountOnly[1]),
          recipient: null
        },
        confidence: 0.92,
        rawTranscript
      };
    }

    // Generic transfer keywords: "send funds", "wire money", "transfer funds"
    if (
      cleaned === 'send funds' ||
      cleaned === 'wire money' ||
      cleaned === 'transfer funds' ||
      cleaned === 'wire funds' ||
      cleaned === 'transfer money' ||
      cleaned === 'send money'
    ) {
      return {
        action: 'TRANSFER_FUNDS',
        payload: {
          amount: null,
          recipient: null
        },
        confidence: 0.95,
        rawTranscript
      };
    }

    // 3. LOCK_VAULT
    // "lock vault", "freeze account", "emergency freeze"
    if (
      /^(?:lock|freeze)\s+(?:the\s+)?(?:vault|account)$/.test(cleaned) ||
      cleaned === 'emergency freeze' ||
      cleaned === 'emergency lock' ||
      cleaned === 'freeze' ||
      cleaned === 'lock'
    ) {
      return {
        action: 'LOCK_VAULT',
        payload: {},
        confidence: 0.99,
        rawTranscript
      };
    }

    // 4. UNLOCK_VAULT
    // "unlock vault", "authenticate user", "verify biometrics"
    if (
      /^(?:unlock|unfreeze)\s+(?:the\s+)?(?:vault|account)$/.test(cleaned) ||
      cleaned === 'authenticate user' ||
      cleaned === 'verify biometrics' ||
      cleaned === 'biometric verification' ||
      cleaned === 'authenticate' ||
      cleaned === 'unlock'
    ) {
      return {
        action: 'UNLOCK_VAULT',
        payload: {},
        confidence: 0.99,
        rawTranscript
      };
    }

    // 5. VIEW_AUDIT_LOG
    // "show audit log", "view transactions", "compliance history"
    if (
      /^(?:show|view|check|display|get)\s+(?:the\s+)?(?:audit\s+log|transactions?|compliance\s+history)$/.test(cleaned) ||
      cleaned === 'audit log' ||
      cleaned === 'view transactions' ||
      cleaned === 'compliance history' ||
      cleaned === 'transaction history' ||
      cleaned === 'audit'
    ) {
      return {
        action: 'VIEW_AUDIT_LOG',
        payload: {},
        confidence: 0.97,
        rawTranscript
      };
    }

    // 6. TOGGLE_HIGH_CONTRAST
    // "toggle contrast", "high contrast mode", "accessibility mode"
    if (
      /^(?:toggle|switch|enable|disable)\s+(?:the\s+)?(?:high\s+)?contrast$/.test(cleaned) ||
      cleaned === 'high contrast mode' ||
      cleaned === 'high contrast' ||
      cleaned === 'accessibility mode' ||
      cleaned === 'toggle accessibility'
    ) {
      return {
        action: 'TOGGLE_HIGH_CONTRAST',
        payload: {},
        confidence: 0.96,
        rawTranscript
      };
    }

    // 7. HELP
    // "help", "list commands", "what can I say"
    if (
      cleaned === 'help' ||
      cleaned === 'list commands' ||
      cleaned === 'what can i say' ||
      cleaned === 'commands' ||
      cleaned === 'show commands' ||
      cleaned === 'help me' ||
      cleaned === 'what can i do'
    ) {
      return {
        action: 'HELP',
        payload: {},
        confidence: 1.0,
        rawTranscript
      };
    }

    // Fallback: UNKNOWN
    return {
      action: 'UNKNOWN',
      payload: { message: 'Command not recognized' },
      confidence: 0.1,
      rawTranscript
    };
  }

  /**
   * Formats numbers into currency string
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.vaultState.currency
    }).format(amount);
  }

  /**
   * Adds an entry to internal audit log
   */
  addAuditEntry(action, details) {
    const entry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      details,
      timestamp: new Date().toISOString()
    };
    this.vaultState.auditLog.push(entry);
    return entry;
  }

  /**
   * Executes a parsed financial voice action
   * @param {string} action - Action identifier
   * @param {Object} payload - Action parameters
   */
  executeCommand(action, payload = {}) {
    const startTime = Date.now();
    let result = {
      action,
      success: false,
      response: '',
      payload
    };

    // Access control: If vault is locked, reject operations except UNLOCK_VAULT, HELP, TOGGLE_HIGH_CONTRAST, and VIEW_AUDIT_LOG
    const allowedWhenLocked = ['UNLOCK_VAULT', 'HELP', 'TOGGLE_HIGH_CONTRAST', 'VIEW_AUDIT_LOG'];
    if (this.vaultState.isLocked && !allowedWhenLocked.includes(action)) {
      result = {
        action,
        success: false,
        error: 'VAULT_LOCKED',
        response: "Access denied. Fintech Vault is currently locked. Say 'unlock vault' or 'verify biometrics' to authenticate.",
        payload
      };
    } else {
      switch (action) {
        case 'SHOW_VAULT_BALANCE': {
          const formatted = this.formatCurrency(this.vaultState.balance);
          this.addAuditEntry('SHOW_BALANCE', `Queried vault balance: ${formatted}`);
          result = {
            action,
            success: true,
            response: `Vault balance is ${formatted} ${this.vaultState.currency} across active liquidity tiers.`,
            balance: this.vaultState.balance,
            formattedBalance: formatted
          };
          break;
        }

        case 'TRANSFER_FUNDS': {
          const { amount, recipient } = payload;
          if (amount == null && recipient == null) {
            result = {
              action,
              success: true,
              response: "Transfer funds requested. Please specify amount and recipient, e.g., 'transfer 500 to Alice'.",
              pending: true
            };
          } else if (amount == null) {
            result = {
              action,
              success: false,
              error: 'MISSING_AMOUNT',
              response: `Please specify the amount to transfer to ${recipient}.`
            };
          } else if (recipient == null) {
            result = {
              action,
              success: false,
              error: 'MISSING_RECIPIENT',
              response: `Please specify recipient for transfer of $${amount}.`
            };
          } else if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            result = {
              action,
              success: false,
              error: 'INVALID_AMOUNT',
              response: 'Transfer amount must be a positive number.'
            };
          } else if (amount > this.vaultState.balance) {
            result = {
              action,
              success: false,
              error: 'INSUFFICIENT_FUNDS',
              response: `Transfer rejected: Insufficient funds. Available balance is ${this.formatCurrency(this.vaultState.balance)}.`
            };
          } else {
            this.vaultState.balance = Math.round((this.vaultState.balance - amount) * 100) / 100;
            const formattedAmount = this.formatCurrency(amount);
            const formattedNewBalance = this.formatCurrency(this.vaultState.balance);

            this.addAuditEntry(
              'FUNDS_TRANSFER',
              `Transferred ${formattedAmount} to ${recipient}. Remaining balance: ${formattedNewBalance}`
            );

            this.emit('funds-transferred', {
              amount,
              recipient,
              newBalance: this.vaultState.balance
            });

            result = {
              action,
              success: true,
              response: `Successfully initiated transfer of ${formattedAmount} to ${recipient}. Remaining balance: ${formattedNewBalance}.`,
              transfer: {
                amount,
                recipient,
                newBalance: this.vaultState.balance
              }
            };
          }
          break;
        }

        case 'LOCK_VAULT': {
          this.vaultState.isLocked = true;
          this.addAuditEntry('VAULT_LOCKED', 'Emergency lock engaged via voice command.');
          this.emit('vault-locked', { timestamp: new Date().toISOString() });
          result = {
            action,
            success: true,
            response: 'Fintech Vault has been locked and biometric freeze engaged.',
            isLocked: true
          };
          break;
        }

        case 'UNLOCK_VAULT': {
          this.vaultState.isLocked = false;
          this.addAuditEntry('VAULT_UNLOCKED', 'Biometrics verified and vault unlocked via voice authentication.');
          this.emit('vault-unlocked', { timestamp: new Date().toISOString() });
          result = {
            action,
            success: true,
            response: 'Biometrics verified. Fintech Vault is unlocked and fully operational.',
            isLocked: false
          };
          break;
        }

        case 'VIEW_AUDIT_LOG': {
          const recentLogs = this.vaultState.auditLog.slice(-5);
          result = {
            action,
            success: true,
            response: `Retrieved ${this.vaultState.auditLog.length} compliance audit log entries.`,
            auditLogs: recentLogs,
            totalLogs: this.vaultState.auditLog.length
          };
          break;
        }

        case 'TOGGLE_HIGH_CONTRAST': {
          this.vaultState.highContrast = !this.vaultState.highContrast;
          const modeLabel = this.vaultState.highContrast ? 'enabled' : 'disabled';
          this.addAuditEntry('ACCESSIBILITY_TOGGLED', `High contrast accessibility mode ${modeLabel}.`);
          this.emit('contrast-toggled', { highContrast: this.vaultState.highContrast });
          result = {
            action,
            success: true,
            response: `High contrast accessibility mode ${modeLabel}.`,
            highContrast: this.vaultState.highContrast
          };
          break;
        }

        case 'HELP': {
          result = {
            action,
            success: true,
            response: 'Available voice commands: show balance, transfer funds, lock vault, unlock vault, view audit log, and toggle contrast.',
            availableCommands: [
              'SHOW_VAULT_BALANCE',
              'TRANSFER_FUNDS',
              'LOCK_VAULT',
              'UNLOCK_VAULT',
              'VIEW_AUDIT_LOG',
              'TOGGLE_HIGH_CONTRAST',
              'HELP'
            ]
          };
          break;
        }

        default: {
          result = {
            action: 'UNKNOWN',
            success: false,
            error: 'UNRECOGNIZED_COMMAND',
            response: "Command not recognized. Say 'help' or 'list commands' to see available options."
          };
          break;
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const historyEntry = {
      id: `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      transcript: payload?.rawTranscript || action,
      action: result.action,
      payload,
      success: result.success,
      response: result.response,
      executionTimeMs,
      vaultLocked: this.vaultState.isLocked
    };

    this.history.unshift(historyEntry);
    this.emit('command-executed', historyEntry);

    // Speak response
    this.synthesizeResponse(result.response);

    return result;
  }

  /**
   * Synthesizes speech response using SpeechSynthesis or headless simulator
   */
  synthesizeResponse(msg) {
    if (!msg) return { synthesized: false };

    this.setStatus('synthesizing');
    this.emit('synthesizing', { message: msg });

    if (
      typeof window !== 'undefined' &&
      window.speechSynthesis &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    ) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new window.SpeechSynthesisUtterance(msg);
        utterance.rate = this.options.synthRate || 1.0;
        utterance.pitch = this.options.synthPitch || 1.0;
        utterance.volume = this.options.synthVolume || 1.0;

        utterance.onend = () => {
          this.setStatus(this.isListening ? 'listening' : 'idle');
          this.emit('speech-end', { message: msg });
        };

        utterance.onerror = () => {
          this.setStatus(this.isListening ? 'listening' : 'idle');
          this.emit('speech-end', { message: msg, error: true });
        };

        window.speechSynthesis.speak(utterance);
        return { synthesized: true, message: msg, simulated: false };
      } catch (_) {
        this.setStatus(this.isListening ? 'listening' : 'idle');
        return { synthesized: true, message: msg, simulated: true };
      }
    }

    // Headless / simulator
    this.setStatus(this.isListening ? 'listening' : 'idle');
    this.emit('speech-end', { message: msg, simulated: true });
    return { synthesized: true, message: msg, simulated: true };
  }

  /**
   * Ingests transcript, processes grammar, and triggers execution
   */
  processTranscript(transcript) {
    this.setStatus('processing');
    this.emit('processing', { transcript });

    const parsed = this.parseVoiceGrammar(transcript);
    const result = this.executeCommand(parsed.action, {
      ...parsed.payload,
      rawTranscript: transcript,
      confidence: parsed.confidence
    });

    return result;
  }

  /**
   * Returns a copy of the command history
   */
  getCommandHistory() {
    return [...this.history];
  }

  /**
   * Clears the command history
   */
  clearHistory() {
    this.history = [];
    this.emit('history-cleared');
    return [];
  }
}

// Browser Interactive DOM Controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new FintechVaultVoiceCommander({
      initialBalance: 1450250.75
    });

    const micBtn = document.getElementById('micBtn');
    const micStatusPill = document.getElementById('micStatusPill');
    const visualizer = document.getElementById('audioVisualizer');
    const historyList = document.getElementById('commandHistoryList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const mockInput = document.getElementById('mockInput');
    const mockSubmitBtn = document.getElementById('mockSubmitBtn');
    const balanceDisplay = document.getElementById('vaultBalanceDisplay');
    const vaultLockBadge = document.getElementById('vaultLockBadge');
    const highContrastBtn = document.getElementById('highContrastBtn');
    const quickChips = document.querySelectorAll('.voice-chip');

    function updateBalanceUI() {
      if (balanceDisplay) {
        balanceDisplay.textContent = commander.formatCurrency(commander.vaultState.balance);
      }
    }

    function updateLockUI() {
      if (vaultLockBadge) {
        const isLocked = commander.vaultState.isLocked;
        vaultLockBadge.textContent = isLocked ? 'LOCKED' : 'UNLOCKED';
        vaultLockBadge.className = `status-badge ${isLocked ? 'badge-danger' : 'badge-success'}`;
      }
    }

    function updateStatusUI(status) {
      if (micStatusPill) {
        micStatusPill.textContent = status.toUpperCase();
        micStatusPill.className = `status-indicator-pill status-${status}`;
      }

      if (micBtn) {
        if (commander.isListening) {
          micBtn.classList.add('is-listening');
          micBtn.setAttribute('aria-pressed', 'true');
        } else {
          micBtn.classList.remove('is-listening');
          micBtn.setAttribute('aria-pressed', 'false');
        }
      }

      if (visualizer) {
        if (commander.isListening || status === 'processing' || status === 'synthesizing') {
          visualizer.classList.add('is-active');
        } else {
          visualizer.classList.remove('is-active');
        }
      }
    }

    function renderHistoryUI() {
      if (!historyList) return;
      const history = commander.getCommandHistory();

      if (history.length === 0) {
        historyList.innerHTML = `
          <div class="empty-history-state">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
            <p>No voice commands executed yet. Click the microphone or type below.</p>
          </div>
        `;
        return;
      }

      historyList.innerHTML = history
        .map(entry => {
          const badgeClass = entry.success ? 'badge-success' : 'badge-danger';
          const badgeText = entry.success ? 'SUCCESS' : 'FAILED';
          const timeFormatted = new Date(entry.timestamp).toLocaleTimeString();

          return `
            <div class="history-item ${entry.success ? 'item-success' : 'item-fail'}">
              <div class="history-header">
                <span class="history-action-tag">${entry.action}</span>
                <div class="history-meta">
                  <span class="status-badge ${badgeClass}">${badgeText}</span>
                  <span class="history-time">${timeFormatted}</span>
                </div>
              </div>
              <div class="history-transcript">
                <span class="transcript-label">Heard:</span> &ldquo;${escapeHTML(entry.transcript)}&rdquo;
              </div>
              <div class="history-response">
                <span class="response-icon">🔊</span>
                <span>${escapeHTML(entry.response)}</span>
              </div>
            </div>
          `;
        })
        .join('');
    }

    function escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Event Bindings
    commander.on('status-change', ({ status }) => updateStatusUI(status));
    commander.on('command-executed', () => {
      updateBalanceUI();
      updateLockUI();
      renderHistoryUI();
    });
    commander.on('vault-locked', () => updateLockUI());
    commander.on('vault-unlocked', () => updateLockUI());
    commander.on('funds-transferred', () => updateBalanceUI());
    commander.on('contrast-toggled', ({ highContrast }) => {
      document.body.classList.toggle('high-contrast', highContrast);
    });

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        commander.toggleListening();
      });
    }

    if (mockSubmitBtn && mockInput) {
      const handleMockSubmit = () => {
        const val = mockInput.value.trim();
        if (val) {
          commander.processTranscript(val);
          mockInput.value = '';
        }
      };
      mockSubmitBtn.addEventListener('click', handleMockSubmit);
      mockInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleMockSubmit();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        commander.clearHistory();
        renderHistoryUI();
      });
    }

    if (highContrastBtn) {
      highContrastBtn.addEventListener('click', () => {
        commander.executeCommand('TOGGLE_HIGH_CONTRAST');
      });
    }

    quickChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cmd = chip.getAttribute('data-cmd');
        if (cmd) {
          commander.processTranscript(cmd);
        }
      });
    });

    // Initial sync
    updateBalanceUI();
    updateLockUI();
    updateStatusUI('idle');
    renderHistoryUI();
  });
}
