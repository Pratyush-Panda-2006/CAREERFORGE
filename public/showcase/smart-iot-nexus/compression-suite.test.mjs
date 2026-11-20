import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusCompressionEngine } from './compression-suite.js';

describe('SmartIotNexusCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new SmartIotNexusCompressionEngine();
    assert.strictEqual(engine.name, 'SmartIotNexusCompressionEngine');
  });

  it('compresses repetitive IoT sensor strings with positive code count', () => {
    const engine = new SmartIotNexusCompressionEngine();
    const input = 'MQTT_TOPIC_DEVICES_TELEMETRY_MQTT_TOPIC_DEVICES_TELEMETRY_MQTT_TOPIC_DEVICES_TELEMETRY';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive telemetry stream should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new SmartIotNexusCompressionEngine();
    const sample = 'ZIGBEE PACKET: Node #42, Battery: 94%, Temperature: 22.8C, Humidity: 65%, Pressure: 1013.2 hPa, Lux: 450.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new SmartIotNexusCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 IoT sensor status symbols and degree units cleanly', () => {
    const engine = new SmartIotNexusCompressionEngine();
    const unicodeInput = '📡 Edge Gateway #07: Ambient Temp 24.5°C ±0.2°C ⚡ Power: 12.4W 📶 Signal: -62dBm';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new SmartIotNexusCompressionEngine();
    const text = 'REPETITIVE_SENSOR_BURST_BUFFER_REPETITIVE_SENSOR_BURST_BUFFER_REPETITIVE_SENSOR_BURST_BUFFER';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
