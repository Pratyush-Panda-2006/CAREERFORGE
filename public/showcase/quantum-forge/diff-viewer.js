/**
 * QuantumForgeDiffInspector
 * Visual state & text change diff inspector with line highlighting for quantum circuits and schedules.
 */
export class QuantumForgeDiffInspector {
  constructor(original = '', modified = '') {
    this.original = original;
    this.modified = modified;
    this.diffLines = [];
    this.metrics = {
      totalOriginal: 0,
      totalModified: 0,
      additions: 0,
      deletions: 0,
      unchanged: 0,
      changePercentage: 0
    };

    if (original || modified) {
      this.computeDiff(original, modified);
    }
  }

  computeDiff(original = '', modified = '') {
    this.original = typeof original === 'string' ? original : '';
    this.modified = typeof modified === 'string' ? modified : '';

    const origLines = this.original.split(/\r?\n/);
    const modLines = this.modified.split(/\r?\n/);

    this.metrics.totalOriginal = origLines.length;
    this.metrics.totalModified = modLines.length;

    // Compute Longest Common Subsequence (LCS) matrix
    const n = origLines.length;
    const m = modLines.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) {
        if (origLines[i] === modLines[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    // Backtrack to build diff
    const result = [];
    let i = n;
    let j = m;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && origLines[i - 1] === modLines[j - 1]) {
        result.unshift({
          type: 'unchanged',
          originalLine: i,
          modifiedLine: j,
          content: origLines[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.unshift({
          type: 'added',
          originalLine: null,
          modifiedLine: j,
          content: modLines[j - 1]
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.unshift({
          type: 'deleted',
          originalLine: i,
          modifiedLine: null,
          content: origLines[i - 1]
        });
        i--;
      }
    }

    this.diffLines = result;

    let adds = 0;
    let dels = 0;
    let unch = 0;
    for (const line of result) {
      if (line.type === 'added') adds++;
      else if (line.type === 'deleted') dels++;
      else if (line.type === 'unchanged') unch++;
    }

    this.metrics.additions = adds;
    this.metrics.deletions = dels;
    this.metrics.unchanged = unch;
    const totalChanges = adds + dels;
    const totalLines = adds + dels + unch;
    this.metrics.changePercentage = totalLines > 0
      ? Number(((totalChanges / totalLines) * 100).toFixed(1))
      : 0;

    return this.diffLines;
  }

  generateUnifiedView() {
    return [...this.diffLines];
  }

  getChangeMetrics() {
    return { ...this.metrics };
  }

  render(container, viewMode = 'unified') {
    if (!container) return;
    container.replaceChildren();

    const wrapper = document.createElement('div');
    wrapper.className = `qf-diff-viewer qf-diff-${viewMode}`;

    // Metrics Header
    const metricsBar = document.createElement('div');
    metricsBar.className = 'qf-diff-metrics';

    const addsBadge = document.createElement('span');
    addsBadge.className = 'qf-metric-badge qf-badge-add';
    addsBadge.textContent = `+${this.metrics.additions} additions`;

    const delsBadge = document.createElement('span');
    delsBadge.className = 'qf-metric-badge qf-badge-del';
    delsBadge.textContent = `-${this.metrics.deletions} deletions`;

    const pctBadge = document.createElement('span');
    pctBadge.className = 'qf-metric-badge qf-badge-pct';
    pctBadge.textContent = `${this.metrics.changePercentage}% delta`;

    metricsBar.append(addsBadge, delsBadge, pctBadge);
    wrapper.append(metricsBar);

    // Lines container
    const linesList = document.createElement('div');
    linesList.className = 'qf-diff-lines';

    for (const item of this.diffLines) {
      const row = document.createElement('div');
      row.className = `qf-diff-row qf-diff-row-${item.type}`;

      const gutterOrig = document.createElement('span');
      gutterOrig.className = 'qf-diff-gutter';
      gutterOrig.textContent = item.originalLine !== null ? String(item.originalLine) : '';

      const gutterMod = document.createElement('span');
      gutterMod.className = 'qf-diff-gutter';
      gutterMod.textContent = item.modifiedLine !== null ? String(item.modifiedLine) : '';

      const marker = document.createElement('span');
      marker.className = 'qf-diff-marker';
      marker.textContent = item.type === 'added' ? '+' : item.type === 'deleted' ? '-' : ' ';

      const text = document.createElement('span');
      text.className = 'qf-diff-text';
      text.textContent = item.content;

      row.append(gutterOrig, gutterMod, marker, text);
      linesList.append(row);
    }

    wrapper.append(linesList);
    container.append(wrapper);
  }
}
