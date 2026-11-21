/**
 * SaaS Launchpad - Branded Graphic Certificate & PNG Receipt Exporter
 * Generates high-DPI enterprise cloud subscription receipts and compliance certificates
 * on HTML5 Canvas with custom barcode pattern generation, checksum parity, and PNG export.
 */

export class SaasLaunchpadReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 640;
    this.height = options.height || 840;
    this.brandName = options.brandName || 'SAAS LAUNCHPAD CLOUD';
    this.themeColors = {
      bg: '#0b0f19',
      cardBg: '#111827',
      primary: '#3b82f6',
      cyan: '#06b6d4',
      emerald: '#10b981',
      textPrimary: '#ffffff',
      textSecondary: '#9ca3af'
    };
  }

  /**
   * Computes a weighted modulo-10 parity checksum for the billing invoice reference.
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
   * Renders the complete enterprise certificate / subscription invoice receipt on canvas.
   */
  renderCanvas(ctx, data = {}) {
    if (!ctx) return { success: false, reason: 'Invalid canvas context' };

    const w = this.width;
    const h = this.height;
    const invoiceId = data.invoiceId || 'INV-2026-CLOUD-9942';
    const customer = data.customer || 'Nexus Global Systems LLC';
    const plan = data.plan || 'ENTERPRISE UNLIMITED DEDICATED CLUSTER';
    const clusterRegion = data.clusterRegion || 'AWS us-east-1 + eu-central-1 (Multi-Region)';
    const billingCycle = data.billingCycle || 'ANNUAL COMMITMENT (2026 - 2027)';
    const totalAmount = data.totalAmount || '$58,200.00 USD';

    ctx.clearRect(0, 0, w, h);

    // Card Outer Background
    ctx.fillStyle = this.themeColors.cardBg;
    ctx.fillRect(0, 0, w, h);

    // Header Gradient Banner
    const grad = ctx.createLinearGradient(0, 0, w, 140);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#3b82f6');
    grad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 140);

    // Header Title & Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.brandName, w / 2, 60);

    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.fillText('NEXUS SPRING OF CODE 2026 CLUSTER SERVICE CERTIFICATE', w / 2, 90);

    // Plan Ribbon
    ctx.fillStyle = this.themeColors.emerald;
    ctx.fillRect(w / 2 - 190, 122, 380, 32);
    ctx.fillStyle = '#0b0f19';
    ctx.font = 'bold 12px -apple-system, sans-serif';
    ctx.fillText(plan, w / 2, 143);

    // Invoice Fields
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

    drawField('Billed Customer / Organization', customer);
    drawField('Invoice & License Ref Code', invoiceId);
    drawField('Cloud Deployment Region', clusterRegion);
    drawField('Service Term & Billing Cycle', billingCycle);
    drawField('Invoice Amount & Status', `${totalAmount} (PAID & PROVISIONED)`);

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, startY + 10);
    ctx.lineTo(w - 50, startY + 10);
    ctx.stroke();

    // Barcode Verification
    this.drawBarcode(ctx, invoiceId, (w - 320) / 2, startY + 35, 320, 60);

    // Security Verification Stamp
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 190, h - 85, 140, 45);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SOC-2 TYPE II VERIFIED', w - 120, h - 66);
    ctx.fillText('IMMUTABLE AUDIT RECEIPT', w - 120, h - 50);

    return {
      success: true,
      invoiceId,
      customer,
      plan,
      dimensions: { width: w, height: h }
    };
  }

  toDataURL(canvas, type = 'image/png') {
    if (!canvas || typeof canvas.toDataURL !== 'function') {
      return null;
    }
    return canvas.toDataURL(type);
  }

  downloadBlob(canvas, filename = 'saas-launchpad-receipt.png') {
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
