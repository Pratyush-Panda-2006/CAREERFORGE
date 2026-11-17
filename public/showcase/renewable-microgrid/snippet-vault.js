/**
 * Renewable Microgrid - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Preset algorithms for solar MPPT, battery dispatch, wind pitch control, and droop regulation.
 */

export class RenewableMicrogridSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'snip-micro-01',
        title: 'Solar Photovoltaic Perturb & Observe MPPT Tracking Algorithm',
        category: 'solar',
        tags: ['solar', 'mppt', 'pv', 'inverter'],
        description: 'Dynamically tracks maximum power point (MPP) by incrementing voltage step against power gradient.',
        code: `function perturbAndObserve(vPrev, pPrev, vCurr, pCurr, step = 0.5) {
  const deltaP = pCurr - pPrev;
  const deltaV = vCurr - vPrev;

  if (deltaP > 0) {
    return deltaV > 0 ? vCurr + step : vCurr - step;
  } else {
    return deltaV > 0 ? vCurr - step : vCurr + step;
  }
}`
      },
      {
        id: 'snip-micro-02',
        title: 'Battery Energy Storage System (BESS) C-Rate Thermal Throttle',
        category: 'battery',
        tags: ['battery', 'bess', 'soc', 'thermal'],
        description: 'Calculates maximum safe charging/discharging current to prevent thermal runaway and cell degradation.',
        code: `function computeMaxBessCurrent(socPercent, cellTempC, nominalAh = 100) {
  let maxCRate = 1.0;
  if (cellTempC > 45.0) maxCRate = 0.3;
  else if (cellTempC > 38.0) maxCRate = 0.6;

  if (socPercent > 90) maxCRate = Math.min(maxCRate, 0.2);
  else if (socPercent < 15) maxCRate = Math.min(maxCRate, 0.4);

  return Number((maxCRate * nominalAh).toFixed(2));
}`
      },
      {
        id: 'snip-micro-03',
        title: 'Wind Turbine Aerodynamic Pitch Angle Regulating Profile',
        category: 'wind',
        tags: ['wind', 'turbine', 'aerodynamics', 'pitch'],
        description: 'Feathers turbine blades when wind speed exceeds rated velocity (12 m/s) up to cut-out limit (25 m/s).',
        code: `function calculateBladePitch(windSpeedMs, ratedSpeed = 12.0, cutOutSpeed = 25.0) {
  if (windSpeedMs < ratedSpeed) return 0.0;
  if (windSpeedMs >= cutOutSpeed) return 90.0; // Fully feathered stop

  const ratio = (windSpeedMs - ratedSpeed) / (cutOutSpeed - ratedSpeed);
  return Number((ratio * 30.0).toFixed(2));
}`
      },
      {
        id: 'snip-micro-04',
        title: 'Islanding Microgrid P-f Frequency Droop Characteristic',
        category: 'grid',
        tags: ['grid', 'droop', 'frequency', 'islanding'],
        description: 'Active power injection adjustment based on grid frequency deviation from nominal 50Hz.',
        code: `function droopFrequencyResponse(fGrid, fNominal = 50.0, droopPercentage = 4.0, pRated = 500) {
  const deltaF = fNominal - fGrid;
  const droopCoeff = pRated / (fNominal * (droopPercentage / 100));
  const deltaP = deltaF * droopCoeff;
  return Number(Math.max(-pRated, Math.min(pRated, deltaP)).toFixed(2));
}`
      }
    ];
  }

  getAll() {
    return this.snippets;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') return this.snippets;
    const lower = tag.toLowerCase();
    return this.snippets.filter(s =>
      s.category.toLowerCase() === lower ||
      s.tags.some(t => t.toLowerCase() === lower)
    );
  }

  searchSnippets(query) {
    if (!query || !query.trim()) return this.snippets;
    const terms = query.toLowerCase().trim().split(/\s+/);
    return this.snippets.filter(s => {
      const matchCorpus = `${s.title} ${s.description} ${s.category} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
      return terms.every(term => matchCorpus.includes(term));
    });
  }

  addSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required fields');
    }
    const newSnippet = {
      id: snippet.id || `snip-micro-${Date.now()}`,
      title: snippet.title.trim(),
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => t.toLowerCase()) : ['custom'],
      description: snippet.description || 'Custom microgrid control snippet',
      code: snippet.code.trim()
    };
    this.snippets.unshift(newSnippet);
    return newSnippet;
  }
}

// UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('snippetList');
    if (!listContainer) return;

    const vault = new RenewableMicrogridSnippetVault();
    let currentTag = 'all';

    const searchInput = document.getElementById('searchSnippetInput');
    const tagBar = document.getElementById('tagFilterBar');
    const modal = document.getElementById('addSnippetModal');
    const openModalBtn = document.getElementById('openAddModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const snippetForm = document.getElementById('newSnippetForm');

    function renderSnippets(items) {
      listContainer.replaceChildren();

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-vault';
        empty.textContent = 'No microgrid algorithm presets found matching your query.';
        listContainer.appendChild(empty);
        return;
      }

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const head = document.createElement('div');
        head.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(item.code);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
          } catch {
            copyBtn.textContent = 'Error';
          }
        });

        head.append(title, copyBtn);

        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = item.description;

        const tagList = document.createElement('div');
        tagList.className = 'tag-pills';

        for (const t of item.tags) {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = `#${t}`;
          tagList.appendChild(pill);
        }

        const pre = document.createElement('pre');
        pre.className = 'code-block';
        const code = document.createElement('code');
        code.textContent = item.code;
        pre.appendChild(code);

        card.append(head, desc, tagList, pre);
        listContainer.appendChild(card);
      }
    }

    function applyFilters() {
      const q = searchInput?.value || '';
      let results = vault.filterByTag(currentTag);
      if (q.trim()) {
        const terms = q.toLowerCase().trim().split(/\s+/);
        results = results.filter(s => {
          const text = `${s.title} ${s.description} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
          return terms.every(t => text.includes(t));
        });
      }
      renderSnippets(results);
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    if (tagBar) {
      tagBar.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('filter-pill')) {
          document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          target.classList.add('active');
          currentTag = target.dataset.tag || 'all';
          applyFilters();
        }
      });
    }

    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (snippetForm) {
      snippetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('inputSnippetTitle')?.value || '';
        const catVal = document.getElementById('inputSnippetCategory')?.value || 'general';
        const tagsVal = document.getElementById('inputSnippetTags')?.value || '';
        const descVal = document.getElementById('inputSnippetDesc')?.value || '';
        const codeVal = document.getElementById('inputSnippetCode')?.value || '';

        try {
          vault.addSnippet({
            title: titleVal,
            category: catVal,
            tags: tagsVal.split(',').map(s => s.trim()).filter(Boolean),
            description: descVal,
            code: codeVal
          });
          snippetForm.reset();
          modal?.classList.remove('active');
          applyFilters();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    renderSnippets(vault.getAll());
  });
}
