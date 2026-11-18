/**
 * Docs Portal - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #592 - Level 3 Core Feature
 *
 * Implements high-performance in-memory documentation search, multi-tag filtering,
 * and multi-attribute sorting engine with zero latency.
 */

export class DocsPortalFilterEngine {
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
   * Default sample documentation guides and references dataset
   * @returns {Array<object>}
   */
  _getDefaultData() {
    return [
      {
        id: 'doc-01',
        title: 'Authentication & JWT Security Handshake',
        category: 'Security & Auth',
        section: 'Guides',
        readTime: 6,
        difficulty: 'Intermediate',
        tags: ['auth', 'jwt', 'security', 'oauth2'],
        updatedAt: '2026-03-10'
      },
      {
        id: 'doc-02',
        title: 'GraphQL Schema Federation & Directives',
        category: 'API Reference',
        section: 'Reference',
        readTime: 12,
        difficulty: 'Advanced',
        tags: ['graphql', 'api', 'schema', 'federation'],
        updatedAt: '2026-04-01'
      },
      {
        id: 'doc-03',
        title: 'Quickstart: Microservices Architecture',
        category: 'Getting Started',
        section: 'Tutorials',
        readTime: 4,
        difficulty: 'Beginner',
        tags: ['quickstart', 'architecture', 'docker', 'beginner'],
        updatedAt: '2026-01-15'
      },
      {
        id: 'doc-04',
        title: 'WebAssembly SIMD Optimization Patterns',
        category: 'Performance',
        section: 'Deep Dives',
        readTime: 15,
        difficulty: 'Advanced',
        tags: ['wasm', 'performance', 'rust', 'simd'],
        updatedAt: '2026-03-22'
      },
      {
        id: 'doc-05',
        title: 'Webhooks Event Streaming & Retries',
        category: 'Integration',
        section: 'Guides',
        readTime: 8,
        difficulty: 'Intermediate',
        tags: ['webhooks', 'events', 'api', 'retries'],
        updatedAt: '2026-02-18'
      },
      {
        id: 'doc-06',
        title: 'eBPF Kernel Network Observability',
        category: 'Observability',
        section: 'Deep Dives',
        readTime: 18,
        difficulty: 'Advanced',
        tags: ['ebpf', 'observability', 'linux', 'devops'],
        updatedAt: '2026-04-12'
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
   * Filters documentation by search query string
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
   * Returns all unique tags present across documentation articles
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

    // 1. Keyword search (title, category, section, tags, id)
    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const title = (item.title || '').toLowerCase();
        const category = (item.category || '').toLowerCase();
        const section = (item.section || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';

        return (
          title.includes(q) ||
          category.includes(q) ||
          section.includes(q) ||
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
    const filterEngine = new DocsPortalFilterEngine();

    const searchInput = document.getElementById('searchDocsInput');
    const clearSearchBtn = document.getElementById('btnClearSearch');
    const sortSelect = document.getElementById('docsSortSelect');
    const tagsContainer = document.getElementById('filterChipsContainer');
    const docsList = document.getElementById('docsArticlesList');
    const resultCountEl = document.getElementById('docsResultCount');
    const emptyStateEl = document.getElementById('docsEmptyState');
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
          renderDocs();
        });
        tagsContainer.appendChild(chip);
      });
    }

    function renderDocs() {
      const items = filterEngine.apply();

      if (resultCountEl) {
        resultCountEl.textContent = `${items.length} document${items.length === 1 ? '' : 's'}`;
      }

      if (!docsList) return;
      docsList.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.style.display = 'block';
        return;
      }

      if (emptyStateEl) emptyStateEl.style.display = 'none';

      items.forEach(doc => {
        const card = document.createElement('article');
        card.className = 'doc-card';
        card.innerHTML = `
          <div class="card-top">
            <span class="doc-category">${doc.category}</span>
            <span class="doc-readtime">⏱ ${doc.readTime} min read</span>
          </div>
          <h4 class="doc-title">${doc.title}</h4>
          <div class="card-footer">
            <span class="doc-difficulty">${doc.difficulty}</span>
            <div class="doc-tags">
              ${doc.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
            </div>
          </div>
        `;
        docsList.appendChild(card);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        filterEngine.filterByKeyword(e.target.value);
        if (clearSearchBtn) {
          clearSearchBtn.style.display = e.target.value ? 'inline-flex' : 'none';
        }
        renderDocs();
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
        renderDocs();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', e => {
        const [field, direction] = e.target.value.split('-');
        filterEngine.sort(field, direction);
        renderDocs();
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        filterEngine.reset();
        if (searchInput) searchInput.value = '';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';
        if (sortSelect) sortSelect.value = 'title-asc';
        renderTagChips();
        renderDocs();
      });
    }

    renderTagChips();
    renderDocs();
  });
}
