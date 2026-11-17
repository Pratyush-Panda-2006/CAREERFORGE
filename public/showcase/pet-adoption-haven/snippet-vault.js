/**
 * Pet Adoption Haven - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Provides categorized rescue intake forms, medical protocol templates, and clipboard export.
 */

export class PetAdoptionHavenSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'canine-vaccination-schedule',
        title: 'Core Canine Vaccination & Rabies Protocol',
        code: `{\n  "species": "canine",\n  "protocol_version": "2026.2",\n  "core_vaccines": ["DHPP", "Rabies", "Bordetella"],\n  "booster_cadence_days": 365,\n  "deworming_frequency_weeks": 4,\n  "microchip_standard": "ISO-11784"\n}`,
        tags: ['medical', 'vaccination', 'canine', 'protocol']
      },
      {
        id: 'feline-adoption-contract',
        title: 'Feline Indoor-Only Adoption Agreement Clause',
        code: `{\n  "clause_id": "FEL-IND-01",\n  "title": "Indoor Lifestyle Obligation",\n  "text": "Adopter pledges that the adopted cat shall remain strictly indoors unless secured with harness or in catio.",\n  "surrender_clause": "Shelter retains right of first refusal if adopter cannot keep pet."\n}`,
        tags: ['adoption', 'contract', 'feline', 'legal']
      },
      {
        id: 'quarantine-intake-checklist',
        title: 'Rescue Intake 14-Day Quarantine Checklist',
        code: `{\n  "step": 1,\n  "isolation_ward": "Ward-B",\n  "daily_temp_check": true,\n  "parvovirus_antigen_test": "Day 0 & Day 7",\n  "flea_tick_topical": "Apply upon arrival",\n  "behavioral_decompression_days": 3\n}`,
        tags: ['intake', 'quarantine', 'medical', 'shelter-ops']
      },
      {
        id: 'foster-home-readiness',
        title: 'Emergency Foster Home Safety Audit',
        code: `{\n  "checklist": [\n    "Secure perimeter fencing (minimum 6ft)",\n    "Toxic houseplant removal (lilies, sago palms)",\n    "Isolated quiet recovery space",\n    "24/7 emergency veterinarian contact on fridge"\n  ]\n}`,
        tags: ['foster', 'home-check', 'safety', 'volunteer']
      },
      {
        id: 'special-needs-diet-chart',
        title: 'Geriatric & Renal Diet Formulation',
        code: `{\n  "diet_class": "Renal Support",\n  "phosphorus_cap_percent": 0.4,\n  "protein_source": "Hydrolyzed poultry",\n  "hydration_supplement": "Low-sodium bone broth 50ml/day",\n  "weight_monitoring_interval": "Weekly"\n}`,
        tags: ['nutrition', 'senior-pets', 'medical', 'care']
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

    const vault = new PetAdoptionHavenSnippetVault();
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
        chip.textContent = tag === 'all' ? '🐾 All Templates' : `#${tag}`;
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
        empty.textContent = 'No pet care or shelter templates found matching your query.';
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
        copyBtn.textContent = '📋 Copy';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" to clipboard!`);
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
