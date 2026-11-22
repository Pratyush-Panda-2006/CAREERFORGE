/**
 * Cybersecurity Sentinel - Probabilistic Bloom Filter & Membership Query Engine
 * High-performance probabilistic data structure for rapid set-membership verification
 * with mathematical 0% false negative guarantee and configurable false positive bounds.
 */

export class CybersecuritySentinelBloomFilter {
  /**
   * @param {number|Object} sizeOrOptions - Number of bits or options object
   * @param {number} [hashCount=4] - Number of hash iterations
   */
  constructor(sizeOrOptions = 128, hashCount = 4) {
    if (typeof sizeOrOptions === 'object' && sizeOrOptions !== null) {
      if (sizeOrOptions.expectedItems && sizeOrOptions.targetFalsePositiveRate) {
        const optimal = CybersecuritySentinelBloomFilter.calculateOptimalParams(
          sizeOrOptions.expectedItems,
          sizeOrOptions.targetFalsePositiveRate
        );
        this.size = optimal.size;
        this.hashCount = optimal.hashCount;
      } else {
        const rawSize = sizeOrOptions.size !== undefined ? Number(sizeOrOptions.size) : 128;
        const rawK = sizeOrOptions.hashCount !== undefined ? Number(sizeOrOptions.hashCount) : (hashCount !== undefined ? Number(hashCount) : 4);
        this.size = Math.max(8, Math.floor(Number.isFinite(rawSize) ? rawSize : 128));
        this.hashCount = Math.max(1, Math.min(32, Math.floor(Number.isFinite(rawK) ? rawK : 4)));
      }
    } else {
      const rawSize = sizeOrOptions !== undefined ? Number(sizeOrOptions) : 128;
      const rawK = hashCount !== undefined ? Number(hashCount) : 4;
      this.size = Math.max(8, Math.floor(Number.isFinite(rawSize) ? rawSize : 128));
      this.hashCount = Math.max(1, Math.min(32, Math.floor(Number.isFinite(rawK) ? rawK : 4)));
    }

    this.bits = new Uint8Array(this.size);
    this.itemCount = 0;
    this.insertedItems = new Set();
    this.history = [];
  }

