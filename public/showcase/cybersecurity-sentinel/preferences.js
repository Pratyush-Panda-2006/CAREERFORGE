/**
 * Cybersecurity Sentinel - Adaptive User Settings & Preference Persistence State Engine
 * Issue #639 - Level 3 Core Feature
 *
 * Implements client-side state machine managing SOC threat dashboard preferences,
 * SIEM alert severity thresholds, incident response sound cues, high-contrast terminal styling,
 * and automated mitigation policies with LocalStorage persistence and JSON import/export.
 */

export class CybersecuritySentinelPreferenceManager {
  static STORAGE_KEY = 'cybersecurity_sentinel_preferences_v1';

  static DEFAULTS = Object.freeze({
    theme: 'cyber-terminal',
    viewLayout: 'threat-matrix',
    alertSeverityThreshold: 'medium',
    pollingInterval: 15,
    soundCues: true,
    highContrast: false,
    autoMitigation: false,
    logDensity: 'detailed'
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
   * Loads persisted preferences merged with default fallback values
   * @returns {object}
   */
  load() {
    if (!this.storage) {
      return { ...CybersecuritySentinelPreferenceManager.DEFAULTS };
    }

    try {
      const raw = this.storage.getItem(CybersecuritySentinelPreferenceManager.STORAGE_KEY);
      if (!raw) {
        return { ...CybersecuritySentinelPreferenceManager.DEFAULTS };
      }
      const parsed = JSON.parse(raw);
      return { ...CybersecuritySentinelPreferenceManager.DEFAULTS, ...parsed };
    } catch {
      return { ...CybersecuritySentinelPreferenceManager.DEFAULTS };
    }
  }

  /**
   * Returns current value of a preference key
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Returns full current preference snapshot
   * @returns {object}
   */
  getAll() {
    return { ...this.state };
  }

  /**
   * Updates a single preference key and persists changes
   * @param {string} key
   * @param {*} value
   * @returns {object} updated preferences
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
    this.state = { ...CybersecuritySentinelPreferenceManager.DEFAULTS };
    this._persist();
    this._notify('*', this.state);
    return { ...this.state };
  }

  /**
   * Exports preferences serialized as formatted JSON
   * @param {boolean} [pretty=true]
   * @returns {string}
   */
  exportJSON(pretty = true) {
    const payload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schema: 'cybersecurity_sentinel_preferences',
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
        ...CybersecuritySentinelPreferenceManager.DEFAULTS,
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
   * Subscribes to preference updates
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
   * Persists state to storage if available
   * @private
   */
  _persist() {
    if (!this.storage) return;
    try {
      this.storage.setItem(
        CybersecuritySentinelPreferenceManager.STORAGE_KEY,
        JSON.stringify(this.state)
      );
    } catch (err) {
      console.warn('CybersecuritySentinelPreferenceManager: Failed to persist to storage', err);
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
    const manager = new CybersecuritySentinelPreferenceManager();

    const modal = document.getElementById('cybersecurity-sentinel-preferences-modal');
    const btnOpen = document.getElementById('openPreferencesBtn');
    const btnClose = document.getElementById('closePreferencesBtn');
    const btnReset = document.getElementById('btnResetPrefs');
    const btnExport = document.getElementById('btnExportPrefs');
    const toast = document.getElementById('prefToast');

    const inputTheme = document.getElementById('prefTheme');
    const inputLayout = document.getElementById('prefViewLayout');
    const inputThreshold = document.getElementById('prefAlertThreshold');
    const inputInterval = document.getElementById('prefPollingInterval');
    const inputSound = document.getElementById('prefSoundCues');
    const inputHighContrast = document.getElementById('prefHighContrast');
    const inputAutoMitigation = document.getElementById('prefAutoMitigation');
    const inputLogDensity = document.getElementById('prefLogDensity');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2800);
    }

    function syncFormWithState() {
      const state = manager.getAll();
      if (inputTheme) inputTheme.value = state.theme || 'cyber-terminal';
      if (inputLayout) inputLayout.value = state.viewLayout || 'threat-matrix';
      if (inputThreshold) inputThreshold.value = state.alertSeverityThreshold || 'medium';
      if (inputInterval) inputInterval.value = state.pollingInterval || 15;
      if (inputSound) inputSound.checked = Boolean(state.soundCues);
      if (inputHighContrast) inputHighContrast.checked = Boolean(state.highContrast);
      if (inputAutoMitigation) inputAutoMitigation.checked = Boolean(state.autoMitigation);
      if (inputLogDensity) inputLogDensity.value = state.logDensity || 'detailed';
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

    if (inputThreshold) {
      inputThreshold.addEventListener('change', (e) => {
        manager.save('alertSeverityThreshold', e.target.value);
        showToast(`Alert threshold set to ${e.target.value}`);
      });
    }

    if (inputInterval) {
      inputInterval.addEventListener('change', (e) => {
        manager.save('pollingInterval', Number(e.target.value));
        showToast(`Polling interval set to ${e.target.value}s`);
      });
    }

    if (inputSound) {
      inputSound.addEventListener('change', (e) => {
        manager.save('soundCues', e.target.checked);
        showToast(`Incident sound alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputHighContrast) {
      inputHighContrast.addEventListener('change', (e) => {
        manager.save('highContrast', e.target.checked);
        showToast(`High contrast ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputAutoMitigation) {
      inputAutoMitigation.addEventListener('change', (e) => {
        manager.save('autoMitigation', e.target.checked);
        showToast(`Automated firewall mitigation ${e.target.checked ? 'enabled' : 'disabled'}`);
      });
    }

    if (inputLogDensity) {
      inputLogDensity.addEventListener('change', (e) => {
        manager.save('logDensity', e.target.value);
        showToast(`Log density set to ${e.target.value}`);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        manager.resetDefaults();
        syncFormWithState();
        showToast('All sentinel preferences restored to defaults');
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
