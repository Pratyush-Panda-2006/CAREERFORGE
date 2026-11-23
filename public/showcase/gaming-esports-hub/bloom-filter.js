/**
 * Gaming Esports Hub - Probabilistic Bloom Filter & Membership Query Engine
 * 
 * High-performance in-browser Bloom Filter probabilistic set engine designed for
 * esports tournament anti-cheat, matchmaking blacklist deduplication, and
 * player tag verification.
 * 
 * Mathematical Core:
 * - Kirsch-Mitzenmacher double-hashing optimization:
 *     g_i(x) = (h1(x) + i * h2(x)) mod m
 * - h1(x): MurmurHash3 32-bit unsigned
 * - h2(x): FNV-1a 32-bit unsigned
 * - Space complexity: O(m) bits
 * - Query & Insertion complexity: O(k) hash evaluations
 * - Fundamental invariant: ZERO false negatives guaranteed (100% recall for members)
 */

export class GamingEsportsHubBloomFilter {
  /**
   * Initializes a new Bloom Filter instance.
   * Supports either (size, hashCount) or an options object ({ size, hashCount }).
   * 
   * @param {number|Object} [sizeOrOptions=256] Number of bits (m) or configuration object
   * @param {number} [hashCount=4] Number of hash functions (k) if first argument is a number
   */
  constructor(sizeOrOptions = 256, hashCount = 4) {
    let size = 256;
    let k = 4;

    if (typeof sizeOrOptions === 'object' && sizeOrOptions !== null) {
      size = sizeOrOptions.size ?? sizeOrOptions.bitSize ?? 256;
      k = sizeOrOptions.hashCount ?? sizeOrOptions.k ?? 4;
    } else if (typeof sizeOrOptions === 'number') {
      size = sizeOrOptions;
      k = hashCount;
    }

    const parsedSize = parseInt(size, 10);
    this.size = Number.isFinite(parsedSize) ? Math.max(8, parsedSize) : 256;
    this.bitSize = this.size;

    const parsedK = parseInt(k, 10);
    this.hashCount = Number.isFinite(parsedK) ? Math.max(1, Math.min(parsedK, 64)) : 4;

    this.byteLength = Math.ceil(this.size / 8);
    this.bitArray = new Uint8Array(this.byteLength);

    this.itemsCount = 0;
    this.itemCount = 0;
    this.bitsSet = 0;
    this.history = [];
    this.name = 'GamingEsportsHubBloomFilter';
  }

  /**
   * 32-bit MurmurHash3 implementation for string keys.
   * Produces uniform 32-bit unsigned integer hash.
   * 
   * @param {string} key Input string
   * @param {number} [seed=0x9747b28c] 32-bit seed
   * @returns {number} 32-bit unsigned integer
   */
  static murmur3(key, seed = 0x9747b28c) {
    const str = String(key);
    let h1 = seed >>> 0;
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const len = str.length;

    let i = 0;
    while (i + 4 <= len) {
      let k1 = (str.charCodeAt(i) & 0xff) |
               ((str.charCodeAt(i + 1) & 0xff) << 8) |
               ((str.charCodeAt(i + 2) & 0xff) << 16) |
               ((str.charCodeAt(i + 3) & 0xff) << 24);

      k1 = Math.imul(k1, c1) >>> 0;
      k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
      k1 = Math.imul(k1, c2) >>> 0;

      h1 ^= k1;
      h1 = ((h1 << 13) | (h1 >>> 19)) >>> 0;
      h1 = (Math.imul(h1, 5) + 0xe6546b64) >>> 0;
      i += 4;
    }

    let k1 = 0;
    const rem = len - i;
    if (rem === 3) {
      k1 ^= (str.charCodeAt(i + 2) & 0xff) << 16;
    }
    if (rem >= 2) {
      k1 ^= (str.charCodeAt(i + 1) & 0xff) << 8;
    }
    if (rem >= 1) {
      k1 ^= (str.charCodeAt(i) & 0xff);
      k1 = Math.imul(k1, c1) >>> 0;
      k1 = ((k1 << 15) | (k1 >>> 17)) >>> 0;
      k1 = Math.imul(k1, c2) >>> 0;
      h1 ^= k1;
    }

    h1 ^= len;
    h1 ^= h1 >>> 16;
    h1 = Math.imul(h1, 0x85ebca6b) >>> 0;
    h1 ^= h1 >>> 13;
    h1 = Math.imul(h1, 0xc2b2ae35) >>> 0;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
  }

