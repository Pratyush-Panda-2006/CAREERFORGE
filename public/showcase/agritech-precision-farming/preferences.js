/**
 * Agritech Precision Farming - Adaptive User Settings & Preference Persistence State Engine
 * Issue #718 - NSoC '26 Level 3 Feature
 */

export class AgritechPrecisionFarmingPreferenceManager {
  static DEFAULT_PREFERENCES = {
    theme: 'dark-emerald',
    viewLayout: 'grid',
    soundCues: true,
    highContrast: false,
    metricUnits: 'metric', // metric (celsius/ha/kg) vs imperial (fahrenheit/acres/lbs)
    autoRefreshIntervalSec: 30,
    soilMoistureAlertThreshold: 25,
    notificationsEnabled: true
  };

  constructor(storageKey = 'agritech_preferences_v1', storageBackend = null) {
    this.storageKey = storageKey;
    if (storageBackend) {
      this.storage = storageBackend;
    } else if (typeof localStorage !== 'undefined') {
      this.storage = localStorage;
    } else {
      this.storage = new InMemoryStorage();
    }
    this.preferences = this.load();
  }

  load() {
    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        return { ...AgritechPrecisionFarmingPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Fallback to defaults on parse failure
    }
    return { ...AgritechPrecisionFarmingPreferenceManager.DEFAULT_PREFERENCES };
  }

  save(key, val) {
    if (typeof key === 'object' && key !== null) {
      this.preferences = { ...this.preferences, ...key };
    } else if (typeof key === 'string') {
      this.preferences[key] = val;
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch {
      // Non-blocking storage quota handling
    }
    return { ...this.preferences };
  }

  get(key) {
    return this.preferences[key];
  }

  resetDefaults() {
    this.preferences = { ...AgritechPrecisionFarmingPreferenceManager.DEFAULT_PREFERENCES };
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
    } catch {
      // Non-blocking
    }
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify(this.preferences, null, 2);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        this.preferences = { ...AgritechPrecisionFarmingPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
        this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
}

class InMemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.AgritechPrecisionFarmingPreferenceManager = AgritechPrecisionFarmingPreferenceManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new AgritechPrecisionFarmingPreferenceManager();
    const modal = document.getElementById('agritech-precision-farming-preferences-modal');
    const openBtn = document.getElementById('open-preferences-btn');
    const closeBtn = document.getElementById('close-preferences-btn');
    const resetBtn = document.getElementById('reset-preferences-btn');
    const exportBtn = document.getElementById('export-preferences-btn');

    const layoutSelect = document.getElementById('pref-view-layout');
    const unitsSelect = document.getElementById('pref-metric-units');
    const soundToggle = document.getElementById('pref-sound-cues');
    const contrastToggle = document.getElementById('pref-high-contrast');

    const syncUiFromState = () => {
      const prefs = manager.load();
      if (layoutSelect) layoutSelect.value = prefs.viewLayout;
      if (unitsSelect) unitsSelect.value = prefs.metricUnits;
      if (soundToggle) soundToggle.checked = prefs.soundCues;
      if (contrastToggle) contrastToggle.checked = prefs.highContrast;
    };

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        syncUiFromState();
        modal.classList.add('active');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
      });
    }

    if (layoutSelect) {
      layoutSelect.addEventListener('change', (e) => manager.save('viewLayout', e.target.value));
    }
    if (unitsSelect) {
      unitsSelect.addEventListener('change', (e) => manager.save('metricUnits', e.target.value));
    }
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => manager.save('soundCues', e.target.checked));
    }
    if (contrastToggle) {
      contrastToggle.addEventListener('change', (e) => manager.save('highContrast', e.target.checked));
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        manager.resetDefaults();
        syncUiFromState();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = manager.exportJSON();
        navigator.clipboard?.writeText(json);
        exportBtn.textContent = 'Copied JSON!';
        setTimeout(() => { exportBtn.textContent = 'Export Configuration'; }, 1500);
      });
    }

    syncUiFromState();
  });
}
