/**
 * Renewable Microgrid - Automated WCAG Contrast & Keyboard Accessibility Inspector
 * Issue #979 - NSoC '26 Level 3 Feature
 */

export class RenewableMicrogridA11yAuditor {
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
      // Check rgb(r, g, b)
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

  // Relative luminance per WCAG 2.1 definition
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
    this.auditResults = elements.map((el, idx) => {
      const fg = el.color || '#ffffff';
      const bg = el.backgroundColor || '#000000';
      const ratio = this.getContrastRatio(fg, bg);
      const wcag = this.evaluateWCAG(ratio);

      const hasAria = el.hasAriaLabel !== false;
      const hasKeyboardFocus = el.tabIndex !== -1;

      return {
        id: el.id || `el-${idx}`,
        tag: el.tag || 'div',
        text: el.text || '',
        fg,
        bg,
        contrastRatio: ratio,
        wcagRating: wcag.rating,
        passedAA: wcag.aaNormal,
        passedAAA: wcag.aaaNormal,
        hasAria,
        hasKeyboardFocus
      };
    });

    return this.auditResults;
  }

  getScorecard() {
    if (!this.auditResults.length) return { total: 0, score: 100, passRate: 100 };
    const total = this.auditResults.length;
    const passed = this.auditResults.filter(r => r.passedAA && r.hasAria && r.hasKeyboardFocus).length;
    const passRate = Math.round((passed / total) * 100);

    return {
      total,
      passed,
      failed: total - passed,
      passRate,
      grade: passRate >= 90 ? 'A' : passRate >= 75 ? 'B' : passRate >= 50 ? 'C' : 'F'
    };
  }
}
