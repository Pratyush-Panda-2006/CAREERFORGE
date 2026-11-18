/**
 * Robotics Automata - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #688 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataFilterEngine {
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
      // 1. Keyword search across name, category, model, and payload
      if (this.searchQuery) {
        const textPayload = [
          item.name || '',
          item.category || '',
          item.model || '',
          item.actuatorType || '',
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

// Sample robotics telemetry inventory items
export const SAMPLE_ROBOTICS_DATA = [
  { id: 1, name: 'Cobot Arm V6 - Precision Welder', category: 'Manipulator', payloadKg: 10, reachMm: 1300, status: 'ONLINE', tags: ['active', 'welding', '6dof'] },
  { id: 2, name: 'Autonomous Mobile Base AMR-200', category: 'Mobile Base', payloadKg: 200, reachMm: 0, status: 'CHARGING', tags: ['standby', 'lidar', 'amr'] },
  { id: 3, name: 'Delta High-Speed Pick & Place', category: 'Parallel Delta', payloadKg: 3, reachMm: 800, status: 'ONLINE', tags: ['active', 'packaging', 'high-speed'] },
  { id: 4, name: 'SCARA Assembly Robot X4', category: 'SCARA', payloadKg: 6, reachMm: 650, status: 'CALIBRATING', tags: ['active', 'assembly', '4dof'] },
  { id: 5, name: 'Heavy Payload Gantry G-500', category: 'Cartesian Gantry', payloadKg: 500, reachMm: 4500, status: 'OFFLINE', tags: ['offline', 'heavy-load', 'cnc'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.RoboticsAutomataFilterEngine = RoboticsAutomataFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new RoboticsAutomataFilterEngine(SAMPLE_ROBOTICS_DATA);
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
            <div class="robot-card">
              <div class="robot-card-header">
                <h3>${item.name}</h3>
                <span class="category-badge">${item.category}</span>
              </div>
              <p>Payload: <strong>${item.payloadKg} kg</strong> | Reach: <strong>${item.reachMm} mm</strong> | Status: <strong>${item.status}</strong></p>
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
