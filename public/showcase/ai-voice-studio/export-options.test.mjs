import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_BASENAME, MAX_BASENAME_LENGTH, sanitizeFilename, filenameWasChanged, buildFileName,
  pickOggMimeType, getFormatAvailability, resolveExportOptions, firstAvailableFormat, floatToInt16
} from './export-options.js';

const oggSupport = type => type === 'audio/ogg;codecs=opus';
const chromeLike = type => type === 'audio/webm;codecs=opus';
const env = (over = {}) => ({ offlineAudio: true, isTypeSupported: oggSupport, realtimeAudio: true, mp3Encoder: 'ready', ...over });

test('sanitizeFilename keeps a normal name untouched', () => {
  assert.equal(sanitizeFilename('my podcast intro'), 'my podcast intro');
  assert.equal(sanitizeFilename('Sonora_mix-v2'), 'Sonora_mix-v2');
});

test('sanitizeFilename removes path separators, reserved characters and control characters', () => {
  assert.equal(sanitizeFilename('../../etc/passwd'), 'etc passwd');
  assert.equal(sanitizeFilename('C:\\Users\\me\\mix'), 'C Users me mix');
  assert.equal(sanitizeFilename('a<b>c:d"e|f?g*h'), 'a b c d e f g h');
  assert.equal(sanitizeFilename('line\nbreak\u0000tab\t'), 'line break tab');
});

test('sanitizeFilename strips typed audio extensions so the format decides the extension', () => {
  assert.equal(sanitizeFilename('mix.wav'), 'mix');
  assert.equal(sanitizeFilename('MIX.MP3'), 'MIX');
  assert.equal(sanitizeFilename('take.wav.mp3'), 'take');
  assert.equal(sanitizeFilename('v1.2 final'), 'v1.2 final');
});

test('sanitizeFilename trims dots and spaces and blocks hidden or Windows reserved names', () => {
  assert.equal(sanitizeFilename('  ...hidden...  '), 'hidden');
  assert.equal(sanitizeFilename('con'), 'con_');
  assert.equal(sanitizeFilename('LPT1'), 'LPT1_');
  assert.equal(sanitizeFilename('console'), 'console');
});

test('sanitizeFilename falls back to the default for empty or unusable input', () => {
  for (const value of ['', '   ', '...', '///', '.wav', undefined, null, 42]) {
    assert.equal(sanitizeFilename(value), DEFAULT_BASENAME);
  }
});

test('sanitizeFilename caps length by characters and keeps unicode intact', () => {
  const long = sanitizeFilename('x'.repeat(500));
  assert.equal(long.length, MAX_BASENAME_LENGTH);
  assert.equal(sanitizeFilename('रिकॉर्डिंग 🎙'), 'रिकॉर्डिंग 🎙');
  assert.equal(Array.from(sanitizeFilename('🎙'.repeat(200))).length, MAX_BASENAME_LENGTH);
});

test('filenameWasChanged only flags names that really get altered', () => {
  assert.equal(filenameWasChanged('clean name'), false);
  assert.equal(filenameWasChanged('bad/name'), true);
  assert.equal(filenameWasChanged('name.wav'), true);
  assert.equal(filenameWasChanged('   '), false);
});

test('buildFileName always uses the extension of the chosen format', () => {
  assert.equal(buildFileName('mix.wav', 'mp3'), 'mix.mp3');
  assert.equal(buildFileName('', 'wav'), 'sonora-multitrack-mix.wav');
  assert.equal(buildFileName('a/b', 'ogg'), 'a b.ogg');
  assert.throws(() => buildFileName('mix', 'flac'), /Unknown export format/);
});

test('pickOggMimeType prefers opus and returns null when nothing is recordable', () => {
  assert.equal(pickOggMimeType(oggSupport), 'audio/ogg;codecs=opus');
  assert.equal(pickOggMimeType(type => type === 'audio/ogg'), 'audio/ogg');
  assert.equal(pickOggMimeType(chromeLike), null);
  assert.equal(pickOggMimeType(undefined), null);
  assert.equal(pickOggMimeType(() => { throw new Error('boom'); }), null);
});

test('getFormatAvailability: everything on when the browser can do it', () => {
  const a = getFormatAvailability(env());
  assert.deepEqual([a.wav.available, a.mp3.available, a.ogg.available], [true, true, true]);
});

