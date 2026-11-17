/**
 * Quantum Forge - Automated WCAG Contrast & Keyboard Accessibility Inspector
 * Issue #959 - NSoC '26 Level 3 Feature
 */

export class QuantumForgeA11yAuditor {
  constructor(options = {}) {
    this.highContrastMode = options.highContrast || false;
    this.auditResults = [];
  }

  // Parse color input (hex string #RRGGBB, #RGB, {r,g,b}, or [r,g,b])
  parseColor(color) {
    if (!color) return { r: 0, g: 0, b: 0 };

    if (typeof color === 'string') {
      let hex = color.trim().replace(/^#/, '');
      if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
      }
      if (hex.length === 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16)
        };
      }
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (rgbMatch) {
        return {
          r: parseInt(rgbMatch[1], 10),
          g: parseInt(rgbMatch[2], 10),
          b: parseInt(rgbMatch[3], 10)
        };
      }
    }

    if (Array.isArray(color) && color.length >= 3) {
      return { r: Number(color[0]), g: Number(color[1]), b: Number(color[2]) };
    }

    if (typeof color === 'object' && color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      return { r: Number(color.r), g: Number(color.g), b: Number(color.b) };
    }

    return { r: 0, g: 0, b: 0 };
  }

  // Relative luminance per WCAG 2.1 specification
  calculateLuminance(color) {
    const { r, g, b } = this.parseColor(color);

    const transform = (val) => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };

    const sR = transform(r);
    const sG = transform(g);
    const sB = transform(b);

    const luminance = 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
    return Math.round(luminance * 10000) / 10000;
  }

  getContrastRatio(c1, c2) {
    const l1 = this.calculateLuminance(c1);
    const l2 = this.calculateLuminance(c2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 100) / 100;
  }

  evaluateWCAG(ratio) {
    const numRatio = typeof ratio === 'number' ? ratio : parseFloat(ratio);

    const aaNormal = numRatio >= 4.5;
    const aaLarge = numRatio >= 3.0;
    const aaaNormal = numRatio >= 7.0;
    const aaaLarge = numRatio >= 4.5;

    let rating = 'FAIL';
    if (aaaNormal) {
      rating = 'AAA';
    } else if (aaNormal) {
      rating = 'AA';
    } else if (aaLarge) {
      rating = 'AA Large Only';
    }

    return {
      ratio: numRatio,
      aaNormal,
      aaLarge,
      aaaNormal,
      aaaLarge,
      rating
    };
  }

  auditElements(elements = []) {
    this.auditResults = [];
    for (const el of elements) {
      const fg = el.color || '#ffffff';
      const bg = el.backgroundColor || '#000000';
      const ratio = this.getContrastRatio(fg, bg);
      const evalRes = this.evaluateWCAG(ratio);

      const hasAriaLabel = Boolean(el.ariaLabel || el.getAttribute?.('aria-label') || el.innerText);
      const isKeyboardFocusable = el.tabIndex !== undefined ? el.tabIndex >= 0 : true;

      this.auditResults.push({
        name: el.name || el.tagName || 'Unknown',
        contrastRatio: ratio,
        wcagRating: evalRes.rating,
        passedAA: evalRes.aaNormal,
        passedAAA: evalRes.aaaNormal,
        hasAriaLabel,
        isKeyboardFocusable
      });
    }
    return this.auditResults;
  }

  toggleHighContrast(enabled) {
    this.highContrastMode = enabled !== undefined ? enabled : !this.highContrastMode;
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.toggle('qf-high-contrast', this.highContrastMode);
    }
    return this.highContrastMode;
  }
}

// Browser UI bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.QuantumForgeA11yAuditor = QuantumForgeA11yAuditor;

  document.addEventListener('DOMContentLoaded', () => {
    const auditor = new QuantumForgeA11yAuditor();
    const fgInput = document.getElementById('fg-color');
    const bgInput = document.getElementById('bg-color');
    const ratioDisplay = document.getElementById('contrast-ratio');
    const badgeAA = document.getElementById('badge-aa');
    const badgeAAA = document.getElementById('badge-aaa');
    const previewBox = document.getElementById('preview-box');
    const toggleHcBtb = document.getElementById('toggle-hc-btn');

    const updateAudit = () => {
      if (!fgInput || !bgInput) return;
      const fg = fgInput.value;
      const bg = bgInput.value;
      const ratio = auditor.getContrastRatio(fg, bg);
      const res = auditor.evaluateWCAG(ratio);

      if (ratioDisplay) ratioDisplay.textContent = `${ratio}:1`;
      if (previewBox) {
        previewBox.style.color = fg;
        previewBox.style.backgroundColor = bg;
      }

      if (badgeAA) {
        badgeAA.className = `status-badge ${res.aaNormal ? 'pass' : 'fail'}`;
        badgeAA.textContent = res.aaNormal ? 'AA Pass' : 'AA Fail';
      }
      if (badgeAAA) {
        badgeAAA.className = `status-badge ${res.aaaNormal ? 'pass' : 'fail'}`;
        badgeAAA.textContent = res.aaaNormal ? 'AAA Pass' : 'AAA Fail';
      }
    };

    if (fgInput && bgInput) {
      fgInput.addEventListener('input', updateAudit);
      bgInput.addEventListener('input', updateAudit);
      updateAudit();
    }

    if (toggleHcBtb) {
      toggleHcBtb.addEventListener('click', () => {
        const state = auditor.toggleHighContrast();
        toggleHcBtb.textContent = state ? 'Disable High Contrast' : 'Enable High Contrast';
      });
    }
  });
}
