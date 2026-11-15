const bounded = (value, fallback, min, max) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Number(value))) : fallback;

export function controls(values = {}) {
  return {
    bpm: bounded(values.bpm, 120, 60, 180),
    hue: bounded(values.hue, 285, 0, 360),
    intensity: bounded(values.intensity, 65, 0, 100),
    sweep: bounded(values.sweep, 55, 10, 80),
    pattern: ['sweep', 'chase', 'fan'].includes(values.pattern) ? values.pattern : 'sweep',
    lasers: values.lasers === true,
    pulse: values.pulse === true,
  };
}

// All positions are stage-space coordinates; no accumulated integration drift.
export function stageFrame(seconds, values) {
  const settings = controls(values);
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const beat = time * settings.bpm / 60;
  const phase = beat % 4 / 4 * Math.PI * 2;
  const heads = Array.from({ length: 6 }, (_, i) => {
    const offset = i * Math.PI / 3;
    const wave = Math.sin(phase + offset);
    const pan = settings.pattern === 'fan' ? (i - 2.5) / 2.5 : wave;
    const tilt = Math.cos(phase / 2 + offset);
    const chase = settings.pattern === 'chase' ? (Math.floor(beat * 2) % 6 === i ? 1 : 0.15) : 1;
    // Per-fixture strobe modulation is capped at 2 Hz, never a full-screen flash.
    const pulsePhase = (time * Math.min(settings.bpm / 60, 2) + i / 6) % 1;
    const dimmer = settings.intensity / 100 * chase * (settings.pulse && pulsePhase > 0.25 ? 0.12 : 1);
    const hue = (settings.hue + i * 26) % 360;
    return {
      source: { x: (i - 2.5) * 1.05, y: 3.6, z: 1 },
      target: { x: (i - 2.5) * 0.35 + pan * settings.sweep / 25, y: 0, z: 3.8 + tilt * 1.7 },
      hue, dimmer,
      // Six illustrative channels per fixture: pan/tilt/hue/dimmer/laser/pulse.
      channels: [Math.round((pan + 1) * 127.5), Math.round((tilt + 1) * 127.5),
        Math.round(hue / 360 * 255), Math.round(dimmer * 255), settings.lasers ? 255 : 0, settings.pulse ? 255 : 0],
    };
  });
  return { beat, heads, settings };
}

export function project(point, width, height) {
  const depth = 1 + point.z * 0.13;
  return { x: width / 2 + point.x * width * 0.105 / depth,
    y: height * 0.77 - point.y * height * 0.145 / depth + point.z * height * 0.017 };
}

export function canvasSize(width, ratio = 1) {
  const w = bounded(width, 800, 1, 1200);
  const scale = bounded(ratio, 1, 1, 2);
  return { width: Math.round(w * scale), height: Math.round(w * 0.52 * scale) };
}
