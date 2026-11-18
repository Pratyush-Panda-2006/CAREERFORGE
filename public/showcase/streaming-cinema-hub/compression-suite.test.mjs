import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubCompressionEngine } from './compression-suite.js';

describe('StreamingCinemaHubCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    assert.strictEqual(engine.name, 'StreamingCinemaHubCompressionEngine');
  });

  it('compresses repetitive cinema strings with positive code count', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    const input = 'CINEMA_4K_STREAM_CINEMA_4K_STREAM_CINEMA_4K_STREAM';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive stream should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    const sample = 'Interstellar (2014) - Directed by Christopher Nolan. 4K HDR Atmos 60FPS Bitrate 85Mbps.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 movie title characters and emoji cleanly', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    const unicodeInput = '🎬 Oscar 2026 Special Presentation: Le Fabuleux Destin d’Amélie Poulain ⭐⭐⭐⭐⭐';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new StreamingCinemaHubCompressionEngine();
    const text = 'REPETITIVE_CINEMA_PLAYLIST_BUFFER_REPETITIVE_CINEMA_PLAYLIST_BUFFER_REPETITIVE_CINEMA_PLAYLIST_BUFFER';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
