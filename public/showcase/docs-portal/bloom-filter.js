/**
 * Docs Portal - Probabilistic Bloom Filter & Membership Query Engine
 * 
 * Implements Kirsch-Mitzenmacher double-hashing using MurmurHash3 (32-bit)
 * and FNV-1a (32-bit) over a fixed-size bit array with zero false-negatives guarantee.
 * 
 * Formula: g_i(x) = (h1(x) + i * h2(x)) mod m, for i in [0, k-1]
 */

const textEncoder = new TextEncoder();

/**
 * 32-bit MurmurHash3 (x86) implementation for string byte arrays.
 * @param {Uint8Array} bytes 
 * @param {number} seed 
 * @returns {number} 32-bit unsigned integer
 */
export function murmurHash3_32(bytes, seed = 0) {
  let h1 = seed >>> 0;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const len = bytes.length;
  const nblocks = Math.floor(len / 4);

  // Body: 4-byte chunks
  for (let i = 0; i < nblocks; i++) {
    const i4 = i * 4;
    let k1 = (bytes[i4] & 0xff) |
             ((bytes[i4 + 1] & 0xff) << 8) |
             ((bytes[i4 + 2] & 0xff) << 16) |
             ((bytes[i4 + 3] & 0xff) << 24);

    k1 = Math.imul(k1, c1);
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = Math.imul(k1, c2);

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
  }

  // Tail: remaining 1-3 bytes
  const tailIndex = nblocks * 4;
  let k1 = 0;
  switch (len & 3) {
    case 3:
      k1 ^= (bytes[tailIndex + 2] & 0xff) << 16;
      // fallthrough
    case 2:
      k1 ^= (bytes[tailIndex + 1] & 0xff) << 8;
      // fallthrough
    case 1:
      k1 ^= (bytes[tailIndex] & 0xff);
      k1 = Math.imul(k1, c1);
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = Math.imul(k1, c2);
      h1 ^= k1;
  }

  // Finalization mix
  h1 ^= len;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1, 0x85ebca6b);
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1, 0xc2b2ae35);
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/**
 * 32-bit FNV-1a hash implementation for string byte arrays.
 * @param {Uint8Array} bytes 
 * @returns {number} 32-bit unsigned integer
 */