  /**
   * 32-bit Fowler-Noll-Vo (FNV-1a) hash algorithm
   * @param {string} str - Input payload
   * @param {number} [seed=0x811c9dc5] - Initial seed
   * @returns {number} 32-bit unsigned integer
   */
  static fnv1a(str, seed = 0x811c9dc5) {
    let hash = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * 32-bit Murmur3-inspired hash algorithm
   * @param {string} str - Input payload
   * @param {number} [seed=0x9747b28c] - Seed value
   * @returns {number} 32-bit unsigned integer
   */
  static murmur3(str, seed = 0x9747b28c) {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      let k = str.charCodeAt(i);
      k = Math.imul(k, 0xcc9e2d51);
      k = (k << 15) | (k >>> 17);
      k = Math.imul(k, 0x1b873593);

      h ^= k;
      h = (h << 13) | (h >>> 19);
      h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
    }
    h ^= str.length;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  /**
   * Kirsch-Mitzenmacher double hashing technique:
   * Generates k distinct hash indices using two independent 32-bit hashes:
   * g_i(x) = (h1(x) + i * h2(x) + i^2) mod m
   * @param {*} item - Input item
   * @returns {number[]} Array of k bit indices
   */
  getHashIndices(item) {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '');
    const h1 = CybersecuritySentinelBloomFilter.fnv1a(key);
    let h2 = CybersecuritySentinelBloomFilter.murmur3(key);
    if (h2 === 0) h2 = 1;

    const indices = [];
    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + Math.imul(i, h2) + Math.imul(i, i)) >>> 0;
      indices.push(combined % this.size);
    }
    return indices;
  }

  /**
   * Adds an item to the Bloom filter.
   * Deterministically sets the k hash indices in the bit array to 1.
   * @param {*} item - Item to add
   * @returns {{ item: string, indices: number[], stats: Object }}
   */
  add(item) {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '');
    const indices = this.getHashIndices(key);

    for (const idx of indices) {
      this.bits[idx] = 1;
    }

    this.itemCount++;
    this.insertedItems.add(key);

    const entry = {
      type: 'add',
      item: key,
      indices,
      timestamp: Date.now()
    };
    this.history.push(entry);
    if (this.history.length > 100) this.history.shift();

    return {
      item: key,
      indices,
      stats: this.getStats()
    };
  }

  /**
   * Checks if an item may be present in the Bloom filter.
   * Guaranteed 0% false negative rate: if any corresponding bit is 0,
   * the item is DEFINITELY NOT in the filter.
   * If all bits are 1, the item is PROBABLY in the filter.
   * @param {*} item - Item to test
   * @returns {boolean} True if probably present, false if definitely absent
   */
  contains(item) {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '');
    const indices = this.getHashIndices(key);
    for (const idx of indices) {
      if (this.bits[idx] !== 1) {
        return false;
      }
    }
    return true;
  }

  /**
   * Detailed membership query diagnostic
   * @param {*} item - Item to query
   * @returns {Object} Query diagnostics
   */
  query(item) {
    const key = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item ?? '');
    const indices = this.getHashIndices(key);
    const bitStates = indices.map(idx => ({ index: idx, value: this.bits[idx] }));
    const match = bitStates.every(b => b.value === 1);

    const result = {
      item: key,
      match,
      isDefinitelyAbsent: !match,
      isProbablyPresent: match,
      indices,
      bitStates,
      falsePositiveRate: this.getStats().falsePositiveRate
    };

    const entry = {
      type: 'query',
      item: key,
      match,
      indices,
      timestamp: Date.now()
    };
    this.history.push(entry);
    if (this.history.length > 100) this.history.shift();

    return result;
  }

  /**
   * Computes capacity, bit density, and theoretical/empirical false positive metrics.
   * @returns {Object} Bloom filter telemetry stats
   */
  getStats() {
    let setBits = 0;
    for (let i = 0; i < this.size; i++) {
      if (this.bits[i] === 1) setBits++;
    }

    const zeroBits = this.size - setBits;
    const fillRatio = this.size > 0 ? setBits / this.size : 0;

    // Theoretical False Positive Probability: (1 - e^(-k * n / m))^k
    const theoreticalFPR = this.size > 0 && this.itemCount > 0
      ? Math.pow(1 - Math.exp(- (this.hashCount * this.itemCount) / this.size), this.hashCount)
      : 0;

    // Empirical False Positive Probability based on current set bit density: (setBits / m)^k
    const empiricalFPR = Math.pow(fillRatio, this.hashCount);

    // Optimal k for current m and n: (m / n) * ln(2)
    const optimalK = this.itemCount > 0
      ? Math.max(1, Math.round((this.size / this.itemCount) * Math.LN2))
      : this.hashCount;

    return {
      size: this.size,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      uniqueItemCount: this.insertedItems.size,
      setBits,
      zeroBits,
      fillRatio: Number(fillRatio.toFixed(6)),
      capacitySaturation: Number((fillRatio * 100).toFixed(2)),
      theoreticalFPR: Number(theoreticalFPR.toFixed(6)),
      empiricalFPR: Number(empiricalFPR.toFixed(6)),
      falsePositiveRate: Number(theoreticalFPR.toFixed(6)),
      optimalK
    };
  }

  /**
   * Resets all bits to 0 and clears items and history.
   * @returns {Object} Reset stats
   */
  clear() {
    this.bits.fill(0);
    this.itemCount = 0;
    this.insertedItems.clear();
    this.history = [];
    return this.getStats();
  }

  /**
   * Reconfigures the filter with a new bit size and hash count, clearing existing state.
   * @param {number} newSize - New bit array size
   * @param {number} newHashCount - New hash function count
   */
  reconfigure(newSize, newHashCount) {
    const rawSize = newSize !== undefined ? Number(newSize) : 128;
    const rawK = newHashCount !== undefined ? Number(newHashCount) : 4;
    this.size = Math.max(8, Math.floor(Number.isFinite(rawSize) ? rawSize : 128));
    this.hashCount = Math.max(1, Math.min(32, Math.floor(Number.isFinite(rawK) ? rawK : 4)));
    this.bits = new Uint8Array(this.size);
    this.clear();
  }

  /**
   * Calculates optimal bit size (m) and hash functions (k) for target items (n) and false positive rate (p).
   * Formula:
   *   m = ceil(- (n * ln(p)) / (ln(2)^2))
   *   k = round((m / n) * ln(2))
   * @param {number} expectedItems - Expected number of items (n)
   * @param {number} [targetFalsePositiveRate=0.01] - Desired false positive probability (p)
   * @returns {{ size: number, hashCount: number, expectedItems: number, targetFalsePositiveRate: number }}
   */
  static calculateOptimalParams(expectedItems, targetFalsePositiveRate = 0.01) {
    const n = Math.max(1, Number(expectedItems) || 100);
    const p = Math.min(0.9999, Math.max(0.0001, Number(targetFalsePositiveRate) || 0.01));
    const m = Math.ceil(- (n * Math.log(p)) / (Math.LN2 * Math.LN2));
    const k = Math.max(1, Math.round((m / n) * Math.LN2));
    return {
      size: m,
      hashCount: k,
      expectedItems: n,
      targetFalsePositiveRate: p
    };
  }

  /**
   * Estimates false positive rate given m, k, and n.
   * @param {number} m - Size in bits
   * @param {number} k - Number of hash functions
   * @param {number} n - Number of inserted items
   * @returns {number} Theoretical false positive probability
   */
  static estimateFalsePositiveRate(m, k, n) {
    if (m <= 0 || k <= 0 || n <= 0) return 0;
    return Math.pow(1 - Math.exp(- (k * n) / m), k);
  }
}

