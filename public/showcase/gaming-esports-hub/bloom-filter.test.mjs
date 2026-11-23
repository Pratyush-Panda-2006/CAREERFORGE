import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubBloomFilter } from './bloom-filter.js';

describe('GamingEsportsHubBloomFilter - Instantiation & Construction', () => {
  test('initializes with default size (256) and hash count (4)', () => {
    const filter = new GamingEsportsHubBloomFilter();
    assert.strictEqual(filter.size, 256);
    assert.strictEqual(filter.bitSize, 256);
    assert.strictEqual(filter.hashCount, 4);
    assert.strictEqual(filter.itemsCount, 0);
    assert.strictEqual(filter.itemCount, 0);
    assert.strictEqual(filter.bitsSet, 0);
    assert.strictEqual(filter.byteLength, 32);
    assert.strictEqual(filter.bitArray.length, 32);

    const bits = filter.getBits();
    assert.strictEqual(bits.length, 256);
    assert.ok(bits.every(b => b === 0));
  });

  test('initializes with positional parameters (size, hashCount)', () => {
    const filter = new GamingEsportsHubBloomFilter(512, 6);
    assert.strictEqual(filter.size, 512);
    assert.strictEqual(filter.bitSize, 512);
    assert.strictEqual(filter.hashCount, 6);
    assert.strictEqual(filter.byteLength, 64);
  });

  test('initializes with options object ({ size, hashCount })', () => {
    const filter = new GamingEsportsHubBloomFilter({ size: 1024, hashCount: 8 });
    assert.strictEqual(filter.size, 1024);
    assert.strictEqual(filter.hashCount, 8);
    assert.strictEqual(filter.byteLength, 128);
  });

  test('initializes with options object using alternative property names ({ bitSize, k })', () => {
    const filter = new GamingEsportsHubBloomFilter({ bitSize: 128, k: 3 });
    assert.strictEqual(filter.size, 128);
    assert.strictEqual(filter.hashCount, 3);
  });

  test('enforces minimum bounds and safe fallbacks for invalid inputs', () => {
    const filter = new GamingEsportsHubBloomFilter(2, 0);
    assert.ok(filter.size >= 8);
    assert.strictEqual(filter.hashCount, 1);

    const filterNaN = new GamingEsportsHubBloomFilter('invalid', -5);
    assert.strictEqual(filterNaN.size, 256);
    assert.strictEqual(filterNaN.hashCount, 4);
  });
});

describe('GamingEsportsHubBloomFilter - Deterministic Double Hashing & Kirsch-Mitzenmacher', () => {
  test('MurmurHash3 32-bit produces consistent unsigned integers', () => {
    const key = 'FaZe_Twistzz#NA1';
    const h1 = GamingEsportsHubBloomFilter.murmur3(key);
    const h2 = GamingEsportsHubBloomFilter.murmur3(key);

    assert.strictEqual(h1, h2);
    assert.ok(Number.isInteger(h1));
    assert.ok(h1 >= 0 && h1 <= 0xffffffff);

    // Instance method returns identical hash
    const filter = new GamingEsportsHubBloomFilter();
    assert.strictEqual(filter.murmur3(key), h1);

    // Different keys produce different hashes
    const otherHash = GamingEsportsHubBloomFilter.murmur3('FaZe_Twistzz#NA2');
    assert.notStrictEqual(h1, otherHash);
  });

  test('FNV-1a 32-bit produces consistent unsigned integers', () => {
    const key = 'ViperAimbot_v4.2.dll';
    const h1 = GamingEsportsHubBloomFilter.fnv1a(key);
    const h2 = GamingEsportsHubBloomFilter.fnv1a(key);

    assert.strictEqual(h1, h2);
    assert.ok(Number.isInteger(h1));
    assert.ok(h1 >= 0 && h1 <= 0xffffffff);

    const filter = new GamingEsportsHubBloomFilter();
    assert.strictEqual(filter.fnv1a(key), h1);

    const otherHash = GamingEsportsHubBloomFilter.fnv1a('ViperAimbot_v4.3.dll');
    assert.notStrictEqual(h1, otherHash);
  });

  test('getHashValues returns murmur and non-zero fnv values', () => {
    const filter = new GamingEsportsHubBloomFilter();
    const hashes = filter.getHashValues('s1mple#NAVI');
    assert.ok('murmur' in hashes);
    assert.ok('fnv' in hashes);
    assert.ok(hashes.fnv !== 0);
  });

  test('getHashIndices generates exactly k indices strictly within [0, size - 1]', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 5);
    const key = 'toxic_ragequitter_88';
    const indices = filter.getHashIndices(key);

    assert.strictEqual(indices.length, 5);
    indices.forEach((idx) => {
      assert.ok(Number.isInteger(idx));
      assert.ok(idx >= 0 && idx < 256, `Index ${idx} must be within [0, 255]`);
    });

    // Deterministic check
    const repeatIndices = filter.getHashIndices(key);
    assert.deepStrictEqual(indices, repeatIndices);
  });

  test('Kirsch-Mitzenmacher formula g_i(x) = (h1 + i * h2) % size matches manual evaluation', () => {
    const filter = new GamingEsportsHubBloomFilter(512, 4);
    const key = 'MatchFixer_Pro';
    const { murmur, fnv } = filter.getHashValues(key);
    const indices = filter.getHashIndices(key);

    for (let i = 0; i < 4; i++) {
      const expected = ((murmur + Math.imul(i, fnv)) >>> 0) % 512;
      assert.strictEqual(indices[i], expected);
    }
  });
});

