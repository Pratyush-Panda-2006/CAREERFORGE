/**
 * PodcastAudioStreamPreferenceManager - Adaptive User Settings & Preference Persistence State Engine
 */

export class PodcastAudioStreamPreferenceManager {
  static STORAGE_KEY = 'podcast-audio-stream_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    viewLayout: 'grid',
    soundCues: false,
    highContrast: false,
    metricUnits: 'metric',
    audioVolume: 80,
    playbackSpeed: 1.0,
    skipSilence: true,
    autoPlayNext: true
  };

  constructor(options = {}) {
    this.storage = options.storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.storageKey = options.storageKey || PodcastAudioStreamPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...PodcastAudioStreamPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load podcast-audio-stream preferences:', e);
    }
    return { ...PodcastAudioStreamPreferenceManager.DEFAULTS };
  }

  save(key, val) {
    if (key === undefined || key === null) return false;
    this.preferences[key] = val;
    this._persist();
    this._notify(key, val);
    return true;
  }

  get(key) {
    return this.preferences[key];
  }

  getAll() {
    return { ...this.preferences };
  }

  resetDefaults() {
    this.preferences = { ...PodcastAudioStreamPreferenceManager.DEFAULTS };
    try {
      if (this.storage) {
        this.storage.removeItem(this.storageKey);
      }
    } catch (e) {
      console.warn('Failed to clear storage:', e);
    }
    this._notify('*', this.preferences);
    return { ...this.preferences };
  }

  exportJSON() {
    return JSON.stringify({
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      system: 'podcast-audio-stream',
      preferences: this.preferences
    }, null, 2);
  }

  _persist() {
    try {
      if (this.storage) {
        this.storage.setItem(this.storageKey, JSON.stringify(this.preferences));
      }
    } catch (e) {
      console.warn('Failed to persist preferences:', e);
    }
  }

  _notify(key, val) {
    for (const listener of this.listeners) {
      try {
        listener(key, val, this.preferences);
      } catch (e) {
        console.error('Preference listener error:', e);
      }
    }
  }

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }
    return () => {};
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const manager = new PodcastAudioStreamPreferenceManager();

    const themeSelect = document.getElementById('themeSelect');
    const layoutSelect = document.getElementById('layoutSelect');
    const soundToggle = document.getElementById('soundToggle');
    const contrastToggle = document.getElementById('contrastToggle');
    const skipSilenceToggle = document.getElementById('skipSilenceToggle');
    const autoPlayNextToggle = document.getElementById('autoPlayNextToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedSelect = document.getElementById('speedSelect');

    function syncUI() {
      const p = manager.getAll();
      if (themeSelect) themeSelect.value = p.theme || 'dark';
      if (layoutSelect) layoutSelect.value = p.viewLayout || 'grid';
      if (soundToggle) soundToggle.checked = Boolean(p.soundCues);
      if (contrastToggle) contrastToggle.checked = Boolean(p.highContrast);
      if (skipSilenceToggle) skipSilenceToggle.checked = Boolean(p.skipSilence);
      if (autoPlayNextToggle) autoPlayNextToggle.checked = Boolean(p.autoPlayNext);
      if (volumeSlider) volumeSlider.value = p.audioVolume || 80;
      if (speedSelect) speedSelect.value = String(p.playbackSpeed || 1.0);
    }

    syncUI();

    document.getElementById('savePrefBtn')?.addEventListener('click', () => {
      if (themeSelect) manager.save('theme', themeSelect.value);
      if (layoutSelect) manager.save('viewLayout', layoutSelect.value);
      if (soundToggle) manager.save('soundCues', soundToggle.checked);
      if (contrastToggle) manager.save('highContrast', contrastToggle.checked);
      if (skipSilenceToggle) manager.save('skipSilence', skipSilenceToggle.checked);
      if (autoPlayNextToggle) manager.save('autoPlayNext', autoPlayNextToggle.checked);
      if (volumeSlider) manager.save('audioVolume', Number(volumeSlider.value));
      if (speedSelect) manager.save('playbackSpeed', Number(speedSelect.value));
      alert('Podcast stream preferences saved successfully!');
    });

    document.getElementById('resetPrefBtn')?.addEventListener('click', () => {
      manager.resetDefaults();
      syncUI();
    });

    document.getElementById('exportPrefBtn')?.addEventListener('click', () => {
      const json = manager.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'podcast-audio-stream-preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
}
