const THRESHOLDS = [
  { id: 'aa-normal', label: 'AA normal text', minimum: 4.5 },
  { id: 'aa-large', label: 'AA large text', minimum: 3 },
  { id: 'aaa-normal', label: 'AAA normal text', minimum: 7 },
  { id: 'aaa-large', label: 'AAA large text', minimum: 4.5 },
  { id: 'ui', label: 'AA interface components', minimum: 3 },
];

export class CybersecuritySentinelContrastAuditor {
  normalizeHex(hex) {
    const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!match) throw new Error(`"${hex}" is not a 3 or 6 digit hex colour`);
    const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
    return `#${digits.toLowerCase()}`;
  }

  // Relative luminance as defined by WCAG 2.1.
  getLuminance(hex) {
    const value = this.normalizeHex(hex);
    const [r, g, b] = [1, 3, 5].map((start) => {
      const channel = parseInt(value.slice(start, start + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  calculateRatio(fgHex, bgHex) {
    const [light, dark] = [this.getLuminance(fgHex), this.getLuminance(bgHex)].sort((a, b) => b - a);
    return (light + 0.05) / (dark + 0.05);
  }

  evaluateWcagCompliance(ratio) {
    return THRESHOLDS.map((t) => ({ ...t, passes: ratio >= t.minimum }));
  }

  // Cut instead of rounding, so 4.499 is never shown as a passing 4.50.
  formatRatio(ratio) {
    return `${(Math.floor(ratio * 100) / 100).toFixed(2)}:1`;
  }
}

if (typeof document !== 'undefined') {
  const auditor = new CybersecuritySentinelContrastAuditor();
  const $ = (id) => document.getElementById(id);
  const pairs = [['fg-picker', 'fg-hex'], ['bg-picker', 'bg-hex']];

  const render = () => {
    const fg = $('fg-hex').value;
    const bg = $('bg-hex').value;
    try {
      const ratio = auditor.calculateRatio(fg, bg);
      $('ratio').textContent = auditor.formatRatio(ratio);
      $('gauge').value = ratio;
      $('error').textContent = '';
      $('preview').style.color = auditor.normalizeHex(fg);
      $('preview').style.background = auditor.normalizeHex(bg);
      $('results').replaceChildren(...auditor.evaluateWcagCompliance(ratio).map((result) => {
        const item = document.createElement('li');
        item.className = result.passes ? 'pass' : 'fail';
        item.textContent = `${result.label} (${result.minimum}:1) ${result.passes ? 'Pass' : 'Fail'}`;
        return item;
      }));
    } catch (error) {
      $('error').textContent = error.message;
      $('ratio').textContent = '--';
      $('gauge').value = 0;
      $('results').replaceChildren();
    }
  };

  for (const [pickerId, textId] of pairs) {
    $(pickerId).addEventListener('input', () => {
      $(textId).value = $(pickerId).value;
      render();
    });
    $(textId).addEventListener('input', () => {
      try {
        $(pickerId).value = auditor.normalizeHex($(textId).value);
      } catch {
        // render() reports the invalid value.
      }
      render();
    });
  }
  $('swap').addEventListener('click', () => {
    for (const index of [0, 1]) {
      const [a, b] = [$(pairs[0][index]), $(pairs[1][index])];
      [a.value, b.value] = [b.value, a.value];
    }
    render();
  });
  render();
}
