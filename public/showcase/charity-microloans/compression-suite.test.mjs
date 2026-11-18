import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansCompressionEngine } from './compression-suite.js';

describe('CharityMicroloansCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new CharityMicroloansCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for microloan ledgers', () => {
    const engine = new CharityMicroloansCompressionEngine();
    const ledgerData = 'LOAN_ID:ML-8812;BORROWER:Amina;AMOUNT_USD:350;INSTALLMENT:12;STATUS:ON_TIME;BALANCE:140;';
    const compressed = engine.compressLZW(ledgerData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, ledgerData);
  });

  it('compresses repetitive field officer batches with positive savings ratio', () => {
    const engine = new CharityMicroloansCompressionEngine();
    const repetitive = 'MICROFINANCE_PORTFOLIO_AUDIT_TRANSACTION_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric microloan structures', () => {
    const engine = new CharityMicroloansCompressionEngine();
    const sample = 'POOL:COOP_ALPHA;SCORE:96;CURR:KES;COLLECT:4200;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new CharityMicroloansCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
