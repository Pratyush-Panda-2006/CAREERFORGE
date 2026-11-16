// Pure helpers for the Export Audio modal: filename sanitizing, format
// availability and option validation. No DOM access here so it can be
// unit tested with plain node (see export-options.test.mjs).

export const DEFAULT_BASENAME = 'sonora-multitrack-mix';
export const MAX_BASENAME_LENGTH = 80;
export const SAMPLE_RATES = [44100, 48000];
export const MP3_BITRATES = [128, 192, 256, 320];
export const DEFAULT_MP3_BITRATE = 320;

export const FORMATS = {
  wav: { id: 'wav', label: 'WAV', ext: 'wav', mime: 'audio/wav' },
  mp3: { id: 'mp3', label: 'MP3', ext: 'mp3', mime: 'audio/mpeg' },
  ogg: { id: 'ogg', label: 'OGG', ext: 'ogg', mime: 'audio/ogg' }
};

const KNOWN_EXTENSIONS = /\.(wav|mp3|ogg|oga|opus)$/i;
// eslint-disable-next-line no-control-regex
const ILLEGAL_CHARS = /[\u0000-\u001f\u007f<>:"/\\|?*]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

// Turns whatever the user typed into a safe file name WITHOUT extension.
// The extension always comes from the chosen format (see buildFileName), so a
// typed ".mp3" on a WAV export cannot mislabel the file.
export function sanitizeFilename(input) {
  let name = typeof input === 'string' ? input : '';
  name = name.normalize('NFC').replace(ILLEGAL_CHARS, ' ');
  name = name.replace(/\s+/g, ' ').trim();
  // Drop an extension the user typed themselves, once or repeated (a.wav.mp3).
  while (KNOWN_EXTENSIONS.test(name)) name = name.replace(KNOWN_EXTENSIONS, '').trim();
  // No leading/trailing dots or spaces (hidden files, Windows trimming).
  name = name.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '');
  if (name.length > MAX_BASENAME_LENGTH) {
    name = Array.from(name).slice(0, MAX_BASENAME_LENGTH).join('').replace(/[.\s]+$/, '');
  }
  if (WINDOWS_RESERVED.test(name)) name = name + '_';
  return name || DEFAULT_BASENAME;
}

// True when the raw input is something the user has to be told was changed.
export function filenameWasChanged(input) {
  const typed = typeof input === 'string' ? input.trim() : '';
  return typed !== '' && sanitizeFilename(typed) !== typed;
}

export function buildFileName(input, formatId) {
  const format = FORMATS[formatId];
  if (!format) throw new Error('Unknown export format: ' + formatId);
  return sanitizeFilename(input) + '.' + format.ext;
}

// First MediaRecorder container/codec the browser can really record to OGG.
export function pickOggMimeType(isTypeSupported) {
  if (typeof isTypeSupported !== 'function') return null;
  const candidates = ['audio/ogg;codecs=opus', 'audio/ogg;codecs=vorbis', 'audio/ogg'];
  for (const type of candidates) {
    try {
      if (isTypeSupported(type)) return type;
    } catch (err) {
      // Some engines throw on unknown types; treat as unsupported.
    }
  }
  return null;
}

// What the modal may offer right now. Each entry is { available, reason }.
// env = {
//   offlineAudio: boolean              OfflineAudioContext exists
//   isTypeSupported: fn | undefined    MediaRecorder.isTypeSupported, if MediaRecorder exists
//   realtimeAudio: boolean             AudioContext + MediaStreamDestination exist (needed for OGG)
//   mp3Encoder: 'ready' | 'loading' | 'failed'
// }
export function getFormatAvailability(env = {}) {
  const result = {};
  if (env.offlineAudio === false) {
    const reason = 'This browser cannot render the mixdown (OfflineAudioContext is missing).';
    return {
      wav: { available: false, reason },
      mp3: { available: false, reason },
      ogg: { available: false, reason }
    };
  }
  result.wav = { available: true, reason: '' };

  if (env.mp3Encoder === 'ready') {
    result.mp3 = { available: true, reason: '' };
  } else if (env.mp3Encoder === 'failed') {
    result.mp3 = { available: false, reason: 'The bundled MP3 encoder could not be loaded, so MP3 is turned off.' };
  } else {
    result.mp3 = { available: false, reason: 'Loading the MP3 encoder...' };
  }

  if (typeof env.isTypeSupported !== 'function') {
    result.ogg = { available: false, reason: 'This browser has no MediaRecorder, so it cannot encode OGG.' };
  } else if (env.realtimeAudio === false) {
    result.ogg = { available: false, reason: 'This browser cannot route audio into a recorder, so it cannot encode OGG.' };
  } else if (!pickOggMimeType(env.isTypeSupported)) {
    result.ogg = { available: false, reason: 'This browser cannot record OGG audio (Firefox can; Chrome and Safari only record WebM or MP4). Pick WAV or MP3.' };
  } else {
    result.ogg = { available: true, reason: '' };
  }
  return result;
}

// Validates what the modal sends back. Returns { ok, options } or { ok:false, error }.
export function resolveExportOptions(raw, availability) {
  const format = raw && FORMATS[raw.format] ? raw.format : null;
  if (!format) return { ok: false, error: 'Choose an export format.' };
  const entry = availability && availability[format];
  if (!entry || !entry.available) {
    return { ok: false, error: (entry && entry.reason) || FORMATS[format].label + ' export is not available here.' };
  }
  const sampleRate = Number(raw.sampleRate);
  if (!SAMPLE_RATES.includes(sampleRate)) return { ok: false, error: 'Choose 44.1 kHz or 48 kHz.' };
  const options = {
    format,
    sampleRate,
    fileName: buildFileName(raw.fileName, format)
  };
  if (format === 'mp3') {
    const bitrate = Number(raw.bitrate);
    options.bitrate = MP3_BITRATES.includes(bitrate) ? bitrate : DEFAULT_MP3_BITRATE;
  }
  return { ok: true, options };
}

// First available format when the currently selected one gets disabled.
export function firstAvailableFormat(availability, preferred) {
  if (availability && preferred && availability[preferred] && availability[preferred].available) return preferred;
  for (const id of Object.keys(FORMATS)) {
    if (availability && availability[id] && availability[id].available) return id;
  }
  return null;
}

// Float32 [-1, 1] samples to 16-bit PCM, same clamping as the WAV writer.
export function floatToInt16(samples) {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
