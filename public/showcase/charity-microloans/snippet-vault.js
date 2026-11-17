/**
 * Charity Microloans - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores micro-lending term sheets, community guarantor templates, and impact reporting schemas.
 */

export class CharityMicroloansSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'zero-interest-seed-loan',
        title: 'Zero-Interest Female Agripreneur Seed Loan',
        code: `{\n  "loan_type": "MicroSeedGrant",\n  "principal_usd": 750.0,\n  "interest_rate_apr": 0.0,\n  "grace_period_months": 3,\n  "tenor_months": 18,\n  "monthly_repayment_usd": 50.0,\n  "currency": "USD"\n}`,
        tags: ['loan', 'microfinance', 'seed', 'agriculture']
      },
      {
        id: 'peer-guarantor-circle',
        title: '5-Member Peer Mutual Guarantee Agreement',
        code: `{\n  "circle_size": 5,\n  "collective_liability_cap_percent": 20.0,\n  "weekly_village_meeting_cadence": true,\n  "emergency_resilience_fund_contribution_usd": 5.0,\n  "peer_signoff_required": 4\n}`,
        tags: ['guarantor', 'community', 'compliance', 'solidarity']
      },
      {
        id: 'clean-water-kiosk-financing',
        title: 'Community Solar Water Kiosk Capital Lease',
        code: `{\n  "project_category": "WASH",\n  "facility_size_usd": 3200.0,\n  "subsidized_grant_offset_percent": 30.0,\n  "expected_beneficiary_families": 450,\n  "repayment_linked_to_utility_tariffs": true\n}`,
        tags: ['infrastructure', 'water', 'solar', 'impact']
      },
      {
        id: 'repayment-holiday-resilience',
        title: 'Climate Disaster Repayment Pause Moratorium',
        code: `{\n  "trigger": "SevereDroughtIndex_V3",\n  "automatic_repayment_pause_days": 90,\n  "penalty_waiver": 1.0,\n  "restructuring_support_advisor": true\n}`,
        tags: ['climate', 'relief', 'moratorium', 'resilience']
      },
      {
        id: 'artisan-craft-working-capital',
        title: 'Fair-Trade Textile Cooperative Working Capital',
        code: `{\n  "coop_members_count": 28,\n  "inventory_purchase_financing_usd": 1500.0,\n  "repayment_due_on_export_sales": true,\n  "verified_fair_trade_audit": "FLO-CERT-2026"\n}`,
        tags: ['fair-trade', 'artisans', 'coop', 'capital']
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

    const vault = new CharityMicroloansSnippetVault();
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
        chip.textContent = tag === 'all' ? '🌱 All Loan Presets' : `#${tag}`;
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
        empty.textContent = 'No microfinance presets found matching your search.';
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
        copyBtn.textContent = '📋 Copy Terms';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" terms!`);
          }).catch(() => {
            showToast('Template copied!');
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
