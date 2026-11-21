/**
 * VR Metaverse Hub - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 * Issue #2134 - NSoC '26 Level 3 Feature
 */

export class VrMetaverseHubVoiceCommander {
  constructor(options = {}) {
    this.isListening = false;
    this.speechSynth = options.speechSynth || (typeof window !== 'undefined' ? window.speechSynthesis : null);
    this.history = [];
    this.maxHistory = options.maxHistory || 50;

    this.commands = [
      {
        id: 'teleport_hub',
        pattern: /(teleport|jump|warp|go)\s+(to\s+)?(hub|spawn|lobby|plaza)/i,
        action: 'TELEPORT_HUB',
        response: 'Teleporting user avatar to central plaza hub.'
      },
      {
        id: 'switch_avatar',
        pattern: /(change|switch|customize)\s+(avatar|skin|model)/i,
        action: 'CUSTOMIZE_AVATAR',
        response: 'Opening metaverse 3D avatar customizer wardrobe.'
      },
      {
        id: 'spatial_audio',
        pattern: /(toggle|mute|adjust)\s+(spatial|3d|directional)\s*(audio|sound)?/i,
        action: 'TOGGLE_SPATIAL_AUDIO',
        response: 'Spatial 3D acoustic field calibrated.'
      },
      {
        id: 'invite_friend',
        pattern: /(invite|call|connect)\s+(friend|peer|user)/i,
        action: 'INVITE_PEER',
        response: 'Dispatching immersive holographic meetup invite.'
      }
    ];
  }

  startListening() {
    this.isListening = true;
    return true;
  }

  stopListening() {
    this.isListening = false;
    return false;
  }

  parseVoiceGrammar(transcript = '') {
    const text = String(transcript || '').trim();
    if (!text) {
      return {
        matched: false,
        action: 'UNKNOWN',
        transcript: '',
        response: 'No audible speech detected.'
      };
    }

    for (const cmd of this.commands) {
      if (cmd.pattern.test(text)) {
        const result = {
          matched: true,
          action: cmd.action,
          commandId: cmd.id,
          transcript: text,
          response: cmd.response,
          timestamp: new Date().toISOString()
        };
        this.recordHistory(result);
        return result;
      }
    }

    const fallback = {
      matched: false,
      action: 'FALLBACK',
      commandId: null,
      transcript: text,
      response: `Spoken instruction "${text}" not recognized in VR Metaverse Hub command grammar.`,
      timestamp: new Date().toISOString()
    };
    this.recordHistory(fallback);
    return fallback;
  }

  synthesizeResponse(message = '') {
    if (!message || !this.speechSynth) return false;
    try {
      if (typeof SpeechSynthesisUtterance !== 'undefined') {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        this.speechSynth.speak(utterance);
        return true;
      }
    } catch {
      // Fallback if speechSynthesis is not available in environment
    }
    return false;
  }

  recordHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
  }

  getCommandHistory() {
    return this.history;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const micBtn = document.getElementById('micToggleBtn');
    const badge = document.getElementById('voiceStatusBadge');
    const historyList = document.getElementById('commandHistoryList');
    const historyCount = document.getElementById('historyCount');
    const toast = document.getElementById('speechFeedbackToast');
    const toastMsg = document.getElementById('toastMessage');

    if (!micBtn) return;

    const commander = new VrMetaverseHubVoiceCommander();

    function showToast(msg) {
      if (!toast || !toastMsg) return;
      toastMsg.textContent = msg;
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 3500);
    }

    function renderHistory() {
      if (!historyList) return;
      const history = commander.getCommandHistory();
      if (historyCount) historyCount.textContent = `${history.length} entries`;

      if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No spoken voice commands recorded yet.</div>';
        return;
      }

      historyList.innerHTML = history.map(item => `
        <div class="history-card">
          <div class="history-header">
            <span class="action-tag">${item.action}</span>
            <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="history-transcript">"${item.transcript}"</div>
          <div class="history-response">${item.response}</div>
        </div>
      `).join('');
    }

    function executeCommand(text) {
      const result = commander.parseVoiceGrammar(text);
      commander.synthesizeResponse(result.response);
      showToast(result.response);
      renderHistory();
    }

    micBtn.addEventListener('click', () => {
      if (!commander.isListening) {
        commander.startListening();
        badge.textContent = 'LISTENING';
        badge.className = 'status-badge listening';
        micBtn.querySelector('.mic-btn-label').textContent = 'Stop Listening';
        showToast('Listening for voice commands...');
      } else {
        commander.stopListening();
        badge.textContent = 'READY';
        badge.className = 'status-badge ready';
        micBtn.querySelector('.mic-btn-label').textContent = 'Activate Microphone';
      }
    });

    document.querySelectorAll('.voice-chip[data-voice-command]').forEach(chip => {
      chip.addEventListener('click', () => {
        executeCommand(chip.dataset.voiceCommand);
      });
    });
  });
}
