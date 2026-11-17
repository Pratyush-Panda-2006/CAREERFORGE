/**
 * Supply Chain Logistics - Adaptive User Settings & Preference Persistence Engine
 * Issue #683 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsPreferenceManager {
  static STORAGE_KEY = 'supply_chain_logistics_preferences_v1';

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
    this.storageKey = options.storageKey || SupplyChainLogisticsPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...SupplyChainLogisticsPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load supply chain preferences from storage:', e);
    }
    return { ...SupplyChainLogisticsPreferenceManager.DEFAULTS };
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
    this.preferences = { ...SupplyChainLogisticsPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to clear supply chain storage:', e);
    }
    this._notify('*', this.preferences);
    this.applyToDOM();
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      system: 'Supply Chain Logistics Core',
      exportedAt: new Date().toISOString(),
      preferences: this.preferences
    }, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      const incoming = parsed.preferences || parsed;
      this.preferences = { ...SupplyChainLogisticsPreferenceManager.DEFAULTS, ...incoming };
      this._persist();
      this._notify('*', this.preferences);
      this.applyToDOM();
      return true;
    } catch (e) {
      console.error('Failed to import JSON preferences:', e);
      return false;
    }
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
      return () => this.listeners.delete(callback);
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

  _notify(key, val) {
    for (const cb of this.listeners) {
      try {
        cb(key, val, this.preferences);
      } catch (err) {
        console.error('Preference listener error:', err);
      }
    }
  }

  applyToDOM() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (this.preferences.highContrast) {
      root.setAttribute('data-high-contrast', 'true');
    } else {
      root.removeAttribute('data-high-contrast');
    }

    if (this.preferences.compactMode) {
      root.setAttribute('data-compact-mode', 'true');
    } else {
      root.removeAttribute('data-compact-mode');
    }

    root.setAttribute('data-theme', this.preferences.theme || 'dark');
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;

    const modal = container.querySelector('#supply-chain-logistics-preferences-modal');
    const openBtn = container.querySelector('#open-preferences-btn');
    const closeBtn = container.querySelector('#close-preferences-btn');
    const resetBtn = container.querySelector('#reset-defaults-btn');
    const exportBtn = container.querySelector('#export-settings-btn');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        this.syncFormFields(container);
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetDefaults();
        this.syncFormFields(container);
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = this.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `supply-chain-preferences-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Input change listeners
    const inputs = container.querySelectorAll('[data-pref-key]');
    inputs.forEach((input) => {
      input.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-pref-key');
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        this.save(key, val);
      });
    });

    this.applyToDOM();
  }

  syncFormFields(container = document) {
    const inputs = container.querySelectorAll('[data-pref-key]');
    inputs.forEach((input) => {
      const key = input.getAttribute('data-pref-key');
      const val = this.get(key);
      if (input.type === 'checkbox') {
        input.checked = Boolean(val);
      } else {
        input.value = val;
      }
    });
  }
}

if (typeof window !== 'undefined') {
  window.SupplyChainLogisticsPreferenceManager = SupplyChainLogisticsPreferenceManager;
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new SupplyChainLogisticsPreferenceManager();
    manager.initUI();
  });
}
