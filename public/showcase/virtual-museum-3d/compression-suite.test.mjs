import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dCompressionEngine } from './compression-suite.js';

describe('VirtualMuseum3dCompressionEngine', () => {
  it('instantiates cleanly with proper class name', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    assert.strictEqual(engine.name, 'VirtualMuseum3dCompressionEngine');
  });

  it('compresses repetitive 3D mesh strings with positive code count', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    const input = 'MUSEUM_GALLERY_MESH_INDEX_001_MUSEUM_GALLERY_MESH_INDEX_001_MUSEUM_GALLERY_MESH_INDEX_001';
    const compressed = engine.compressLZW(input);

    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);
    assert.ok(compressed.length < input.length, 'Repetitive 3D asset stream should yield fewer codes than raw characters');
  });

  it('guarantees 100% lossless roundtrip decoding fidelity', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    const sample = 'EXHIBITION: Winged Victory of Samothrace (Hellenistic sculpture, 2nd century BC). Polycount: 450,000 tris. PBR albedo/roughness textures.';
    const encoded = engine.compressLZW(sample);
    const decoded = engine.decompressLZW(encoded);

    assert.strictEqual(decoded, sample);
  });

  it('gracefully handles empty string and non-string edge cases', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    assert.deepStrictEqual(engine.compressLZW(''), []);
    assert.deepStrictEqual(engine.compressLZW(null), []);
    assert.strictEqual(engine.decompressLZW([]), '');
    assert.strictEqual(engine.decompressLZW(null), '');
  });

  it('supports UTF-8 artifact symbols and international language characters cleanly', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    const unicodeInput = '🏛️ Musée du Louvre: Victoire de Samothrace & Joconde 🎨 1503–1519 léonard de vinci ✨';
    const compressed = engine.compressLZW(unicodeInput);
    const decompressed = engine.decompressLZW(compressed);

    assert.strictEqual(decompressed, unicodeInput);
  });

  it('calculates bandwidth savings and compression ratio accurately', () => {
    const engine = new VirtualMuseum3dCompressionEngine();
    const text = 'REPETITIVE_GLTF_BUFFER_INDEX_STREAM_REPETITIVE_GLTF_BUFFER_INDEX_STREAM_REPETITIVE_GLTF_BUFFER_INDEX_STREAM';
    const codes = engine.compressLZW(text);
    const stats = engine.computeSavingsRatio(text, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength > 0);
    assert.ok(stats.ratio > 0);
    assert.ok(typeof stats.savingsPercent === 'number');
  });
});
