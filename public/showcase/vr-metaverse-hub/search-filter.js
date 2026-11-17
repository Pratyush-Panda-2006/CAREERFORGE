/**
 * VR Metaverse Hub - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #680 - NSoC '26 Level 3 Feature
 */

export class VrMetaverseHubFilterEngine {
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
      // 1. Keyword search
      if (this.searchQuery) {
        const textPayload = [
          item.name || '',
          item.realm || '',
          item.category || '',
          item.portalId || '',
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

// Sample Metaverse Portals and 3D Realms
export const SAMPLE_VR_DATA = [
  { id: 1, name: 'Cyberpunk Plaza Neo-Tokyo', realm: 'Metropolis', userCount: 1420, fps: 90, status: 'LIVE', tags: ['social', 'cyberpunk', 'popular'] },
  { id: 2, name: 'Zero-G Orbital Auditorium', realm: 'Space Station', userCount: 350, fps: 120, status: 'LIVE', tags: ['auditorium', 'event', 'zero-g'] },
  { id: 3, name: 'Ancient Zen Bamboo Forest', realm: 'Sanctuary', userCount: 88, fps: 90, status: 'IDLE', tags: ['chill', 'nature', 'meditation'] },
  { id: 4, name: 'Holographic Esports Arena', realm: 'Stadium', userCount: 2890, fps: 144, status: 'LIVE', tags: ['gaming', 'esports', 'popular'] },
  { id: 5, name: 'Quantum Art Gallery Nexus', realm: 'Museum', userCount: 210, fps: 90, status: 'LIVE', tags: ['art', 'social', 'chill'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.VrMetaverseHubFilterEngine = VrMetaverseHubFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new VrMetaverseHubFilterEngine(SAMPLE_VR_DATA);
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
            <div class="vr-realm-card">
              <div class="card-header">
                <h3>${item.name}</h3>
                <span class="realm-badge">${item.realm}</span>
              </div>
              <p>Active Users: <strong>${item.userCount}</strong> | Target: <strong>${item.fps} FPS</strong> | Status: <strong>${item.status}</strong></p>
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