  /**
   * 32-bit FNV-1a hash implementation for string keys.
   * Produces well-distributed 32-bit unsigned integer hash.
   * 
   * @param {string} key Input string
   * @param {number} [seed=0x811c9dc5] 32-bit FNV offset basis
   * @returns {number} 32-bit unsigned integer
   */
  static fnv1a(key, seed = 0x811c9dc5) {
    const str = String(key);
    let hash = seed >>> 0;
    const prime = 0x01000193;

    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      hash ^= code & 0xff;
      hash = Math.imul(hash, prime) >>> 0;
      if (code > 255) {
        hash ^= (code >>> 8) & 0xff;
        hash = Math.imul(hash, prime) >>> 0;
      }
    }

    return hash >>> 0;
  }

  /**
   * Instance helper for MurmurHash3.
   * @param {string} key
   * @param {number} [seed]
   * @returns {number}
   */
  murmur3(key, seed) {
    return GamingEsportsHubBloomFilter.murmur3(key, seed);
  }

  /**
   * Instance helper for FNV-1a.
   * @param {string} key
   * @param {number} [seed]
   * @returns {number}
   */
  fnv1a(key, seed) {
    return GamingEsportsHubBloomFilter.fnv1a(key, seed);
  }

  /**
   * Computes the base Murmur3 and FNV-1a 32-bit hash pair for an item.
   * 
   * @param {*} key Input identifier
   * @returns {{murmur: number, fnv: number}}
   */
  getHashValues(key) {
    const str = String(key);
    const murmur = GamingEsportsHubBloomFilter.murmur3(str);
    let fnv = GamingEsportsHubBloomFilter.fnv1a(str);
    // Ensure fnv is non-zero so probe sequences don't stagnate on a single index
    if (fnv === 0) {
      fnv = 1;
    }
    return { murmur, fnv };
  }

  /**
   * Generates k bit indices using Kirsch-Mitzenmacher double-hashing:
   *   g_i(x) = (h1(x) + i * h2(x)) mod m
   * 
   * @param {*} key Input gamertag, team id, or cheat signature
   * @returns {number[]} Array of k bit indices strictly within [0, size - 1]
   */
  getHashIndices(key) {
    const { murmur, fnv } = this.getHashValues(key);
    const indices = [];

    for (let i = 0; i < this.hashCount; i++) {
      const combined = (murmur + Math.imul(i, fnv)) >>> 0;
      const index = combined % this.size;
      indices.push(index);
    }

    return indices;
  }

  /**
   * Inserts an item into the Bloom filter.
   * Sets all k hash bits in the underlying bit array.
   * 
   * @param {*} item Item to insert
   * @returns {{item: string, indices: number[], newlySetBits: number, collisions: number[], wasAlreadyPresent: boolean}}
   */
  add(item) {
    if (item === undefined || item === null) {
      throw new TypeError('Item cannot be null or undefined');
    }
    const str = String(item);
    const indices = this.getHashIndices(str);
    let newlySetBits = 0;
    const collisions = [];

    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const byteIdx = Math.floor(idx / 8);
      const bitMask = 1 << (idx % 8);

      if ((this.bitArray[byteIdx] & bitMask) !== 0) {
        if (!collisions.includes(idx)) {
          collisions.push(idx);
        }
      } else {
        this.bitArray[byteIdx] |= bitMask;
        this.bitsSet++;
        newlySetBits++;
      }
    }

    const wasAlreadyPresent = newlySetBits === 0 && this.itemsCount > 0;
    this.itemsCount++;
    this.itemCount = this.itemsCount;

    const result = {
      item: str,
      indices,
      newlySetBits,
      collisions,
      wasAlreadyPresent
    };

    if (this.history.length >= 150) {
      this.history.shift();
    }
    this.history.push({
      type: 'INSERT',
      item: str,
      indices,
      newlySetBits,
      collisionsCount: collisions.length,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Alias for add(item).
   * @param {*} item
   * @returns {Object}
   */
  insert(item) {
    return this.add(item);
  }

  /**
   * Queries membership of an item in the Bloom filter.
   * 
   * FUNDAMENTAL INVARIANT: ZERO FALSE NEGATIVES.
   * If the item was inserted, this method is mathematically guaranteed to return true.
   * If any of the k bits is 0, the item is 100% definitely NOT in the set.
   * 
   * @param {*} item Item to check
   * @returns {boolean} True if possibly in filter; false if definitely not
   */
  contains(item) {
    if (item === undefined || item === null) {
      return false;
    }
    const str = String(item);
    const indices = this.getHashIndices(str);

    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const byteIdx = Math.floor(idx / 8);
      const bitMask = 1 << (idx % 8);

      if ((this.bitArray[byteIdx] & bitMask) === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Alias for contains(item).
   * @param {*} item
   * @returns {boolean}
   */
  has(item) {
    return this.contains(item);
  }

  /**
   * Detailed diagnostic query returning full bit inspection, hash values,
   * verification verdict, and probabilistic guarantees.
   * 
   * @param {*} item Item to inspect
   * @returns {Object} Comprehensive diagnostic report
   */
  query(item) {
    if (item === undefined || item === null) {
      return {
        item: '',
        present: false,
        indices: [],
        bitStates: [],
        murmur: 0,
        fnv: 0,
        verdict: 'DEFINITELY_NOT_PRESENT',
        theoreticalFPR: 0,
        guarantee: 'Invalid or null query item'
      };
    }

    const str = String(item);
    const { murmur, fnv } = this.getHashValues(str);
    const indices = this.getHashIndices(str);

    const bitStates = indices.map((idx, order) => {
      const isSet = this.getBit(idx) === 1;
      return {
        hashOrder: order,
        bitIndex: idx,
        isSet,
        byteIndex: Math.floor(idx / 8),
        bitOffset: idx % 8
      };
    });

    const isPresent = bitStates.every(b => b.isSet);
    const fpr = this.calculateFalsePositiveRate();

    const diagnosis = {
      item: str,
      present: isPresent,
      indices,
      bitStates,
      murmur,
      fnv,
      verdict: isPresent ? 'PROBABLY_PRESENT' : 'DEFINITELY_NOT_PRESENT',
      guarantee: isPresent
        ? `All ${this.hashCount} bits set. Probable blacklist match (FPR: ${(fpr * 100).toFixed(4)}%). Verification needed.`
        : `Bit mismatch observed. 100% Guaranteed NOT in blacklist (0% False Negative Guarantee). Safe to queue.`,
      theoreticalFPR: fpr,
      timestamp: Date.now()
    };

    if (this.history.length >= 150) {
      this.history.shift();
    }
    this.history.push({
      type: 'QUERY',
      item: str,
      present: isPresent,
      indices,
      timestamp: Date.now()
    });

    return diagnosis;
  }

  /**
   * Calculates the theoretical False Positive Rate based on standard Bloom filter model:
   *   FPR = (1 - exp(-k * n / m))^k
   * 
   * @returns {number} False positive rate in [0.0, 1.0]
   */
  calculateFalsePositiveRate() {
    if (this.itemsCount === 0 || this.size === 0) {
      return 0.0;
    }
    const exponent = - (this.hashCount * this.itemsCount) / this.size;
    const inner = 1 - Math.exp(exponent);
    const rate = Math.pow(Math.max(0, inner), this.hashCount);
    return Math.min(1.0, Math.max(0.0, rate));
  }

  /**
   * Alias for calculateFalsePositiveRate().
   * @returns {number}
   */
  getExpectedFPR() {
    return this.calculateFalsePositiveRate();
  }

  /**
   * Calculates empirical false positive rate based on current bit saturation:
   *   FPR_emp = (bitsSet / m)^k
   * 
   * @returns {number}
   */
  estimateFalsePositiveRate() {
    if (this.bitsSet === 0 || this.size === 0) {
      return 0.0;
    }
    if (this.bitsSet >= this.size) {
      return 1.0;
    }
    return Math.min(1.0, Math.pow(this.bitsSet / this.size, this.hashCount));
  }

  /**
   * Retrieves an array of all bits (0 or 1) of length m.
   * 
   * @returns {number[]} Array of 0s and 1s
   */
  getBits() {
    const bits = new Array(this.size);
    for (let i = 0; i < this.size; i++) {
      const byteIdx = Math.floor(i / 8);
      const bitMask = 1 << (i % 8);
      bits[i] = (this.bitArray[byteIdx] & bitMask) !== 0 ? 1 : 0;
    }
    return bits;
  }

  /**
   * Retrieves a copy of the underlying Uint8Array.
   * 
   * @returns {Uint8Array}
   */
  getBitArray() {
    return new Uint8Array(this.bitArray);
  }

  /**
   * Reads a single bit value at the specified index.
   * 
   * @param {number} index Bit index [0, size - 1]
   * @returns {number} 0 or 1
   */
  getBit(index) {
    if (index < 0 || index >= this.size || !Number.isFinite(index)) {
      return 0;
    }
    const byteIdx = Math.floor(index / 8);
    const bitMask = 1 << (index % 8);
    return (this.bitArray[byteIdx] & bitMask) !== 0 ? 1 : 0;
  }

  /**
   * Compiles telemetry, saturation, and probabilistic metrics.
   * 
   * @returns {Object}
   */
  getStats() {
    const saturation = this.size > 0 ? this.bitsSet / this.size : 0;
    const theoreticalFPR = this.calculateFalsePositiveRate();
    const empiricalFPR = this.estimateFalsePositiveRate();

    return {
      itemsCount: this.itemsCount,
      itemCount: this.itemsCount,
      bitSize: this.size,
      size: this.size,
      hashCount: this.hashCount,
      bitsSet: this.bitsSet,
      fillRatio: Math.round(saturation * 10000) / 100,
      saturation: Math.round(saturation * 10000) / 10000,
      theoreticalFPR,
      expectedFPR: theoreticalFPR,
      empiricalFPR,
      byteSize: this.byteLength,
      zeroFalseNegativeGuaranteed: true
    };
  }

  /**
   * Resets all bits to 0 and clears counters and history.
   */
  clear() {
    this.bitArray.fill(0);
    this.bitsSet = 0;
    this.itemsCount = 0;
    this.itemCount = 0;
    this.history = [];
  }

  /**
   * Alias for clear().
   */
  reset() {
    this.clear();
  }

  /**
   * Inserts multiple items in batch.
   * 
   * @param {Array<*>} items
   * @returns {{addedCount: number, totalItems: number, bitsSet: number}}
   */
  batchAdd(items) {
    if (!Array.isArray(items)) {
      return { addedCount: 0, totalItems: this.itemsCount, bitsSet: this.bitsSet };
    }

    let addedCount = 0;
    for (let i = 0; i < items.length; i++) {
      this.add(items[i]);
      addedCount++;
    }

    return {
      addedCount,
      totalItems: this.itemsCount,
      bitsSet: this.bitsSet
    };
  }

  /**
   * Alias for batchAdd(items).
   * @param {Array<*>} items
   * @returns {Object}
   */
  batchInsert(items) {
    return this.batchAdd(items);
  }

  /**
   * Checks membership for an array of items.
   * 
   * @param {Array<*>} items
   * @returns {boolean[]} Array of membership booleans
   */
  batchContains(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map(item => this.contains(item));
  }

  /**
   * Calculates optimal Bloom filter size (m) and hash count (k) given expected
   * items (n) and target false positive rate (p).
   * 
   * Formulas:
   *   m = ceil(- (n * ln(p)) / (ln(2)^2))
   *   k = max(1, round((m / n) * ln(2)))
   * 
   * @param {number} n Expected number of items
   * @param {number} [p=0.01] Target false positive rate (0 < p < 1)
   * @returns {{size: number, hashCount: number, expectedItems: number, targetFalsePositiveRate: number, memoryBytes: number}}
   */
  static calculateOptimalParams(n, p = 0.01) {
    const numItems = Math.max(1, parseInt(n, 10) || 100);
    const fpRate = (typeof p === 'number' && p > 0 && p < 1) ? p : 0.01;

    const ln2 = Math.LN2;
    const ln2Sq = ln2 * ln2; // ~0.480453

    const optimalSize = Math.ceil(- (numItems * Math.log(fpRate)) / ln2Sq);
    const optimalK = Math.max(1, Math.round((optimalSize / numItems) * ln2));

    return {
      size: optimalSize,
      hashCount: optimalK,
      expectedItems: numItems,
      targetFalsePositiveRate: fpRate,
      memoryBytes: Math.ceil(optimalSize / 8)
    };
  }

  /**
   * Instance helper for optimal parameter calculation.
   * @param {number} n
   * @param {number} [p=0.01]
   * @returns {Object}
   */
  calculateOptimalParams(n, p = 0.01) {
    return GamingEsportsHubBloomFilter.calculateOptimalParams(n, p);
  }
}

// Browser global exposure for script-tag environments
if (typeof window !== 'undefined') {
  window.GamingEsportsHubBloomFilter = GamingEsportsHubBloomFilter;
}

// Client-Side DOM Interactive Visualizer Controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.querySelector('[data-gaming-bloom-app]');
    if (!appRoot) return;

    let filter = new GamingEsportsHubBloomFilter({ size: 256, hashCount: 4 });
    let lastQueriedIndices = new Set();
    let lastQueryWasMatch = false;
    let lastCollisionIndices = new Set();

    // DOM Elements
    const statSize = document.getElementById('stat-size');
    const statHashes = document.getElementById('stat-hashes');
    const statItems = document.getElementById('stat-items');
    const statBits = document.getElementById('stat-bits');
    const statSaturation = document.getElementById('stat-saturation');
    const statSaturationBar = document.getElementById('stat-saturation-bar');
    const statFpr = document.getElementById('stat-fpr');
    const memoryFootprint = document.getElementById('memory-footprint');

    const gamerTagInput = document.getElementById('gamer-tag-input');
    const addTagBtn = document.getElementById('add-tag-btn');
    const batch10Btn = document.getElementById('batch-10-btn');
    const stressLoadBtn = document.getElementById('stress-load-btn');
    const resetFilterBtn = document.getElementById('reset-filter-btn');

    const queryInput = document.getElementById('query-input');
    const queryBtn = document.getElementById('query-btn');
    const queryVerdictCard = document.getElementById('query-verdict-card');
    const verdictBadge = document.getElementById('verdict-badge');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const hashBreakdown = document.getElementById('hash-breakdown');

    const bitGrid = document.getElementById('bit-grid');
    const bitResolutionSelect = document.getElementById('bit-resolution');
    const hashCountSelect = document.getElementById('hash-count-select');
    const cellInspector = document.getElementById('cell-inspector');
    const auditLogList = document.getElementById('audit-log-list');
    const clearLogBtn = document.getElementById('clear-log-btn');

    const calcItemsInput = document.getElementById('calc-items');
    const calcFprSelect = document.getElementById('calc-fpr');
    const calcResM = document.getElementById('calc-res-m');
    const calcResK = document.getElementById('calc-res-k');
    const calcResBytes = document.getElementById('calc-res-bytes');
    const applyCalcBtn = document.getElementById('apply-calc-btn');

    // Preset Chips
    const presetBlacklistChips = document.querySelectorAll('[data-preset-insert]');
    presetBlacklistChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-preset-insert');
        if (gamerTagInput && val) {
          gamerTagInput.value = val;
          gamerTagInput.focus();
        }
      });
    });

    const presetQueryChips = document.querySelectorAll('[data-preset-query]');
    presetQueryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-preset-query');
        if (queryInput && val) {
          queryInput.value = val;
          queryInput.focus();
        }
      });
    });

    // Helper to log audit events
    function addAuditLog(type, message, statusClass = 'log-info') {
      if (!auditLogList) return;
      const li = document.createElement('li');
      li.className = `log-entry ${statusClass}`;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'log-time';
      const now = new Date();
      timeSpan.textContent = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

      const badgeSpan = document.createElement('span');
      badgeSpan.className = `log-badge badge-${type.toLowerCase()}`;
      badgeSpan.textContent = type;

      const msgSpan = document.createElement('span');
      msgSpan.className = 'log-msg';
      msgSpan.textContent = message;

      li.appendChild(timeSpan);
      li.appendChild(badgeSpan);
      li.appendChild(msgSpan);

      auditLogList.prepend(li);

      // Keep max 80 entries
      while (auditLogList.children.length > 80) {
        auditLogList.removeChild(auditLogList.lastChild);
      }
    }

    // Refresh telemetry and bit grid
    function updateTelemetry() {
      const stats = filter.getStats();
      if (statSize) statSize.textContent = `${stats.size} bits`;
      if (statHashes) statHashes.textContent = `${stats.hashCount} hashes`;
      if (statItems) statItems.textContent = stats.itemsCount.toLocaleString();
      if (statBits) statBits.textContent = `${stats.bitsSet} / ${stats.size}`;
      if (statSaturation) statSaturation.textContent = `${stats.fillRatio.toFixed(1)}%`;
      if (statSaturationBar) {
        statSaturationBar.style.width = `${Math.min(100, stats.fillRatio)}%`;
        if (stats.fillRatio > 75) {
          statSaturationBar.className = 'progress-fill critical';
        } else if (stats.fillRatio > 45) {
          statSaturationBar.className = 'progress-fill warning';
        } else {
          statSaturationBar.className = 'progress-fill normal';
        }
      }
      if (statFpr) statFpr.textContent = `${(stats.theoreticalFPR * 100).toFixed(4)}%`;
      if (memoryFootprint) memoryFootprint.textContent = `${stats.byteSize} Bytes`;

      renderBitGrid();
    }

    // Render Bit Array Matrix
    function renderBitGrid() {
      if (!bitGrid) return;
      bitGrid.innerHTML = '';

      const maxDisplayBits = Math.min(filter.size, 1024);
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < maxDisplayBits; i++) {
        const cell = document.createElement('div');
        const isSet = filter.getBit(i) === 1;
        const isQueried = lastQueriedIndices.has(i);
        const isCollision = lastCollisionIndices.has(i);

        let cellClass = 'bit-cell';
        if (isSet) cellClass += ' bit-active';
        if (isQueried) {
          cellClass += lastQueryWasMatch ? ' bit-queried-match' : ' bit-queried-miss';
        }
        if (isCollision) cellClass += ' bit-collision';

        cell.className = cellClass;
        cell.dataset.bitIndex = String(i);
        cell.setAttribute('title', `Bit [${i}]: ${isSet ? '1 (SET)' : '0 (CLEAR)'}`);

        cell.addEventListener('mouseenter', () => {
          if (cellInspector) {
            const byteIdx = Math.floor(i / 8);
            const bitOffset = i % 8;
            cellInspector.innerHTML = `<strong>Bit #${i}</strong> &bull; Value: <span class="${isSet ? 'text-cyan' : 'text-muted'}">${isSet ? '1 (ACTIVE)' : '0 (OFF)'}</span> &bull; Byte: ${byteIdx}, Offset: ${bitOffset}`;
          }
        });

        fragment.appendChild(cell);
      }

      bitGrid.appendChild(fragment);
    }

    // Add Tag Event Handler
    function handleAddTag() {
      const tag = gamerTagInput ? gamerTagInput.value.trim() : '';
      if (!tag) {
        if (gamerTagInput) gamerTagInput.focus();
        return;
      }

      try {
        const result = filter.add(tag);
        lastCollisionIndices = new Set(result.collisions);
        lastQueriedIndices.clear();

        updateTelemetry();

        const collisionNote = result.collisions.length > 0
          ? ` (${result.collisions.length} collision bits: ${result.collisions.join(', ')})`
          : ' (0 collisions)';

        addAuditLog(
          'INSERT',
          `Blacklisted "${tag}" -> set ${result.newlySetBits} new bits${collisionNote}.`,
          result.wasAlreadyPresent ? 'log-warning' : 'log-success'
        );

        if (gamerTagInput) {
          gamerTagInput.value = '';
          gamerTagInput.focus();
        }
      } catch (err) {
        addAuditLog('ERROR', `Insert failed: ${err.message}`, 'log-error');
      }
    }

    if (addTagBtn) {
      addTagBtn.addEventListener('click', handleAddTag);
    }

    if (gamerTagInput) {
      gamerTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTag();
        }
      });
    }

    // Batch Ingest 10 Samples
    if (batch10Btn) {
      batch10Btn.addEventListener('click', () => {
        const samples = [
          `ViperAimbot_${Math.floor(Math.random() * 900 + 100)}`,
          `SmurfGod#${Math.floor(Math.random() * 9000 + 1000)}`,
          `Spinbot_v3.${Math.floor(Math.random() * 9 + 1)}`,
          `ToxicScripter_${Math.floor(Math.random() * 50)}`,
          `hwid:ac:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(Math.random() * 89 + 10)}`,
          `MatchFixer_${Math.floor(Math.random() * 900 + 100)}`,
          `WallHack_Pro#${Math.floor(Math.random() * 899 + 100)}`,
          `TriggerBot_DLL_${Math.floor(Math.random() * 99)}`,
          `EloBooster_Prime`,
          `CheatEngine_Sig_${Math.floor(Math.random() * 999)}`
        ];

        const res = filter.batchAdd(samples);
        lastCollisionIndices.clear();
        lastQueriedIndices.clear();
        updateTelemetry();

        addAuditLog('BATCH', `Ingested 10 blacklisted entities (total records: ${res.totalItems}, bits set: ${res.bitsSet}).`, 'log-success');
      });
    }

    // Stress Load 50 Samples
    if (stressLoadBtn) {
      stressLoadBtn.addEventListener('click', () => {
        const stressItems = [];
        for (let i = 0; i < 50; i++) {
          stressItems.push(`StressCheater_#${Date.now() % 100000}_${i}`);
        }
        const res = filter.batchAdd(stressItems);
        lastCollisionIndices.clear();
        lastQueriedIndices.clear();
        updateTelemetry();

        addAuditLog('STRESS', `Stress loaded 50 entities (Total items: ${res.totalItems}, bits: ${res.bitsSet}/${filter.size}).`, 'log-warning');
      });
    }

    // Reset Filter
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        filter.reset();
        lastQueriedIndices.clear();
        lastCollisionIndices.clear();
        lastQueryWasMatch = false;

        if (queryVerdictCard) {
          queryVerdictCard.className = 'verdict-card verdict-idle';
        }
        if (verdictBadge) verdictBadge.textContent = 'AWAITING QUERY';
        if (verdictTitle) verdictTitle.textContent = 'No Entity Probed';
        if (verdictDesc) verdictDesc.textContent = 'Enter an esports player tag or cheat signature to verify blacklist membership.';
        if (hashBreakdown) hashBreakdown.innerHTML = '';

        updateTelemetry();
        addAuditLog('RESET', 'Filter cleared: all bits wiped to 0 and counters reset.', 'log-info');
      });
    }

    // Query / Probe Handler
    function handleQuery() {
      const queryTag = queryInput ? queryInput.value.trim() : '';
      if (!queryTag) {
        if (queryInput) queryInput.focus();
        return;
      }

      const diagnosis = filter.query(queryTag);
      lastQueriedIndices = new Set(diagnosis.indices);
      lastQueryWasMatch = diagnosis.present;
      lastCollisionIndices.clear();

      renderBitGrid();

      // Update Verdict Card
      if (queryVerdictCard) {
        queryVerdictCard.className = diagnosis.present
          ? 'verdict-card verdict-positive'
          : 'verdict-card verdict-negative';
      }

      if (verdictBadge) {
        verdictBadge.textContent = diagnosis.present
          ? 'MATCH FOUND - BLACKLISTED'
          : 'DEFINITELY CLEAN - QUEUE APPROVED';
      }

      if (verdictTitle) {
        verdictTitle.textContent = diagnosis.present
          ? `Match Found for "${queryTag}"`
          : `"${queryTag}" is 100% Not in Blacklist`;
      }

      if (verdictDesc) {
        verdictDesc.textContent = diagnosis.guarantee;
      }

      // Render Hash Breakdown
      if (hashBreakdown) {
        hashBreakdown.innerHTML = `
          <div class="hash-meta-grid">
            <div class="meta-item">
              <span class="meta-label">MurmurHash3 (h1):</span>
              <span class="meta-val font-mono">0x${diagnosis.murmur.toString(16).padStart(8, '0')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">FNV-1a 32-bit (h2):</span>
              <span class="meta-val font-mono">0x${diagnosis.fnv.toString(16).padStart(8, '0')}</span>
            </div>
          </div>
          <div class="probe-indices-list">
            ${diagnosis.bitStates.map(b => `
              <span class="probe-bit-pill ${b.isSet ? 'pill-hit' : 'pill-miss'}">
                g_${b.hashOrder}: Bit <strong>#${b.bitIndex}</strong> [${b.isSet ? '1 &bull; SET' : '0 &bull; ZERO'}]
              </span>
            `).join('')}
          </div>
        `;
      }

      addAuditLog(
        diagnosis.present ? 'PROBE-HIT' : 'PROBE-MISS',
        `Queried "${queryTag}" -> ${diagnosis.verdict} (bits: ${diagnosis.indices.join(', ')})`,
        diagnosis.present ? 'log-error' : 'log-success'
      );
    }

    if (queryBtn) {
      queryBtn.addEventListener('click', handleQuery);
    }

    if (queryInput) {
      queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleQuery();
        }
      });
    }

    // Filter Resolution Change
    if (bitResolutionSelect) {
      bitResolutionSelect.addEventListener('change', () => {
        const newSize = parseInt(bitResolutionSelect.value, 10);
        const currentK = filter.hashCount;
        filter = new GamingEsportsHubBloomFilter({ size: newSize, hashCount: currentK });
        lastQueriedIndices.clear();
        lastCollisionIndices.clear();
        updateTelemetry();
        addAuditLog('CONFIG', `Reconfigured filter bit size to ${newSize} bits. Memory reset.`, 'log-info');
      });
    }

    // Hash Count Change
    if (hashCountSelect) {
      hashCountSelect.addEventListener('change', () => {
        const newK = parseInt(hashCountSelect.value, 10);
        const currentSize = filter.size;
        filter = new GamingEsportsHubBloomFilter({ size: currentSize, hashCount: newK });
        lastQueriedIndices.clear();
        lastCollisionIndices.clear();
        updateTelemetry();
        addAuditLog('CONFIG', `Reconfigured hash count to k=${newK}. Memory reset.`, 'log-info');
      });
    }

    // Clear Audit Log
    if (clearLogBtn && auditLogList) {
      clearLogBtn.addEventListener('click', () => {
        auditLogList.innerHTML = '';
        addAuditLog('SYSTEM', 'Audit log cleared.', 'log-info');
      });
    }

    // Sizing Calculator Logic
    function updateCalculator() {
      if (!calcItemsInput || !calcFprSelect) return;
      const n = parseInt(calcItemsInput.value, 10) || 100;
      const p = parseFloat(calcFprSelect.value) || 0.01;

      const optimal = GamingEsportsHubBloomFilter.calculateOptimalParams(n, p);
      if (calcResM) calcResM.textContent = `${optimal.size.toLocaleString()} bits`;
      if (calcResK) calcResK.textContent = `${optimal.hashCount} hashes`;
      if (calcResBytes) calcResBytes.textContent = `${optimal.memoryBytes.toLocaleString()} B (${(optimal.memoryBytes / 1024).toFixed(2)} KB)`;
    }

    if (calcItemsInput) calcItemsInput.addEventListener('input', updateCalculator);
    if (calcFprSelect) calcFprSelect.addEventListener('change', updateCalculator);

    if (applyCalcBtn) {
      applyCalcBtn.addEventListener('click', () => {
        const n = parseInt(calcItemsInput ? calcItemsInput.value : 100, 10) || 100;
        const p = parseFloat(calcFprSelect ? calcFprSelect.value : 0.01) || 0.01;
        const optimal = GamingEsportsHubBloomFilter.calculateOptimalParams(n, p);

        filter = new GamingEsportsHubBloomFilter({ size: optimal.size, hashCount: optimal.hashCount });
        if (bitResolutionSelect) {
          // Add custom option if not present
          let found = false;
          for (let opt of bitResolutionSelect.options) {
            if (parseInt(opt.value, 10) === optimal.size) {
              opt.selected = true;
              found = true;
              break;
            }
          }
          if (!found) {
            const opt = new Option(`${optimal.size} bits (optimal)`, String(optimal.size), true, true);
            bitResolutionSelect.add(opt);
          }
        }
        if (hashCountSelect) {
          hashCountSelect.value = String(Math.min(optimal.hashCount, 8));
        }

        lastQueriedIndices.clear();
        lastCollisionIndices.clear();
        updateTelemetry();

        addAuditLog('CALC', `Applied optimal dimensions: m=${optimal.size} bits, k=${optimal.hashCount} for n=${n}, target FPR=${p * 100}%.`, 'log-success');
      });
    }

    // Initial default seed items for live esports showcase experience
    const initialSeed = [
      'AimbotGod_x9',
      'Spinbot#666',
      'ToxicSmurf_EU',
      'hwid:d4:5d:64:12:ef',
      'CheatSig:WallHack_v2'
    ];
    filter.batchAdd(initialSeed);

    updateTelemetry();
    updateCalculator();
    addAuditLog('INIT', `Bloom Filter visualizer initialized with ${initialSeed.length} sample blacklisted entities.`, 'log-info');
  });
}
