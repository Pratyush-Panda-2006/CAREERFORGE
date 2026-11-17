/**
 * SaaS Launchpad - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #584 - NSoC '26 Level 3 Feature
 */

export class SaasLaunchpadFilterEngine {
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : this._getDefaultData();
    this.keyword = options.keyword || '';
    this.selectedTags = new Set(options.tags || []);
    this.sortField = options.sortField || 'name';
    this.sortDirection = options.sortDirection || 'asc';
    this.onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : null;
  }

  _getDefaultData() {
    return [
      { id: 'sub-01', name: 'Enterprise Cloud Stack', tier: 'Enterprise', mrr: 12500, users: 480, status: 'Active', churnRate: 0.8, tags: ['cloud', 'enterprise', 'sla99'] },
      { id: 'sub-02', name: 'Startup Growth Booster', tier: 'Growth', mrr: 2900, users: 65, status: 'Active', churnRate: 1.4, tags: ['growth', 'analytics', 'fast-onboarding'] },
      { id: 'sub-03', name: 'Solo Creator Launchpad', tier: 'Starter', mrr: 450, users: 12, status: 'Trial', churnRate: 3.2, tags: ['starter', 'creator'] },
      { id: 'sub-04', name: 'Fintech Secure Enclave', tier: 'Enterprise', mrr: 24000, users: 920, status: 'Active', churnRate: 0.2, tags: ['enterprise', 'compliance', 'fintech'] },
      { id: 'sub-05', name: 'DevOps Automated Pipeline', tier: 'Growth', mrr: 5800, users: 140, status: 'Active', churnRate: 1.1, tags: ['growth', 'devops', 'cloud'] }
    ];
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

    // 1. Keyword search (checks name, tier, id, tags)
    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const name = (item.name || '').toLowerCase();
        const tier = (item.tier || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
        return name.includes(q) || tier.includes(q) || id.includes(q) || tags.includes(q);
      });
    }

    // 2. Compound tag filtering (all selected tags must be present)
    if (this.selectedTags.size > 0) {
      const activeTags = Array.from(this.selectedTags).map(t => t.toLowerCase());
      result = result.filter(item => {
        const itemTags = Array.isArray(item.tags)
          ? item.tags.map(t => String(t).toLowerCase())
          : [];
        return activeTags.every(reqTag => itemTags.includes(reqTag));
      });
    }

    // 3. Multi-attribute sorting
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

    const searchInput = container.querySelector('#saasSearchInput');
    const clearBtn = container.querySelector('#saasClearSearchBtn');
    const sortSelect = container.querySelector('#saasSortSelect');
    const chips = container.querySelectorAll('.saas-tag-chip');
    const emptyState = container.querySelector('#saasEmptyState');
    const resultsContainer = container.querySelector('#saasFilterResults');

    if (searchInput) {
      searchInput.value = this.keyword;
      searchInput.addEventListener('input', (e) => {
        this.filterByKeyword(e.target.value);
        this._renderResults(resultsContainer, emptyState);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
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

    chips.forEach(chip => {
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
    const items = this.apply();

    if (emptyState) {
      emptyState.style.display = items.length === 0 ? 'block' : 'none';
    }

    container.innerHTML = items.map(item => `
      <div class="saas-plan-card" data-id="${item.id}">
        <div class="card-head">
          <span class="plan-id"><code>${item.id}</code></span>
          <span class="plan-tier ${item.tier.toLowerCase()}">${item.tier}</span>
        </div>
        <h4 class="plan-name">${item.name}</h4>
        <div class="plan-metrics">
          <div class="metric-item">
            <span class="label">MRR</span>
            <span class="val">$${item.mrr.toLocaleString()}</span>
          </div>
          <div class="metric-item">
            <span class="label">Active Users</span>
            <span class="val">${item.users}</span>
          </div>
          <div class="metric-item">
            <span class="label">Churn</span>
            <span class="val">${item.churnRate}%</span>
          </div>
        </div>
        <div class="card-tags">
          ${(item.tags || []).map(t => `<span class="pill-chip">#${t}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }
}

if (typeof window !== 'undefined') {
  window.SaasLaunchpadFilterEngine = SaasLaunchpadFilterEngine;
}
if (typeof globalThis !== 'undefined') {
  globalThis.SaasLaunchpadFilterEngine = SaasLaunchpadFilterEngine;
}

export default SaasLaunchpadFilterEngine;
