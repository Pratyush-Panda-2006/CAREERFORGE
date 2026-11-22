/**
 * Aerospace Orbiter - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Captures spoken voice input, parses vocal orbital grammars, executes actions, and synthesizes speech responses.
 */

export const ORBITER_GRAMMAR_PATTERNS = {
  orbit_burn: /(orbit\s*burn|thruster|burn\s*vector|prograde|retrograde)/i,
  telemetry_check: /(telemetry|status\s*check|orbit\s*status|altitude|velocity)/i,
  docking_alignment: /(docking|align\s*station|rendezvous|port\s*dock)/i,
  jettison_stage: /(jettison|stage\s*separation|decouple|release\s*booster)/i,
  abort_mission: /(abort|emergency\s*abort|cancel\s*mission|terminate)/i,
  status: /(status|system\s*check|diagnostics|avionics|systems)/i,
  help: /(help|commands|instructions|what\s*can\s*i\s*say|list\s*commands)/i,
  reset: /(reset|restart|reboot|initialize|clear)/i
};

export const ORBITER_RESPONSES = {
  orbit_burn: "Orbital burn parameters locked. Thruster vectoring engaged.",
  telemetry_check: "Telemetry nominal: Apoapsis 420km, Periapsis 405km, Velocity 7.7 km/s.",
  docking_alignment: "RCS thrusters configured for docking alignment with space station.",
  jettison_stage: "Stage decoupling verified. Explosive bolts fired.",
  abort_mission: "Emergency abort sequence acknowledged. Launch escape system armed.",
  status: "Orbiter avionics fully operational. All telemetry systems reporting green.",
  help: "Available vocal commands: orbit burn, telemetry check, docking alignment, jettison stage, abort mission, status, reset, and help.",
  reset: "Command buffer and orbital navigational vectors reset to defaults.",
  fallback: "Mission command not recognized. Say 'help' for orbital commands or verify microphone input."
};

export const FALLBACK_PHRASES = [
  "Mission command not recognized. Say 'help' for orbital commands or verify microphone input.",
  "Unrecognized orbital vocal transmission. Repeat directive or query telemetry status.",
  "Command pattern unmatched against flight computer. Please restate or say help."
];

export class AerospaceOrbiterVoiceCommander {
  constructor(options = {}) {
    this.recognition = null;
    this.isListening = false;
    this.history = [];
    this.maxHistory = options.maxHistory || 50;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);

    // Dom element bindings
    this.micBtn = null;
    this.statusBadge = null;
    this.historyEl = null;
    this.waveEl = null;
    this.toastEl = null;
    this.toastTimer = null;

