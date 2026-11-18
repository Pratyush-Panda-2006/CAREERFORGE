/**
 * Automotive Hypercar - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #632 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, keyword search, compound tag matching,
 * and multi-attribute sorting for elite hypercars and prototype vehicles.
 */

export class AutomotiveHypercarFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'horsepower';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample hypercar dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'hc-1',
        name: 'Apex Valkyrie AMR Pro',
        brand: 'Aston Martin',
        horsepower: 1160,
        topSpeed: 402,
        zeroToSixty: 2.5,
        drivetrain: 'Hybrid AWD',
        tags: ['v12', 'hybrid', 'track', 'aero'],
        price: 3200000,
        status: 'Production'
      },
      {
        id: 'hc-2',
        name: 'Jesko Absolut',
        brand: 'Koenigsegg',
        horsepower: 1600,
        topSpeed: 531,
        zeroToSixty: 2.4,
        drivetrain: 'RWD Twin-Turbo',
        tags: ['v8', 'twin-turbo', 'high-speed', 'carbon'],
        price: 3400000,
        status: 'Delivering'
      },
      {
        id: 'hc-3',
        name: 'Nevera Time Attack',
        brand: 'Rimac',
        horsepower: 1914,
        topSpeed: 412,
        zeroToSixty: 1.74,
        drivetrain: 'Quad-Motor EV',
        tags: ['electric', 'ev', 'torque-vectoring', 'all-wheel-drive'],
        price: 2400000,
        status: 'Production'
      },
      {
        id: 'hc-4',
        name: 'Chiron Super Sport 300+',
        brand: 'Bugatti',
        horsepower: 1578,
        topSpeed: 490,
        zeroToSixty: 2.3,
        drivetrain: 'Quad-Turbo W16 AWD',
        tags: ['w16', 'quad-turbo', 'luxury', 'record-breaker'],
        price: 3900000,
        status: 'Delivering'
      },
      {
        id: 'hc-5',
        name: 'Solus GT Monoposto',
        brand: 'McLaren',
        horsepower: 829,
        topSpeed: 322,
        zeroToSixty: 2.5,
        drivetrain: 'Naturally Aspirated V10 RWD',
        tags: ['v10', 'track-only', 'lightweight', 'downforce'],
        price: 4000000,
        status: 'Delivered'
      },
      {
        id: 'hc-6',
        name: 'Utopia Roadster',
        brand: 'Pagani',
        horsepower: 852,
        topSpeed: 354,
        zeroToSixty: 2.8,
        drivetrain: 'Twin-Turbo V12 Manual',
        tags: ['v12', 'twin-turbo', 'artisan', 'manual'],
        price: 3800000,
        status: 'Production'
      }
    ];
  }

  /**
   * Updates keyword search query
   * @param {string} query
   * @returns {Array<object>} filtered items
   */
  filterByKeyword(query) {
    this.searchQuery = typeof query === 'string' ? query.trim().toLowerCase() : '';
    this._emit();
    return this.apply();
  }

  /**
   * Toggles a tag filter on or off
   * @param {string} tag
   * @returns {boolean} tag active status
   */
  toggleTag(tag) {
    if (!tag) return false;
    const normalized = tag.toLowerCase().trim();
    if (this.selectedTags.has(normalized)) {
      this.selectedTags.delete(normalized);
      this._emit();
      return false;
    } else {
      this.selectedTags.add(normalized);
      this._emit();
      return true;
    }
  }

  /**
   * Explicitly sets tag active state
   * @param {string} tag
   * @param {boolean} active
   */
  setTag(tag, active) {
    if (!tag) return;
    const normalized = tag.toLowerCase().trim();
    if (active) {
      this.selectedTags.add(normalized);
    } else {
      this.selectedTags.delete(normalized);
    }
    this._emit();
  }

  /**
   * Clears all active tag filters
   */
  clearTags() {
    this.selectedTags.clear();
    this._emit();
  }

  /**
   * Sets sorting column and order direction
   * @param {string} field
   * @param {'asc'|'desc'} [direction='asc']
   * @returns {Array<object>}
   */
  sort(field, direction = 'asc') {
    if (field) {
      this.sortField = field;
    }
    if (direction === 'asc' || direction === 'desc') {
      this.sortDirection = direction;
    }
    this._emit();
    return this.apply();
  }

  /**
   * Sets a numeric min/max range filter for a given property
   * @param {string} field
   * @param {number|null} min
   * @param {number|null} max
   */
  setRange(field, min = null, max = null) {
    if (min === null && max === null) {
      delete this.rangeFilters[field];
    } else {
      this.rangeFilters[field] = { min, max };
    }
    this._emit();
  }

  /**
   * Resets all search parameters, active tags, and filters
   */
  reset() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.rangeFilters = {};
    this.sortField = 'horsepower';
    this.sortDirection = 'desc';
    this._emit();
    return this.apply();
  }

  /**
   * Executes filtering, keyword query search, range bounds, and sorting
   * @returns {Array<object>}
   */
  apply() {
    let result = this.sourceData.filter(item => {
      // 1. Keyword search across name, brand, drivetrain, and tags
      if (this.searchQuery) {
        const nameMatch = item.name && item.name.toLowerCase().includes(this.searchQuery);
        const brandMatch = item.brand && item.brand.toLowerCase().includes(this.searchQuery);
        const driveMatch = item.drivetrain && item.drivetrain.toLowerCase().includes(this.searchQuery);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.searchQuery));
        if (!nameMatch && !brandMatch && !driveMatch && !tagMatch) {
          return false;
        }
      }

      // 2. Selected compound tag filter matching
      if (this.selectedTags.size > 0) {
        const itemTags = Array.isArray(item.tags) ? item.tags.map(t => t.toLowerCase()) : [];
        for (const requiredTag of this.selectedTags) {
          if (!itemTags.includes(requiredTag)) {
            return false;
          }
        }
      }

      // 3. Range filters
      for (const [field, bounds] of Object.entries(this.rangeFilters)) {
        const val = item[field];
        if (typeof val === 'number') {
          if (bounds.min !== null && val < bounds.min) return false;
          if (bounds.max !== null && val > bounds.max) return false;
        }
      }

      return true;
    });

    // 4. Sorting
    result.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }

  /**
   * Returns list of currently active filter tags
   * @returns {Array<string>}
   */
  getActiveTags() {
    return Array.from(this.selectedTags);
  }

  /**
   * Returns current full source dataset
   * @returns {Array<object>}
   */
  getDataset() {
    return [...this.sourceData];
  }

  /**
   * Subscribes to filter engine state updates
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.add(callback);
    }
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifies subscribers of changes
   * @private
   */
  _emit() {
    const state = {
      query: this.searchQuery,
      tags: this.getActiveTags(),
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      count: this.apply().length
    };
    this.listeners.forEach(cb => {
      try {
        cb(state);
      } catch (err) {
        console.error('FilterEngine listener error:', err);
      }
    });
  }
}

