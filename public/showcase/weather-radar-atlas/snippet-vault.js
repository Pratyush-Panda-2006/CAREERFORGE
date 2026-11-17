/**
 * Weather Radar Atlas - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores meteorological radar color tables, NEXRAD Level II/III beam equations, and geospatial styling presets.
 */

export class WeatherRadarAtlasSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'nexrad-reflectivity-color-scale',
        title: 'NWS Standard dBZ Reflectivity Color Palette',
        code: `{\n  "palette": "NWS_REFLECTIVITY",\n  "thresholds": [\n    { "dbz": 5, "color": "#04e9e7", "precip": "Light Mist" },\n    { "dbz": 20, "color": "#019ff4", "precip": "Light Rain" },\n    { "dbz": 35, "color": "#0300f4", "precip": "Moderate Rain" },\n    { "dbz": 50, "color": "#fd9a01", "precip": "Heavy Downpour" },\n    { "dbz": 65, "color": "#e20001", "precip": "Severe Hail" }\n  ]\n}`,
        tags: ['nexrad', 'reflectivity', 'palette', 'meteorology']
      },
      {
        id: 'doppler-velocity-dealiasing-kernel',
        title: 'Doppler Velocity Nyquist Radial Wind Dealiasing Filter',
        code: `function dealiasVelocity(vRaw, vNyquist, vRef) {\n  const delta = vRaw - vRef;\n  const folds = Math.round(delta / (2 * vNyquist));\n  return vRaw - (folds * 2 * vNyquist);\n}`,
        tags: ['doppler', 'wind', 'algorithms', 'signal-processing']
      },
      {
        id: 'mesocyclone-vorticity-signature',
        title: 'Tornadic Vortex Signature (TVS) Gate-to-Gate Shear',
        code: `{\n  "shear_threshold_s_minus_1": 0.015,\n  "radial_distance_km": 65.4,\n  "delta_velocity_knots": 84.0,\n  "rotation_sense": "Cyclonic",\n  "alert_tier": "Tornado Warning"\n}`,
        tags: ['severe-weather', 'vortex', 'tvs', 'tornado']
      },
      {
        id: 'satellite-geostationary-ir-enhancement',
        title: 'GOES-R Band 13 Clean Infrared Cloud-Top Enhancement',
        code: `{\n  "sensor": "ABI Band 13",\n  "wavelength_microns": 10.3,\n  "enhancement_curve": "BD_CURVE",\n  "overshooting_top_threshold_kelvin": 195.0,\n  "convective_burst_color": "#ffffff"\n}`,
        tags: ['satellite', 'infrared', 'clouds', 'goes-r']
      },
      {
        id: 'dual-pol-differential-reflectivity',
        title: 'Dual-Pol Hydrometeor Classification (ZDR / Correlation KDP)',
        code: `{\n  "zdr_db": 3.8,\n  "rho_hv": 0.98,\n  "kdp_deg_km": 2.4,\n  "classified_hydrometeor": "Large Oblate Raindrops (Tropical Convection)"\n}`,
        tags: ['dual-pol', 'zdr', 'hydrometeor', 'classification']
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets];
  }

  addSnippet(title, code, tags = []) {
    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new Error('Snippet title is required');
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      throw new Error('Snippet code content is required');
    }

    const trimmedTitle = title.trim();
    const id = trimmedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const duplicate = this.snippets.some(s => s.id === id || s.title.toLowerCase() === trimmedTitle.toLowerCase());
    if (duplicate) {
      throw new Error(`Snippet with title or ID '${trimmedTitle}' already exists in vault.`);
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : String(tags).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    const newSnippet = {
      id,
      title: trimmedTitle,
      code: code.trim(),
      tags: [...new Set(normalizedTags)]
    };

    this.snippets.push(newSnippet);
    return newSnippet;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return [...this.snippets];
    }
    const cleanTag = tag.trim().toLowerCase();
    return this.snippets.filter(s => s.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      return [...this.snippets];
    }

    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return this.snippets.filter(snippet => {
      const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
      return tokens.every(token => fullText.includes(token));
    });
  }

  getAllTags() {
    const tagSet = new Set();
    this.snippets.forEach(s => s.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('snippetsGrid');
    if (!grid) return;

    const vault = new WeatherRadarAtlasSnippetVault();
    let activeTag = 'all';
    let searchQuery = '';

    const searchInput = document.getElementById('searchQueryInput');
    const tagBar = document.getElementById('tagFilterBar');
    const toast = document.getElementById('copyToast');

    function showToast(msg) {
      if (!toast) return;
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function renderTagFilters() {
      if (!tagBar) return;
      tagBar.replaceChildren();

      const tags = ['all', ...vault.getAllTags()];
      tags.forEach(tag => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = `filter-chip ${activeTag === tag ? 'active' : ''}`;
        chip.textContent = tag === 'all' ? '🛰️ All Presets' : `#${tag}`;
        chip.addEventListener('click', () => {
          activeTag = tag;
          renderTagFilters();
          renderCards();
        });
        tagBar.appendChild(chip);
      });
    }

    function renderCards() {
      grid.replaceChildren();

      let results = activeTag === 'all' ? vault.getAllSnippets() : vault.filterByTag(activeTag);
      if (searchQuery) {
        const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
        results = results.filter(snippet => {
          const fullText = `${snippet.title} ${snippet.code} ${snippet.tags.join(' ')}`.toLowerCase();
          return tokens.every(token => fullText.includes(token));
        });
      }

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.style.color = 'var(--text-muted)';
        empty.style.gridColumn = '1 / -1';
        empty.style.textAlign = 'center';
        empty.style.padding = '3rem 1rem';
        empty.textContent = 'No meteorological radar presets found matching your search.';
        grid.appendChild(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'card-top';

        const title = document.createElement('h3');
        title.className = 'snippet-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = '📋 Copy Preset';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}"!`);
          }).catch(() => {
            showToast('Preset copied!');
          });
        });

        topRow.append(title, copyBtn);

        const codeBox = document.createElement('div');
        codeBox.className = 'code-container';
        const pre = document.createElement('pre');
        pre.textContent = item.code;
        codeBox.appendChild(pre);

        const tagList = document.createElement('div');
        tagList.className = 'tag-list';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'card-tag';
          tSpan.textContent = `#${t}`;
          tagList.appendChild(tSpan);
        }

        card.append(topRow, codeBox, tagList);
        grid.appendChild(card);
      }
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCards();
      });
    }

    renderTagFilters();
    renderCards();
  });
}
