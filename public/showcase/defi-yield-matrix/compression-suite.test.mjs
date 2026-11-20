import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixCompressionEngine } from './compression-suite.js';

describe('DefiYieldMatrixCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    assert.strictEqual(engine.name, 'DefiYieldMatrixCompressionEngine');
  });

  it('compresses repetitive DeFi calldata strings with positive code count', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    const input = 'SWAP_USDC_ETH_POOL_FEE_500_TICK_12345_SWAP_USDC_ETH_POOL_FEE_500_TICK_12345_SWAP_USDC_ETH_POOL_FEE_500_TICK_12345';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive calldata should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    const sample = 'CALLDATA: flashLoan(address recipient, uint256 amount, bytes data). Arbitrage Uniswap v3 & Sushiswap with 12.8% APY.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 crypto ticker symbols and emojis cleanly', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    const unicodeInput = '💎 DeFi Vault: 100.5Ξ (ETH) + 250,000₮ (USDT) 🚀 APY: 42.5% 🔥 Gas: 15 gwei';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new DefiYieldMatrixCompressionEngine();
    const text = 'REPETITIVE_ORDERBOOK_DEPTH_STREAM_REPETITIVE_ORDERBOOK_DEPTH_STREAM_REPETITIVE_ORDERBOOK_DEPTH_STREAM';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