describe('GamingEsportsHubBloomFilter - Invariant: Zero False Negatives Guarantee', () => {
  test('strictly guarantees 0% false negatives across 250 diverse esports tags and signatures', () => {
    const filter = new GamingEsportsHubBloomFilter(2048, 5);
    const corpus = [];

    // Realistic esports dataset
    const prefixes = ['FaZe', 'SEN', 'NAVI', 'G2', 'Cloud9', 'T1', 'Fnatic', 'EDG'];
    const roles = ['Sniper', 'Duelist', 'Smurf', 'IGL', 'Anchor', 'Lurker', 'Booster'];
    const cheatTypes = ['Aimbot', 'Spinbot', 'RadarHack', 'TriggerBot', 'WallHack', 'SpeedHack'];

    for (let i = 0; i < 100; i++) {
      corpus.push(`${prefixes[i % prefixes.length]}_${roles[i % roles.length]}#${1000 + i}`);
      corpus.push(`sig:${cheatTypes[i % cheatTypes.length]}_v${(i % 10) + 1}_crc${i.toString(16)}`);
      corpus.push(`hwid:88:fe:${(i % 255).toString(16).padStart(2, '0')}:${((i * 7) % 255).toString(16).padStart(2, '0')}`);
    }

    // Ingest all items
    for (const item of corpus) {
      filter.insert(item);
    }

    // Invariant verification: EVERY inserted item MUST return contains(item) === true
    let falseNegativeCount = 0;
    for (const item of corpus) {
      if (!filter.contains(item)) {
        falseNegativeCount++;
      }
    }

    assert.strictEqual(
      falseNegativeCount,
      0,
      `Invariant violation: detected ${falseNegativeCount} false negatives! Zero false negatives must be guaranteed.`
    );
  });

  test('zero false negatives holds for unicode tags and special symbols', () => {
    const filter = new GamingEsportsHubBloomFilter(512, 4);
    const specialTags = [
      '🎮Gamer_King🔥',
      '朴智星#KR1',
      'Ярослав_Снайпер',
      'Team_Liquid#1234',
      'user@esports.gg',
      'spaces in gamertag',
      'Tab\tSeparated\tID',
      'Special!@#$%^&*()_+{}[]:;<>,.?/|~`'
    ];

    for (const tag of specialTags) {
      filter.add(tag);
    }

    for (const tag of specialTags) {
      assert.strictEqual(filter.contains(tag), true, `Failed on special tag: ${tag}`);
      assert.strictEqual(filter.has(tag), true, `has() failed on special tag: ${tag}`);
    }
  });
});

