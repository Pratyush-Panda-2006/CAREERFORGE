/**
 * Real Estate Luxe - Adaptive User Settings & Preference Persistence State Engine
 * Issue #599 - Level 3 Core Feature
 *
 * Implements client-side state machine managing luxury real estate viewing preferences,
 * currency/unit selections, interactive map rendering styles, high-contrast modes,
 * and audio cues with LocalStorage persistence and JSON import/export.
 */

export class RealEstateLuxePreferenceManager {
  static STORAGE_KEY = 'real_estate_luxe_preferences_v1';

  static DEFAULTS = Object.freeze({
    theme: 'dark-luxe',
    layout: 'grid',
    currency: 'USD',
    metricUnits: 'sqft',
    soundCues: true,
    highContrast: false,
    priceDisplay: 'standard',
    mapStyle: 'satellite-dark'
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
      return { ...RealEstateLuxePreferenceManager.DEFAULTS };
    }

    try {
      const raw = this.storage.getItem(RealEstateLuxePreferenceManager.STORAGE_KEY);
      if (!raw) {
        return { ...RealEstateLuxePreferenceManager.DEFAULTS };
      }
      const parsed = JSON.parse(raw);
      return { ...RealEstateLuxePreferenceManager.DEFAULTS, ...parsed };
    } catch {
      return { ...RealEstateLuxePreferenceManager.DEFAULTS };
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
          RealEstateLuxePreferenceManager.STORAGE_KEY,
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
    this.state = { ...RealEstateLuxePreferenceManager.DEFAULTS };

    if (this.storage) {
      try {
        this.storage.removeItem(RealEstateLuxePreferenceManager.STORAGE_KEY);
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
      system: 'Real Estate Luxe Core',
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
        if (k in RealEstateLuxePreferenceManager.DEFAULTS) {
          this.state[k] = v;
        }
      }

      if (this.storage) {
        this.storage.setItem(
          RealEstateLuxePreferenceManager.STORAGE_KEY,
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
    const manager = new RealEstateLuxePreferenceManager();
    const modal = document.getElementById('real-estate-luxe-preferences-modal');
    const openBtn = document.getElementById('openPreferencesBtn');
    const closeBtn = document.getElementById('closePreferencesBtn');
    const resetBtn = document.getElementById('resetPreferencesBtn');
    const exportBtn = document.getElementById('exportPreferencesBtn');

    if (!modal) return;

    function syncUI() {
      const all = manager.getAll();
      const themeSelect = document.getElementById('prefTheme');
      const layoutSelect = document.getElementById('prefLayout');
      const currencySelect = document.getElementById('prefCurrency');
      const unitsSelect = document.getElementById('prefUnits');
      const soundToggle = document.getElementById('prefSoundCues');
      const contrastToggle = document.getElementById('prefHighContrast');

      if (themeSelect) themeSelect.value = all.theme;
      if (layoutSelect) layoutSelect.value = all.layout;
      if (currencySelect) currencySelect.value = all.currency;
      if (unitsSelect) unitsSelect.value = all.metricUnits;
      if (soundToggle) soundToggle.checked = Boolean(all.soundCues);
      if (contrastToggle) contrastToggle.checked = Boolean(all.highContrast);
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
        a.download = `luxe-preferences-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const fieldMap = [
      ['prefTheme', 'theme'],
      ['prefLayout', 'layout'],
      ['prefCurrency', 'currency'],
      ['prefUnits', 'metricUnits'],
      ['prefSoundCues', 'soundCues', true],
      ['prefHighContrast', 'highContrast', true]
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
