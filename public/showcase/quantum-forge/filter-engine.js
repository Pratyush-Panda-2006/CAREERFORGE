/**
 * Quantum Forge - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #656 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, algorithm keyword search,
 * quantum complexity tag matching, and multi-attribute sorting for circuits, ansatz templates, and fault-tolerant benchmarks.
 */

export class QuantumForgeFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'qubitCount';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample quantum algorithm and circuit catalog
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'circuit-1',
        name: 'VQE Molecular Ground State',
        category: 'Quantum Chemistry',
        qubitCount: 16,
        circuitDepth: 64,
        gateCount: 240,
        fidelityEstimate: 0.982,
        status: 'Hardware-Ready',
        tags: ['nisq', 'variational', 'chemistry', 'vqe', 'ansatz']
      },
      {
        id: 'circuit-2',
        name: 'Grover Unstructured Database Search',
        category: 'Search & Amplitude',
        qubitCount: 10,
        circuitDepth: 42,
        gateCount: 156,
        fidelityEstimate: 0.991,
        status: 'Verified',
        tags: ['foundational', 'oracle', 'amplitude-amplification', 'search']
      },
      {
        id: 'circuit-3',
        name: 'QAOA MaxCut Graph Partitioning',
        category: 'Combinatorial Optimization',
        qubitCount: 20,
        circuitDepth: 96,
        gateCount: 380,
        fidelityEstimate: 0.974,
        status: 'Experimental',
        tags: ['nisq', 'qaoa', 'optimization', 'graph-theory']
      },
      {
        id: 'circuit-4',
        name: 'Quantum Fourier Transform (QFT)',
        category: 'Foundational Matrix',
        qubitCount: 8,
        circuitDepth: 28,
        gateCount: 78,
        fidelityEstimate: 0.995,
        status: 'Verified',
        tags: ['foundational', 'fourier', 'phase-estimation', 'math']
      },
      {
        id: 'circuit-5',
        name: 'Surface Code Distance-5 Syndrome Extraction',
        category: 'Fault-Tolerance',
        qubitCount: 49,
        circuitDepth: 128,
        gateCount: 720,
        fidelityEstimate: 0.965,
        status: 'Experimental',
        tags: ['fault-tolerant', 'error-correction', 'surface-code', 'stabilizer']
      },
      {
        id: 'circuit-6',
        name: 'Quantum Phase Estimation (QPE)',
        category: 'Eigenvalue Solver',
        qubitCount: 12,
        circuitDepth: 56,
        gateCount: 210,
        fidelityEstimate: 0.988,
        status: 'Hardware-Ready',
        tags: ['eigenvalues', 'hamiltonian', 'phase-estimation', 'foundational']
      },
      {
        id: 'circuit-7',
        name: 'Shor RSA-2048 Period Finding Core',
        category: 'Cryptanalysis',
        qubitCount: 64,
        circuitDepth: 512,
        gateCount: 3200,
        fidelityEstimate: 0.920,
        status: 'Theoretical',
        tags: ['cryptography', 'factoring', 'fault-tolerant', 'modular-arithmetic']
      },
      {
        id: 'circuit-8',
        name: 'Bernstein-Vazirani Parity Solver',
        category: 'Oracle Verification',
        qubitCount: 6,
        circuitDepth: 14,
        gateCount: 28,
        fidelityEstimate: 0.998,
        status: 'Verified',
        tags: ['foundational', 'oracle', 'deterministic', 'benchmarking']
      }
    ];
  }

  /**
   * Sets search keyword
   * @param {string} query
   * @returns {QuantumForgeFilterEngine}
   */
  filterByKeyword(query) {
    this.searchQuery = typeof query === 'string' ? query.trim() : '';
    this._emit();
    return this;
  }

  /**
   * Toggles inclusion of a tag chip
   * @param {string} tag
   * @returns {QuantumForgeFilterEngine}
   */
  toggleTag(tag) {
    if (typeof tag !== 'string' || !tag.trim()) return this;
    const cleanTag = tag.trim().toLowerCase();
    if (this.selectedTags.has(cleanTag)) {
      this.selectedTags.delete(cleanTag);
    } else {
      this.selectedTags.add(cleanTag);
    }
    this._emit();
    return this;
  }

  /**
   * Sets an explicit list of selected tags
   * @param {Array<string>} tags
   * @returns {QuantumForgeFilterEngine}
   */
  setTags(tags) {
    this.selectedTags = new Set(
      (Array.isArray(tags) ? tags : [])
        .map(t => String(t).trim().toLowerCase())
        .filter(Boolean)
    );
    this._emit();
    return this;
  }

  /**
   * Clears all selected tags
   * @returns {QuantumForgeFilterEngine}
   */
  clearTags() {
    this.selectedTags.clear();
    this._emit();
    return this;
  }

  /**
   * Configures sorting criteria
   * @param {string} field
   * @param {'asc'|'desc'} [direction='asc']
   * @returns {QuantumForgeFilterEngine}
   */
  sort(field, direction = 'asc') {
    if (typeof field === 'string' && field.trim()) {
      this.sortField = field.trim();
    }
    const dir = String(direction).toLowerCase();
    this.sortDirection = dir === 'desc' ? 'desc' : 'asc';
    this._emit();
    return this;
  }

  /**
   * Sets numeric range boundary
   * @param {string} field
   * @param {number|null} min
   * @param {number|null} max
   * @returns {QuantumForgeFilterEngine}
   */
  setRangeFilter(field, min, max) {
    if (!field) return this;
    this.rangeFilters[field] = {
      min: typeof min === 'number' && !isNaN(min) ? min : null,
      max: typeof max === 'number' && !isNaN(max) ? max : null
    };
    this._emit();
    return this;
  }

  /**
   * Resets all search, tags, and range filters
   * @returns {QuantumForgeFilterEngine}
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.rangeFilters = {};
    this.sortField = 'qubitCount';
    this.sortDirection = 'desc';
    this._emit();
    return this;
  }

  /**
   * Executes the filtering and sorting pipeline
   * @returns {Array<object>}
   */
  execute() {
    let result = [...this.sourceData];

    // 1. Keyword search across name, category, status, and tags
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item => {
        const nameMatch = item.name && item.name.toLowerCase().includes(q);
        const catMatch = item.category && item.category.toLowerCase().includes(q);
        const statMatch = item.status && item.status.toLowerCase().includes(q);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return Boolean(nameMatch || catMatch || statMatch || tagMatch);
      });
    }

    // 2. Compound tag chip filtering (match all selected tags)
    if (this.selectedTags.size > 0) {
      result = result.filter(item => {
        if (!Array.isArray(item.tags)) return false;
        const itemTags = item.tags.map(t => t.toLowerCase());
        for (const tag of this.selectedTags) {
          if (!itemTags.includes(tag)) {
            return false;
          }
        }
        return true;
      });
    }

    // 3. Numeric range filters
    for (const [field, bounds] of Object.entries(this.rangeFilters)) {
      if (bounds.min !== null) {
        result = result.filter(item => typeof item[field] === 'number' && item[field] >= bounds.min);
      }
      if (bounds.max !== null) {
        result = result.filter(item => typeof item[field] === 'number' && item[field] <= bounds.max);
      }
    }

    // 4. Multi-attribute sorting
    const field = this.sortField;
    const isAsc = this.sortDirection === 'asc';

    result.sort((a, b) => {
      const valA = a[field];
      const valB = b[field];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return isAsc ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      const cmp = strA.localeCompare(strB);
      return isAsc ? cmp : -cmp;
    });

    return result;
  }

  /**
   * Retrieves all unique tags available across dataset
   * @returns {Array<string>}
   */
  getAvailableTags() {
    const tagSet = new Set();
    for (const item of this.sourceData) {
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          tagSet.add(tag.toLowerCase());
        }
      }
    }
    return Array.from(tagSet).sort();
  }

  /**
   * Subscribes to filter state changes
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback !== 'function') throw new Error('Callback must be a function');
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Internal notifier
   * @private
   */
  _emit() {
    const results = this.execute();
    for (const fn of this.listeners) {
      try {
        fn(results, {
          searchQuery: this.searchQuery,
          selectedTags: Array.from(this.selectedTags),
          sortField: this.sortField,
          sortDirection: this.sortDirection
        });
      } catch (err) {
        console.error('QuantumForgeFilterEngine listener error:', err);
      }
    }
  }
}
