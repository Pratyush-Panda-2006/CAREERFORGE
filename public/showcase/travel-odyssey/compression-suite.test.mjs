import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyCompressionEngine } from './compression-suite.js';

describe('TravelOdysseyCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new TravelOdysseyCompressionEngine();
    assert.equal(engine.name, 'TravelOdysseyCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new TravelOdysseyCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses travel expedition manifests', () => {
    const engine = new TravelOdysseyCompressionEngine();
    const payload = JSON.stringify({
      manifestId: "EXP-9021-ARCTIC",
      vessel: "Aurora Voyager",
      coordinates: "78.2232° N, 15.6267° E",
      destination: "Svalbard Glacier Route",
      waypointsCount: 12,
      fuelReservesLiters: 45000
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode characters, world city names, and emojis losslessly', () => {
    const engine = new TravelOdysseyCompressionEngine();
    const payload = '✈️ Expedition Route: Tromsø ➔ Reykjavík ➔ Nuuk ➔ Svalbard ❄️ [Elevation: 1,420m, Temp: -22.5°C, Waypoint: 📍78°N]';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new TravelOdysseyCompressionEngine();
    const repeated = '{"waypoint": "POLAR_BEAR_STAGING", "lat": 78.22, "lon": 15.62, "status": "CONFIRMED"}, '.repeat(30);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new TravelOdysseyCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