describe('GamingEsportsHubBloomFilter - Insertion, Membership Query & Diagnostics', () => {
  test('insert() and add() set bits and return accurate diagnostic details', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 3);
    const item = 'BannedGamer#0001';
    const indices = filter.getHashIndices(item);

    assert.strictEqual(filter.contains(item), false);

    const result = filter.add(item);
    assert.strictEqual(result.item, item);
    assert.deepStrictEqual(result.indices, indices);
    assert.ok(result.newlySetBits > 0 && result.newlySetBits <= 3);
    assert.strictEqual(filter.itemsCount, 1);
    assert.strictEqual(filter.itemCount, 1);

    // Verify all bits in filter are now 1
    for (const idx of indices) {
      assert.strictEqual(filter.getBit(idx), 1);
    }
    assert.strictEqual(filter.contains(item), true);
  });

  test('insert() detects collisions when re-inserting or overlapping hashes', () => {
    const filter = new GamingEsportsHubBloomFilter(128, 4);
    const item = 'SmurfGod_99';

    const res1 = filter.insert(item);
    assert.strictEqual(res1.collisions.length, 0);
    assert.strictEqual(res1.wasAlreadyPresent, false);

    // Second insert of same item
    const res2 = filter.insert(item);
    assert.strictEqual(res2.newlySetBits, 0);
    assert.ok(res2.collisions.length > 0);
    assert.strictEqual(res2.wasAlreadyPresent, true);
    assert.strictEqual(filter.itemsCount, 2);
  });

  test('query() returns comprehensive diagnostic object with bit breakdown', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 4);
    const player = 'TenZ#SEN';
    filter.add(player);

    const diag = filter.query(player);
    assert.strictEqual(diag.item, player);
    assert.strictEqual(diag.present, true);
    assert.strictEqual(diag.verdict, 'PROBABLY_PRESENT');
    assert.strictEqual(diag.bitStates.length, 4);
    assert.ok(diag.bitStates.every(b => b.isSet === true));
    assert.ok(typeof diag.murmur === 'number');
    assert.ok(typeof diag.fnv === 'number');
    assert.ok(diag.guarantee.includes('Probable blacklist match'));

    // Absent query
    const cleanPlayer = 'CleanRookie#2026';
    const cleanDiag = filter.query(cleanPlayer);
    assert.strictEqual(cleanDiag.present, false);
    assert.strictEqual(cleanDiag.verdict, 'DEFINITELY_NOT_PRESENT');
    assert.ok(cleanDiag.bitStates.some(b => b.isSet === false));
    assert.ok(cleanDiag.guarantee.includes('0% False Negative Guarantee'));
  });

  test('query() and contains() gracefully handle empty string or null/undefined', () => {
    const filter = new GamingEsportsHubBloomFilter();
    assert.strictEqual(filter.contains(null), false);
    assert.strictEqual(filter.contains(undefined), false);

    const nullDiag = filter.query(null);
    assert.strictEqual(nullDiag.present, false);
    assert.strictEqual(nullDiag.verdict, 'DEFINITELY_NOT_PRESENT');

    assert.throws(() => filter.add(null), TypeError);
    assert.throws(() => filter.add(undefined), TypeError);
  });
});

describe('GamingEsportsHubBloomFilter - Array Representation & Bit Access', () => {
  test('getBits() returns array of exact length with 0 and 1 values', () => {
    const filter = new GamingEsportsHubBloomFilter(64, 2);
    const initialBits = filter.getBits();
    assert.strictEqual(initialBits.length, 64);
    assert.ok(initialBits.every(b => b === 0));

    filter.add('tag1');
    const updatedBits = filter.getBits();
    assert.strictEqual(updatedBits.length, 64);
    const setBitsCount = updatedBits.filter(b => b === 1).length;
    assert.strictEqual(setBitsCount, filter.bitsSet);
  });

  test('getBitArray() returns Uint8Array copy that does not mutate internal buffer', () => {
    const filter = new GamingEsportsHubBloomFilter(64, 2);
    filter.add('tag_alpha');

    const copy = filter.getBitArray();
    assert.ok(copy instanceof Uint8Array);
    assert.strictEqual(copy.length, 8);

    // Mutating copy should not mutate filter
    copy.fill(255);
    assert.notDeepStrictEqual(filter.bitArray, copy);
  });

  test('getBit() correctly accesses individual bits and handles out-of-range indices', () => {
    const filter = new GamingEsportsHubBloomFilter(128, 4);
    assert.strictEqual(filter.getBit(0), 0);
    assert.strictEqual(filter.getBit(127), 0);
    assert.strictEqual(filter.getBit(-1), 0);
    assert.strictEqual(filter.getBit(128), 0);
    assert.strictEqual(filter.getBit(999), 0);
  });
});

describe('GamingEsportsHubBloomFilter - False Positive Rate & Statistics', () => {
  test('theoretical FPR is 0 for an empty filter', () => {
    const filter = new GamingEsportsHubBloomFilter();
    assert.strictEqual(filter.calculateFalsePositiveRate(), 0);
    assert.strictEqual(filter.getExpectedFPR(), 0);
    assert.strictEqual(filter.estimateFalsePositiveRate(), 0);
  });

  test('theoretical FPR increases monotonically as items are added', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 4);
    let previousFPR = 0;

    for (let i = 0; i < 30; i++) {
      filter.add(`cheater_${i}`);
      const currentFPR = filter.calculateFalsePositiveRate();
      assert.ok(currentFPR >= previousFPR, `FPR decreased at step ${i}`);
      assert.ok(currentFPR <= 1.0);
      previousFPR = currentFPR;
    }
  });

  test('getStats() compiles full telemetry and saturation statistics', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 4);
    filter.add('ApexPredator#1');
    filter.add('ApexPredator#2');

    const stats = filter.getStats();
    assert.strictEqual(stats.itemsCount, 2);
    assert.strictEqual(stats.itemCount, 2);
    assert.strictEqual(stats.bitSize, 256);
    assert.strictEqual(stats.size, 256);
    assert.strictEqual(stats.hashCount, 4);
    assert.ok(stats.bitsSet > 0 && stats.bitsSet <= 8);
    assert.ok(typeof stats.fillRatio === 'number');
    assert.ok(typeof stats.theoreticalFPR === 'number');
    assert.strictEqual(stats.zeroFalseNegativeGuaranteed, true);
    assert.strictEqual(stats.byteSize, 32);
  });

  test('empirical absent-query false positive rate is bounded under target threshold', () => {
    // 1024 bits, 4 hashes, 32 inserted items
    // Theoretical FPR = (1 - e^(-4 * 32 / 1024))^4 = (1 - e^(-0.125))^4 = (0.1175)^4 = 0.00019 (~0.02%)
    const filter = new GamingEsportsHubBloomFilter(1024, 4);
    for (let i = 0; i < 32; i++) {
      filter.add(`inserted_player_${i}`);
    }

    let falsePositiveHits = 0;
    const testQueries = 3000;
    for (let i = 0; i < testQueries; i++) {
      if (filter.contains(`absent_tag_${i}`)) {
        falsePositiveHits++;
      }
    }

    const observedRate = falsePositiveHits / testQueries;
    // Expected ~0.02%, assert well under conservative 2%
    assert.ok(
      observedRate < 0.02,
      `Observed FPR ${observedRate} (${falsePositiveHits}/${testQueries}) exceeded upper bound 2%`
    );
  });
});

