/**
 * Nonprofit Impact - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2082 - NSoC '26 Level 3 Feature
 */

export class NonprofitImpactVoiceCommander {
  constructor(options = {}) {
    this.status = 'idle'; // 'idle', 'listening', 'processing', 'speaking', 'error'
    this.history = [];
    this.currentTranscript = '';
    this.onStateChange = options.onStateChange || null;
    this.onCommandMatched = options.onCommandMatched || null;
    this.voiceLang = options.lang || 'en-US';
    this.speechSynthesis = options.speechSynthesis || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.SpeechRecognition = options.SpeechRecognition || (typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null);
    this.recognitionInstance = null;

    // Define recognized action grammars
    this.grammars = [
      {
        id: 'NAVIGATE_OVERVIEW',
        regex: /(?:go\s+to|open|show|navigate\s+to)\s+(?:the\s+)?(?:overview|dashboard|home)/i,
        action: 'NAVIGATE',
        target: 'overview',
        description: 'Navigate to impact overview dashboard',
        feedback: 'Navigating to Impact Overview.'
      },
      {
        id: 'VIEW_METRICS',
        regex: /(?:view|show|display|check)\s+(?:the\s+)?(?:metrics|stats|statistics|analytics|impact\s+numbers)/i,
        action: 'VIEW',
        target: 'metrics',
        description: 'Display real-time impact metrics and stats',
        feedback: 'Displaying impact metrics and analytics.'
      },
      {
        id: 'TOGGLE_HIGH_CONTRAST',
        regex: /(?:toggle|enable|disable|turn\s+on|turn\s+off)\s+(?:high\s+)?contrast(?: mode)?/i,
        action: 'TOGGLE_A11Y',
        target: 'high-contrast',
        description: 'Toggle high contrast accessibility theme',
        feedback: 'Toggling high contrast mode.'
      },
      {
        id: 'FILTER_CAMPAIGN',
        regex: /(?:filter|search|find)\s+(?:by\s+)?campaign\s+([a-zA-Z0-9\s_-]+)/i,
        action: 'FILTER',
        target: 'campaign',
        paramIndex: 1,
        description: 'Filter initiative records by campaign name',
        feedback: (param) => `Filtering campaign records for ${param}.`
      },
      {
        id: 'EXPORT_REPORT',
        regex: /(?:export|download|generate)\s+(?:the\s+)?(?:impact\s+)?report(?:\s+as\s+(pdf|csv|json))?/i,
        action: 'EXPORT',
        target: 'report',
        paramIndex: 1,
        defaultParam: 'pdf',
        description: 'Export telemetry and donation summary report',
        feedback: (param) => `Exporting impact report in ${param.toUpperCase()} format.`
      },
      {
        id: 'TRIGGER_AUDIT',
        regex: /(?:run|start|execute|trigger)\s+(?:accessibility|a11y|contrast)\s+audit/i,
        action: 'AUDIT',
        target: 'accessibility',
        description: 'Execute accessibility compliance scan',
        feedback: 'Starting accessibility compliance audit.'
      },
      {
        id: 'CLEAR_COMMANDS',
        regex: /(?:clear|reset|wipe)\s+(?:the\s+)?(?:command\s+)?(?:history|console|feed)/i,
        action: 'CLEAR_HISTORY',
        target: 'console',
        description: 'Clear speech recognition command feed',
        feedback: 'Command history cleared.'
      },
      {
        id: 'HELP_COMMANDS',
        regex: /(?:help|list\s+commands|what\s+can\s+i\s+say)/i,
        action: 'HELP',
        target: 'help',
        description: 'List available voice commander actions',
        feedback: 'Here are the available voice commands.'
      }
    ];
  }

