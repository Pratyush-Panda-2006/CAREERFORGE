import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelBloomFilter } from './bloom-filter.js';

describe('CybersecuritySentinelBloomFilter - Core Functionality & Determinism', () => {
  test('initializes with default bit capacity and hash function count', () => {
    const filter = new CybersecuritySentinelBloomFilter();
    assert.strictEqual(filter.size, 128);
    assert.strictEqual(filter.hashCount, 4);
    assert.strictEqual(filter.itemCount, 0);
    assert.strictEqual(filter.bits.length, 128);
    assert.strictEqual(filter.bits.every(b => b === 0), true);
  });

  test('initializes with custom dimensions and bounds enforcement', () => {
    const filter = new CybersecuritySentinelBloomFilter(256, 6);
    assert.strictEqual(filter.size, 256);
    assert.strictEqual(filter.hashCount, 6);
    assert.strictEqual(filter.bits.length, 256);

    // Minimum size enforcement
    const smallFilter = new CybersecuritySentinelBloomFilter(4, 0);
    assert.ok(smallFilter.size >= 8);
    assert.strictEqual(smallFilter.hashCount, 1);
  });

  test('deterministic hashing produces identical bit indices across repeated calls', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    const threat = '192.168.1.100';

    const indices1 = filter.getHashIndices(threat);
    const indices2 = filter.getHashIndices(threat);

    assert.deepStrictEqual(indices1, indices2);
    assert.strictEqual(indices1.length, 4);
    indices1.forEach(idx => {
      assert.ok(Number.isInteger(idx));
      assert.ok(idx >= 0 && idx < 128);
    });
  });

  test('adding an item deterministically sets exact calculated bits to 1', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    const item = 'CVE-2024-38077';
    const indices = filter.getHashIndices(item);

    assert.strictEqual(filter.contains(item), false);

    const result = filter.add(item);
    assert.strictEqual(result.item, item);
    assert.deepStrictEqual(result.indices, indices);

    indices.forEach(idx => {
      assert.strictEqual(filter.bits[idx], 1, `Bit at index ${idx} should be 1`);
    });

    assert.strictEqual(filter.itemCount, 1);
  });

  test('hashing algorithms FNV-1a and Murmur3 produce consistent 32-bit unsigned integers', () => {
    const sample = 'payload-signature-alpha';
    const fnv = CybersecuritySentinelBloomFilter.fnv1a(sample);
    const murmur = CybersecuritySentinelBloomFilter.murmur3(sample);

    assert.ok(Number.isInteger(fnv) && fnv >= 0 && fnv <= 0xFFFFFFFF);
    assert.ok(Number.isInteger(murmur) && murmur >= 0 && murmur <= 0xFFFFFFFF);

    // Consistency check
    assert.strictEqual(CybersecuritySentinelBloomFilter.fnv1a(sample), fnv);
    assert.strictEqual(CybersecuritySentinelBloomFilter.murmur3(sample), murmur);

    // Different inputs produce different hashes
    assert.notStrictEqual(CybersecuritySentinelBloomFilter.fnv1a('sample-a'), CybersecuritySentinelBloomFilter.fnv1a('sample-b'));
  });
});

describe('CybersecuritySentinelBloomFilter - 0% False Negative Guarantee', () => {
  test('guarantees 0% false negatives across 100+ distinct cybersecurity threat items', () => {
    const filter = new CybersecuritySentinelBloomFilter(1024, 5);
    const items = [];

    // Generate diverse realistic cybersecurity indicators
    for (let i = 0; i < 150; i++) {
      items.push(`192.168.${Math.floor(i / 256)}.${i % 256}`);
      items.push(`CVE-2026-${1000 + i}`);
      items.push(`trojan-signature-hash-${i.toString(16).padStart(4, '0')}`);
    }

    // Add all items
    for (const item of items) {
      filter.add(item);
    }

    // STRICT 0% FALSE NEGATIVE GUARANTEE:
    // If an item was added, contains(item) MUST NEVER return false.
    let falseNegativeCount = 0;
    for (const item of items) {
      if (!filter.contains(item)) {
        falseNegativeCount++;
      }
    }

    assert.strictEqual(falseNegativeCount, 0, 'False negative count must be strictly 0');
    assert.strictEqual(filter.itemCount, items.length);
  });

  test('empty filter guarantees 0 false positives for any queried item', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    assert.strictEqual(filter.contains('malware.exe'), false);
    assert.strictEqual(filter.contains('10.0.0.1'), false);
    assert.strictEqual(filter.contains('random-threat-token'), false);

    const query = filter.query('unseen-item');
    assert.strictEqual(query.match, false);
    assert.strictEqual(query.isDefinitelyAbsent, true);
    assert.strictEqual(query.isProbablyPresent, false);
  });
});

