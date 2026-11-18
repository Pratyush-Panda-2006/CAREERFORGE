/**
 * EdtechAcademyPreferenceManager - Adaptive User Settings & Preference Persistence State Engine
 */

export class EdtechAcademyPreferenceManager {
  static STORAGE_KEY = 'edtech-academy_preferences_v1';

  static DEFAULTS = {
    theme: 'dark',
    viewLayout: 'grid',
    soundCues: false,
    highContrast: false,
    metricUnits: 'metric',
    autoplayVideo: true,
    codeEditorTheme: 'dracula',
    playbackSpeed: 1.0
  };

  constructor(options = {}) {
    this.storage = options.storage || (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
    this.storageKey = options.storageKey || EdtechAcademyPreferenceManager.STORAGE_KEY;
    this.listeners = new Set();
    this.preferences = this.load();
  }

  load() {
    try {
      if (this.storage) {
        const raw = this.storage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          return { ...EdtechAcademyPreferenceManager.DEFAULTS, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load edtech-academy preferences:', e);
    }
    return { ...EdtechAcademyPreferenceManager.DEFAULTS };
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
    this.preferences = { ...EdtechAcademyPreferenceManager.DEFAULTS };
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
      system: 'edtech-academy',
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
    const manager = new EdtechAcademyPreferenceManager();

    const themeSelect = document.getElementById('themeSelect');
    const layoutSelect = document.getElementById('layoutSelect');
    const soundToggle = document.getElementById('soundToggle');
    const contrastToggle = document.getElementById('contrastToggle');
    const autoplayToggle = document.getElementById('autoplayToggle');
    const editorSelect = document.getElementById('editorSelect');

    function syncUI() {
      const p = manager.getAll();
      if (themeSelect) themeSelect.value = p.theme || 'dark';
      if (layoutSelect) layoutSelect.value = p.viewLayout || 'grid';
      if (soundToggle) soundToggle.checked = Boolean(p.soundCues);
      if (contrastToggle) contrastToggle.checked = Boolean(p.highContrast);
      if (autoplayToggle) autoplayToggle.checked = Boolean(p.autoplayVideo);
      if (editorSelect) editorSelect.value = p.codeEditorTheme || 'dracula';
    }

    syncUI();

    document.getElementById('savePrefBtn')?.addEventListener('click', () => {
      if (themeSelect) manager.save('theme', themeSelect.value);
      if (layoutSelect) manager.save('viewLayout', layoutSelect.value);
      if (soundToggle) manager.save('soundCues', soundToggle.checked);
      if (contrastToggle) manager.save('highContrast', contrastToggle.checked);
      if (autoplayToggle) manager.save('autoplayVideo', autoplayToggle.checked);
      if (editorSelect) manager.save('codeEditorTheme', editorSelect.value);
      alert('Edtech preferences saved successfully!');
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
      a.download = 'edtech-academy-preferences.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  });
}
