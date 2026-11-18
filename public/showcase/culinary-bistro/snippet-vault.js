/**
 * CulinaryBistroSnippetVault
 * Reusable preset snippet library & tag-based search vault for culinary science formulas, baker's percentages, sous-vide pasteurization, and food cost margins.
 */
export class CulinaryBistroSnippetVault {
  constructor(options = {}) {
    this.snippets = options.snippets || this.getDefaultSnippets();
    this.customSnippets = [];
  }

  getDefaultSnippets() {
    return [
      {
        id: 'bakers-percentage',
        title: 'Artisan Sourdough Baker\'s Percentage Calculator',
        category: 'Baking Science',
        tags: ['baking', 'dough', 'hydration', 'pastry'],
        description: 'Scales water, levain starter, and salt precisely based on total flour base weight (100%).',
        code: `function calculateSourdoughFormula(flourWeightGrams, hydrationPercent = 78, levainPercent = 20, saltPercent = 2.2) {
  const waterWeight = (flourWeightGrams * hydrationPercent) / 100;
  const levainWeight = (flourWeightGrams * levainPercent) / 100;
  const saltWeight = (flourWeightGrams * saltPercent) / 100;
  const totalDough = flourWeightGrams + waterWeight + levainWeight + saltWeight;
  return {
    flourWeight: flourWeightGrams,
    waterWeight: Math.round(waterWeight),
    levainWeight: Math.round(levainWeight),
    saltWeight: Math.round(saltWeight * 10) / 10,
    totalDoughWeight: Math.round(totalDough)
  };
}`
      },
      {
        id: 'equilibrium-brining',
        title: 'Equilibrium Wet Brine Salinity & Cure Ratio',
        category: 'Charcuterie & Curing',
        tags: ['brining', 'curing', 'charcuterie', 'salinity'],
        description: 'Computes exact salt and Prague powder mass based on combined meat and water weight for homogeneous penetration.',
        code: `function computeEquilibriumBrine(meatGrams, waterGrams, targetSaltPercent = 2.25) {
  const totalMass = meatGrams + waterGrams;
  const saltGrams = (totalMass * targetSaltPercent) / 100;
  const curingSaltGrams = (totalMass * 0.25) / 100; // 0.25% Cure #1 (156ppm nitrite)
  return {
    kosherSaltGrams: Math.round(saltGrams * 10) / 10,
    praguePowderGrams: Math.round(curingSaltGrams * 10) / 10,
    salinityTier: targetSaltPercent > 2.5 ? 'Heavy Preservation' : 'Balanced Palate'
  };
}`
      },
      {
        id: 'sousvide-pasteurization',
        title: 'Baldwin Sous-Vide Core Pasteurization Log',
        category: 'Thermal Science',
        tags: ['sousvide', 'foodsafety', 'temperature', 'cooking'],
        description: 'Estimates 7D reduction of Salmonella in poultry based on bath temperature and slab thickness.',
        code: `function getSousVideHoldTime(bathTempC, slabThicknessMm) {
  if (bathTempC < 54.5) return { safe: false, reason: 'Temperature below pathogen inactivation threshold' };
  // Base time at 63.5C for 25mm thickness is approx 42 mins
  const tempFactor = Math.pow(10, (63.5 - bathTempC) / 10);
  const thicknessFactor = Math.pow(slabThicknessMm / 25, 1.8);
  const holdMinutes = Math.round(42 * tempFactor * thicknessFactor);
  return {
    safe: true,
    targetCoreTemp: \`\${bathTempC}°C\`,
    recommendedHoldMinutes: holdMinutes
  };
}`
      },
      {
        id: 'brix-refractometry',
        title: 'Sorbet Brix Sugar Density & Freezing Point',
        category: 'Pastry & Molecular',
        tags: ['dessert', 'brix', 'sorbet', 'molecular'],
        description: 'Balances fruit purée sugar density between 28-32° Brix for optimal crystal texture without icy hardening.',
        code: `function balanceSorbetBrix(currentBrix, pureeVolumeMl, targetBrix = 30) {
  if (currentBrix >= targetBrix) return { syrupToAddMl: 0, status: 'Ideal or High Sugar' };
  // Simple syrup (65 Brix) addition formula
  const sugarNeededGrams = ((targetBrix - currentBrix) / 100) * pureeVolumeMl;
  const simpleSyrupVolume = Math.round(sugarNeededGrams / 0.65);
  return {
    simpleSyrupToAddMl: simpleSyrupVolume,
    finalTargetBrix: \`\${targetBrix}°Bx\`
  };
}`
      },
      {
        id: 'food-cost-percentage',
        title: 'Plated Dish Food Cost & Menu Pricing Engine',
        category: 'Kitchen Economics',
        tags: ['costing', 'pricing', 'inventory', 'margins'],
        description: 'Calculates retail menu price from ingredient costs targeting strict 26-30% prime food cost ratios.',
        code: `function calculatePlatePrice(ingredientCostTotal, targetCostPercent = 28) {
  if (targetCostPercent <= 0) return 0;
  const menuPrice = ingredientCostTotal / (targetCostPercent / 100);
  const grossMargin = menuPrice - ingredientCostTotal;
  return {
    menuPriceSuggested: Math.ceil(menuPrice),
    grossProfitPerServing: Math.round(grossMargin * 100) / 100,
    costRatio: \`\${targetCostPercent}%\`
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
      category: snippet.category || 'Custom Recipe',
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
    vaultWrapper.className = 'culinary-vault-container';

    const header = document.createElement('div');
    header.className = 'culinary-vault-header';

    const title = document.createElement('h3');
    title.textContent = 'Culinary Science & Recipe Vault';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'culinary-vault-search';
    searchInput.placeholder = 'Search sourdough, sous-vide, brining, brix, food cost...';

    header.append(title, searchInput);
    vaultWrapper.append(header);

    const tagsRow = document.createElement('div');
    tagsRow.className = 'culinary-vault-tags';

    const allTagBtn = document.createElement('button');
    allTagBtn.className = 'culinary-tag-btn active';
    allTagBtn.textContent = 'All';
    let currentTag = '';

    tagsRow.append(allTagBtn);

    const tags = this.getAllTags();
    tags.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'culinary-tag-btn';
      btn.textContent = t;
      btn.addEventListener('click', () => {
        tagsRow.querySelectorAll('.culinary-tag-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentTag = t;
        renderList();
      });
      tagsRow.append(btn);
    });

    allTagBtn.addEventListener('click', () => {
      tagsRow.querySelectorAll('.culinary-tag-btn').forEach((b) => b.classList.remove('active'));
      allTagBtn.classList.add('active');
      currentTag = '';
      renderList();
    });

    vaultWrapper.append(tagsRow);

    const listContainer = document.createElement('div');
    listContainer.className = 'culinary-vault-list';
    vaultWrapper.append(listContainer);

    const renderList = () => {
      listContainer.replaceChildren();
      const filtered = this.search(searchInput.value, currentTag);

      if (filtered.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'culinary-vault-empty';
        emptyMsg.textContent = 'No matching culinary science formulas found.';
        listContainer.append(emptyMsg);
        return;
      }

      filtered.forEach((snippet) => {
        const card = document.createElement('div');
        card.className = 'culinary-snippet-card';

        const top = document.createElement('div');
        top.className = 'culinary-card-top';

        const cardTitle = document.createElement('h4');
        cardTitle.textContent = snippet.title;

        const catBadge = document.createElement('span');
        catBadge.className = 'culinary-cat-badge';
        catBadge.textContent = snippet.category;

        top.append(cardTitle, catBadge);

        const desc = document.createElement('p');
        desc.className = 'culinary-snippet-desc';
        desc.textContent = snippet.description;

        const codeBlock = document.createElement('pre');
        codeBlock.className = 'culinary-snippet-code';
        const codeElem = document.createElement('code');
        codeElem.textContent = snippet.code;
        codeBlock.append(codeElem);

        const actions = document.createElement('div');
        actions.className = 'culinary-card-actions';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'culinary-copy-btn';
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
