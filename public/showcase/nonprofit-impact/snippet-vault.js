/**
 * NonprofitImpactSnippetVault
 * Reusable preset snippet library & tag-based search vault for carbon accounting, grant budgets, and ecological models.
 */
export class NonprofitImpactSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'impact-snip-1',
        title: 'Mangrove Carbon Sequestration Model',
        description: 'Empirical biomass conversion formula for coastal blue carbon credit issuance.',
        category: 'Carbon Accounting',
        tags: ['carbon', 'ecology', 'co2', 'mangrove', 'blue-carbon'],
        code: JSON.stringify({
          ecosystem: 'Coastal Mangrove Estuary',
          aboveground_biomass_t_ha: 142.5,
          belowground_root_t_ha: 88.0,
          soil_organic_carbon_depth_1m_t_ha: 310.2,
          annual_sequestration_rate_tco2e_ha_yr: 12.8,
          verra_vm0033_compliance: true
        }, null, 2),
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'impact-snip-2',
        title: '501(c)(3) Programmatic Budget Ratio',
        description: 'Industry benchmark fund distribution maximizing direct donor programmatic impact.',
        category: 'Financial Transparency',
        tags: ['grant', 'budget', 'transparency', 'audit', '501c3'],
        code: JSON.stringify({
          program_services_pct: 85.5,
          administrative_management_pct: 9.0,
          donor_development_fundraising_pct: 5.5,
          independent_audit_frequency: 'Quarterly',
          guidestar_platinum_seal: true
        }, null, 2),
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'impact-snip-3',
        title: 'Indigenous Canopy Reforestation Ratio',
        description: 'Multi-strata native sapling mixture designed for pest resistance and soil revival.',
        category: 'Biodiversity',
        tags: ['reforestation', 'trees', 'biodiversity', 'canopy'],
        code: JSON.stringify({
          target_density_stems_ha: 1100,
          pioneer_species_pct: 40,
          climax_canopy_hardwoods_pct: 45,
          nitrogen_fixing_understory_pct: 15,
          minimum_year3_survival_threshold_pct: 82.0
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'impact-snip-4',
        title: 'Emergency Relief Ration Matrix',
        description: 'SPHERE standards emergency nutritional and potable water allocation per family.',
        category: 'Relief Logistics',
        tags: ['relief', 'logistics', 'nutrition', 'water', 'humanitarian'],
        code: JSON.stringify({
          kcal_per_person_day: 2100,
          potable_water_liters_person_day: 15.0,
          hygiene_kit_family_months: 1,
          shelter_blankets_per_person: 2,
          cold_chain_vaccine_temp_c: [2.0, 8.0]
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'impact-snip-5',
        title: 'Community Solar Well Micro-Grant Terms',
        description: 'Milestone escrow schedule for off-grid groundwater pumping installation.',
        category: 'Governance & Contracts',
        tags: ['microgrant', 'governance', 'solar', 'water', 'community'],
        code: JSON.stringify({
          grant_amount_usd: 12500,
          tranche_1_hydrological_survey_pct: 20,
          tranche_2_solar_pv_pump_procurement_pct: 50,
          tranche_3_water_quality_potability_pct: 30,
          community_stewardship_council_seats: 5
        }, null, 2),
        createdAt: '2026-03-01T11:00:00.000Z'
      }
    ];
  }

  getSnippets() {
    return [...this.snippets];
  }

  getAllTags() {
    const set = new Set();
    for (const item of this.snippets) {
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          set.add(tag);
        }
      }
    }
    return Array.from(set).sort();
  }

  getAllCategories() {
    const set = new Set();
    for (const item of this.snippets) {
      if (item.category) {
        set.add(item.category);
      }
    }
    return Array.from(set).sort();
  }

  addSnippet(snippet) {
    if (!snippet || !snippet.title || !snippet.code) {
      throw new Error('Snippet must provide title and code');
    }
    const newSnippet = {
      id: snippet.id || `impact-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: snippet.title.trim(),
      description: (snippet.description || '').trim(),
      category: snippet.category || 'General',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => String(t).trim().toLowerCase()) : [],
      code: snippet.code,
      createdAt: snippet.createdAt || new Date().toISOString()
    };
    this.snippets.push(newSnippet);
    return newSnippet;
  }

  removeSnippet(id) {
    const idx = this.snippets.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.snippets.splice(idx, 1);
      return true;
    }
    return false;
  }

  search(query = '', selectedTag = '', selectedCategory = '') {
    const q = query.trim().toLowerCase();
    const tag = selectedTag.trim().toLowerCase();
    const cat = selectedCategory.trim().toLowerCase();

    return this.snippets.filter(item => {
      const matchesQuery = !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);

      const matchesTag = !tag || (Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase() === tag));
      const matchesCat = !cat || (item.category && item.category.toLowerCase() === cat);

      return matchesQuery && matchesTag && matchesCat;
    });
  }

  render(container, onSelect = null) {
    if (!container) return;
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'np-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'np-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'np-vault-search-input';
    searchInput.placeholder = 'Search nonprofit models, carbon formulas, grant terms...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'np-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'np-tag-pill np-tag-pill-active';
    allBtn.textContent = 'All Impact Tags';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'np-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'np-vault-empty';
        empty.textContent = 'No impact snippets match the specified search.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'np-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'np-card-top';

        const title = document.createElement('h3');
        title.className = 'np-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'np-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'np-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'np-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'np-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'np-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'np-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'np-btn-use-snippet';
        useBtn.textContent = 'Apply Template';
        useBtn.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(item);
          }
        });

        footer.append(tagList, useBtn);
        card.append(topRow, desc, codeBlock, footer);
        listContainer.append(card);
      }
    };

    allBtn.addEventListener('click', () => {
      activeTag = '';
      tagButtons.forEach(b => b.classList.remove('np-tag-pill-active'));
      allBtn.classList.add('np-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'np-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('np-tag-pill-active'));
        btn.classList.add('np-tag-pill-active');
        refreshList();
      });
      tagButtons.push(btn);
      tagFilterWrap.append(btn);
    }

    searchInput.addEventListener('input', () => refreshList());

    header.append(searchInput, tagFilterWrap);
    wrapper.append(header, listContainer);
    container.append(wrapper);

    refreshList();
  }
}
