export class WeatherRadarAtlasDiffPatchEngine {
  computeDiff(original, modified) {
    if (typeof original !== 'string' || typeof modified !== 'string') {
      throw new TypeError('Both original and modified must be strings');
    }
    const a = original.split('\n');
    const b = modified.split('\n');
    const n = a.length;
    const m = b.length;
    const max = n + m;
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
      let prevK;
      if (k === -d || (k !== d && (v[k - 1] ?? -1) < (v[k + 1] ?? -1))) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }
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

  toUnifiedFormat(diff, fileA = 'a/file.txt', fileB = 'b/file.txt') {
    if (!Array.isArray(diff)) throw new TypeError('Diff must be an array');
    if (diff.length === 0) return '';
    const hasChanges = diff.some(d => d.type !== 'equal');
    if (!hasChanges) return '';

    const lines = [
      `--- ${fileA}`,
      `+++ ${fileB}`,
      `@@ -1,${diff.filter(d => d.type !== 'insert').length} +1,${diff.filter(d => d.type !== 'delete').length} @@`
    ];

    for (const item of diff) {
      if (item.type === 'equal') lines.push(` ${item.text}`);
      else if (item.type === 'delete') lines.push(`-${item.text}`);
      else if (item.type === 'insert') lines.push(`+${item.text}`);
    }

    return lines.join('\n');
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
}

function mount() {
  const form = document.getElementById('diff-form'); if (!form) return;
  const get = id => document.getElementById(id);
  const engine = new WeatherRadarAtlasDiffPatchEngine();
  form.addEventListener('submit', e => {
    e.preventDefault();
    const orig = get('original').value;
    const mod = get('modified').value;
    const diff = engine.computeDiff(orig, mod);
    const unified = engine.toUnifiedFormat(diff);
    get('unified').textContent = unified || '(No differences detected)';
    get('diff-output').replaceChildren(...diff.map(item => {
      const div = document.createElement('div');
      div.className = `diff-line diff-${item.type}`;
      div.textContent = `${item.type === 'insert' ? '+' : item.type === 'delete' ? '-' : ' '} ${item.text}`;
      return div;
    }));
    get('patched-preview').textContent = engine.applyPatch(orig, diff);
  });
}
if (typeof document !== 'undefined') mount();
