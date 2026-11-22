import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DocsPortalBloomFilter,
  murmurHash3_32,
  fnv1a_32
} from './bloom-filter.js';

test('DocsPortalBloomFilter exports and construction', async (t) => {
  await t.test('initializes with default bitSize 256 and hashCount 4', () => {
    const filter = new DocsPortalBloomFilter();
    assert.equal(filter.bitSize, 256);
    assert.equal(filter.hashCount, 4);
    assert.equal(filter.getStats().itemsCount, 0);
    assert.equal(filter.getStats().setBits, 0);
    assert.equal(filter.getStats().fillRatio, 0);
    assert.equal(filter.calculateFalsePositiveRate(), 0);
  });

  await t.test('supports custom positional constructor parameters', () => {
    const filter = new DocsPortalBloomFilter(512, 6);
    assert.equal(filter.bitSize, 512);
    assert.equal(filter.hashCount, 6);
    assert.equal(filter.getBits().length, 512);
  });

  await t.test('supports options object constructor', () => {
    const filter = new DocsPortalBloomFilter({ bitSize: 1024, hashCount: 8 });
    assert.equal(filter.bitSize, 1024);
    assert.equal(filter.hashCount, 8);
  });

  await t.test('enforces immutability of configuration parameters', () => {
    const filter = new DocsPortalBloomFilter();
    assert.throws(() => { filter.bitSize = 100; }, TypeError);
    assert.throws(() => { filter.hashCount = 2; }, TypeError);
  });

  await t.test('validates constructor parameters within valid ranges', () => {
    assert.throws(() => new DocsPortalBloomFilter(0), RangeError);
    assert.throws(() => new DocsPortalBloomFilter(7), RangeError);
    assert.throws(() => new DocsPortalBloomFilter(200000), RangeError);
    assert.throws(() => new DocsPortalBloomFilter(256.5), RangeError);
    assert.throws(() => new DocsPortalBloomFilter('256'), RangeError);

    assert.throws(() => new DocsPortalBloomFilter(256, 0), RangeError);
    assert.throws(() => new DocsPortalBloomFilter(256, 33), RangeError);
    assert.throws(() => new DocsPortalBloomFilter(256, 2.5), RangeError);
  });
});

test('Hashing primitives (MurmurHash3 & FNV-1a)', async (t) => {
  await t.test('murmurHash3_32 produces deterministic canonical 32-bit hashes', () => {
    const encoder = new TextEncoder();
    const bytes1 = encoder.encode('The quick brown fox jumps over the lazy dog');
    const hash1 = murmurHash3_32(bytes1, 0);
    // Canonical Murmur3-32 for this string is 0x2e4ff723 (776992547)
    assert.equal(hash1.toString(16), '2e4ff723');

    const bytes2 = encoder.encode('DocsPortal');
    assert.equal(murmurHash3_32(bytes2, 0), murmurHash3_32(bytes2, 0));
  });

  await t.test('fnv1a_32 produces deterministic 32-bit hashes', () => {
    const encoder = new TextEncoder();
    const emptyBytes = encoder.encode('');
    // FNV-1a 32-bit offset basis is 0x811c9dc5 (2166136261)
    assert.equal(fnv1a_32(emptyBytes).toString(16), '811c9dc5');

    const bytes = encoder.encode('GET /api/v1/docs');
    assert.equal(fnv1a_32(bytes), fnv1a_32(bytes));
  });
});

test('Zero false-negatives invariant guarantee', async (t) => {
  await t.test('empty filter contains nothing', () => {
    const filter = new DocsPortalBloomFilter();
    assert.equal(filter.contains('GET /api/v1/users'), false);
    assert.equal(filter.has('POST /api/v1/auth'), false);
    assert.equal(filter.query('search?q=test').present, false);
  });

  await t.test('single inserted item is strictly present', () => {
    const filter = new DocsPortalBloomFilter();
    filter.insert('GET /api/v1/docs');
    assert.equal(filter.contains('GET /api/v1/docs'), true);
    assert.equal(filter.has('GET /api/v1/docs'), true);
  });

  await t.test('all items across a large 300-item corpus survive without false negatives', () => {
    const filter = new DocsPortalBloomFilter(1024, 5);
    const corpus = Array.from({ length: 300 }, (_, i) => `route:/api/v${i % 3}/endpoint-${i}:token-${i * 17}`);
    
    for (const item of corpus) {
      filter.insert(item);
    }

    assert.equal(filter.getStats().itemsCount, 300);

    for (const item of corpus) {
      assert.equal(filter.contains(item), true, `Item ${item} must be present (zero false negatives)`);
      assert.equal(filter.has(item), true);
    }
  });

  await t.test('handles unicode, emojis, accents, and whitespace preserving distinctness', () => {
    const filter = new DocsPortalBloomFilter(2048, 4);
    const specialStrings = [
      'é',
      'e\u0301',
      ' docs-portal ',
      'docs-portal',
      'DOCS-PORTAL',
      '🚀 /api/launch',
      '日本語ドキュメント',
      'JSON {"key": "val"}'
    ];

    for (const str of specialStrings) {
      filter.insert(str);
    }

    for (const str of specialStrings) {
      assert.equal(filter.contains(str), true);
    }

    // Case and whitespace sensitivity check
    assert.notDeepEqual(filter.getIndices('docs-portal'), filter.getIndices('DOCS-PORTAL'));
    assert.notDeepEqual(filter.getIndices(' docs-portal '), filter.getIndices('docs-portal'));
  });
});

