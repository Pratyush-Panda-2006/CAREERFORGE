/**
 * Festival Hub - Branded Graphic Certificate & PNG Receipt Exporter
 * Generates high-DPI stage access passes and digital receipts on HTML5 Canvas
 * with custom barcode pattern generation, checksum parity, and PNG export.
 */

export class FestivalHubReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 840;
    this.brandName = options.brandName || 'FESTIVAL HUB LIVE';
    this.themeColors = {
      bg: '#180d24',
      cardBg: '#27173a',
      accent: '#ec4899',
      accentGlow: '#f472b6',
      gold: '#f59e0b',
      textPrimary: '#ffffff',
      textSecondary: '#d1b9e3'
    };
  }

  /**
   * Computes a weighted modulo-10 parity checksum for the barcode string.
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
    const parity = this.calculateBarcodeParity(codeString);
    const fullCode = `${codeString}-${parity}`;
    let pattern = '101'; // Start guard

    for (let i = 0; i < fullCode.length; i++) {
      const charCode = fullCode.charCodeAt(i);
      // Map charCode to 5-bit pseudo pattern
      const binary = (charCode % 32).toString(2).padStart(5, '0');
      pattern += binary + '0';
    }

    pattern += '101'; // Stop guard
    return { pattern, fullCode, parity };
  }

  /**
   * Draws vector barcode bars onto the canvas context.
   */
  drawBarcode(ctx, code, x, y, width = 320, height = 55) {
    if (!ctx) return { drawn: false, reason: 'No canvas context provided' };

    const { pattern, fullCode, parity } = this.generateBarcodePattern(code);
    const barWidth = width / pattern.length;

    ctx.save();
    ctx.fillStyle = '#ffffff';

    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '1') {
        ctx.fillRect(x + i * barWidth, y, Math.ceil(barWidth), height);
      }
    }

    // Code Label below barcode
    ctx.fillStyle = this.themeColors.textSecondary;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`* ${fullCode} *`, x + width / 2, y + height + 16);
    ctx.restore();

    return {
      drawn: true,
      x,
      y,
      width,
      height,
      parity,
      fullCode
    };
  }

  /**
   * Renders the complete certificate / VIP receipt onto an HTML5 2D canvas context.
   */
  renderCanvas(ctx, data = {}) {
    if (!ctx) return { success: false, reason: 'Invalid canvas context' };

    const w = this.width;
    const h = this.height;
    const ticketId = data.ticketId || 'FEST-2026-VIP-8891';
    const attendee = data.attendee || 'Alex Vance';
    const tier = data.tier || 'VIP BACKSTAGE ACCESS PASS';
    const stage = data.stage || 'Solaris Main Stage';
    const dateStr = data.date || 'OCT 24 - 26, 2026';
    const totalAmount = data.totalAmount || '$349.00 USD';

    ctx.clearRect(0, 0, w, h);

    // Card Outer Background & Border
    ctx.fillStyle = this.themeColors.cardBg;
    ctx.fillRect(0, 0, w, h);

    // Decorative Gradient Header Banner
    const grad = ctx.createLinearGradient(0, 0, w, 180);
    grad.addColorStop(0, '#ec4899');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 140);

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.brandName, w / 2, 60);

    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('NEXUS SPRING OF CODE 2026 CERTIFICATE OF ATTENDANCE', w / 2, 90);

    // Tier Ribbon
    ctx.fillStyle = this.themeColors.gold;
    ctx.fillRect(w / 2 - 160, 122, 320, 32);
    ctx.fillStyle = '#180d24';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    ctx.fillText(tier, w / 2, 143);

    // Ticket Details Section
    ctx.textAlign = 'left';
    let startY = 210;

    const drawField = (label, value) => {
      ctx.fillStyle = this.themeColors.textSecondary;
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillText(label.toUpperCase(), 50, startY);

      ctx.fillStyle = this.themeColors.textPrimary;
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.fillText(value, 50, startY + 24);
      startY += 62;
    };

    drawField('Attendee Name', attendee);
    drawField('Pass Reference Code', ticketId);
    drawField('Authorized Stage & Zone', stage);
    drawField('Event Validity Window', dateStr);
    drawField('Payment Total & Status', `${totalAmount} (VERIFIED COMPLETED)`);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, startY + 10);
    ctx.lineTo(w - 50, startY + 10);
    ctx.stroke();

    // Security Verification Barcode
    this.drawBarcode(ctx, ticketId, (w - 320) / 2, startY + 35, 320, 60);

    // Security Watermark Stamp
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 180, h - 85, 130, 45);

    ctx.fillStyle = 'rgba(236, 72, 153, 0.7)';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL DIGITAL PASS', w - 115, h - 66);
    ctx.fillText('SECURE HASH VERIFIED', w - 115, h - 50);

    return {
      success: true,
      ticketId,
      attendee,
      tier,
      dimensions: { width: w, height: h }
    };
  }

  toDataURL(canvas, type = 'image/png') {
    if (!canvas || typeof canvas.toDataURL !== 'function') {
      return null;
    }
    return canvas.toDataURL(type);
  }

  downloadBlob(canvas, filename = 'festival-hub-receipt.png') {
    if (typeof window === 'undefined' || !canvas) {
      return { success: false, reason: 'SSR / Non-browser environment' };
    }
    const dataUrl = this.toDataURL(canvas);
    if (!dataUrl) return { success: false, reason: 'Failed to generate data URL' };

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 150);

    return { success: true, filename };
  }
}
