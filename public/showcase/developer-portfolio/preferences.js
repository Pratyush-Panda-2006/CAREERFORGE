/**
 * Developer Portfolio - Adaptive User Settings & Preference Persistence State Engine
 * Issue #587 - Level 3 Core Feature
 *
 * Implements client-side state machine managing personalized user settings
 * (theme, view layout, syntax highlighter theme, sound cues, high contrast, metric displays)
 * with LocalStorage persistence, export/import schema, and reset capabilities.
 */

export class DeveloperPortfolioPreferenceManager {
  static STORAGE_KEY = 'developer_portfolio_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    layout: 'grid',
    syntaxTheme: 'dracula',
    soundCues: false,
    highContrast: false,
    showMetrics: true,
    codeFontSize: 14,
    showLineNumbers: true
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
    this.storageKey = options.storageKey || DeveloperPortfolioPreferenceManager.STORAGE_KEY;
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
          return { ...DeveloperPortfolioPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load Developer Portfolio preferences from storage:', e);
    }
    return { ...DeveloperPortfolioPreferenceManager.DEFAULTS };
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
      console.warn('Failed to persist Developer Portfolio preferences:', e);
    }
  }

  /**
   * Resets all preferences back to factory defaults
   * @returns {object}
   */
  resetDefaults() {
    this.preferences = { ...DeveloperPortfolioPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to remove Developer Portfolio preferences key:', e);
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
        system: 'Developer Portfolio',
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

      for (const key of Object.keys(DeveloperPortfolioPreferenceManager.DEFAULTS)) {
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
      console.error('Failed to import Developer Portfolio preferences:', e);
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

    // Theme & high contrast
    root.setAttribute('data-theme', this.preferences.theme);
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }

    // Layout
    root.setAttribute('data-layout', this.preferences.layout);

    // Font size
    root.style.setProperty('--code-font-size', `${this.preferences.codeFontSize}px`);
  }
}

// Browser Interactive UI wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new DeveloperPortfolioPreferenceManager();
    manager.applyToDOM();

    const modal = document.getElementById('developer-portfolio-preferences-modal');
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

    // Sync input controls with current preferences
    const themeSelect = document.getElementById('prefTheme');
    const layoutSelect = document.getElementById('prefLayout');
    const syntaxSelect = document.getElementById('prefSyntaxTheme');
    const soundToggle = document.getElementById('prefSoundCues');
    const contrastToggle = document.getElementById('prefHighContrast');
    const metricsToggle = document.getElementById('prefShowMetrics');
    const fontSizeSlider = document.getElementById('prefCodeFontSize');
    const fontSizeVal = document.getElementById('fontSizeDisplay');

    function syncControls() {
      const prefs = manager.getAll();
      if (themeSelect) themeSelect.value = prefs.theme;
      if (layoutSelect) layoutSelect.value = prefs.layout;
      if (syntaxSelect) syntaxSelect.value = prefs.syntaxTheme;
      if (soundToggle) soundToggle.checked = Boolean(prefs.soundCues);
      if (contrastToggle) contrastToggle.checked = Boolean(prefs.highContrast);
      if (metricsToggle) metricsToggle.checked = Boolean(prefs.showMetrics);
      if (fontSizeSlider) fontSizeSlider.value = prefs.codeFontSize;
      if (fontSizeVal) fontSizeVal.textContent = `${prefs.codeFontSize}px`;
    }

    syncControls();

    if (themeSelect) {
      themeSelect.addEventListener('change', e => manager.save('theme', e.target.value));
    }
    if (layoutSelect) {
      layoutSelect.addEventListener('change', e => manager.save('layout', e.target.value));
    }
    if (syntaxSelect) {
      syntaxSelect.addEventListener('change', e => manager.save('syntaxTheme', e.target.value));
    }
    if (soundToggle) {
      soundToggle.addEventListener('change', e => manager.save('soundCues', e.target.checked));
    }
    if (contrastToggle) {
      contrastToggle.addEventListener('change', e => manager.save('highContrast', e.target.checked));
    }
    if (metricsToggle) {
      metricsToggle.addEventListener('change', e => manager.save('showMetrics', e.target.checked));
    }
    if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', e => {
        const size = parseInt(e.target.value, 10);
        if (fontSizeVal) fontSizeVal.textContent = `${size}px`;
        manager.save('codeFontSize', size);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        manager.resetDefaults();
        syncControls();
        showToast('Settings restored to defaults!');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = manager.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'developer-portfolio-preferences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Configuration exported successfully!');
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
            showToast('Configuration imported successfully!');
          } else {
            showToast('Failed to import configuration JSON.');
          }
        };
        reader.readAsText(file);
      });
    }
  });
}
