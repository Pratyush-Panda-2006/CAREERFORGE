/**
 * Culinary Bistro - Adaptive User Settings & Preference Persistence State Engine
 * Issue #595 - Level 3 Core Feature
 *
 * Implements client-side state machine managing bistro guest and kitchen preferences
 * (theme, temperature units, dietary alerts, table seating density, high contrast, sound cues)
 * with LocalStorage persistence, JSON configuration export/import, and reset capabilities.
 */

export class CulinaryBistroPreferenceManager {
  static STORAGE_KEY = 'culinary_bistro_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    layout: 'grid',
    temperatureUnit: 'celsius',
    currency: 'USD',
    soundCues: true,
    highContrast: false,
    dietaryAlerts: true,
    tableDensity: 'spacious'
  };

  /**
   * @param {object} [options={}]
   * @param {Storage} [options.storage]
   * @param {string} [options.storageKey]
   */
  constructor(options = {}) {
    this.storage =
      options.storage ||
      (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.storageKey = options.storageKey || CulinaryBistroPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  /**
   * Loads preferences from storage or falls back to defaults
   * @returns {object}
   */
  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...CulinaryBistroPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load Culinary Bistro preferences from storage:', e);
    }
    return { ...CulinaryBistroPreferenceManager.DEFAULTS };
  }

  /**
   * Updates and persists a single preference value
   * @param {string} key
   * @param {*} val
   * @returns {boolean}
   */
  save(key, val) {
    if (key === undefined || key === null) return false;
    this.preferences[key] = val;
    this._persist();
    this._notify(key, val);
    this.applyToDOM();
    return true;
  }

  /**
   * Retrieves single preference value
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.preferences[key];
  }

  /**
   * Returns copy of all current preferences
   * @returns {object}
   */
  getAll() {
    return { ...this.preferences };
  }

  /**
   * Persists current preferences into storage
   * @private
   */
  _persist() {
    try {
      if (this.storage) {
        this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
      }
    } catch (e) {
      console.warn('Failed to persist Culinary Bistro preferences:', e);
    }
  }

  /**
   * Resets all preferences back to factory defaults
   * @returns {object}
   */
  resetDefaults() {
    this.preferences = { ...CulinaryBistroPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to clear Culinary Bistro storage:', e);
    }
    this._notify('*', this.preferences);
    this.applyToDOM();
    return { ...this.preferences };
  }

  /**
   * Exports preferences as formatted JSON string
   * @returns {string}
   */
  exportJSON() {
    return JSON.stringify(
      {
        schemaVersion: '1.0',
        system: 'Culinary Bistro Core',
        exportedAt: new Date().toISOString(),
        preferences: this.preferences
      },
      null,
      2
    );
  }

  /**
   * Hydrates preferences from JSON string or object
   * @param {string|object} jsonInput
   * @returns {boolean}
   */
  importJSON(jsonInput) {
    try {
      const data = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
      const targetPrefs = data.preferences || data;
      const merged = { ...this.preferences };

      for (const key of Object.keys(CulinaryBistroPreferenceManager.DEFAULTS)) {
        if (key in targetPrefs) {
          merged[key] = targetPrefs[key];
        }
      }

      this.preferences = merged;
      this._persist();
      this._notify('*', this.preferences);
      this.applyToDOM();
      return true;
    } catch (e) {
      console.error('Failed to import Culinary Bistro preferences:', e);
      return false;
    }
  }

  /**
   * Subscribes a listener to preference change events
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
    }
    return () => {};
  }

  /**
   * Notifies active subscribers
   * @param {string} key
   * @param {*} value
   * @private
   */
  _notify(key, value) {
    for (const listener of this.listeners) {
      try {
        listener(key, value, this.preferences);
      } catch (err) {
        console.error('Error invoking preference listener:', err);
      }
    }
  }

  /**
   * Applies active preference settings to document DOM
   */
  applyToDOM() {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    root.setAttribute('data-theme', this.preferences.theme);
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }

    root.setAttribute('data-temp-unit', this.preferences.temperatureUnit);
    root.setAttribute('data-currency', this.preferences.currency);
    root.setAttribute('data-density', this.preferences.tableDensity);
  }
}

// Browser Interactive UI wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new CulinaryBistroPreferenceManager();
    manager.applyToDOM();

    const modal = document.getElementById('culinary-bistro-preferences-modal');
    const openBtn = document.getElementById('btnOpenPreferences');
    const closeBtn = document.getElementById('btnClosePreferences');
    const resetBtn = document.getElementById('btnResetPreferences');
    const exportBtn = document.getElementById('btnExportPreferences');
    const importFileInput = document.getElementById('importPreferencesFile');
    const toast = document.getElementById('preferencesToast');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2500);
    }

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => modal.classList.add('open'));
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    }

    const themeSelect = document.getElementById('prefTheme');
    const tempSelect = document.getElementById('prefTempUnit');
    const currencySelect = document.getElementById('prefCurrency');
    const densitySelect = document.getElementById('prefTableDensity');
    const contrastToggle = document.getElementById('prefHighContrast');
    const soundToggle = document.getElementById('prefSoundCues');
    const dietaryToggle = document.getElementById('prefDietaryAlerts');

    function syncControls() {
      const prefs = manager.getAll();
      if (themeSelect) themeSelect.value = prefs.theme;
      if (tempSelect) tempSelect.value = prefs.temperatureUnit;
      if (currencySelect) currencySelect.value = prefs.currency;
      if (densitySelect) densitySelect.value = prefs.tableDensity;
      if (contrastToggle) contrastToggle.checked = Boolean(prefs.highContrast);
      if (soundToggle) soundToggle.checked = Boolean(prefs.soundCues);
      if (dietaryToggle) dietaryToggle.checked = Boolean(prefs.dietaryAlerts);
    }

    syncControls();

    if (themeSelect) {
      themeSelect.addEventListener('change', e => manager.save('theme', e.target.value));
    }
    if (tempSelect) {
      tempSelect.addEventListener('change', e => manager.save('temperatureUnit', e.target.value));
    }
    if (currencySelect) {
      currencySelect.addEventListener('change', e => manager.save('currency', e.target.value));
    }
    if (densitySelect) {
      densitySelect.addEventListener('change', e => manager.save('tableDensity', e.target.value));
    }
    if (contrastToggle) {
      contrastToggle.addEventListener('change', e => manager.save('highContrast', e.target.checked));
    }
    if (soundToggle) {
      soundToggle.addEventListener('change', e => manager.save('soundCues', e.target.checked));
    }
    if (dietaryToggle) {
      dietaryToggle.addEventListener('change', e => manager.save('dietaryAlerts', e.target.checked));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        manager.resetDefaults();
        syncControls();
        showToast('Culinary preferences restored to defaults!');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = manager.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'culinary-bistro-preferences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Culinary preferences exported!');
      });
    }

    if (importFileInput) {
      importFileInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const success = manager.importJSON(ev.target.result);
          if (success) {
            syncControls();
            showToast('Preferences imported successfully!');
          } else {
            showToast('Failed to import preferences JSON.');
          }
        };
        reader.readAsText(file);
      });
    }
  });
}
