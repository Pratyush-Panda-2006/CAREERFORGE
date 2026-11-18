/**
 * Real Estate Luxe - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #600 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering and multi-attribute sorting for luxury real estate properties,
 * architectural villas, penthouses, and waterfront estates with zero latency.
 */

export class RealEstateLuxeFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.sortField='title']
   * @param {string} [options.sortDirection='asc']
   */
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : this._getDefaultDataset();
    this.data = [...this.initialData];
    this.keyword = '';
    this.selectedTags = new Set();
    this.sortField = options.sortField || 'title';
    this.sortDirection = options.sortDirection || 'asc';
  }

  /**
   * Default luxury estate catalog
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'EST-101',
        title: 'The Bel-Air Promontory',
        location: 'Bel Air, California',
        propertyType: 'Modern Villa',
        price: 42500000,
        bedrooms: 7,
        bathrooms: 9,
        sqft: 14200,
        rating: 4.95,
        tags: ['pool', 'helipad', 'ocean-view']
      },
      {
        id: 'EST-102',
        title: 'Tribeca Sky Penthouse',
        location: 'New York, NY',
        propertyType: 'Penthouse',
        price: 28000000,
        bedrooms: 4,
        bathrooms: 5,
        sqft: 6800,
        rating: 4.88,
        tags: ['skyline', 'terrace', 'elevator']
      },
      {
        id: 'EST-103',
        title: 'St. Moritz Alpine Chalet',
        location: 'St. Moritz, Switzerland',
        propertyType: 'Chalet',
        price: 35000000,
        bedrooms: 6,
        bathrooms: 7,
        sqft: 9500,
        rating: 4.92,
        tags: ['ski-in', 'mountain-view', 'spa']
      },
      {
        id: 'EST-104',
        title: 'Villa d\'Azur Waterfront',
        location: 'Cap d\'Antibes, France',
        propertyType: 'Waterfront Estate',
        price: 54000000,
        bedrooms: 8,
        bathrooms: 10,
        sqft: 16000,
        rating: 4.98,
        tags: ['ocean-view', 'private-dock', 'pool']
      },
      {
        id: 'EST-105',
        title: 'Palm Jumeirah Signature Villa',
        location: 'Dubai, UAE',
        propertyType: 'Beachfront Villa',
        price: 39000000,
        bedrooms: 6,
        bathrooms: 7,
        sqft: 11000,
        rating: 4.85,
        tags: ['beachfront', 'pool', 'private-dock']
      },
      {
        id: 'EST-106',
        title: 'Kyoto Zen Architectural Sanctuary',
        location: 'Kyoto, Japan',
        propertyType: 'Historic Estate',
        price: 19500000,
        bedrooms: 5,
        bathrooms: 5,
        sqft: 7200,
        rating: 4.90,
        tags: ['garden', 'spa', 'historic']
      }
    ];
  }

  /**
   * Sets new raw dataset
   * @param {Array<object>} newData
   * @returns {Array<object>}
   */
  setData(newData) {
    if (!Array.isArray(newData)) return [];
    this.initialData = [...newData];
    this.data = [...this.initialData];
    return this.apply();
  }

  /**
   * Updates search query string
   * @param {string} query
   * @returns {Array<object>}
   */
  filterByKeyword(query) {
    this.keyword = typeof query === 'string' ? query.trim().toLowerCase() : '';
    return this.apply();
  }

  /**
   * Toggles active state of tag chip
   * @param {string} tag
   * @returns {Array<object>}
   */
  toggleTag(tag) {
    if (!tag || typeof tag !== 'string') return this.apply();
    const normalized = tag.trim().toLowerCase();
    if (this.selectedTags.has(normalized)) {
      this.selectedTags.delete(normalized);
    } else {
      this.selectedTags.add(normalized);
    }
    return this.apply();
  }

  /**
   * Directly sets active tag filters
   * @param {Array<string>} tags
   * @returns {Array<object>}
   */
  setTags(tags) {
    this.selectedTags.clear();
    if (Array.isArray(tags)) {
      tags.forEach(t => {
        if (typeof t === 'string' && t.trim() !== '') {
          this.selectedTags.add(t.trim().toLowerCase());
        }
      });
    }
    return this.apply();
  }

  /**
   * Clears all active tag filters
   * @returns {Array<object>}
   */
  clearTags() {
    this.selectedTags.clear();
    return this.apply();
  }

  /**
   * Sets sorting field and direction
   * @param {string} field
   * @param {string} [direction='asc']
   * @returns {Array<object>}
   */
  sort(field, direction = 'asc') {
    if (typeof field === 'string' && field.trim() !== '') {
      this.sortField = field.trim();
    }
    this.sortDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this.apply();
  }

  /**
   * Executes compound filtering and sorting against the dataset
   * @returns {Array<object>}
   */
  apply() {
    let result = [...this.initialData];

    // 1. Keyword search (title, location, propertyType, tags)
    if (this.keyword) {
      result = result.filter(item => {
        const titleMatch = item.title && item.title.toLowerCase().includes(this.keyword);
        const locMatch = item.location && item.location.toLowerCase().includes(this.keyword);
        const typeMatch = item.propertyType && item.propertyType.toLowerCase().includes(this.keyword);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.keyword));
        return titleMatch || locMatch || typeMatch || tagMatch;
      });
    }

    // 2. Compound tag matching (AND semantics)
    if (this.selectedTags.size > 0) {
      result = result.filter(item => {
        if (!Array.isArray(item.tags)) return false;
        const itemTags = item.tags.map(t => t.toLowerCase());
        for (const reqTag of this.selectedTags) {
          if (!itemTags.includes(reqTag)) {
            return false;
          }
        }
        return true;
      });
    }

    // 3. Multi-field sorting
    result.sort((a, b) => {
      let valA = a[this.sortField];
      let valB = b[this.sortField];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    this.data = result;
    return result;
  }

  /**
   * Returns a sliced pagination window
   * @param {number} [page=1]
   * @param {number} [pageSize=10]
   * @returns {{ items: Array<object>, total: number, page: number, totalPages: number }}
   */
  paginate(page = 1, pageSize = 10) {
    const total = this.data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    const start = (currentPage - 1) * pageSize;
    const items = this.data.slice(start, start + pageSize);

    return {
      items,
      total,
      page: currentPage,
      totalPages
    };
  }

  /**
   * Resets all search filters and sorting back to original state
   * @returns {Array<object>}
   */
  reset() {
    this.keyword = '';
    this.selectedTags.clear();
    this.sortField = 'title';
    this.sortDirection = 'asc';
    return this.apply();
  }

  /**
   * Extracts distinct tags with frequency metrics
   * @returns {Array<{ tag: string, count: number }>}
   */
  getAllTags() {
    const frequency = {};
    this.initialData.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach(t => {
          const norm = t.toLowerCase();
          frequency[norm] = (frequency[norm] || 0) + 1;
        });
      }
    });

    return Object.entries(frequency)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /**
   * Returns current filter criteria snapshot
   * @returns {{ keyword: string, tags: Array<string>, sortField: string, sortDirection: string }}
   */
  getActiveFilters() {
    return {
      keyword: this.keyword,
      tags: Array.from(this.selectedTags),
      sortField: this.sortField,
      sortDirection: this.sortDirection
    };
  }
}

