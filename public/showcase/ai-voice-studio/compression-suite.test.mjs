import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioCompressionEngine } from './compression-suite.js';

describe('AiVoiceStudioCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    assert.equal(engine.name, 'AiVoiceStudioCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses vocal metadata JSON payloads', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    const payload = JSON.stringify({
      voiceModel: "Aura-Neural-TTS",
      sampleRate: 48000,
      phonemeCount: 142,
      latencyMs: 14.2
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode phonetic symbols, accents, and musical notation losslessly', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    const payload = '🎙️ Phonemes: /həˈloʊ wɜːrld/ • Pitch: 440Hz [A4 🎵] ~ Accent: Français é/è/à ✨';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    const repeated = '{"phoneme": "AA", "duration": 45, "pitch": 220}, '.repeat(35);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new AiVoiceStudioCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
