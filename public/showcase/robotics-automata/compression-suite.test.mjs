import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataCompressionEngine } from './compression-suite.js';

describe('RoboticsAutomataCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new RoboticsAutomataCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for repetitive telemetry', () => {
    const engine = new RoboticsAutomataCompressionEngine();
    const telemetry = 'LIDAR_SCAN:0.45;LIDAR_SCAN:0.45;LIDAR_SCAN:0.45;STATUS:OK;STATUS:OK;';
    const compressed = engine.compressLZW(telemetry);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, telemetry);
  });

  it('compresses repetitive patterns with positive savings ratio', () => {
    const engine = new RoboticsAutomataCompressionEngine();
    const repetitive = 'ROBOTICS_AUTONOMY_PAYLOAD_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric robotics stream data', () => {
    const engine = new RoboticsAutomataCompressionEngine();
    const sample = 'ARM_AXIS_0: 120.45deg, ARM_AXIS_1: -45.12deg [TORQUE: 18.4Nm]';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new RoboticsAutomataCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