    // Custom commands registry
    this.customCommands = [];
  }

  registerCommand(id, pattern, action, response) {
    this.customCommands.unshift({ id, pattern, action, response });
  }

  parseVoiceGrammar(transcript = '') {
    const text = String(transcript || '').trim();
    if (!text) {
      return {
        matched: false,
        command: 'UNKNOWN',
        action: 'UNKNOWN',
        transcript: '',
        confidence: 0,
        response: 'No audible speech detected.'
      };
    }

    // Check custom commands first
    for (const cmd of this.customCommands) {
      const match = text.match(cmd.pattern);
      if (match) {
        const result = {
          matched: true,
          id: cmd.id,
          command: cmd.id,
          action: cmd.action,
          transcript: text,
          confidence: 1,
          response: cmd.response,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // Check predefined orbital grammar patterns
    for (const [cmdKey, pattern] of Object.entries(ORBITER_GRAMMAR_PATTERNS)) {
      if (pattern.test(text)) {
        const result = {
          matched: true,
          id: cmdKey,
          command: cmdKey,
          action: cmdKey.toUpperCase(),
          transcript: text,
          confidence: 1,
          response: ORBITER_RESPONSES[cmdKey] || ORBITER_RESPONSES.fallback,
          timestamp: Date.now()
        };
        this._recordHistory(result);
        return result;
      }
    }

    // Fallback if not matched
    const fallbackResponse = FALLBACK_PHRASES[0];
    const fallback = {
      matched: false,
      id: 'fallback',
      command: 'fallback',
      action: 'FALLBACK',
      transcript: text,
      confidence: 0,
      response: fallbackResponse,
      timestamp: Date.now()
    };
    this._recordHistory(fallback);
    return fallback;
  }

  routeCommand(parsed) {
    if (!parsed || parsed.command === 'fallback' || parsed.confidence === 0 || !parsed.matched) {
      return parsed?.response || FALLBACK_PHRASES[0];
    }
    return ORBITER_RESPONSES[parsed.command] || parsed.response || ORBITER_RESPONSES.fallback;
  }

  _recordHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.renderHistory();
  }

  getCommandHistory() {
    return [...this.history];
  }

  synthesizeResponse(msg, options = {}) {
    if (!this.speechSynth) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      try {
        if (typeof SpeechSynthesisUtterance !== 'undefined') {
          const utterance = new SpeechSynthesisUtterance(String(msg));
          utterance.lang = options.lang || 'en-US';
          utterance.rate = options.rate || 1.0;
          utterance.pitch = options.pitch || 1.0;
          utterance.onend = () => resolve(true);
          utterance.onerror = () => resolve(false);
          this.speechSynth.speak(utterance);
          return;
        }
      } catch {
        resolve(false);
        return;
      }
      resolve(false);
    });
  }

  showToast(msg, duration = 2800) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, duration);
  }

  renderHistory() {
    if (!this.historyEl) return;
    if (this.history.length === 0) {
      this.historyEl.innerHTML = '<div class="history-entry empty">No telemetry voice transmissions recorded yet.</div>';
      return;
    }
    this.historyEl.innerHTML = this.history.map((item) => {
      let badgeClass = 'cmd-success';
      if (item.action === 'ABORT_MISSION') badgeClass = 'cmd-danger';
      else if (item.action === 'FALLBACK' || !item.matched) badgeClass = 'cmd-fallback';

      return `
        <div class="history-entry ${badgeClass}">
          <div class="entry-header">
            <span class="entry-command">"${this.escapeHtml(item.transcript)}"</span>
            <span class="entry-badge">${item.action}</span>
          </div>
          <p class="entry-response">${this.escapeHtml(item.response)}</p>
        </div>
      `;
    }).join('');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  setListening(isListening) {
    this.isListening = isListening;
    if (this.micBtn) {
      this.micBtn.classList.toggle('listening', isListening);
      const label = this.micBtn.querySelector('.mic-label');
      if (label) {
        label.textContent = isListening ? 'Listening...' : 'Activate Orbit Mic';
      }
    }
    if (this.statusBadge) {
      this.statusBadge.textContent = isListening
        ? 'Active Listening • Awaiting orbital flight commands'
        : 'System Idle • Ready for orbital vocal dispatch';
    }
    if (this.waveEl) {
      this.waveEl.classList.toggle('listening', isListening);
    }
  }

  async startListening() {
    if (typeof window === 'undefined') return false;

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      this.showToast('Web Speech API is not supported in this browser.');
      return false;
    }

    try {
      this.recognition = new SpeechRecognitionCtor();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => this.setListening(true);
      this.recognition.onend = () => this.setListening(false);
      this.recognition.onerror = (e) => {
        this.setListening(false);
        this.showToast(`Voice audio error: ${e.error}`);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        this.dispatchCommand(transcript);
      };

      this.recognition.start();
      return true;
    } catch (err) {
      this.setListening(false);
      this.showToast('Failed to initialize microphone.');
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    this.setListening(false);
    return true;
  }

  dispatchCommand(text) {
    const parsed = this.parseVoiceGrammar(text);
    const response = this.routeCommand(parsed);
    this.showToast(response);
    this.synthesizeResponse(response);
    return { parsed, response };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new AerospaceOrbiterVoiceCommander();

    commander.micBtn = document.getElementById('micBtn');
    commander.statusBadge = document.getElementById('statusBadge');
    commander.historyEl = document.getElementById('commandHistory');
    commander.waveEl = document.getElementById('waveVisualizer');
    commander.toastEl = document.getElementById('speechToast');

    const manualInput = document.getElementById('manualInput');
    const submitBtn = document.getElementById('submitBtn');

    if (commander.micBtn) {
      commander.micBtn.addEventListener('click', () => {
        if (commander.isListening) {
          commander.stopListening();
        } else {
          commander.startListening();
        }
      });
    }

    function handleManualDispatch() {
      const txt = manualInput?.value?.trim();
      if (txt) {
        commander.dispatchCommand(txt);
        if (manualInput) manualInput.value = '';
      }
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', handleManualDispatch);
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