describe('GamingEsportsHubBloomFilter - Batch Operations & Clear/Reset', () => {
  test('batchAdd() and batchInsert() process arrays of items and return correct totals', () => {
    const filter = new GamingEsportsHubBloomFilter(512, 4);
    const batch = ['PlayerA', 'PlayerB', 'PlayerC', 'PlayerD'];

    const res = filter.batchInsert(batch);
    assert.strictEqual(res.addedCount, 4);
    assert.strictEqual(res.totalItems, 4);
    assert.strictEqual(filter.itemsCount, 4);

    for (const player of batch) {
      assert.strictEqual(filter.contains(player), true);
    }
  });

  test('batchContains() checks multiple items in a single call', () => {
    const filter = new GamingEsportsHubBloomFilter();
    filter.add('T1_Faker');
    filter.add('GEN_Chovy');

    const results = filter.batchContains(['T1_Faker', 'GEN_Chovy', 'Absent_Rookie']);
    assert.deepStrictEqual(results, [true, true, false]);
  });

  test('clear() and reset() completely wipe bits, counters, and history', () => {
    const filter = new GamingEsportsHubBloomFilter(256, 4);
    filter.batchAdd(['Tag1', 'Tag2', 'Tag3']);
    assert.strictEqual(filter.itemsCount, 3);
    assert.ok(filter.bitsSet > 0);

    filter.clear();
    assert.strictEqual(filter.itemsCount, 0);
    assert.strictEqual(filter.itemCount, 0);
    assert.strictEqual(filter.bitsSet, 0);
    assert.strictEqual(filter.history.length, 0);
    assert.ok(filter.getBits().every(b => b === 0));

    // Previously inserted items must now return false
    assert.strictEqual(filter.contains('Tag1'), false);
    assert.strictEqual(filter.contains('Tag2'), false);

    // reset() alias works identically
    filter.add('Tag4');
    filter.reset();
    assert.strictEqual(filter.itemsCount, 0);
    assert.strictEqual(filter.contains('Tag4'), false);
  });
});

describe('GamingEsportsHubBloomFilter - Optimal Parameter Calculation', () => {
  test('static and instance calculateOptimalParams generate correct sizing for given n and p', () => {
    // For n=100 items, p=0.01 (1% FPR):
    // m = ceil(- (100 * ln(0.01)) / (ln(2)^2)) = ceil(- (100 * -4.60517) / 0.480453) = ceil(958.5) = 959 bits
    // k = round((959 / 100) * 0.693147) = round(6.64) = 7 hashes
    const optStatic = GamingEsportsHubBloomFilter.calculateOptimalParams(100, 0.01);
    assert.strictEqual(optStatic.expectedItems, 100);
    assert.strictEqual(optStatic.targetFalsePositiveRate, 0.01);
    assert.ok(optStatic.size >= 950 && optStatic.size <= 970);
    assert.strictEqual(optStatic.hashCount, 7);
    assert.strictEqual(optStatic.memoryBytes, Math.ceil(optStatic.size / 8));

    const filter = new GamingEsportsHubBloomFilter();
    const optInstance = filter.calculateOptimalParams(100, 0.01);
    assert.deepStrictEqual(optInstance, optStatic);
  });

  test('calculateOptimalParams handles edge values safely', () => {
    const optZero = GamingEsportsHubBloomFilter.calculateOptimalParams(0, 0);
    assert.ok(optZero.size >= 8);
    assert.ok(optZero.hashCount >= 1);
  });
});