describe('CybersecuritySentinelBloomFilter - False Positive Estimation & Statistics', () => {
  test('computes accurate telemetry metrics and fill ratio', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    filter.add('threat-1');
    filter.add('threat-2');

    const stats = filter.getStats();
    assert.strictEqual(stats.size, 128);
    assert.strictEqual(stats.hashCount, 4);
    assert.strictEqual(stats.itemCount, 2);
    assert.ok(stats.setBits > 0 && stats.setBits <= 8);
    assert.ok(stats.fillRatio > 0 && stats.fillRatio <= 1);
    assert.strictEqual(stats.zeroBits, 128 - stats.setBits);
    assert.ok(stats.falsePositiveRate >= 0 && stats.falsePositiveRate <= 1);
  });

  test('estimated false positive rate remains within expected theoretical bounds', () => {
    // With m = 512, k = 4, and n = 20:
    // Expected FPR = (1 - e^(-4*20/512))^4 = (1 - e^(-0.15625))^4 ~= (0.1446)^4 ~= 0.00043
    const filter = new CybersecuritySentinelBloomFilter(512, 4);
    for (let i = 0; i < 20; i++) {
      filter.add(`threat-entry-${i}`);
    }

    const stats = filter.getStats();
    assert.ok(stats.theoreticalFPR < 0.01, `Theoretical FPR ${stats.theoreticalFPR} should be < 0.01`);
    assert.ok(stats.empiricalFPR < 0.02, `Empirical FPR ${stats.empiricalFPR} should be < 0.02`);

    // Empirical test over 500 uninserted items
    let falsePositives = 0;
    const testTrials = 500;
    for (let i = 0; i < testTrials; i++) {
      if (filter.contains(`never-inserted-item-${i}`)) {
        falsePositives++;
      }
    }

    const observedFpr = falsePositives / testTrials;
    assert.ok(observedFpr < 0.05, `Observed FPR ${observedFpr} should be within statistical tolerance`);
  });

  test('calculateOptimalParams derives optimal m and k correctly', () => {
    const params = CybersecuritySentinelBloomFilter.calculateOptimalParams(100, 0.01);
    // For n=100, p=0.01:
    // m = ceil(- 100 * ln(0.01) / (ln(2)^2)) = ceil(460.517 / 0.48045) = 959 bits (~960)
    // k = round(959 / 100 * ln(2)) = round(9.59 * 0.693) = 7
    assert.ok(params.size >= 950 && params.size <= 970);
    assert.strictEqual(params.hashCount, 7);

    // Initializing with options object using expectedItems and targetFalsePositiveRate
    const autoFilter = new CybersecuritySentinelBloomFilter({
      expectedItems: 100,
      targetFalsePositiveRate: 0.01
    });
    assert.strictEqual(autoFilter.size, params.size);
    assert.strictEqual(autoFilter.hashCount, params.hashCount);
  });
});

