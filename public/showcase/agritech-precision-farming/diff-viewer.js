/**
 * Agritech Precision Farming - Visual State & Text Change Diff Inspector
 * Line-by-line diff algorithm calculating insertions, deletions, unchanged lines, and change metrics.
 */

export class AgritechPrecisionFarmingDiffInspector {
  constructor() {
    this.diffLines = [];
    this.metrics = {
      added: 0,
      removed: 0,
      unchanged: 0,
      totalLines: 0,
      changePercent: 0
    };
  }

  computeDiff(originalText = '', modifiedText = '') {
    const origLines = String(originalText).split('\n');
    const modLines = String(modifiedText).split('\n');

    this.diffLines = [];
    let added = 0;
    let removed = 0;
    let unchanged = 0;

    let i = 0;
    let j = 0;

    // Simple robust longest-common-subsequence greedy line diff
    while (i < origLines.length && j < modLines.length) {
      if (origLines[i] === modLines[j]) {
        this.diffLines.push({
          type: 'unchanged',
          origLineNum: i + 1,
          modLineNum: j + 1,
          content: origLines[i]
        });
        unchanged++;
        i++;
        j++;
      } else {
        // Look ahead to see if modLines has an insertion
        let foundInMod = -1;
        for (let k = j + 1; k < Math.min(j + 6, modLines.length); k++) {
          if (origLines[i] === modLines[k]) {
            foundInMod = k;
            break;
          }
        }

        if (foundInMod !== -1) {
          // Lines from j to foundInMod were inserted
          while (j < foundInMod) {
            this.diffLines.push({
              type: 'added',
              origLineNum: null,
              modLineNum: j + 1,
              content: modLines[j]
            });
            added++;
            j++;
          }
        } else {
          // Line in orig was deleted
          this.diffLines.push({
            type: 'removed',
            origLineNum: i + 1,
            modLineNum: null,
            content: origLines[i]
          });
          removed++;
          i++;
        }
      }
    }

    // Remaining removed lines
    while (i < origLines.length) {
      this.diffLines.push({
        type: 'removed',
        origLineNum: i + 1,
        modLineNum: null,
        content: origLines[i]
      });
      removed++;
      i++;
    }

    // Remaining added lines
    while (j < modLines.length) {
      this.diffLines.push({
        type: 'added',
        origLineNum: null,
        modLineNum: j + 1,
        content: modLines[j]
      });
      added++;
      j++;
    }

    const totalLines = this.diffLines.length;
    const changed = added + removed;
    const changePercent = totalLines > 0 ? Number(((changed / totalLines) * 100).toFixed(1)) : 0;

    this.metrics = {
      added,
      removed,
      unchanged,
      totalLines,
      changePercent
    };

    return this.diffLines;
  }

  generateUnifiedView() {
    return this.diffLines.map(line => {
      const prefix = line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  ';
      return `${prefix}${line.content}`;
    }).join('\n');
  }

