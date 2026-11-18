/**
 * Neurotech Interface - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #692 - NSoC '26 Level 3 Feature
 */

export class NeurotechInterfaceFilterEngine {
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
          item.channel || '',
          item.region || '',
          item.band || '',
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

// Sample BCI Channel telemetry items
export const SAMPLE_NEUROTECH_DATA = [
  { id: 1, name: 'Ch 1 - Frontal Cortex Fp1', channel: 'Fp1', region: 'Prefrontal', snrDb: 18.5, band: 'Theta', status: 'ACTIVE', tags: ['active', 'frontal', 'clean'] },
  { id: 2, name: 'Ch 2 - Motor Strip C3', channel: 'C3', region: 'Motor Cortex', snrDb: 24.2, band: 'Mu/Beta', status: 'ACTIVE', tags: ['active', 'motor', 'high-snr'] },
  { id: 3, name: 'Ch 3 - Occipital Vision O1', channel: 'O1', region: 'Occipital', snrDb: 14.0, band: 'Alpha', status: 'ACTIVE', tags: ['active', 'vision', 'clean'] },
  { id: 4, name: 'Ch 4 - Temporal Audio T3', channel: 'T3', region: 'Temporal', snrDb: 9.8, band: 'Gamma', status: 'NOISY', tags: ['noisy', 'temporal', 'artifact'] },
  { id: 5, name: 'Ch 5 - Parietal Sensor Pz', channel: 'Pz', region: 'Parietal', snrDb: 21.0, band: 'Beta', status: 'ACTIVE', tags: ['active', 'parietal', 'clean'] },
  { id: 6, name: 'Ch 6 - Auxiliary Ear Ref A1', channel: 'A1', region: 'Reference', snrDb: 28.5, band: 'Ground', status: 'GROUNDED', tags: ['ground', 'reference', 'clean'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.NeurotechInterfaceFilterEngine = NeurotechInterfaceFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new NeurotechInterfaceFilterEngine(SAMPLE_NEUROTECH_DATA);
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
            <div class="channel-card">
              <div class="channel-card-header">
                <h3>${item.name}</h3>
                <span class="region-badge">${item.region}</span>
              </div>
              <p>Electrode: <strong>${item.channel}</strong> | SNR: <strong>${item.snrDb} dB</strong> | Band: <strong>${item.band}</strong></p>
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
