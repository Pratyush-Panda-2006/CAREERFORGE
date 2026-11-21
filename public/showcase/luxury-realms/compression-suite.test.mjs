import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsCompressionEngine } from './compression-suite.js';

describe('LuxuryRealmsCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    assert.equal(engine.name, 'LuxuryRealmsCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses estate portfolio JSON payloads', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    const payload = JSON.stringify({
      estate: "Monaco Larvotto Penthouse",
      priceEuro: 120000000,
      terraceSqMeters: 450,
      panoramicView: "Mediterranean Sea 360°"
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode luxury symbols and French accents losslessly', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    const payload = '👑 Château Élyséen • Côte d’Azur 💎 Valeur: 75 000 000 € ✨';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    const repeated = '{"propertyType": "Luxury Penthouse", "status": "Acquired"}, '.repeat(35);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new LuxuryRealmsCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
