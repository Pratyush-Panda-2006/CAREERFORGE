// Pure maths for the playback speed + pitch correction engine. Loaded as a plain
// script in the browser (exposes window.SpeedPitch) and evaluated by
// speed-pitch-logic.test.mjs. Nothing in here touches the DOM or Web Audio.
//
// Idea: playing audio at speed s multiplies every frequency by s (voices get
// chipmunk-y). A granular delay-line pitch shifter reads the signal through a
// delay that sweeps linearly, d(t) = base + sign * D * phase(t). The read rate is
// 1 - d'(t), so a sweep slope of (1 - r) gives a pitch ratio r. To undo the
// speed-up we want r = 1 / s. Two such grains run half a period apart and are
// cross-faded so the delay wrap (the sweep jumping back) is hidden.
(function (root) {
  var MIN_SPEED = 0.5;
  var MAX_SPEED = 3.0;
  var SPEED_STEP = 0.05;
  var PRESETS = [1, 1.25, 1.5, 2];
  var SETTINGS_KEY = 'waveform-speed-pitch';
  // One grain sweep lasts this long (seconds). 100 ms is a common choice for
  // speech: long enough for a vocal pitch period or two, short enough not to echo.
  var GRAIN_PERIOD = 0.1;

  // Rough vowel-like formants (Hz, relative level, width in octaves) used for the
  // test voice and for the response curve in the visualizer.
  var VOICE_F0 = 130;
  var VOICE_FORMANTS = [
    { freq: 700, level: 1, width: 0.22 },
    { freq: 1200, level: 0.7, width: 0.2 },
    { freq: 2600, level: 0.45, width: 0.18 }
  ];
  var AXIS_MIN_HZ = 50;
  var AXIS_MAX_HZ = 8000;

  function clampSpeed(value) {
    var n = Number(value);
    if (!isFinite(n)) return 1;
    return Math.min(Math.max(n, MIN_SPEED), MAX_SPEED);
  }

  // Clamp and round to the slider step so 1.2500000001 never leaks into the UI.
  function snapSpeed(value) {
    var steps = Math.round(clampSpeed(value) / SPEED_STEP);
    return Math.round(steps * SPEED_STEP * 100) / 100;
  }

  function formatSpeed(value) {
    return String(Number(clampSpeed(value).toFixed(2))) + 'x';
  }

  function nearestPresetIndex(value) {
    var best = 0;
    for (var i = 1; i < PRESETS.length; i++) {
      if (Math.abs(PRESETS[i] - value) < Math.abs(PRESETS[best] - value)) best = i;
    }
    return best;
  }

  function presetIndex(value) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (Math.abs(PRESETS[i] - value) < 1e-9) return i;
    }
    return -1;
  }

  // Next preset strictly above the current speed, wrapping back to 1x.
  function nextPresetSpeed(value) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i] > value + 1e-9) return PRESETS[i];
    }
    return PRESETS[0];
  }

  function semitones(ratio) {
    return 12 * Math.log(ratio) / Math.LN2;
  }

  // Everything the delay network needs for a given playback speed.
  //   ratio     pitch ratio the shifter must apply (1 / speed)
  //   sign      +1 when the delay sweeps up (shift down), -1 when it sweeps down (shift up)
  //   maxDelay  height of the sweep in seconds (D)
  //   baseDelay delay at phase 0 (0 for an upward sweep, D for a downward one)
  //   latency   mean delay the voice sees in seconds (half the sweep height)
  function grainParams(speed, period) {
    var s = clampSpeed(speed);
    var p = period > 0 ? period : GRAIN_PERIOD;
    var ratio = 1 / s;
    var slope = Math.abs(1 - ratio);
    var maxDelay = slope * p;
    var up = ratio > 1;
    var bypass = slope < 1e-6;
    return {
      speed: s,
      ratio: ratio,
      semitones: semitones(ratio),
      period: p,
      slope: slope,
      sign: bypass ? 0 : (up ? -1 : 1),
      maxDelay: maxDelay,
      baseDelay: up ? maxDelay : 0,
      latency: bypass ? 0 : maxDelay / 2,
      bypass: bypass
    };
  }

  // Cross-fade window. sin^2 keeps the two half-period-offset grains summing to 1.
  function fadeGain(phase) {
    var p = ((phase % 1) + 1) % 1;
    var s = Math.sin(Math.PI * p);
    return s * s;
  }

  // Loop tables for AudioBuffers. phaseOffset is in cycles (0.5 = half a period).
  function buildRampTable(length, phaseOffset) {
    var table = new Float32Array(length);
    for (var i = 0; i < length; i++) table[i] = (((i / length) + (phaseOffset || 0)) % 1 + 1) % 1;
    return table;
  }

  function buildFadeTable(length, phaseOffset) {
    var table = new Float32Array(length);
    for (var i = 0; i < length; i++) table[i] = fadeGain((i / length) + (phaseOffset || 0));
    return table;
  }

  // Spectral envelope of the demo voice (0..1ish) with every formant scaled by `factor`.
  function voiceEnvelope(freq, factor) {
    var f = Math.max(freq, 1);
    var total = 0.04;
    for (var i = 0; i < VOICE_FORMANTS.length; i++) {
      var fm = VOICE_FORMANTS[i];
      var octaves = Math.log(f / (fm.freq * factor)) / Math.LN2;
      total += fm.level * Math.exp(-(octaves * octaves) / (2 * fm.width * fm.width));
    }
    return Math.min(total, 1.2);
  }

  // The test voice as it would sound if a recording were simply played at `speed`:
  // fundamental and formants all move up (or down) by the speed factor.
  function scaledVoice(speed) {
    var s = clampSpeed(speed);
    return {
      f0: VOICE_F0 * s,
      formants: VOICE_FORMANTS.map(function (fm) {
        return { freq: fm.freq * s, level: fm.level, q: 4 };
      })
    };
  }

  // Factor the voice ends up shifted by after the chain: 1 when corrected.
  function outputFactor(speed, correctionOn) {
    return correctionOn ? clampSpeed(speed) * grainParams(speed).ratio : clampSpeed(speed);
  }

  function hzToX(freq) {
    var lo = Math.log(AXIS_MIN_HZ);
    var hi = Math.log(AXIS_MAX_HZ);
    return Math.min(Math.max((Math.log(freq) - lo) / (hi - lo), 0), 1);
  }

  function xToHz(x) {
    var lo = Math.log(AXIS_MIN_HZ);
    var hi = Math.log(AXIS_MAX_HZ);
    return Math.exp(lo + (hi - lo) * x);
  }

  // Normalised polyline [x, y] (both 0..1, y up) of the envelope on a log axis.
  function responseCurve(points, factor) {
    var out = [];
    for (var i = 0; i < points; i++) {
      var x = i / (points - 1);
      out.push([x, Math.min(voiceEnvelope(xToHz(x), factor) / 1.2, 1)]);
    }
    return out;
  }

  function serializeSettings(settings) {
    return JSON.stringify({
      speed: snapSpeed(settings.speed),
      correction: settings.correction !== false
    });
  }

  function parseSettings(raw) {
    if (!raw) return null;
    var data;
    try { data = JSON.parse(raw); } catch { return null; }
    if (!data || typeof data !== 'object' || !isFinite(Number(data.speed))) return null;
    return { speed: snapSpeed(data.speed), correction: data.correction !== false };
  }

  root.SpeedPitch = {
    MIN_SPEED: MIN_SPEED,
    MAX_SPEED: MAX_SPEED,
    SPEED_STEP: SPEED_STEP,
    PRESETS: PRESETS,
    SETTINGS_KEY: SETTINGS_KEY,
    GRAIN_PERIOD: GRAIN_PERIOD,
    VOICE_F0: VOICE_F0,
    VOICE_FORMANTS: VOICE_FORMANTS,
    AXIS_MIN_HZ: AXIS_MIN_HZ,
    AXIS_MAX_HZ: AXIS_MAX_HZ,
    clampSpeed: clampSpeed,
    snapSpeed: snapSpeed,
    formatSpeed: formatSpeed,
    nearestPresetIndex: nearestPresetIndex,
    presetIndex: presetIndex,
    nextPresetSpeed: nextPresetSpeed,
    semitones: semitones,
    grainParams: grainParams,
    fadeGain: fadeGain,
    buildRampTable: buildRampTable,
    buildFadeTable: buildFadeTable,
    voiceEnvelope: voiceEnvelope,
    scaledVoice: scaledVoice,
    outputFactor: outputFactor,
    hzToX: hzToX,
    xToHz: xToHz,
    responseCurve: responseCurve,
    serializeSettings: serializeSettings,
    parseSettings: parseSettings
  };
})(typeof window !== 'undefined' ? window : globalThis);
