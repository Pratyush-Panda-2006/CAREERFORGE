/**
 * GamingEsportsSnippetVault
 * Reusable preset snippet library & tag-based search vault for matchmaking MMR equations, subtick interpolation, tournament seeding, and economy algorithms.
 */
export class GamingEsportsSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'elo-mmr-rating',
        title: 'Elo Matchmaking Rating (MMR) Calculator',
        category: 'Matchmaking Math',
        tags: ['elo', 'mmr', 'matchmaking', 'ranking'],
        description: 'Computes updated player ratings and probability of victory based on relative skill differentials.',
        code: `function computeEloUpdate(ratingA, ratingB, actualScoreA, kFactor = 32) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const newRatingA = Math.round(ratingA + kFactor * (actualScoreA - expectedA));
  return {
    newRating: newRatingA,
    ratingDelta: newRatingA - ratingA,
    expectedWinProbability: Math.round(expectedA * 1000) / 10
  };
}`
      },
      {
        id: 'subtick-interpolation',
        title: 'Sub-Tick Client Position Reconciliation',
        category: 'Netcode & Physics',
        tags: ['netcode', 'tickrate', 'subtick', 'networking'],
        description: 'Interpolates player coordinates between snapshot frames using sub-tick timestamp deltas.',
        code: `function interpolateSubtick(frameA, frameB, subtickFraction) {
  // Lerp position based on exact user input timestamp
  const x = frameA.x + (frameB.x - frameA.x) * subtickFraction;
  const y = frameA.y + (frameB.y - frameA.y) * subtickFraction;
  const z = frameA.z + (frameB.z - frameA.z) * subtickFraction;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round(z * 100) / 100 };
}`
      },
      {
        id: 'recoil-pattern-curve',
        title: 'Recoil Pattern Spread & Decay Compensator',
        category: 'Weapon Mechanics',
        tags: ['physics', 'aim', 'fps', 'mechanics'],
        description: 'Calculates weapon muzzle pitch and yaw offsets across continuous bullet bursts.',
        code: `function getRecoilVector(shotIndex, baseSpread = 1.2) {
  if (shotIndex <= 0) return { pitchOffset: 0, yawOffset: 0 };
  const pitchOffset = Math.min(shotIndex * 2.15 * baseSpread, 35.0);
  const yawOffset = Math.sin(shotIndex * 0.75) * 4.2 * baseSpread;
  return {
    pitchOffset: Math.round(pitchOffset * 10) / 10,
    yawOffset: Math.round(yawOffset * 10) / 10
  };
}`
      },
      {
        id: 'bracket-double-elim',
        title: 'Double Elimination Tournament Seeding Matrix',
        category: 'Tournament Ops',
        tags: ['tournament', 'bracket', 'seeding', 'esports'],
        description: 'Pairs high seeds against low seeds and establishes Upper vs Lower bracket progression paths.',
        code: `function generateInitialMatchups(seedsList) {
  const n = seedsList.length;
  const matches = [];
  for (let i = 0; i < n / 2; i++) {
    matches.push({
      matchId: \`UB-R1-M\${i + 1}\`,
      seed1: seedsList[i],
      seed2: seedsList[n - 1 - i],
      winnerAdvancesTo: \`UB-R2-M\${Math.floor(i / 2) + 1}\`,
      loserDropsTo: \`LB-R1-M\${i + 1}\`
    });
  }
  return matches;
}`
      },
      {
        id: 'economy-loss-bonus',
        title: 'Round Economy Loss Streak Bonus Progression',
        category: 'Economy Systems',
        tags: ['economy', 'tactics', 'strategy', 'rounds'],
        description: 'Evaluates next round team payout based on consecutive lost round multipliers.',
        code: `function getLossStreakPayout(lossStreak, baseLossBonus = 1400, maxTier = 4) {
  const effectiveTier = Math.min(Math.max(lossStreak, 0), maxTier);
  const payout = baseLossBonus + effectiveTier * 500;
  return {
    lossStreak: effectiveTier,
    cashBonus: payout,
    nextTierBonus: effectiveTier < maxTier ? payout + 500 : payout
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
      category: snippet.category || 'Custom Script',
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
    vaultWrapper.className = 'esports-vault-container';

    const header = document.createElement('div');
    header.className = 'esports-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Esports Code & Algorithm Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'esports-vault-search';
    searchInput.placeholder = 'Search MMR, subtick, recoil, bracket seeding...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'esports-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'esports-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'esports-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.esports-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.esports-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'esports-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'esports-vault-empty';
        emptyMsg.textContent = 'No matching esports algorithms or presets found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'esports-snippet-card';

        const top = document.createElement('div');
        top.className = 'esports-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'esports-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'esports-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'esports-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'esports-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'esports-copy-btn';
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
