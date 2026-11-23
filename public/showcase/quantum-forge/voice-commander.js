/**
 * Quantum Forge - Web Speech API Voice Commander & Accessibility Speech Dispatcher
 */

export class QuantumForgeVoiceCommander {
  constructor(options = {}) {
    this.options = {
      lang: options.lang || 'en-US',
      confidenceThreshold: options.confidenceThreshold || 0.5,
      highContrast: Boolean(options.highContrast),
      speechSynthesisEnabled: options.speechSynthesisEnabled !== false
    };

    this.isListening = false;
    this.highContrast = this.options.highContrast;
    this.activeView = 'overview';
    this.activeTheme = 'dark';
    this.history = [];
    this.spokenMessages = [];
    this.lastSynthesizedSpeech = null;
    this.listeners = new Map();
  }

  isSpeechRecognitionSupported() {
    return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  isSpeechSynthesisSupported() {
    return typeof window !== 'undefined' && Boolean(window.speechSynthesis);
  }

  startListening() {
    this.isListening = true;
    this.emit('listening-started', { isListening: true });
    return true;
  }

  stopListening() {
    this.isListening = false;
    this.emit('listening-stopped', { isListening: false });
    return true;
  }

  toggleListening() {
    return this.isListening ? this.stopListening() : this.startListening();
  }

  toggleHighContrast(explicitState) {
    this.highContrast = typeof explicitState === 'boolean' ? explicitState : !this.highContrast;
    this.emit('contrast-changed', { highContrast: this.highContrast });
    return this.highContrast;
  }

  parseVoiceGrammar(transcript) {
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return { action: 'EMPTY', confidence: 0, params: {} };
    }

    const clean = transcript.trim().toLowerCase();

    if (/navigate to|go to|open|view|switch to/.test(clean)) {
      const match = clean.match(/(?:navigate to|go to|open|view|switch to)\s+([a-z0-9_-]+)/i);
      const target = match ? match[1] : 'overview';
      return { action: 'NAVIGATE_VIEW', confidence: 0.95, params: { view: target } };
    }

    if (/switch theme|toggle theme|set theme/.test(clean)) {
      const match = clean.match(/(?:switch theme|toggle theme|set theme)\s*(?:to)?\s*(dark|light|neon|cyberpunk)?/i);
      const theme = match && match[1] ? match[1] : (this.activeTheme === 'dark' ? 'light' : 'dark');
      return { action: 'SWITCH_THEME', confidence: 0.95, params: { theme } };
    }

    if (/high contrast|contrast/.test(clean)) {
      return { action: 'TOGGLE_HIGH_CONTRAST', confidence: 0.95, params: { mode: 'toggle' } };
    }

    if (/run diagnostics|test coherence|calibrate/.test(clean)) {
      return { action: 'TRIGGER_DIAGNOSTICS', confidence: 0.95, params: { scope: 'full' } };
    }

    return { action: 'UNKNOWN', confidence: 0.2, params: { raw: transcript } };
  }

  executeCommand(parsed) {
    if (!parsed || parsed.action === 'EMPTY') {
      return { success: false, action: 'EMPTY', feedback: 'No voice command received.' };
    }

    let feedback = '';
    let success = true;

    switch (parsed.action) {
      case 'NAVIGATE_VIEW':
        this.activeView = parsed.params.view;
        feedback = `Navigated to ${this.activeView} view.`;
        this.emit('navigate', { view: this.activeView });
        break;
      case 'SWITCH_THEME':
        this.activeTheme = parsed.params.theme;
        feedback = `Theme changed to ${this.activeTheme}.`;
        this.emit('theme-changed', { theme: this.activeTheme });
        break;
      case 'TOGGLE_HIGH_CONTRAST':
        this.toggleHighContrast();
        feedback = `High contrast is now ${this.highContrast ? 'enabled' : 'disabled'}.`;
        break;
      case 'TRIGGER_DIAGNOSTICS':
        feedback = 'Quantum calibration diagnostics triggered.';
        this.emit('diagnostics-triggered', { scope: parsed.params.scope });
        break;
      default:
        success = false;
        feedback = `Command not recognized: "${parsed.params.raw || ''}".`;
    }

    this.synthesizeResponse(feedback);
    return { success, action: parsed.action, feedback };
  }

  processTranscript(transcript, metadata = {}) {
    const parsed = this.parseVoiceGrammar(transcript);
    const execution = this.executeCommand(parsed);

    const record = {
      id: metadata.id || 'cmd-' + Math.random().toString(36).slice(2, 9),
      rawTranscript: transcript || '',
      action: parsed.action,
      confidence: parsed.confidence,
      feedback: execution.feedback,
      status: execution.success ? 'executed' : (parsed.action === 'EMPTY' ? 'empty' : 'unrecognized'),
      timestamp: Date.now()
    };

    this.history.unshift(record);
    return { ...record, success: execution.success };
  }

  synthesizeResponse(text) {
    if (!text) return false;
    this.lastSynthesizedSpeech = text;
    this.spokenMessages.push(text);
    return true;
  }

  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
  }

  off(event, handler) {
    const s = this.listeners.get(event);
    if (s) s.delete(handler);
  }

  emit(event, data) {
    const s = this.listeners.get(event);
    if (s) s.forEach(h => h(data));
  }

  getHistory() { return [...this.history]; }
  clearHistory() { this.history = []; }
}
