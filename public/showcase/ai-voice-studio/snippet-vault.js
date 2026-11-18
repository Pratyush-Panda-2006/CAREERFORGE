/**
 * AiVoiceStudioSnippetVault
 * Reusable preset snippet library & tag-based search vault for voice prompts, SSML, and audio DSP pipelines.
 */
export class AiVoiceStudioSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'voice-snip-1',
        title: 'SSML Prosody Pitch & Rate Contour',
        description: 'Optimized voice modulation contour for commercial narration and pacing.',
        category: 'SSML',
        tags: ['ssml', 'prosody', 'pitch', 'narration'],
        code: '<speak>\n  <prosody pitch="+8%" rate="96%">\n    Welcome to the neural audio workstation.\n  </prosody>\n</speak>',
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'voice-snip-2',
        title: 'Phonetic IPA Pronunciation Mapping',
        description: 'Explicit International Phonetic Alphabet guide for proprietary tech terminology.',
        category: 'Phonetics',
        tags: ['phoneme', 'ipa', 'pronunciation', 'branding'],
        code: '<phoneme alphabet="ipa" ph="kəˈɹɪəɹ fɔːdʒ">CAREERFORGE</phoneme>',
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'voice-snip-3',
        title: 'Neural Zero-Shot Voice Clone Config',
        description: 'Reference audio vector conditioning hyperparameters for latency-critical streaming.',
        category: 'Neural Engine',
        tags: ['cloning', 'neural', 'embedding', 'tts'],
        code: JSON.stringify({
          model: 'neural-tts-v3',
          speaker_embedding_dim: 512,
          temperature: 0.68,
          repetition_penalty: 1.85,
          streaming_chunk_ms: 120
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'voice-snip-4',
        title: 'Broadcast DSP Silence Gate & Limiter',
        description: 'Real-time dynamics compressor and downward expander filter chain.',
        category: 'Audio DSP',
        tags: ['dsp', 'filter', 'noise-gate', 'dynamics'],
        code: JSON.stringify({
          gate_threshold_db: -44.0,
          attack_ms: 12,
          release_ms: 140,
          limiter_ceiling_db: -1.0,
          lookahead_ms: 4
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'voice-snip-5',
        title: 'Polyglot Multi-Language SSML Switch',
        description: 'Seamless cross-lingual synthesis tag with accent preservation.',
        category: 'Localization',
        tags: ['multilingual', 'ssml', 'polyglot', 'japanese'],
        code: '<speak>\n  <lang xml:lang="en-US">Hello, user.</lang>\n  <break time="250ms"/>\n  <lang xml:lang="ja-JP"><prosody rate="102%">本日はどのようなお手伝いをしましょうか。</prosody></lang>\n</speak>',
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
      id: snippet.id || `voice-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    wrapper.className = 'av-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'av-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'av-vault-search-input';
    searchInput.placeholder = 'Search voice snippets, SSML, DSP parameters...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'av-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'av-tag-pill av-tag-pill-active';
    allBtn.textContent = 'All Tags';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'av-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'av-vault-empty';
        empty.textContent = 'No voice snippets match the specified query.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'av-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'av-card-top';

        const title = document.createElement('h3');
        title.className = 'av-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'av-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'av-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'av-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'av-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'av-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'av-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'av-btn-use-snippet';
        useBtn.textContent = 'Copy & Apply';
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
      tagButtons.forEach(b => b.classList.remove('av-tag-pill-active'));
      allBtn.classList.add('av-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'av-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('av-tag-pill-active'));
        btn.classList.add('av-tag-pill-active');
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
