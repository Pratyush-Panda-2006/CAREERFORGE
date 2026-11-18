/**
 * AerospaceOrbiterSnippetVault
 * Reusable preset snippet library & tag-based search vault for orbital flight equations and telemetry scripts.
 */
export class AerospaceOrbiterSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = new Map();

    const defaults = initialSnippets || [
      {
        id: 'ao-hohmann-transfer',
        title: 'Hohmann Transfer Orbit Delta-V',
        description: 'Computes velocity increments for two-impulse coplanar orbital transfer between circular orbits.',
        code: `// Hohmann Transfer Delta-V (Standard Gravitational Parameter mu in km^3/s^2)
function calculateHohmannDeltaV(r1, r2, mu = 398600.4418) {
  const v1 = Math.sqrt(mu / r1);
  const v2 = Math.sqrt(mu / r2);
  const deltaV1 = Math.sqrt(mu / r1) * (Math.sqrt((2 * r2) / (r1 + r2)) - 1);
  const deltaV2 = Math.sqrt(mu / r2) * (1 - Math.sqrt((2 * r1) / (r1 + r2)));
  return { deltaV1, deltaV2, totalDeltaV: Math.abs(deltaV1) + Math.abs(deltaV2) };
}`,
        tags: ['astrodynamics', 'hohmann', 'delta-v', 'maneuver']
      },
      {
        id: 'ao-tsiolkovsky-rocket',
        title: 'Tsiolkovsky Rocket Equation',
        description: 'Relates delta-v capability to effective exhaust velocity and propellant mass fraction.',
        code: `// Tsiolkovsky Delta-V
function calculateRocketDeltaV(ispSeconds, mInitial, mFinal, g0 = 9.80665) {
  const effectiveExhaustVelocity = ispSeconds * g0;
  return effectiveExhaustVelocity * Math.log(mInitial / mFinal);
}`,
        tags: ['propulsion', 'tsiolkovsky', 'isp', 'delta-v']
      },
      {
        id: 'ao-vis-viva',
        title: 'Vis-Viva Orbital Speed Equation',
        description: 'Calculates instantaneous orbital speed at any point along Keplerian elliptical trajectory.',
        code: `// Vis-Viva Speed (r: current radius km, a: semi-major axis km)
function calculateVisVivaSpeed(r, a, mu = 398600.4418) {
  return Math.sqrt(mu * ((2 / r) - (1 / a)));
}`,
        tags: ['orbital-mechanics', 'vis-viva', 'kepler', 'speed']
      },
      {
        id: 'ao-reentry-decel',
        title: 'Atmospheric Reentry Aerodynamic Deceleration',
        description: 'Estimates peak g-force deceleration and drag dynamic pressure during planetary atmospheric entry.',
        code: `// Peak Atmospheric Entry Deceleration
function calculatePeakEntryG(entryAngleRad, velocityKmS) {
  const v0 = velocityKmS * 1000; // m/s
  const beta = 1 / 7200; // scale height inverse ~ 1/7.2km
  const maxDecel = (beta * Math.pow(v0, 2) * Math.sin(entryAngleRad)) / (2 * Math.E);
  return maxDecel / 9.80665; // in Earth g's
}`,
        tags: ['reentry', 'thermal', 'aerodynamics', 'drag']
      },
      {
        id: 'ao-lagrange-l2',
        title: 'Lagrange Point L2 Orbital Stability',
        description: 'Stationkeeping halo orbit delta-V budget approximation for Sun-Earth L2 equilibrium.',
        code: `// L2 Stationkeeping Delta-V budget per year
function estimateL2StationkeepingBudget(amplitudeKm = 800000) {
  const baseBudgetMS = 2.5; // m/s per year nominal
  const scale = amplitudeKm / 500000;
  return baseBudgetMS * scale;
}`,
        tags: ['lagrange', 'three-body', 'l2', 'stationkeeping']
      }
    ];

    for (const item of defaults) {
      this.addSnippet(item);
    }
  }

  addSnippet(snippet) {
    if (!snippet || !snippet.title || !snippet.code) {
      throw new Error('Snippet requires title and code');
    }

    const id = snippet.id || `ao-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (this.snippets.has(id)) {
      throw new Error(`Snippet with ID "${id}" already exists`);
    }

    const normalizedTags = Array.isArray(snippet.tags)
      ? snippet.tags.map(t => String(t).trim().toLowerCase()).filter(Boolean)
      : [];

    const item = {
      id,
      title: String(snippet.title).trim(),
      description: snippet.description ? String(snippet.description).trim() : '',
      code: String(snippet.code).trim(),
      tags: normalizedTags,
      createdAt: snippet.createdAt || new Date().toISOString()
    };

    this.snippets.set(id, item);
    return item;
  }

  getById(id) {
    return this.snippets.get(id) || null;
  }

  removeSnippet(id) {
    return this.snippets.delete(id);
  }

  getAll() {
    return Array.from(this.snippets.values());
  }

  getAllTags() {
    const tagsSet = new Set();
    for (const item of this.snippets.values()) {
      for (const tag of item.tags) {
        tagsSet.add(tag);
      }
    }
    return Array.from(tagsSet).sort();
  }

  filterByTag(tag) {
    if (!tag || tag === 'all') {
      return this.getAll();
    }
    const cleanTag = String(tag).trim().toLowerCase();
    return this.getAll().filter(item => item.tags.includes(cleanTag));
  }

  searchSnippets(query) {
    if (!query || !query.trim()) {
      return this.getAll();
    }
    const tokens = query.trim().toLowerCase().split(/\s+/);
    return this.getAll().filter(item => {
      const targetText = `${item.title} ${item.description} ${item.tags.join(' ')} ${item.code}`.toLowerCase();
      return tokens.every(token => targetText.includes(token));
    });
  }

  render(container, options = {}) {
    if (!container) return;
    container.replaceChildren();

    const items = options.items || this.getAll();
    const onCopy = options.onCopy || null;

    if (items.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'ao-empty-vault';
      emptyMsg.textContent = 'No astrodynamics snippets match your filter query.';
      container.append(emptyMsg);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'ao-snippet-card';
      card.dataset.id = item.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'ao-snippet-header';

      const title = document.createElement('h3');
      title.className = 'ao-snippet-title';
      title.textContent = item.title;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'ao-btn-copy';
      copyBtn.textContent = 'Copy Equation';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.code);
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Equation';
        }, 1500);
        if (onCopy) onCopy(item);
      });

      cardHeader.append(title, copyBtn);

      const desc = document.createElement('p');
      desc.className = 'ao-snippet-desc';
      desc.textContent = item.description;

      const codePre = document.createElement('pre');
      codePre.className = 'ao-snippet-code';
      const codeElem = document.createElement('code');
      codeElem.textContent = item.code;
      codePre.append(codeElem);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'ao-snippet-tags';
      for (const tag of item.tags) {
        const badge = document.createElement('span');
        badge.className = 'ao-tag-chip';
        badge.textContent = `#${tag}`;
        tagsContainer.append(badge);
      }

      card.append(cardHeader, desc, codePre, tagsContainer);
      container.append(card);
    }
  }
}
