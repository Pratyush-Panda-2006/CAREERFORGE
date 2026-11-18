/**
 * PodcastAudioStreamSnippetVault
 * Reusable preset snippet library & tag-based search vault for RSS 2.0 namespaces, HLS manifests, and audio DSP presets.
 */
export class PodcastAudioStreamSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'pod-snip-1',
        title: 'Podcast 2.0 Namespace Feed Header',
        description: 'Standard modern RSS feed metadata including transcript and chapter extensions.',
        category: 'RSS Feed 2.0',
        tags: ['rss', 'podcast20', 'chapters', 'transcript', 'feed'],
        code: `<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>CareerForge DevCast</title>
    <podcast:guid>7a9d2c18-9182-4112-9c3f-4e098a76b541</podcast:guid>
    <podcast:locked>no</podcast:locked>
    <podcast:funding url="https://example.com/donate">Support open source engineering</podcast:funding>
  </channel>
</rss>`,
        createdAt: '2026-03-01T10:00:00.000Z'
      },
      {
        id: 'pod-snip-2',
        title: 'HLS Multi-Bitrate Master Playlist',
        description: 'Adaptive bitrate M3U8 streaming manifest supporting low-data and lossless playback.',
        category: 'HLS Streaming',
        tags: ['hls', 'm3u8', 'streaming', 'abr', 'bitrate'],
        code: `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS

#EXT-X-STREAM-INF:BANDWIDTH=64000,CODECS="mp4a.40.2"
64k/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=128000,CODECS="mp4a.40.2"
128k/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=256000,CODECS="mp4a.40.2"
256k/stream.m3u8`,
        createdAt: '2026-03-01T10:15:00.000Z'
      },
      {
        id: 'pod-snip-3',
        title: 'Broadcast -16 LUFS Loudness Preset',
        description: 'EBU R128 and Apple Podcasts compliant loudness normalization and limiter curve.',
        category: 'Audio Mastering',
        tags: ['audio', 'lufs', 'eq', 'filter', 'loudness'],
        code: JSON.stringify({
          target_integrated_lufs: -16.0,
          true_peak_ceiling_db: -1.0,
          loudness_range_lu: 7.5,
          highpass_rumble_cut_hz: 75,
          de_esser_center_frequency_hz: 6500
        }, null, 2),
        createdAt: '2026-03-01T10:30:00.000Z'
      },
      {
        id: 'pod-snip-4',
        title: 'Structured JSON Chapters Index',
        description: 'Time-indexed chapter titles with hyperlinked references and custom cover artwork.',
        category: 'Metadata & Chapters',
        tags: ['chapters', 'metadata', 'id3', 'timestamps'],
        code: JSON.stringify({
          version: '1.2.0',
          chapters: [
            { startTime: 0, title: 'Intro & Keynote Overview' },
            { startTime: 245, title: 'Deep Dive: Microgrid Architecture', url: 'https://careerforge.dev' },
            { startTime: 1080, title: 'Live Benchmarks & Listener Q&A' },
            { startTime: 1820, title: 'Outro & Next Week Preview' }
          ]
        }, null, 2),
        createdAt: '2026-03-01T10:45:00.000Z'
      },
      {
        id: 'pod-snip-5',
        title: 'Dynamic Mid-Roll SCTE-35 Cue Marker',
        description: 'Frame-accurate ad break insertion payload for server-side ad stitching.',
        category: 'Monetization',
        tags: ['ads', 'monetization', 'vast', 'midroll', 'cue'],
        code: JSON.stringify({
          break_type: 'midroll',
          cue_in_sec: 720.0,
          max_duration_sec: 60.0,
          scte35_payload: '0xFC302500000000000000FFF01405000000017FEFFE20',
          ad_replacement_allowed: true
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
      id: snippet.id || `pod-snip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
    wrapper.className = 'pas-vault-wrapper';

    const header = document.createElement('div');
    header.className = 'pas-vault-header';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'pas-vault-search-input';
    searchInput.placeholder = 'Search podcast snippets, RSS tags, HLS manifests, loudness EQ...';

    const tagFilterWrap = document.createElement('div');
    tagFilterWrap.className = 'pas-vault-tag-filters';

    let activeTag = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'pas-tag-pill pas-tag-pill-active';
    allBtn.textContent = 'All Podcast Tags';
    tagFilterWrap.append(allBtn);

    const tags = this.getAllTags();
    const tagButtons = [allBtn];

    const listContainer = document.createElement('div');
    listContainer.className = 'pas-vault-list';

    const refreshList = () => {
      listContainer.replaceChildren();
      const results = this.search(searchInput.value, activeTag);

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'pas-vault-empty';
        empty.textContent = 'No podcast audio snippets match the specified query.';
        listContainer.append(empty);
        return;
      }

      for (const item of results) {
        const card = document.createElement('div');
        card.className = 'pas-snippet-card';

        const topRow = document.createElement('div');
        topRow.className = 'pas-card-top';

        const title = document.createElement('h3');
        title.className = 'pas-card-title';
        title.textContent = item.title;

        const categoryBadge = document.createElement('span');
        categoryBadge.className = 'pas-cat-badge';
        categoryBadge.textContent = item.category;

        topRow.append(title, categoryBadge);

        const desc = document.createElement('p');
        desc.className = 'pas-card-desc';
        desc.textContent = item.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'pas-card-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = item.code;
        codeBlock.append(codeElem);

        const footer = document.createElement('div');
        footer.className = 'pas-card-footer';

        const tagList = document.createElement('div');
        tagList.className = 'pas-card-tags';
        for (const t of item.tags) {
          const tSpan = document.createElement('span');
          tSpan.className = 'pas-card-tag-item';
          tSpan.textContent = `#${t}`;
          tagList.append(tSpan);
        }

        const useBtn = document.createElement('button');
        useBtn.className = 'pas-btn-use-snippet';
        useBtn.textContent = 'Use Preset';
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
      tagButtons.forEach(b => b.classList.remove('pas-tag-pill-active'));
      allBtn.classList.add('pas-tag-pill-active');
      refreshList();
    });

    for (const tag of tags) {
      const btn = document.createElement('button');
      btn.className = 'pas-tag-pill';
      btn.textContent = tag;
      btn.addEventListener('click', () => {
        activeTag = tag;
        tagButtons.forEach(b => b.classList.remove('pas-tag-pill-active'));
        btn.classList.add('pas-tag-pill-active');
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
