import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProCompressionEngine } from './compression-suite.js';

describe('CryptoExchangeProCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    assert.equal(engine.name, 'CryptoExchangeProCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses orderbook JSON payloads', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    const payload = JSON.stringify({
      pair: "ETH-USDC",
      bids: [[3200.5, 1.2], [3200.0, 4.5]],
      asks: [[3201.0, 2.1], [3201.5, 5.0]]
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode characters and currency symbols losslessly', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    const payload = '⚡ Instant Swap: 1.5 ₿ (BTC) ⇄ 45.2891 Ξ (ETH) @ fee 0.05% 🔥';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    const repeated = '{"price": "98000.00", "size": "1.000"}, '.repeat(35);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new CryptoExchangeProCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
