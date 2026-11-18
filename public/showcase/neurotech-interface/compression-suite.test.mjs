import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NeurotechInterfaceCompressionEngine } from './compression-suite.js';

describe('NeurotechInterfaceCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    assert.strictEqual(engine.name, 'NeurotechInterfaceCompressionEngine');
  });

  it('compresses repetitive neural telemetry strings with positive code count', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    const input = 'BRAIN_WAVE_ALPHA_8HZ_BRAIN_WAVE_ALPHA_8HZ_BRAIN_WAVE_ALPHA_8HZ';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive EEG stream should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    const sample = 'NEURAL TELEMETRY: 64-channel motor cortex spike burst. Sampling rate 30kHz, microvolt threshold -65uV. Action potential detected.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 neurotech icons and mathematical Greek symbols cleanly', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    const unicodeInput = '🧠 BCI Synapse Grid: θ (Theta 4-7Hz) & γ (Gamma 30-100Hz) Phase Synchrony ⚡ Signal/Noise +12dB';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new NeurotechInterfaceCompressionEngine();
    const text = 'REPETITIVE_SYNAPTIC_SPIKE_STREAM_REPETITIVE_SYNAPTIC_SPIKE_STREAM_REPETITIVE_SYNAPTIC_SPIKE_STREAM';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