/**
 * UI visualizer mount handler for browser environments
 */
function mount() {
  const filter = new CybersecuritySentinelBloomFilter(128, 4);

  // DOM Elements
  const bitGrid = document.getElementById('bitGrid');
  const itemInput = document.getElementById('itemInput');
  const addBtn = document.getElementById('addBtn');
  const batchAddBtn = document.getElementById('batchAddBtn');
  const queryInput = document.getElementById('queryInput');
  const queryBtn = document.getElementById('queryBtn');
  const clearBtn = document.getElementById('clearBtn');
  const filterSizeSelect = document.getElementById('filterSizeSelect');
  const hashCountSelect = document.getElementById('hashCountSelect');

  // Metrics
  const metricSize = document.getElementById('metricSize');
  const metricHashes = document.getElementById('metricHashes');
  const metricItems = document.getElementById('metricItems');
  const metricSetBits = document.getElementById('metricSetBits');
  const metricSaturation = document.getElementById('metricSaturation');
  const metricFpr = document.getElementById('metricFpr');
  const saturationProgressBar = document.getElementById('saturationProgressBar');
  const fprProgressBar = document.getElementById('fprProgressBar');
  const queryResultBanner = document.getElementById('queryResultBanner');
  const queryResultText = document.getElementById('queryResultText');
  const queryResultIndices = document.getElementById('queryResultIndices');
  const auditLogs = document.getElementById('auditLogs');

  // Calculator inputs
  const calcItemsInput = document.getElementById('calcItemsInput');
  const calcFprInput = document.getElementById('calcFprInput');
  const calcOptimalBits = document.getElementById('calcOptimalBits');
  const calcOptimalHashes = document.getElementById('calcOptimalHashes');

  // Preset threat items
  const presetChips = document.querySelectorAll('.preset-chip');

  function logAudit(message, type = 'info') {
    if (!auditLogs) return;
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-text">${message}</span>`;
    auditLogs.prepend(entry);
    while (auditLogs.children.length > 40) {
      auditLogs.removeChild(auditLogs.lastChild);
    }
  }

  function renderGrid(highlightIndices = [], highlightClass = '') {
    if (!bitGrid) return;
    bitGrid.replaceChildren();

    const highlightSet = new Set(highlightIndices);

    for (let i = 0; i < filter.size; i++) {
      const bitCell = document.createElement('div');
      const isSet = filter.bits[i] === 1;
      const isHighlighted = highlightSet.has(i);

      let classes = ['bit-cell'];
      if (isSet) classes.push('bit-on');
      else classes.push('bit-off');

      if (isHighlighted) {
        classes.push(highlightClass || 'bit-active');
      }

      bitCell.className = classes.join(' ');
      bitCell.setAttribute('data-index', i);
      bitCell.setAttribute('title', `Bit #${i}: ${isSet ? '1 (SET)' : '0 (UNSET)'}`);
      bitCell.innerHTML = `<span class="bit-idx">${i}</span><span class="bit-val">${isSet ? '1' : '0'}</span>`;
      bitGrid.appendChild(bitCell);
    }
  }

  function updateMetrics() {
    const stats = filter.getStats();
    if (metricSize) metricSize.textContent = String(stats.size);
    if (metricHashes) metricHashes.textContent = String(stats.hashCount);
    if (metricItems) metricItems.textContent = String(stats.itemCount);
    if (metricSetBits) metricSetBits.textContent = `${stats.setBits} / ${stats.size}`;
    if (metricSaturation) metricSaturation.textContent = `${stats.capacitySaturation}%`;

    const fprPercent = (stats.falsePositiveRate * 100).toFixed(4);
    if (metricFpr) metricFpr.textContent = `${fprPercent}%`;

    if (saturationProgressBar) {
      saturationProgressBar.style.width = `${Math.min(100, stats.capacitySaturation)}%`;
    }
    if (fprProgressBar) {
      fprProgressBar.style.width = `${Math.min(100, stats.falsePositiveRate * 100)}%`;
    }
  }

  function updateCalculator() {
    if (!calcItemsInput || !calcFprInput) return;
    const items = Number(calcItemsInput.value) || 50;
    const targetFpr = Number(calcFprInput.value) || 0.01;
    const optimal = CybersecuritySentinelBloomFilter.calculateOptimalParams(items, targetFpr);

    if (calcOptimalBits) calcOptimalBits.textContent = `${optimal.size} bits (${Math.ceil(optimal.size / 8)} B)`;
    if (calcOptimalHashes) calcOptimalHashes.textContent = `${optimal.hashCount} hashes`;
  }

  function handleAdd(itemStr) {
    const val = itemStr || (itemInput ? itemInput.value.trim() : '');
    if (!val) {
      logAudit('Cannot insert empty item payload.', 'warning');
      return;
    }

    const res = filter.add(val);
    renderGrid(res.indices, 'bit-insert-pulse');
    updateMetrics();

    if (itemInput) itemInput.value = '';
    logAudit(`INGEST: Inserted "${val}" -> Bits [${res.indices.map(i => `#${i}`).join(', ')}] set to 1`, 'success');
  }

  function handleQuery() {
    if (!queryInput) return;
    const val = queryInput.value.trim();
    if (!val) {
      logAudit('Query payload empty.', 'warning');
      return;
    }

    const res = filter.query(val);
    renderGrid(res.indices, res.match ? 'bit-match-pulse' : 'bit-miss-pulse');

    if (queryResultBanner && queryResultText && queryResultIndices) {
      queryResultBanner.classList.remove('hidden', 'banner-present', 'banner-absent');
      if (res.match) {
        queryResultBanner.classList.add('banner-present');
        queryResultText.innerHTML = `<strong>PROBABLY PRESENT:</strong> "${val}" matches all hash indices. (Estimated FPR: ${(res.falsePositiveRate * 100).toFixed(3)}%)`;
      } else {
        queryResultBanner.classList.add('banner-absent');
        queryResultText.innerHTML = `<strong>DEFINITELY ABSENT:</strong> "${val}" has unset bits. (0% False Negative Guarantee)`;
      }
      queryResultIndices.textContent = `Queried Bit Indices: ${res.indices.map(i => `#${i} (${filter.bits[i] === 1 ? '1' : '0'})`).join(' ')}`;
    }

    logAudit(`QUERY: "${val}" -> Bits [${res.indices.map(i => `#${i}`).join(', ')}] -> ${res.match ? 'PROBABLY PRESENT' : 'DEFINITELY ABSENT'}`, res.match ? 'match' : 'absent');
  }

  // Event Listeners
  if (addBtn) {
    addBtn.addEventListener('click', () => handleAdd());
  }

  if (itemInput) {
    itemInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }

  if (queryBtn) {
    queryBtn.addEventListener('click', handleQuery);
  }

  if (queryInput) {
    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuery();
    });
  }

  if (batchAddBtn) {
    batchAddBtn.addEventListener('click', () => {
      const threats = [
        '192.168.1.105',
        '10.244.0.12',
        'CVE-2024-38077',
        'trojan.win32.agent',
        'c2-beacon.darknet.onion',
        'ransomware-wannacry.exe',
        'CVE-2026-9042',
        'apt29-cozybear.sig',
        'lateral-movement-smb',
        'powershell-encoded-eval'
      ];
      threats.forEach(t => filter.add(t));
      renderGrid();
      updateMetrics();
      logAudit(`BATCH INGEST: Added 10 cybersecurity threat indicators.`, 'success');
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      filter.clear();
      renderGrid();
      updateMetrics();
      if (queryResultBanner) queryResultBanner.classList.add('hidden');
      logAudit('FILTER RESET: Cleared all bits and counters.', 'info');
    });
  }

  if (filterSizeSelect) {
    filterSizeSelect.addEventListener('change', (e) => {
      const newSize = Number(e.target.value) || 128;
      filter.reconfigure(newSize, filter.hashCount);
      renderGrid();
      updateMetrics();
      logAudit(`RECONFIGURE: Filter resized to ${newSize} bits.`, 'info');
    });
  }

  if (hashCountSelect) {
    hashCountSelect.addEventListener('change', (e) => {
      const newK = Number(e.target.value) || 4;
      filter.reconfigure(filter.size, newK);
      renderGrid();
      updateMetrics();
      logAudit(`RECONFIGURE: Hash count set to ${newK}.`, 'info');
    });
  }

  presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = chip.getAttribute('data-value');
      if (val) {
        if (itemInput) itemInput.value = val;
        handleAdd(val);
      }
    });
  });

  if (calcItemsInput) calcItemsInput.addEventListener('input', updateCalculator);
  if (calcFprInput) calcFprInput.addEventListener('input', updateCalculator);

  // Initial render
  renderGrid();
  updateMetrics();
  updateCalculator();
  logAudit('Cybersecurity Sentinel Probabilistic Bloom Filter initialized. Ready.', 'info');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
