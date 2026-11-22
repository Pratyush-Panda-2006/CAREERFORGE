/**
 * Podcast Audio Stream - Probabilistic Bloom Filter & Membership Query Engine
 * 
 * High-performance, memory-efficient probabilistic data structure for live podcast
 * episode and audio stream track deduplication. Uses Kirsch-Mitzenmacher double-hashing
 * (MurmurHash3 32-bit + FNV-1a 32-bit) with a 0% false negative guarantee.
 */

export class PodcastAudioStreamBloomFilter {
  /**
   * Initializes the Bloom filter.
   * @param {Object} [options={}] Configuration options
   * @param {number} [options.size=1024] Number of bits in the filter (m)
   * @param {number} [options.hashCount=4] Number of hash functions (k)
   */
  constructor(options = {}) {
    const rawSize = parseInt(options.size, 10);
    this.size = Number.isFinite(rawSize) && rawSize >= 16 ? rawSize : 1024;

    const rawK = parseInt(options.hashCount, 10);
    this.hashCount = Number.isFinite(rawK) && rawK >= 1 ? Math.min(rawK, 32) : 4;

    this.byteLength = Math.ceil(this.size / 8);
    this.bitArray = new Uint8Array(this.byteLength);

    this.itemsCount = 0;
    this.bitsSet = 0;
    this.history = [];
    this.name = 'PodcastAudioStreamBloomFilter';
  }

