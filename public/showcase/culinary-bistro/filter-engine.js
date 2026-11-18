/**
 * Culinary Bistro - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #596 - Level 3 Core Feature
 *
 * Implements high-performance in-memory culinary menu search, dietary tag filtering,
 * and multi-attribute sorting engine with zero latency.
 */

export class CulinaryBistroFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.data]
   * @param {string} [options.keyword='']
   * @param {Array<string>} [options.tags=[]]
   * @param {string} [options.sortField='title']
   * @param {string} [options.sortDirection='asc']
   * @param {Function} [options.onUpdate]
   */
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : this._getDefaultData();
    this.keyword = options.keyword || '';
    this.selectedTags = new Set(options.tags || []);
    this.sortField = options.sortField || 'title';
    this.sortDirection = options.sortDirection || 'asc';
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
  }

  /**
   * Default sample culinary menu and sommelier cellar dataset
   * @returns {Array<object>}
   */
  _getDefaultData() {
    return [
      {
        id: 'menu-01',
        title: 'Truffle Glazed Wagyu Ribeye',
        category: 'Main Course',
        course: 'Entree',
        price: 68.0,
        prepTime: 25,
        rating: 4.9,
        tags: ['wagyu', 'gluten-free', 'chef-special', 'beef'],
        origin: 'Kobe, Japan'
      },
      {
        id: 'menu-02',
        title: 'Wild Morel Mushroom Risotto',
        category: 'Vegetarian',
        course: 'Entree',
        price: 34.0,
        prepTime: 20,
        rating: 4.8,
        tags: ['vegetarian', 'truffle', 'organic', 'risotto'],
        origin: 'Piedmont, Italy'
      },
      {
        id: 'menu-03',
        title: 'Pan-Seared Hokkaido Scallops',
        category: 'Seafood',
        course: 'Appetizer',
        price: 28.5,
        prepTime: 15,
        rating: 4.7,
        tags: ['seafood', 'gluten-free', 'appetizer', 'scallops'],
        origin: 'Hokkaido, Japan'
      },
      {
        id: 'menu-04',
        title: 'Heirloom Burrata & Peach Caprese',
        category: 'Salad & Starters',
        course: 'Appetizer',
        price: 22.0,
        prepTime: 10,
        rating: 4.6,
        tags: ['vegetarian', 'cheese', 'seasonal', 'organic'],
        origin: 'Puglia, Italy'
      },
      {
        id: 'menu-05',
        title: 'Valrhona Dark Chocolate Soufflé',
        category: 'Dessert',
        course: 'Dessert',
        price: 19.5,
        prepTime: 18,
        rating: 4.9,
        tags: ['dessert', 'chocolate', 'signature', 'sweet'],
        origin: 'Lyon, France'
      },
      {
        id: 'menu-06',
        title: 'Vintage Reserve Barolo 2018',
        category: 'Sommelier Cellar',
        course: 'Wine',
        price: 145.0,
        prepTime: 5,
        rating: 5.0,
        tags: ['wine', 'cellar', 'vintage', 'sommelier'],
        origin: 'Barolo, Italy'
      }
    ];
  }

  /**
   * Overwrites dataset
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    this.initialData = Array.isArray(data) ? [...data] : [];
    return this.apply();
  }

  /**
   * Retrieves original dataset
   * @returns {Array<object>}
   */
  getData() {
    return [...this.initialData];
  }

  /**
   * Filters menu by query string
   * @param {string} query
   * @returns {Array<object>}
   */
  filterByKeyword(query) {
    this.keyword = (query || '').trim().toLowerCase();
    return this.apply();
  }

  /**
   * Toggles a tag in the filter selection
   * @param {string} tag
   * @returns {Array<object>}
   */
  toggleTag(tag) {
    if (!tag) return this.apply();
    const normalized = String(tag).trim();
    if (this.selectedTags.has(normalized)) {
      this.selectedTags.delete(normalized);
    } else {
      this.selectedTags.add(normalized);
    }
    return this.apply();
  }

  /**
   * Sets tags directly
   * @param {Array<string>} tags
   * @returns {Array<object>}
   */
  setTags(tags) {
    this.selectedTags = new Set(Array.isArray(tags) ? tags.map(t => String(t).trim()) : []);
    return this.apply();
  }

  /**
   * Clears all selected tags
   * @returns {Array<object>}
   */
  clearTags() {
    this.selectedTags.clear();
    return this.apply();
  }

  /**
   * Updates sort criteria and direction
   * @param {string} field
   * @param {string} [direction='asc']
   * @returns {Array<object>}
   */
  sort(field, direction = 'asc') {
    this.sortField = field || 'title';
    this.sortDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this.apply();
  }

  /**
   * Returns current active filters
   * @returns {object}
   */
  getActiveFilters() {
    return {
      keyword: this.keyword,
      tags: Array.from(this.selectedTags),
      sortField: this.sortField,
      sortDirection: this.sortDirection
    };
  }

  /**
   * Returns all unique tags present across menu items
   * @returns {Array<{ tag: string, count: number }>}
   */
  getAllTags() {
    const frequency = {};
    for (const item of this.initialData) {
      if (Array.isArray(item.tags)) {
        for (const t of item.tags) {
          frequency[t] = (frequency[t] || 0) + 1;
        }
      }
    }
    return Object.entries(frequency)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  /**
   * Resets all filters and sort to default state
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
   * Applies search query, compound tag filters, and sorting
   * @returns {Array<object>}
   */
  apply() {
    let result = [...this.initialData];

    // 1. Keyword search (title, category, course, origin, tags, id)
    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const title = (item.title || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const course = (item.course || '').toLowerCase();
        const origin = (item.origin || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

        return (
          title.includes(q) ||
          category.includes(q) ||
          course.includes(q) ||
          origin.includes(q) ||
          id.includes(q) ||
          tags.includes(q)
        );
      });
    }

    // 2. Compound tag filtering (all selected tags must match)
    if (this.selectedTags.size > 0) {
      const requiredTags = Array.from(this.selectedTags).map(t => t.toLowerCase());
      result = result.filter(item => {
        const itemTags = Array.isArray(item.tags)
          ? item.tags.map(t => String(t).toLowerCase())
          : [];
        return requiredTags.every(req => itemTags.includes(req));
      });
    }

    // 3. Multi-attribute sorting
    if (this.sortField) {
      const field = this.sortField;
      const factor = this.sortDirection === 'desc' ? -1 : 1;

      result.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];

        if (valA === undefined && valB === undefined) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return strA.localeCompare(strB) * factor;
      });
    }

    if (this.onUpdate) {
      this.onUpdate(result);
    }

    return result;
  }
}

