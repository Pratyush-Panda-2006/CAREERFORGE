import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterCompressionEngine } from './compression-suite.js';

describe('AerospaceOrbiterCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    assert.equal(engine.name, 'AerospaceOrbiterCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
    assert.equal(engine.decompressLZW(undefined), '');
  });

  it('compresses and losslessly decompresses aerospace orbital telemetry payloads', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    const telemetry = JSON.stringify({
      mission: 'ORBITER-7',
      semiMajorAxisKm: 6878.14,
      eccentricity: 0.0012,
      inclinationDeg: 51.64,
      status: 'NOMINAL_ORBIT'
    });
    const compressed = engine.compressLZW(telemetry);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, telemetry);
  });

  it('handles unicode mathematical symbols and spacecraft emojis losslessly', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    const payload = '🛰️ Flight Telemetry: Δv = 432.8 m/s | μ = 398600.4418 km³/s² | True Anomaly: ν = 180° | Status: OK 🚀';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    const repeated = 'ORBIT_VECTOR_XYZ;'.repeat(40);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('estimates downlink transmission latency accurately for varying RF baud rates', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    // 4000 bytes at 32000 bps = (4000 * 8) / 32000 = 1.0 second = 1000.0 ms
    const latency = engine.estimateTransmissionLatency(4000, 32000);
    assert.equal(latency, 1000.0);

    // Invalid parameters guard
    assert.equal(engine.estimateTransmissionLatency(0, 32000), 0);
    assert.equal(engine.estimateTransmissionLatency(-10, 32000), 0);
    assert.equal(engine.estimateTransmissionLatency(100, 0), 0);
  });

  it('throws a descriptive error on corrupted LZW byte stream', () => {
    const engine = new AerospaceOrbiterCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 9999]);
    }, /Corrupted LZW code stream/);
  });
});
