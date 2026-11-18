/**
 * Drone Delivery Skyway - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * NSoC '26 Level 3 Feature
 */

export class DroneDeliverySkywayVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    this.commands = [
      {
        id: 'launch_drone',
        pattern: /(launch|takeoff|depart)\s+(drone|flight|quadcopter)/i,
        action: 'LAUNCH_DRONE',
        response: 'Drone cleared for takeoff on corridor Alpha.'
      },
      {
        id: 'return_to_base',
        pattern: /(return|rtb|recall)\s+(to\s+base|drone|fleet)/i,
        action: 'RETURN_TO_BASE',
        response: 'Recall order dispatched; returning to launch hub.'
      },
      {
        id: 'emergency_land',
        pattern: /(land|abort|emergency\s+land)/i,
        action: 'EMERGENCY_LAND',
        response: 'Executing immediate emergency descent at safe hover zone.'
      },
      {
        id: 'telemetry_check',
        pattern: /(status|battery|telemetry|altitude)/i,
        action: 'CHECK_TELEMETRY',
        response: 'Avionics telemetry nominal: 89% battery, alt 120m.'
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
    } catch {
      return false;
    }
    return false;
  }

  startListening() {
    this.isListening = true;
    return true;
  }

  stopListening() {
    this.isListening = false;
    return true;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new DroneDeliverySkywayVoiceCommander();

    const micBtn = document.getElementById('micToggleBtn');
    const statusText = document.getElementById('micStatusText');
    const transcriptInput = document.getElementById('manualVoiceInput');
    const submitBtn = document.getElementById('submitVoiceBtn');
    const historyList = document.getElementById('commandHistoryList');

    function renderHistory() {
      if (!historyList) return;
      historyList.innerHTML = commander.getCommandHistory().map(item => `
        <div class="cmd-item ${item.matched ? 'cmd-success' : 'cmd-fail'}">
          <span class="cmd-transcript">"${item.transcript}"</span>
          <span class="cmd-action">${item.action}</span>
          <p class="cmd-response">${item.response}</p>
        </div>
      `).join('') || '<div class="empty-state">No voice commands processed yet</div>';
    }

    function processText(text) {
      const res = commander.parseVoiceGrammar(text);
      commander.synthesizeResponse(res.response);
      renderHistory();
      if (statusText) statusText.textContent = res.response;
    }

    if (submitBtn && transcriptInput) {
      submitBtn.addEventListener('click', () => {
        const txt = transcriptInput.value.trim();
        if (txt) {
          processText(txt);
          transcriptInput.value = '';
        }
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        if (!commander.isListening) {
          commander.startListening();
          micBtn.classList.add('recording');
          if (statusText) statusText.textContent = 'Listening for Drone Delivery Skyway voice commands...';
        } else {
          commander.stopListening();
          micBtn.classList.remove('recording');
          if (statusText) statusText.textContent = 'Microphone idle.';
        }
      });
    }
  });
}
