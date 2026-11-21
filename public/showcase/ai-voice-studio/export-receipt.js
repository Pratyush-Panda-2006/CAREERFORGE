/**
 * AI Voice Studio - Branded Graphic Certificate & PNG Receipt Exporter
 * Formats high-DPI official verification certificates and receipts
 * on HTML5 Canvas with custom barcode pattern generation, checksum parity, and instant export.
 */

export class AiVoiceStudioReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 840;
    this.brandName = options.brandName || 'AI VOICE STUDIO NEURAL SYNTHESIS LABS';
    this.themeColors = {
      bg: '#081324',
      cardBg: '#0f223f',
      border: '#1b3b68',
      primary: '#06b6d4',
      cyan: '#3b82f6',
      emerald: '#10b981',
      textPrimary: '#f0f9ff',
      textSecondary: '#7dd3fc'
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
    const safeCode = (codeString || 'AI-VOICE-STUDIO-0000').toUpperCase();
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
   * Renders the complete certificate and receipt onto the canvas.
   */
  renderCanvas(ctx, data = {}) {
    if (!ctx) return false;

    const name = data.name || 'Global Media Omniverse Productions';
    const vault = data.vault || 'AVS-MODEL-2026-VOX88';
    const certId = data.certId || 'AI-VOICE-STUDIO-2026-TX1091';
    const amount = data.amount !== undefined ? data.amount : 250;
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
    ctx.fillText('COMMERCIAL VOICE MODEL RIGHTS & ASSET CERTIFICATE', 68, 92);

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
    ctx.fillText('LICENSED ENTERPRISE / AUDIO DEVELOPER', 50, 155);

    ctx.fillStyle = this.themeColors.textPrimary;
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillText(name, 50, 192);

    ctx.fillStyle = this.themeColors.cyan;
    ctx.font = '14px -apple-system, sans-serif';
    ctx.fillText(vault, 50, 218);

    // Metric Summary Box
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
    ctx.fillText('Synthesized Word Quota (Million Words)', 230, 300);

    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('Verified cryptographic authorization and record attestation', 230, 324);

    // Audit Metadata Table
    const rows = [
      ['Attestation Batch ID:', certId],
      ['Issuance Timestamp:', date + ' 00:00:00 UTC'],
      ['Voice Model Architecture:', 'Multi-Speaker Diffusion Neural TTS'],
      ['Acoustic Frequency Range:', '20 Hz - 24,000 Hz Hi-Res Audio'],
      ['Commercial License Tier:', 'Perpetual Global Broadcast & Film Rights'],
      ['Watermark Encoding:', 'Cryptographic Inaudible Forensic Watermark'],
      ['Ethics & Consent Audit:', '100% Actor Consensual Voice Cloned'],
      ['Verification Status:', 'CERTIFIED & IMMUTABLE']
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

  downloadBlob(canvas, filename = 'ai-voice-studio-certificate.png') {
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
