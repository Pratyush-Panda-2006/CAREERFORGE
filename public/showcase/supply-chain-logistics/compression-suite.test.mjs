import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsCompressionEngine } from './compression-suite.js';

describe('SupplyChainLogisticsCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new SupplyChainLogisticsCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for EDI freight manifest', () => {
    const engine = new SupplyChainLogisticsCompressionEngine();
    const manifest = 'EDI_856:ST*856*0001~BSN*00*PO10293~TD1*CNT20*100~EDI_856:ST*856*0001~BSN*00*PO10293~';
    const compressed = engine.compressLZW(manifest);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, manifest);
  });

  it('compresses repetitive cargo patterns with positive savings ratio', () => {
    const engine = new SupplyChainLogisticsCompressionEngine();
    const repetitive = 'LOGISTICS_FREIGHT_CONTAINER_MANIFEST_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric logistics stream data', () => {
    const engine = new SupplyChainLogisticsCompressionEngine();
    const sample = 'PALLET_TAG_98402194:SKU_382;WEIGHT:450KG;DESTINATION:DOCK_4;';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new SupplyChainLogisticsCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