test('getFormatAvailability: OGG is disabled with a reason on Chrome-like MediaRecorder', () => {
  const a = getFormatAvailability(env({ isTypeSupported: chromeLike }));
  assert.equal(a.ogg.available, false);
  assert.match(a.ogg.reason, /cannot record OGG/);
  assert.equal(a.wav.available, true);
  assert.equal(a.mp3.available, true);
});

test('getFormatAvailability: no MediaRecorder or no media stream node disables OGG only', () => {
  const none = getFormatAvailability(env({ isTypeSupported: undefined }));
  assert.equal(none.ogg.available, false);
  assert.match(none.ogg.reason, /no MediaRecorder/);
  const noStream = getFormatAvailability(env({ realtimeAudio: false }));
  assert.equal(noStream.ogg.available, false);
  assert.equal(noStream.wav.available, true);
});

test('getFormatAvailability: MP3 follows the encoder load state', () => {
  assert.equal(getFormatAvailability(env({ mp3Encoder: 'loading' })).mp3.available, false);
  assert.match(getFormatAvailability(env({ mp3Encoder: 'loading' })).mp3.reason, /Loading/);
  assert.equal(getFormatAvailability(env({ mp3Encoder: 'failed' })).mp3.available, false);
  assert.match(getFormatAvailability(env({ mp3Encoder: 'failed' })).mp3.reason, /could not be loaded/);
  assert.equal(getFormatAvailability(env({ mp3Encoder: undefined })).mp3.available, false);
});

test('getFormatAvailability: without OfflineAudioContext nothing can be exported', () => {
  const a = getFormatAvailability(env({ offlineAudio: false }));
  assert.deepEqual([a.wav.available, a.mp3.available, a.ogg.available], [false, false, false]);
  assert.equal(firstAvailableFormat(a, 'wav'), null);
});

test('firstAvailableFormat keeps a valid choice and otherwise falls back in order', () => {
  const a = getFormatAvailability(env({ isTypeSupported: chromeLike }));
  assert.equal(firstAvailableFormat(a, 'mp3'), 'mp3');
  assert.equal(firstAvailableFormat(a, 'ogg'), 'wav');
  assert.equal(firstAvailableFormat(a, null), 'wav');
});

test('resolveExportOptions builds a validated option set', () => {
  const a = getFormatAvailability(env());
  const r = resolveExportOptions({ format: 'mp3', sampleRate: '48000', bitrate: '192', fileName: 'my:mix.wav' }, a);
  assert.deepEqual(r, { ok: true, options: { format: 'mp3', sampleRate: 48000, fileName: 'my mix.mp3', bitrate: 192 } });
  const wav = resolveExportOptions({ format: 'wav', sampleRate: 44100, bitrate: '999', fileName: '' }, a);
  assert.deepEqual(wav.options, { format: 'wav', sampleRate: 44100, fileName: 'sonora-multitrack-mix.wav' });
});

test('resolveExportOptions rejects bad input and unavailable formats with the reason', () => {
  const a = getFormatAvailability(env({ isTypeSupported: chromeLike }));
  assert.equal(resolveExportOptions({ format: 'flac', sampleRate: 44100 }, a).ok, false);
  assert.equal(resolveExportOptions({ format: 'wav', sampleRate: 22050 }, a).ok, false);
  const ogg = resolveExportOptions({ format: 'ogg', sampleRate: 44100 }, a);
  assert.equal(ogg.ok, false);
  assert.match(ogg.error, /cannot record OGG/);
  assert.equal(resolveExportOptions(undefined, a).ok, false);
});

test('resolveExportOptions falls back to 320 kbps for an unknown MP3 bitrate', () => {
  const a = getFormatAvailability(env());
  assert.equal(resolveExportOptions({ format: 'mp3', sampleRate: 44100, bitrate: '64' }, a).options.bitrate, 320);
});

test('floatToInt16 clamps and scales like the WAV writer', () => {
  const out = floatToInt16(new Float32Array([0, 1, -1, 2, -2, 0.5]));
  assert.deepEqual(Array.from(out), [0, 32767, -32768, 32767, -32768, 16383]);
});
