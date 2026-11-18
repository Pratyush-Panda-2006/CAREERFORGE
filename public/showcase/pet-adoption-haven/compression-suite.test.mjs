import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenCompressionEngine } from './compression-suite.js';

describe('PetAdoptionHavenCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new PetAdoptionHavenCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for pet medical records', () => {
    const engine = new PetAdoptionHavenCompressionEngine();
    const record = 'PET_ID:DOG-902;NAME:Luna;BREED:Golden;RABIES:VACCINATED_2026;MICROCHIP:98514100;HEARTWORM:NEGATIVE;';
    const compressed = engine.compressLZW(record);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, record);
  });

  it('compresses repetitive adoption logs with positive savings ratio', () => {
    const engine = new PetAdoptionHavenCompressionEngine();
    const repetitive = 'SHELTER_ADOPTION_ACTIVITY_RECORD_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric shelter telemetry structures', () => {
    const engine = new PetAdoptionHavenCompressionEngine();
    const sample = 'SHELTER:BAY_1;VET_STATUS:PASSED;MICROCHIP_HEX:0x9812A;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new PetAdoptionHavenCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
