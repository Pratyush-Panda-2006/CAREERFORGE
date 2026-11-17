/**
 * Neurotech Interface - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores BCI montage configurations, digital signal processing filters, and neural decoding presets.
 */

export class NeurotechInterfaceSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'eeg-bandpass-chebyshev-filter',
        title: 'EEG 0.5Hz - 45Hz 4th-Order Butterworth Bandpass Filter',
        code: `{\n  "filter_type": "butterworth",\n  "order": 4,\n  "low_cutoff_hz": 0.5,\n  "high_cutoff_hz": 45.0,\n  "sample_rate_hz": 1000,\n  "notch_filter_50_60hz": true\n}`,
        tags: ['dsp', 'filters', 'eeg', 'signal-processing']
      },
      {
        id: 'ssvep-cca-frequency-classifier',
        title: 'Canonical Correlation Analysis (CCA) SSVEP Target Recognizer',
        code: `function computeCCA(eegSegment, targetFrequencies) {\n  return targetFrequencies.map(freq => {\n    const refSignal = generateHarmonics(freq, 3, eegSegment.length);\n    return calculateMaxCorrelation(eegSegment, refSignal);\n  });\n}`,
        tags: ['ssvep', 'cca', 'visual-cortex', 'classifiers']
      },
      {
        id: 'motor-imagery-csp-spatial-filter',
        title: 'Common Spatial Pattern (CSP) Motor Cortex Feature Extractor',
        code: `{\n  "montage": "10-20_standard",\n  "active_electrodes": ["C3", "Cz", "C4"],\n  "mu_band_hz": [8.0, 12.0],\n  "beta_band_hz": [16.0, 24.0],\n  "spatial_components": 4\n}`,
        tags: ['motor-imagery', 'csp', 'mu-rhythm', 'decoding']
      },
      {
        id: 'kalman-filter-neural-cursor-decoder',
        title: 'State-Space Kalman Filter Kinematic 2D Trajectory Decoder',
        code: `{\n  "state_matrix_A": [[1, 0, 0.02, 0], [0, 1, 0, 0.02], [0, 0, 0.95, 0], [0, 0, 0, 0.95]],\n  "observation_matrix_C": "firing_rates_to_velocity",\n  "measurement_noise_R": 0.05,\n  "process_noise_Q": 0.001\n}`,
        tags: ['kalman', 'kinematics', 'prosthetics', 'spikes']
      },
      {
        id: 'p300-oddball-wave-detector',
        title: 'P300 Event-Related Potential (ERP) 300ms Positive Deflection Window',
        code: `{\n  "erp_latency_window_ms": [280, 420],\n  "baseline_correction_ms": [-100, 0],\n  "target_electrode": "Pz",\n  "threshold_uv": 5.2\n}`,
        tags: ['p300', 'erp', 'oddball', 'attention']
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

    const vault = new NeurotechInterfaceSnippetVault();
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
        chip.textContent = tag === 'all' ? '🧠 All Presets' : `#${tag}`;
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
        empty.textContent = 'No neural signal presets or BCI algorithms matching your search.';
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
        copyBtn.textContent = '📋 Copy Algorithm';
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
