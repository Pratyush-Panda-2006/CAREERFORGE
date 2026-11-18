/**
 * AI Voice Studio - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 * Issue #636 - Level 3 Core Feature
 *
 * Implements high-performance in-memory filtering, keyword query search, compound tag matching,
 * and multi-attribute sorting for neural AI voices and synthesizer presets.
 */

export class AiVoiceStudioFilterEngine {
  /**
   * @param {object} [options={}]
   * @param {Array<object>} [options.items]
   */
  constructor(options = {}) {
    this.sourceData = Array.isArray(options.items) ? [...options.items] : this._getDefaultDataset();
    this.searchQuery = '';
    this.selectedTags = new Set();
    this.sortField = 'clarityScore';
    this.sortDirection = 'desc'; // 'asc' | 'desc'
    this.rangeFilters = {};
    this.listeners = new Set();
  }

  /**
   * Default sample neural voice dataset
   * @returns {Array<object>}
   */
  _getDefaultDataset() {
    return [
      {
        id: 'vs-1',
        name: 'Aura Broadcast Pro',
        voiceType: 'Narrative',
        accent: 'American Neutral',
        sampleRate: 48000,
        clarityScore: 99.4,
        latencyMs: 2.1,
        tags: ['broadcast', 'neutral', 'podcast', 'studio'],
        isPro: true,
        status: 'Active'
      },
      {
        id: 'vs-2',
        name: 'Sol Modern Conversational',
        voiceType: 'Conversational',
        accent: 'British RP',
        sampleRate: 48000,
        clarityScore: 97.8,
        latencyMs: 1.8,
        tags: ['conversational', 'british', 'dialogue', 'fast'],
        isPro: false,
        status: 'Active'
      },
      {
        id: 'vs-3',
        name: 'Zephyr Cinematic Drama',
        voiceType: 'Character',
        accent: 'Mid-Atlantic',
        sampleRate: 96000,
        clarityScore: 99.1,
        latencyMs: 3.4,
        tags: ['cinematic', 'deep', 'narration', 'hd'],
        isPro: true,
        status: 'Active'
      },
      {
        id: 'vs-4',
        name: 'Vesper Calm Meditation',
        voiceType: 'Relaxation',
        accent: 'Australian Warm',
        sampleRate: 44100,
        clarityScore: 98.2,
        latencyMs: 2.6,
        tags: ['calm', 'meditation', 'soft', 'soothing'],
        isPro: false,
        status: 'Active'
      },
      {
        id: 'vs-5',
        name: 'Titan Industrial Announcer',
        voiceType: 'Commercial',
        accent: 'North American Booming',
        sampleRate: 48000,
        clarityScore: 96.9,
        latencyMs: 1.9,
        tags: ['commercial', 'booming', 'energetic', 'radio'],
        isPro: true,
        status: 'Active'
      },
      {
        id: 'vs-6',
        name: 'Lyra Interactive Assistant',
        voiceType: 'Assistant',
        accent: 'Global English',
        sampleRate: 48000,
        clarityScore: 98.7,
        latencyMs: 1.4,
        tags: ['assistant', 'ai', 'responsive', 'realtime'],
        isPro: false,
        status: 'Active'
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
    this.sortField = 'clarityScore';
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
      // 1. Keyword search across name, voiceType, accent, and tags
      if (this.searchQuery) {
        const nameMatch = item.name && item.name.toLowerCase().includes(this.searchQuery);
        const typeMatch = item.voiceType && item.voiceType.toLowerCase().includes(this.searchQuery);
        const accentMatch = item.accent && item.accent.toLowerCase().includes(this.searchQuery);
        const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(this.searchQuery));
        if (!nameMatch && !typeMatch && !accentMatch && !tagMatch) {
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
        console.error('AiVoiceStudioFilterEngine listener error:', err);
      }
    });
  }
}

// Browser UI bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AiVoiceStudioFilterEngine();

    const searchInput = document.getElementById('voiceSearchInput');
    const clearSearchBtn = document.getElementById('clearVoiceSearchBtn');
    const sortSelect = document.getElementById('sortSelect');
    const tagChips = document.querySelectorAll('.filter-chip');
    const resultsContainer = document.getElementById('voiceResultsGrid');
    const resultCountEl = document.getElementById('resultCount');
    const emptyStateEl = document.getElementById('emptyStateAlert');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');

    function renderCards(items) {
      if (!resultsContainer) return;
      resultsContainer.innerHTML = '';

      if (items.length === 0) {
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        if (resultCountEl) resultCountEl.textContent = '0 voices found';
        return;
      }

      if (emptyStateEl) emptyStateEl.classList.add('hidden');
      if (resultCountEl) resultCountEl.textContent = `${items.length} neural models matching criteria`;

      items.forEach(voice => {
        const card = document.createElement('article');
        card.className = 'voice-card';
        card.innerHTML = `
          <div class="card-header">
            <span class="voice-type">${voice.voiceType}</span>
            <span class="voice-badge ${voice.isPro ? 'pro' : 'free'}">${voice.isPro ? 'PRO MODEL' : 'STANDARD'}</span>
          </div>
          <h3 class="voice-name">${voice.name}</h3>
          <p class="voice-accent">${voice.accent}</p>
          <div class="spec-grid">
            <div class="spec-item">
              <span class="spec-label">Clarity</span>
              <span class="spec-val">${voice.clarityScore}%</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">Latency</span>
              <span class="spec-val">${voice.latencyMs}ms</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">DSP Sample</span>
              <span class="spec-val">${voice.sampleRate / 1000} kHz</span>
            </div>
          </div>
          <div class="card-tags">
            ${voice.tags.map(t => `<span class="card-tag">#${t}</span>`).join('')}
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
        if (sortSelect) sortSelect.value = 'clarityScore-desc';
        update();
      });
    }

    update();
  });
}
