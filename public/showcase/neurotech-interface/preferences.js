/**
 * Neurotech Interface - Adaptive User Settings & Preference Persistence State Engine
 * Issue #691 - NSoC '26 Level 3 Feature
 */

export class NeurotechInterfacePreferenceManager {
  static DEFAULT_PREFERENCES = {
    theme: 'neural-violet',
    eegBandFilter: 'all-bands', // 'alpha', 'beta', 'theta', 'gamma', 'all-bands'
    sampleRateHz: 250,
    artifactRejection: true,
    hapticFeedback: false,
    notchFilter60Hz: true,
    impedanceCheckEnabled: true,
    highContrastWaves: false
  };

  constructor(storageKey = 'neurotech_preferences_v1', storageBackend = null) {
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
        return { ...NeurotechInterfacePreferenceManager.DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Fallback on error
    }
    return { ...NeurotechInterfacePreferenceManager.DEFAULT_PREFERENCES };
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
      // Non-blocking quota failure
    }
    return { ...this.preferences };
  }

  get(key) {
    return this.preferences[key];
  }

  resetDefaults() {
    this.preferences = { ...NeurotechInterfacePreferenceManager.DEFAULT_PREFERENCES };
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
        this.preferences = { ...NeurotechInterfacePreferenceManager.DEFAULT_PREFERENCES, ...parsed };
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
  window.NeurotechInterfacePreferenceManager = NeurotechInterfacePreferenceManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new NeurotechInterfacePreferenceManager();
    const modal = document.getElementById('neurotech-interface-preferences-modal');
    const openBtn = document.getElementById('open-preferences-btn');
    const closeBtn = document.getElementById('close-preferences-btn');
    const resetBtn = document.getElementById('reset-preferences-btn');
    const exportBtn = document.getElementById('export-preferences-btn');

    const bandSelect = document.getElementById('pref-eeg-band');
    const sampleRateSelect = document.getElementById('pref-sample-rate');
    const artifactToggle = document.getElementById('pref-artifact-rejection');
    const notchToggle = document.getElementById('pref-notch-filter');

    const syncUiFromState = () => {
      const prefs = manager.load();
      if (bandSelect) bandSelect.value = prefs.eegBandFilter;
      if (sampleRateSelect) sampleRateSelect.value = String(prefs.sampleRateHz);
      if (artifactToggle) artifactToggle.checked = prefs.artifactRejection;
      if (notchToggle) notchToggle.checked = prefs.notchFilter60Hz;
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

    if (bandSelect) {
      bandSelect.addEventListener('change', (e) => manager.save('eegBandFilter', e.target.value));
    }
    if (sampleRateSelect) {
      sampleRateSelect.addEventListener('change', (e) => manager.save('sampleRateHz', parseInt(e.target.value, 10)));
    }
    if (artifactToggle) {
      artifactToggle.addEventListener('change', (e) => manager.save('artifactRejection', e.target.checked));
    }
    if (notchToggle) {
      notchToggle.addEventListener('change', (e) => manager.save('notchFilter60Hz', e.target.checked));
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
