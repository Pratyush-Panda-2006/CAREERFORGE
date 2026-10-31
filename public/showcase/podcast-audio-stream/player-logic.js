// Pure helpers for the persistent mini player. Loaded as a plain script in the
// browser (exposes window.PlayerLogic) and evaluated by player-logic.test.mjs.
(function (root) {
  var STORAGE_KEY = 'waveform-mini-player';
  var SPEEDS = [1, 1.25, 1.5, 2];

  function clamp(value, min, max) {
    var n = Number(value);
    if (!isFinite(n)) return min;
    return Math.min(Math.max(n, min), max);
  }

  function clampVolume(value) {
    return clamp(value, 0, 1);
  }

  function clampTime(value, duration) {
    return clamp(value, 0, duration);
  }

  function volumeLabel(volume) {
    return Math.round(clampVolume(volume) * 100) + '%';
  }

  function serializeState(state) {
    return JSON.stringify({
      episode: state.episode === '141' ? '141' : '142',
      time: Math.floor(state.time),
      volume: clampVolume(state.volume),
      speedIndex: state.speedIndex
    });
  }

  // Returns a sanitized state object, or null when nothing usable is stored.
  function parseState(raw, duration) {
    if (!raw) return null;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    if (!data || typeof data !== 'object') return null;
    var speedIndex = Number(data.speedIndex);
    return {
      episode: data.episode === '141' ? '141' : '142',
      time: clampTime(data.time, duration),
      volume: data.volume === undefined ? 1 : clampVolume(data.volume),
      speedIndex: speedIndex >= 0 && speedIndex < SPEEDS.length && Math.floor(speedIndex) === speedIndex ? speedIndex : 0
    };
  }

  root.PlayerLogic = {
    STORAGE_KEY: STORAGE_KEY,
    SPEEDS: SPEEDS,
    clampVolume: clampVolume,
    clampTime: clampTime,
    volumeLabel: volumeLabel,
    serializeState: serializeState,
    parseState: parseState
  };
})(typeof window !== 'undefined' ? window : globalThis);
