/**
 * Festival Hub - Adaptive User Settings & Preference Persistence Engine
 * Issue #579 - NSoC '26 Level 3 Feature
 */

export class FestivalHubPreferenceManager {
  static STORAGE_KEY = 'festival_hub_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    viewLayout: 'grid',
    soundCues: false,
    highContrast: false,
    metricUnits: 'metric',
    lineupNotifications: true,
    audioVolume: 80
  };

  constructor(options = {}) {
    this.storage = options.storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.storageKey = options.storageKey || FestivalHubPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...FestivalHubPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load Festival Hub preferences from storage:', e);
    }
    return { ...FestivalHubPreferenceManager.DEFAULTS };
  }

  save(key, val) {
    if (key === undefined || key === null) return false;
    this.preferences[key] = val;
    this._persist();
    this._notify(key, val);
    this.applyToDOM();
    return true;
  }

  get(key) {
    return this.preferences[key];
  }

  getAll() {
    return { ...this.preferences };
  }

  resetDefaults() {
    this.preferences = { ...FestivalHubPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to clear Festival Hub storage:', e);
    }
    this._notify('*', this.preferences);
    this.applyToDOM();
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      preferences: this.preferences
    }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const targetPrefs = data.preferences || data;
      const merged = { ...this.preferences };
      for (const key of Object.keys(FestivalHubPreferenceManager.DEFAULTS)) {
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
      console.error('Failed to import Festival Hub preferences JSON:', e);
      return false;
    }
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }

  _persist() {
    try {
      if (this.storage) {
        this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
      }
    } catch (e) {
      console.warn('Failed to persist preferences to storage:', e);
    }
  }

  _notify(key, value) {
    for (const listener of this.listeners) {
      try {
        listener(key, value, { ...this.preferences });
      } catch (err) {
        console.error('Error in preference listener:', err);
      }
    }
  }

  applyToDOM() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    const root = document.documentElement;
    if (this.preferences.highContrast) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }
    if (this.preferences.theme) {
      root.setAttribute('data-theme', this.preferences.theme);
    }
    if (this.preferences.viewLayout) {
      root.setAttribute('data-festival-layout', this.preferences.viewLayout);
    }
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;
    const modal = container.querySelector('#festival-hub-preferences-modal');
    const openBtn = container.querySelector('#festivalHubPreferencesTriggerBtn');
    const closeBtn = container.querySelector('#festivalHubPreferencesCloseBtn');
    const resetBtn = container.querySelector('#festivalHubResetPreferencesBtn');
    const exportBtn = container.querySelector('#festivalHubExportPreferencesBtn');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    }

    const soundToggle = container.querySelector('#festivalPrefSoundCues');
    if (soundToggle) {
      soundToggle.checked = Boolean(this.preferences.soundCues);
      soundToggle.addEventListener('change', (e) => {
        this.save('soundCues', e.target.checked);
      });
    }

    const contrastToggle = container.querySelector('#festivalPrefHighContrast');
    if (contrastToggle) {
      contrastToggle.checked = Boolean(this.preferences.highContrast);
      contrastToggle.addEventListener('change', (e) => {
        this.save('highContrast', e.target.checked);
      });
    }

    const notifyToggle = container.querySelector('#festivalPrefLineupNotif');
    if (notifyToggle) {
      notifyToggle.checked = Boolean(this.preferences.lineupNotifications);
      notifyToggle.addEventListener('change', (e) => {
        this.save('lineupNotifications', e.target.checked);
      });
    }

    const layoutSelect = container.querySelector('#festivalPrefViewLayout');
    if (layoutSelect) {
      layoutSelect.value = this.preferences.viewLayout || 'grid';
      layoutSelect.addEventListener('change', (e) => {
        this.save('viewLayout', e.target.value);
      });
    }

    const unitsSelect = container.querySelector('#festivalPrefMetricUnits');
    if (unitsSelect) {
      unitsSelect.value = this.preferences.metricUnits || 'metric';
      unitsSelect.addEventListener('change', (e) => {
        this.save('metricUnits', e.target.value);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetDefaults();
        if (soundToggle) soundToggle.checked = Boolean(this.preferences.soundCues);
        if (contrastToggle) contrastToggle.checked = Boolean(this.preferences.highContrast);
        if (notifyToggle) notifyToggle.checked = Boolean(this.preferences.lineupNotifications);
        if (layoutSelect) layoutSelect.value = this.preferences.viewLayout;
        if (unitsSelect) unitsSelect.value = this.preferences.metricUnits;
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'festival-hub-preferences.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    this.applyToDOM();
  }
}

if (typeof window !== 'undefined') {
  window.FestivalHubPreferenceManager = FestivalHubPreferenceManager;
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      const pm = new FestivalHubPreferenceManager();
      pm.initUI();
    });
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.FestivalHubPreferenceManager = FestivalHubPreferenceManager;
}

export default FestivalHubPreferenceManager;
