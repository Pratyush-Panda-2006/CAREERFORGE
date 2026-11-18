/**
 * Gaming Esports Hub - Adaptive User Settings & Preference Persistence State Engine
 * Issue #607 - Level 3 Core Feature
 *
 * Implements client-side state machine managing esports arena viewing preferences,
 * broadcast stream bitrates, tournament bracket displays, high-contrast modes,
 * and audio sound cues with LocalStorage persistence and JSON import/export.
 */

export class GamingEsportsHubPreferenceManager {
  static STORAGE_KEY = 'gaming_esports_hub_preferences_v1';

  static DEFAULTS = Object.freeze({
    theme: 'cyberpunk-neon',
    layout: 'grid',
    streamQuality: '1080p60',
    region: 'NA',
    soundCues: true,
    highContrast: false,
    autoPlayClips: true,
    chatDensity: 'compact'
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
      return { ...GamingEsportsHubPreferenceManager.DEFAULTS };
    }

    try {
      const raw = this.storage.getItem(GamingEsportsHubPreferenceManager.STORAGE_KEY);
      if (!raw) {
        return { ...GamingEsportsHubPreferenceManager.DEFAULTS };
      }
      const parsed = JSON.parse(raw);
      return { ...GamingEsportsHubPreferenceManager.DEFAULTS, ...parsed };
    } catch {
      return { ...GamingEsportsHubPreferenceManager.DEFAULTS };
    }
  }

  /**
   * Retrieves specific preference value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Returns snapshot of all preferences
   * @returns {object}
   */
  getAll() {
    return { ...this.state };
  }

  /**
   * Persists a key-value preference update
   * @param {string} key
   * @param {*} val
   * @returns {boolean}
   */
  save(key, val) {
    if (typeof key !== 'string' || key.trim() === '') {
      return false;
    }

    this.state[key] = val;

    if (this.storage) {
      try {
        this.storage.setItem(
          GamingEsportsHubPreferenceManager.STORAGE_KEY,
          JSON.stringify(this.state)
        );
      } catch {
        return false;
      }
    }

    this._notify(key, val);
    return true;
  }

  /**
   * Resets all preferences back to initial default configuration
   * @returns {object}
   */
  resetDefaults() {
    this.state = { ...GamingEsportsHubPreferenceManager.DEFAULTS };

    if (this.storage) {
      try {
        this.storage.removeItem(GamingEsportsHubPreferenceManager.STORAGE_KEY);
      } catch {
        // storage silent fail
      }
    }

    this._notify('*', this.state);
    return { ...this.state };
  }

  /**
   * Serializes current preferences into formatted JSON
   * @returns {string}
   */
  exportJSON() {
    const payload = {
      schemaVersion: '1.0',
      system: 'Gaming Esports Hub Core',
      exportedAt: new Date().toISOString(),
      preferences: this.state
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Hydrates preferences from an external JSON string payload
   * @param {string} jsonString
   * @returns {boolean}
   */
  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const incoming = parsed.preferences || parsed;

      if (!incoming || typeof incoming !== 'object') {
        return false;
      }

      for (const [k, v] of Object.entries(incoming)) {
        if (k in GamingEsportsHubPreferenceManager.DEFAULTS) {
          this.state[k] = v;
        }
      }

      if (this.storage) {
        this.storage.setItem(
          GamingEsportsHubPreferenceManager.STORAGE_KEY,
          JSON.stringify(this.state)
        );
      }

      this._notify('*', this.state);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Registers change event listener
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Subscriber must be a callable function');
    }
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Internal notification emitter
   * @param {string} key
   * @param {*} val
   */
  _notify(key, val) {
    this.listeners.forEach(cb => {
      try {
        cb(key, val, this.state);
      } catch {
        // prevent handler exceptions from crashing manager
      }
    });
  }
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new GamingEsportsHubPreferenceManager();
    const modal = document.getElementById('gaming-esports-hub-preferences-modal');
    const openBtn = document.getElementById('openPreferencesBtn');
    const closeBtn = document.getElementById('closePreferencesBtn');
    const resetBtn = document.getElementById('resetPreferencesBtn');
    const exportBtn = document.getElementById('exportPreferencesBtn');

    if (!modal) return;

    function syncUI() {
      const all = manager.getAll();
      const themeSelect = document.getElementById('prefTheme');
      const layoutSelect = document.getElementById('prefLayout');
      const qualitySelect = document.getElementById('prefQuality');
      const regionSelect = document.getElementById('prefRegion');
      const soundToggle = document.getElementById('prefSoundCues');
      const contrastToggle = document.getElementById('prefHighContrast');
      const autoPlayToggle = document.getElementById('prefAutoPlay');

      if (themeSelect) themeSelect.value = all.theme;
      if (layoutSelect) layoutSelect.value = all.layout;
      if (qualitySelect) qualitySelect.value = all.streamQuality;
      if (regionSelect) regionSelect.value = all.region;
      if (soundToggle) soundToggle.checked = Boolean(all.soundCues);
      if (contrastToggle) contrastToggle.checked = Boolean(all.highContrast);
      if (autoPlayToggle) autoPlayToggle.checked = Boolean(all.autoPlayClips);
    }

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        syncUI();
        modal.classList.add('open');
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        manager.resetDefaults();
        syncUI();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = manager.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esports-preferences-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const fieldMap = [
      ['prefTheme', 'theme'],
      ['prefLayout', 'layout'],
      ['prefQuality', 'streamQuality'],
      ['prefRegion', 'region'],
      ['prefSoundCues', 'soundCues', true],
      ['prefHighContrast', 'highContrast', true],
      ['prefAutoPlay', 'autoPlayClips', true]
    ];

    fieldMap.forEach(([elemId, key, isCheckbox]) => {
      const elem = document.getElementById(elemId);
      if (!elem) return;
      elem.addEventListener('change', () => {
        const val = isCheckbox ? elem.checked : elem.value;
        manager.save(key, val);
      });
    });

    syncUI();
  });
}
