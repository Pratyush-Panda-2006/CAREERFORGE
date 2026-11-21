/**
 * Weather Radar Atlas - Voice Commander & Accessibility Speech Dispatcher
 * Hands-free voice shortcut controller and audio synthesis assistant for meteorological radar navigation.
 */

export class WeatherRadarAtlasVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.recognition = null;
    this.synth = options.synth || (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);
    this.maxHistory = options.maxHistory || 50;
    this.commandHistory = [];
    this.lastResponse = 'Voice Commander standby. Ready for meteorological navigation.';

    // Grammar routes for Weather Radar Atlas
    this.grammars = [
      {
        id: 'cmd_sweep_radar',
        pattern: /(sweep|scan|run)\s+(doppler|weather)?\s*radar/i,
        action: 'EXECUTE_DOPPLER_SWEEP',
        response: 'Executing high-resolution Doppler radar sweep.'
      },
      {
        id: 'cmd_storm_scan',
        pattern: /(scan|find|track|detect)\s+(storm\s*cells?|severe\s*weather)/i,
        action: 'SCAN_STORM_CELLS',
        response: 'Scanning active regional storm cells and mesocyclones.'
      },
      {
        id: 'cmd_precipitation_overlay',
        pattern: /(toggle|show|hide|display)\s+(precipitation|rain|snow)\s*(overlay|layer)?/i,
        action: 'TOGGLE_PRECIPITATION_OVERLAY',
        response: 'Toggling dual-polarization precipitation overlay.'
      },
      {
        id: 'cmd_wind_speed',
        pattern: /(check|show|get|what\s+is)\s+(the\s+)?(wind\s*speed|velocity|gusts)/i,
        action: 'CHECK_WIND_VELOCITY',
        response: 'Displaying base velocity and radial wind vector metrics.'
      },
      {
        id: 'cmd_zoom_radar',
        pattern: /(zoom\s+in|magnify|focus)\s*(radar|map|view)?/i,
        action: 'ZOOM_IN_RADAR',
        response: 'Magnifying radar sector view by one level.'
      },
      {
        id: 'cmd_severe_alerts',
        pattern: /(show|check|list|what\s+are)\s+(the\s+)?(severe\s*(weather)?\s*alerts|warnings)/i,
        action: 'SHOW_SEVERE_ALERTS',
        response: 'Retrieving National Weather Service severe weather bulletins.'
      },
      {
        id: 'cmd_reset_view',
        pattern: /(reset|center|recenter|default)\s*(radar|view|map)?/i,
        action: 'RESET_RADAR_VIEW',
        response: 'Recentering radar canvas to default regional station.'
      },
      {
        id: 'cmd_help',
        pattern: /(help|what\s+can\s+i\s+say|commands)/i,
        action: 'COMMAND_HELP',
        response: 'Available commands include: sweep radar, scan storm cells, toggle precipitation, check wind speed, and zoom radar.'
      }
    ];

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
          const current = event.resultIndex;
          const transcript = event.results[current][0].transcript;
          this.handleTranscript(transcript);
        };

        this.recognition.onerror = (event) => {
          this.isListening = false;
        };

        this.recognition.onend = () => {
          this.isListening = false;
        };
      }
    }
  }

  startListening() {
    if (this.isListening) return true;
    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        return true;
      } catch (err) {
        this.isListening = false;
        return false;
      }
    }
    // Simulation / fallback mode for test and unsupported environments
    this.isListening = true;
    return true;
  }

  stopListening() {
    if (!this.isListening) return false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // no-op
      }
    }
    this.isListening = false;
    return false;
  }

  isListeningState() {
    return this.isListening;
  }

  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string') {
      return {
        matched: false,
        action: 'UNKNOWN_GRAMMAR',
        transcript: '',
        response: 'Command not recognized. Say "help" to review available radar commands.'
      };
    }

    const cleaned = transcript.trim();
    for (const rule of this.grammars) {
      if (rule.pattern.test(cleaned)) {
        return {
          matched: true,
          grammarId: rule.id,
          action: rule.action,
          transcript: cleaned,
          response: rule.response
        };
      }
    }

    return {
      matched: false,
      grammarId: null,
      action: 'UNRECOGNIZED_COMMAND',
      transcript: cleaned,
      response: `Command "${cleaned}" not recognized. Say "help" for a list of voice commands.`
    };
  }

  synthesizeResponse(message) {
    const text = String(message || '').trim();
    this.lastResponse = text;

    if (this.synth && typeof window !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined') {
      try {
        if (this.synth.speaking) {
          this.synth.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        this.synth.speak(utterance);
      } catch (err) {
        // Fallback gracefully
      }
    }

    return text;
  }

  handleTranscript(transcript) {
    const parsed = this.parseVoiceGrammar(transcript);
    const synthText = this.synthesizeResponse(parsed.response);

    const historyRecord = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      transcript: parsed.transcript,
      action: parsed.action,
      matched: parsed.matched,
      response: synthText,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.commandHistory.unshift(historyRecord);
    if (this.commandHistory.length > this.maxHistory) {
      this.commandHistory.pop();
    }

    return historyRecord;
  }

  getCommandHistory() {
    return [...this.commandHistory];
  }

  clearHistory() {
    this.commandHistory = [];
  }

  getLastResponse() {
    return this.lastResponse;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const commander = new WeatherRadarAtlasVoiceCommander();

    const toggleBtn = document.getElementById('toggleVoiceBtn');
    const ringContainer = document.getElementById('micRingContainer');
    const statusBadge = document.getElementById('commanderStatusBadge');
    const waveVisualizer = document.getElementById('waveVisualizer');
    const historyContainer = document.getElementById('commandHistoryContainer');
    const synthOutput = document.getElementById('synthesizerOutput');
    const speechToast = document.getElementById('speechToast');
    const clearBtn = document.getElementById('clearStreamBtn');

    function showToast(msg) {
      if (!speechToast) return;
      speechToast.textContent = msg;
      speechToast.classList.add('visible');
      setTimeout(() => {
        speechToast.classList.remove('visible');
      }, 3000);
    }

    function updateUiState(listening) {
      if (listening) {
        ringContainer?.classList.add('active');
        toggleBtn?.classList.add('active');
        waveVisualizer?.classList.add('active');
        if (statusBadge) {
          statusBadge.textContent = 'Listening for Radar Commands...';
          statusBadge.className = 'status-badge status-listening';
        }
      } else {
        ringContainer?.classList.remove('active');
        toggleBtn?.classList.remove('active');
        waveVisualizer?.classList.remove('active');
        if (statusBadge) {
          statusBadge.textContent = 'Microphone Idle';
          statusBadge.className = 'status-badge';
        }
      }
    }

    function renderHistory() {
      if (!historyContainer) return;
      historyContainer.replaceChildren();

      const items = commander.getCommandHistory();
      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'stream-empty';
        empty.textContent = 'Awaiting voice or grammar input stream...';
        historyContainer.appendChild(empty);
        return;
      }

      items.forEach((item) => {
        const row = document.createElement('div');
        row.className = `stream-item ${item.matched ? 'matched' : 'unrecognized'}`;

        const left = document.createElement('div');
        left.className = 'item-left';

        const tr = document.createElement('span');
        tr.className = 'item-transcript';
        tr.textContent = `"${item.transcript}"`;

        const act = document.createElement('span');
        act.className = 'item-action';
        act.textContent = `→ Action: ${item.action}`;

        left.appendChild(tr);
        left.appendChild(act);

        const time = document.createElement('span');
        time.className = 'item-time';
        time.textContent = item.timeFormatted;

        row.appendChild(left);
        row.appendChild(time);
        historyContainer.appendChild(row);
      });
    }

    toggleBtn?.addEventListener('click', () => {
      if (commander.isListeningState()) {
        commander.stopListening();
        updateUiState(false);
      } else {
        const started = commander.startListening();
        updateUiState(started);
        showToast('Microphone active. Say a radar command.');
      }
    });

    clearBtn?.addEventListener('click', () => {
      commander.clearHistory();
      renderHistory();
      showToast('Command history cleared.');
    });

    // Quick Command Chips
    document.querySelectorAll('.chip-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const phrase = btn.getAttribute('data-phrase');
        if (phrase) {
          const res = commander.handleTranscript(phrase);
          if (synthOutput) synthOutput.textContent = `"${res.response}"`;
          renderHistory();
          showToast(`Executed: ${res.action}`);
        }
      });
    });
  });
}
