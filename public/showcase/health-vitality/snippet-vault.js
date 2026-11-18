/**
 * HealthVitalitySnippetVault
 * Reusable preset snippet library & tag-based search vault for clinical formulas, metabolic equations, HRV recovery, and nutrition protocols.
 */
export class HealthVitalitySnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'cooper-vo2max',
        title: 'Cooper 12-Minute VO2 Max Equation',
        category: 'Cardio Fitness',
        tags: ['vo2max', 'aerobic', 'cardio', 'endurance'],
        description: 'Calculates maximum oxygen uptake (ml/kg/min) based on 12-minute run distance.',
        code: `function calculateCooperVO2Max(distanceInMeters) {
  // VO2 max = (distance in meters - 504.9) / 44.73
  const vo2 = (distanceInMeters - 504.9) / 44.73;
  return {
    vo2Max: Math.round(vo2 * 10) / 10,
    unit: 'ml/kg/min',
    tier: vo2 > 52 ? 'Superior' : vo2 > 42 ? 'Good' : 'Average'
  };
}`
      },
      {
        id: 'rmssd-hrv',
        title: 'HRV RMSSD Parasympathetic Recovery Score',
        category: 'Autonomic Biometrics',
        tags: ['hrv', 'autonomic', 'recovery', 'biometrics'],
        description: 'Computes Root Mean Square of Successive Differences for heart rate variability recovery evaluation.',
        code: `function computeRMSSD(rrIntervalsMs) {
  if (rrIntervalsMs.length < 2) return 0;
  let sumSquaredDiffs = 0;
  for (let i = 0; i < rrIntervalsMs.length - 1; i++) {
    const diff = rrIntervalsMs[i + 1] - rrIntervalsMs[i];
    sumSquaredDiffs += diff * diff;
  }
  const rmssd = Math.sqrt(sumSquaredDiffs / (rrIntervalsMs.length - 1));
  return {
    rmssd: Math.round(rmssd * 10) / 10,
    readiness: rmssd >= 65 ? 'Peak Primed' : rmssd >= 40 ? 'Moderate' : 'Fatigued'
  };
}`
      },
      {
        id: 'keto-macro-ratio',
        title: 'Metabolic Macronutrient Partitioning Protocol',
        category: 'Metabolic Nutrition',
        tags: ['nutrition', 'metabolism', 'macronutrients', 'diet'],
        description: 'Partitions total daily caloric energy into fat, protein, and targeted carbohydrates.',
        code: `function partitionMacros(targetCalories, regimenType = 'ketogenic') {
  if (regimenType === 'ketogenic') {
    return {
      fatGrams: Math.round((targetCalories * 0.70) / 9),
      proteinGrams: Math.round((targetCalories * 0.25) / 4),
      netCarbGrams: Math.round((targetCalories * 0.05) / 4)
    };
  }
  return {
    carbsGrams: Math.round((targetCalories * 0.50) / 4),
    proteinGrams: Math.round((targetCalories * 0.30) / 4),
    fatGrams: Math.round((targetCalories * 0.20) / 9)
  };
}`
      },
      {
        id: 'circadian-melatonin',
        title: 'Circadian Sunlight & Melatonin Timing Window',
        category: 'Sleep Optimization',
        tags: ['circadian', 'sleep', 'recovery', 'hormones'],
        description: 'Determines optimal daylight photon exposure and blue-blocker window to anchor circadian rhythm.',
        code: `function getCircadianWindows(wakeHour) {
  const morningSunlight = { start: wakeHour, durationMinutes: 30, luxTarget: 10000 };
  const blueLightCutoff = (wakeHour + 14) % 24;
  const targetSleepWindow = (wakeHour + 16) % 24;
  return { morningSunlight, blueLightCutoff, targetSleepWindow };
}`
      },
      {
        id: 'isotonic-osmolarity',
        title: 'Isotonic Electrolyte Rehydration Solution',
        category: 'Hydration Science',
        tags: ['hydration', 'electrolytes', 'sports-science', 'wellness'],
        description: 'Formulates rapid gastric-emptying hydration solution targeting 280-300 mOsm/L osmolarity.',
        code: `function formulateRehydrationMix(volumeLiters) {
  return {
    sodiumMg: volumeLiters * 1150,
    potassiumMg: volumeLiters * 400,
    magnesiumMg: volumeLiters * 60,
    dextroseGrams: volumeLiters * 15,
    targetOsmolarity: '290 mOsm/L'
  };
}`
      }
    ];
  }

  getAllSnippets() {
    return [...this.snippets, ...this.customSnippets];
  }

  getSnippetById(id) {
    return this.getAllSnippets().find((s) => s.id === id) || null;
  }

  addCustomSnippet(snippet) {
    if (!snippet.title || !snippet.code) {
      throw new Error('Title and code are required for custom snippet');
    }
    const id = snippet.id || `custom-${Date.now()}`;
    const newSnippet = {
      ...snippet,
      id,
      category: snippet.category || 'Custom Protocol',
      tags: snippet.tags || ['custom'],
      description: snippet.description || ''
    };
    this.customSnippets.push(newSnippet);
    return newSnippet;
  }

  getAllTags() {
    const tagSet = new Set();
    this.getAllSnippets().forEach((s) => {
      s.tags.forEach((t) => tagSet.add(t.toLowerCase()));
    });
    return Array.from(tagSet).sort();
  }

  search(query = '', selectedTag = '') {
    const q = query.trim().toLowerCase();
    const tag = selectedTag.trim().toLowerCase();

    return this.getAllSnippets().filter((s) => {
      const matchesTag = !tag || s.tags.some((t) => t.toLowerCase() === tag);
      if (!matchesTag) return false;
      if (!q) return true;

      const titleMatch = s.title.toLowerCase().includes(q);
      const descMatch = s.description.toLowerCase().includes(q);
      const codeMatch = s.code.toLowerCase().includes(q);
      const categoryMatch = s.category.toLowerCase().includes(q);

      return titleMatch || descMatch || codeMatch || categoryMatch;
    });
  }

  copySnippet(id) {
    const snippet = this.getSnippetById(id);
    if (!snippet) return null;
    return snippet.code;
  }

  renderToDOM(container, onSelect) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const vaultWrapper = document.createElement('div');
    vaultWrapper.className = 'health-vault-container';

    const header = document.createElement('div');
    header.className = 'health-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Biometric & Health Protocol Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'health-vault-search';
    searchInput.placeholder = 'Search protocols, VO2, HRV, macros, circadian...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'health-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'health-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'health-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.health-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.health-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'health-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'health-vault-empty';
        emptyMsg.textContent = 'No matching health protocols found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'health-snippet-card';

        const top = document.createElement('div');
        top.className = 'health-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'health-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'health-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'health-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'health-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'health-copy-btn';
        copyBtn.textContent = 'Copy Code';
        copyBtn.addEventListener('click', () => {
          if (typeof onSelect === 'function') {
            onSelect(snippet);
          }
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Code';
          }, 1500);
        });

        actions.append(copyBtn);
        card.append(top, desc, codeBlock, actions);
        listContainer.append(card);
      });
    };

    searchInput.addEventListener('input', () => {
      renderList();
    });

    renderList();
    container.append(vaultWrapper);
  }
}
