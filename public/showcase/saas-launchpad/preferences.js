/**
 * SaaS Launchpad - Adaptive User Settings & Preference Persistence Engine
 * Issue #583 - NSoC '26 Level 3 Feature
 */

export class SaasLaunchpadPreferenceManager {
  static STORAGE_KEY = 'saas_launchpad_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    telemetryRefreshRate: 5,
    compactMode: false,
    highContrast: false,
    notificationSound: true,
    defaultTimeframe: '24H',
    dataRetentionDays: 30
  };

  constructor(options = {}) {
    this.storage = options.storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.storageKey = options.storageKey || SaasLaunchpadPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...SaasLaunchpadPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load SaaS Launchpad preferences from storage:', e);
    }
    return { ...SaasLaunchpadPreferenceManager.DEFAULTS };
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
    this.preferences = { ...SaasLaunchpadPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to clear SaaS Launchpad storage:', e);
    }
    this._notify('*', this.preferences);
    this.applyToDOM();
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      system: 'SaaS Launchpad Core',
      exportedAt: new Date().toISOString(),
      preferences: this.preferences
    }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      const targetPrefs = data.preferences || data;
      const merged = { ...this.preferences };
      for (const key of Object.keys(SaasLaunchpadPreferenceManager.DEFAULTS)) {
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
      console.error('Failed to import SaaS Launchpad preferences JSON:', e);
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
    if (this.preferences.compactMode) {
      root.classList.add('compact-view-mode');
    } else {
      root.classList.remove('compact-view-mode');
    }
    if (this.preferences.theme) {
      root.setAttribute('data-theme', this.preferences.theme);
    }
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;

    const modal = container.querySelector('#saas-launchpad-preferences-modal');
    const openBtn = container.querySelector('#saasPreferencesTriggerBtn');
    const closeBtn = container.querySelector('#saasPreferencesCloseBtn');
    const resetBtn = container.querySelector('#saasResetPreferencesBtn');
    const exportBtn = container.querySelector('#saasExportPreferencesBtn');

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

    const soundToggle = container.querySelector('#saasPrefSoundToggle');
    if (soundToggle) {
      soundToggle.checked = Boolean(this.preferences.notificationSound);
      soundToggle.addEventListener('change', (e) => {
        this.save('notificationSound', e.target.checked);
      });
    }

    const contrastToggle = container.querySelector('#saasPrefHighContrastToggle');
    if (contrastToggle) {
      contrastToggle.checked = Boolean(this.preferences.highContrast);
      contrastToggle.addEventListener('change', (e) => {
        this.save('highContrast', e.target.checked);
      });
    }

    const compactToggle = container.querySelector('#saasPrefCompactToggle');
    if (compactToggle) {
      compactToggle.checked = Boolean(this.preferences.compactMode);
      compactToggle.addEventListener('change', (e) => {
        this.save('compactMode', e.target.checked);
      });
    }

    const refreshSelect = container.querySelector('#saasPrefRefreshSelect');
    if (refreshSelect) {
      refreshSelect.value = String(this.preferences.telemetryRefreshRate || 5);
      refreshSelect.addEventListener('change', (e) => {
        this.save('telemetryRefreshRate', Number(e.target.value));
      });
    }

    const timeframeSelect = container.querySelector('#saasPrefTimeframeSelect');
    if (timeframeSelect) {
      timeframeSelect.value = this.preferences.defaultTimeframe || '24H';
      timeframeSelect.addEventListener('change', (e) => {
        this.save('defaultTimeframe', e.target.value);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetDefaults();
        if (soundToggle) soundToggle.checked = Boolean(this.preferences.notificationSound);
        if (contrastToggle) contrastToggle.checked = Boolean(this.preferences.highContrast);
        if (compactToggle) compactToggle.checked = Boolean(this.preferences.compactMode);
        if (refreshSelect) refreshSelect.value = String(this.preferences.telemetryRefreshRate);
        if (timeframeSelect) timeframeSelect.value = this.preferences.defaultTimeframe;
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'saas-launchpad-preferences.json';
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
  window.SaasLaunchpadPreferenceManager = SaasLaunchpadPreferenceManager;
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('DOMContentLoaded', () => {
      const sp = new SaasLaunchpadPreferenceManager();
      sp.initUI();
    });
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.SaasLaunchpadPreferenceManager = SaasLaunchpadPreferenceManager;
}

export default SaasLaunchpadPreferenceManager;