  /**
   * 32-bit MurmurHash3 implementation for string inputs.
   * @param {string} key Input string
   * @param {number} [seed=0x9747b28c] Seed value
   * @returns {number} 32-bit unsigned hash
   * @private
   */
  _murmur3(key, seed = 0x9747b28c) {
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
   * 32-bit FNV-1a hash implementation for string inputs.
   * @param {string} key Input string
   * @param {number} [seed=0x811c9dc5] FNV offset basis
   * @returns {number} 32-bit unsigned hash
   * @private
   */
  _fnv1a(key, seed = 0x811c9dc5) {
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
   * Computes the base Murmur3 and FNV-1a hash values for a key.
   * @param {*} key Input identifier
   * @returns {{murmur: number, fnv: number}}
   */
  getHashValues(key) {
    const str = String(key);
    const murmur = this._murmur3(str);
    let fnv = this._fnv1a(str);
    if (fnv === 0) {
      fnv = 1;
    }
    return { murmur, fnv };
  }

  /**
   * Generates k bit indices using Kirsch-Mitzenmacher double-hashing:
   * g_i(x) = (h1(x) + i * h2(x)) mod m
   * @param {*} key Input episode or track identifier
   * @returns {number[]} Array of k bit indices within [0, size - 1]
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
   * Adds an episode or audio stream track identifier into the Bloom filter.
   * Sets all k hash bits in the bit array.
   * @param {*} id Episode or track ID
   * @returns {{id: string, indices: number[], newlySetBits: number, wasAlreadyPresent: boolean}}
   */
  add(id) {
    const strId = String(id);
    const indices = this.getHashIndices(strId);
    let newlySetBits = 0;
    let allPreviouslySet = true;

    for (let j = 0; j < indices.length; j++) {
      const idx = indices[j];
      const byteIdx = Math.floor(idx / 8);
      const bitMask = 1 << (idx % 8);

      if ((this.bitArray[byteIdx] & bitMask) === 0) {
        this.bitArray[byteIdx] |= bitMask;
        this.bitsSet++;
        newlySetBits++;
        allPreviouslySet = false;
      }
    }

    this.itemsCount++;

    const result = {
      id: strId,
      indices,
      newlySetBits,
      wasAlreadyPresent: allPreviouslySet && this.itemsCount > 1
    };

    if (this.history.length >= 100) {
      this.history.shift();
    }
    this.history.push({
      type: 'ADD',
      id: strId,
      indices,
      newlySetBits,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Queries whether an episode or track identifier is in the Bloom filter.
   * GUARANTEE: If the item was added, this is GUARANTEED to return true (0% false negatives).
   * If any bit is 0, it is 100% definitely NOT in the filter.
   * @param {*} id Episode or track ID
   * @returns {boolean} True if probably in filter, false if definitely not
   */
  contains(id) {
    const strId = String(id);
    const indices = this.getHashIndices(strId);

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
   * Detailed diagnostic query returning bit-level states and mathematical guarantees.
   * @param {*} id Episode or track ID
   * @returns {Object} Diagnostic membership result
   */
  query(id) {
    const strId = String(id);
    const { murmur, fnv } = this.getHashValues(strId);
    const indices = this.getHashIndices(strId);

    const bitStates = indices.map((idx, indexOrder) => {
      const isSet = this.getBit(idx) === 1;
      return {
        hashIndex: indexOrder,
        bitPosition: idx,
        isSet,
        byteIndex: Math.floor(idx / 8),
        bitOffset: idx % 8
      };
    });

    const isPresent = bitStates.every(b => b.isSet);
    const fpr = this.estimateFalsePositiveRate();

    const diagnosis = {
      id: strId,
      present: isPresent,
      indices,
      bitStates,
      murmur,
      fnv,
      verdict: isPresent ? 'PROBABLY_PRESENT' : 'DEFINITELY_NOT_PRESENT',
      guarantee: isPresent
        ? `All ${this.hashCount} bits set. Probable stream hit (Est. FPR: ${(fpr * 100).toFixed(4)}%)`
        : `Bit mismatch detected. 100% Guaranteed NOT in stream (0% False Negative Guarantee)`,
      estimatedFalsePositiveRate: fpr,
      timestamp: Date.now()
    };

    if (this.history.length >= 100) {
      this.history.shift();
    }
    this.history.push({
      type: 'QUERY',
      id: strId,
      present: isPresent,
      indices,
      timestamp: Date.now()
    });

    return diagnosis;
  }

  /**
   * Ingests an array of episode or track identifiers in batch.
   * @param {Array<*>} items Array of identifiers
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
   * Checks multiple items in batch against the filter.
   * @param {Array<*>} items Array of identifiers
   * @returns {boolean[]} Array of membership booleans
   */
  batchContains(items) {
    if (!Array.isArray(items)) {
      return [];
    }
    return items.map(item => this.contains(item));
  }

  /**
   * Retrieves the binary value of a bit at a specific position.
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
   * Returns a copy of the underlying bit array.
   * @returns {Uint8Array}
   */
  getBitArray() {
    return new Uint8Array(this.bitArray);
  }

  /**
   * Calculates current theoretical False Positive Rate based on bit saturation:
   * FPR = (bitsSet / size) ^ k
   * @returns {number} Value in range [0.0, 1.0]
   */
  estimateFalsePositiveRate() {
    if (this.bitsSet === 0 || this.size === 0) {
      return 0.0;
    }
    if (this.bitsSet >= this.size) {
      return 1.0;
    }

    const saturation = this.bitsSet / this.size;
    const fpr = Math.pow(saturation, this.hashCount);
    return Math.min(1.0, Math.max(0.0, fpr));
  }

  /**
   * Compiles comprehensive operational telemetry and saturation metrics.
   * @returns {Object} Telemetry statistics
   */
  getStats() {
    const saturation = this.size > 0 ? this.bitsSet / this.size : 0;
    const fpr = this.estimateFalsePositiveRate();

    return {
      size: this.size,
      hashCount: this.hashCount,
      itemsCount: this.itemsCount,
      bitsSet: this.bitsSet,
      byteSize: this.bitArray.length,
      saturation: Math.round(saturation * 10000) / 10000,
      fillRatio: Math.round(saturation * 10000) / 100,
      estimatedFalsePositiveRate: fpr,
      estimatedFalsePositivePercent: (fpr * 100).toFixed(4) + '%',
      zeroFalseNegativeGuaranteed: true
    };
  }

  /**
   * Resets all bits to 0 and clears item counters.
   */
  clear() {
    this.bitArray.fill(0);
    this.bitsSet = 0;
    this.itemsCount = 0;
    this.history = [];
  }

  /**
   * Calculates optimal Bloom filter size (m) and hash count (k) given expected
   * items (n) and desired false positive probability (p).
   * 
   * Formulas:
   *   m = ceil(- (n * ln(p)) / (ln(2)^2))
   *   k = max(1, round((m / n) * ln(2)))
   * 
   * @param {number} n Expected number of items
   * @param {number} [p=0.01] Target false positive probability (0 < p < 1)
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
   * @param {number} n Expected items
   * @param {number} [p=0.01] Target false positive probability
   * @returns {Object}
   */
  calculateOptimalParams(n, p = 0.01) {
    return PodcastAudioStreamBloomFilter.calculateOptimalParams(n, p);
  }
}

// Browser global exposure for script-tag environments
if (typeof window !== 'undefined') {
  window.PodcastAudioStreamBloomFilter = PodcastAudioStreamBloomFilter;
}

// Client-Side DOM Interactive Visualizer Controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const appRoot = document.querySelector('[data-bloom-filter-app]');
    if (!appRoot) return;

    let filter = new PodcastAudioStreamBloomFilter({ size: 512, hashCount: 4 });
    let lastQueriedIndices = new Set();
    let lastQueryWasMatch = false;

    // DOM Element Queries
    const statSize = document.getElementById('stat-size');
    const statHashes = document.getElementById('stat-hashes');
    const statItems = document.getElementById('stat-items');
    const statBits = document.getElementById('stat-bits');
    const statSaturation = document.getElementById('stat-saturation');
    const statSaturationBar = document.getElementById('stat-saturation-bar');
    const statFpr = document.getElementById('stat-fpr');
    const memoryFootprint = document.getElementById('memory-footprint');

    const trackInput = document.getElementById('track-id-input');
    const addBtn = document.getElementById('add-track-btn');
    const batch10Btn = document.getElementById('batch-10-btn');
    const batch25Btn = document.getElementById('batch-25-btn');
    const addDuplicateBtn = document.getElementById('add-duplicate-btn');
    const clearBtn = document.getElementById('clear-filter-btn');

    const queryInput = document.getElementById('query-input');
    const queryBtn = document.getElementById('query-btn');
    const queryResultCard = document.getElementById('query-result-card');
    const verdictTitle = document.getElementById('verdict-title');
    const verdictDesc = document.getElementById('verdict-desc');
    const hashBreakdown = document.getElementById('hash-breakdown');

    const bitGrid = document.getElementById('bit-grid');
    const bitResolutionSelect = document.getElementById('bit-resolution');
    const logList = document.getElementById('audit-log-list');

    const calcItemsInput = document.getElementById('calc-items');
    const calcFprSelect = document.getElementById('calc-fpr');
    const calcResultM = document.getElementById('calc-res-m');
    const calcResultK = document.getElementById('calc-res-k');
    const calcResultBytes = document.getElementById('calc-res-bytes');
    const applyCalcBtn = document.getElementById('apply-calc-btn');

    const waveformCanvas = document.getElementById('waveform-canvas');

    // Preset chips
    const presetChips = document.querySelectorAll('.preset-chip');
    presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const val = chip.getAttribute('data-value');
        if (trackInput && val) {
          trackInput.value = val;
          trackInput.focus();
        }
      });
    });

    // Helper to refresh telemetry and UI
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
        } else if (stats.fillRatio > 50) {
          statSaturationBar.className = 'progress-fill warning';
        } else {
          statSaturationBar.className = 'progress-fill normal';
        }
      }
      if (statFpr) statFpr.textContent = stats.estimatedFalsePositivePercent;
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

        let cellClasses = ['bit-cell'];
        if (isSet) cellClasses.push('active');
        if (isQueried) {
          cellClasses.push(lastQueryWasMatch ? 'query-hit' : 'query-target');
        }

        cell.className = cellClasses.join(' ');
        cell.title = `Bit #${i}: ${isSet ? '1 (SET)' : '0 (UNSET)'}`;
        cell.setAttribute('data-index', i);
        fragment.appendChild(cell);
      }

      bitGrid.appendChild(fragment);
    }

    // Append to Audit Event Feed
    function appendLog(action, id, verdict, extra = '') {
      if (!logList) return;
      const li = document.createElement('li');
      li.className = `log-item log-${action.toLowerCase()}`;

      const time = new Date().toLocaleTimeString();
      li.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-badge ${action.toLowerCase()}">${action}</span>
        <span class="log-id">${id}</span>
        <span class="log-verdict">${verdict}</span>
        ${extra ? `<span class="log-extra">${extra}</span>` : ''}
      `;

      logList.insertBefore(li, logList.firstChild);
      while (logList.children.length > 20) {
        logList.removeChild(logList.lastChild);
      }
    }

    // Add Track / Episode Handler
    function handleAdd(trackId) {
      if (!trackId || !trackId.trim()) return;
      const cleanId = trackId.trim();
      const res = filter.add(cleanId);

      lastQueriedIndices = new Set(res.indices);
      lastQueryWasMatch = true;

      updateTelemetry();
      appendLog('INGEST', cleanId, `Set ${res.newlySetBits} new bit(s)`, `Indices: [${res.indices.join(', ')}]`);
      pulseWaveform();
    }

    if (addBtn && trackInput) {
      addBtn.addEventListener('click', () => {
        handleAdd(trackInput.value);
        trackInput.value = '';
      });

      trackInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleAdd(trackInput.value);
          trackInput.value = '';
        }
      });
    }

    // Batch Ingest Handlers
    const sampleTitles = [
      'deep-dive-ai', 'modular-audio', 'dsp-frequency', 'sub-bass-lab', 'spatial-sound',
      'neural-synthesis', 'wavetable-orbit', 'frequency-modulation', 'quantum-codec', 'analog-warmth',
      'id3-chapter-01', 'id3-chapter-02', 'id3-chapter-03', 'id3-chapter-04', 'id3-chapter-05',
      'live-feed-a', 'live-feed-b', 'host-mic-01', 'guest-audio-stream', 'ambient-drone'
    ];

    if (batch10Btn) {
      batch10Btn.addEventListener('click', () => {
        const randIndex = Math.floor(Math.random() * 1000);
        for (let i = 0; i < 10; i++) {
          const sample = sampleTitles[i % sampleTitles.length];
          filter.add(`stream-${sample}-${randIndex + i}`);
        }
        lastQueriedIndices.clear();
        updateTelemetry();
        appendLog('BATCH', `+10 Episodes`, `Burst Ingest Completed`);
        pulseWaveform();
      });
    }

    if (batch25Btn) {
      batch25Btn.addEventListener('click', () => {
        const randIndex = Math.floor(Math.random() * 5000);
        for (let i = 0; i < 25; i++) {
          filter.add(`podcast-stream-burst-${randIndex + i}`);
        }
        lastQueriedIndices.clear();
        updateTelemetry();
        appendLog('BATCH', `+25 Episodes`, `High-Throughput Burst Completed`);
        pulseWaveform();
      });
    }

    if (addDuplicateBtn) {
      addDuplicateBtn.addEventListener('click', () => {
        const dupId = 'ep-101-modular-synth';
        const res = filter.add(dupId);
        lastQueriedIndices = new Set(res.indices);
        lastQueryWasMatch = true;
        updateTelemetry();
        appendLog('DUPLICATE', dupId, `Idempotent Ingest: ${res.newlySetBits} new bits set`);
        pulseWaveform();
      });
    }

    // Query Stream Membership Handler
    function handleQuery(queryVal) {
      if (!queryVal || !queryVal.trim()) return;
      const cleanId = queryVal.trim();
      const diag = filter.query(cleanId);

      lastQueriedIndices = new Set(diag.indices);
      lastQueryWasMatch = diag.present;

      if (queryResultCard && verdictTitle && verdictDesc && hashBreakdown) {
        queryResultCard.style.display = 'block';
        queryResultCard.className = `result-card ${diag.present ? 'match' : 'no-match'}`;

        if (diag.present) {
          verdictTitle.innerHTML = `<span class="icon">✅</span> PROBABLY IN STREAM`;
          verdictDesc.textContent = `All ${filter.hashCount} double-hash bits match. This episode was very likely already played or cached in the live stream.`;
        } else {
          verdictTitle.innerHTML = `<span class="icon">❌</span> DEFINITELY NOT IN STREAM`;
          verdictDesc.textContent = `0% FALSE NEGATIVE GUARANTEE: At least one required hash bit was 0. This track has NEVER entered the stream.`;
        }

        const indicesHtml = diag.bitStates.map(bs => `
          <div class="hash-tag ${bs.isSet ? 'bit-on' : 'bit-off'}">
            g<sub>${bs.hashIndex}</sub>: Bit #${bs.bitPosition} [${bs.isSet ? '1' : '0'}]
          </div>
        `).join('');

        hashBreakdown.innerHTML = `
          <div class="hash-formulas">
            <span>Murmur3 (h1): <code>0x${diag.murmur.toString(16).toUpperCase()}</code></span>
            <span>FNV-1a (h2): <code>0x${diag.fnv.toString(16).toUpperCase()}</code></span>
          </div>
          <div class="indices-chips">${indicesHtml}</div>
        `;
      }

      updateTelemetry();
      appendLog('QUERY', cleanId, diag.verdict, diag.present ? 'Probable Match' : 'Definite Zero');
      pulseWaveform();
    }

    if (queryBtn && queryInput) {
      queryBtn.addEventListener('click', () => {
        handleQuery(queryInput.value);
      });

      queryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleQuery(queryInput.value);
        }
      });
    }

    // Clear Filter Handler
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        filter.clear();
        lastQueriedIndices.clear();
        if (queryResultCard) queryResultCard.style.display = 'none';
        updateTelemetry();
        appendLog('RESET', 'Filter Bitset', 'All bits cleared to 0');
      });
    }

    // Optimal Calculator
    function updateOptimalCalc() {
      if (!calcItemsInput || !calcFprSelect) return;
      const n = parseInt(calcItemsInput.value, 10) || 100;
      const p = parseFloat(calcFprSelect.value) || 0.01;
      const optimal = PodcastAudioStreamBloomFilter.calculateOptimalParams(n, p);

      if (calcResultM) calcResultM.textContent = `${optimal.size.toLocaleString()} bits`;
      if (calcResultK) calcResultK.textContent = `${optimal.hashCount} hashes`;
      if (calcResultBytes) calcResultBytes.textContent = `${optimal.memoryBytes.toLocaleString()} B`;
    }

    if (calcItemsInput && calcFprSelect) {
      calcItemsInput.addEventListener('input', updateOptimalCalc);
      calcFprSelect.addEventListener('change', updateOptimalCalc);
      updateOptimalCalc();
    }

    if (applyCalcBtn && calcItemsInput && calcFprSelect) {
      applyCalcBtn.addEventListener('click', () => {
        const n = parseInt(calcItemsInput.value, 10) || 100;
        const p = parseFloat(calcFprSelect.value) || 0.01;
        const optimal = PodcastAudioStreamBloomFilter.calculateOptimalParams(n, p);

        filter = new PodcastAudioStreamBloomFilter({
          size: optimal.size,
          hashCount: optimal.hashCount
        });

        lastQueriedIndices.clear();
        if (queryResultCard) queryResultCard.style.display = 'none';
        updateTelemetry();
        appendLog('CONFIG', `Size: ${optimal.size}b, K: ${optimal.hashCount}`, `Optimal Sizer Applied`);
      });
    }

    // Audio Equalizer Waveform Canvas Animation
    let canvasAnimId;
    let waveIntensity = 1.0;

    function initWaveform() {
      if (!waveformCanvas) return;
      const ctx = waveformCanvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const width = waveformCanvas.clientWidth || 300;
      const height = waveformCanvas.clientHeight || 50;

      waveformCanvas.width = width * dpr;
      waveformCanvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      let phase = 0;
      const barCount = 36;

      function renderFrame() {
        ctx.clearRect(0, 0, width, height);
        const barWidth = (width / barCount) - 2;

        for (let i = 0; i < barCount; i++) {
          const norm = i / barCount;
          const sinVal = Math.sin(phase + norm * Math.PI * 4);
          const cosVal = Math.cos(phase * 0.7 + norm * Math.PI * 2);
          const barHeight = Math.max(4, ((sinVal + cosVal + 2) / 4) * height * 0.75 * waveIntensity);

          const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
          grad.addColorStop(0, '#9d4edd');
          grad.addColorStop(1, '#00f0ff');

          ctx.fillStyle = grad;
          ctx.fillRect(i * (barWidth + 2), height - barHeight, barWidth, barHeight);
        }

        phase += 0.08;
        if (waveIntensity > 1.0) {
          waveIntensity -= 0.03;
        }

        canvasAnimId = requestAnimationFrame(renderFrame);
      }

      renderFrame();
    }

    function pulseWaveform() {
      waveIntensity = 1.8;
    }

    // Bootstrap initial sample data
    filter.add('ep-101-modular-synth');
    filter.add('ep-102-low-latency-dsp');
    filter.add('ep-103-quantum-audio');

    updateTelemetry();
    appendLog('INIT', 'Stream Ingest Engine', 'Preloaded 3 reference podcast episodes');
    initWaveform();
  });
}