// Browser UI bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AutomotiveHypercarFilterEngine();

    const searchInput = document.getElementById('hypercarSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const tagChips = document.querySelectorAll('.filter-chip');
    const resultsContainer = document.getElementById('hypercarResultsGrid');
    const resultCountEl = document.getElementById('resultCount');
    const emptyStateEl = document.getElementById('emptyStateAlert');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    function renderCards(items) {
      if (!resultsContainer) return;
      resultsContainer.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        if (resultCountEl) resultCountEl.textContent = '0 models found';
        return;
      }

      if (emptyStateEl) emptyStateEl.classList.add('hidden');
      if (resultCountEl) resultCountEl.textContent = `${items.length} hypercars matching criteria`;

      items.forEach(car => {
        const card = document.createElement('article');
        card.className = 'hypercar-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="car-brand">${car.brand}</span>
            <span class="car-status ${car.status.toLowerCase()}">${car.status}</span>
          </div>
          <h3 class="car-name">${car.name}</h3>
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Power</span>
              <span class="spec-val">${car.horsepower.toLocaleString()} HP</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Top Speed</span>
              <span class="spec-val">${car.topSpeed} km/h</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">0-100 km/h</span>
              <span class="spec-val">${car.zeroToSixty}s</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Est. Price</span>
              <span class="spec-val">$${(car.price / 1000000).toFixed(1)}M</span>
            </div>
          </div>
          <div class="card-tags">
            ${car.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
          </div>
        `;
        resultsContainer.appendChild(card);
      });
    }

    function update() {
      const filtered = engine.apply();
      renderCards(filtered);
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        engine.filterByKeyword(e.target.value);
        update();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        engine.filterByKeyword('');
        update();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, direction] = e.target.value.split('-');
        engine.sort(field, direction);
        update();
      });
    }

    tagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const active = engine.toggleTag(tag);
        chip.classList.toggle('active', active);
        update();
      });
    });

    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        engine.reset();
        if (searchInput) searchInput.value = '';
        tagChips.forEach(c => c.classList.remove('active'));
        if (sortSelect) sortSelect.value = 'horsepower-desc';
        update();
      });
    }

    update();
  });
}
