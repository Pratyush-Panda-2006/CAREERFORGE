import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelCompressionEngine } from './compression-suite.js';

describe('CybersecuritySentinelCompressionEngine', () => {
  it('instantiates correctly with proper name', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    assert.equal(engine.name, 'CybersecuritySentinelCompressionEngine');
  });

  it('handles empty, null, and undefined inputs cleanly', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    assert.deepEqual(engine.compressLZW(''), []);
    assert.deepEqual(engine.compressLZW(null), []);
    assert.deepEqual(engine.compressLZW(undefined), []);
    assert.equal(engine.decompressLZW([]), '');
    assert.equal(engine.decompressLZW(null), '');
  });

  it('compresses and losslessly decompresses cybersecurity forensic payloads', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    const payload = JSON.stringify({
      incidentId: "INC-99120",
      host: "edge-gateway-eu-01.internal",
      severity: "CRITICAL",
      attackSignature: "CVE-2026-9812 Zero-Day RCE Exploit",
      mitigated: true
    });
    const compressed = engine.compressLZW(payload);
    assert.ok(Array.isArray(compressed));
    assert.ok(compressed.length > 0);

    const decompressed = engine.decompressLZW(compressed);
    assert.equal(decompressed, payload);
  });

  it('handles unicode threat symbols, emojis, and forensic tokens losslessly', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    const payload = '🚨 ALERT: Malware [Trojan.Banker.⚡] detected on §442-Cluster 🛡️ [SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855]';
    const compressed = engine.compressLZW(payload);
    const restored = engine.decompressLZW(compressed);
    assert.equal(restored, payload);
  });

  it('calculates savings ratio and reduction percentages accurately', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    const repeated = '{"event": "FIREWALL_BLOCK", "srcIp": "192.168.1.100", "status": "DENY"}, '.repeat(30);
    const codes = engine.compressLZW(repeated);
    const stats = engine.computeSavingsRatio(repeated, codes);

    assert.ok(stats.rawByteLength > 0);
    assert.ok(stats.compressedByteLength < stats.rawByteLength);
    assert.ok(stats.savingsPercent > 0);
    assert.ok(stats.ratio < 1);
  });

  it('throws an error on corrupted LZW byte stream', () => {
    const engine = new CybersecuritySentinelCompressionEngine();
    assert.throws(() => {
      engine.decompressLZW([65, 8888]);
    }, /Corrupted LZW code stream/);
  });
});
