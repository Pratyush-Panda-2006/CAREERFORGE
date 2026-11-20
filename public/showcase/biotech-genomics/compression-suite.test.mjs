import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsCompressionEngine } from './compression-suite.js';

describe('BiotechGenomicsCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    assert.equal(engine.name, 'BiotechGenomicsCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses genomic nucleotide sequences', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    const dnaSeq = 'ATGCGATCGATCGATCGATCGATCGATCGATCGAATTTTCCCCGGGGATGCGATCGATCGATC';
    const compressed = engine.compressLZW(dnaSeq);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, dnaSeq);
  });

  it('handles unicode characters and special characters losslessly', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    const payload = '🔬 CRISPR Cas9 Guide RNA: 5′-GTCGCCCTCG-3′ | ΔΔG = -14.2 kcal/mol 🧬';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    const repeated = 'ATCG'.repeat(50); // 200 bytes
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.equal(stats.rawByteLength, 200);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new BiotechGenomicsCompressionEngine();
    // Providing unknown code above standard initial dictionary range without precedent
    assert.throws(() => {
      engine.decompressLZW([65, 9999]);
    }, /Corrupted LZW code stream/);
  });
});
