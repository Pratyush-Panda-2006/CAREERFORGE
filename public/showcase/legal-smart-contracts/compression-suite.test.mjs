import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsCompressionEngine } from './compression-suite.js';

describe('LegalSmartContractsCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new LegalSmartContractsCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for smart contract bytecode/ABI', () => {
    const engine = new LegalSmartContractsCompressionEngine();
    const contractData = 'CONTRACT:EscrowSettlement;CLAUSE_ID:104;DISPUTE_TIMEOUT:86400;ARBITRATOR:0x71C...392;STATE:ACTIVE;';
    const compressed = engine.compressLZW(contractData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, contractData);
  });

  it('compresses repetitive legal clauses with positive savings ratio', () => {
    const engine = new LegalSmartContractsCompressionEngine();
    const repetitive = 'CLAUSE_ARBITRATION_TERMS_SECTION_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
    assert.ok(metrics.gasSaved > 0);
  });

  it('supports ASCII and common alphanumeric legal agreement structures', () => {
    const engine = new LegalSmartContractsCompressionEngine();
    const sample = 'PARTY_A:0x123;PARTY_B:0x456;ESCROW_VAL:1000ETH;HASH:0xabc789;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new LegalSmartContractsCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
