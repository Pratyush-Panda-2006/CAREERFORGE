import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasCompressionEngine } from './compression-suite.js';

describe('WeatherRadarAtlasCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    assert.strictEqual(engine.name, 'WeatherRadarAtlasCompressionEngine');
  });

  it('compresses repetitive weather telemetry strings with positive code count', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    const input = 'NEXRAD_RADAR_SCAN_STATION_SF_BAY_NEXRAD_RADAR_SCAN_STATION_SF_BAY_NEXRAD_RADAR_SCAN_STATION_SF_BAY';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive radar stream should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    const sample = 'STORM WARNING: Category 3 Hurricane detected at lat: 28.5383, lon: -81.3792. Wind speeds exceeding 115 kts. Isobar pressure 965 hPa.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 weather icons and meteorological symbols cleanly', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    const unicodeInput = '⛈️ Severe Thunderstorm Warning: Tornado Vortex Signatures 🌪️ Detected at 14:35 UTC ⚡ 45°C/113°F';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new WeatherRadarAtlasCompressionEngine();
    const text = 'REPETITIVE_DOPPLER_PULSE_BUFFER_REPETITIVE_DOPPLER_PULSE_BUFFER_REPETITIVE_DOPPLER_PULSE_BUFFER';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
