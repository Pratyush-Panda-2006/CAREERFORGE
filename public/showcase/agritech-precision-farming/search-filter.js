/**
 * Agritech Precision Farming - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #719 - NSoC '26 Level 3 Feature
 */

export class AgritechPrecisionFarmingFilterEngine {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'name';
    this.sortDirection = 'asc'; // 'asc' or 'desc'
  }

  setItems(items) {
    this.items = Array.isArray(items) ? [...items] : [];
    return this.getFilteredAndSorted();
  }

  filterByKeyword(query) {
    this.searchQuery = (query || '').trim().toLowerCase();
    return this.getFilteredAndSorted();
  }

  toggleTag(tag) {
    if (!tag) return this.getFilteredAndSorted();
    const normalized = tag.trim().toLowerCase();
    if (this.selectedTags.has(normalized)) {
      this.selectedTags.delete(normalized);
    } else {
      this.selectedTags.add(normalized);
    }
    return this.getFilteredAndSorted();
  }

  getActiveTags() {
    return Array.from(this.selectedTags);
  }

  clearTags() {
    this.selectedTags.clear();
    return this.getFilteredAndSorted();
  }

  sort(field, direction = 'asc') {
    this.sortField = field || 'name';
    this.sortDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
    return this.getFilteredAndSorted();
  }

  getFilteredAndSorted() {
    let result = this.items.filter((item) => {
      // 1. Keyword search across name, category, description, crop, sensorType
      if (this.searchQuery) {
        const textPayload = [
          item.name || '',
          item.category || '',
          item.crop || '',
          item.description || '',
          item.sensorType || ''
        ].join(' ').toLowerCase();

        if (!textPayload.includes(this.searchQuery)) {
          return false;
        }
      }

      // 2. Compound Tag filtering (item must include all selected tags)
      if (this.selectedTags.size > 0) {
        const itemTags = Array.isArray(item.tags)
          ? item.tags.map((t) => String(t).toLowerCase())
          : [];
        for (const tag of this.selectedTags) {
          if (!itemTags.includes(tag)) {
            return false;
          }
        }
      }

      return true;
    });

    // 3. Multi-attribute sorting
    if (this.sortField) {
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
    }

    return result;
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedTags.clear();
    this.sortField = 'name';
    this.sortDirection = 'asc';
    return this.getFilteredAndSorted();
  }
}

// Sample sensor field mock items
export const SAMPLE_AGRITECH_DATA = [
  { id: 1, name: 'Zone Alpha - North Orchard', crop: 'Apples', moisture: 34, ph: 6.5, category: 'Sensors', tags: ['active', 'orchard', 'critical'] },
  { id: 2, name: 'Zone Beta - Hydroponic Greens', crop: 'Lettuce', moisture: 78, ph: 5.8, category: 'Hydroponics', tags: ['active', 'indoor', 'optimal'] },
  { id: 3, name: 'Zone Gamma - Solar Drone Station', crop: 'Corn', moisture: 45, ph: 6.8, category: 'Drones', tags: ['standby', 'field', 'optimal'] },
  { id: 4, name: 'Zone Delta - Wheat Farmlands', crop: 'Wheat', moisture: 22, ph: 7.2, category: 'Sensors', tags: ['active', 'field', 'warning'] },
  { id: 5, name: 'Zone Epsilon - Vineyard Terraces', crop: 'Grapes', moisture: 41, ph: 6.1, category: 'Sensors', tags: ['active', 'vineyard', 'optimal'] },
  { id: 6, name: 'Zone Zeta - Automated Irrigation Hub', crop: 'Soybeans', moisture: 18, ph: 6.9, category: 'Irrigation', tags: ['critical', 'field', 'warning'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.AgritechPrecisionFarmingFilterEngine = AgritechPrecisionFarmingFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AgritechPrecisionFarmingFilterEngine(SAMPLE_AGRITECH_DATA);
    const searchInput = document.getElementById('search-filter-input');
    const clearBtn = document.getElementById('search-clear-btn');
    const sortSelect = document.getElementById('sort-select');
    const tagChipsContainer = document.getElementById('tag-chips-container');
    const resultsContainer = document.getElementById('results-list');
    const emptyState = document.getElementById('empty-state-alert');

    const render = () => {
      const filtered = engine.getFilteredAndSorted();
      if (resultsContainer) {
        if (filtered.length === 0) {
          resultsContainer.innerHTML = '';
          if (emptyState) emptyState.style.display = 'block';
        } else {
          if (emptyState) emptyState.style.display = 'none';
          resultsContainer.innerHTML = filtered.map((item) => `
            <div class="sensor-card">
              <div class="sensor-card-header">
                <h3>${item.name}</h3>
                <span class="crop-badge">${item.crop}</span>
              </div>
              <p>Category: <strong>${item.category}</strong> | Soil Moisture: <strong>${item.moisture}%</strong> | pH: <strong>${item.ph}</strong></p>
              <div class="card-tags">
                ${item.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}
              </div>
            </div>
          `).join('');
        }
      }
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        engine.filterByKeyword(e.target.value);
        render();
      });
    }

    if (clearBtn && searchInput) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        engine.filterByKeyword('');
        render();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        const [field, dir] = e.target.value.split(':');
        engine.sort(field, dir);
        render();
      });
    }

    if (tagChipsContainer) {
      const chips = tagChipsContainer.querySelectorAll('.filter-chip');
      chips.forEach((chip) => {
        chip.addEventListener('click', () => {
          const tag = chip.getAttribute('data-tag');
          chip.classList.toggle('active');
          engine.toggleTag(tag);
          render();
        });
      });
    }

    render();
  });
}
