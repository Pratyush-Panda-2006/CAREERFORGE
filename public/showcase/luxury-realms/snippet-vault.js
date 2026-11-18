/**
 * LuxuryRealmsSnippetVault
 * Reusable preset snippet library & tag-based search vault for luxury estate models, tax frameworks, and term sheets.
 */
export class LuxuryRealmsSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = new Map();

    const defaults = initialSnippets || [
      {
        id: 'lr-island-valuation',
        title: 'Private Island Capitalization Valuation Model',
        description: 'Calculates asset value based on sovereign leasehold terms, off-grid infrastructure, and net yields.',
        code: `// Private Island Valuation Model
function calculateIslandValuation(grossRentalIncome, annualOpex, infrastructureDepreciation, capRate) {
  const netOperatingIncome = grossRentalIncome - annualOpex - infrastructureDepreciation;
  const capitalizedValuation = netOperatingIncome / (capRate / 100);
  return { netOperatingIncome, capitalizedValuation };
}`,
        tags: ['valuation', 'private-island', 'cap-rate', 'financial']
      },
      {
        id: 'lr-stamp-wealth-tax',
        title: 'Luxury Stamp Duty & Wealth Surcharge Calculator',
        description: 'Computes multi-tiered progressive stamp duty for prime central properties exceeding $25M threshold.',
        code: `// Prime Property Progressive Stamp Duty
function calculateLuxuryStampDuty(purchasePrice) {
  let duty = 0;
  if (purchasePrice > 25000000) {
    duty += (purchasePrice - 25000000) * 0.15; // 15% top bracket
    duty += (25000000 - 10000000) * 0.12;
    duty += 10000000 * 0.08;
  } else {
    duty = purchasePrice * 0.09;
  }
  return { purchasePrice, duty, effectiveTaxRate: (duty / purchasePrice) * 100 };
}`,
        tags: ['tax', 'wealth-tax', 'stamp-duty', 'compliance']
      },
      {
        id: 'lr-seasonal-yield',
        title: 'Ultra-Luxury Rental Yield & Seasonal Peak Matrix',
        description: 'Models dynamic revenue projections across Cannes Film Festival, Monaco Grand Prix, and winter seasons.',
        code: `// Seasonal Peak Yield Modeling
function calculateSeasonalYield(baseWeeklyRate, peakWeeks, peakMultiplier, regularWeeks) {
  const peakRevenue = peakWeeks * baseWeeklyRate * peakMultiplier;
  const regularRevenue = regularWeeks * baseWeeklyRate;
  const grossAnnual = peakRevenue + regularRevenue;
  return { peakRevenue, regularRevenue, grossAnnual };
}`,
        tags: ['rental-yield', 'occupancy', 'investment', 'seasonal']
      },
      {
        id: 'lr-anonymous-escrow',
        title: 'VIP Non-Disclosure & Anonymous Trust Escrow Term Sheet',
        description: 'Standardized blind-trust representation clause and multi-signature earnest deposit schedule.',
        code: `// Anonymous Trust Escrow Schedule
function generateEscrowTerms(purchasePrice, earnestPercent = 10, inspectionDays = 21) {
  const earnestDeposit = purchasePrice * (earnestPercent / 100);
  const closingBalance = purchasePrice - earnestDeposit;
  return { earnestDeposit, closingBalance, inspectionDays, jurisdiction: 'Geneva Law / Delaware Trust' };
}`,
        tags: ['legal', 'escrow', 'nda', 'confidentiality']
      },
      {
        id: 'lr-heritage-restoration',
        title: 'Heritage Villa Architectural Restoration Budgeting',
        description: 'Itemizes historical monument preservation allowances, artisanal marble restoration, and seismic retrofitting.',
        code: `// Heritage Estate Restoration Cost Estimator
function estimateRestorationBudget(grossSqm, heritageMultiplier = 1.65, seismicReinforcementSqm = 850) {
  const baseRestorationCost = grossSqm * 3200;
  const heritageCost = baseRestorationCost * heritageMultiplier;
  const structuralCost = grossSqm * seismicReinforcementSqm;
  return { totalRestorationBudget: heritageCost + structuralCost };
}`,
        tags: ['architecture', 'renovation', 'heritage', 'costing']
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

    const id = snippet.id || `lr-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
      emptyMsg.className = 'lr-empty-vault';
      emptyMsg.textContent = 'No luxury real estate presets match your query.';
      container.append(emptyMsg);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'lr-snippet-card';
      card.dataset.id = item.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'lr-snippet-header';

      const title = document.createElement('h3');
      title.className = 'lr-snippet-title';
      title.textContent = item.title;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'lr-btn-copy';
      copyBtn.textContent = 'Copy Model';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.code);
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Model';
        }, 1500);
        if (onCopy) onCopy(item);
      });

      cardHeader.append(title, copyBtn);

      const desc = document.createElement('p');
      desc.className = 'lr-snippet-desc';
      desc.textContent = item.description;

      const codePre = document.createElement('pre');
      codePre.className = 'lr-snippet-code';
      const codeElem = document.createElement('code');
      codeElem.textContent = item.code;
      codePre.append(codeElem);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'lr-snippet-tags';
      for (const tag of item.tags) {
        const badge = document.createElement('span');
        badge.className = 'lr-tag-chip';
        badge.textContent = `#${tag}`;
        tagsContainer.append(badge);
      }

      card.append(cardHeader, desc, codePre, tagsContainer);
      container.append(card);
    }
  }
}
