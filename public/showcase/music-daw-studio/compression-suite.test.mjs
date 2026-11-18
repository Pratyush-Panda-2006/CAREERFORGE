import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioCompressionEngine } from './compression-suite.js';

describe('MusicDawStudioCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new MusicDawStudioCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for MIDI note events', () => {
    const engine = new MusicDawStudioCompressionEngine();
    const midiData = 'NOTE_ON:C4_VEL102_T001;NOTE_OFF:C4_T048;NOTE_ON:E4_VEL98_T049;NOTE_OFF:E4_T096;';
    const compressed = engine.compressLZW(midiData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, midiData);
  });

  it('compresses repetitive audio automation streams with positive savings ratio', () => {
    const engine = new MusicDawStudioCompressionEngine();
    const repetitive = 'AUTOMATION_FADER_VOL_STEP_SAMPLE_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric synthesizer patch data', () => {
    const engine = new MusicDawStudioCompressionEngine();
    const sample = 'OSC:SAW_CUTOFF:1200_RES:0.8_ENV:A10_D50_S80_R200;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new MusicDawStudioCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
