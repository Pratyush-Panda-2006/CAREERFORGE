/**
 * Music DAW Studio - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #710 - NSoC '26 Level 3 Feature
 */

export class MusicDawStudioFilterEngine {
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
      // 1. Keyword search across name, category, key, and pluginType
      if (this.searchQuery) {
        const textPayload = [
          item.name || '',
          item.category || '',
          item.key || '',
          item.pluginType || '',
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

// Sample audio tracks and synthesizer presets
export const SAMPLE_MUSIC_DATA = [
  { id: 1, name: 'Analog Warmth 808 Bass', category: 'Bass', bpm: 120, key: 'C Minor', durationSec: 16, tags: ['bass', 'analog', 'hip-hop'] },
  { id: 2, name: 'Cyberpunk Arp Lead', category: 'Synth Lead', bpm: 140, key: 'F# Minor', durationSec: 32, tags: ['synth', 'cyberpunk', 'lead'] },
  { id: 3, name: 'Vintage Vinyl Drum Break', category: 'Drums', bpm: 95, key: 'N/A', durationSec: 8, tags: ['drums', 'vintage', 'lo-fi'] },
  { id: 4, name: 'Dreamy Ambient Pad Chords', category: 'Pad', bpm: 110, key: 'A Major', durationSec: 64, tags: ['ambient', 'pad', 'chill'] },
  { id: 5, name: 'Glitch Percussion Loop', category: 'Percussion', bpm: 128, key: 'N/A', durationSec: 16, tags: ['glitch', 'drums', 'electronic'] }
];

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.MusicDawStudioFilterEngine = MusicDawStudioFilterEngine;

  document.addEventListener('DOMContentLoaded', () => {
    const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);
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
            <div class="audio-card">
              <div class="audio-card-header">
                <h3>${item.name}</h3>
                <span class="category-badge">${item.category}</span>
              </div>
              <p>BPM: <strong>${item.bpm}</strong> | Key: <strong>${item.key}</strong> | Duration: <strong>${item.durationSec}s</strong></p>
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
