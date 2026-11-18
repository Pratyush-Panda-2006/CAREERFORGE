/**
 * Smart IoT Nexus - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Presets for MQTT routing, Kalman sensor filtering, LoRaWAN ADR algorithms, and exponential smoothing.
 */

export class SmartIoTNexusSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'snip-iot-01',
        title: 'MQTT Multi-Level Wildcard Topic Matcher & Router',
        category: 'mqtt',
        tags: ['mqtt', 'pubsub', 'broker', 'routing'],
        description: 'Evaluates MQTT subscription topic filters containing "+" (single level) and "#" (multi level) wildcards against published topics.',
        code: `function matchMqttTopic(pattern, topic) {
  const patternParts = pattern.split('/');
  const topicParts = topic.split('/');

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === '#') return true;
    if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
      return false;
    }
  }
  return patternParts.length === topicParts.length;
}`
      },
      {
        id: 'snip-iot-02',
        title: '1D Kalman Filter Gaussian Noise Attenuator for Telemetry',
        category: 'filter',
        tags: ['filter', 'kalman', 'sensors', 'noise'],
        description: 'Optimal state estimator minimizing mean square error for noisy thermistor and pressure sensor signals.',
        code: `function updateKalman(state, measurement, q = 0.001, r = 0.1) {
  // Prediction update
  let p = state.variance + q;
  // Measurement update
  const k = p / (p + r); // Kalman Gain
  const x = state.estimate + k * (measurement - state.estimate);
  p = (1 - k) * p;

  return { estimate: Number(x.toFixed(3)), variance: Number(p.toFixed(5)) };
}`
      },
      {
        id: 'snip-iot-03',
        title: 'Exponential Moving Average (EMA) Fast-Response Filter',
        category: 'dsp',
        tags: ['dsp', 'ema', 'smoothing', 'signal'],
        description: 'Applies weighted exponential decaying filter with alpha coefficient to damp high-frequency vibration jitter.',
        code: `function calculateEMA(prevEma, currentVal, alpha = 0.25) {
  if (prevEma === null || prevEma === undefined) return currentVal;
  return Number((alpha * currentVal + (1 - alpha) * prevEma).toFixed(2));
}`
      },
      {
        id: 'snip-iot-04',
        title: 'LoRaWAN Adaptive Data Rate (ADR) SNR Uplink Stepper',
        category: 'lora',
        tags: ['lora', 'lorawan', 'adr', 'rf'],
        description: 'Increases Spreading Factor (SF7 -> SF12) or transmission power based on gateway Signal-to-Noise Ratio (SNR).',
        code: `function evaluateLorawanADR(snrDb, currentSf = 7) {
  const snrMargin = snrDb - (-10.0);
  if (snrMargin < 0 && currentSf < 12) {
    return { spreadingFactor: currentSf + 1, txPowerDbm: 14, action: 'FALLBACK_ROBUST' };
  } else if (snrMargin > 15 && currentSf > 7) {
    return { spreadingFactor: currentSf - 1, txPowerDbm: 10, action: 'OPTIMIZE_THROUGHPUT' };
  }
  return { spreadingFactor: currentSf, txPowerDbm: 14, action: 'HOLD' };
}`
      }
    ];
  }

  getAll() {
    return this.snippets;
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') return this.snippets;
    const lower = tag.toLowerCase();
    return this.snippets.filter(s =>
      s.category.toLowerCase() === lower ||
      s.tags.some(t => t.toLowerCase() === lower)
    );
  }

  searchSnippets(query) {
    if (!query || !query.trim()) return this.snippets;
    const terms = query.toLowerCase().trim().split(/\s+/);
    return this.snippets.filter(s => {
      const matchCorpus = `${s.title} ${s.description} ${s.category} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
      return terms.every(term => matchCorpus.includes(term));
    });
  }

  addSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required fields');
    }
    const newSnippet = {
      id: snippet.id || `snip-iot-${Date.now()}`,
      title: snippet.title.trim(),
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => t.toLowerCase()) : ['custom'],
      description: snippet.description || 'Custom IoT algorithm snippet',
      code: snippet.code.trim()
    };
    this.snippets.unshift(newSnippet);
    return newSnippet;
  }
}

// UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('snippetList');
    if (!listContainer) return;

    const vault = new SmartIoTNexusSnippetVault();
    let currentTag = 'all';

    const searchInput = document.getElementById('searchSnippetInput');
    const tagBar = document.getElementById('tagFilterBar');
    const modal = document.getElementById('addSnippetModal');
    const openModalBtn = document.getElementById('openAddModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const snippetForm = document.getElementById('newSnippetForm');

    function renderSnippets(items) {
      listContainer.replaceChildren();

      if (items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-vault';
        empty.textContent = 'No IoT algorithm presets found matching your query.';
        listContainer.appendChild(empty);
        return;
      }

      for (const item of items) {
        const card = document.createElement('div');
        card.className = 'snippet-card';

        const head = document.createElement('div');
        head.className = 'card-header';

        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = item.title;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(item.code);
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Code'; }, 1500);
          } catch {
            copyBtn.textContent = 'Error';
          }
        });

        head.append(title, copyBtn);

        const desc = document.createElement('p');
        desc.className = 'card-desc';
        desc.textContent = item.description;

        const tagList = document.createElement('div');
        tagList.className = 'tag-pills';

        for (const t of item.tags) {
          const pill = document.createElement('span');
          pill.className = 'tag-pill';
          pill.textContent = `#${t}`;
          tagList.appendChild(pill);
        }

        const pre = document.createElement('pre');
        pre.className = 'code-block';
        const code = document.createElement('code');
        code.textContent = item.code;
        pre.appendChild(code);

        card.append(head, desc, tagList, pre);
        listContainer.appendChild(card);
      }
    }

    function applyFilters() {
      const q = searchInput?.value || '';
      let results = vault.filterByTag(currentTag);
      if (q.trim()) {
        const terms = q.toLowerCase().trim().split(/\s+/);
        results = results.filter(s => {
          const text = `${s.title} ${s.description} ${s.tags.join(' ')} ${s.code}`.toLowerCase();
          return terms.every(t => text.includes(t));
        });
      }
      renderSnippets(results);
    }

    if (searchInput) {
      searchInput.addEventListener('input', applyFilters);
    }

    if (tagBar) {
      tagBar.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('filter-pill')) {
          document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
          target.classList.add('active');
          currentTag = target.dataset.tag || 'all';
          applyFilters();
        }
      });
    }

    if (openModalBtn && modal) {
      openModalBtn.addEventListener('click', () => modal.classList.add('active'));
    }
    if (closeModalBtn && modal) {
      closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    if (snippetForm) {
      snippetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleVal = document.getElementById('inputSnippetTitle')?.value || '';
        const catVal = document.getElementById('inputSnippetCategory')?.value || 'general';
        const tagsVal = document.getElementById('inputSnippetTags')?.value || '';
        const descVal = document.getElementById('inputSnippetDesc')?.value || '';
        const codeVal = document.getElementById('inputSnippetCode')?.value || '';

        try {
          vault.addSnippet({
            title: titleVal,
            category: catVal,
            tags: tagsVal.split(',').map(s => s.trim()).filter(Boolean),
            description: descVal,
            code: codeVal
          });
          snippetForm.reset();
          modal?.classList.remove('active');
          applyFilters();
        } catch (err) {
          alert(err.message);
        }
      });
    }

    renderSnippets(vault.getAll());
  });
}
