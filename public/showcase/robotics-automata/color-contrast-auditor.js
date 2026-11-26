export class RoboticsAutomataContrastAuditor {
  #parseHex(hex) {
    if (typeof hex !== 'string') {
      throw new TypeError('Hex color must be a string');
    }
    let cleaned = hex.trim().replace(/^#/, '');
    if (cleaned.length === 3) {
      cleaned = cleaned.split('').map(c => c + c).join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const num = parseInt(cleaned, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  getLuminance(hex) {
    const { r, g, b } = this.#parseHex(hex);
    const toLinear = (c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const rLin = toLinear(r);
    const gLin = toLinear(g);
    const bLin = toLinear(b);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }

  calculateRatio(fgHex, bgHex) {
    const l1 = this.getLuminance(fgHex);
    const l2 = this.getLuminance(bgHex);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  evaluateWcagCompliance(ratio) {
    if (typeof ratio !== 'number' || ratio <= 0) {
      throw new TypeError('Ratio must be a positive number');
    }
    return {
      ratio,
      normalAA: ratio >= 4.5,
      normalAAA: ratio >= 7.0,
      largeAA: ratio >= 3.0,
      largeAAA: ratio >= 4.5,
      uiComponents: ratio >= 3.0
    };
  }
}

function mount() {
  const root = document.querySelector('[data-contrast-lab]');
  if (!root) return;

  const auditor = new RoboticsAutomataContrastAuditor();
  const get = id => root.querySelector(`#${id}`);

  function update() {
    const fg = get('fg-color').value;
    const bg = get('bg-color').value;

    get('fg-hex-input').value = fg.toUpperCase();
    get('bg-hex-input').value = bg.toUpperCase();

    const ratio = auditor.calculateRatio(fg, bg);
    const compliance = auditor.evaluateWcagCompliance(ratio);

    get('ratio-display').textContent = `${ratio.toFixed(2)} : 1`;

    const previewBox = get('preview-frame');
    if (previewBox) {
      previewBox.style.backgroundColor = bg;
      previewBox.style.color = fg;
    }

    const setChip = (elemId, pass) => {
      const el = get(elemId);
      if (el) {
        el.textContent = pass ? 'PASS' : 'FAIL';
        el.className = `status-chip ${pass ? 'chip-pass' : 'chip-fail'}`;
      }
    };

    setChip('tag-normal-aa', compliance.normalAA);
    setChip('tag-normal-aaa', compliance.normalAAA);
    setChip('tag-large-aa', compliance.largeAA);
    setChip('tag-large-aaa', compliance.largeAAA);
    setChip('tag-ui', compliance.uiComponents);
  }

  get('fg-color').addEventListener('input', update);
  get('bg-color').addEventListener('input', update);
  get('fg-hex-input').addEventListener('change', (e) => {
    get('fg-color').value = e.target.value;
    update();
  });
  get('bg-hex-input').addEventListener('change', (e) => {
    get('bg-color').value = e.target.value;
    update();
  });

  update();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