  // Parse spoken transcript against recognized action patterns
  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        matched: false,
        raw: transcript || '',
        reason: 'Empty or invalid speech input',
        feedback: 'No voice command detected. Please speak clearly.'
      };
    }

    const cleanInput = transcript.trim();

    for (const grammar of this.grammars) {
      const match = cleanInput.match(grammar.regex);
      if (match) {
        const param = grammar.paramIndex && match[grammar.paramIndex]
          ? match[grammar.paramIndex].trim()
          : (grammar.defaultParam || null);

        const feedbackMsg = typeof grammar.feedback === 'function'
          ? grammar.feedback(param)
          : grammar.feedback;

        const result = {
          matched: true,
          commandId: grammar.id,
          action: grammar.action,
          target: grammar.target,
          param: param,
          raw: cleanInput,
          description: grammar.description,
          feedback: feedbackMsg,
          timestamp: new Date().toISOString()
        };

        return result;
      }
    }

    return {
      matched: false,
      commandId: 'FALLBACK_UNRECOGNIZED',
      raw: cleanInput,
      reason: 'No grammar matched speech pattern',
      feedback: `Command "${cleanInput}" not recognized. Say "help" for a list of commands.`,
      timestamp: new Date().toISOString()
    };
  }

  // Dispatch audio synthesis response
  synthesizeResponse(msg, onEndCallback = null) {
    if (!msg || typeof msg !== 'string') return false;

    if (!this.speechSynthesis) {
      this.updateStatus('error');
      return false;
    }

    try {
      this.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = this.voiceLang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.updateStatus('speaking');
      };

      utterance.onend = () => {
        this.updateStatus('idle');
        if (typeof onEndCallback === 'function') {
          onEndCallback();
        }
      };

      utterance.onerror = () => {
        this.updateStatus('idle');
      };

      this.speechSynthesis.speak(utterance);
      return true;
    } catch {
      this.updateStatus('idle');
      return false;
    }
  }

  // Start speech recognition listening
  startListening() {
    if (!this.SpeechRecognition) {
      this.updateStatus('error');
      return false;
    }

    try {
      if (this.recognitionInstance) {
        try { this.recognitionInstance.abort(); } catch {}
      }

      const recognition = new this.SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = this.voiceLang;

      recognition.onstart = () => {
        this.updateStatus('listening');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.currentTranscript = transcript;
        this.updateStatus('processing');
        this.executeCommand(transcript);
      };

      recognition.onerror = (event) => {
        this.updateStatus('error');
        this.synthesizeResponse('Speech recognition error encountered.');
      };

      recognition.onend = () => {
        if (this.status === 'listening') {
          this.updateStatus('idle');
        }
      };

      this.recognitionInstance = recognition;
      recognition.start();
      return true;
    } catch {
      this.updateStatus('error');
      return false;
    }
  }

  // Stop recognition manually
  stopListening() {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop();
      } catch {}
      this.recognitionInstance = null;
    }
    this.updateStatus('idle');
  }

  // Process and log parsed voice command
  executeCommand(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    this.history.unshift(parsed);

    if (parsed.matched && parsed.action === 'CLEAR_HISTORY') {
      this.history = [];
    }

    if (typeof this.onCommandMatched === 'function') {
      this.onCommandMatched(parsed);
    }

    this.synthesizeResponse(parsed.feedback);
    return parsed;
  }

  // Status transition helper
  updateStatus(newStatus) {
    this.status = newStatus;
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(newStatus);
    }
  }

  // Get active history
  getHistory() {
    return [...this.history];
  }

  // Clear log
  clearHistory() {
    this.history = [];
    return true;
  }
}

// UI Setup helper for standalone browser execution
export function initVoiceCommanderUI() {
  if (typeof document === 'undefined') return null;

  const btnMic = document.getElementById('btnMicToggle');
  const statusBadge = document.getElementById('commanderStatusBadge');
  const commandFeed = document.getElementById('commandFeed');
  const waveVisualizer = document.getElementById('waveVisualizer');
  const toastContainer = document.getElementById('speechToast');
  const clearBtn = document.getElementById('btnClearFeed');

  const updateBadge = (status) => {
    if (!statusBadge) return;
    statusBadge.textContent = status.toUpperCase();
    statusBadge.className = `status-badge status-${status}`;

    if (waveVisualizer) {
      if (status === 'listening') {
        waveVisualizer.classList.add('active-listening');
      } else {
        waveVisualizer.classList.remove('active-listening');
      }
    }
  };

  const showToast = (message) => {
    if (!toastContainer) return;
    toastContainer.textContent = message;
    toastContainer.classList.add('visible');
    setTimeout(() => {
      toastContainer.classList.remove('visible');
    }, 3200);
  };

  const renderHistory = (history) => {
    if (!commandFeed) return;
    if (history.length === 0) {
      commandFeed.innerHTML = '<div class="empty-feed-placeholder">Awaiting voice command input... Say "help" or click microphone.</div>';
      return;
    }

    commandFeed.innerHTML = history.map(item => `
      <div class="feed-item ${item.matched ? 'item-success' : 'item-fallback'}">
        <div class="feed-item-header">
          <span class="feed-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
          <span class="feed-badge">${item.matched ? item.action : 'FALLBACK'}</span>
        </div>
        <div class="feed-transcript">"${item.raw}"</div>
        <div class="feed-feedback">${item.feedback}</div>
      </div>
    `).join('');
  };

  const commander = new NonprofitImpactVoiceCommander({
    onStateChange: (status) => {
      updateBadge(status);
    },
    onCommandMatched: (result) => {
      renderHistory(commander.getHistory());
      showToast(result.feedback);
    }
  });

  if (btnMic) {
    btnMic.addEventListener('click', () => {
      if (commander.status === 'listening') {
        commander.stopListening();
      } else {
        commander.startListening();
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      commander.clearHistory();
      renderHistory([]);
      showToast('Command history reset.');
    });
  }

  return commander;
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initVoiceCommanderUI();
  });
}
