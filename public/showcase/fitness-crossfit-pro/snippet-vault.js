/**
 * Fitness Crossfit Pro - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores high-intensity WOD templates, Olympic lifting percentage cycles, and interval timers.
 */

export class FitnessCrossfitProSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'hero-wod-murph',
        title: 'Hero WOD "Murph" Standard Benchmark',
        code: `{\n  "wod_name": "Murph",\n  "type": "For Time",\n  "vest_weight_lbs": 20,\n  "structure": [\n    "1 Mile Run",\n    "100 Pull-ups",\n    "200 Push-ups",\n    "300 Air Squats",\n    "1 Mile Run"\n  ],\n  "partitioning_permitted": true\n}`,
        tags: ['wod', 'hero', 'endurance', 'bodyweight']
      },
      {
        id: 'olympic-snatch-percentage-cycle',
        title: '7-Week Olympic Snatch Wave Loading Cycle',
        code: `{\n  "focus": "Snatch & Snatch Balance",\n  "wave_protocol": [\n    { "week": 1, "sets": 5, "reps": 3, "pct_1rm": 75 },\n    { "week": 2, "sets": 4, "reps": 2, "pct_1rm": 82 },\n    { "week": 3, "sets": 3, "reps": 1, "pct_1rm": 90 },\n    { "week": 4, "sets": 3, "reps": 3, "pct_1rm": 65 }\n  ]\n}`,
        tags: ['weightlifting', 'olympic', 'strength', 'snatch']
      },
      {
        id: 'tabata-hiit-engine',
        title: 'Tabata 8-Round High Intensity Interval Protocol',
        code: `{\n  "protocol": "Classic Tabata",\n  "rounds": 8,\n  "work_sec": 20,\n  "rest_sec": 10,\n  "target_movements": ["Assault Bike Calories", "Burpee Box Jump Overs"],\n  "heart_rate_zone": "Zone 5 (90-100% HRmax)"\n}`,
        tags: ['hiit', 'tabata', 'cardio', 'intervals']
      },
      {
        id: 'clean-and-jerk-complex',
        title: 'Clean & Jerk Technical Primer Complex',
        code: `{\n  "complex_sequence": [\n    "1 Clean Pull from Deficit",\n    "1 Hang Squat Clean",\n    "1 Front Squat with 3s Pause",\n    "1 Split Jerk with Footwork Check"\n  ],\n  "rpe": 8,\n  "rest_between_sets_sec": 120\n}`,
        tags: ['weightlifting', 'clean-jerk', 'technique', 'barbell']
      },
      {
        id: 'mobility-recovery-flow',
        title: 'Post-Metcon Hip & Thoracic Spine Mobility Flow',
        code: `{\n  "duration_min": 15,\n  "poses": [\n    { "name": "Couch Stretch", "hold_sec": 120, "bilateral": true },\n    { "name": "Pigeon Pose on Box", "hold_sec": 90, "bilateral": true },\n    { "name": "T-Spine Foam Roller Extension", "reps": 10 }\n  ]\n}`,
        tags: ['mobility', 'recovery', 'stretching', 'wellness']
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

    const vault = new FitnessCrossfitProSnippetVault();
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
        chip.textContent = tag === 'all' ? '🏋️ All WODs' : `#${tag}`;
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
        empty.textContent = 'No CrossFit workout templates found matching your query.';
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
        copyBtn.textContent = '📋 Copy WOD';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" WOD!`);
          }).catch(() => {
            showToast('WOD copied!');
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
