/**
 * Robotics Automata - Web Speech API Voice Commander
 * Captures spoken input via Web Speech API, matches speech against recognized
 * action grammars, routes commands, and synthesizes audio responses.
 */

const GRAMMAR_PATTERNS = {
  start: /(start|begin|run|launch)\s*(automation|robot|arm|system)?/i,
  stop: /(stop|halt|pause|abort)\s*(automation|robot|arm|system)?/i,
  status: /(status|state|health|diagnostic|telemetry)/i,
  help: /(help|commands|what can you say|list commands)/i,
  reset: /(reset|reboot|restart|initialize)/i
};

const FALLBACK_PHRASES = [
  "I did not catch that command. Try saying start automation, stop, status, or help.",
  "Command not recognized. Please repeat or say help for available commands.",
  "Sorry, I could not understand that. Supported commands include start, stop, status, reset, and help."
];

const RESPONSES = {
  start: "Starting robotics automation system.",
  stop: "Stopping robotics automation system.",
  status: "Robotics automation system is operational and nominal.",
  help: "Available commands: start automation, stop, status, reset, and help.",
  reset: "Resetting robotics automation system to default state.",
  fallback: "I did not catch that. Please try again or say help."
};

export class RoboticsAutomataVoiceCommander {
  constructor() {
    this.recognition = null;
    this.listening = false;
    this.history = [];
    this.micBtn = null;
    this.statusBadge = null;
    this.historyEl = null;
    this.waveEl = null;
    this.toastEl = null;
    this.synth = typeof speechSynthesis !== 'undefined' ? window.speechSynthesis : null;
  }

  parseVoiceGrammar(transcript) {
    const text = String(transcript).trim();
    if (!text) {
      return { command: 'fallback', confidence: 0, transcript: text };
    }
    for (const [command, pattern] of Object.entries(GRAMMAR_PATTERNS)) {
      if (pattern.test(text)) {
        return { command, confidence: 1, transcript: text };
      }
    }
    return { command: 'fallback', confidence: 0, transcript: text };
  }

  routeCommand(parsed) {
    const { command, confidence } = parsed;
    if (command === 'fallback' || confidence === 0) {
      return FALLBACK_PHRASES[Math.floor(Math.random() * FALLBACK_PHRASES.length)];
    }
    return RESPONSES[command] || RESPONSES.fallback;
  }

  synthesizeResponse(msg) {
    if (!this.synth) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(String(msg));
      utterance.lang = 'en-US';
      utterance.rate = 1;
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
      this.synth.speak(utterance);
    });
  }

  addHistoryEntry(entry) {
    this.history.unshift(entry);
    if (this.history.length > 50) {
      this.history.pop();
    }
    this.renderHistory();
  }

  renderHistory() {
    if (!this.historyEl) return;
    if (this.history.length === 0) {
      this.historyEl.innerHTML = '<div class="history-entry empty">No commands recognized yet.</div>';
      return;
    }
    this.historyEl.innerHTML = this.history
      .map((e) => `<div class="history-entry"><strong>[${e.command}]</strong> ${e.transcript}</div>`)
      .join('');
  }

  showToast(msg, duration = 2500) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, duration);
  }

  setListening(isListening) {
    this.listening = isListening;
    if (this.micBtn) {
      this.micBtn.classList.toggle('listening', isListening);
      this.micBtn.querySelector('.mic-label').textContent = isListening ? 'Listening...' : 'Start Listening';
    }
    if (this.statusBadge) {
      this.statusBadge.textContent = isListening ? 'Listening &bull; Speak now' : 'Idle &bull; Click mic to begin listening';
    }
    if (this.waveEl) {
      this.waveEl.classList.toggle('listening', isListening);
    }
  }

  async startListening() {
    if (typeof SpeechRecognition === 'undefined' && typeof webkitSpeechRecognition === 'undefined') {
      this.showToast('Web Speech API not supported in this browser.');
      return;
    }
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => this.setListening(true);
    this.recognition.onend = () => this.setListening(false);
    this.recognition.onerror = (e) => {
      console.error('Voice recognition error:', e.error);
      this.setListening(false);
      this.showToast(`Recognition error: ${e.error}`);
    };
    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const parsed = this.parseVoiceGrammar(transcript);
      const response = this.routeCommand(parsed);
      this.addHistoryEntry({ command: parsed.command, transcript });
      this.showToast(response);
      this.synthesizeResponse(response);
    };

    try {
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      this.setListening(false);
      this.showToast('Failed to start voice recognition.');
    }
  }

  stopListening() {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
      this.recognition = null;
    }
    this.setListening(false);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new RoboticsAutomataVoiceCommander();
    commander.micBtn = document.getElementById('micBtn');
    commander.statusBadge = document.getElementById('statusBadge');
    commander.historyEl = document.getElementById('commandHistory');
    commander.waveEl = document.getElementById('waveVisualizer');
    commander.toastEl = document.getElementById('speechToast');

    commander.micBtn?.addEventListener('click', () => {
      if (commander.listening) {
        commander.stopListening();
      } else {
        commander.startListening();
      }
    });
  });
}
