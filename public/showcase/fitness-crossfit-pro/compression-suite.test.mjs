import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProCompressionEngine } from './compression-suite.js';

describe('FitnessCrossfitProCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new FitnessCrossfitProCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for CrossFit WOD biometrics', () => {
    const engine = new FitnessCrossfitProCompressionEngine();
    const wodData = 'ROUND_1:BURPEES_21_TIME_01:45;THRUSTERS_21_WEIGHT_95LB;HR_BPM:178_ZONE:ANAEROBIC;';
    const compressed = engine.compressLZW(wodData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, wodData);
  });

  it('compresses repetitive heart rate streams with positive savings ratio', () => {
    const engine = new FitnessCrossfitProCompressionEngine();
    const repetitive = 'HEART_RATE_ZONE_INTERVAL_STREAM_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric barbell telemetry structures', () => {
    const engine = new FitnessCrossfitProCompressionEngine();
    const sample = 'SNATCH_100KG;VEL_PEAK:2.35MS;CATCH:STABLE;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new FitnessCrossfitProCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
