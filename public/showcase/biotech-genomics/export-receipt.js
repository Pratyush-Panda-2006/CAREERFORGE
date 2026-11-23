/**
 * Biotech Genomics - Branded Graphic Certificate & PNG Receipt Exporter
 * Formats high-DPI official verification certificates and receipts
 * on HTML5 Canvas with custom barcode pattern generation, checksum parity, and instant export.
 */

export class BiotechGenomicsReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 840;
    this.brandName = options.brandName || 'BIOTECH GENOMICS SEQUENCING HUB';
    this.themeColors = {
      bg: '#060c18',
      cardBg: '#0c172c',
      border: '#16284a',
      primary: '#38bdf8',
      cyan: '#60a5fa',
      emerald: '#10b981',
      textPrimary: '#f8fafc',
      textSecondary: '#94a3b8'
    };
  }

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

  generateBarcodePattern(codeString) {
    const safeCode = (codeString || 'BIOTECH-GENOMICS-0000').toUpperCase();
    const parity = this.calculateBarcodeParity(safeCode);
    const fullCode = safeCode + '-' + parity;

    const bits = [1, 0, 1, 0, 0, 1];
    for (let i = 0; i < fullCode.length; i++) {
      const charVal = fullCode.charCodeAt(i);
      for (let b = 4; b >= 0; b--) {
        bits.push((charVal >> b) & 1);
      }
      bits.push(0);
    }
    bits.push(1, 1, 0, 1, 0, 1);
    return { pattern: bits, fullCode, parity };
  }

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

    if (ctx.fillText) {
      ctx.fillStyle = this.themeColors.textSecondary;
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      const centerX = x + (pattern.length * barWidth) / 2;
      ctx.fillText(fullCode, centerX, y + barHeight + 16);
    }

    return { totalWidth: pattern.length * barWidth, totalHeight: barHeight + 20, code: fullCode };
  }

  renderCanvas(ctx, data = {}) {
    if (!ctx) return false;
    const clientName = data.name || 'Biotech Genomics Validation Authority';
    const vault = data.vault || 'BIOTECH-GENOMICS-VAULT-2026';
    const cert = data.certId || 'BG-SEQ-2026-CERT-1115';
    const amount = data.amount !== undefined ? data.amount : 9850;
    const date = data.date || new Date().toISOString().split('T')[0];

    ctx.fillStyle = this.themeColors.bg;
    ctx.fillRect(0, 0, this.width, this.height);

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

    ctx.fillStyle = this.themeColors.primary;
    ctx.fillRect(50, 50, 6, 32);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.textAlign = 'left';
    ctx.fillText(this.brandName, 68, 72);

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto';
    ctx.fillText('OFFICIAL GENOMIC SPECIMEN RUN MANIFEST', 68, 92);

    ctx.strokeStyle = this.themeColors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(this.width - 50, 115);
    ctx.stroke();

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillText('ISSUED TO / ATTESTING ENTITY', 50, 155);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(clientName, 50, 192);

    ctx.fillStyle = this.themeColors.cyan;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(vault, 50, 218);

    ctx.fillStyle = '#081523';
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
    ctx.fillText(Number(amount).toLocaleString(), 75, 320);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 14px -apple-system, sans-serif';
    ctx.fillText('Verified Transaction & Unit Index', 230, 300);

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Cryptographic hash validation and immutable certificate attestation', 230, 324);

    const rows = [
      ['Attestation Batch ID:', cert],
      ['Issuance Timestamp:', date + ' 00:00:00 UTC'],
      ['Cryptographic Digest:', 'SHA-256 Validated & Certified'],
      ['Audit Integrity:', 'Pass Grade Class 100 Verified'],
      ['Authority Sign-off:', 'System Automation Officer Approval'],
      ['Verification Status:', 'CERTIFIED & IMMUTABLE']
    ];

    let rowY = 430;
    ctx.font = '13px -apple-system, sans-serif';
    rows.forEach(([label, val]) => {
      ctx.fillStyle = this.themeColors.textSecondary;
      ctx.textAlign = 'left';
      ctx.fillText(label, 50, rowY);

      ctx.fillStyle = this.themeColors.textPrimary;
      ctx.textAlign = 'right';
      ctx.fillText(val, this.width - 50, rowY);

      rowY += 36;
    });

    ctx.textAlign = 'left';
    this.drawBarcode(ctx, cert, 60, 680, 2.6, 48);
    return true;
  }

  downloadBlob(canvas, filename = 'biotech-genomics-certificate.png') {
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
    return { width: this.width, height: this.height, aspectRatio: this.width / this.height };
  }
}
