import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyCompressionEngine } from './compression-suite.js';

describe('EdtechAcademyCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new EdtechAcademyCompressionEngine();
    assert.equal(engine.name, 'EdtechAcademyCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new EdtechAcademyCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses curriculum syllabus payloads', () => {
    const engine = new EdtechAcademyCompressionEngine();
    const payload = JSON.stringify({
      courseId: "CS-500-AI",
      title: "Foundations of Autonomous Agents & Transformers",
      modulesCount: 16,
      studentsEnrolled: 1420,
      activeStatus: true
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode mathematical formulas, greek symbols, and emojis losslessly', () => {
    const engine = new EdtechAcademyCompressionEngine();
    const payload = '📚 Course Formula: Attention(Q, K, V) = softmax(QK^T / √d_k)V ⚡ λ_opt = 0.001 ∫(x)dx ≈ 99.8% 🎓';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new EdtechAcademyCompressionEngine();
    const repeated = '{"topic": "GRADIENT_DESCENT", "loss": 0.042, "lr": 1e-4, "epoch": 12}, '.repeat(30);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new EdtechAcademyCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
