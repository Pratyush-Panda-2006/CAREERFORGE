import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayCompressionEngine } from './compression-suite.js';

describe('DroneDeliverySkywayCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new DroneDeliverySkywayCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for drone LiDAR telemetry', () => {
    const engine = new DroneDeliverySkywayCompressionEngine();
    const flightData = 'POINT_X:12.45_Y:8.12_Z:120.5_INT:0.95;PACKAGE_ID:SKY-4091;WEIGHT_KG:2.4;STATUS:DEPLOYING;';
    const compressed = engine.compressLZW(flightData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, flightData);
  });

  it('compresses repetitive flight telemetry frames with positive savings ratio', () => {
    const engine = new DroneDeliverySkywayCompressionEngine();
    const repetitive = 'DRONE_WAYPOINT_TELEMETRY_STREAM_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric skyway payload structures', () => {
    const engine = new DroneDeliverySkywayCompressionEngine();
    const sample = 'ROTOR_1_RPM:5820;VOLT:24.8V;WINCH:READY;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new DroneDeliverySkywayCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
