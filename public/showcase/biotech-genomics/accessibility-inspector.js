/**
 * Biotech Genomics - Automated WCAG Contrast & Keyboard Accessibility Inspector
 */

export class BiotechGenomicsA11yInspector {
  getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return Number((a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722).toFixed(4));
  }

  getContrastRatio(rgb1, rgb2) {
    const lum1 = this.getLuminance(...rgb1);
    const lum2 = this.getLuminance(...rgb2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
  }

  evaluateContrast(ratio, isLargeText = false) {
    const aaThreshold = isLargeText ? 3.0 : 4.5;
    const aaaThreshold = isLargeText ? 4.5 : 7.0;
    return {
      ratio,
      aaPass: ratio >= aaThreshold,
      aaaPass: ratio >= aaaThreshold,
      level: ratio >= aaaThreshold ? 'AAA' : (ratio >= aaThreshold ? 'AA' : 'FAIL')
    };
  }

  auditElements(elements = []) {
    return elements.map(el => {
      const hasAria = Boolean(el.ariaLabel || el.ariaLabelledBy || el.role);
      const isFocusable = el.tabIndex !== -1;
      return {
        id: el.id || 'anonymous',
        hasAria,
        isFocusable,
        score: (hasAria ? 50 : 0) + (isFocusable ? 50 : 0)
      };
    });
  }
}
