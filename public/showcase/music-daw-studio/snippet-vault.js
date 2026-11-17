/**
 * Music DAW Studio - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Stores modular synth patch configurations, MIDI chord progressions, and FX chains.
 */

export class MusicDawStudioSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'analog-moog-bass',
        title: 'Deep Analog 24dB Moog Bass Patch',
        code: `{\n  "osc1": { "wave": "sawtooth", "octave": -1, "detune_cents": -4 },\n  "osc2": { "wave": "square", "octave": -1, "detune_cents": +4 },\n  "filter": { "type": "lowpass", "cutoff_hz": 320, "resonance": 4.2, "drive_db": 6 },\n  "envelope": { "attack_ms": 2, "decay_ms": 280, "sustain": 0.4, "release_ms": 120 }\n}`,
        tags: ['synth', 'bass', 'analog', 'patch']
      },
      {
        id: 'lofi-rhodes-chords',
        title: 'Neo-Soul & Lo-Fi 7th/9th Chord Progression',
        code: `{\n  "tempo_bpm": 84,\n  "groove_swing_percent": 16,\n  "progression": [\n    { "chord": "Dmaj9", "midi_notes": [62, 66, 69, 73, 76], "duration_bars": 1 },\n    { "chord": "C#m7", "midi_notes": [61, 64, 68, 71], "duration_bars": 1 },\n    { "chord": "F#m11", "midi_notes": [54, 61, 64, 68, 71, 74], "duration_bars": 2 }\n  ]\n}`,
        tags: ['midi', 'chords', 'lofi', 'keys']
      },
      {
        id: 'space-reverb-chain',
        title: 'Ambient Shimmer Reverb & Tape Delay Chain',
        code: `{\n  "fx_chain": [\n    { "plugin": "TapeDelay", "time_sync": "1/8d", "feedback": 0.55, "flutter": 0.2 },\n    { "plugin": "ShimmerReverb", "decay_sec": 6.8, "pitch_shift_semitones": +12, "damping_hz": 4800 },\n    { "plugin": "StereoImager", "width_percent": 140 }\n  ]\n}`,
        tags: ['fx', 'reverb', 'ambient', 'mixing']
      },
      {
        id: '808-sub-kick-sculpt',
        title: 'Trap 808 Distorted Sub Kick Spec',
        code: `{\n  "fundamental_freq_hz": 42.5,\n  "pitch_decay_ms": 45,\n  "saturation": { "type": "tape_warmth", "drive": 7.5 },\n  "sidechain": { "duck_threshold_db": -18, "duck_release_ms": 80 }\n}`,
        tags: ['drums', '808', 'sub', 'production']
      },
      {
        id: 'mastering-limiter-preset',
        title: 'EDM Streaming Loudness Master Chain',
        code: `{\n  "target_lufs": -14.0,\n  "true_peak_ceiling_dbfs": -0.8,\n  "dynamic_eq": { "low_end_side_cut_hz": 30, "air_boost_shelf_12khz_db": 1.5 },\n  "brickwall_limiter": { "lookahead_ms": 5, "release_mode": "auto" }\n}`,
        tags: ['mastering', 'loudness', 'limiter', 'audio-eng']
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

    const vault = new MusicDawStudioSnippetVault();
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
        chip.textContent = tag === 'all' ? '🎛️ All Presets' : `#${tag}`;
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
        empty.textContent = 'No synth presets or DAW audio chains found matching your search.';
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
        copyBtn.textContent = '📋 Copy Patch';
        copyBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(item.code).then(() => {
            showToast(`Copied "${item.title}" patch!`);
          }).catch(() => {
            showToast('Preset copied!');
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
