/**
 * Crypto Exchange Pro - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #648 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, ticker keyword search,
 * compound category/tag matching, and multi-attribute sorting for spot & futures crypto markets.
 */

export class CryptoExchangeProFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'volume24h';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample crypto market ticker pairs
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'pair-1',
        symbol: 'BTC/USDT',
        base: 'BTC',
        name: 'Bitcoin',
        quote: 'USDT',
        category: 'Layer-1',
        lastPrice: 91450.25,
        change24h: 3.45,
        volume24h: 4280000000,
        fundingRate: 0.0125,
        tags: ['l1', 'pow', 'store-of-value', 'top-10', 'high-liquidity']
      },
      {
        id: 'pair-2',
        symbol: 'ETH/USDT',
        base: 'ETH',
        name: 'Ethereum',
        quote: 'USDT',
        category: 'Layer-1',
        lastPrice: 3420.80,
        change24h: 5.12,
        volume24h: 2150000000,
        fundingRate: 0.0098,
        tags: ['l1', 'pos', 'smart-contracts', 'top-10', 'high-liquidity']
      },
      {
        id: 'pair-3',
        symbol: 'SOL/USDT',
        base: 'SOL',
        name: 'Solana',
        quote: 'USDT',
        category: 'Layer-1',
        lastPrice: 198.40,
        change24h: -1.82,
        volume24h: 1840000000,
        fundingRate: 0.0150,
        tags: ['l1', 'high-tps', 'top-10', 'defi']
      },
      {
        id: 'pair-4',
        symbol: 'LINK/USDT',
        base: 'LINK',
        name: 'Chainlink',
        quote: 'USDT',
        category: 'DeFi',
        lastPrice: 18.65,
        change24h: 8.75,
        volume24h: 620000000,
        fundingRate: 0.0075,
        tags: ['oracle', 'defi', 'infrastructure', 'top-20']
      },
      {
        id: 'pair-5',
        symbol: 'RENDER/USDT',
        base: 'RENDER',
        name: 'Render Network',
        quote: 'USDT',
        category: 'AI & Depin',
        lastPrice: 9.85,
        change24h: 12.40,
        volume24h: 490000000,
        fundingRate: 0.0210,
        tags: ['ai', 'depin', 'gpu-compute', 'top-50']
      },
      {
        id: 'pair-6',
        symbol: 'ARB/USDT',
        base: 'ARB',
        name: 'Arbitrum',
        quote: 'USDT',
        category: 'Layer-2',
        lastPrice: 1.15,
        change24h: -3.20,
        volume24h: 310000000,
        fundingRate: 0.0055,
        tags: ['layer-2', 'rollup', 'ethereum-scaling', 'defi']
      },
      {
        id: 'pair-7',
        symbol: 'AAVE/USDT',
        base: 'AAVE',
        name: 'Aave Protocol',
        quote: 'USDT',
        category: 'DeFi',
        lastPrice: 165.20,
        change24h: 4.30,
        volume24h: 275000000,
        fundingRate: 0.0080,
        tags: ['defi', 'lending', 'top-50', 'governance']
      },
      {
        id: 'pair-8',
        symbol: 'AVAX/USDT',
        base: 'AVAX',
        name: 'Avalanche',
        quote: 'USDT',
        category: 'Layer-1',
        lastPrice: 38.75,
        change24h: 2.15,
        volume24h: 530000000,
        fundingRate: 0.0110,
        tags: ['l1', 'subnets', 'top-20', 'defi']
      }
    ];
  }

  /**
   * Sets search keyword
   * @param {string} query
   * @returns {CryptoExchangeProFilterEngine}
   */
  filterByKeyword(query) {
    this.searchQuery = typeof query === 'string' ? query.trim() : '';
    this._emit();
    return this;
  }

  /**
   * Toggles inclusion of a tag chip
   * @param {string} tag
   * @returns {CryptoExchangeProFilterEngine}
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
   * @returns {CryptoExchangeProFilterEngine}
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
   * @returns {CryptoExchangeProFilterEngine}
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
   * @returns {CryptoExchangeProFilterEngine}
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
   * @returns {CryptoExchangeProFilterEngine}
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
   * @returns {CryptoExchangeProFilterEngine}
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.rangeFilters = {};
    this.sortField = 'volume24h';
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

    // 1. Keyword search across symbol, base, name, category, and tags
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item => {
        const symMatch = item.symbol && item.symbol.toLowerCase().includes(q);
        const baseMatch = item.base && item.base.toLowerCase().includes(q);
        const nameMatch = item.name && item.name.toLowerCase().includes(q);
        const catMatch = item.category && item.category.toLowerCase().includes(q);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return Boolean(symMatch || baseMatch || nameMatch || catMatch || tagMatch);
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
        console.error('CryptoExchangeProFilterEngine listener error:', err);
      }
    }
  }
}
