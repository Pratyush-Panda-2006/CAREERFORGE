/**
 * DeFi Yield Matrix - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * NSoC '26 Level 3 Feature
 */

export class DefiYieldMatrixVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    this.commands = [
      {
        id: 'stake_liquidity',
        pattern: /(stake|deposit)\s+(liquidity|tokens?|lp|yield)/i,
        action: 'STAKE_LIQUIDITY',
        response: 'Liquidity deposited into highest APY yield vault.'
      },
      {
        id: 'claim_rewards',
        pattern: /(claim|harvest)\s+(rewards?|yield|tokens?)/i,
        action: 'CLAIM_REWARDS',
        response: 'Staking yield rewards harvested to connected wallet.'
      },
      {
        id: 'rebalance_matrix',
        pattern: /(rebalance|optimize)\s+(portfolio|matrix|vaults?)/i,
        action: 'REBALANCE_MATRIX',
        response: 'Yield farming allocation rebalanced across multi-pool matrix.'
      },
      {
        id: 'vault_status',
        pattern: /(status|metrics|tvl|apy)/i,
        action: 'VAULT_STATUS',
        response: 'Matrix TVL nominal: current aggregate APY 18.4%.'
      },
    ];
  }

  registerCommand(id, pattern, action, response) {
    this.commands.unshift({ id, pattern, action, response });
  }

  parseVoiceGrammar(transcript = '') {
    const clean = String(transcript || '').trim();
    if (!clean) {
      return {
        matched: false,
        action: 'UNKNOWN',
        transcript: '',
        response: 'No audible speech detected.'
      };
    }

    for (const cmd of this.commands) {
      const match = clean.match(cmd.pattern);
      if (match) {
        const result = {
          matched: true,
          id: cmd.id,
          action: cmd.action,
          transcript: clean,
          response: cmd.response,
          params: match.slice(1).filter(Boolean),
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    const fallback = {
      matched: false,
      action: 'FALLBACK',
      transcript: clean,
      response: `Command not recognized: "${clean}". Say "help" for command list.`,
      timestamp: Date.now()
    };
    this._recordHistory(fallback);
    return fallback;
  }

  _recordHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getCommandHistory() {
    return [...this.history];
  }

  synthesizeResponse(message, options = {}) {
    if (!this.speechSynth) return false;
    try {
      if (typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        this.speechSynth.speak(utterance);
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new DefiYieldMatrixVoiceCommander();

    const micBtn = document.getElementById('micToggleBtn');
    const statusText = document.getElementById('micStatusText');
    const manualInput = document.getElementById('manualVoiceInput');
    const submitBtn = document.getElementById('submitVoiceBtn');
    const historyList = document.getElementById('commandHistoryList');

    function renderFeed() {
      if (!historyList) return;
      const history = commander.getCommandHistory();
      historyList.innerHTML = history.slice(0, 5).map(item => `
        <div class="history-item">
          <div>
            <div class="history-transcript">${item.transcript || '(silence)'}</div>
            <div class="history-response">${item.response}</div>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${item.action}</span>
        </div>
      `).join('');
    }

    function dispatch(text) {
      const res = commander.parseVoiceGrammar(text);
      if (statusText) statusText.textContent = res.response;
      commander.synthesizeResponse(res.response);
      renderFeed();
    }

    submitBtn?.addEventListener('click', () => {
      const val = manualInput?.value;
      if (val) {
        dispatch(val);
        if (manualInput) manualInput.value = '';
      }
    });

    manualInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = manualInput.value;
        if (val) {
          dispatch(val);
          manualInput.value = '';
        }
      }
    });

    let recognition = null;
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        commander.isListening = true;
        micBtn?.classList.add('listening');
        if (statusText) statusText.textContent = 'Listening for speech input...';
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        dispatch(transcript);
      };

      recognition.onerror = () => {
        commander.isListening = false;
        micBtn?.classList.remove('listening');
        if (statusText) statusText.textContent = 'Mic error or speech not detected.';
      };

      recognition.onend = () => {
        commander.isListening = false;
        micBtn?.classList.remove('listening');
      };
    }

    micBtn?.addEventListener('click', () => {
      if (!recognition) {
        if (statusText) statusText.textContent = 'Speech recognition not supported in this browser. Use text input.';
        return;
      }
      if (commander.isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    });
  });
}
