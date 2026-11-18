/**
 * Luxury Realms - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #644 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, keyword query search, compound tag matching,
 * and multi-attribute sorting for ultra-prime luxury estates, private islands, and historic chateaux.
 */

export class LuxuryRealmsFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'price';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample ultra-luxury architectural portfolio
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'estate-1',
        name: 'Villa Bellissima',
        location: 'Lake Como, Italy',
        category: 'Waterfront',
        price: 34500000,
        areaSqft: 14200,
        bedrooms: 8,
        rating: 4.95,
        tags: ['waterfront', 'private-dock', 'historic', 'wine-cellar', 'helipad'],
        status: 'Available'
      },
      {
        id: 'estate-2',
        name: 'The Crown Sky Penthouse',
        location: 'Billionaires Row, New York',
        category: 'Urban Penthouse',
        price: 58000000,
        areaSqft: 11500,
        bedrooms: 6,
        rating: 4.98,
        tags: ['helipad', 'infinity-pool', 'panoramic', 'smart-home'],
        status: 'Available'
      },
      {
        id: 'estate-3',
        name: 'Château de Lumière',
        location: 'Bordeaux, France',
        category: 'Historic',
        price: 22000000,
        areaSqft: 18500,
        bedrooms: 12,
        rating: 4.88,
        tags: ['historic', 'wine-cellar', 'equestrian', 'vineyard'],
        status: 'Private Listing'
      },
      {
        id: 'estate-4',
        name: 'Azure Horizon Sanctuary',
        location: 'Cap d’Antibes, French Riviera',
        category: 'Waterfront',
        price: 46000000,
        areaSqft: 12800,
        bedrooms: 7,
        rating: 4.92,
        tags: ['waterfront', 'infinity-pool', 'helipad', 'private-dock'],
        status: 'Available'
      },
      {
        id: 'estate-5',
        name: 'Matterhorn Alpine Chalet',
        location: 'Zermatt, Switzerland',
        category: 'Alpine',
        price: 18500000,
        areaSqft: 8200,
        bedrooms: 5,
        rating: 4.91,
        tags: ['ski-in-ski-out', 'spa', 'panoramic', 'wine-cellar'],
        status: 'Under Offer'
      },
      {
        id: 'estate-6',
        name: 'Palazzo Grand Canal',
        location: 'Venice, Italy',
        category: 'Historic',
        price: 29000000,
        areaSqft: 10400,
        bedrooms: 7,
        rating: 4.85,
        tags: ['waterfront', 'historic', 'private-dock', 'frescoes'],
        status: 'Available'
      },
      {
        id: 'estate-7',
        name: 'Kyoto Zen Pavilion',
        location: 'Kyoto, Japan',
        category: 'Historic',
        price: 15800000,
        areaSqft: 6500,
        bedrooms: 4,
        rating: 4.96,
        tags: ['historic', 'tea-house', 'zen-garden', 'spa'],
        status: 'Available'
      },
      {
        id: 'estate-8',
        name: 'Palm Jumeirah Royal Villa',
        location: 'Dubai, UAE',
        category: 'Waterfront',
        price: 52000000,
        areaSqft: 16000,
        bedrooms: 9,
        rating: 4.94,
        tags: ['waterfront', 'infinity-pool', 'private-beach', 'smart-home', 'helipad'],
        status: 'Available'
      }
    ];
  }

  /**
   * Sets search keyword
   * @param {string} query
   * @returns {LuxuryRealmsFilterEngine}
   */
  filterByKeyword(query) {
    this.searchQuery = typeof query === 'string' ? query.trim() : '';
    this._emit();
    return this;
  }

  /**
   * Toggles inclusion of a tag chip
   * @param {string} tag
   * @returns {LuxuryRealmsFilterEngine}
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
   * @returns {LuxuryRealmsFilterEngine}
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
   * @returns {LuxuryRealmsFilterEngine}
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
   * @returns {LuxuryRealmsFilterEngine}
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
   * @returns {LuxuryRealmsFilterEngine}
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
   * @returns {LuxuryRealmsFilterEngine}
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.rangeFilters = {};
    this.sortField = 'price';
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

    // 1. Keyword query filter across name, location, category
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item => {
        const nameMatch = item.name && item.name.toLowerCase().includes(q);
        const locMatch = item.location && item.location.toLowerCase().includes(q);
        const catMatch = item.category && item.category.toLowerCase().includes(q);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return Boolean(nameMatch || locMatch || catMatch || tagMatch);
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
        console.error('LuxuryRealmsFilterEngine listener error:', err);
      }
    }
  }
}
