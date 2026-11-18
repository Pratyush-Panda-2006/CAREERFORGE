/**
 * Drone Delivery Skyway - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #707 - NSoC '26 Level 3 Feature
 */

export class DroneDeliverySkywayFilterEngine {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'name';
    this.sortDirection = 'asc';
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
      // 1. Keyword search across name, corridor, droneModel, and status
      if (this.searchQuery) {
        const textPayload = [
          item.name || '',
          item.corridor || '',
          item.droneModel || '',
          item.status || '',
          item.description || ''
        ].join(' ').toLowerCase();

        if (!textPayload.includes(this.searchQuery)) {
          return false;
        }
      }

      // 2. Compound Tag filtering
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

// Sample skyway flight route items
export const SAMPLE_DRONE_DATA = [
  { id: 1, name: 'Skyway-Alpha Metro Transit', corridor: 'Downtown Corridor A', altitudeFt: 450, batteryPct: 88, status: 'AIRBORNE', tags: ['active', 'metro', 'express'] },
  { id: 2, name: 'Skyway-Beta Medical Rapid', corridor: 'Hospital Sector 4', altitudeFt: 550, batteryPct: 94, status: 'AIRBORNE', tags: ['active', 'medical', 'high-priority'] },
  { id: 3, name: 'Skyway-Gamma Suburban Cargo', corridor: 'Valley Ridge Corridor', altitudeFt: 380, batteryPct: 35, status: 'RETURNING', tags: ['warning', 'cargo', 'suburban'] },
  { id: 4, name: 'Skyway-Delta Harbor Patrol', corridor: 'Coastal Bay Sector', altitudeFt: 400, batteryPct: 15, status: 'LANDED', tags: ['docked', 'charging', 'harbor'] },
  { id: 5, name: 'Skyway-Epsilon Industrial Hub', corridor: 'Tech Park Skyway', altitudeFt: 500, batteryPct: 76, status: 'AIRBORNE', tags: ['active', 'industrial', 'heavy-payload'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.DroneDeliverySkywayFilterEngine = DroneDeliverySkywayFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new DroneDeliverySkywayFilterEngine(SAMPLE_DRONE_DATA);
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
            <div class="drone-card">
              <div class="drone-card-header">
                <h3>${item.name}</h3>
                <span class="status-badge badge-${item.status.toLowerCase()}">${item.status}</span>
              </div>
              <p>Corridor: <strong>${item.corridor}</strong> | Altitude: <strong>${item.altitudeFt} ft</strong> | Battery: <strong>${item.batteryPct}%</strong></p>
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