test('Kirsch-Mitzenmacher double-hashing properties', async (t) => {
  await t.test('positions are deterministic and bounded strictly in [0, bitSize - 1]', () => {
    const filter = new DocsPortalBloomFilter(512, 6);
    const pos1 = filter.getIndices('test-keyword');
    const pos2 = filter.positions('test-keyword');

    assert.deepEqual(pos1, pos2);
    assert.equal(pos1.length, 6);
    for (const idx of pos1) {
      assert.ok(Number.isInteger(idx));
      assert.ok(idx >= 0 && idx < 512);
    }
  });

  await t.test('works correctly with different bit sizes and hash counts', () => {
    for (const size of [64, 128, 256, 1024, 4096]) {
      for (const k of [1, 2, 4, 8, 12]) {
        const f = new DocsPortalBloomFilter(size, k);
        const indices = f.getIndices('portal-route');
        assert.equal(indices.length, k);
        assert.ok(indices.every(idx => idx >= 0 && idx < size));
      }
    }
  });
});

test('Collision detection and bit tracking', async (t) => {
  await t.test('first insert on clean filter reports 0 collisions', () => {
    const filter = new DocsPortalBloomFilter(512, 4);
    const res = filter.insert('first-item');
    assert.equal(res.collisionCount, 0);
    assert.equal(res.isCollision, false);
    assert.equal(res.collisions.length, 0);
    assert.equal(res.positions.length, 4);
  });

  await t.test('duplicate insert reports 100% collision rate on existing bits', () => {
    const filter = new DocsPortalBloomFilter(512, 4);
    const firstRes = filter.insert('duplicate-item');
    const secondRes = filter.insert('duplicate-item');

    assert.deepEqual(secondRes.positions, firstRes.positions);
    assert.deepEqual(secondRes.collisions, firstRes.positions);
    assert.equal(secondRes.isCollision, true);
    assert.equal(filter.getStats().itemsCount, 2);
  });

  await t.test('partial collision between distinct items is correctly identified', () => {
    const filter = new DocsPortalBloomFilter(64, 8); // Small size forces collisions
    filter.insert('item-alpha');
    const resBeta = filter.insert('item-beta');
    // On small 64-bit filter with 8 hashes, collision is very likely or observable
    assert.ok(Array.isArray(resBeta.collisions));
  });
});

test('Membership query with detailed diagnostics', async (t) => {
  await t.test('query(item) returns detailed diagnostic probe indices', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    filter.insert('GET /api/v1/health');

    const queryMatch = filter.query('GET /api/v1/health');
    assert.equal(queryMatch.present, true);
    assert.equal(queryMatch.has, true);
    assert.equal(queryMatch.indices.length, 4);
    assert.equal(queryMatch.positions.length, 4);
    assert.ok(queryMatch.bitStates.every(s => s.value === 1));
    assert.equal(Boolean(queryMatch.valueOf()), true);

    const queryAbsent = filter.query('GET /api/v1/missing');
    assert.equal(queryAbsent.present, false);
    assert.equal(queryAbsent.has, false);
    assert.equal(Boolean(queryAbsent.valueOf()), false);
    assert.ok(queryAbsent.bitStates.some(s => s.value === 0));
  });

  await t.test('contains(item, true) returns detailed object', () => {
    const filter = new DocsPortalBloomFilter();
    filter.insert('test');
    const detailed = filter.contains('test', true);
    assert.equal(typeof detailed, 'object');
    assert.equal(detailed.present, true);
    assert.ok(Array.isArray(detailed.indices));
  });
});

test('Batch insertion operations', async (t) => {
  await t.test('batchInsert successfully inserts multiple items and returns diagnostics', () => {
    const filter = new DocsPortalBloomFilter(512, 4);
    const batch = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5'];
    const results = filter.batchInsert(batch);

    assert.equal(results.length, 5);
    assert.equal(filter.getStats().itemsCount, 5);
    for (const item of batch) {
      assert.equal(filter.contains(item), true);
    }
  });

  await t.test('batchInsert validates iterable input', () => {
    const filter = new DocsPortalBloomFilter();
    assert.throws(() => filter.batchInsert(null), TypeError);
    assert.throws(() => filter.batchInsert(123), TypeError);
  });
});

