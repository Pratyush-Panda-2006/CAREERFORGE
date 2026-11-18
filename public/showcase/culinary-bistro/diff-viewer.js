/**
 * CulinaryBistroDiffInspector
 * Visual state & text change diff inspector with line highlighting for Michelin tasting menu revisions, mise-en-place prep lists, and sommelier cellar pairings.
 */
export class CulinaryBistroDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentDiff = null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'seasonal-degustation-menu',
        title: 'Spring Season Tasting Degustation Menu',
        category: 'Menu Development',
        original: [
          'Service: 5-Course Signature Degustation',
          'Course 1: Brittany Oyster with Cucumber Granite',
          'Course 2: Foie Gras Torchon with Quince Jam & Brioche',
          'Course 3: Pan-Seared Chilean Sea Bass with Leek Fondue',
          'Course 4: Roasted French Squab with Parsnip Purée',
          'Course 5: Blood Orange Soufflé with Cardamom Anglaise',
          'Mignardises: Salted Caramel Bonbons & Canele'
        ].join('\n'),
        modified: [
          'Service: 6-Course Prestige Degustation',
          'Course 1: Royal Oscietra Caviar Tartlet with Smoked Crème',
          'Course 2: Seared Hudson Valley Foie Gras with Black Truffle',
          'Course 3: Steamed Brittany Turbot with Vin Jaune Emulsion',
          'Course 4: Charcoal-Grilled Miyazaki A5 Wagyu Striploin',
          'Course 5: Aged Comté Fondue with White Truffle Toast',
          'Course 6: Valrhona Guanaja 70% Chocolate Spheres with Miso Caramel',
          'Mignardises: Handcrafted Macarons & Périgord Truffle Pralines'
        ].join('\n')
      },
      {
        id: 'mise-en-place-station',
        title: 'Saucier & Garde Manger Mise-en-Place List',
        category: 'Kitchen Prep',
        original: [
          'Station: Entremetier & Saucier',
          'Roasted Veal Demi-Glace: 4.0 Liters',
          'Shellfish Bouillabaisse Fumét: 2.0 Liters',
          'Cultured Chervil Herb Butter: 500 Grams',
          'French Shallots Micro-Brunoise: 1.5 Kilograms',
          'Sous-Vide Duck Confit Thighs: 24 Portions'
        ].join('\n'),
        modified: [
          'Station: Entremetier & Saucier',
          'Roasted Veal Demi-Glace: 6.5 Liters (Reduced 36 hours)',
          'Shellfish Bouillabaisse Fumét: 3.5 Liters (Langoustine reduction)',
          'Cultured Chervil Herb Butter: 1.2 Kilograms',
          'French Shallots Micro-Brunoise: 2.5 Kilograms',
          'Périgord Winter Truffle Carpaccio: 450 Grams in Olive Oil',
          'Sous-Vide Duck Confit Thighs: 36 Portions',
          'Clarified Brown Butter Sabayon: 1.0 Liter'
        ].join('\n')
      },
      {
        id: 'sommelier-wine-pairing',
        title: 'Grand Cru Sommelier Wine Pairing Schedule',
        category: 'Beverage & Cellar',
        original: [
          'Pairing Tier: Classic French Terroir Flight',
          'Course 1: Pol Roger Champagne Brut Réserve NV',
          'Course 2: Henri Bourgeois Sancerre d’Antan 2021',
          'Course 3: Domaine Bouchard Meursault Les Genevrières 2019',
          'Course 4: Domaine du Vieux Télégraphe Châteauneuf-du-Pape 2017',
          'Course 5: Château Guiraud Premier Cru Sauternes 2015'
        ].join('\n'),
        modified: [
          'Pairing Tier: Rare Icon Vintage Sommelier Flight',
          'Course 1: Dom Pérignon Vintage Brut Champagne 2013',
          'Course 2: Domaine Leflaive Puligny-Montrachet Premier Cru 2020',
          'Course 3: Domaine Coche-Dury Meursault Les Rougeots 2018',
          'Course 4: Château Margaux Premier Grand Cru Classé 2010',
          'Course 5: Château d’Yquem Premier Cru Supérieur Sauternes 2009',
          'Digestif: Domaine de la Romanée-Conti Marc de Bourgogne 1999'
        ].join('\n')
      }
    ];
  }

  getPresets() {
    return this.presets;
  }

  getPresetById(id) {
    return this.presets.find((p) => p.id === id) || null;
  }

  computeDiff(originalText = '', modifiedText = '') {
    const originalLines = originalText.split('\n');
    const modifiedLines = modifiedText.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    const diffLines = [];
    let addedCount = 0;
    let removedCount = 0;
    let modifiedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < maxLines; i++) {
      const orig = originalLines[i];
      const mod = modifiedLines[i];

      if (orig === undefined) {
        diffLines.push({
          lineNumber: i + 1,
          type: 'added',
          originalText: '',
          modifiedText: mod
        });
        addedCount += 1;
      } else if (mod === undefined) {
        diffLines.push({
          lineNumber: i + 1,
          type: 'removed',
          originalText: orig,
          modifiedText: ''
        });
        removedCount += 1;
      } else if (orig === mod) {
        diffLines.push({
          lineNumber: i + 1,
          type: 'unchanged',
          originalText: orig,
          modifiedText: mod
        });
        unchangedCount += 1;
      } else {
        diffLines.push({
          lineNumber: i + 1,
          type: 'modified',
          originalText: orig,
          modifiedText: mod
        });
        modifiedCount += 1;
      }
    }

    this.currentDiff = {
      lines: diffLines,
      stats: {
        totalLines: maxLines,
        added: addedCount,
        removed: removedCount,
        modified: modifiedCount,
        unchanged: unchangedCount,
        changePercent: maxLines === 0 ? 0 : Math.round(((addedCount + removedCount + modifiedCount) / maxLines) * 100)
      }
    };

    return this.currentDiff;
  }

  renderToDOM(container, presetId = 'seasonal-degustation-menu') {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'culinary-diff-container';

    const header = document.createElement('div');
    header.className = 'culinary-diff-header';

    const title = document.createElement('h3');
    title.textContent = 'Culinary Menu & Station Diff Inspector';

    const selector = document.createElement('select');
    selector.className = 'culinary-diff-select';

    this.presets.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.category}: ${p.title}`;
      if (p.id === presetId) opt.selected = true;
      selector.append(opt);
    });

    header.append(title, selector);
    wrapper.append(header);

    const statsBar = document.createElement('div');
    statsBar.className = 'culinary-diff-stats';
    wrapper.append(statsBar);

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'culinary-diff-viewer-grid';
    wrapper.append(tablesContainer);

    const loadPresetDiff = (id) => {
      const preset = this.getPresetById(id) || this.presets[0];
      const diff = this.computeDiff(preset.original, preset.modified);

      statsBar.replaceChildren();
      const statsItems = [
        { label: 'Total Items', val: diff.stats.totalLines, color: '#a8a29e' },
        { label: 'Modified', val: diff.stats.modified, color: '#f59e0b' },
        { label: 'Added', val: diff.stats.added, color: '#10b981' },
        { label: 'Removed', val: diff.stats.removed, color: '#ef4444' },
        { label: 'Menu Variance', val: `${diff.stats.changePercent}%`, color: '#fb923c' }
      ];

      statsItems.forEach((st) => {
        const span = document.createElement('span');
        span.className = 'culinary-stat-pill';
        span.textContent = `${st.label}: ${st.val}`;
        span.style.borderColor = st.color;
        statsBar.append(span);
      });

      tablesContainer.replaceChildren();

      const table = document.createElement('table');
      table.className = 'culinary-diff-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const thLine = document.createElement('th');
      thLine.textContent = '#';
      const thOrig = document.createElement('th');
      thOrig.textContent = 'Previous Recipe / Base Lineup';
      const thMod = document.createElement('th');
      thMod.textContent = 'Updated Service / Revised Lineup';
      headRow.append(thLine, thOrig, thMod);
      thead.append(headRow);
      table.append(thead);

      const tbody = document.createElement('tbody');
      diff.lines.forEach((line) => {
        const row = document.createElement('tr');
        row.className = `diff-line-${line.type}`;

        const tdLine = document.createElement('td');
        tdLine.className = 'line-num';
        tdLine.textContent = String(line.lineNumber);

        const tdOrig = document.createElement('td');
        tdOrig.className = 'line-orig';
        tdOrig.textContent = line.originalText || '—';

        const tdMod = document.createElement('td');
        tdMod.className = 'line-mod';
        tdMod.textContent = line.modifiedText || '—';

        row.append(tdLine, tdOrig, tdMod);
        tbody.append(row);
      });

      table.append(tbody);
      tablesContainer.append(table);
    };

    selector.addEventListener('change', (e) => {
      loadPresetDiff(e.target.value);
    });

    loadPresetDiff(presetId);
    container.append(wrapper);
  }
}
