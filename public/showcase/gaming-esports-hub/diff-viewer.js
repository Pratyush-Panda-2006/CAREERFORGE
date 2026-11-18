/**
 * GamingEsportsDiffInspector
 * Visual state & text change diff inspector with line highlighting for tournament configs, game balance patches, and pro player autoexec scripts.
 */
export class GamingEsportsDiffInspector {
  constructor(options = {}) {
    this.presets = options.presets || this.getDefaultPresets();
    this.currentDiff = null;
  }

  getDefaultPresets() {
    return [
      {
        id: 'server-tickrate-config',
        title: 'Dedicated Tournament Server Tickrate Config',
        category: 'Server Engine',
        original: [
          'sv_cheats: 0',
          'tickrate: 64',
          'sv_maxrate: 128000',
          'cl_cmdrate: 64',
          'cl_updaterate: 64',
          'sv_clockcorrection_msecs: 30',
          'net_maxcleartime: 0.04',
          'sv_friction: 4.8'
        ].join('\n'),
        modified: [
          'sv_cheats: 0',
          'tickrate: 128',
          'sv_maxrate: 786432',
          'cl_cmdrate: 128',
          'cl_updaterate: 128',
          'sv_clockcorrection_msecs: 15',
          'net_maxcleartime: 0.01',
          'sv_friction: 5.2',
          'sv_subtick_optimization: 1'
        ].join('\n')
      },
      {
        id: 'hero-balance-patch',
        title: 'Patch 14.8 Champion Balance Tuning',
        category: 'Game Balance',
        original: [
          'Champion: Wraith / Dualist',
          'Base Health: 550 HP',
          'Movement Speed: 310 units/sec',
          'Primary Weapon DPS: 145 dmg/s',
          'Tactical Dash Cooldown: 12.0s',
          'Ultimate Ability Charge: 2400 pts',
          'Armor Penetration: 15%'
        ].join('\n'),
        modified: [
          'Champion: Wraith / Dualist',
          'Base Health: 575 HP',
          'Movement Speed: 320 units/sec',
          'Primary Weapon DPS: 135 dmg/s',
          'Tactical Dash Cooldown: 10.0s',
          'Ultimate Ability Charge: 2650 pts',
          'Armor Penetration: 12%'
        ].join('\n')
      },
      {
        id: 'pro-player-autoexec',
        title: 'Pro Player Match Autoexec & Crosshair',
        category: 'Player Settings',
        original: [
          'sensitivity "1.80"',
          'm_rawinput "1"',
          'zoom_sensitivity_ratio "1.00"',
          'fps_max "240"',
          'cl_crosshairsize "3.5"',
          'cl_crosshairgap "0"',
          'cl_crosshaircolor "1"'
        ].join('\n'),
        modified: [
          'sensitivity "1.45"',
          'm_rawinput "1"',
          'zoom_sensitivity_ratio "0.90"',
          'fps_max "360"',
          'cl_crosshairsize "2.0"',
          'cl_crosshairgap "-2"',
          'cl_crosshaircolor "4"',
          'cl_crosshairdot "0"'
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

  renderToDOM(container, presetId = 'server-tickrate-config') {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = 'esports-diff-container';

    const header = document.createElement('div');
    header.className = 'esports-diff-header';

    const title = document.createElement('h3');
    title.textContent = 'Esports Config & Patch Diff Inspector';

    const selector = document.createElement('select');
    selector.className = 'esports-diff-select';

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
    statsBar.className = 'esports-diff-stats';
    wrapper.append(statsBar);

    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'esports-diff-viewer-grid';
    wrapper.append(tablesContainer);

    const loadPresetDiff = (id) => {
      const preset = this.getPresetById(id) || this.presets[0];
      const diff = this.computeDiff(preset.original, preset.modified);

      statsBar.replaceChildren();
      const statsItems = [
        { label: 'Total Parameters', val: diff.stats.totalLines, color: '#94a3b8' },
        { label: 'Modified', val: diff.stats.modified, color: '#f59e0b' },
        { label: 'Added', val: diff.stats.added, color: '#10b981' },
        { label: 'Removed', val: diff.stats.removed, color: '#ef4444' },
        { label: 'Delta Variance', val: `${diff.stats.changePercent}%`, color: '#a78bfa' }
      ];

      statsItems.forEach((st) => {
        const span = document.createElement('span');
        span.className = 'esports-stat-pill';
        span.textContent = `${st.label}: ${st.val}`;
        span.style.borderColor = st.color;
        statsBar.append(span);
      });

      tablesContainer.replaceChildren();

      const table = document.createElement('table');
      table.className = 'esports-diff-table';

      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      const thLine = document.createElement('th');
      thLine.textContent = '#';
      const thOrig = document.createElement('th');
      thOrig.textContent = 'Base Config (Legacy)';
      const thMod = document.createElement('th');
      thMod.textContent = 'Updated Config / Patch';
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
