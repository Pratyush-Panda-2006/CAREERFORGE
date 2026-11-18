/**
 * Pet Adoption Haven - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2167 - NSoC '26 Level 3 Feature
 */

export class PetAdoptionHavenVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    // Built-in Pet Adoption Haven voice command grammar dictionary
    this.commands = [
      {
        id: 'find_pets',
        pattern: /(find|search|show)\s+(pets?|dogs?|cats?|animals?)/i,
        action: 'SEARCH_PETS',
        response: 'Displaying available rescue pets matching criteria.'
      },
      {
        id: 'filter_breed',
        pattern: /(filter|show|only)\s+(golden\s*retriever|poodle|beagle|tabby|husky)/i,
        action: 'FILTER_BREED',
        response: 'Applying breed filter to rescue gallery.'
      },
      {
        id: 'adopt_pet',
        pattern: /(adopt|inquire|apply\s*for)\s+(pet|dog|cat|[a-z]+)/i,
        action: 'START_ADOPTION',
        response: 'Adoption inquiry questionnaire initiated.'
      },
      {
        id: 'shelter_status',
        pattern: /(shelter|hours|location|visiting)/i,
        action: 'SHELTER_INFO',
        response: 'Shelter is open Tuesday through Sunday from 10am to 6pm.'
      },
      {
        id: 'foster_program',
        pattern: /(foster|volunteer|help|donate)/i,
        action: 'VOLUNTEER_INFO',
        response: 'Opening foster and volunteer registration program.'
      }
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
        const record = {
          id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          matched: true,
          action: cmd.action,
          transcript: clean,
          response: cmd.response,
          timestamp: Date.now()
        };
        this._recordHistory(record);
        return record;
      }
    }

    const fallback = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      matched: false,
      action: 'FALLBACK',
      transcript: clean,
      response: `Command "${clean}" not recognized. Say "find pets", "adopt dog", or "shelter hours".`,
      timestamp: Date.now()
    };
    this._recordHistory(fallback);
    return fallback;
  }

  synthesizeResponse(message, options = {}) {
    const text = String(message || '').trim();
    if (!text) return null;

    if (!this.speechSynth || typeof window === 'undefined') {
      return { spoken: false, text, reason: 'SYNTH_UNAVAILABLE' };
    }

    try {
      if (typeof window.SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new window.SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 1.0;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume !== undefined ? options.volume : 1.0;
        this.speechSynth.speak(utterance);
        return { spoken: true, text };
      }
    } catch {
      // SpeechSynthesis error suppression
    }

    return { spoken: false, text, reason: 'SPEECH_FAILED' };
  }

  startListening(callbacks = {}) {
    if (typeof window === 'undefined') {
      this.isListening = true;
      return false;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      if (callbacks.onError) callbacks.onError('SpeechRecognition not supported in this browser.');
      return false;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        this.isListening = true;
        if (callbacks.onStart) callbacks.onStart();
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const result = this.parseVoiceGrammar(transcript);
        this.synthesizeResponse(result.response);
        if (callbacks.onResult) callbacks.onResult(result);
      };

      recognition.onerror = (err) => {
        this.isListening = false;
        if (callbacks.onError) callbacks.onError(err);
      };

      recognition.onend = () => {
        this.isListening = false;
        if (callbacks.onEnd) callbacks.onEnd();
      };

      recognition.start();
      return true;
    } catch (err) {
      this.isListening = false;
      if (callbacks.onError) callbacks.onError(err);
      return false;
    }
  }

  getCommandHistory() {
    return [...this.history];
  }

  _recordHistory(record) {
    this.history.unshift(record);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new PetAdoptionHavenVoiceCommander();
    const micBtn = document.getElementById('micToggleBtn');
    const statusBadge = document.getElementById('voiceStatusBadge');
    const logContainer = document.getElementById('commandHistoryLog');
    const quickButtons = document.querySelectorAll('[data-voice-command]');

    function renderHistory() {
      if (!logContainer) return;
      logContainer.replaceChildren();

      commander.getCommandHistory().forEach(item => {
        const entry = document.createElement('div');
        entry.className = `voice-cmd-entry ${item.matched ? 'matched' : 'fallback'}`;
        entry.innerHTML = `
          <div class="cmd-row-header">
            <span class="cmd-action">${item.action}</span>
            <span class="cmd-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="cmd-transcript">"${item.transcript}"</div>
          <div class="cmd-response">↳ ${item.response}</div>
        `;
        logContainer.appendChild(entry);
      });
    }

    micBtn?.addEventListener('click', () => {
      if (commander.isListening) return;

      const started = commander.startListening({
        onStart: () => {
          if (statusBadge) {
            statusBadge.textContent = 'LISTENING...';
            statusBadge.className = 'status-badge listening';
          }
          if (micBtn) micBtn.classList.add('recording');
        },
        onResult: () => {
          renderHistory();
        },
        onEnd: () => {
          if (statusBadge) {
            statusBadge.textContent = 'READY';
            statusBadge.className = 'status-badge ready';
          }
          if (micBtn) micBtn.classList.remove('recording');
        },
        onError: () => {
          if (statusBadge) {
            statusBadge.textContent = 'MIC UNAVAILABLE';
            statusBadge.className = 'status-badge error';
          }
          if (micBtn) micBtn.classList.remove('recording');
        }
      });

      if (!started && statusBadge) {
        statusBadge.textContent = 'USE SIMULATED COMMANDS';
        statusBadge.className = 'status-badge ready';
      }
    });

    quickButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-voice-command');
        const res = commander.parseVoiceGrammar(phrase);
        commander.synthesizeResponse(res.response);
        renderHistory();
      });
    });

    renderHistory();
  });
}
