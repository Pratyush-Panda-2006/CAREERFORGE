/**
 * Biotech Genomics - Preference Manager
 * Manages personalized genomics workspace settings, view layout preferences,
 * audio telemetry cues, high-contrast modes, and sequencing metric units with persistence.
 */

export class BiotechGenomicsPreferenceManager {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'biotech_genomics_user_preferences_v1';
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : new MemoryStorage());
    this.defaultPreferences = Object.freeze({
      theme: 'emerald-matrix', // 'emerald-matrix' | 'cyan-helix' | 'high-contrast-bio'
      sequenceAlignmentLayout: 'split-ribbon', // 'split-ribbon' | 'circular-chord' | 'linear-track'
      audioAlertsEnabled: true,
      alertVolume: 65, // 0 - 100
      highContrastMode: false,
      metricUnits: 'base-pairs', // 'base-pairs' | 'kilo-bases' | 'mega-bases'
      autoSaveIntervalSec: 30,
      renderFidelity: 'high', // 'low' | 'medium' | 'high' | 'ultra'
      crisprOverlayHighlight: true
    });
    this.state = this.load();
  }

  load() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return { ...this.defaultPreferences };
      }
      const parsed = JSON.parse(raw);
      return { ...this.defaultPreferences, ...parsed };
    } catch {
      return { ...this.defaultPreferences };
    }
  }

  save(keyOrObj, val) {
    if (typeof keyOrObj === 'string') {
      this.state[keyOrObj] = val;
    } else if (typeof keyOrObj === 'object' && keyOrObj !== null) {
      this.state = { ...this.state, ...keyOrObj };
    }
    this.persist();
    return { ...this.state };
  }

  get(key) {
    return this.state[key] !== undefined ? this.state[key] : this.defaultPreferences[key];
  }

  resetDefaults() {
    this.state = { ...this.defaultPreferences };
    this.persist();
    return { ...this.state };
  }

  exportJSON() {
    return JSON.stringify({
      appName: 'Biotech Genomics Workspace',
      version: '3.4.0',
      exportedAt: new Date().toISOString(),
      preferences: this.state
    }, null, 2);
  }

  persist() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state));
      return true;
    } catch {
      return false;
    }
  }
}

export class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
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
