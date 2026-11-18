/**
 * RealEstateLuxeDiffInspector
 * Visual state & text change diff inspector with line highlighting for luxury real estate purchase contracts, architectural specs, and HOA covenants.
 */
export class RealEstateLuxeDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentDiff = null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'purchase-sale-agreement',
        title: 'Ultra-Luxury Purchase & Sale Agreement',
        category: 'Legal Contracts',
        original: [
          'Purchase Offer Price: $22,000,000',
          'Initial Earnest Money Deposit: $500,000',
          'Financing Contingency: 21-Day Mortgage Underwriting',
          'Inspection Contingency: 14 Days (General Property Inspection)',
          'Title & Escrow Closing Window: 45 Calendar Days',
          'Custom Interior Furnishings: Excluded from Sale',
          'Closing Cost Transfer Tax Allocation: 50% Buyer / 50% Seller'
        ].join('\n'),
        modified: [
          'Purchase Offer Price: $24,500,000 (All-Cash Guarantee)',
          'Initial Earnest Money Deposit: $1,500,000',
          'Financing Contingency: Waived (Proof of Funds Escrowed)',
          'Inspection Contingency: 5 Days (Information Only, As-Is)',
          'Title & Escrow Closing Window: 14 Calendar Days Expedited',
          'Custom Interior Furnishings: Full Curated Italian Package Included',
          'Closing Cost Transfer Tax Allocation: 100% Covered by Buyer',
          'Private Jet Charter Credit: $50,000 Relocation Allowance'
        ].join('\n')
      },
      {
        id: 'architectural-specification',
        title: 'Penthouse Architectural & Finish Specifications',
        category: 'Design & Finishes',
        original: [
          'Primary Flooring: Engineered White Oak Planks (8-inch)',
          'Kitchen Countertops: Calacatta Quartz Composite Slabs',
          'Glazing: Dual-Pane Thermally Broken Aluminum Windows',
          'Outdoor Pool: 40ft Heated Chlorine Lap Pool',
          'HVAC System: Standard Multi-Zone VRF Air Conditioning',
          'Smart Home Automation: Crestron Core Baseline Lighting Hub'
        ].join('\n'),
        modified: [
          'Primary Flooring: Imported French Solid White Oak Chevron Parquet',
          'Kitchen Countertops: Bookmatched Calacatta Borghini Marble Slabs',
          'Glazing: Triple-Glazed Acoustic Acoustic Reynaers Minimalist Frames',
          'Outdoor Pool: 65ft Ozone Infinity Negative-Edge Horizon Pool',
          'HVAC System: Medical-Grade HEPA + UV Photocatalytic Air Filtration',
          'Smart Home Automation: Crestron Home OS 4 + Ketra Tunable Circadian Lighting',
          'Wellness Spa: Finnish Cedar Dry Sauna & Cold Plunge Suite'
        ].join('\n')
      },
      {
        id: 'hoa-covenants-ccr',
        title: 'Gated Enclave Covenants, Conditions & Restrictions (CC&Rs)',
        category: 'Property Covenants',
        original: [
          'Designated Quiet Hours: 10:00 PM - 07:00 AM Daily',
          'Helipad Private Aviation: Strictly Prohibited',
          'Gatehouse Security: 24/7 Guarded Gatehouse Entry',
          'Subleasing & Rentals: Minimum 6-Month Lease Duration',
          'Architectural Review Board Approval: Required for Exterior Color Changes'
        ].join('\n'),
        modified: [
          'Designated Quiet Hours: 11:00 PM - 07:00 AM Daily',
          'Helipad Private Aviation: Permitted for Resident Aircraft (Max 2 landings/week)',
          'Gatehouse Security: 24/7 Armed Patrols + Biometric License Plate Recognition',
          'Subleasing & Rentals: Strictly Prohibited (Single Family Owner-Occupied Only)',
          'Architectural Review Board Approval: Required for Exterior Color Changes',
          'Private Security Perimeter: Monitored Microwave Intrusion Detection Beam'
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

  renderToDOM(container, presetId = 'purchase-sale-agreement') {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'luxe-diff-container';

    const header = document.createElement('div');
    header.className = 'luxe-diff-header';

    const title = document.createElement('h3');
    title.textContent = 'Luxury Contract & Specification Diff Inspector';

    const selector = document.createElement('select');
    selector.className = 'luxe-diff-select';

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
    statsBar.className = 'luxe-diff-stats';
    wrapper.append(statsBar);

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'luxe-diff-viewer-grid';
    wrapper.append(tablesContainer);

    const loadPresetDiff = (id) => {
      const preset = this.getPresetById(id) || this.presets[0];
      const diff = this.computeDiff(preset.original, preset.modified);

      statsBar.replaceChildren();
      const statsItems = [
        { label: 'Total Clauses', val: diff.stats.totalLines, color: '#94a3b8' },
        { label: 'Modified', val: diff.stats.modified, color: '#f59e0b' },
        { label: 'Added', val: diff.stats.added, color: '#10b981' },
        { label: 'Removed', val: diff.stats.removed, color: '#ef4444' },
        { label: 'Variance', val: `${diff.stats.changePercent}%`, color: '#d4af37' }
      ];

      statsItems.forEach((st) => {
        const span = document.createElement('span');
        span.className = 'luxe-stat-pill';
        span.textContent = `${st.label}: ${st.val}`;
        span.style.borderColor = st.color;
        statsBar.append(span);
      });

      tablesContainer.replaceChildren();

      const table = document.createElement('table');
      table.className = 'luxe-diff-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const thLine = document.createElement('th');
      thLine.textContent = '#';
      const thOrig = document.createElement('th');
      thOrig.textContent = 'Initial Offer / Baseline Spec';
      const thMod = document.createElement('th');
      thMod.textContent = 'Revised Counter-Offer / Luxury Spec';
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