export function fnv1a_32(bytes) {
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * DocsPortalBloomFilter: High-performance in-browser Bloom Filter
 * for API route and documentation keyword deduplication.
 */
export class DocsPortalBloomFilter {
  #bits;
  #itemsCount = 0;

  /**
   * @param {number|{bitSize?: number, m?: number, hashCount?: number, k?: number}} [bitSizeOrOptions=256] 
   * @param {number} [maybeHashCount=4] 
   */
  constructor(bitSizeOrOptions = 256, maybeHashCount = 4) {
    let m = 256;
    let k = 4;

    if (typeof bitSizeOrOptions === 'object' && bitSizeOrOptions !== null) {
      m = bitSizeOrOptions.bitSize ?? bitSizeOrOptions.m ?? 256;
      k = bitSizeOrOptions.hashCount ?? bitSizeOrOptions.k ?? 4;
    } else {
      m = bitSizeOrOptions ?? 256;
      k = maybeHashCount ?? 4;
    }

    if (!Number.isInteger(m) || m < 8 || m > 131072) {
      throw new RangeError('bitSize must be an integer between 8 and 131072.');
    }
    if (!Number.isInteger(k) || k < 1 || k > 32) {
      throw new RangeError('hashCount must be an integer between 1 and 32.');
    }

    this.bitSize = m;
    this.hashCount = k;

    Object.defineProperties(this, {
      bitSize: { value: m, writable: false, configurable: false, enumerable: true },
      hashCount: { value: k, writable: false, configurable: false, enumerable: true }
    });

    this.#bits = new Uint8Array(Math.ceil(m / 8));
  }

  /**
   * Internal helper to normalize and validate input items.
   * @param {*} item 
   * @returns {string}
   */
  #validateItem(item) {
    if (item === null || item === undefined) {
      throw new TypeError('Item cannot be null or undefined.');
    }
    if (typeof item !== 'string') {
      throw new TypeError('Item must be a non-empty string.');
    }
    if (item.length === 0) {
      throw new TypeError('Item cannot be an empty string.');
    }
    return item;
  }

  /**
   * Generates raw MurmurHash3 and FNV-1a hashes for an item.
   * @param {string} item 
   * @returns {{ h1: number, h2: number }}
   */
  getHashes(item) {
    const valid = this.#validateItem(item);
    const bytes = textEncoder.encode(valid);
    const h1 = murmurHash3_32(bytes, 0);
    let h2 = fnv1a_32(bytes);
    // Ensure h2 is odd and non-zero to guarantee maximal cycle across double hashing
    h2 = (h2 | 1) >>> 0;
    return { h1, h2 };
  }

  /**
   * Generates k bit indices using Kirsch-Mitzenmacher double-hashing:
   * g_i(x) = (h1(x) + i * h2(x)) mod m
   * @param {string} item 
   * @returns {number[]} Array of k bit indices in range [0, bitSize - 1]
   */
  getIndices(item) {
    const { h1, h2 } = this.getHashes(item);
    const indices = new Array(this.hashCount);
    for (let i = 0; i < this.hashCount; i++) {
      indices[i] = Number((BigInt(h1) + BigInt(i) * BigInt(h2)) % BigInt(this.bitSize));
    }
    return indices;
  }

  /**
   * Alias for getIndices.
   * @param {string} item 
   * @returns {number[]}
   */
  positions(item) {
    return this.getIndices(item);
  }

  /**
   * Inserts an item into the bloom filter.
   * Sets all corresponding bit positions and tracks collisions.
   * @param {string} item 
   * @returns {{ item: string, positions: number[], indices: number[], collisions: number[], collisionCount: number, isCollision: boolean }}
   */
  insert(item) {
    const positions = this.getIndices(item);
    const collisions = [];

    for (const bit of positions) {
      const byteIdx = bit >> 3;
      const bitMask = 1 << (bit & 7);
      if ((this.#bits[byteIdx] & bitMask) !== 0) {
        collisions.push(bit);
      } else {
        this.#bits[byteIdx] |= bitMask;
      }
    }

    this.#itemsCount++;

    return {
      item,
      positions: [...positions],
      indices: [...positions],
      collisions,
      collisionCount: collisions.length,
      isCollision: collisions.length > 0
    };
  }

  /**
   * Alias for insert.
   * @param {string} item 
   */
  add(item) {
    return this.insert(item);
  }

  /**
   * Batch inserts an iterable collection of items.
   * @param {Iterable<string>} items 
   * @returns {Array<{ item: string, positions: number[], collisions: number[] }>}
   */
  batchInsert(items) {
    if (!items || typeof items[Symbol.iterator] !== 'function') {
      throw new TypeError('batchInsert expects an iterable collection of items.');
    }
    const results = [];
    for (const item of items) {
      results.push(this.insert(item));
    }
    return results;
  }

  /**
   * Probes whether an item is likely present in the set.
   * Invariant: Zero false negatives guaranteed. If contains(item) is false,
   * item was definitely never inserted.
   * @param {string} item 
   * @param {boolean} [detailed=false] If true, returns detailed diagnostic object
   * @returns {boolean|{ present: boolean, indices: number[], positions: number[] }}
   */
  contains(item, detailed = false) {
    const positions = this.getIndices(item);
    const present = positions.every(bit => (this.#bits[bit >> 3] & (1 << (bit & 7))) !== 0);

    if (detailed) {
      return {
        present,
        indices: [...positions],
        positions: [...positions]
      };
    }
    return present;
  }

  /**
   * Alias for contains(item).
   * @param {string} item 
   * @returns {boolean}
   */
  has(item) {
    return this.contains(item);
  }

  /**
   * Detailed membership query returning boolean status and diagnostic bit probe indices.
   * @param {string} item 
   * @returns {{ present: boolean, has: boolean, indices: number[], positions: number[], bitStates: Array<{ index: number, value: number }> }}
   */
  query(item) {
    const positions = this.getIndices(item);
    const bitStates = positions.map(bit => {
      const isSet = (this.#bits[bit >> 3] & (1 << (bit & 7))) !== 0;
      return { index: bit, value: isSet ? 1 : 0 };
    });
    const present = bitStates.every(state => state.value === 1);

    const result = {
      present,
      has: present,
      indices: [...positions],
      positions: [...positions],
      bitStates,
      valueOf() {
        return present;
      },
      [Symbol.toPrimitive](hint) {
        if (hint === 'number') return present ? 1 : 0;
        if (hint === 'string') return String(present);
        return present;
      }
    };

    return result;
  }

  /**
   * Gets the individual bit value (0 or 1) at the given index.
   * @param {number} index 
   * @returns {number} 0 or 1
   */
  getBit(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.bitSize) {
      throw new RangeError(`Bit index ${index} out of bounds [0, ${this.bitSize - 1}].`);
    }
    return (this.#bits[index >> 3] & (1 << (index & 7))) !== 0 ? 1 : 0;
  }

  /**
   * Returns a copy of the bit array as an array of 0s and 1s.
   * @returns {number[]}
   */
  getBits() {
    const bits = new Array(this.bitSize);
    for (let i = 0; i < this.bitSize; i++) {
      bits[i] = (this.#bits[i >> 3] & (1 << (i & 7))) !== 0 ? 1 : 0;
    }
    return bits;
  }

  /**
   * Alias for getBits.
   * @returns {number[]}
   */
  getBitArray() {
    return this.getBits();
  }

  /**
   * Calculates theoretical false-positive probability:
   * FPR = (1 - exp(-k * n / m))^k
   * @param {number} [n=this.#itemsCount] Inserted item count
   * @returns {number} Theoretical false positive probability [0, 1]
   */
  calculateFalsePositiveRate(n = this.#itemsCount) {
    if (n <= 0) return 0;
    const exponent = -this.hashCount * n / this.bitSize;
    return Math.pow(1 - Math.exp(exponent), this.hashCount);
  }

  /**
   * Alias for calculateFalsePositiveRate.
   * @param {number} [n] 
   * @returns {number}
   */
  getExpectedFPR(n = this.#itemsCount) {
    return this.calculateFalsePositiveRate(n);
  }

  /**
   * Returns comprehensive metrics and telemetry for the bloom filter.
   * @returns {{ itemsCount: number, bitSize: number, hashCount: number, setBits: number, fillRatio: number, theoreticalFPR: number, expectedFPR: number, insertions: number }}
   */
  getStats() {
    const bits = this.getBits();
    const setBits = bits.reduce((sum, b) => sum + b, 0);
    const fillRatio = this.bitSize > 0 ? setBits / this.bitSize : 0;
    const theoreticalFPR = this.calculateFalsePositiveRate();

    return {
      itemsCount: this.#itemsCount,
      bitSize: this.bitSize,
      hashCount: this.hashCount,
      setBits,
      fillRatio,
      theoreticalFPR,
      expectedFPR: theoreticalFPR,
      insertions: this.#itemsCount
    };
  }

  /**
   * Snapshot method for diagnostic inspection.
   * @returns {{ bitSize: number, hashCount: number, itemsCount: number, insertions: number, bits: number[], setBits: number, fillRatio: number, theoreticalFPR: number }}
   */
  snapshot() {
    const stats = this.getStats();
    return {
      ...stats,
      bits: this.getBits()
    };
  }

  /**
   * Resets all bits to 0 and clears the insertion counter.
   */
  clear() {
    this.#bits.fill(0);
    this.#itemsCount = 0;
  }

  /**
   * Alias for clear.
   */
  reset() {
    this.clear();
  }

  /**
   * Estimates the number of distinct elements inserted from the current bit fill count:
   * n* ≈ -(m / k) * ln(1 - X / m)
   * @returns {number}
   */
  estimateItemsCount() {
    const setBits = this.getBits().reduce((sum, b) => sum + b, 0);
    if (setBits === 0) return 0;
    if (setBits >= this.bitSize) return Infinity;
    return - (this.bitSize / this.hashCount) * Math.log(1 - (setBits / this.bitSize));
  }
}

// Global window attachment for in-browser scripts
if (typeof window !== 'undefined') {
  window.DocsPortalBloomFilter = DocsPortalBloomFilter;
}
if (typeof globalThis !== 'undefined') {
  globalThis.DocsPortalBloomFilter = DocsPortalBloomFilter;
}

export default DocsPortalBloomFilter;

/**
 * In-browser visualizer mounting logic.
 * Attaches to HTML visualizer DOM when available.
 */
function mountVisualizer() {
  const root = document.querySelector('[data-docs-bloom-app]');
  if (!root) return;

  const filter = new DocsPortalBloomFilter(256, 4);
  const insertedHistory = new Set();
  let lastProbedPositions = [];
  let lastCollisions = [];

  // DOM element selectors
  const el = id => root.querySelector(`#${id}`);
  const insertForm = el('docs-insert-form');
  const insertInput = el('docs-item-input');
  const probeForm = el('docs-probe-form');
  const probeInput = el('docs-probe-input');
  const bitGrid = el('docs-bit-grid');
  const btnBatchSample = el('btn-batch-sample');
  const btnClear = el('btn-clear-filter');
  const btnRunBenchmark = el('btn-run-benchmark');
  const statusMsg = el('docs-status-msg');
  const verdictCard = el('docs-verdict-card');
  const verdictTitle = el('docs-verdict-title');
  const verdictDetail = el('docs-verdict-detail');
  const probeSteps = el('docs-probe-steps');

  // Stats elements
  const statItems = el('stat-items-count');
  const statBitsSet = el('stat-bits-set');
  const statFillRatio = el('stat-fill-ratio');
  const statFpr = el('stat-theoretical-fpr');
  const statLastCollision = el('stat-last-collisions');

  function updateStatus(message, isError = false) {
    if (!statusMsg) return;
    statusMsg.textContent = message;
    statusMsg.className = `status-msg ${isError ? 'error' : 'success'}`;
  }

  function renderGrid(activePositions = [], collisionPositions = []) {
    if (!bitGrid) return;
    const bits = filter.getBits();
    const stats = filter.getStats();

    if (statItems) statItems.textContent = String(stats.itemsCount);
    if (statBitsSet) statBitsSet.textContent = `${stats.setBits} / ${stats.bitSize}`;
    if (statFillRatio) statFillRatio.textContent = `${(stats.fillRatio * 100).toFixed(1)}%`;
    if (statFpr) statFpr.textContent = `${(stats.theoreticalFPR * 100).toFixed(3)}%`;
    if (statLastCollision) statLastCollision.textContent = String(collisionPositions.length);

    // Build memory grid cells
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < stats.bitSize; i++) {
      const cell = document.createElement('div');
      const val = bits[i];
      cell.className = 'bit-cell';
      if (val === 1) cell.classList.add('is-set');
      if (activePositions.includes(i)) cell.classList.add('is-probed');
      if (collisionPositions.includes(i)) cell.classList.add('is-collision');

      cell.dataset.index = String(i);
      cell.title = `Bit #${i} (Byte ${i >> 3}, Offset ${i & 7}) — Value: ${val}`;
      cell.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${val}</span>`;
      fragment.appendChild(cell);
    }

    bitGrid.replaceChildren(fragment);
    bitGrid.setAttribute('aria-label', `${stats.setBits} of ${stats.bitSize} bits set.`);
  }

  function renderProbeDiagnostics(item, queryRes) {
    if (!verdictCard || !verdictTitle || !verdictDetail) return;

    verdictCard.style.display = 'block';
    const { h1, h2 } = filter.getHashes(item);

    if (!queryRes.present) {
      verdictCard.className = 'verdict-card absent';
      verdictTitle.innerHTML = `<span class="verdict-icon">⛔</span> Definitely Absent (Negative)`;
      verdictDetail.innerHTML = `Zero-False-Negative Guarantee: At least one probed bit was <code>0</code>. The key <code>${escapeHtml(item)}</code> was guaranteed <strong>never inserted</strong>.`;
    } else if (insertedHistory.has(item)) {
      verdictCard.className = 'verdict-card present-verified';
      verdictTitle.innerHTML = `<span class="verdict-icon">✅</span> Confirmed Member (True Positive)`;
      verdictDetail.innerHTML = `All ${filter.hashCount} probed bits are <code>1</code>. Matched verified insertion history.`;
    } else {
      verdictCard.className = 'verdict-card present-probabilistic';
      verdictTitle.innerHTML = `<span class="verdict-icon">⚠️</span> Probabilistic Match (Potential False Positive)`;
      verdictDetail.innerHTML = `All ${filter.hashCount} probed bits are <code>1</code>, but item is not in local session history. Theoretical FPR: <strong>${(filter.calculateFalsePositiveRate() * 100).toFixed(3)}%</strong>.`;
    }

    if (probeSteps) {
      const stepsHtml = queryRes.indices.map((idx, step) => {
        const bitVal = filter.getBit(idx);
        return `<div class="hash-step-badge ${bitVal === 1 ? 'match' : 'mismatch'}">
          <span class="step-num">h<sub>${step}</sub></span>
          <span class="step-math">(${h1} + ${step} × ${h2}) mod ${filter.bitSize}</span>
          <span class="step-idx">Bit #${idx}</span>
          <span class="step-val">${bitVal === 1 ? 'SET (1)' : 'UNSET (0)'}</span>
        </div>`;
      }).join('');
      probeSteps.innerHTML = stepsHtml;
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  // Event Listeners
  if (insertForm) {
    insertForm.addEventListener('submit', evt => {
      evt.preventDefault();
      const val = insertInput?.value?.trim();
      if (!val) {
        updateStatus('Please enter a non-empty string to insert.', true);
        return;
      }
      try {
        const res = filter.insert(val);
        insertedHistory.add(val);
        lastProbedPositions = res.positions;
        lastCollisions = res.collisions;
        renderGrid(res.positions, res.collisions);
        updateStatus(`Inserted "${val}" across bits [${res.positions.join(', ')}]. Collisions: ${res.collisions.length}.`);
        if (insertInput) insertInput.value = '';
      } catch (err) {
        updateStatus(err.message, true);
      }
    });
  }

  if (probeForm) {
    probeForm.addEventListener('submit', evt => {
      evt.preventDefault();
      const val = probeInput?.value?.trim();
      if (!val) {
        updateStatus('Please enter a query string to probe.', true);
        return;
      }
      try {
        const queryRes = filter.query(val);
        lastProbedPositions = queryRes.indices;
        renderGrid(queryRes.indices, []);
        renderProbeDiagnostics(val, queryRes);
        updateStatus(`Probed "${val}" at bit positions [${queryRes.indices.join(', ')}]. Result: ${queryRes.present ? 'PROBABLY PRESENT' : 'DEFINITELY ABSENT'}.`);
      } catch (err) {
        updateStatus(err.message, true);
      }
    });
  }

  // Preset chips
  root.querySelectorAll('[data-preset]').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-preset');
      if (insertInput) insertInput.value = val;
      if (probeInput) probeInput.value = val;
    });
  });

  // Batch insert sample set
  if (btnBatchSample) {
    btnBatchSample.addEventListener('click', () => {
      const sampleEndpoints = [
        'GET /api/v1/docs/auth',
        'POST /api/v1/auth/tokens',
        'GET /api/v2/docs/search',
        'PUT /api/v1/docs/preferences',
        'DELETE /api/v1/sessions',
        'GET /api/v1/telemetry/metrics',
        'GET /api/v2/docs/architecture',
        'POST /api/v1/webhooks/deploy'
      ];
      for (const ep of sampleEndpoints) {
        filter.insert(ep);
        insertedHistory.add(ep);
      }
      renderGrid();
      updateStatus(`Batch inserted ${sampleEndpoints.length} sample documentation endpoints.`);
    });
  }

  // Clear / Reset
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      filter.clear();
      insertedHistory.clear();
      lastProbedPositions = [];
      lastCollisions = [];
      if (verdictCard) verdictCard.style.display = 'none';
      if (probeSteps) probeSteps.innerHTML = '';
      renderGrid();
      updateStatus('Bloom filter and session membership cache have been reset.');
    });
  }

  // Empirical Monte Carlo Benchmark
  if (btnRunBenchmark) {
    btnRunBenchmark.addEventListener('click', () => {
      const totalQueries = 1000;
      let falsePositives = 0;
      for (let i = 0; i < totalQueries; i++) {
        const testKey = `synthetic-absent-query-${Date.now()}-${i}-${Math.random()}`;
        if (filter.contains(testKey)) {
          falsePositives++;
        }
      }
      const empiricalRate = (falsePositives / totalQueries) * 100;
      const theoreticalRate = (filter.calculateFalsePositiveRate() * 100);
      updateStatus(`Monte Carlo (1,000 queries): Observed ${falsePositives} false positives (${empiricalRate.toFixed(2)}%) vs Theoretical FPR (${theoreticalRate.toFixed(3)}%).`);
    });
  }

  // Initial grid rendering
  renderGrid();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountVisualizer);
  } else {
    mountVisualizer();
  }
}
