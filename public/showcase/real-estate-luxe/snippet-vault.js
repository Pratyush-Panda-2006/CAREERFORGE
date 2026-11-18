/**
 * RealEstateLuxeSnippetVault
 * Reusable preset snippet library & tag-based search vault for ultra-luxury estate valuation, Cap rate, NOI, DSCR, and mansion transfer taxes.
 */
export class RealEstateLuxeSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'cap-rate-noi',
        title: 'Capitalization Rate & Net Operating Income (NOI)',
        category: 'Estate Valuation',
        tags: ['caprate', 'noi', 'valuation', 'commercial'],
        description: 'Calculates asset capitalization yield based on gross operating income minus operational maintenance expenses.',
        code: `function calculateCapRate(grossRevenue, operatingExpenses, assetValuation) {
  const noi = grossRevenue - operatingExpenses;
  const capRate = (noi / assetValuation) * 100;
  return {
    netOperatingIncome: noi,
    capRatePercent: Math.round(capRate * 100) / 100,
    yieldQuality: capRate >= 6.5 ? 'Prime Yield' : capRate >= 4.5 ? 'Core Trophy' : 'Ultra-Core'
  };
}`
      },
      {
        id: 'gross-rent-multiplier',
        title: 'Gross Rent Multiplier (GRM) Ratio',
        category: 'Cashflow Analytics',
        tags: ['grm', 'rent', 'yield', 'cashflow'],
        description: 'Computes purchase price multiple against annual gross luxury rental income.',
        code: `function computeGRM(purchasePrice, annualGrossRent) {
  if (annualGrossRent <= 0) return 0;
  const grm = purchasePrice / annualGrossRent;
  return {
    grmRatio: Math.round(grm * 10) / 10,
    breakEvenYears: Math.ceil(grm)
  };
}`
      },
      {
        id: 'luxury-stamp-duty',
        title: 'Tiered Mansion Tax & Transfer Stamp Duty',
        category: 'Tax & Compliance',
        tags: ['tax', 'mansion', 'stampduty', 'closing'],
        description: 'Calculates progressive municipal transfer stamp duty for properties exceeding $10,000,000.',
        code: `function calculateMansionTax(purchasePrice) {
  let baseTaxRate = 0.01;
  if (purchasePrice >= 25000000) {
    baseTaxRate = 0.055;
  } else if (purchasePrice >= 10000000) {
    baseTaxRate = 0.035;
  } else if (purchasePrice >= 5000000) {
    baseTaxRate = 0.02;
  }
  const taxAmount = purchasePrice * baseTaxRate;
  return {
    taxAmount: Math.round(taxAmount),
    effectiveRate: \`\${(baseTaxRate * 100).toFixed(1)}%\`,
    isMansionTier: purchasePrice >= 5000000
  };
}`
      },
      {
        id: 'debt-service-coverage',
        title: 'Debt Service Coverage Ratio (DSCR)',
        category: 'Underwriting Math',
        tags: ['dscr', 'lending', 'underwriting', 'mortgage'],
        description: 'Evaluates commercial estate debt service capacity against annual principal and interest payments.',
        code: `function evaluateDSCR(annualNOI, annualDebtService) {
  if (annualDebtService <= 0) return { dscr: 0, status: 'Invalid Debt Service' };
  const dscr = annualNOI / annualDebtService;
  return {
    dscr: Math.round(dscr * 100) / 100,
    underwritingApproved: dscr >= 1.25,
    coverageMargin: \`\${Math.round((dscr - 1) * 100)}%\`
  };
}`
      },
      {
        id: 'irr-cash-flow',
        title: 'Cash-on-Cash Return & Equity Multiple',
        category: 'Investment Returns',
        tags: ['returns', 'equity', 'irr', 'investing'],
        description: 'Determines pre-tax cash flow yield relative to total initial equity capital invested.',
        code: `function computeCashOnCash(annualCashFlow, totalCashInvested) {
  if (totalCashInvested <= 0) return 0;
  const coc = (annualCashFlow / totalCashInvested) * 100;
  return {
    cashOnCashPercent: Math.round(coc * 100) / 100,
    annualNetYield: annualCashFlow
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
      category: snippet.category || 'Custom Model',
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
    vaultWrapper.className = 'luxe-vault-container';

    const header = document.createElement('div');
    header.className = 'luxe-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Ultra-Luxury Valuation & Underwriting Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'luxe-vault-search';
    searchInput.placeholder = 'Search Cap rate, NOI, DSCR, mansion tax, cash flow...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'luxe-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'luxe-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'luxe-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.luxe-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.luxe-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'luxe-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'luxe-vault-empty';
        emptyMsg.textContent = 'No matching estate formulas found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'luxe-snippet-card';

        const top = document.createElement('div');
        top.className = 'luxe-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'luxe-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'luxe-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'luxe-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'luxe-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'luxe-copy-btn';
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