test('Theoretical false positive rate and telemetry metrics', async (t) => {
  await t.test('matches analytical reference formula (1 - exp(-k*n/m))^k', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    for (let i = 0; i < 32; i++) {
      filter.insert(`reference-key-${i}`);
    }

    const expectedFpr = (1 - Math.exp(-4 * 32 / 256)) ** 4;
    const actualFpr = filter.calculateFalsePositiveRate();
    assert.ok(Math.abs(actualFpr - expectedFpr) < 1e-12);
    assert.ok(Math.abs(filter.getExpectedFPR() - actualFpr) < 1e-12);
  });

  await t.test('getStats returns all expected architectural metrics', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    filter.insert('sample-item');
    const stats = filter.getStats();

    assert.equal(stats.itemsCount, 1);
    assert.equal(stats.bitSize, 256);
    assert.equal(stats.hashCount, 4);
    assert.ok(stats.setBits > 0 && stats.setBits <= 4);
    assert.ok(stats.fillRatio > 0 && stats.fillRatio <= 4 / 256);
    assert.ok(stats.theoreticalFPR > 0 && stats.theoreticalFPR < 1);
  });

  await t.test('estimateItemsCount accurately approximates insertions', () => {
    const filter = new DocsPortalBloomFilter(1024, 4);
    for (let i = 0; i < 50; i++) {
      filter.insert(`item-${i}`);
    }
    const estimate = filter.estimateItemsCount();
    // Estimate should be within 15% of 50
    assert.ok(estimate >= 40 && estimate <= 60);
  });

  await t.test('empirical false positive rate on large filter is below theoretical upper bound', () => {
    const filter = new DocsPortalBloomFilter(1024, 4);
    for (let i = 0; i < 40; i++) {
      filter.insert(`inserted-doc-${i}`);
    }

    let observedFalsePositives = 0;
    const totalAbsentQueries = 2000;
    for (let i = 0; i < totalAbsentQueries; i++) {
      if (filter.contains(`completely-absent-doc-${i}`)) {
        observedFalsePositives++;
      }
    }

    const observedRate = observedFalsePositives / totalAbsentQueries;
    // Expected FPR is ~ (1 - exp(-4 * 40 / 1024))^4 ≈ 0.00045 (~0.05%)
    // Even with variance, observed should be under 2% (40 out of 2000)
    assert.ok(observedRate < 0.02, `Observed ${observedFalsePositives} / ${totalAbsentQueries}`);
  });
});

test('Clear and reset mechanics', async (t) => {
  await t.test('clear resets bit array, stats, and query status', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    filter.batchInsert(['a', 'b', 'c']);
    assert.equal(filter.getStats().itemsCount, 3);
    assert.ok(filter.getStats().setBits > 0);

    filter.clear();

    assert.equal(filter.getStats().itemsCount, 0);
    assert.equal(filter.getStats().setBits, 0);
    assert.equal(filter.getStats().fillRatio, 0);
    assert.equal(filter.calculateFalsePositiveRate(), 0);
    assert.ok(filter.getBits().every(b => b === 0));

    assert.equal(filter.contains('a'), false);
    assert.equal(filter.contains('b'), false);
    assert.equal(filter.contains('c'), false);
  });

  await t.test('reset is an alias for clear', () => {
    const filter = new DocsPortalBloomFilter();
    filter.insert('test');
    filter.reset();
    assert.equal(filter.getStats().itemsCount, 0);
    assert.equal(filter.contains('test'), false);
  });
});

test('State encapsulation and mutation isolation', async (t) => {
  await t.test('modifying getBits() array does not mutate internal filter state', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    filter.insert('shielded-item');
    const bits = filter.getBits();
    bits.fill(0); // Attempt to corrupt

    assert.equal(filter.contains('shielded-item'), true);
    assert.ok(filter.getStats().setBits > 0);
  });

  await t.test('modifying snapshot() does not alter filter state', () => {
    const filter = new DocsPortalBloomFilter(256, 4);
    filter.insert('snapshot-test');
    const snap = filter.snapshot();
    snap.bits.fill(0);
    snap.setBits = 0;

    assert.equal(filter.contains('snapshot-test'), true);
  });
});

test('Input validation and boundary handling', async (t) => {
  await t.test('rejects null, undefined, non-strings, and empty strings with TypeError', () => {
    const filter = new DocsPortalBloomFilter();
    const invalidInputs = [null, undefined, '', 123, {}, [], false];

    for (const input of invalidInputs) {
      assert.throws(() => filter.insert(input), TypeError);
      assert.throws(() => filter.contains(input), TypeError);
      assert.throws(() => filter.query(input), TypeError);
      assert.throws(() => filter.getIndices(input), TypeError);
    }
  });

  await t.test('getBit validates index boundaries', () => {
    const filter = new DocsPortalBloomFilter(128, 4);
    assert.throws(() => filter.getBit(-1), RangeError);
    assert.throws(() => filter.getBit(128), RangeError);
    assert.doesNotThrow(() => filter.getBit(0));
    assert.doesNotThrow(() => filter.getBit(127));
  });

  await t.test('handles arbitrarily long strings without throwing or crashing', () => {
    const filter = new DocsPortalBloomFilter();
    const longString = 'api/route/'.repeat(500);
    assert.doesNotThrow(() => filter.insert(longString));
    assert.equal(filter.contains(longString), true);
  });
});
