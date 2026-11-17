/**
 * Robotics Automata - Adaptive User Settings & Preference Persistence State Engine
 * Issue #687 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataPreferenceManager {
  static DEFAULT_PREFERENCES = {
    theme: 'cyber-amber',
    kinematicsModel: 'inverse-6dof',
    telemetryUnits: 'rad-sec',
    collisionWarningAudio: true,
    hapticFeedback: false,
    autoCalibrateHz: 60,
    emergencyBrakeThresholdM: 0.5,
    highContrastSensors: false
  };

  constructor(storageKey = 'robotics_preferences_v1', storageBackend = null) {
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
        return { ...RoboticsAutomataPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
      }
    } catch {
      // Fallback on corrupt JSON
    }
    return { ...RoboticsAutomataPreferenceManager.DEFAULT_PREFERENCES };
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
    this.preferences = { ...RoboticsAutomataPreferenceManager.DEFAULT_PREFERENCES };
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
        this.preferences = { ...RoboticsAutomataPreferenceManager.DEFAULT_PREFERENCES, ...parsed };
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
  window.RoboticsAutomataPreferenceManager = RoboticsAutomataPreferenceManager;

  document.addEventListener('DOMContentLoaded', () => {
    const manager = new RoboticsAutomataPreferenceManager();
    const modal = document.getElementById('robotics-automata-preferences-modal');
    const openBtn = document.getElementById('open-preferences-btn');
    const closeBtn = document.getElementById('close-preferences-btn');
    const resetBtn = document.getElementById('reset-preferences-btn');
    const exportBtn = document.getElementById('export-preferences-btn');

    const kinematicsSelect = document.getElementById('pref-kinematics');
    const unitsSelect = document.getElementById('pref-units');
    const audioToggle = document.getElementById('pref-collision-audio');
    const hapticToggle = document.getElementById('pref-haptic');

    const syncUiFromState = () => {
      const prefs = manager.load();
      if (kinematicsSelect) kinematicsSelect.value = prefs.kinematicsModel;
      if (unitsSelect) unitsSelect.value = prefs.telemetryUnits;
      if (audioToggle) audioToggle.checked = prefs.collisionWarningAudio;
      if (hapticToggle) hapticToggle.checked = prefs.hapticFeedback;
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

    if (kinematicsSelect) {
      kinematicsSelect.addEventListener('change', (e) => manager.save('kinematicsModel', e.target.value));
    }
    if (unitsSelect) {
      unitsSelect.addEventListener('change', (e) => manager.save('telemetryUnits', e.target.value));
    }
    if (audioToggle) {
      audioToggle.addEventListener('change', (e) => manager.save('collisionWarningAudio', e.target.checked));
    }
    if (hapticToggle) {
      hapticToggle.addEventListener('change', (e) => manager.save('hapticFeedback', e.target.checked));
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
