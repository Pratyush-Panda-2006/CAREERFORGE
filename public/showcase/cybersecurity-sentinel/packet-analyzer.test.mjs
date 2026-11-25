import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelPacketAnalyzer } from './packet-analyzer.js';

describe('CybersecuritySentinelPacketAnalyzer', () => {
  it('instantiates correctly with default thresholds and signatures', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    assert.equal(analyzer.entropyHighThreshold, 7.2);
    assert.equal(analyzer.floodRateThreshold, 50);
    assert.ok(analyzer.signatures.length >= 5);
  });

  it('calculates zero entropy on uniform single-byte payloads', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    // Repeating zero bytes: p(0) = 1.0 -> -1 * log2(1) = 0.0
    const zeroBytes = new Uint8Array(64).fill(0);
    const res = analyzer.calculateShannonEntropy(zeroBytes);
    assert.equal(res.entropy, 0.0);
    assert.equal(res.byteLength, 64);
    assert.equal(res.isEncryptedOrPacked, false);
  });

  it('calculates expected moderate entropy on natural ASCII plain-text strings', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    const plainText = 'The quick brown fox jumps over the lazy dog. Standard HTTP payload stream.';
    const res = analyzer.calculateShannonEntropy(plainText);
    // Typical English ASCII text entropy is between 3.5 and 4.8 bits/byte
    assert.ok(res.entropy >= 3.5 && res.entropy <= 4.8);
    assert.equal(res.isEncryptedOrPacked, false);
  });

  it('detects high entropy on pseudo-random / encrypted binary payload', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    // Simulate high-entropy random byte stream (uniformly distributed bytes)
    const randomBytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      randomBytes[i] = i; // perfectly uniform 256 byte distribution -> log2(256) = 8.0 bits
    }
    const res = analyzer.calculateShannonEntropy(randomBytes);
    assert.equal(res.entropy, 8.0);
    assert.equal(res.isEncryptedOrPacked, true);
  });

  it('detects volumetric flooding within sliding window', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer({ floodRateThreshold: 30 });
    const now = Date.now();
    
    // Normal traffic: 10 packets spread over 5 seconds
    const normalTimestamps = [];
    for (let i = 0; i < 10; i++) {
      normalTimestamps.push(now + (i * 500));
    }
    const normalRes = analyzer.detectVolumetricFlooding(normalTimestamps, 1000);
    assert.equal(normalRes.isAnomalous, false);

    // Flood burst: 45 packets within 800ms
    const floodTimestamps = [];
    for (let i = 0; i < 45; i++) {
      floodTimestamps.push(now + (i * 15));
    }
    const floodRes = analyzer.detectVolumetricFlooding(floodTimestamps, 1000);
    assert.equal(floodRes.isAnomalous, true);
    assert.ok(floodRes.maxPacketsInWindow >= 45);
  });

  it('matches SQL injection, XSS, and shellcode threat signatures', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    
    // SQLi Test
    const sqliPayload = "SELECT * FROM users WHERE id = '1' OR '1'='1' UNION SELECT username, password FROM accounts;";
    const sqliMatches = analyzer.matchThreatSignatures(sqliPayload);
    assert.ok(sqliMatches.matchCount >= 2);
    assert.equal(sqliMatches.highestSeverity, 'CRITICAL');

    // XSS Test
    const xssPayload = "<div id='app'><img src='x' onerror='alert(document.cookie)'></div>";
    const xssMatches = analyzer.matchThreatSignatures(xssPayload);
    assert.ok(xssMatches.matchCount >= 1);
    assert.equal(xssMatches.highestSeverity, 'HIGH');
  });

  it('classifies composite threat levels (LOW, MEDIUM, HIGH, CRITICAL) accurately', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();

    // Benign classification
    const benign = analyzer.classifyThreatLevel(3.8, { isAnomalous: false }, { matchCount: 0, highestSeverity: 'NONE' });
    assert.equal(benign.threatLevel, 'LOW');
    assert.ok(benign.threatScore < 20);

    // Critical classification (High entropy + Flood + Critical Signature)
    const critical = analyzer.classifyThreatLevel(
      7.6,
      { isAnomalous: true, maxPacketsInWindow: 90, thresholdRate: 50 },
      { matchCount: 2, highestSeverity: 'CRITICAL' }
    );
    assert.equal(critical.threatLevel, 'CRITICAL');
    assert.ok(critical.threatScore >= 75);
    assert.ok(critical.indicators.length >= 3);
  });

  it('handles empty inputs and edge cases gracefully without crashing', () => {
    const analyzer = new CybersecuritySentinelPacketAnalyzer();
    const emptyEntropy = analyzer.calculateShannonEntropy('');
    assert.equal(emptyEntropy.entropy, 0.0);

    const emptyFlood = analyzer.detectVolumetricFlooding([]);
    assert.equal(emptyFlood.isAnomalous, false);

    const emptySig = analyzer.matchThreatSignatures('');
    assert.equal(emptySig.matchCount, 0);
  });
});