// Browser Interactive UI wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const filterEngine = new CulinaryBistroFilterEngine();

    const searchInput = document.getElementById('searchMenuInput');
    const clearSearchBtn = document.getElementById('btnClearSearch');
    const sortSelect = document.getElementById('menuSortSelect');
    const tagsContainer = document.getElementById('filterChipsContainer');
    const menuList = document.getElementById('bistroMenuList');
    const resultCountEl = document.getElementById('menuResultCount');
    const emptyStateEl = document.getElementById('menuEmptyState');
    const btnResetAll = document.getElementById('btnResetFilters');

    function renderTagChips() {
      if (!tagsContainer) return;
      tagsContainer.innerHTML = '';
      const allTags = filterEngine.getAllTags();
      const activeFilters = filterEngine.getActiveFilters();

      allTags.forEach(({ tag, count }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${activeFilters.tags.includes(tag) ? 'active' : ''}`;
        chip.innerHTML = `<span class="chip-label">${tag}</span><span class="chip-count">${count}</span>`;
        chip.addEventListener('click', () => {
          filterEngine.toggleTag(tag);
          renderTagChips();
          renderMenu();
        });
        tagsContainer.appendChild(chip);
      });
    }

    function renderMenu() {
      const items = filterEngine.apply();

      if (resultCountEl) {
        resultCountEl.textContent = `${items.length} culinary dish${items.length === 1 ? '' : 'es'}`;
      }

      if (!menuList) return;
      menuList.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'block';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';

      items.forEach(dish => {
        const card = document.createElement('article');
        card.className = 'menu-card';
        card.innerHTML = `
          <div class="card-top">
            <span class="dish-category">${dish.category}</span>
            <span class="dish-price">$${dish.price.toFixed(2)}</span>
          </div>
          <h4 class="dish-title">${dish.title}</h4>
          <div class="card-footer">
            <span class="dish-rating">★ ${dish.rating.toFixed(1)}</span>
            <div class="dish-tags">
              ${dish.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
            </div>
          </div>
        `;
        menuList.appendChild(card);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        filterEngine.filterByKeyword(e.target.value);
        if (clearSearchBtn) {
          clearSearchBtn.style.display = e.target.value ? 'inline-flex' : 'none';
        }
        renderMenu();
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        clearSearchBtn.style.display = 'none';
        filterEngine.filterByKeyword('');
        renderMenu();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        const [field, direction] = e.target.value.split('-');
        filterEngine.sort(field, direction);
        renderMenu();
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        filterEngine.reset();
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        if (sortSelect) sortSelect.value = 'title-asc';
        renderTagChips();
        renderMenu();
      });
    }

    renderTagChips();
    renderMenu();
  });
}
