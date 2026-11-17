/**
 * Supply Chain Logistics - Visual State & Text Change Diff Inspector
 * Line-by-line diff comparison engine analyzing freight manifests, Bills of Lading, and customs filings.
 */

export class SupplyChainLogisticsDiffInspector {
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
        let foundInMod = -1;
        for (let k = j + 1; k < Math.min(j + 6, modLines.length); k++) {
          if (origLines[i] === modLines[k]) {
            foundInMod = k;
            break;
          }
        }

        if (foundInMod !== -1) {
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

    const inspector = new SupplyChainLogisticsDiffInspector();

    const origInput = document.getElementById('origTextInput');
    const modInput = document.getElementById('modTextInput');
    const compareBtn = document.getElementById('compareDiffBtn');
    const sampleBtn = document.getElementById('loadSampleDiffBtn');

    const statAdded = document.getElementById('statAddedLines');
    const statRemoved = document.getElementById('statRemovedLines');
    const statUnchanged = document.getElementById('statUnchangedLines');
    const statPercent = document.getElementById('statChangePercent');

    function renderDiff() {
      diffContainer.replaceChildren();
      const lines = inspector.diffLines;

      if (lines.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-diff';
        empty.textContent = 'Paste cargo manifests or route dispatch configurations and click "Run Diff Analysis".';
        diffContainer.appendChild(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'diff-table';

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
    }

    function updateStats() {
      const m = inspector.getChangeMetrics();
      if (statAdded) statAdded.textContent = String(m.added);
      if (statRemoved) statRemoved.textContent = String(m.removed);
      if (statUnchanged) statUnchanged.textContent = String(m.unchanged);
      if (statPercent) statPercent.textContent = `${m.changePercent}%`;
    }

    if (compareBtn && origInput && modInput) {
      compareBtn.addEventListener('click', () => {
        inspector.computeDiff(origInput.value, modInput.value);
        updateStats();
        renderDiff();
      });
    }

    if (sampleBtn && origInput && modInput) {
      sampleBtn.addEventListener('click', () => {
        origInput.value = `manifest_id: "BOL-9821-X"\nvessel: "EVER_GIVEN_V_12"\norigin_port: "CNSHA"\ndestination_port: "NLRTM"\ncontainers_teu: 1450\nreefer_units: 120\nhazardous_class: "NONE"`;
        modInput.value = `manifest_id: "BOL-9821-X"\nvessel: "EVER_GIVEN_V_12"\norigin_port: "CNSHA"\ntransshipment_hub: "SGSIN"\ndestination_port: "NLRTM"\ncontainers_teu: 1600\nreefer_units: 145\nhazardous_class: "IMDG_9"`;
        inspector.computeDiff(origInput.value, modInput.value);
        updateStats();
        renderDiff();
      });
    }

    renderDiff();
  });
}
