/**
 * TravelOdysseySnippetVault
 * Reusable preset snippet library & tag-based search vault for visa rules, immunization guidelines, and flight PNR schemas.
 */
export class TravelOdysseySnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'travel-snip-1',
        title: 'Schengen 90/180-Day Rolling Stay Calculator',
        description: 'Immigration compliance logic calculating remaining authorized duration in Schengen zone.',
        category: 'Visa & Immigration',
        tags: ['visa', 'schengen', 'immigration', 'passport', 'europe'],
        code: JSON.stringify({
          zone: 'Schengen Area',
          max_stay_days: 90,
          rolling_window_days: 180,
          passport_validity_buffer_months: 3,
          etias_authorization_required: true,
          overstay_penalty_flag: 'Immediate entry ban'
        }, null, 2),
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'travel-snip-2',
        title: 'WHO Tropical Immunization & Malaria Protocol',
        description: 'CDC/WHO mandatory international vaccination requirements and chemoprophylaxis regimens.',
        category: 'Health & Vaccines',
        tags: ['health', 'vaccines', 'malaria', 'who', 'cdc'],
        code: JSON.stringify({
          mandatory_vaccines: ['Yellow Fever ICVP (International Certificate)'],
          recommended_prophylaxis: 'Atovaquone-proguanil (Malarone) daily with meals',
          dengue_fever_caution: 'DEET > 30% insect repellant required at dawn/dusk',
          typhoid_conjugate_validity_years: 3
        }, null, 2),
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'travel-snip-3',
        title: 'IATA Cabin & Checked Baggage Standard',
        description: 'Global airline consortium dimension envelopes, lithium battery restrictions, and fees.',
        category: 'Flight Logistics',
        tags: ['baggage', 'iata', 'flights', 'luggage', 'airline'],
        code: JSON.stringify({
          carry_on_dimensions_cm: '56 x 36 x 23',
          carry_on_max_weight_kg: 8.0,
          checked_standard_weight_kg: 23.0,
          powerbank_max_capacity_wh: 100.0,
          liquid_rule: '100ml transparent resealable 1L bag'
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'travel-snip-4',
        title: 'Nomadic Multi-Currency Cashflow Envelope',
        description: 'Target expense distribution buffer factoring FX conversion spreads and card fees.',
        category: 'Financial Planning',
        tags: ['budget', 'currency', 'expenses', 'finance', 'fx'],
        code: JSON.stringify({
          lodging_and_stays_pct: 45.0,
          local_food_and_transit_pct: 30.0,
          activities_and_excursions_pct: 15.0,
          emergency_medical_contingency_pct: 10.0,
          zero_foreign_transaction_fee_cards_primary: true
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'travel-snip-5',
        title: 'Global Distribution System (GDS) PNR Ticket',
        description: 'Standard Amadeus/Sabre airline electronic passenger itinerary data schema.',
        category: 'Booking Protocols',
        tags: ['pnr', 'gds', 'amadeus', 'ticketing', 'flight'],
        code: JSON.stringify({
          pnr_locator: 'X9F2LM',
          ticketing_carrier: 'LH (Lufthansa)',
          cabin_class: 'Business (J)',
          fare_basis: 'JFFEU',
          segment_1: {
            origin: 'FRA',
            destination: 'HND',
            departure_utc: '2026-05-12T13:45:00Z',
            aircraft: 'A350-900'
          }
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
      id: snippet.id || `travel-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    wrapper.className = 'to-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'to-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'to-vault-search-input';
    searchInput.placeholder = 'Search travel presets, visa rules, baggage allowances, PNR...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'to-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'to-tag-pill to-tag-pill-active';
    allBtn.textContent = 'All Travel Tags';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'to-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'to-vault-empty';
        empty.textContent = 'No travel snippets match the specified query.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'to-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'to-card-top';

        const title = document.createElement('h3');
        title.className = 'to-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'to-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'to-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'to-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'to-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'to-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'to-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'to-btn-use-snippet';
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
      tagButtons.forEach(b => b.classList.remove('to-tag-pill-active'));
      allBtn.classList.add('to-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'to-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('to-tag-pill-active'));
        btn.classList.add('to-tag-pill-active');
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