// Browser Interactive UI wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new RealEstateLuxeFilterEngine();

    const searchInput = document.getElementById('luxeSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortSelect = document.getElementById('luxeSortSelect');
    const tagContainer = document.getElementById('luxeTagChips');
    const cardsContainer = document.getElementById('luxeEstateCards');
    const emptyState = document.getElementById('luxeEmptyState');
    const countBadge = document.getElementById('luxeResultsCount');

    function renderTags() {
      if (!tagContainer) return;
      tagContainer.innerHTML = '';
      const tags = engine.getAllTags();
      const activeTags = new Set(engine.getActiveFilters().tags);

      tags.forEach(({ tag, count }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `luxe-tag-chip ${activeTags.has(tag) ? 'active' : ''}`;
        chip.innerHTML = `${tag} <span class="tag-count">(${count})</span>`;
        chip.addEventListener('click', () => {
          engine.toggleTag(tag);
          updateView();
        });
        tagContainer.appendChild(chip);
      });
    }

    function renderCards(estates) {
      if (!cardsContainer) return;
      cardsContainer.innerHTML = '';

      if (estates.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      estates.forEach(item => {
        const card = document.createElement('div');
        card.className = 'luxe-estate-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="estate-type">${item.propertyType}</span>
            <span class="estate-price">\$${(item.price / 1000000).toFixed(1)}M</span>
          </div>
          <h3 class="estate-title">${item.title}</h3>
          <p class="estate-location">${item.location}</p>
          <div class="estate-specs">
            <span>${item.bedrooms} Beds</span>
            <span>•</span>
            <span>${item.bathrooms} Baths</span>
            <span>•</span>
            <span>${item.sqft.toLocaleString()} sq ft</span>
          </div>
          <div class="estate-tags">
            ${(item.tags || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }

    function updateView() {
      const results = engine.apply();
      if (countBadge) countBadge.textContent = `${results.length} Estates`;
      renderTags();
      renderCards(results);
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        engine.filterByKeyword(e.target.value);
        if (clearSearchBtn) {
          clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
        }
        updateView();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          engine.filterByKeyword('');
          updateView();
        }
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        const [field, dir] = sortSelect.value.split(':');
        engine.sort(field, dir);
        updateView();
      });
    }

    updateView();
  });
}
