/**
 * HealthVitalityDiffInspector
 * Visual state & text change diff inspector with line highlighting for clinical biomarker panels, training regimens, and sleep architecture.
 */
export class HealthVitalityDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentDiff = null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'blood-lipid-panel',
        title: 'Clinical Blood & Lipid Panel Benchmark',
        category: 'Biomarkers',
        original: [
          'Fasting Glucose: 108 mg/dL (Elevated pre-diabetic baseline)',
          'HbA1c: 5.7% (Borderline)',
          'Total Cholesterol: 228 mg/dL',
          'LDL-C: 142 mg/dL (Sub-optimal atherogenic risk)',
          'HDL-C: 42 mg/dL (Low protective tier)',
          'Triglycerides: 170 mg/dL',
          'hs-CRP: 2.8 mg/L (Moderate systemic inflammation)',
          'Fasting Insulin: 14.2 uIU/mL'
        ].join('\n'),
        modified: [
          'Fasting Glucose: 89 mg/dL (Optimal insulin-sensitive range)',
          'HbA1c: 5.1% (Healthy baseline)',
          'Total Cholesterol: 184 mg/dL',
          'LDL-C: 98 mg/dL (Optimal protective threshold)',
          'HDL-C: 62 mg/dL (High protective tier)',
          'Triglycerides: 88 mg/dL',
          'hs-CRP: 0.6 mg/L (Minimal systemic inflammation)',
          'Fasting Insulin: 5.8 uIU/mL'
        ].join('\n')
      },
      {
        id: 'endurance-training-macro',
        title: 'Marathon Regimen & Macronutrient Periodization',
        category: 'Athletic Nutrition',
        original: [
          'Phase: Aerobic Base Building',
          'Daily Caloric Target: 2400 kcal',
          'Carbohydrate Partition: 280g (4.0g/kg)',
          'Protein Partition: 135g (1.9g/kg)',
          'Dietary Fat: 75g (1.0g/kg)',
          'Hydration Target: 2.8 Liters/day',
          'Sodium Electrolyte Baseline: 2200 mg'
        ].join('\n'),
        modified: [
          'Phase: Peak Mileage & Carb-Loading Peak',
          'Daily Caloric Target: 3450 kcal',
          'Carbohydrate Partition: 520g (7.4g/kg)',
          'Protein Partition: 155g (2.2g/kg)',
          'Dietary Fat: 78g (1.1g/kg)',
          'Hydration Target: 4.5 Liters/day',
          'Sodium Electrolyte Baseline: 4400 mg (Thermal stress load)'
        ].join('\n')
      },
      {
        id: 'sleep-architecture-optimization',
        title: 'Polysomnography Sleep Architecture',
        category: 'Sleep Biometrics',
        original: [
          'Total Sleep Duration: 6h 15m',
          'Deep Stage N3 (Slow Wave): 42m (11.2%)',
          'REM Stage Sleep: 58m (15.4%)',
          'Light N1/N2 Sleep: 4h 35m (73.4%)',
          'Sleep Latency: 34 minutes',
          'Wake After Sleep Onset (WASO): 46 minutes',
          'Overnight HRV RMSSD: 32 ms'
        ].join('\n'),
        modified: [
          'Total Sleep Duration: 7h 55m',
          'Deep Stage N3 (Slow Wave): 1h 48m (22.7%)',
          'REM Stage Sleep: 1h 56m (24.4%)',
          'Light N1/N2 Sleep: 4h 11m (52.9%)',
          'Sleep Latency: 12 minutes',
          'Wake After Sleep Onset (WASO): 11 minutes',
          'Overnight HRV RMSSD: 68 ms'
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

  renderToDOM(container, presetId = 'blood-lipid-panel') {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'health-diff-container';

    const header = document.createElement('div');
    header.className = 'health-diff-header';

    const title = document.createElement('h3');
    title.textContent = 'Biometric & Regimen Diff Inspector';

    const selector = document.createElement('select');
    selector.className = 'health-diff-select';

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
    statsBar.className = 'health-diff-stats';
    wrapper.append(statsBar);

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'health-diff-viewer-grid';
    wrapper.append(tablesContainer);

    const loadPresetDiff = (id) => {
      const preset = this.getPresetById(id) || this.presets[0];
      const diff = this.computeDiff(preset.original, preset.modified);

      statsBar.replaceChildren();
      const statsItems = [
        { label: 'Total Metrics', val: diff.stats.totalLines, color: '#94a3b8' },
        { label: 'Optimized / Modified', val: diff.stats.modified, color: '#f59e0b' },
        { label: 'Added', val: diff.stats.added, color: '#10b981' },
        { label: 'Removed', val: diff.stats.removed, color: '#ef4444' },
        { label: 'Variance', val: `${diff.stats.changePercent}%`, color: '#38bdf8' }
      ];

      statsItems.forEach((st) => {
        const span = document.createElement('span');
        span.className = 'health-stat-pill';
        span.textContent = `${st.label}: ${st.val}`;
        span.style.borderColor = st.color;
        statsBar.append(span);
      });

      tablesContainer.replaceChildren();

      const table = document.createElement('table');
      table.className = 'health-diff-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const thLine = document.createElement('th');
      thLine.textContent = '#';
      const thOrig = document.createElement('th');
      thOrig.textContent = 'Baseline (Historical)';
      const thMod = document.createElement('th');
      thMod.textContent = 'Current Regimen / Follow-Up';
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
