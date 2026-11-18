/**
 * FintechVaultSnippetVault
 * Reusable preset snippet library & tag-based search vault for institutional financial algorithms, option pricing, loan amortization, and Basel III ratios.
 */
export class FintechVaultSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'black-scholes-call',
        title: 'Black-Scholes European Option Pricing Model',
        category: 'Quantitative Finance',
        tags: ['options', 'derivatives', 'pricing', 'quant'],
        description: 'Computes analytical price and Greeks for European call options using cumulative normal distribution approximation.',
        code: `function calculateCallOption(stockPrice, strikePrice, timeYears, riskFreeRate, volatility) {
  const d1 = (Math.log(stockPrice / strikePrice) + (riskFreeRate + 0.5 * volatility * volatility) * timeYears) / (volatility * Math.sqrt(timeYears));
  const d2 = d1 - volatility * Math.sqrt(timeYears);
  const normCDF = (x) => 0.5 * (1 + Math.sign(x) * Math.sqrt(1 - Math.exp(-2 * x * x / Math.PI)));
  const callPrice = stockPrice * normCDF(d1) - strikePrice * Math.exp(-riskFreeRate * timeYears) * normCDF(d2);
  return { callPrice: Math.round(callPrice * 100) / 100, d1: Math.round(d1 * 1000) / 1000, d2: Math.round(d2 * 1000) / 1000 };
}`
      },
      {
        id: 'loan-amortization',
        title: 'Fixed-Rate Loan Amortization Schedule',
        category: 'Commercial Lending',
        tags: ['lending', 'loans', 'interest', 'amortization'],
        description: 'Calculates monthly payment and total interest over repayment duration using annuity formulation.',
        code: `function calculateMonthlyPayment(principal, annualRatePercent, termYears) {
  const monthlyRate = (annualRatePercent / 100) / 12;
  const numPayments = termYears * 12;
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  const totalPaid = monthlyPayment * numPayments;
  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalInterest: Math.round((totalPaid - principal) * 100) / 100,
    totalPayments: numPayments
  };
}`
      },
      {
        id: 'value-at-risk-var',
        title: 'Parametric Value at Risk (VaR 99%)',
        category: 'Risk Management',
        tags: ['risk', 'var', 'portfolio', 'compliance'],
        description: 'Evaluates maximum probable portfolio loss over 1-day horizon at 99% confidence level (Z = 2.326).',
        code: `function calculateParametricVaR(portfolioValue, dailyVolatility, confidence = 0.99) {
  const zScore = confidence === 0.99 ? 2.326 : 1.645;
  const varLoss = portfolioValue * dailyVolatility * zScore;
  return {
    varAmount: Math.round(varLoss * 100) / 100,
    varPercent: Math.round(dailyVolatility * zScore * 10000) / 100,
    confidenceTier: \`\${confidence * 100}%\`
  };
}`
      },
      {
        id: 'liquidity-coverage-ratio',
        title: 'Basel III Liquidity Coverage Ratio (LCR)',
        category: 'Regulatory Capital',
        tags: ['banking', 'basel3', 'liquidity', 'reserves'],
        description: 'Ensures bank retains unencumbered High-Quality Liquid Assets (HQLA) against 30-day net cash outflows.',
        code: `function computeBasel3LCR(hqlaAmount, totalNetOutflows30d) {
  if (totalNetOutflows30d <= 0) return { lcrRatio: 100, status: 'Exempt' };
  const lcrRatio = (hqlaAmount / totalNetOutflows30d) * 100;
  return {
    lcrPercent: Math.round(lcrRatio * 10) / 10,
    isCompliant: lcrRatio >= 100.0,
    surplusBuffer: Math.round((hqlaAmount - totalNetOutflows30d) * 100) / 100
  };
}`
      },
      {
        id: 'compound-cagr',
        title: 'Compound Annual Growth Rate (CAGR)',
        category: 'Asset Valuation',
        tags: ['investing', 'yield', 'cagr', 'analytics'],
        description: 'Computes geometric annual rate of return for institutional investments over multi-year periods.',
        code: `function calculateCAGR(initialValue, finalValue, numYears) {
  if (initialValue <= 0 || numYears <= 0) return 0;
  const cagr = (Math.pow(finalValue / initialValue, 1 / numYears) - 1) * 100;
  return {
    cagrPercent: Math.round(cagr * 100) / 100,
    growthFactor: Math.round((finalValue / initialValue) * 100) / 100
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
    vaultWrapper.className = 'fintech-vault-container';

    const header = document.createElement('div');
    header.className = 'fintech-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Institutional Financial Model Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'fintech-vault-search';
    searchInput.placeholder = 'Search Black-Scholes, VaR, Basel III, amortization...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'fintech-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'fintech-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'fintech-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.fintech-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.fintech-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'fintech-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'fintech-vault-empty';
        emptyMsg.textContent = 'No matching financial models or algorithms found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'fintech-snippet-card';

        const top = document.createElement('div');
        top.className = 'fintech-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'fintech-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'fintech-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'fintech-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'fintech-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'fintech-copy-btn';
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
