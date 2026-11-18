/**
 * Nonprofit Impact - Automated WCAG Contrast & Keyboard Accessibility Inspector
 * Issue #931 - NSoC '26 Level 3 Feature
 */

export class NonprofitImpactA11yAuditor {
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

    return Number((0.2126 * sR + 0.7152 * sG + 0.0722 * sB).toFixed(5));
  }

  // Contrast ratio per WCAG 2.1: (L1 + 0.05) / (L2 + 0.05)
  getContrastRatio(color1, color2) {
    const lum1 = this.calculateLuminance(color1);
    const lum2 = this.calculateLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Number(ratio.toFixed(2));
  }

  // Evaluate WCAG compliance
  evaluateWCAG(ratio) {
    const numRatio = Number(ratio);
    return {
      ratio: numRatio,
      aaNormal: numRatio >= 4.5,
      aaLarge: numRatio >= 3.0,
      aaaNormal: numRatio >= 7.0,
      aaaLarge: numRatio >= 4.5,
      rating: numRatio >= 7.0 ? 'AAA' : numRatio >= 4.5 ? 'AA' : numRatio >= 3.0 ? 'AA Large' : 'FAIL'
    };
  }

  auditElements(elements = []) {
    this.auditResults = elements.map((item, idx) => {
      const ratio = this.getContrastRatio(item.color || '#ffffff', item.backgroundColor || '#000000');
      const evalResult = this.evaluateWCAG(ratio);
      const hasAriaLabel = Boolean(item.ariaLabel || item.hasAriaLabel);

      return {
        id: item.id || `el-${idx}`,
        name: item.name || `Element ${idx + 1}`,
        color: item.color,
        backgroundColor: item.backgroundColor,
        contrastRatio: ratio,
        compliance: evalResult,
        hasAriaLabel,
        passed: evalResult.aaNormal && hasAriaLabel
      };
    });

    return this.auditResults;
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.NonprofitImpactA11yAuditor = NonprofitImpactA11yAuditor;

  document.addEventListener('DOMContentLoaded', () => {
    const auditor = new NonprofitImpactA11yAuditor();
    const btnInspect = document.getElementById('btnInspectA11y');
    const resultsContainer = document.getElementById('a11yResultsList');
    const toggleHighContrast = document.getElementById('toggleHighContrast');

    const defaultElements = [
      { name: 'Donate Call-To-Action Button', color: '#ffffff', backgroundColor: '#10b981', ariaLabel: 'Donate Now' },
      { name: 'Cause Impact Statement', color: '#a7f3d0', backgroundColor: '#091e14', ariaLabel: 'Impact Statement' },
      { name: 'Progress Bar Percentage', color: '#ecfdf5', backgroundColor: '#0e2b1e', ariaLabel: 'Funding Progress' },
      { name: 'Volunteer Sign-up Link', color: '#34d399', backgroundColor: '#0e2b1e', ariaLabel: 'Sign up as Volunteer' }
    ];

    function runAudit() {
      const results = auditor.auditElements(defaultElements);
      if (resultsContainer) {
        resultsContainer.replaceChildren();
        results.forEach(res => {
          const row = document.createElement('div');
          row.className = `audit-result-item ${res.passed ? 'pass' : 'warn'}`;
          row.innerHTML = `
            <div class="result-header">
              <span class="element-name">${res.name}</span>
              <span class="compliance-badge badge-${res.compliance.rating.toLowerCase().replace(/\s+/g, '-')}">${res.compliance.rating} (${res.contrastRatio}:1)</span>
            </div>
            <div class="result-details">
              <span>Color: ${res.color} on ${res.backgroundColor}</span>
              <span>ARIA Label: ${res.hasAriaLabel ? '✓ Yes' : '✗ Missing'}</span>
            </div>
          `;
          resultsContainer.appendChild(row);
        });
      }
    }

    btnInspect?.addEventListener('click', runAudit);
    toggleHighContrast?.addEventListener('change', (e) => {
      document.body.classList.toggle('high-contrast-active', e.target.checked);
    });

    runAudit();
  });
}
