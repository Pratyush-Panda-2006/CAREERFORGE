/**
 * Apex Zero Hypercar - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2086 - NSoC '26 Level 3 Feature
 */

export class AutomotiveHypercarVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    this.commands = [
      {
        id: 'start_engine',
        pattern: /(start|ignite|fire up|turn on)\s+(engine|motor|powertrain)/i,
        action: 'START_ENGINE',
        response: 'Hypercar powertrain engaged. Ignition sequence complete.'
      },
      {
        id: 'launch_control',
        pattern: /(launch|engage|activate)\s+(launch\s*control|launch\s*mode)/i,
        action: 'LAUNCH_CONTROL',
        response: 'Launch control armed. Prepare for 0 to 60 in 1.74 seconds.'
      },
      {
        id: 'telemetry_status',
        pattern: /(telemetry|status|readings|diagnostics)/i,
        action: 'TELEMETRY_STATUS',
        response: 'Displaying live cockpit telemetry and battery state of charge.'
      },
      {
        id: 'torque_vectoring',
        pattern: /(torque\s*vectoring|all.?wheel\s*vectoring|vectoring)/i,
        action: 'TORQUE_VECTORING',
        response: 'Active all-wheel torque vectoring engaged for cornering precision.'
      },
      {
        id: 'downforce_aero',
        pattern: /(downforce|aero|aerodynamic|wing)/i,
        action: 'ACTIVE_AERO',
        response: 'Active aerodynamic wing adjusting downforce and drag balance.'
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
      response: `Command "${clean}" not recognized. Say "start engine", "launch control", or "telemetry status".`,
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
    const commander = new AutomotiveHypercarVoiceCommander();
    const micBtn = document.getElementById('micToggleBtn');
    const statusBadge = document.getElementById('voiceStatusBadge');
    const logContainer = document.getElementById('commandHistoryLog');
    const waveContainer = document.getElementById('audioWaveVisualizer');
    const waveBars = waveContainer ? waveContainer.querySelectorAll('.wave-bar') : [];
    const quickButtons = document.querySelectorAll('[data-voice-command]');
    const toast = document.getElementById('speechToast');

    function showToast(message) {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('visible');
      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove('visible');
      }, 3000);
    }

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

    function setListeningUI(listening) {
      if (statusBadge) {
        statusBadge.textContent = listening ? 'LISTENING...' : 'READY';
        statusBadge.className = `status-badge ${listening ? 'listening' : 'ready'}`;
      }
      if (micBtn) micBtn.classList.toggle('recording', listening);
      waveBars.forEach(bar => bar.classList.toggle('active', listening));
    }

    micBtn?.addEventListener('click', () => {
      if (commander.isListening) return;

      const started = commander.startListening({
        onStart: () => {
          setListeningUI(true);
        },
        onResult: () => {
          renderHistory();
        },
        onEnd: () => {
          setListeningUI(false);
        },
        onError: () => {
          setListeningUI(false);
          if (statusBadge) {
            statusBadge.textContent = 'MIC UNAVAILABLE';
            statusBadge.className = 'status-badge error';
          }
          showToast('Microphone unavailable. Use simulated commands.');
        }
      });

      if (!started && statusBadge) {
        statusBadge.textContent = 'USE SIMULATED COMMANDS';
        statusBadge.className = 'status-badge ready';
        showToast('Speech recognition unsupported. Simulate commands below.');
      }
    });

    quickButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-voice-command');
        const res = commander.parseVoiceGrammar(phrase);
        commander.synthesizeResponse(res.response);
        showToast(res.response);
        renderHistory();
      });
    });

    renderHistory();
  });
}
