/**
 * Aerospace Orbiter - Adaptive User Settings & Preference Persistence State Engine
 * Issue #651 - Level 3 Core Feature
 *
 * Implements client-side avionics state machine managing mission control orbital parameters,
 * telemetry coordinate standards, acoustic guidance cues, high-contrast HUD modes,
 * and ground station synchronization intervals with LocalStorage persistence.
 */

export class AerospaceOrbiterPreferenceManager {
  static STORAGE_KEY = 'aerospace_orbiter_preferences_v1';

  static DEFAULTS = Object.freeze({
    theme: 'deep-space',
    orbitProjection: '3d-elliptical',
    telemetryUnits: 'metric',
    audioTelemetryCues: true,
    criticalProximityAlerts: true,
    highContrastDisplay: false,
    hapticThrusterFeedback: true,
    trajectoryPredictor: true,
    hudOverlayDensity: 'mission-critical',
    groundStationSyncInterval: 10
  });

  /**
   * @param {object} [options={}]
   * @param {Storage} [options.storage]
   */
  constructor(options = {}) {
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.listeners = new Set();
    this.state = this.load();
  }

  /**
   * Loads persisted preferences merged with default fallback values
   * @returns {object}
   */
  load() {
    if (!this.storage) {
      return { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
    }

    try {
      const raw = this.storage.getItem(AerospaceOrbiterPreferenceManager.STORAGE_KEY);
      if (!raw) {
        return { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
      }
      return { ...AerospaceOrbiterPreferenceManager.DEFAULTS, ...parsed };
    } catch {
      return { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
    }
  }

  /**
   * Returns current value of a preference key
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Returns full current preference snapshot
   * @returns {object}
   */
  getAll() {
    return { ...this.state };
  }

  /**
   * Updates a single preference key and persists changes
   * @param {string} key
   * @param {*} value
   * @returns {object} updated preferences
   */
  save(key, value) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Preference key must be a valid non-empty string');
    }

    const sanitizedKey = key.trim();
    this.state = {
      ...this.state,
      [sanitizedKey]: value
    };

    this._persist();
    this._notify(sanitizedKey, value);
    return { ...this.state };
  }

  /**
   * Bulk updates multiple preferences
   * @param {object} patch
   * @returns {object}
   */
  update(patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('Update patch must be a valid key-value object');
    }

    this.state = {
      ...this.state,
      ...patch
    };

    this._persist();
    for (const [key, val] of Object.entries(patch)) {
      this._notify(key, val);
    }
    return { ...this.state };
  }

  /**
   * Resets all preferences back to factory defaults
   * @returns {object}
   */
  resetDefaults() {
    this.state = { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
    this._persist();
    this._notify('__reset__', this.state);
    return { ...this.state };
  }

  /**
   * Exports current configuration to a formatted JSON string
   * @returns {string}
   */
  exportJSON() {
    const payload = {
      app: 'Aerospace Orbiter Avionics Suite',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      preferences: { ...this.state }
    };
    return JSON.stringify(payload, null, 2);
  }

  /**
   * Imports preferences from exported JSON payload
   * @param {string} jsonString
   * @returns {object}
   */
  importJSON(jsonString) {
    if (typeof jsonString !== 'string') {
      throw new Error('Invalid JSON payload: expected string');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Malformed JSON payload');
    }

    const importedPrefs = parsed.preferences || parsed;
    if (typeof importedPrefs !== 'object' || importedPrefs === null) {
      throw new Error('Payload contains no valid preferences object');
    }

    const nextState = { ...AerospaceOrbiterPreferenceManager.DEFAULTS };
    for (const key of Object.keys(AerospaceOrbiterPreferenceManager.DEFAULTS)) {
      if (key in importedPrefs) {
        nextState[key] = importedPrefs[key];
      }
    }

    this.state = nextState;
    this._persist();
    this._notify('__import__', this.state);
    return { ...this.state };
  }

  /**
   * Subscribes to preference changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Subscriber must be a function');
    }
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Internal persistence helper
   * @private
   */
  _persist() {
    if (this.storage) {
      try {
        this.storage.setItem(
          AerospaceOrbiterPreferenceManager.STORAGE_KEY,
          JSON.stringify(this.state)
        );
      } catch (err) {
        console.warn('AerospaceOrbiterPreferenceManager: Failed to persist to storage', err);
      }
    }
  }

  /**
   * Internal listener dispatcher
   * @param {string} key
   * @param {*} value
   * @private
   */
  _notify(key, value) {
    for (const fn of this.listeners) {
      try {
        fn(key, value, { ...this.state });
      } catch (err) {
        console.error('AerospaceOrbiterPreferenceManager: Listener error', err);
      }
    }
  }
}
