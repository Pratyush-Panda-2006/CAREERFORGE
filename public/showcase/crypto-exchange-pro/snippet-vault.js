/**
 * CryptoExchangeProSnippetVault
 * Reusable preset snippet library & tag-based search vault for cryptocurrency trading scripts and order algorithms.
 */
export class CryptoExchangeProSnippetVault {
  constructor(initialSnippets = null) {
    this.snippets = new Map();

    const defaults = initialSnippets || [
      {
        id: 'cep-twap-execution',
        title: 'TWAP Order Execution Routine',
        description: 'Slices large institutional orders over uniform discrete intervals to minimize market impact.',
        code: `// Time-Weighted Average Price (TWAP) execution
function calculateTWAPSlices(totalQty, durationMinutes, sliceIntervalSeconds) {
  const totalSlices = Math.floor((durationMinutes * 60) / sliceIntervalSeconds);
  const sliceQty = totalQty / totalSlices;
  return { totalSlices, sliceQty, intervalMs: sliceIntervalSeconds * 1000 };
}`,
        tags: ['execution', 'twap', 'algorithmic', 'order']
      },
      {
        id: 'cep-grid-bot',
        title: 'Grid Trading Bot Price Levels',
        description: 'Calculates geometric price spacing for automated market making across market ranges.',
        code: `// Geometric Grid Trading Levels
function generateGridLevels(lowerPrice, upperPrice, gridCount) {
  const ratio = Math.pow(upperPrice / lowerPrice, 1 / (gridCount - 1));
  const levels = [];
  for (let i = 0; i < gridCount; i++) {
    levels.push(Number((lowerPrice * Math.pow(ratio, i)).toFixed(2)));
  }
  return levels;
}`,
        tags: ['bot', 'grid-trading', 'market-making', 'orders']
      },
      {
        id: 'cep-funding-arbitrage',
        title: 'Perpetual Funding Rate Arbitrage',
        description: 'Computes net annual yield for cash-and-carry basis trade between spot and perpetual contracts.',
        code: `// Cash and Carry Funding Yield APR
function calculateFundingYieldAPR(fundingRate8h, basisSpread) {
  const dailyRate = fundingRate8h * 3;
  const annualFundingYield = dailyRate * 365 * 100;
  return { annualFundingYield, totalAPR: annualFundingYield + basisSpread };
}`,
        tags: ['arbitrage', 'funding-rate', 'perpetual', 'hedging']
      },
      {
        id: 'cep-depth-slippage',
        title: 'Orderbook Depth Slippage Estimator',
        description: 'Simulates market order consumption through cumulative bid/ask levels to compute expected slippage.',
        code: `// Orderbook Slippage Model
function estimateSlippage(orderSize, depthLevels) {
  let remaining = orderSize;
  let totalCost = 0;
  for (const [price, qty] of depthLevels) {
    const fillQty = Math.min(remaining, qty);
    totalCost += fillQty * price;
    remaining -= fillQty;
    if (remaining <= 0) break;
  }
  const avgExecutionPrice = totalCost / orderSize;
  return { avgPrice: avgExecutionPrice, unconsumed: remaining };
}`,
        tags: ['orderbook', 'slippage', 'liquidity', 'math']
      },
      {
        id: 'cep-trailing-stop',
        title: 'Dynamic Trailing Stop-Loss Trigger',
        description: 'Adjusts protective stop-loss price dynamically as asset reaches higher swing highs.',
        code: `// Trailing Stop-Loss Evaluation
function evaluateTrailingStop(currentPrice, highestPrice, trailPercent) {
  const updatedHighest = Math.max(highestPrice, currentPrice);
  const stopPrice = updatedHighest * (1 - trailPercent / 100);
  const isTriggered = currentPrice <= stopPrice;
  return { updatedHighest, stopPrice, isTriggered };
}`,
        tags: ['risk', 'stop-loss', 'trailing-stop', 'execution']
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

    const id = snippet.id || `cep-snip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
      emptyMsg.className = 'cep-empty-vault';
      emptyMsg.textContent = 'No trading algorithms match your filter query.';
      container.append(emptyMsg);
      return;
    }

    for (const item of items) {
      const card = document.createElement('article');
      card.className = 'cep-snippet-card';
      card.dataset.id = item.id;

      const cardHeader = document.createElement('div');
      cardHeader.className = 'cep-snippet-header';

      const title = document.createElement('h3');
      title.className = 'cep-snippet-title';
      title.textContent = item.title;

      const copyBtn = document.createElement('button');
      copyBtn.className = 'cep-btn-copy';
      copyBtn.textContent = 'Copy Code';
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(item.code);
        }
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy Code';
        }, 1500);
        if (onCopy) onCopy(item);
      });

      cardHeader.append(title, copyBtn);

      const desc = document.createElement('p');
      desc.className = 'cep-snippet-desc';
      desc.textContent = item.description;

      const codePre = document.createElement('pre');
      codePre.className = 'cep-snippet-code';
      const codeElem = document.createElement('code');
      codeElem.textContent = item.code;
      codePre.append(codeElem);

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'cep-snippet-tags';
      for (const tag of item.tags) {
        const badge = document.createElement('span');
        badge.className = 'cep-tag-chip';
        badge.textContent = `#${tag}`;
        tagsContainer.append(badge);
      }

      card.append(cardHeader, desc, codePre, tagsContainer);
      container.append(card);
    }
  }
}
