/**
 * Agency Studio - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores kinetic design tokens, CSS layout patterns, WebGL shaders, and client proposal schemas.
 */

export class AgencyStudioSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'kinetic-typography-curve',
        title: 'Kinetic Spring Typography Easing Curve',
        code: `{\n  "damping_ratio": 0.72,\n  "stiffness": 180,\n  "mass": 1.0,\n  "bezier_fallback": "cubic-bezier(0.16, 1, 0.3, 1)",\n  "css_custom_prop": "--ease-kinetic-spring"\n}`,
        tags: ['typography', 'motion', 'animation', 'css']
      },
      {
        id: 'bento-grid-layout',
        title: 'Responsive Asymmetric Bento Grid System',
        code: `{\n  "display": "grid",\n  "grid_template_columns": "repeat(12, 1fr)",\n  "gap": "1.5rem",\n  "hero_span": "span 8",\n  "sidebar_span": "span 4",\n  "aspect_ratio": "16 / 9"\n}`,
        tags: ['layout', 'grid', 'css', 'ui']
      },
      {
        id: 'webgl-chromatic-bloom',
        title: 'WebGL Chromatic Aberration Post-Pass',
        code: `uniform sampler2D tDiffuse;\nvarying vec2 vUv;\nvoid main() {\n  vec2 offset = vec2(0.003, 0.0);\n  float r = texture2D(tDiffuse, vUv + offset).r;\n  float g = texture2D(tDiffuse, vUv).g;\n  float b = texture2D(tDiffuse, vUv - offset).b;\n  gl_FragColor = vec4(r, g, b, 1.0);\n}`,
        tags: ['shader', 'webgl', '3d', 'effects']
      },
      {
        id: 'brand-palette-tokens',
        title: 'Design Token Palette Specification',
        code: `{\n  "brand_primary": "oklch(62.8% 0.257 29.23)",\n  "brand_secondary": "oklch(74.6% 0.16 232.66)",\n  "surface_dark": "oklch(15.2% 0.02 264.1)",\n  "contrast_ratio_wcag": "AAA_7_to_1"\n}`,
        tags: ['tokens', 'colors', 'oklch', 'branding']
      },
      {
        id: 'creative-pitch-schema',
        title: 'Agency Discovery Sprint Proposal Scope',
        code: `{\n  "sprint_duration_weeks": 3,\n  "milestones": [\n    { "phase": "Brand Architecture", "hours": 40 },\n    { "phase": "Interactive Prototyping", "hours": 65 },\n    { "phase": "Design System Handoff", "hours": 35 }\n  ],\n  "deliverables": ["Figma Token Library", "Next.js Component Suite"]\n}`,
        tags: ['proposal', 'sprint', 'scoping', 'agency']
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

    const vault = new AgencyStudioSnippetVault();
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
        chip.textContent = tag === 'all' ? '🎨 All Agency Presets' : `#${tag}`;
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
        empty.style.padding = '3rem';
        empty.textContent = 'No matching agency snippets found.';
        grid.appendChild(empty);
        return;
      }

      results.forEach(snippet => {
        const card = document.createElement('article');
        card.className = 'snippet-card';

        const header = document.createElement('div');
        header.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = snippet.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(snippet.code);
            showToast('Preset copied to clipboard!');
          } catch {
            showToast('Failed to copy');
          }
        });

        header.appendChild(title);
        header.appendChild(copyBtn);

        const body = document.createElement('div');
        body.className = 'card-body';
        const pre = document.createElement('pre');
        pre.className = 'code-block';
        pre.textContent = snippet.code;
        body.appendChild(pre);

        const footer = document.createElement('div');
        footer.className = 'card-footer';
        snippet.tags.forEach(t => {
          const span = document.createElement('span');
          span.className = 'card-tag';
          span.textContent = `#${t}`;
          footer.appendChild(span);
        });

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(footer);
        grid.appendChild(card);
      });
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
