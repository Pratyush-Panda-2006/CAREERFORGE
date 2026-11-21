import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarCompressionEngine } from './compression-suite.js';

describe('AutomotiveHypercarCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    assert.equal(engine.name, 'AutomotiveHypercarCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses ECU telemetry JSON payloads', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    const payload = JSON.stringify({
      speedKmh: 345.8,
      engineRpm: 9200,
      gear: 6,
      ersChargeRatio: 0.94,
      drsOpen: true
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode speed metrics, track symbols, and degree markers losslessly', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    const payload = '🏎️ Lap Record: 01:24.892 • Track Temp: 42.5°C 🏁 [Torque Vectoring: Active ⚡]';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    const repeated = '{"canId": "0x1F2", "torqueNm": 850, "slipRatio": 0.04}, '.repeat(35);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new AutomotiveHypercarCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
