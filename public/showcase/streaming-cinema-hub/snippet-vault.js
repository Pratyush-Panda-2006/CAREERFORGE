/**
 * Streaming Cinema Hub - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores HLS/DASH streaming manifests, HDR color profiles, and subtitle sync specifications.
 */

export class StreamingCinemaHubSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'hls-adaptive-4k-manifest',
        title: 'HLS 4K UltraHD Multi-Bitrate Ladder Manifest',
        code: `#EXTM3U\n#EXT-X-VERSION:7\n#EXT-X-STREAM-INF:BANDWIDTH=16000000,RESOLUTION=3840x2160,FRAME-RATE=60.000,CODECS="hvc1.2.4.L153.B0,mp4a.40.2"\n4k_hdr_60fps.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=8500000,RESOLUTION=1920x1080,FRAME-RATE=60.000,CODECS="avc1.64002a,mp4a.40.2"\n1080p_60fps.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=4500000,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"\n720p_30fps.m3u8`,
        tags: ['hls', 'streaming', '4k', 'video-eng']
      },
      {
        id: 'dolby-vision-color-profile',
        title: 'Dolby Vision Profile 8.1 DCI-P3 Color Grading Spec',
        code: `{\n  "color_primaries": "BT.2020",\n  "transfer_characteristics": "SMPTE ST 2084 (PQ)",\n  "matrix_coefficients": "BT.2020 non-constant",\n  "mastering_display": {\n    "min_luminance_nits": 0.0001,\n    "max_luminance_nits": 1000.0,\n    "white_point": [0.3127, 0.3290]\n  }\n}`,
        tags: ['hdr', 'dolby-vision', 'color', 'cinema']
      },
      {
        id: 'drm-widevine-fairplay-license',
        title: 'Multi-DRM Widevine & FairPlay Authorization Header',
        code: `{\n  "drm_systems": {\n    "com.widevine.alpha": { "license_server_url": "https://license.cinema.io/widevine", "security_level": "L1" },\n    "com.apple.fps.1_0": { "certificate_url": "https://license.cinema.io/fairplay.cer" }\n  },\n  "token_ttl_seconds": 86400\n}`,
        tags: ['drm', 'security', 'widevine', 'licensing']
      },
      {
        id: 'spatial-audio-atmos-routing',
        title: 'Dolby Atmos 7.1.4 Immersive Bed & Object Map',
        code: `{\n  "bed_channels": "7.1.2",\n  "dynamic_objects_count": 14,\n  "render_binaural_mode": "NearField",\n  "dialogue_normalization_lkfs": -27.0\n}`,
        tags: ['audio', 'spatial', 'atmos', 'soundtrack']
      },
      {
        id: 'webvtt-bilingual-subtitles',
        title: 'WebVTT Multi-Language Subtitle Cue Synchronizer',
        code: `WEBVTT - Cinema Multi-Lingual Sync\\n\\n00:01:20.500 --> 00:01:24.000 line:85% align:center\\n<v Director>Every frame is rendered in pristine 70mm analog fidelity.</v>\\n\\n00:01:24.500 --> 00:01:27.200 line:85% align:center\\n<v Audio Lead>Notice the subtle sub-bass rumble at 28Hz.</v>`,
        tags: ['subtitles', 'webvtt', 'accessibility', 'localization']
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

    const vault = new StreamingCinemaHubSnippetVault();
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
        chip.textContent = tag === 'all' ? '🎬 All Presets' : `#${tag}`;
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
        empty.textContent = 'No streaming or cinema presets found matching your query.';
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
        copyBtn.textContent = '📋 Copy Spec';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" spec!`);
          }).catch(() => {
            showToast('Spec copied!');
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
