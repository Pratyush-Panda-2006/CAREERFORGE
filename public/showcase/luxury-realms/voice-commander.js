/**
 * Luxury Realms - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Captures spoken input, matches recognized action grammars, and synthesizes spoken responses.
 */

export class LuxuryRealmsVoiceCommander {
  constructor(options = {}) {
    this.commands = options.commands || [];
    this.grammars = options.grammars || [];
    this.history = options.history || [];
    this.maxHistory = options.maxHistory || 50;
    this.isListening = false;
    this.recognition = null;
    this.synthesis = typeof speechSynthesis !== 'undefined' ? window.speechSynthesis : null;
    this.lang = options.lang || 'en-US';
    this.interimResults = options.interimResults !== undefined ? options.interimResults : false;
    this.continuous = options.continuous !== undefined ? options.continuous : false;
  }

  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') return null;
    const text = transcript.trim();
    if (!text) return null;

    for (const grammar of this.grammars) {
      const regex = new RegExp(grammar.pattern, grammar.flags || 'i');
      const match = text.match(regex);
      if (match) {
        return {
          command: grammar.command,
          action: grammar.action,
          confidence: grammar.confidence || 1,
          matched: match[0],
          groups: match.slice(1),
          transcript: text
        };
      }
    }

    return {
      command: 'unknown',
      action: 'fallback',
      confidence: 0,
      matched: text,
      groups: [],
      transcript: text
    };
  }

  routeCommand(parsed) {
    if (!parsed) return { handled: false, message: 'No command recognized.' };
    if (parsed.action === 'fallback' || parsed.command === 'unknown') {
      return this.handleFallback(parsed);
    }
    const cmd = this.commands.find(c => c.id === parsed.action || c.id === parsed.command);
    if (cmd) {
      return { handled: true, message: cmd.response || `Executed: ${parsed.command}` };
    }
    return this.handleFallback(parsed);
  }

  handleFallback(parsed) {
    const phrases = [
      `I did not recognize "${parsed.matched}". Please try again.`,
      `Command not recognized: ${parsed.transcript}.`,
      `Say that again, I did not catch "${parsed.matched}".`
    ];
    const idx = Math.floor(Math.random() * phrases.length);
    return { handled: false, message: phrases[idx] };
  }

  synthesizeResponse(msg) {
    if (!msg || typeof msg !== 'string') return;
    if (this.synthesis) {
      this.synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = this.lang;
      utterance.rate = 1;
      utterance.pitch = 1;
      this.synthesis.speak(utterance);
    }
    return msg;
  }

  startListening() {
    if (this.isListening) return this.stopListening();
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.synthesizeResponse('Speech recognition is not supported in this browser.');
      return { started: false, error: 'SpeechRecognition not supported' };
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.lang;
    this.recognition.interimResults = this.interimResults;
    this.recognition.continuous = this.continuous;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          const parsed = this.parseVoiceGrammar(transcript);
          const routed = this.routeCommand(parsed);
          this.recordCommand(transcript, routed.message, parsed.command);
          this.synthesizeResponse(routed.message);
        } else {
          finalTranscript += transcript;
        }
      }
      if (finalTranscript.trim()) {
        this.onInterim?.(finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      this.isListening = false;
      this.synthesizeResponse(`Voice error: ${event.error}.`);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    this.recognition.start();
    return { started: true };
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
    return { started: false };
  }

  recordCommand(transcript, response, command) {
    const entry = {
      id: `vc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      transcript,
      response,
      command,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) this.history.pop();
    return entry;
  }

  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
  }

  exportHistoryJson() {
    return JSON.stringify({
      system: 'LuxuryRealms-VoiceCommander',
      version: '1.0.0',
      isListening: this.isListening,
      commandCount: this.history.length,
      history: this.history
    }, null, 2);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new LuxuryRealmsVoiceCommander({
      grammars: [
        { pattern: '\\b(book|reserve|reservation)\\b', command: 'book_stay', action: 'book_stay', confidence: 0.9 },
        { pattern: '\\b(check.in|checkin)\\b', command: 'check_in', action: 'check_in', confidence: 0.9 },
        { pattern: '\\b(check.out|checkout)\\b', command: 'check_out', action: 'check_out', confidence: 0.9 },
        { pattern: '\\b(spa|wellness|massage)\\b', command: 'book_spa', action: 'book_spa', confidence: 0.9 },
        { pattern: '\\b(help|assist|concierge)\\b', command: 'help', action: 'help', confidence: 0.8 }
      ],
      commands: [
        { id: 'book_stay', response: 'Your luxury stay has been booked.' },
        { id: 'check_in', response: 'Checking you in now. Welcome to Luxury Realms.' },
        { id: 'check_out', response: 'Checking you out. Thank you for staying with us.' },
        { id: 'book_spa', response: 'Spa appointment scheduled for you.' },
        { id: 'help', response: 'Available commands: book, check in, check out, spa, help.' }
      ]
    });

    const micBtn = document.getElementById('vcMicBtn');
    const clearBtn = document.getElementById('vcClearBtn');
    const statusEl = document.getElementById('vcStatus');
    const waveRings = [document.getElementById('vcWaveRing1'), document.getElementById('vcWaveRing2'), document.getElementById('vcWaveRing3')];
    const waveCenter = document.getElementById('vcWaveCenter');
    const feedEl = document.getElementById('vcCommandFeed');
    const countEl = document.getElementById('vcCommandCount');
    const toastEl = document.getElementById('vcToast');

    function renderHistory() {
      if (!feedEl) return;
      feedEl.replaceChildren();
      const history = commander.getHistory();
      if (countEl) countEl.textContent = String(history.length);
      if (history.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No voice commands recognized yet.';
        feedEl.appendChild(empty);
        return;
      }
      history.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'vc-command-item';
        item.innerHTML = `
          <span class="vc-command-text">${escapeHtml(entry.transcript)}</span>
          <span class="vc-command-time">${entry.timeFormatted}</span>
        `;
        feedEl.appendChild(item);
      });
    }

    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2000);
    }

    function setListening(listening) {
      if (micBtn) {
        micBtn.classList.toggle('listening', listening);
        micBtn.textContent = listening ? '&#128266; Stop Listening' : '&#128266; Start Listening';
      }
      if (statusEl) statusEl.textContent = listening ? 'Listening...' : 'Idle';
      waveRings.forEach(r => r.classList.toggle('idle', !listening));
      if (waveCenter) waveCenter.textContent = listening ? '&#128266;' : '&#128266;';
    }

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const started = commander.startListening().started;
        setListening(started);
        if (!started && !commander.isListening) showToast(commander.isListening ? 'Listening...' : 'Speech not supported.');
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        commander.clearHistory();
        renderHistory();
      });
    }

    commander.onInterim = (text) => {
      if (statusEl) statusEl.textContent = `Hearing: ${text}`;
    };

    renderHistory();
  });
}
