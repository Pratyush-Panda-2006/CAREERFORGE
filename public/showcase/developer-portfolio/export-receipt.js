/**
 * Developer Portfolio - Branded Graphic Certificate & PNG Receipt Exporter
 * Formats high-DPI engineering competency certificates and client verification receipts
 * on HTML5 Canvas with custom barcode pattern generation, checksum parity, and instant export.
 */

export class DeveloperPortfolioReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 840;
    this.brandName = options.brandName || 'DEVPORTFOLIO VERIFIED CREDENTIAL';
    this.themeColors = {
      bg: '#0d1117',
      cardBg: '#161b22',
      border: '#30363d',
      primary: '#58a6ff',
      emerald: '#3fb950',
      purple: '#bc8cff',
      textPrimary: '#f0f6fc',
      textSecondary: '#8b949e'
    };
  }

  /**
   * Computes a weighted modulo-10 parity checksum for the certificate reference code.
   */
  calculateBarcodeParity(codeString) {
    if (typeof codeString !== 'string' || codeString.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < codeString.length; i++) {
      const code = codeString.charCodeAt(i);
      const weight = (i % 2 === 0) ? 3 : 1;
      sum += code * weight;
    }
    return (10 - (sum % 10)) % 10;
  }

  /**
   * Converts a code string into a deterministic binary barcode bit-pattern (1 = bar, 0 = space).
   */
  generateBarcodePattern(codeString) {
    const safeCode = (codeString || 'PORT-0000').toUpperCase();
    const parity = this.calculateBarcodeParity(safeCode);
    const fullCode = safeCode + '-' + parity;

    // Start sentinel pattern: 101001
    const bits = [1, 0, 1, 0, 0, 1];

    for (let i = 0; i < fullCode.length; i++) {
      const charVal = fullCode.charCodeAt(i);
      // Derive 5-bit sequence per char
      for (let b = 4; b >= 0; b--) {
        bits.push((charVal >> b) & 1);
      }
      bits.push(0); // Inter-character gap
    }

    // Stop sentinel pattern: 110101
    bits.push(1, 1, 0, 1, 0, 1);
    return {
      pattern: bits,
      fullCode,
      parity
    };
  }

  /**
   * Draws a vector barcode pattern onto the canvas context.
   */
  drawBarcode(ctx, code, x = 60, y = 720, barWidth = 2.4, barHeight = 44) {
    if (!ctx) return null;
    const { pattern, fullCode } = this.generateBarcodePattern(code);

    let currentX = x;
    ctx.fillStyle = this.themeColors.textPrimary;

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === 1) {
        ctx.fillRect(currentX, y, barWidth, barHeight);
      }
      currentX += barWidth;
    }

    // Draw barcode human-readable text
    if (ctx.fillText) {
      ctx.fillStyle = this.themeColors.textSecondary;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      const centerX = x + (pattern.length * barWidth) / 2;
      ctx.fillText(fullCode, centerX, y + barHeight + 16);
    }

    return {
      totalWidth: pattern.length * barWidth,
      totalHeight: barHeight + 20,
      code: fullCode
    };
  }

  /**
   * Renders the complete certificate and verification receipt onto the canvas.
   */
  renderCanvas(ctx, data = {}) {
    if (!ctx) return false;

    const name = data.name || 'Alex Rivera';
    const title = data.title || 'Principal Systems Architect';
    const certId = data.certId || 'PORT-2026-X948';
    const score = data.score !== undefined ? data.score : 98;
    const date = data.date || new Date().toISOString().split('T')[0];

    // Background canvas fill
    ctx.fillStyle = this.themeColors.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Outer card container
    ctx.fillStyle = this.themeColors.cardBg;
    ctx.strokeStyle = this.themeColors.border;
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(30, 30, this.width - 60, this.height - 60, 12);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(30, 30, this.width - 60, this.height - 60);
      ctx.strokeRect(30, 30, this.width - 60, this.height - 60);
    }

    // Header brand band
    ctx.fillStyle = this.themeColors.primary;
    ctx.fillRect(50, 50, 6, 32);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = 'left';
    ctx.fillText(this.brandName, 68, 72);

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText('OFFICIAL ENGINEERING AUDIT & SKILLS ATTESTATION', 68, 92);

    // Separator line
    ctx.strokeStyle = this.themeColors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(this.width - 50, 115);
    ctx.stroke();

    // Recipient Section
    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('HONOREE / DEVELOPER', 50, 155);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 26px -apple-system, sans-serif';
    ctx.fillText(name, 50, 192);

    ctx.fillStyle = this.themeColors.purple;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(title, 50, 218);

    // Metric Summary Box
    ctx.fillStyle = '#0d1117';
    ctx.strokeStyle = this.themeColors.border;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(50, 255, this.width - 100, 120, 8);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(50, 255, this.width - 100, 120);
      ctx.strokeRect(50, 255, this.width - 100, 120);
    }

    ctx.fillStyle = this.themeColors.emerald;
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.fillText(score + '%', 75, 320);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillText('Verified Competency Index', 180, 300);

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Peer-reviewed code audit, performance metrics & architecture assessment', 180, 324);

    // Audit Metadata Table
    const rows = [
      ['Attestation ID:', certId],
      ['Issuance Date:', date],
      ['Validation Method:', 'Automated CI/CD Test Pipeline & Code Audit'],
      ['Integrity Hash:', 'SHA-256 (ecc4-984b-0018-f6a7)'],
      ['Status:', 'ACTIVE / IMMUTABLE']
    ];

    let rowY = 425;
    ctx.font = '13px -apple-system, sans-serif';
    rows.forEach(([label, val]) => {
      ctx.fillStyle = this.themeColors.textSecondary;
      ctx.textAlign = 'left';
      ctx.fillText(label, 50, rowY);

      ctx.fillStyle = this.themeColors.textPrimary;
      ctx.textAlign = 'right';
      ctx.fillText(val, this.width - 50, rowY);

      rowY += 34;
    });

    // Barcode section at bottom
    ctx.textAlign = 'left';
    this.drawBarcode(ctx, certId, 60, 680, 2.6, 48);

    return true;
  }

  downloadBlob(canvas, filename = 'developer-portfolio-cert.png') {
    if (!canvas || typeof canvas.toBlob !== 'function') return false;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
    return true;
  }

  getBounds() {
    return {
      width: this.width,
      height: this.height,
      aspectRatio: this.width / this.height
    };
  }
}
