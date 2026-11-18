/**
 * EdtechAcademySnippetVault
 * Reusable preset snippet library & tag-based search vault for pedagogical algorithms, quiz templates, and certificate schemas.
 */
export class EdtechAcademySnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'ed-snip-1',
        title: 'SuperMemo SM-2 Spaced Repetition Formula',
        description: 'Standard memory retention algorithm calculating ease factor and review review intervals.',
        category: 'Cognitive Learning',
        tags: ['flashcards', 'sm2', 'spaced-repetition', 'retention', 'memory'],
        code: JSON.stringify({
          initial_ease_factor: 2.5,
          minimum_ease_factor: 1.3,
          repetition_intervals_days: [1, 6],
          ease_delta_formula: 'EF = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))',
          grade_scale: '0-5 (5: Perfect response, 0: Complete blackout)'
        }, null, 2),
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'ed-snip-2',
        title: 'Bloom Taxonomy Course Learning Objectives',
        description: 'Pedagogical action verbs rubric spanning foundational recall to architectural creation.',
        category: 'Curriculum Design',
        tags: ['bloom', 'pedagogy', 'curriculum', 'rubric', 'assessment'],
        code: JSON.stringify({
          level_1_remember: ['Define', 'Identify', 'List', 'Recall'],
          level_2_understand: ['Classify', 'Explain', 'Summarize', 'Paraphrase'],
          level_3_apply: ['Implement', 'Execute', 'Solve', 'Demonstrate'],
          level_4_analyze: ['Deconstruct', 'Compare', 'Contrast', 'Differentiate'],
          level_5_evaluate: ['Critique', 'Benchmark', 'Defend', 'Appraise'],
          level_6_create: ['Design', 'Formulate', 'Architect', 'Synthesize']
        }, null, 2),
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'ed-snip-3',
        title: 'Auto-Graded Code Challenge Sandbox',
        description: 'Execution container parameters with test assertions and isolated memory constraints.',
        category: 'Coding Exercises',
        tags: ['sandbox', 'grading', 'python', 'autocheck', 'unit-tests'],
        code: JSON.stringify({
          language: 'python:3.12',
          execution_timeout_ms: 2500,
          memory_limit_mb: 64,
          network_access: false,
          test_suite: [
            { input: '[1, 2, 3, 4]', expected_output: '10', hidden: false },
            { input: '[-5, 0, 5]', expected_output: '0', hidden: true }
          ]
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'ed-snip-4',
        title: 'Adaptive Item Response Theory (IRT) Profile',
        description: '2-Parameter Logistic (2PL) student ability theta estimate and question discrimination model.',
        category: 'Psychometrics',
        tags: ['irt', 'adaptive', 'quiz', 'psychometrics', 'assessment'],
        code: JSON.stringify({
          model: '2PL IRT',
          initial_student_theta: 0.0,
          discrimination_parameter_a: 1.45,
          difficulty_parameter_b: 0.25,
          convergence_standard_error: 0.28,
          max_questions: 25
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'ed-snip-5',
        title: 'Open Badges 3.0 Verifiable Credential',
        description: 'W3C compliant decentralized digital credential format for verified course certifications.',
        category: 'Certifications',
        tags: ['credentials', 'badges', 'certification', 'jsonld', 'verifiable'],
        code: JSON.stringify({
          '@context': [
            'https://www.w3.org/2018/credentials/v1',
            'https://purl.imsglobal.org/spec/ob/v3p0/context.json'
          ],
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          issuer: 'https://careerforge.dev/issuers/academy',
          credentialSubject: {
            achievement: {
              name: 'Advanced Distributed Systems Architect',
              criteria: 'Completed 60 lab hours, scored >90% on capstone'
            }
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
      id: snippet.id || `ed-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    wrapper.className = 'ed-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'ed-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'ed-vault-search-input';
    searchInput.placeholder = 'Search learning models, spaced repetition, grading rubrics...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'ed-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'ed-tag-pill ed-tag-pill-active';
    allBtn.textContent = 'All Learning Tags';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'ed-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'ed-vault-empty';
        empty.textContent = 'No educational snippets match the specified query.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'ed-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'ed-card-top';

        const title = document.createElement('h3');
        title.className = 'ed-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'ed-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'ed-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'ed-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'ed-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'ed-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'ed-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'ed-btn-use-snippet';
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
      tagButtons.forEach(b => b.classList.remove('ed-tag-pill-active'));
      allBtn.classList.add('ed-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'ed-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('ed-tag-pill-active'));
        btn.classList.add('ed-tag-pill-active');
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
