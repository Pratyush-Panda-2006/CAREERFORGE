/**
 * Festival Hub - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #580 - NSoC '26 Level 3 Feature
 */

export class FestivalHubFilterEngine {
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : [];
    this.keyword = options.keyword || '';
    this.selectedTags = new Set(options.tags || []);
    this.sortField = options.sortField || 'name';
    this.sortDirection = options.sortDirection || 'asc'; // 'asc' or 'desc'
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
  }

  setData(data) {
    this.initialData = Array.isArray(data) ? [...data] : [];
    return this.apply();
  }

  filterByKeyword(query) {
    this.keyword = (query || '').trim().toLowerCase();
    return this.apply();
  }

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

  setTags(tags) {
    this.selectedTags = new Set(Array.isArray(tags) ? tags.map(t => String(t).trim()) : []);
    return this.apply();
  }

  clearTags() {
    this.selectedTags.clear();
    return this.apply();
  }

  sort(field, direction = 'asc') {
    this.sortField = field || 'name';
    this.sortDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this.apply();
  }

  apply() {
    let result = [...this.initialData];

    // 1. Keyword search (checks name, description, stage, genre, tags)
    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const stage = (item.stage || '').toLowerCase();
        const genre = (item.genre || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
        return name.includes(q) || desc.includes(q) || stage.includes(q) || genre.includes(q) || tags.includes(q);
      });
    }

    // 2. Compound tag filtering (items must have all selected tags)
    if (this.selectedTags.size > 0) {
      const activeTags = Array.from(this.selectedTags).map(t => t.toLowerCase());
      result = result.filter(item => {
        const itemTags = Array.isArray(item.tags)
          ? item.tags.map(t => String(t).toLowerCase())
          : [];
        return activeTags.every(reqTag => itemTags.includes(reqTag));
      });
    }

    // 3. Multi-attribute sorting precision
    if (this.sortField) {
      const field = this.sortField;
      const factor = this.sortDirection === 'desc' ? -1 : 1;

      result.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return (valA - valB) * factor;
        }

        // Date comparison if valid ISO string or timestamp
        const timeA = Date.parse(valA);
        const timeB = Date.parse(valB);
        if (!isNaN(timeA) && !isNaN(timeB) && typeof valA === 'string' && valA.includes('-')) {
          return (timeA - timeB) * factor;
        }

        return String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' }) * factor;
      });
    }

    if (this.onUpdate) {
      this.onUpdate(result, this.getActiveState());
    }

    return result;
  }

  reset() {
    this.keyword = '';
    this.selectedTags.clear();
    this.sortField = 'name';
    this.sortDirection = 'asc';
    return this.apply();
  }

  getActiveState() {
    return {
      keyword: this.keyword,
      tags: Array.from(this.selectedTags),
      sortField: this.sortField,
      sortDirection: this.sortDirection,
      totalCount: this.initialData.length,
      filteredCount: this.apply().length
    };
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;

    const searchInput = container.querySelector('#festivalSearchInput');
    const clearSearchBtn = container.querySelector('#festivalClearSearchBtn');
    const sortSelect = container.querySelector('#festivalSortSelect');
    const tagChips = container.querySelectorAll('.festival-filter-chip');
    const emptyState = container.querySelector('#festivalEmptyState');
    const resultsContainer = container.querySelector('#festivalFilteredResults');

    if (searchInput) {
      searchInput.value = this.keyword;
      searchInput.addEventListener('input', (e) => {
        this.filterByKeyword(e.target.value);
        this._renderResults(resultsContainer, emptyState);
      });
    }

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.filterByKeyword('');
        this._renderResults(resultsContainer, emptyState);
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, dir] = e.target.value.split(':');
        this.sort(field, dir || 'asc');
        this._renderResults(resultsContainer, emptyState);
      });
    }

    tagChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.getAttribute('data-tag');
        this.toggleTag(tag);
        chip.classList.toggle('active', this.selectedTags.has(tag));
        this._renderResults(resultsContainer, emptyState);
      });
    });

    this._renderResults(resultsContainer, emptyState);
  }

  _renderResults(container, emptyState) {
    if (!container) return;
    const filtered = this.apply();

    if (emptyState) {
      emptyState.style.display = filtered.length === 0 ? 'block' : 'none';
    }

    container.innerHTML = filtered.map(item => `
      <div class="festival-item-card" data-id="${item.id}">
        <div class="item-header">
          <h4 class="item-title">${item.name}</h4>
          <span class="item-badge">${item.genre || 'General'}</span>
        </div>
        <p class="item-desc">${item.description || ''}</p>
        <div class="item-meta">
          <span>📍 ${item.stage || 'Main Stage'}</span>
          <span>⭐ ${item.rating || '5.0'}</span>
          <span>👥 ${item.popularity || 0} attendees</span>
        </div>
        <div class="item-tags">
          ${(item.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
}

if (typeof window !== 'undefined') {
  window.FestivalHubFilterEngine = FestivalHubFilterEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.FestivalHubFilterEngine = FestivalHubFilterEngine;
}

export default FestivalHubFilterEngine;
