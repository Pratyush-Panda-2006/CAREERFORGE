/**
 * Gaming Esports Hub - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #608 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering and multi-attribute sorting for competitive esports matches,
 * premier tournaments, game titles, and prize pool rankings with zero latency.
 */

export class GamingEsportsHubFilterEngine {
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
   * Default competitive esports tournaments dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'ESP-101',
        title: 'VCT Champions Grand Final',
        game: 'Valorant',
        tier: 'S-Tier',
        prizePool: 2250000,
        viewers: 1450000,
        rating: 4.95,
        tags: ['valorant', 'fps', 'grand-final']
      },
      {
        id: 'ESP-102',
        title: 'Worlds Championship Semis',
        game: 'League of Legends',
        tier: 'S-Tier',
        prizePool: 3500000,
        viewers: 2800000,
        rating: 4.98,
        tags: ['moba', 'riot', 'championship']
      },
      {
        id: 'ESP-103',
        title: 'Major Antwerp Decider',
        game: 'CS2',
        tier: 'A-Tier',
        prizePool: 1250000,
        viewers: 890000,
        rating: 4.88,
        tags: ['fps', 'counter-strike', 'lan']
      },
      {
        id: 'ESP-104',
        title: 'The International Aegis Match',
        game: 'Dota 2',
        tier: 'S-Tier',
        prizePool: 18000000,
        viewers: 1100000,
        rating: 4.92,
        tags: ['moba', 'valve', 'championship']
      },
      {
        id: 'ESP-105',
        title: 'Apex Global Series Championship',
        game: 'Apex Legends',
        tier: 'A-Tier',
        prizePool: 2000000,
        viewers: 620000,
        rating: 4.82,
        tags: ['battle-royale', 'fps', 'lan']
      },
      {
        id: 'ESP-106',
        title: 'Evo Top 8 Grand Finals',
        game: 'Street Fighter 6',
        tier: 'B-Tier',
        prizePool: 500000,
        viewers: 410000,
        rating: 4.90,
        tags: ['fgc', 'fighting', 'lan']
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

    // 1. Keyword search (title, game, tier, tags)
    if (this.keyword) {
      result = result.filter(item => {
        const titleMatch = item.title && item.title.toLowerCase().includes(this.keyword);
        const gameMatch = item.game && item.game.toLowerCase().includes(this.keyword);
        const tierMatch = item.tier && item.tier.toLowerCase().includes(this.keyword);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.keyword));
        return titleMatch || gameMatch || tierMatch || tagMatch;
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
    const engine = new GamingEsportsHubFilterEngine();

    const searchInput = document.getElementById('esportsSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortSelect = document.getElementById('esportsSortSelect');
    const tagContainer = document.getElementById('esportsTagChips');
    const cardsContainer = document.getElementById('esportsMatchCards');
    const emptyState = document.getElementById('esportsEmptyState');
    const countBadge = document.getElementById('esportsResultsCount');

    function renderTags() {
      if (!tagContainer) return;
      tagContainer.innerHTML = '';
      const tags = engine.getAllTags();
      const activeTags = new Set(engine.getActiveFilters().tags);

      tags.forEach(({ tag, count }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `esports-tag-chip ${activeTags.has(tag) ? 'active' : ''}`;
        chip.innerHTML = `${tag} <span class="tag-count">(${count})</span>`;
        chip.addEventListener('click', () => {
          engine.toggleTag(tag);
          updateView();
        });
        tagContainer.appendChild(chip);
      });
    }

    function renderCards(matches) {
      if (!cardsContainer) return;
      cardsContainer.innerHTML = '';

      if (matches.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      matches.forEach(item => {
        const card = document.createElement('div');
        card.className = 'esports-match-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="match-game">${item.game}</span>
            <span class="match-tier">${item.tier}</span>
          </div>
          <h3 class="match-title">${item.title}</h3>
          <p class="match-prize">Prize Pool: \$${(item.prizePool / 1000000).toFixed(2)}M</p>
          <div class="match-specs">
            <span>Peak: ${(item.viewers / 1000000).toFixed(2)}M viewers</span>
            <span>•</span>
            <span>Hype: ${item.rating}★</span>
          </div>
          <div class="match-tags">
            ${(item.tags || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }

    function updateView() {
      const results = engine.apply();
      if (countBadge) countBadge.textContent = `${results.length} Matches`;
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
