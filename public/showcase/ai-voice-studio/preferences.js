/**
 * AI Voice Studio - Adaptive User Settings & Preference Persistence State Engine
 * Issue #635 - Level 3 Core Feature
 *
 * Implements client-side state machine managing DAW studio preferences,
 * audio sample rates, waveform visualizers, sound cues, high-contrast modes,
 * and export formats with LocalStorage persistence and JSON import/export.
 */

export class AiVoiceStudioPreferenceManager {
  static STORAGE_KEY = 'ai_voice_studio_preferences_v1';

  static DEFAULTS = Object.freeze({
    theme: 'studio-dark',
    viewLayout: 'waveform',
    sampleRate: 48000,
    outputFormat: 'wav',
    soundCues: true,
    highContrast: false,
    autoNormalize: true,
    latencyMode: 'ultra-low'
  });

  /**
   * @param {object} [options={}]
   * @param {Storage} [options.storage]
   */
  constructor(options = {}) {
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.listeners = new Set();
    this.state = this.load();
  }

  /**
   * Loads persisted preferences merged with default values
   * @returns {object}
   */
  load() {
    if (!this.storage) {
      return { ...AiVoiceStudioPreferenceManager.DEFAULTS };
    }

    try {
      const raw = this.storage.getItem(AiVoiceStudioPreferenceManager.STORAGE_KEY);
      if (!raw) {
        return { ...AiVoiceStudioPreferenceManager.DEFAULTS };
      }
      const parsed = JSON.parse(raw);
      return { ...AiVoiceStudioPreferenceManager.DEFAULTS, ...parsed };
    } catch {
      return { ...AiVoiceStudioPreferenceManager.DEFAULTS };
    }
  }

  /**
   * Retrieves single preference value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Returns complete preferences snapshot
   * @returns {object}
   */
  getAll() {
    return { ...this.state };
  }

