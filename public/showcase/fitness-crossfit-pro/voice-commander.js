/**
 * Fitness Crossfit Pro - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2155 - NSoC '26 Level 3 Feature
 */

export class FitnessCrossfitProVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    // Built-in CrossFit voice command grammar dictionary
    this.commands = [
      {
        id: 'start_wod',
        pattern: /(start|begin|launch)\s+(wod|workout|timer)/i,
        action: 'START_WORKOUT',
        response: 'Workout clock running. 3, 2, 1, Go!'
      },
      {
        id: 'pause_wod',
        pattern: /(pause|hold|stop)\s+(wod|workout|timer)/i,
        action: 'PAUSE_WORKOUT',
        response: 'Workout paused. Rest time recorded.'
      },
      {
        id: 'log_rep',
        pattern: /(log|add|count)\s+(\d+)?\s*(reps?|rounds?)/i,
        action: 'LOG_REPS',
        response: 'Rep count updated successfully.'
      },
      {
        id: 'next_round',
        pattern: /(next|advance)\s+(round|interval|set)/i,
        action: 'NEXT_ROUND',
        response: 'Advancing to next interval.'
      },
      {
        id: 'status_check',
        pattern: /(status|pace|time|heart\s*rate)/i,
        action: 'CHECK_STATUS',
        response: 'Athlete telemetry nominal. Keep pacing steady.'
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
    const commander = new FitnessCrossfitProVoiceCommander();

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
          if (statusText) statusText.textContent = 'Listening for CrossFit voice commands...';
        } else {
          commander.stopListening();
          micBtn.classList.remove('recording');
          if (statusText) statusText.textContent = 'Microphone idle.';
        }
      });
    }
  });
}
