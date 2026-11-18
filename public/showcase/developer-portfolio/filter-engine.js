/**
 * Developer Portfolio - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #588 - Level 3 Core Feature
 *
 * High-performance in-memory search, multi-tag filtering, and multi-attribute sorting engine
 * with instant real-time UI filtering and zero latency.
 */

export class DeveloperPortfolioFilterEngine {
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
   * Default sample developer portfolio projects dataset
   * @returns {Array<object>}
   */
  _getDefaultData() {
    return [
      {
        id: 'proj-01',
        title: 'Neural Vision WASM Engine',
        category: 'AI & ML',
        description: 'Zero-latency browser OCR model compiled to WebAssembly with SIMD acceleration.',
        stars: 1240,
        forks: 185,
        language: 'Rust',
        updatedAt: '2026-03-15',
        tags: ['rust', 'wasm', 'ai', 'computer-vision']
      },
      {
        id: 'proj-02',
        title: 'Quantum Key Protocol Enclave',
        category: 'Security',
        description: 'Post-quantum lattice cryptography toolkit implementing Kyber and Dilithium algorithms.',
        stars: 890,
        forks: 94,
        language: 'Go',
        updatedAt: '2026-02-28',
        tags: ['cryptography', 'security', 'go', 'quantum']
      },
      {
        id: 'proj-03',
        title: 'HyperFlux Distributed Database',
        category: 'Distributed Systems',
        description: 'Raft consensus log engine featuring lock-free memory storage and LSM compaction trees.',
        stars: 3450,
        forks: 410,
        language: 'Rust',
        updatedAt: '2026-04-02',
        tags: ['database', 'distributed', 'rust', 'raft']
      },
      {
        id: 'proj-04',
        title: 'Aura UI Design System',
        category: 'Frontend',
        description: 'Accessible, headless Web Components design system with automatic contrast audits.',
        stars: 620,
        forks: 78,
        language: 'TypeScript',
        updatedAt: '2026-01-19',
        tags: ['typescript', 'frontend', 'design-system', 'accessibility']
      },
      {
        id: 'proj-05',
        title: 'EdgePulse Telemetry Agent',
        category: 'DevOps & Cloud',
        description: 'Lightweight daemon streaming eBPF kernel network metrics to Prometheus endpoints.',
        stars: 1980,
        forks: 230,
        language: 'C',
        updatedAt: '2026-03-24',
        tags: ['devops', 'ebpf', 'telemetry', 'cloud']
      },
      {
        id: 'proj-06',
        title: 'Veloce GraphQL Micro-Gateway',
        category: 'Backend',
        description: 'Sub-millisecond query planning federation router with automatic response caching.',
        stars: 1540,
        forks: 160,
        language: 'TypeScript',
        updatedAt: '2026-04-10',
        tags: ['typescript', 'graphql', 'backend', 'api']
      }
    ];
  }

  /**
   * Sets fresh dataset and recalculates filtered result
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    this.initialData = Array.isArray(data) ? [...data] : [];
    return this.apply();
  }

  /**
   * Retrieves original unfiltered dataset
   * @returns {Array<object>}
   */
  getData() {
    return [...this.initialData];
  }

  /**
   * Filters projects by search query string
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
   * Overwrites currently selected tags
   * @param {Array<string>} tags
   * @returns {Array<object>}
   */
  setTags(tags) {
    this.selectedTags = new Set(Array.isArray(tags) ? tags.map(t => String(t).trim()) : []);
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
   * Returns current active filter parameters
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
   * Returns all unique tags present across the active dataset
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
   * Resets all search, tags, and sort parameters to default state
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
   * Applies active search, tag filters, and sorting pipeline
   * @returns {Array<object>}
   */
  apply() {
    let result = [...this.initialData];

    // 1. Keyword search (checks title, category, description, language, tags)
    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const title = (item.title || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const language = (item.language || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

        return (
          title.includes(q) ||
          category.includes(q) ||
          description.includes(q) ||
          language.includes(q) ||
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
    const filterEngine = new DeveloperPortfolioFilterEngine();

    const searchInput = document.getElementById('searchPortfolioInput');
    const clearSearchBtn = document.getElementById('btnClearSearch');
    const sortSelect = document.getElementById('portfolioSortSelect');
    const tagsContainer = document.getElementById('filterChipsContainer');
    const projectsList = document.getElementById('portfolioProjectsList');
    const resultCountEl = document.getElementById('portfolioResultCount');
    const emptyStateEl = document.getElementById('portfolioEmptyState');
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
          renderProjects();
        });
        tagsContainer.appendChild(chip);
      });
    }

    function renderProjects() {
      const items = filterEngine.apply();

      if (resultCountEl) {
        resultCountEl.textContent = `${items.length} project${items.length === 1 ? '' : 's'}`;
      }

      if (!projectsList) return;
      projectsList.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'block';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';

      items.forEach(proj => {
        const card = document.createElement('article');
        card.className = 'project-card';
        card.innerHTML = `
          <div class="card-top">
            <span class="proj-category">${proj.category}</span>
            <span class="proj-stars">★ ${proj.stars.toLocaleString()}</span>
          </div>
          <h4 class="proj-title">${proj.title}</h4>
          <p class="proj-desc">${proj.description}</p>
          <div class="card-footer">
            <span class="proj-lang"><span class="lang-dot"></span>${proj.language}</span>
            <div class="proj-tags">
              ${proj.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
            </div>
          </div>
        `;
        projectsList.appendChild(card);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        filterEngine.filterByKeyword(e.target.value);
        if (clearSearchBtn) {
          clearSearchBtn.style.display = e.target.value ? 'inline-flex' : 'none';
        }
        renderProjects();
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
        renderProjects();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        const [field, direction] = e.target.value.split('-');
        filterEngine.sort(field, direction);
        renderProjects();
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        filterEngine.reset();
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        if (sortSelect) sortSelect.value = 'title-asc';
        renderTagChips();
        renderProjects();
      });
    }

    renderTagChips();
    renderProjects();
  });
}
