/**
 * Festival Hub - Visual State & Text Change Diff Inspector
 * Issue #1337 - NSoC '26 Level 3 Feature
 */

export class FestivalHubDiffInspector {
  constructor(options = {}) {
    this.original = options.original || '';
    this.modified = options.modified || '';
    this.diffs = [];
    this.metrics = null;

    if (this.original || this.modified) {
      this.computeDiff(this.original, this.modified);
    }
  }

  computeDiff(original = '', modified = '') {
    this.original = typeof original === 'string' ? original : JSON.stringify(original, null, 2);
    this.modified = typeof modified === 'string' ? modified : JSON.stringify(modified, null, 2);

    const origLines = this.original.split(/\r?\n/);
    const modLines = this.modified.split(/\r?\n/);

    const lcsMatrix = this._buildLcsMatrix(origLines, modLines);
    this.diffs = this._backtrackDiff(lcsMatrix, origLines, modLines, origLines.length, modLines.length);
    this.metrics = this._calculateMetrics(origLines.length, modLines.length);

    return this.diffs;
  }

  _buildLcsMatrix(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (a[i] === b[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }
    return dp;
  }

  _backtrackDiff(dp, a, b, i, j) {
    const diffs = [];
    let currI = i;
    let currJ = j;

    while (currI > 0 || currJ > 0) {
      if (currI > 0 && currJ > 0 && a[currI - 1] === b[currJ - 1]) {
        diffs.push({
          type: 'equal',
          text: a[currI - 1],
          originalLineNumber: currI,
          modifiedLineNumber: currJ
        });
        currI--;
        currJ--;
      } else if (currJ > 0 && (currI === 0 || dp[currI][currJ - 1] >= dp[currI - 1][currJ])) {
        diffs.push({
          type: 'insert',
          text: b[currJ - 1],
          originalLineNumber: null,
          modifiedLineNumber: currJ
        });
        currJ--;
      } else if (currI > 0 && (currJ === 0 || dp[currI][currJ - 1] < dp[currI - 1][currJ])) {
        diffs.push({
          type: 'delete',
          text: a[currI - 1],
          originalLineNumber: currI,
          modifiedLineNumber: null
        });
        currI--;
      }
    }

    return diffs.reverse();
  }

  _calculateMetrics(origTotal, modTotal) {
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    for (const item of this.diffs) {
      if (item.type === 'insert') additions++;
      else if (item.type === 'delete') deletions++;
      else if (item.type === 'equal') unchanged++;
    }

    const maxLines = Math.max(origTotal, modTotal, 1);
    const totalChanges = additions + deletions;
    const changePercentage = Math.min(100, Math.round((totalChanges / maxLines) * 10000) / 100);

    return {
      originalTotal: origTotal,
      modifiedTotal: modTotal,
      additions,
      deletions,
      unchanged,
      totalChanges,
      changePercentage
    };
  }

  getChangeMetrics() {
    if (!this.metrics) {
      this.metrics = this._calculateMetrics(0, 0);
    }
    return this.metrics;
  }

  generateUnifiedView() {
    if (!this.diffs || this.diffs.length === 0) {
      return '';
    }

    return this.diffs.map(d => {
      const prefix = d.type === 'insert' ? '+ ' : d.type === 'delete' ? '- ' : '  ';
      return `${prefix}${d.text}`;
    }).join('\n');
  }

  generateSideBySideView() {
    const left = [];
    const right = [];

    let i = 0;
    while (i < this.diffs.length) {
      const d = this.diffs[i];
      if (d.type === 'equal') {
        left.push({ lineNum: d.originalLineNumber, type: 'equal', text: d.text });
        right.push({ lineNum: d.modifiedLineNumber, type: 'equal', text: d.text });
        i++;
      } else if (d.type === 'delete') {
        left.push({ lineNum: d.originalLineNumber, type: 'delete', text: d.text });
        if (i + 1 < this.diffs.length && this.diffs[i + 1].type === 'insert') {
          right.push({ lineNum: this.diffs[i + 1].modifiedLineNumber, type: 'insert', text: this.diffs[i + 1].text });
          i += 2;
        } else {
          right.push({ lineNum: null, type: 'empty', text: '' });
          i++;
        }
      } else if (d.type === 'insert') {
        left.push({ lineNum: null, type: 'empty', text: '' });
        right.push({ lineNum: d.modifiedLineNumber, type: 'insert', text: d.text });
        i++;
      }
    }

    return { left, right };
  }
}
