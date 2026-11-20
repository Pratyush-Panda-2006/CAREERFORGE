import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeCompressionEngine } from './compression-suite.js';

describe('QuantumForgeCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new QuantumForgeCompressionEngine();
    assert.equal(engine.name, 'QuantumForgeCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new QuantumForgeCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses quantum QASM instructions', () => {
    const engine = new QuantumForgeCompressionEngine();
    const qasm = 'OPENQASM 3.0; qubit[8] q; h q[0]; cx q[0], q[1]; cx q[1], q[2]; rz(pi/4) q[2]; measure q;';
    const compressed = engine.compressLZW(qasm);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, qasm);
  });

  it('handles unicode mathematical symbols and Dirac bra-ket notations losslessly', () => {
    const engine = new QuantumForgeCompressionEngine();
    const payload = '⚛️ State: |Ψ⟩ = 1/√2 (|00⟩ + |11⟩) ⊗ |ϕ+⟩ | Fidelity: 99.98% ⚡';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new QuantumForgeCompressionEngine();
    const repeated = 'cx q[0], q[1]; '.repeat(40);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new QuantumForgeCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
