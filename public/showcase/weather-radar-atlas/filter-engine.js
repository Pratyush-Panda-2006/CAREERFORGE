/**
 * Implement dynamic search, tag filtering & multi-column sorting engine - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 */

export class WeatherRadarAtlasFilterEngine {
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : [];
    this.keyword = options.keyword || '';
    this.selectedTags = new Set(options.tags || []);
    this.sortField = options.sortField || 'name';
    this.sortDirection = options.sortDirection || 'asc';
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

    if (this.keyword) {
      const q = this.keyword;
      result = result.filter(item => {
        const name = (item.name || '').toLowerCase();
        const desc = (item.description || '').toLowerCase();
        const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
        return name.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    if (this.selectedTags.size > 0) {
      result = result.filter(item => {
        if (!Array.isArray(item.tags)) return false;
        return Array.from(this.selectedTags).every(t => item.tags.includes(t));
      });
    }

    result.sort((a, b) => {
      const valA = a[this.sortField] !== undefined ? a[this.sortField] : '';
      const valB = b[this.sortField] !== undefined ? b[this.sortField] : '';

      let comp = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comp = valA - valB;
      } else {
        comp = String(valA).localeCompare(String(valB));
      }

      return this.sortDirection === 'desc' ? -comp : comp;
    });

    return result;
  }
}

export const defaultItems = [
  {
    "id": "w1",
    "name": "Doppler NEXRAD KOKX",
    "description": "High-resolution S-band dual-polarization precipitation radar.",
    "rating": 4.9,
    "popularity": 1420,
    "tags": [
      "doppler",
      "nexrad",
      "active"
    ]
  },
  {
    "id": "w2",
    "name": "Alpine MesoNet Station",
    "description": "Mountain pass barometric and wind gust monitoring array.",
    "rating": 4.7,
    "popularity": 890,
    "tags": [
      "mesonet",
      "surface",
      "realtime"
    ]
  },
  {
    "id": "w3",
    "name": "Coastal Marine Buoy 44025",
    "description": "Offshore sea-surface temperature and wave spectra sensor.",
    "rating": 4.8,
    "popularity": 1100,
    "tags": [
      "marine",
      "buoy",
      "coastal"
    ]
  }
];

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new WeatherRadarAtlasFilterEngine({ data: defaultItems });

    const keywordInput = document.getElementById('keywordInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const sortSelect = document.getElementById('sortFieldSelect');
    const sortDirBtn = document.getElementById('toggleSortDirBtn');
    const tagWrap = document.getElementById('tagChipsWrap');
    const resultCount = document.getElementById('resultCount');
    const resultsGrid = document.getElementById('resultsGrid');

    const allTags = Array.from(new Set(defaultItems.flatMap(i => i.tags || [])));

    function renderTags() {
      if (!tagWrap) return;
      tagWrap.replaceChildren();
      allTags.forEach(tag => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tag-chip ${engine.selectedTags.has(tag) ? 'active' : ''}`;
        btn.textContent = tag;
        btn.addEventListener('click', () => {
          engine.toggleTag(tag);
          renderTags();
          renderResults();
        });
        tagWrap.appendChild(btn);
      });
    }

    function renderResults() {
      const items = engine.apply();
      if (resultCount) resultCount.textContent = String(items.length);
      if (!resultsGrid) return;
      resultsGrid.replaceChildren();

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
          <h3>${item.name}</h3>
          <p>${item.description || ''}</p>
          <div class="card-tags">
            ${(item.tags || []).map(t => `<span class="card-tag">${t}</span>`).join('')}
          </div>
        `;
        resultsGrid.appendChild(card);
      });
    }

    keywordInput?.addEventListener('input', (e) => {
      engine.filterByKeyword(e.target.value);
      renderResults();
    });

    clearBtn?.addEventListener('click', () => {
      if (keywordInput) keywordInput.value = '';
      engine.filterByKeyword('');
      renderResults();
    });

    sortSelect?.addEventListener('change', (e) => {
      engine.sort(e.target.value, engine.sortDirection);
      renderResults();
    });

    sortDirBtn?.addEventListener('click', () => {
      const nextDir = engine.sortDirection === 'asc' ? 'desc' : 'asc';
      engine.sort(engine.sortField, nextDir);
      if (sortDirBtn) sortDirBtn.textContent = nextDir === 'asc' ? 'ASC ↑' : 'DESC ↓';
      renderResults();
    });

    renderTags();
    renderResults();
  });
}
