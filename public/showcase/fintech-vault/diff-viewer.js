/**
 * FintechVaultDiffInspector
 * Visual state & text change diff inspector with line highlighting for capital adequacy ratios, payment gateway fee schedules, and syndicated facility terms.
 */
export class FintechVaultDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentDiff = null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'basel-capital-ratios',
        title: 'Basel III Capital Adequacy & Solvency Metrics',
        category: 'Prudential Ratios',
        original: [
          'Regulatory Framework: Basel III Standardized',
          'Common Equity Tier 1 (CET1): 6.8%',
          'Tier 1 Capital Ratio: 8.5%',
          'Total Capital Ratio: 10.5%',
          'Tier 1 Leverage Ratio: 3.2%',
          'Capital Conservation Buffer: 1.8%',
          'Risk-Weighted Assets (RWA): $4,200,000,000',
          'Net Stable Funding Ratio (NSFR): 102.4%'
        ].join('\n'),
        modified: [
          'Regulatory Framework: Basel III Advanced IRB',
          'Common Equity Tier 1 (CET1): 9.4%',
          'Tier 1 Capital Ratio: 11.2%',
          'Total Capital Ratio: 13.8%',
          'Tier 1 Leverage Ratio: 4.8%',
          'Capital Conservation Buffer: 2.5%',
          'Risk-Weighted Assets (RWA): $3,850,000,000',
          'Net Stable Funding Ratio (NSFR): 118.6%'
        ].join('\n')
      },
      {
        id: 'payment-gateway-fee-schedule',
        title: 'Institutional Payment Gateway Fee Schedule',
        category: 'Merchant Pricing',
        original: [
          'Tier: Enterprise Volume Gateway',
          'Domestic Card Interchange: 1.75% + $0.30',
          'Cross-Border FX Surcharge: 1.20%',
          'ACH Push Payment Processing: 0.80% (Max $5.00)',
          'Chargeback Arbitration Fee: $25.00',
          'Rolling Reserve Holdback: 5.0% for 90 days',
          'Batch Settlement Cycle: T+2 Business Days'
        ].join('\n'),
        modified: [
          'Tier: Enterprise Tier-1 High-Volume Interchange',
          'Domestic Card Interchange: 1.35% + $0.18',
          'Cross-Border FX Surcharge: 0.85%',
          'ACH Push Payment Processing: 0.50% (Max $2.50)',
          'Chargeback Arbitration Fee: $15.00',
          'Rolling Reserve Holdback: 2.0% for 30 days',
          'Batch Settlement Cycle: Real-Time Gross Settlement (RTGS)',
          'Instant SEPA Credit Transfer Surcharge: 0.10%'
        ].join('\n')
      },
      {
        id: 'corporate-syndicated-facility',
        title: 'Syndicated Credit Facility Term Sheet',
        category: 'Commercial Credit',
        original: [
          'Borrower: Global Infrastructure Treasury LLC',
          'Facility Limit: $250,000,000',
          'Benchmark Pricing: Daily Compounded SOFR + 185 bps',
          'Undrawn Commitment Fee: 35 bps',
          'Facility Maturity: 36 Months',
          'Maximum Net Debt / EBITDA Leverage: 3.75x',
          'Minimum Interest Coverage Ratio: 3.00x'
        ].join('\n'),
        modified: [
          'Borrower: Global Infrastructure Treasury LLC',
          'Facility Limit: $350,000,000',
          'Benchmark Pricing: Daily Compounded SOFR + 145 bps',
          'Undrawn Commitment Fee: 25 bps',
          'Facility Maturity: 60 Months',
          'Maximum Net Debt / EBITDA Leverage: 4.25x',
          'Minimum Interest Coverage Ratio: 2.75x',
          'Green Transition ESG Margin Discount: -10 bps'
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

  renderToDOM(container, presetId = 'basel-capital-ratios') {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'fintech-diff-container';

    const header = document.createElement('div');
    header.className = 'fintech-diff-header';

    const title = document.createElement('h3');
    title.textContent = 'Institutional Financial Diff Inspector';

    const selector = document.createElement('select');
    selector.className = 'fintech-diff-select';

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
    statsBar.className = 'fintech-diff-stats';
    wrapper.append(statsBar);

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'fintech-diff-viewer-grid';
    wrapper.append(tablesContainer);

    const loadPresetDiff = (id) => {
      const preset = this.getPresetById(id) || this.presets[0];
      const diff = this.computeDiff(preset.original, preset.modified);

      statsBar.replaceChildren();
      const statsItems = [
        { label: 'Total Clauses / Metrics', val: diff.stats.totalLines, color: '#94a3b8' },
        { label: 'Modified', val: diff.stats.modified, color: '#f59e0b' },
        { label: 'Added', val: diff.stats.added, color: '#10b981' },
        { label: 'Removed', val: diff.stats.removed, color: '#ef4444' },
        { label: 'Variance', val: `${diff.stats.changePercent}%`, color: '#fbbf24' }
      ];

      statsItems.forEach((st) => {
        const span = document.createElement('span');
        span.className = 'fintech-stat-pill';
        span.textContent = `${st.label}: ${st.val}`;
        span.style.borderColor = st.color;
        statsBar.append(span);
      });

      tablesContainer.replaceChildren();

      const table = document.createElement('table');
      table.className = 'fintech-diff-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const thLine = document.createElement('th');
      thLine.textContent = '#';
      const thOrig = document.createElement('th');
      thOrig.textContent = 'Historical Baseline';
      const thMod = document.createElement('th');
      thMod.textContent = 'Revised Terms / Current Schedule';
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
