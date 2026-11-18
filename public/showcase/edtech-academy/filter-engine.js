/**
 * EdtechAcademyFilterEngine - Dynamic Search, Tag Filtering & Multi-Column Sorting Engine
 */

export class EdtechAcademyFilterEngine {
  constructor(options = {}) {
    this.initialData = Array.isArray(options.data) ? [...options.data] : this._getDefaultCourses();
    this.keyword = options.keyword || '';
    this.selectedTags = new Set(options.tags || []);
    this.sortField = options.sortField || 'name';
    this.sortDirection = options.sortDirection || 'asc';
  }

  _getDefaultCourses() {
    return [
      {
        id: 'cs_101',
        name: 'Fullstack Web Engineering Bootcamp',
        description: 'Comprehensive mastery of modern React, Node, and TypeScript architectures.',
        rating: 4.9,
        popularity: 4500,
        tags: ['frontend', 'react', 'fullstack']
      },
      {
        id: 'cs_102',
        name: 'Algorithms & Distributed Systems',
        description: 'Advanced data structures, consensus mechanisms, and scalable backend design.',
        rating: 4.85,
        popularity: 3800,
        tags: ['backend', 'algorithms', 'system-design']
      },
      {
        id: 'cs_103',
        name: 'Machine Learning & Neural Architectures',
        description: 'Deep dive into PyTorch, transformers, LLM fine-tuning, and neural reasoning.',
        rating: 4.95,
        popularity: 5200,
        tags: ['ai', 'python', 'deep-learning']
      },
      {
        id: 'cs_104',
        name: 'DevOps & Cloud Native Kubernetes',
        description: 'CI/CD pipeline construction, Docker containerization, and Terraform provisioning.',
        rating: 4.75,
        popularity: 2900,
        tags: ['devops', 'cloud', 'infrastructure']
      }
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

    const field = this.sortField;
    const isDesc = this.sortDirection === 'desc';

    result.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(String(valB));
        return isDesc ? -cmp : cmp;
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return isDesc ? valB - valA : valA - valB;
    });

    return result;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new EdtechAcademyFilterEngine();
    const keywordInput = document.getElementById('keywordInput');
    const clearBtn = document.getElementById('clearSearchBtn');
    const sortFieldSelect = document.getElementById('sortFieldSelect');
    const toggleDirBtn = document.getElementById('toggleSortDirBtn');
    const tagChipsWrap = document.getElementById('tagChipsWrap');
    const resultsGrid = document.getElementById('resultsGrid');
    const resultCount = document.getElementById('resultCount');

    const allTags = ['frontend', 'react', 'fullstack', 'backend', 'algorithms', 'ai', 'python', 'devops'];

    function renderTags() {
      if (!tagChipsWrap) return;
      tagChipsWrap.innerHTML = allTags.map(tag => {
        const isActive = engine.selectedTags.has(tag) ? 'active' : '';
        return `<button type="button" class="tag-chip ${isActive}" data-tag="${tag}">${tag}</button>`;
      }).join('');

      tagChipsWrap.querySelectorAll('.tag-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = btn.getAttribute('data-tag');
          engine.toggleTag(t);
          renderTags();
          renderResults();
        });
      });
    }

    function renderResults() {
      const items = engine.apply();
      if (resultCount) resultCount.textContent = items.length;
      if (!resultsGrid) return;

      if (items.length === 0) {
        resultsGrid.innerHTML = `
          <div class="empty-state">
            <span class="empty-icon">🔍</span>
            <p>No courses match your active search and filter criteria.</p>
          </div>
        `;
        return;
      }

      resultsGrid.innerHTML = items.map(it => `
        <div class="item-card">
          <div class="item-header">
            <span class="badge">COURSE</span>
            <span class="rating">⭐ ${it.rating}</span>
          </div>
          <h3>${it.name}</h3>
          <p>${it.description}</p>
          <div class="tag-list">
            ${(it.tags || []).map(t => `<span class="pill">${t}</span>`).join('')}
          </div>
          <div class="item-footer">
            <span class="metric">👥 ${it.popularity.toLocaleString()} enrolled</span>
          </div>
        </div>
      `).join('');
    }

    keywordInput?.addEventListener('input', (e) => {
      engine.filterByKeyword(e.target.value);
      renderResults();
    });

    clearBtn?.addEventListener('click', () => {
      if (keywordInput) keywordInput.value = '';
      engine.filterByKeyword('');
      engine.clearTags();
      renderTags();
      renderResults();
    });

    sortFieldSelect?.addEventListener('change', (e) => {
      engine.sort(e.target.value, engine.sortDirection);
      renderResults();
    });

    toggleDirBtn?.addEventListener('click', () => {
      const nextDir = engine.sortDirection === 'asc' ? 'desc' : 'asc';
      engine.sort(engine.sortField, nextDir);
      toggleDirBtn.textContent = nextDir.toUpperCase() + (nextDir === 'asc' ? ' ↑' : ' ↓');
      renderResults();
    });

    renderTags();
    renderResults();
  });
}
