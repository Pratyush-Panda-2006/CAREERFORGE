/**
 * Fintech Vault - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #604 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering and multi-attribute sorting for institutional vault holdings,
 * decentralized treasury allocations, tokenized RWAs, and yield positions with zero latency.
 */

export class FintechVaultFilterEngine {
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
   * Default institutional vault assets and treasury ledger
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'VAULT-101',
        title: 'USDC Liquidity Pool Allocation',
        assetClass: 'Stablecoin',
        protocol: 'Aave v3',
        amount: 2500000,
        apy: 5.4,
        riskScore: 1.2,
        tags: ['stablecoin', 'defi', 'audited']
      },
      {
        id: 'VAULT-102',
        title: 'Ethereum Staking Validator',
        assetClass: 'Layer 1',
        protocol: 'Lido Core',
        amount: 8400000,
        apy: 4.2,
        riskScore: 2.1,
        tags: ['staking', 'pos', 'audited']
      },
      {
        id: 'VAULT-103',
        title: 'Tokenized US Treasury Bill (TBILL)',
        assetClass: 'RWA',
        protocol: 'Ondo Finance',
        amount: 12000000,
        apy: 5.1,
        riskScore: 0.8,
        tags: ['rwa', 'treasury', 'institutional']
      },
      {
        id: 'VAULT-104',
        title: 'Solana MEV Arbitrage Vault',
        assetClass: 'Yield',
        protocol: 'Jito Network',
        amount: 3100000,
        apy: 11.8,
        riskScore: 3.8,
        tags: ['mev', 'high-yield', 'solana']
      },
      {
        id: 'VAULT-105',
        title: 'Bitcoin Cold-Storage Custody (WBTC)',
        assetClass: 'Digital Gold',
        protocol: 'BitGo Custody',
        amount: 15500000,
        apy: 1.8,
        riskScore: 1.5,
        tags: ['custody', 'cold-storage', 'institutional']
      },
      {
        id: 'VAULT-106',
        title: 'Zero-Knowledge Privacy Rollup',
        assetClass: 'Privacy',
        protocol: 'Aztec Network',
        amount: 1800000,
        apy: 8.5,
        riskScore: 4.2,
        tags: ['zk', 'privacy', 'experimental']
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

    // 1. Keyword search (title, assetClass, protocol, tags)
    if (this.keyword) {
      result = result.filter(item => {
        const titleMatch = item.title && item.title.toLowerCase().includes(this.keyword);
        const classMatch = item.assetClass && item.assetClass.toLowerCase().includes(this.keyword);
        const protoMatch = item.protocol && item.protocol.toLowerCase().includes(this.keyword);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.keyword));
        return titleMatch || classMatch || protoMatch || tagMatch;
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
    const engine = new FintechVaultFilterEngine();

    const searchInput = document.getElementById('vaultSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const sortSelect = document.getElementById('vaultSortSelect');
    const tagContainer = document.getElementById('vaultTagChips');
    const cardsContainer = document.getElementById('vaultAssetCards');
    const emptyState = document.getElementById('vaultEmptyState');
    const countBadge = document.getElementById('vaultResultsCount');

    function renderTags() {
      if (!tagContainer) return;
      tagContainer.innerHTML = '';
      const tags = engine.getAllTags();
      const activeTags = new Set(engine.getActiveFilters().tags);

      tags.forEach(({ tag, count }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `vault-tag-chip ${activeTags.has(tag) ? 'active' : ''}`;
        chip.innerHTML = `${tag} <span class="tag-count">(${count})</span>`;
        chip.addEventListener('click', () => {
          engine.toggleTag(tag);
          updateView();
        });
        tagContainer.appendChild(chip);
      });
    }

    function renderCards(assets) {
      if (!cardsContainer) return;
      cardsContainer.innerHTML = '';

      if (assets.length === 0) {
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      assets.forEach(item => {
        const card = document.createElement('div');
        card.className = 'vault-asset-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="asset-class">${item.assetClass}</span>
            <span class="asset-apy">${item.apy}% APY</span>
          </div>
          <h3 class="asset-title">${item.title}</h3>
          <p class="asset-protocol">${item.protocol}</p>
          <div class="asset-specs">
            <span>Allocation: \$${(item.amount / 1000000).toFixed(2)}M</span>
            <span>•</span>
            <span>Risk Score: ${item.riskScore}</span>
          </div>
          <div class="asset-tags">
            ${(item.tags || []).map(t => `<span class="badge-tag">#${t}</span>`).join('')}
          </div>
        `;
        cardsContainer.appendChild(card);
      });
    }

    function updateView() {
      const results = engine.apply();
      if (countBadge) countBadge.textContent = `${results.length} Vault Assets`;
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