  getChangeMetrics() {
    return { ...this.metrics };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const diffContainer = document.getElementById('diffOutputContainer');
    if (!diffContainer) return;

    const inspector = new AgritechPrecisionFarmingDiffInspector();

    const origInput = document.getElementById('origTextInput');
    const modInput = document.getElementById('modTextInput');
    const compareBtn = document.getElementById('compareDiffBtn');
    const sampleBtn = document.getElementById('loadSampleDiffBtn');
    const viewModeToggle = document.getElementById('viewModeSelect');

    const statAdded = document.getElementById('statAddedLines');
    const statRemoved = document.getElementById('statRemovedLines');
    const statUnchanged = document.getElementById('statUnchangedLines');
    const statPercent = document.getElementById('statChangePercent');

    function renderDiff() {
      diffContainer.replaceChildren();
      const mode = viewModeToggle ? viewModeToggle.value : 'unified';
      const lines = inspector.diffLines;

      if (lines.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-diff';
        empty.textContent = 'Paste telemetry states and click "Run Diff Analysis" to inspect differences.';
        diffContainer.appendChild(empty);
        return;
      }

      if (mode === 'unified') {
        const table = document.createElement('table');
        table.className = 'diff-table unified';

        for (const item of lines) {
          const tr = document.createElement('tr');
          tr.className = `diff-row row-${item.type}`;

          const tdOrigNum = document.createElement('td');
          tdOrigNum.className = 'line-num';
          tdOrigNum.textContent = item.origLineNum !== null ? String(item.origLineNum) : '';

          const tdModNum = document.createElement('td');
          tdModNum.className = 'line-num';
          tdModNum.textContent = item.modLineNum !== null ? String(item.modLineNum) : '';

          const tdSign = document.createElement('td');
          tdSign.className = 'diff-sign';
          tdSign.textContent = item.type === 'added' ? '+' : item.type === 'removed' ? '-' : ' ';

          const tdContent = document.createElement('td');
          tdContent.className = 'diff-text';
          tdContent.textContent = item.content;

          tr.append(tdOrigNum, tdModNum, tdSign, tdContent);
          table.appendChild(tr);
        }
        diffContainer.appendChild(table);
      } else {
        // Split view
        const splitWrap = document.createElement('div');
        splitWrap.className = 'split-container';

        const leftCol = document.createElement('div');
        leftCol.className = 'split-col left-col';
        const rightCol = document.createElement('div');
        rightCol.className = 'split-col right-col';

        for (const item of lines) {
          if (item.type !== 'added') {
            const rowL = document.createElement('div');
            rowL.className = `split-row row-${item.type}`;
            rowL.textContent = `${item.origLineNum || ' '} | ${item.content}`;
            leftCol.appendChild(rowL);
          } else {
            const blankL = document.createElement('div');
            blankL.className = 'split-row row-placeholder';
            blankL.textContent = ' ';
            leftCol.appendChild(blankL);
          }

          if (item.type !== 'removed') {
            const rowR = document.createElement('div');
            rowR.className = `split-row row-${item.type}`;
            rowR.textContent = `${item.modLineNum || ' '} | ${item.content}`;
            rightCol.appendChild(rowR);
          } else {
            const blankR = document.createElement('div');
            blankR.className = 'split-row row-placeholder';
            blankR.textContent = ' ';
            rightCol.appendChild(blankR);
          }
        }

        splitWrap.append(leftCol, rightCol);
        diffContainer.appendChild(splitWrap);
      }

      const metrics = inspector.getChangeMetrics();
      if (statAdded) statAdded.textContent = `+${metrics.added} added`;
      if (statRemoved) statRemoved.textContent = `-${metrics.removed} deleted`;
      if (statUnchanged) statUnchanged.textContent = `${metrics.unchanged} unchanged`;
      if (statPercent) statPercent.textContent = `${metrics.changePercent}% delta`;
    }

    if (compareBtn && origInput && modInput) {
      compareBtn.addEventListener('click', () => {
        inspector.computeDiff(origInput.value, modInput.value);
        renderDiff();
      });
    }

    if (sampleBtn && origInput && modInput) {
      sampleBtn.addEventListener('click', () => {
        origInput.value = `// Field Telemetry Snapshot - Zone A\nmoisture_target: 65.0;\nnitrogen_threshold: 40;\nirrigation_valve: CLOSED;\nsensor_cycle: 300;\nmax_pressure_psi: 45;`;
        modInput.value = `// Field Telemetry Snapshot - Zone A\nmoisture_target: 72.5;\nnitrogen_threshold: 40;\nirrigation_valve: OPEN;\npump_flow_gpm: 120;\nsensor_cycle: 150;\nmax_pressure_psi: 45;\nauto_fertigation: ENABLED;`;
        inspector.computeDiff(origInput.value, modInput.value);
        renderDiff();
      });
    }

    if (viewModeToggle) {
      viewModeToggle.addEventListener('change', () => renderDiff());
    }

    // Initial run
    if (sampleBtn) sampleBtn.click();
  });
}
