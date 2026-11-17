/**
 * DeFi Yield Matrix - Reusable Preset Snippet Library & Tag-Based Search Vault
 * Preset financial algorithms for concentrated liquidity, flash loan arbitrage, and dynamic interest rate curves.
 */

export class DeFiYieldMatrixSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = initialSnippets || [
      {
        id: 'snip-defi-01',
        title: 'Uniswap v3 Concentrated Liquidity Capital Efficiency Multiplier',
        category: 'liquidity',
        tags: ['amm', 'uniswap', 'liquidity', 'efficiency'],
        description: 'Calculates the capital efficiency gain factor over standard v2 full-range liquidity between price bounds [Pa, Pb].',
        code: `function computeCapitalEfficiency(currentPrice, lowerPrice, upperPrice) {
  if (lowerPrice >= upperPrice || currentPrice <= 0) return 0.0;
  const sqrtP = Math.sqrt(currentPrice);
  const sqrtPa = Math.sqrt(lowerPrice);
  const sqrtPb = Math.sqrt(upperPrice);

  const denom = 1 - Math.sqrt(lowerPrice / upperPrice);
  return Number((1 / denom).toFixed(2));
}`
      },
      {
        id: 'snip-defi-02',
        title: 'Flash Loan Multi-DEX Arbitrage Net Spread Calculator',
        category: 'arbitrage',
        tags: ['arbitrage', 'flashloan', 'mev', 'spread'],
        description: 'Calculates net profit after subtracting Aave flash loan fee (0.05%) and L1 gas execution cost.',
        code: `function calculateArbitrageProfit(borrowAmountUsdc, buyPrice, sellPrice, gasCostUsd, flashLoanFeePct = 0.05) {
  const flashLoanFee = borrowAmountUsdc * (flashLoanFeePct / 100);
  const tokensPurchased = borrowAmountUsdc / buyPrice;
  const grossProceeds = tokensPurchased * sellPrice;
  const netProfit = grossProceeds - borrowAmountUsdc - flashLoanFee - gasCostUsd;

  return Number(netProfit.toFixed(2));
}`
      },
      {
        id: 'snip-defi-03',
        title: 'Compound v3 Two-Slope Kink Borrow APY Interest Model',
        category: 'lending',
        tags: ['lending', 'compound', 'interest', 'borrow'],
        description: 'Two-slope piecewise interest rate model with base rate, normal slope, and high utilization jump rate.',
        code: `function computeBorrowRate(utilizationPct, baseRate = 0.02, kink = 0.8, slope1 = 0.04, slope2 = 0.60) {
  const u = Math.min(1.0, Math.max(0.0, utilizationPct / 100));
  if (u <= kink) {
    return Number(((baseRate + (u / kink) * slope1) * 100).toFixed(2));
  } else {
    const excessU = (u - kink) / (1 - kink);
    return Number(((baseRate + slope1 + excessU * slope2) * 100).toFixed(2));
  }
}`
      },
      {
        id: 'snip-defi-04',
        title: 'Continuous Compounding APY to Nominal APR Converter',
        category: 'yield',
        tags: ['yield', 'apy', 'apr', 'compounding'],
        description: 'Converts continuous automated harvest APY into annualized nominal percentage rate given compounding frequency.',
        code: `function convertApyToApr(apyPercent, periodsPerYear = 365) {
  const apyDecimal = apyPercent / 100;
  const aprDecimal = periodsPerYear * (Math.pow(1 + apyDecimal, 1 / periodsPerYear) - 1);
  return Number((aprDecimal * 100).toFixed(4));
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
      id: snippet.id || `snip-defi-${Date.now()}`,
      title: snippet.title.trim(),
      category: snippet.category || 'general',
      tags: Array.isArray(snippet.tags) ? snippet.tags.map(t => t.toLowerCase()) : ['custom'],
      description: snippet.description || 'Custom DeFi algorithm snippet',
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

    const vault = new DeFiYieldMatrixSnippetVault();
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
        empty.textContent = 'No DeFi formula presets found matching your query.';
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
