/**
 * Cybersecurity Sentinel - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #640 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, keyword query search, compound tag matching,
 * and multi-attribute sorting for SOC security incidents, threat vectors, and CVE advisories.
 */

export class CybersecuritySentinelFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'cvssScore';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample SOC threat incidents dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'threat-1',
        title: 'SSH Brute Force Attack',
        vector: 'Network',
        severity: 'Critical',
        sourceIp: '198.51.100.42',
        cvssScore: 9.8,
        eventsCount: 4280,
        tags: ['brute-force', 'ssh', 'network', 'ddos'],
        status: 'Active'
      },
      {
        id: 'threat-2',
        title: 'SQL Injection Probe',
        vector: 'Application',
        severity: 'High',
        sourceIp: '203.0.113.19',
        cvssScore: 8.6,
        eventsCount: 142,
        tags: ['sqli', 'web', 'injection', 'owasp'],
        status: 'Mitigated'
      },
      {
        id: 'threat-3',
        title: 'Privilege Escalation Exploit',
        vector: 'Endpoint',
        severity: 'Critical',
        sourceIp: '10.0.4.15',
        cvssScore: 9.1,
        eventsCount: 18,
        tags: ['priv-esc', 'kernel', 'endpoint', 'root'],
        status: 'Investigating'
      },
      {
        id: 'threat-4',
        title: 'DNS Tunneling Exfiltration',
        vector: 'Protocol',
        severity: 'Medium',
        sourceIp: '192.0.2.88',
        cvssScore: 6.4,
        eventsCount: 890,
        tags: ['dns', 'exfiltration', 'tunneling'],
        status: 'Active'
      },
      {
        id: 'threat-5',
        title: 'Cross-Site Scripting Reflected',
        vector: 'Application',
        severity: 'Low',
        sourceIp: '198.51.100.12',
        cvssScore: 4.3,
        eventsCount: 24,
        tags: ['xss', 'web', 'client-side'],
        status: 'Resolved'
      },
      {
        id: 'threat-6',
        title: 'Ransomware Canary Alert',
        vector: 'Filesystem',
        severity: 'Critical',
        sourceIp: '10.0.8.210',
        cvssScore: 9.9,
        eventsCount: 512,
        tags: ['ransomware', 'crypto', 'filesystem', 'canary'],
        status: 'Contained'
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
   * Sets numeric range filter bounds for a property
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
    this.sortField = 'cvssScore';
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
      // 1. Keyword search across title, vector, sourceIp, and tags
      if (this.searchQuery) {
        const titleMatch = item.title && item.title.toLowerCase().includes(this.searchQuery);
        const vectorMatch = item.vector && item.vector.toLowerCase().includes(this.searchQuery);
        const ipMatch = item.sourceIp && item.sourceIp.toLowerCase().includes(this.searchQuery);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.searchQuery));
        if (!titleMatch && !vectorMatch && !ipMatch && !tagMatch) {
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
        console.error('CybersecuritySentinelFilterEngine listener error:', err);
      }
    });
  }
}

// Browser UI bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new CybersecuritySentinelFilterEngine();

    const searchInput = document.getElementById('threatSearchInput');
    const clearSearchBtn = document.getElementById('clearThreatSearchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const tagChips = document.querySelectorAll('.filter-chip');
    const resultsContainer = document.getElementById('threatResultsGrid');
    const resultCountEl = document.getElementById('resultCount');
    const emptyStateEl = document.getElementById('emptyStateAlert');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    function renderCards(items) {
      if (!resultsContainer) return;
      resultsContainer.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        if (resultCountEl) resultCountEl.textContent = '0 threats detected';
        return;
      }

      if (emptyStateEl) emptyStateEl.classList.add('hidden');
      if (resultCountEl) resultCountEl.textContent = `${items.length} security alerts matching criteria`;

      items.forEach(threat => {
        const card = document.createElement('article');
        card.className = 'threat-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="threat-vector">${threat.vector}</span>
            <span class="severity-badge ${threat.severity.toLowerCase()}">${threat.severity}</span>
          </div>
          <h3 class="threat-title">${threat.title}</h3>
          <p class="threat-ip">Source: <code>${threat.sourceIp}</code></p>
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">CVSS v3.1</span>
              <span class="spec-val">${threat.cvssScore}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Events</span>
              <span class="spec-val">${threat.eventsCount.toLocaleString()}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Status</span>
              <span class="spec-val">${threat.status}</span>
            </div>
          </div>
          <div class="card-tags">
            ${threat.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
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
        if (sortSelect) sortSelect.value = 'cvssScore-desc';
        update();
      });
    }

    update();
  });
}