describe('CybersecuritySentinelBloomFilter - Capacity Bounds, Saturation & Reset', () => {
  test('handles saturation gracefully when bit array reaches 100% fill ratio', () => {
    const smallFilter = new CybersecuritySentinelBloomFilter(16, 2);
    // Heavily overload the filter
    for (let i = 0; i < 100; i++) {
      smallFilter.add(`overload-item-${i}`);
    }

    const stats = smallFilter.getStats();
    assert.strictEqual(stats.setBits, 16);
    assert.strictEqual(stats.fillRatio, 1);
    assert.strictEqual(stats.capacitySaturation, 100);

    // When fully saturated, contains returns true for any query without errors
    assert.strictEqual(smallFilter.contains('any-random-query'), true);
  });

  test('clear() thoroughly resets all bits, counters, and history', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    filter.add('threat-alpha');
    filter.add('threat-beta');
    filter.query('threat-alpha');

    assert.strictEqual(filter.itemCount, 2);
    assert.ok(filter.history.length > 0);

    const clearedStats = filter.clear();
    assert.strictEqual(clearedStats.itemCount, 0);
    assert.strictEqual(clearedStats.setBits, 0);
    assert.strictEqual(clearedStats.fillRatio, 0);
    assert.strictEqual(filter.bits.every(b => b === 0), true);
    assert.strictEqual(filter.history.length, 0);
    assert.strictEqual(filter.contains('threat-alpha'), false);
  });

  test('reconfigure() updates dimensions and resets state', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    filter.add('test');
    filter.reconfigure(256, 6);

    assert.strictEqual(filter.size, 256);
    assert.strictEqual(filter.hashCount, 6);
    assert.strictEqual(filter.bits.length, 256);
    assert.strictEqual(filter.itemCount, 0);
    assert.strictEqual(filter.bits.every(b => b === 0), true);
  });

  test('handles various data types and edge cases cleanly', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);

    // Number
    filter.add(404);
    assert.strictEqual(filter.contains(404), true);
    assert.strictEqual(filter.contains('404'), true);

    // Object
    const obj = { cve: 'CVE-2026-0001', severity: 'CRITICAL' };
    filter.add(obj);
    assert.strictEqual(filter.contains(obj), true);

    // Empty string
    filter.add('');
    assert.strictEqual(filter.contains(''), true);

    // Null and undefined
    filter.add(null);
    assert.strictEqual(filter.contains(null), true);
  });

  test('estimateFalsePositiveRate edge cases return zero for non-positive inputs', () => {
    assert.strictEqual(CybersecuritySentinelBloomFilter.estimateFalsePositiveRate(0, 4, 10), 0);
    assert.strictEqual(CybersecuritySentinelBloomFilter.estimateFalsePositiveRate(128, 0, 10), 0);
    assert.strictEqual(CybersecuritySentinelBloomFilter.estimateFalsePositiveRate(128, 4, 0), 0);
    assert.ok(CybersecuritySentinelBloomFilter.estimateFalsePositiveRate(128, 4, 10) > 0);
  });

  test('query() returns complete diagnostic object with bitStates and presence flags', () => {
    const filter = new CybersecuritySentinelBloomFilter(64, 3);
    const item = 'c2-beacon.domain';
    
    // Before adding
    const absentDiag = filter.query(item);
    assert.strictEqual(absentDiag.item, item);
    assert.strictEqual(absentDiag.match, false);
    assert.strictEqual(absentDiag.isDefinitelyAbsent, true);
    assert.strictEqual(absentDiag.isProbablyPresent, false);
    assert.strictEqual(absentDiag.bitStates.length, 3);
    assert.ok(absentDiag.bitStates.some(b => b.value === 0));

    // After adding
    filter.add(item);
    const presentDiag = filter.query(item);
    assert.strictEqual(presentDiag.match, true);
    assert.strictEqual(presentDiag.isDefinitelyAbsent, false);
    assert.strictEqual(presentDiag.isProbablyPresent, true);
    assert.ok(presentDiag.bitStates.every(b => b.value === 1));
  });

  test('maintains bounded history of operations up to 100 entries', () => {
    const filter = new CybersecuritySentinelBloomFilter(128, 4);
    for (let i = 0; i < 120; i++) {
      filter.add(`event-${i}`);
    }
    assert.strictEqual(filter.history.length, 100);
    assert.strictEqual(filter.history[99].item, 'event-119');
  });
});
