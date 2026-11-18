import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubCompressionEngine } from './compression-suite.js';

describe('VrMetaverseHubCompressionEngine', () => {
  it('handles empty string compression and decompression', () => {
    const engine = new VrMetaverseHubCompressionEngine();
    const compressed = engine.compressLZW('');
    assert.deepEqual(compressed, []);
    const decompressed = engine.decompressLZW([]);
    assert.equal(decompressed, '');
  });

  it('performs lossless roundtrip encode and decode for spatial mesh buffers', () => {
    const engine = new VrMetaverseHubCompressionEngine();
    const meshData = 'VERTEX_XYZ:[0.12,1.85,-0.44];NORMAL:[0,1,0];UV:[0.5,0.5];COLOR:#FF0055;';
    const compressed = engine.compressLZW(meshData);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, meshData);
  });

  it('compresses repetitive avatar kinematics with positive savings ratio', () => {
    const engine = new VrMetaverseHubCompressionEngine();
    const repetitive = 'AVATAR_POSE_STREAM_BONE_TRANSFORM_'.repeat(20);
    const compressed = engine.compressLZW(repetitive);
    const metrics = engine.computeSavingsRatio(repetitive, compressed);

    assert.ok(metrics.originalBytes > metrics.compressedBytes);
    assert.ok(metrics.savingsPercentage > 0);
    assert.ok(metrics.ratio < 1);
  });

  it('supports ASCII and common alphanumeric metaverse stream data', () => {
    const engine = new VrMetaverseHubCompressionEngine();
    const sample = 'IK_HEAD_ROT:[0.05,-0.12,0.99];IK_HAND_L_POS:[0.3,1.1,0.4];';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);
    assert.equal(decoded, sample);
  });

  it('throws error for invalid input structures', () => {
    const engine = new VrMetaverseHubCompressionEngine();
    assert.throws(() => {
      engine.compressLZW(null);
    }, /Input must be a valid string/);

    assert.throws(() => {
      engine.decompressLZW('not an array');
    }, /Compressed payload must be an array of numbers/);
  });
});