  /**
   * Saves single setting and persists to storage
   * @param {string} key
   * @param {*} value
   * @returns {object}
   */
  save(key, value) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Preference key must be a valid non-empty string');
    }

    const sanitizedKey = key.trim();
    this.state = {
      ...this.state,
      [sanitizedKey]: value
    };

    this._persist();
    this._notify(sanitizedKey, value);
    return { ...this.state };
  }

  /**
   * Bulk updates multiple preferences
   * @param {object} patch
   * @returns {object}
   */
  update(patch) {
    if (!patch || typeof patch !== 'object') {
      return { ...this.state };
    }

    this.state = {
      ...this.state,
      ...patch
    };

    this._persist();
    Object.entries(patch).forEach(([k, v]) => this._notify(k, v));
    return { ...this.state };
  }

  /**
   * Resets all preferences back to factory defaults
   * @returns {object}
   */
  resetDefaults() {
    this.state = { ...AiVoiceStudioPreferenceManager.DEFAULTS };
    this._persist();
    this._notify('*', this.state);
    return { ...this.state };
  }

  /**
   * Exports preferences serialized as JSON
   * @param {boolean} [pretty=true]
   * @returns {string}
   */
  exportJSON(pretty = true) {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schema: 'ai_voice_studio_preferences',
      preferences: this.state
    };
    return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
  }

  /**
   * Imports JSON preferences configuration
   * @param {string} jsonString
   * @returns {boolean}
   */
  importJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const incoming = data.preferences || data;
      if (typeof incoming !== 'object' || incoming === null) {
        return false;
      }

      this.state = {
        ...AiVoiceStudioPreferenceManager.DEFAULTS,
        ...incoming
      };
      this._persist();
      this._notify('*', this.state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Subscribes to preference changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Persists state to storage
   * @private
   */
  _persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        AiVoiceStudioPreferenceManager.STORAGE_KEY,
        JSON.stringify(this.state)
      );
    } catch (err) {
      console.warn('AiVoiceStudioPreferenceManager: Failed to persist to storage', err);
    }
  }

  /**
   * Notifies subscribers of changes
   * @private
   */
  _notify(key, value) {
    this.listeners.forEach(cb => {
      try {
        cb(key, value, { ...this.state });
      } catch (e) {
        console.error('Subscriber callback error:', e);
      }
    });
  }
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new AiVoiceStudioPreferenceManager();

    const modal = document.getElementById('ai-voice-studio-preferences-modal');
    const btnOpen = document.getElementById('openPreferencesBtn');
    const btnClose = document.getElementById('closePreferencesBtn');
    const btnReset = document.getElementById('btnResetPrefs');
    const btnExport = document.getElementById('btnExportPrefs');
    const toast = document.getElementById('prefToast');

    const inputTheme = document.getElementById('prefTheme');
    const inputLayout = document.getElementById('prefViewLayout');
    const inputSampleRate = document.getElementById('prefSampleRate');
    const inputFormat = document.getElementById('prefOutputFormat');
    const inputSound = document.getElementById('prefSoundCues');
    const inputHighContrast = document.getElementById('prefHighContrast');
    const inputNormalize = document.getElementById('prefAutoNormalize');
    const inputLatency = document.getElementById('prefLatencyMode');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2800);
    }

    function syncFormWithState() {
      const state = manager.getAll();
      if (inputTheme) inputTheme.value = state.theme || 'studio-dark';
      if (inputLayout) inputLayout.value = state.viewLayout || 'waveform';
      if (inputSampleRate) inputSampleRate.value = state.sampleRate || 48000;
      if (inputFormat) inputFormat.value = state.outputFormat || 'wav';
      if (inputSound) inputSound.checked = Boolean(state.soundCues);
      if (inputHighContrast) inputHighContrast.checked = Boolean(state.highContrast);
      if (inputNormalize) inputNormalize.checked = Boolean(state.autoNormalize);
      if (inputLatency) inputLatency.value = state.latencyMode || 'ultra-low';
    }

    function openModal() {
      syncFormWithState();
      if (modal) modal.classList.add('open');
    }

    function closeModal() {
      if (modal) modal.classList.remove('open');
    }

    if (btnOpen) btnOpen.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (inputTheme) {
      inputTheme.addEventListener('change', (e) => {
        manager.save('theme', e.target.value);
        showToast(`Theme updated to ${e.target.value}`);
      });
    }

    if (inputLayout) {
      inputLayout.addEventListener('change', (e) => {
        manager.save('viewLayout', e.target.value);
        showToast(`Layout changed to ${e.target.value}`);
      });
    }

    if (inputSampleRate) {
      inputSampleRate.addEventListener('change', (e) => {
        manager.save('sampleRate', Number(e.target.value));
        showToast(`Sample rate set to ${e.target.value} Hz`);
      });
    }

    if (inputFormat) {
      inputFormat.addEventListener('change', (e) => {
        manager.save('outputFormat', e.target.value);
        showToast(`Output format set to ${e.target.value.toUpperCase()}`);
      });
    }

    if (inputSound) {
      inputSound.addEventListener('change', (e) => {
        manager.save('soundCues', e.target.checked);
        showToast(`DAW sound cues ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputHighContrast) {
      inputHighContrast.addEventListener('change', (e) => {
        manager.save('highContrast', e.target.checked);
        showToast(`High contrast ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputNormalize) {
      inputNormalize.addEventListener('change', (e) => {
        manager.save('autoNormalize', e.target.checked);
        showToast(`Auto normalization ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputLatency) {
      inputLatency.addEventListener('change', (e) => {
        manager.save('latencyMode', e.target.value);
        showToast(`Buffer latency set to ${e.target.value}`);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        manager.resetDefaults();
        syncFormWithState();
        showToast('All studio preferences restored to defaults');
      });
    }

    if (btnExport) {
      btnExport.addEventListener('click', async () => {
        const json = manager.exportJSON(true);
        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(json);
            showToast('Preferences JSON copied to clipboard!');
          } else {
            showToast('Clipboard not supported');
          }
        } catch {
          showToast('Failed to copy preferences JSON');
        }
      });
    }

    syncFormWithState();
  });
}
