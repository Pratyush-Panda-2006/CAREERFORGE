/**
 * Streaming Cinema Hub - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2152 - NSoC '26 Level 3 Feature
 */

export class StreamingCinemaHubVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    // Cinema-specific voice command grammar dictionary
    this.commands = [
      {
        id: 'play_movie',
        pattern: /(play|resume|stream)\s+(movie|film|trailer|video)?/i,
        action: 'PLAY_MEDIA',
        response: 'Resuming theater playback.'
      },
      {
        id: 'pause_movie',
        pattern: /(pause|freeze|stop)\s+(movie|film|playback|video)?/i,
        action: 'PAUSE_MEDIA',
        response: 'Theater playback paused.'
      },
      {
        id: 'toggle_subtitles',
        pattern: /(subtitles?|captions?)\s+(on|off|toggle)/i,
        action: 'TOGGLE_SUBTITLES',
        response: 'Subtitles updated.'
      },
      {
        id: 'change_volume',
        pattern: /(volume|sound|audio)\s+(up|down|mute|max)/i,
        action: 'ADJUST_VOLUME',
        response: 'Audio level calibrated.'
      },
      {
        id: 'search_cinema',
        pattern: /(search|find|lookup)\s+(.+)/i,
        action: 'SEARCH_CATALOG',
        response: 'Filtering cinema archive for query.'
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
      response: `Command not recognized: "${clean}". Try saying "play movie" or "subtitles on".`,
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
    const commander = new StreamingCinemaHubVoiceCommander();

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
          if (statusText) statusText.textContent = 'Listening for cinema commands...';
        } else {
          commander.stopListening();
          micBtn.classList.remove('recording');
          if (statusText) statusText.textContent = 'Microphone idle.';
        }
      });
    }
  });
}
