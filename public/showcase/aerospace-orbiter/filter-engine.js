/**
 * Aerospace Orbiter - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #652 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, spacecraft keyword search,
 * orbital regime tag matching, and multi-attribute sorting for active satellites, space stations, and deep space probes.
 */

export class AerospaceOrbiterFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'altitudeKm';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample orbital catalog dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'craft-1',
        name: 'International Space Station (ISS)',
        noradId: 25544,
        orbitType: 'LEO',
        altitudeKm: 418.5,
        velocityKmS: 7.66,
        inclinationDeg: 51.64,
        massKg: 450000,
        status: 'Operational',
        tags: ['leo', 'space-station', 'crewed', 'scientific', 'international']
      },
      {
        id: 'craft-2',
        name: 'James Webb Space Telescope (JWST)',
        noradId: 50463,
        orbitType: 'Lagrange L2',
        altitudeKm: 1500000,
        velocityKmS: 0.22,
        inclinationDeg: 0.05,
        massKg: 6500,
        status: 'Operational',
        tags: ['lagrange', 'deep-space', 'observatory', 'infrared', 'scientific']
      },
      {
        id: 'craft-3',
        name: 'Hubble Space Telescope',
        noradId: 20580,
        orbitType: 'LEO',
        altitudeKm: 535.0,
        velocityKmS: 7.59,
        inclinationDeg: 28.47,
        massKg: 11110,
        status: 'Operational',
        tags: ['leo', 'observatory', 'optical', 'scientific']
      },
      {
        id: 'craft-4',
        name: 'Artemis Orion Spacecraft',
        noradId: 54256,
        orbitType: 'Lunar Orbit',
        altitudeKm: 384400,
        velocityKmS: 1.10,
        inclinationDeg: 12.30,
        massKg: 25850,
        status: 'In Transit',
        tags: ['lunar', 'crewed', 'exploration', 'deep-space']
      },
      {
        id: 'craft-5',
        name: 'Tiangong Space Station',
        noradId: 48274,
        orbitType: 'LEO',
        altitudeKm: 390.0,
        velocityKmS: 7.68,
        inclinationDeg: 41.47,
        massKg: 100000,
        status: 'Operational',
        tags: ['leo', 'space-station', 'crewed', 'scientific']
      },
      {
        id: 'craft-6',
        name: 'GOES-18 Weather Satellite',
        noradId: 51850,
        orbitType: 'GEO',
        altitudeKm: 35786,
        velocityKmS: 3.07,
        inclinationDeg: 0.08,
        massKg: 5192,
        status: 'Operational',
        tags: ['geo', 'meteorology', 'earth-observation']
      },
      {
        id: 'craft-7',
        name: 'Mars Reconnaissance Orbiter (MRO)',
        noradId: 28788,
        orbitType: 'Areocentric',
        altitudeKm: 250,
        velocityKmS: 3.42,
        inclinationDeg: 92.80,
        massKg: 2180,
        status: 'Operational',
        tags: ['mars', 'deep-space', 'planetary', 'telecom']
      },
      {
        id: 'craft-8',
        name: 'Starlink V2 Mini Relay',
        noradId: 56120,
        orbitType: 'LEO',
        altitudeKm: 550.0,
        velocityKmS: 7.58,
        inclinationDeg: 43.00,
        massKg: 800,
        status: 'Operational',
        tags: ['leo', 'telecom', 'broadband', 'constellation']
      }
    ];
  }

  /**
   * Sets search keyword
   * @param {string} query
   * @returns {AerospaceOrbiterFilterEngine}
   */
  filterByKeyword(query) {
    this.searchQuery = typeof query === 'string' ? query.trim() : '';
    this._emit();
    return this;
  }

  /**
   * Toggles inclusion of a tag chip
   * @param {string} tag
   * @returns {AerospaceOrbiterFilterEngine}
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
   * @returns {AerospaceOrbiterFilterEngine}
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
   * @returns {AerospaceOrbiterFilterEngine}
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
   * @returns {AerospaceOrbiterFilterEngine}
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
   * @returns {AerospaceOrbiterFilterEngine}
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
   * @returns {AerospaceOrbiterFilterEngine}
   */
  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.rangeFilters = {};
    this.sortField = 'altitudeKm';
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

    // 1. Keyword search across name, noradId, orbitType, tags
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item => {
        const nameMatch = item.name && item.name.toLowerCase().includes(q);
        const noradMatch = item.noradId && String(item.noradId).includes(q);
        const orbitMatch = item.orbitType && item.orbitType.toLowerCase().includes(q);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(q));
        return Boolean(nameMatch || noradMatch || orbitMatch || tagMatch);
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
        console.error('AerospaceOrbiterFilterEngine listener error:', err);
      }
    }
  }
}
