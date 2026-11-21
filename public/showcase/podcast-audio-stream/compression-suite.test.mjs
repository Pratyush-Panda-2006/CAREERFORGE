import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamCompressionEngine } from './compression-suite.js';

describe('PodcastAudioStreamCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    assert.equal(engine.name, 'PodcastAudioStreamCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses podcast feed payloads', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    const payload = JSON.stringify({
      podcastId: "POD-AUDIO-88",
      title: "Soundscapes of Future Waves",
      duration: 3600,
      chaptersCount: 8,
      bitrateKbps: 320,
      stereo: true
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode musical notes, emojis, and chapter timestamps losslessly', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    const payload = '🎙️ Episode #88: The Modular Synthesis Hour 🎵 [00:15:30 ➔ 00:45:00] 🔊 Key: C# Minor / 128 BPM ✨';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    const repeated = '{"chapter": "ACOUSTIC_SYNTHESIS", "time": "00:12:30", "speaker": "ALICE"}, '.repeat(30);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new PodcastAudioStreamCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
