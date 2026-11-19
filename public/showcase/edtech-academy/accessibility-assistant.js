/**
 * Edtech Academy - Automated WCAG Contrast & Keyboard Accessibility Inspector
 * Computes sRGB relative luminance, evaluates WCAG 2.1 contrast ratios, and audits interface accessibility.
 */

export class EdtechAcademyA11yAuditor {
  // Parse hex '#ffffff' or 'ffffff' into [r, g, b]
  static parseHex(hexStr) {
    let clean = String(hexStr).trim().replace(/^#/, '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    if (clean.length !== 6) {
      return [0, 0, 0];
    }
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
  }

  // WCAG relative luminance formula
  calculateLuminance(rgb) {
    const [r, g, b] = Array.isArray(rgb) ? rgb : EdtechAcademyA11yAuditor.parseHex(rgb);

    const sRGB = [r, g, b].map(val => {
      const v = val / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return Number((0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2]).toFixed(4));
  }

  getContrastRatio(c1, c2) {
    const lum1 = this.calculateLuminance(c1);
    const lum2 = this.calculateLuminance(c2);

    const brighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    const ratio = (brighter + 0.05) / (darker + 0.05);
    return Number(ratio.toFixed(2));
  }

  evaluateWCAG(ratio) {
    const r = Number(ratio);
    return {
      ratio: r,
      passesAANormal: r >= 4.5,
      passesAALarge: r >= 3.0,
      passesAAANormal: r >= 7.0,
      passesAAALarge: r >= 4.5,
      grade: r >= 7.0 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3.0 ? 'AA Large' : 'FAIL'
    };
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const auditor = new EdtechAcademyA11yAuditor();

    const fgColorPicker = document.getElementById('fgColorPicker');
    const fgColorInput = document.getElementById('fgColorInput');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const bgColorInput = document.getElementById('bgColorInput');

    const previewBox = document.getElementById('contrastPreviewBox');
    const previewText = document.getElementById('previewText');
    const contrastRatioVal = document.getElementById('contrastRatioVal');
    const aaNormalPill = document.getElementById('aaNormalPill');
    const aaLargePill = document.getElementById('aaLargePill');
    const aaaNormalPill = document.getElementById('aaaNormalPill');

    const presetBtns = document.querySelectorAll('.preset-btn');

    function updateAudit() {
      const fg = fgColorInput?.value || '#38bdf8';
      const bg = bgColorInput?.value || '#030712';

      const ratio = auditor.getContrastRatio(fg, bg);
      const evalRes = auditor.evaluateWCAG(ratio);

      if (previewBox) previewBox.style.backgroundColor = bg;
      if (previewText) previewText.style.color = fg;

      if (contrastRatioVal) contrastRatioVal.textContent = `${ratio} : 1`;

      if (aaNormalPill) {
        aaNormalPill.textContent = evalRes.passesAANormal ? 'PASS' : 'FAIL';
        aaNormalPill.className = `status-pill ${evalRes.passesAANormal ? 'status-pass' : 'status-fail'}`;
      }
      if (aaLargePill) {
        aaLargePill.textContent = evalRes.passesAALarge ? 'PASS' : 'FAIL';
        aaLargePill.className = `status-pill ${evalRes.passesAALarge ? 'status-pass' : 'status-fail'}`;
      }
      if (aaaNormalPill) {
        aaaNormalPill.textContent = evalRes.passesAAANormal ? 'PASS' : 'FAIL';
        aaaNormalPill.className = `status-pill ${evalRes.passesAAANormal ? 'status-pass' : 'status-fail'}`;
      }
    }

    fgColorPicker?.addEventListener('input', (e) => {
      if (fgColorInput) fgColorInput.value = e.target.value;
      updateAudit();
    });
    fgColorInput?.addEventListener('input', (e) => {
      if (fgColorPicker) fgColorPicker.value = e.target.value;
      updateAudit();
    });

    bgColorPicker?.addEventListener('input', (e) => {
      if (bgColorInput) bgColorInput.value = e.target.value;
      updateAudit();
    });
    bgColorInput?.addEventListener('input', (e) => {
      if (bgColorPicker) bgColorPicker.value = e.target.value;
      updateAudit();
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fg = btn.getAttribute('data-fg');
        const bg = btn.getAttribute('data-bg');
        if (fg && fgColorInput && fgColorPicker) {
          fgColorInput.value = fg;
          fgColorPicker.value = fg;
        }
        if (bg && bgColorInput && bgColorPicker) {
          bgColorInput.value = bg;
          bgColorPicker.value = bg;
        }
        updateAudit();
      });
    });

    updateAudit();
  });
}
