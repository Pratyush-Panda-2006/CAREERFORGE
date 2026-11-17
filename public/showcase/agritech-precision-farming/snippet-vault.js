/**
 * Agritech Precision Farming - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores telemetry calculation formulas, sensor configs, and drone waypoint scripts.
 */

export class AgritechPrecisionFarmingSnippetVault {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'agritech_snippet_vault_v1';
    this.snippets = [];
    this.listeners = [];
    this.loadFromStorage();
    if (this.snippets.length === 0) {
      this.seedDefaultSnippets();
    }
  }

  seedDefaultSnippets() {
    this.snippets = [
      {
        id: 'snip-ndvi-vigor',
        title: 'NDVI Crop Vigor Calculation Kernel',
        category: 'FORMULA',
        tags: ['NDVI', 'SPECTRAL', 'SATELLITE'],
        code: `function calculateNDVI(nir, red) {\n  const denom = nir + red;\n  if (denom === 0) return 0;\n  return (nir - red) / denom;\n}`,
        description: 'Computes Normalized Difference Vegetation Index from near-infrared and red bands.',
        createdAt: Date.now() - 3600000
      },
      {
        id: 'snip-irrigation-schedule',
        title: 'Soil Evapotranspiration Moisture Rule',
        category: 'IRRIGATION',
        tags: ['SOIL', 'IRRIGATION', 'ET0'],
        code: `function shouldIrrigate(currentMoisture, fieldCapacity, threshold = 0.5) {\n  const deficit = fieldCapacity - currentMoisture;\n  return deficit > (fieldCapacity * (1 - threshold));\n}`,
        description: 'Triggers automated center-pivot irrigation based on field moisture deficit.',
        createdAt: Date.now() - 7200000
      },
      {
        id: 'snip-drone-survey',
        title: 'UAV Autonomous Grid Waypoint Planner',
        category: 'DRONE',
        tags: ['DRONE', 'UAV', 'WAYPOINTS', 'GPS'],
        code: `function generateSurveyGrid(bounds, altitudeMeters = 80, overlapPercent = 75) {\n  const swathWidth = altitudeMeters * 0.65;\n  return { swathWidth, waypointsCount: Math.ceil(bounds.area / swathWidth) };\n}`,
        description: 'Calculates flight paths and camera trigger intervals for high-res field ortho-mosaics.',
        createdAt: Date.now() - 10800000
      },
      {
        id: 'snip-nitrogen-fertigation',
        title: 'Variable-Rate Nitrogen Application Model',
        category: 'FERTILIZER',
        tags: ['NITROGEN', 'SOIL', 'VRA'],
        code: `function computeFertigationRate(targetYieldKg, soilNitrogenPpm) {\n  const requirement = targetYieldKg * 0.022;\n  return Math.max(0, requirement - (soilNitrogenPpm * 2.5));\n}`,
        description: 'Variable-rate nitrogen dosing to balance crop intake and prevent leaching.',
        createdAt: Date.now() - 14400000
      }
    ];
    this.saveToStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) this.snippets = parsed;
      }
    } catch {
      this.snippets = [];
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.snippets));
    } catch {
      // Storage restriction
    }
  }

  addSnippet(title, code, tags = [], category = 'GENERAL', description = '') {
    if (!title || !code) {
      throw new Error('Snippet title and code are required');
    }

    const cleanTitle = String(title).trim();
    // Prevent duplicate title keys
    const exists = this.snippets.some(s => s.title.toLowerCase() === cleanTitle.toLowerCase());
    if (exists) {
      throw new Error(`Snippet with title "${cleanTitle}" already exists`);
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toUpperCase()).filter(Boolean)
      : String(tags).split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

    const newSnippet = {
      id: 'snip_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      title: cleanTitle,
      category: String(category).toUpperCase(),
      tags: cleanTags.length > 0 ? cleanTags : ['TELEMETRY'],
      code: String(code).trim(),
      description: String(description || '').trim(),
      createdAt: Date.now()
    };

    this.snippets.unshift(newSnippet);
    this.saveToStorage();
    this.notifyListeners({ type: 'SNIPPET_ADDED', snippet: newSnippet });
    return newSnippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'ALL') return [...this.snippets];
    const upper = String(tag).trim().toUpperCase();
    return this.snippets.filter(s => s.tags.includes(upper));
  }

  searchSnippets(query) {
    if (!query || !String(query).trim()) return [...this.snippets];
    const tokens = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);

    return this.snippets.filter(s => {
      const searchableText = `${s.title} ${s.description} ${s.tags.join(' ')} ${s.category}`.toLowerCase();
      return tokens.every(token => searchableText.includes(token));
    });
  }

  getAllTags() {
    const set = new Set();
    for (const s of this.snippets) {
      for (const t of s.tags) set.add(t);
    }
    return Array.from(set).sort();
  }

  deleteSnippet(id) {
    this.snippets = this.snippets.filter(s => s.id !== id);
    this.saveToStorage();
    this.notifyListeners({ type: 'SNIPPET_DELETED', id });
  }

  subscribe(listener) {
    if (typeof listener === 'function') this.listeners.push(listener);
  }

  notifyListeners(evt) {
    for (const fn of this.listeners) {
      try { fn(evt); } catch { /* Safe */ }
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('snippetsListContainer');
    if (!listContainer) return;

    const vault = new AgritechPrecisionFarmingSnippetVault();

    const searchInput = document.getElementById('snippetSearchInput');
    const tagsContainer = document.getElementById('tagFilterChips');
    const addSnippetModal = document.getElementById('addSnippetModal');
    const openAddBtn = document.getElementById('openAddSnippetBtn');
    const closeAddBtn = document.getElementById('closeAddSnippetBtn');
    const saveSnippetBtn = document.getElementById('saveSnippetBtn');
    const toastEl = document.getElementById('copyToast');

    let activeTag = 'ALL';

    function showToast(msg) {
      if (!toastEl) return;
      toastEl.textContent = msg;
      toastEl.classList.add('show');
      setTimeout(() => toastEl.classList.remove('show'), 2400);
    }

    function renderTagChips() {
      if (!tagsContainer) return;
      tagsContainer.replaceChildren();

      const tags = ['ALL', ...vault.getAllTags()];
      for (const t of tags) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `tag-chip ${activeTag === t ? 'active' : ''}`;
        btn.textContent = t;
        btn.addEventListener('click', () => {
          activeTag = t;
          renderTagChips();
          renderSnippets();
        });
        tagsContainer.appendChild(btn);
      }
    }

    function renderSnippets() {
      listContainer.replaceChildren();
      const query = searchInput ? searchInput.value : '';

      let results = vault.searchSnippets(query);
      if (activeTag !== 'ALL') {
        results = results.filter(s => s.tags.includes(activeTag));
      }

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-vault';
        empty.textContent = 'No precision agriculture presets match your criteria.';
        listContainer.appendChild(empty);
        return;
      }

      for (const snip of results) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const head = document.createElement('div');
        head.className = 'snippet-head';

        const titleBox = document.createElement('div');
        const title = document.createElement('h3');
        title.className = 'snippet-title';
        title.textContent = snip.title;

        const cat = document.createElement('span');
        cat.className = 'snippet-cat';
        cat.textContent = snip.category;
        titleBox.append(cat, title);

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = '📋 Copy Preset';
        copyBtn.addEventListener('click', () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(snip.code).then(() => {
              showToast(`Copied "${snip.title}" to clipboard!`);
            });
          }
        });

        head.append(titleBox, copyBtn);

        const desc = document.createElement('p');
        desc.className = 'snippet-desc';
        desc.textContent = snip.description;

        const pre = document.createElement('pre');
        pre.className = 'snippet-code';
        const code = document.createElement('code');
        code.textContent = snip.code;
        pre.appendChild(code);

        const foot = document.createElement('div');
        foot.className = 'snippet-foot';

        const tagList = document.createElement('div');
        tagList.className = 'card-tags';
        for (const t of snip.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'pill-tag';
          tSpan.textContent = `#${t}`;
          tagList.appendChild(tSpan);
        }

        foot.appendChild(tagList);
        card.append(head, desc, pre, foot);
        listContainer.appendChild(card);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => renderSnippets());
    }

    if (openAddBtn && addSnippetModal) {
      openAddBtn.addEventListener('click', () => {
        addSnippetModal.hidden = false;
      });
    }

    if (closeAddBtn && addSnippetModal) {
      closeAddBtn.addEventListener('click', () => {
        addSnippetModal.hidden = true;
      });
    }

    if (saveSnippetBtn && addSnippetModal) {
      saveSnippetBtn.addEventListener('click', () => {
        const titleIn = document.getElementById('newSnippetTitle');
        const codeIn = document.getElementById('newSnippetCode');
        const tagsIn = document.getElementById('newSnippetTags');
        const descIn = document.getElementById('newSnippetDesc');

        if (!titleIn || !codeIn || !titleIn.value.trim() || !codeIn.value.trim()) {
          alert('Title and code are required!');
          return;
        }

        try {
          vault.addSnippet(
            titleIn.value.trim(),
            codeIn.value.trim(),
            tagsIn ? tagsIn.value : '',
            'CUSTOM',
            descIn ? descIn.value : ''
          );
          addSnippetModal.hidden = true;
          titleIn.value = '';
          codeIn.value = '';
          if (tagsIn) tagsIn.value = '';
          if (descIn) descIn.value = '';
          renderTagChips();
          renderSnippets();
          showToast('New snippet saved successfully!');
        } catch (err) {
          alert(err.message);
        }
      });
    }

    vault.subscribe(() => {
      renderTagChips();
      renderSnippets();
    });

    renderTagChips();
    renderSnippets();
  });
}
