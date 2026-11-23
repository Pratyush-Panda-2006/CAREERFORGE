import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamBloomFilter } from './bloom-filter.js';

describe('PodcastAudioStreamBloomFilter', () => {
  describe('Initialization and Configuration', () => {
    it('initializes with sensible default configuration (1024 bits, 4 hashes)', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      assert.equal(filter.size, 1024);
      assert.equal(filter.hashCount, 4);
      assert.equal(filter.itemsCount, 0);
      assert.equal(filter.bitsSet, 0);
      assert.equal(filter.name, 'PodcastAudioStreamBloomFilter');
      assert.equal(filter.byteLength, 128);
      assert.equal(filter.bitArray.length, 128);
    });

    it('accepts custom size and hashCount configurations', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 256, hashCount: 6 });
      assert.equal(filter.size, 256);
      assert.equal(filter.hashCount, 6);
      assert.equal(filter.byteLength, 32);
    });

    it('safely handles non-numeric, negative, or small size options', () => {
      const filterInvalidSize = new PodcastAudioStreamBloomFilter({ size: -100, hashCount: -5 });
      assert.ok(filterInvalidSize.size >= 16);
      assert.ok(filterInvalidSize.hashCount >= 1);

      const filterNull = new PodcastAudioStreamBloomFilter({ size: null, hashCount: undefined });
      assert.equal(filterNull.size, 1024);
      assert.equal(filterNull.hashCount, 4);
    });

    it('clamps maximum hashCount to 32 to prevent compute runaway', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 1024, hashCount: 100 });
      assert.equal(filter.hashCount, 32);
    });
  });

  describe('Double-Hashing & Hash Indices Mechanics', () => {
    it('produces deterministic 32-bit Murmur3 and FNV-1a hashes', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
      const h1a = filter.getHashValues('episode-404-dsp');
      const h1b = filter.getHashValues('episode-404-dsp');

      assert.equal(h1a.murmur, h1b.murmur);
      assert.equal(h1a.fnv, h1b.fnv);
      assert.ok(typeof h1a.murmur === 'number');
      assert.ok(typeof h1a.fnv === 'number');
      assert.ok(h1a.murmur >= 0);
      assert.ok(h1a.fnv >= 0);
    });

    it('generates distinct hashes for distinct podcast track identifiers', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      const h1 = filter.getHashValues('track-synth-alpha');
      const h2 = filter.getHashValues('track-synth-beta');

      assert.notEqual(h1.murmur, h2.murmur);
    });

    it('generates exactly k hash indices strictly within [0, size - 1]', () => {
      const size = 300;
      const k = 7;
      const filter = new PodcastAudioStreamBloomFilter({ size, hashCount: k });
      const indices = filter.getHashIndices('podcast-audio-stream-101');

      assert.equal(indices.length, k);
      for (const idx of indices) {
        assert.ok(Number.isInteger(idx));
        assert.ok(idx >= 0, `Index ${idx} is less than 0`);
        assert.ok(idx < size, `Index ${idx} is >= size ${size}`);
      }
    });

    it('handles unicode characters, emojis, and timestamps in episode titles', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
      const key = '🎙️ Episode #42: 宇宙サウンド [01:23:45] ~ 96kHz/24bit';
      const indices = filter.getHashIndices(key);

      assert.equal(indices.length, 4);
      indices.forEach(idx => {
        assert.ok(idx >= 0 && idx < 512);
      });
    });

    it('handles empty string, numbers, booleans, null, and undefined cleanly', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      assert.doesNotThrow(() => filter.getHashIndices(''));
      assert.doesNotThrow(() => filter.getHashIndices(12345));
      assert.doesNotThrow(() => filter.getHashIndices(true));
      assert.doesNotThrow(() => filter.getHashIndices(null));
      assert.doesNotThrow(() => filter.getHashIndices(undefined));
      assert.doesNotThrow(() => filter.getHashIndices({ id: 'ep-obj' }));
    });
  });

  describe('Core Bloom Filter Operations: add() & contains()', () => {
    it('returns false on contains() for any key when filter is empty', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      assert.equal(filter.contains('non-existent-episode'), false);
      assert.equal(filter.contains(''), false);
      assert.equal(filter.contains('trk-404'), false);
    });

    it('sets the corresponding bits and returns metadata when adding an item', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
      const result = filter.add('podcast-live-01');

      assert.equal(result.id, 'podcast-live-01');
      assert.equal(result.indices.length, 4);
      assert.ok(result.newlySetBits > 0);
      assert.equal(filter.itemsCount, 1);
      assert.equal(filter.bitsSet, result.newlySetBits);

      for (const idx of result.indices) {
        assert.equal(filter.getBit(idx), 1);
      }
    });

    it('is idempotent on duplicate inserts without duplicating bitsSet', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
      const res1 = filter.add('duplicate-track');
      const bitsAfterFirst = filter.bitsSet;

      const res2 = filter.add('duplicate-track');
      assert.equal(res2.newlySetBits, 0);
      assert.equal(filter.bitsSet, bitsAfterFirst);
      assert.equal(filter.itemsCount, 2);
      assert.equal(res2.wasAlreadyPresent, true);
    });

    it('returns true on contains() for previously added items', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      filter.add('ep-mastering-hour');
      assert.equal(filter.contains('ep-mastering-hour'), true);
    });
  });

  describe('ZERO FALSE NEGATIVE GUARANTEE (Invariant Verification)', () => {
    it('maintains 100% recall (0% false negatives) across 150 unique podcast episodes', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 2048, hashCount: 5 });
      const insertedItems = [];

      for (let i = 1; i <= 150; i++) {
        const episodeId = `nsoc-2026-podcast-ep-${i.toString().padStart(4, '0')}-audio-stream`;
        insertedItems.push(episodeId);
        filter.add(episodeId);
      }

      assert.equal(filter.itemsCount, 150);

      // Verify EVERY single inserted element returns true
      let falseNegatives = 0;
      for (const episodeId of insertedItems) {
        if (!filter.contains(episodeId)) {
          falseNegatives++;
        }
      }

      assert.equal(falseNegatives, 0, 'Violation of Bloom Filter Zero False Negative Invariant!');
    });
  });

  describe('Probabilistic Verification & Telemetry (getStats)', () => {
    it('accurately calculates saturation and estimated false positive rate', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 500, hashCount: 4 });
      const statsInitial = filter.getStats();

      assert.equal(statsInitial.size, 500);
      assert.equal(statsInitial.hashCount, 4);
      assert.equal(statsInitial.itemsCount, 0);
      assert.equal(statsInitial.bitsSet, 0);
      assert.equal(statsInitial.saturation, 0);
      assert.equal(statsInitial.estimatedFalsePositiveRate, 0);
      assert.equal(statsInitial.zeroFalseNegativeGuaranteed, true);

      // Ingest several items
      for (let i = 0; i < 20; i++) {
        filter.add(`stream-track-${i}`);
      }

      const statsAfter = filter.getStats();
      assert.equal(statsAfter.itemsCount, 20);
      assert.ok(statsAfter.bitsSet > 0);
      assert.ok(statsAfter.saturation > 0 && statsAfter.saturation < 1);
      assert.ok(statsAfter.estimatedFalsePositiveRate >= 0);
      assert.ok(typeof statsAfter.estimatedFalsePositivePercent === 'string');
    });

    it('provides rich diagnostic data in query()', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 256, hashCount: 3 });
      filter.add('ep-audio-diagnostics');

      const diagHit = filter.query('ep-audio-diagnostics');
      assert.equal(diagHit.present, true);
      assert.equal(diagHit.verdict, 'PROBABLY_PRESENT');
      assert.equal(diagHit.bitStates.length, 3);
      assert.ok(diagHit.bitStates.every(b => b.isSet === true));

      const diagMiss = filter.query('unheard-ep-xyz-999');
      if (!diagMiss.present) {
        assert.equal(diagMiss.verdict, 'DEFINITELY_NOT_PRESENT');
        assert.ok(diagMiss.bitStates.some(b => b.isSet === false));
        assert.ok(diagMiss.guarantee.includes('0% False Negative Guarantee'));
      }
    });
  });

  describe('Optimal Parameters Calculator', () => {
    it('calculates mathematically optimal size (m) and hashes (k)', () => {
      // For n = 1000 items, p = 0.01 (1% FPR):
      // m = ceil(- 1000 * ln(0.01) / (ln2)^2) = ceil(4605.17 / 0.48045) ≈ 9586 bits (~1199 bytes)
      // k = round((9586 / 1000) * 0.69315) ≈ 7
      const optimal = PodcastAudioStreamBloomFilter.calculateOptimalParams(1000, 0.01);

      assert.ok(optimal.size >= 9500 && optimal.size <= 9700, `Size ${optimal.size} out of expected range`);
      assert.equal(optimal.hashCount, 7);
      assert.equal(optimal.expectedItems, 1000);
      assert.equal(optimal.targetFalsePositiveRate, 0.01);
      assert.ok(optimal.memoryBytes > 1000);
    });

    it('supports instance method delegation for calculateOptimalParams', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      const optimal = filter.calculateOptimalParams(500, 0.05);

      assert.ok(optimal.size > 0);
      assert.ok(optimal.hashCount >= 1);
      assert.equal(optimal.expectedItems, 500);
    });

    it('gracefully handles edge cases and invalid parameters in optimal sizer', () => {
      const fallback = PodcastAudioStreamBloomFilter.calculateOptimalParams(-10, 'invalid');
      assert.ok(fallback.size > 0);
      assert.ok(fallback.hashCount >= 1);
    });
  });

  describe('Batch Operations & Filter Clearing', () => {
    it('correctly processes batchAdd and batchContains', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 1024, hashCount: 4 });
      const batch = ['ep-batch-1', 'ep-batch-2', 'ep-batch-3', 'ep-batch-4'];

      const addSummary = filter.batchAdd(batch);
      assert.equal(addSummary.addedCount, 4);
      assert.equal(addSummary.totalItems, 4);

      const checkList = ['ep-batch-1', 'ep-batch-2', 'ep-not-here-xyz'];
      const results = filter.batchContains(checkList);

      assert.deepEqual(results.slice(0, 2), [true, true]);
      assert.equal(results[2], false);
    });

    it('safely handles non-array arguments in batch methods', () => {
      const filter = new PodcastAudioStreamBloomFilter();
      const resAdd = filter.batchAdd(null);
      assert.equal(resAdd.addedCount, 0);

      const resContains = filter.batchContains(undefined);
      assert.deepEqual(resContains, []);
    });

    it('clears all state, bits, and counters on clear()', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
      filter.add('ep-to-be-cleared-1');
      filter.add('ep-to-be-cleared-2');
      assert.ok(filter.bitsSet > 0);
      assert.equal(filter.itemsCount, 2);

      filter.clear();
      assert.equal(filter.itemsCount, 0);
      assert.equal(filter.bitsSet, 0);
      assert.equal(filter.contains('ep-to-be-cleared-1'), false);
      assert.equal(filter.contains('ep-to-be-cleared-2'), false);

      const arr = filter.getBitArray();
      assert.ok(arr.every(byte => byte === 0));
    });

    it('returns bit array copies without exposing internal buffer mutation', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 64, hashCount: 2 });
      filter.add('immutable-test');
      const copy = filter.getBitArray();
      copy.fill(255);

      // Verify internal filter bitArray wasn't corrupted
      assert.notEqual(filter.bitArray[0], 255);
    });

    it('returns 0 for out-of-range bit inquiries in getBit()', () => {
      const filter = new PodcastAudioStreamBloomFilter({ size: 64 });
      assert.equal(filter.getBit(-1), 0);
      assert.equal(filter.getBit(9999), 0);
      assert.equal(filter.getBit(NaN), 0);
    });
  });
});
