/**
 * Music DAW Studio - Adaptive User Settings & Preference Persistence State Engine
 * Issue #709 - NSoC '26 Level 3 Feature
 */

export class MusicDawStudioPreferenceManager {
  static DEFAULT_PREFERENCES = {
    theme: 'studio-neon',
    sampleRateKhz: 48, // 44.1, 48, 96 kHz
    bufferSizeSamples: 256, // 128, 256, 512, 1024
    metronomeAudio: true,
    snapToGrid: true,
    latencyCompensation: true,
    midiClockOutput: false,
    highContrastMeters: false
  };

  constructor(storageKey = 'music_daw_preferences_v1', storageBackend = null) {
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
        return { ...MusicDawStudioPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Fallback
    }
    return { ...MusicDawStudioPreferenceManager.DEFAULT_PREFERENCES };
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
    this.preferences = { ...MusicDawStudioPreferenceManager.DEFAULT_PREFERENCES };
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
        this.preferences = { ...MusicDawStudioPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
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
  window.MusicDawStudioPreferenceManager = MusicDawStudioPreferenceManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new MusicDawStudioPreferenceManager();
    const modal = document.getElementById('music-daw-studio-preferences-modal');
    const openBtn = document.getElementById('open-preferences-btn');
    const closeBtn = document.getElementById('close-preferences-btn');
    const resetBtn = document.getElementById('reset-preferences-btn');
    const exportBtn = document.getElementById('export-preferences-btn');

    const sampleRateSelect = document.getElementById('pref-sample-rate');
    const bufferSizeSelect = document.getElementById('pref-buffer-size');
    const metronomeToggle = document.getElementById('pref-metronome');
    const snapToggle = document.getElementById('pref-snap-grid');

    const syncUiFromState = () => {
      const prefs = manager.load();
      if (sampleRateSelect) sampleRateSelect.value = String(prefs.sampleRateKhz);
      if (bufferSizeSelect) bufferSizeSelect.value = String(prefs.bufferSizeSamples);
      if (metronomeToggle) metronomeToggle.checked = prefs.metronomeAudio;
      if (snapToggle) snapToggle.checked = prefs.snapToGrid;
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

    if (sampleRateSelect) {
      sampleRateSelect.addEventListener('change', (e) => manager.save('sampleRateKhz', parseFloat(e.target.value)));
    }
    if (bufferSizeSelect) {
      bufferSizeSelect.addEventListener('change', (e) => manager.save('bufferSizeSamples', parseInt(e.target.value, 10)));
    }
    if (metronomeToggle) {
      metronomeToggle.addEventListener('change', (e) => manager.save('metronomeAudio', e.target.checked));
    }
    if (snapToggle) {
      snapToggle.addEventListener('change', (e) => manager.save('snapToGrid', e.target.checked));
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
