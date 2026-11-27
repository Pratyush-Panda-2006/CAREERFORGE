export class GamingEsportsHubDiffPatchEngine {
  computeDiff(original, modified) {
    if (typeof original !== 'string' || typeof modified !== 'string') {
      throw new TypeError('Both original and modified must be strings');
    }
    const a = original.split('\n');
    const b = modified.split('\n');
    const n = a.length;
    const m = b.length;
    const max = n + m;

    // Myers O(ND) diff algorithm
    const v = { 1: 0 };
    const trace = [];

    let x = 0, y = 0;
    for (let d = 0; d <= max; d++) {
      trace.push({ ...v });
      for (let k = -d; k <= d; k += 2) {
        if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) {
          x = v[k + 1] ?? 0;
        } else {
          x = (v[k - 1] ?? 0) + 1;
        }
        y = x - k;
        while (x < n && y < m && a[x] === b[y]) {
          x++;
          y++;
        }
        v[k] = x;
        if (x >= n && y >= m) {
          return this.#backtrack(trace, a, b);
        }
      }
    }
    return this.#backtrack(trace, a, b);
  }

  #backtrack(trace, a, b) {
    let x = a.length;
    let y = b.length;
    const diff = [];

    for (let d = trace.length - 1; d > 0; d--) {
      const v = trace[d];
      const k = x - y;
      let prevK = (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) ? k + 1 : k - 1;
      const prevX = v[prevK] ?? 0;
      const prevY = prevX - prevK;

      while (x > prevX && y > prevY) {
        diff.unshift({ type: 'equal', text: a[x - 1] });
        x--;
        y--;
      }

      if (d > 0) {
        if (x === prevX) {
          diff.unshift({ type: 'insert', text: b[y - 1] });
          y--;
        } else if (y === prevY) {
          diff.unshift({ type: 'delete', text: a[x - 1] });
          x--;
        }
      }
    }

    while (x > 0 && y > 0) {
      diff.unshift({ type: 'equal', text: a[x - 1] });
      x--;
      y--;
    }
    while (x > 0) {
      diff.unshift({ type: 'delete', text: a[x - 1] });
      x--;
    }
    while (y > 0) {
      diff.unshift({ type: 'insert', text: b[y - 1] });
      y--;
    }

    return diff;
  }

  /**
   * Generate chunk boundary visual HTML for the diff preview.
   * Each diff item gets a containing div with a left-side color strip
   * indicating whether it's an insertion (green) or deletion (red).
   */
  generateChunkVisual(diff) {
    if (!Array.isArray(diff)) throw new TypeError('Diff must be an array');
    if (diff.length === 0) return '';

    let html = '';
    for (const item of diff) {
      const className = item.type === 'insert'
        ? 'chunk-boundary insertion'
        : item.type === 'delete'
          ? 'chunk-boundary deletion'
          : 'chunk-boundary equal';
      html += '<div class="' + className + '" title="' + item.type + ': ' + item.text + '">';
      html += this._escapeHtml(item.text);
      html += '</div>\n';
    }
    return html;
  }

  toUnifiedFormat(diff, fileA = 'a/config.yaml', fileB = 'b/config.yaml') {
    if (!Array.isArray(diff)) throw new TypeError('Diff must be an array');
    if (diff.length === 0) return '';
    const hasChanges = diff.some(d => d.type !== 'equal');
    if (!hasChanges) return '';

    const lines = [
      `--- ${fileA}`,
      `+++ ${fileB}`,
      this._computeHunkHeader(diff, fileA, fileB)
    ];

    for (const item of diff) {
      if (item.type === 'equal') lines.push(' ' + item.text);
      else if (item.type === 'delete') lines.push('-' + item.text);
      else if (item.type === 'insert') lines.push('+' + item.text);
    }

    return lines.join('\n');
  }

  computeDiffWithVisual(original, modified) {
    const diff = this.computeDiff(original, modified);
    const visual = this.generateChunkVisual(diff);
    return { diff, visual };
  }

  applyPatch(source, patch) {
    if (typeof source !== 'string') throw new TypeError('Source must be a string');
    if (!patch) return source;

    if (Array.isArray(patch)) {
      const result = [];
      for (const item of patch) {
        if (item.type === 'equal' || item.type === 'insert') {
          result.push(item.text);
        }
      }
      return result.join('\n');
    }

    if (typeof patch === 'string') {
      const patchLines = patch.split('\n');
      const contentLines = patchLines.filter(line =>
        !line.startsWith('---') && !line.startsWith('+++') && !line.startsWith('@@')
      );
      if (contentLines.length === 0) return source;

      const result = [];
      for (const line of contentLines) {
        const prefix = line[0];
        const text = line.slice(1);
        if (prefix === ' ' || prefix === '+') {
          result.push(text);
        }
      }
      return result.join('\n');
    }

    throw new TypeError('Patch must be unified string or diff array');
  }

  _computeHunkHeader(diff, fileA, fileB) {
    const sourceLines = diff.filter(d => d.type !== 'insert').length;
    const targetLines = diff.filter(d => d.type !== 'delete').length;

    let startA = 1, startB = 1;
    let currentA = 0, currentB = 0;

    for (const item of diff) {
      if (item.type === 'equal') {
        currentA++;
        currentB++;
      } else if (item.type === 'delete') {
        currentA++;
      } else if (item.type === 'insert') {
        currentB++;
      }
      if (startA === 1 && currentA > 0 && (item.type === 'delete' || item.type === 'insert')) {
        startA = Math.max(1, currentA - (item.type === 'delete' ? 1 : 0));
        startB = Math.max(1, currentB - (item.type === 'insert' ? 1 : 0));
      }
    }

    if (startA === 1 && diff.every(d => d.type === 'equal')) {
      return '';
    }

    let endA = startA + sourceLines - 1;
    let endB = startB + targetLines - 1;

    return '@@ -' + startA + ',' + sourceLines + ' +' + startB + ',' + targetLines + ' @@';
  }

  _escapeHtml(text) {
    if (typeof text !== 'string') return String(text);
    return (
      text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;')
    );
  }
}