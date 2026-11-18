/**
 * DeFi Yield Matrix - Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter
 * Issue #1123 - NSoC '26 Level 3 Feature
 */

export class DefiYieldMatrixReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 600;
    this.height = options.height || 400;
    this.accentColor = options.accentColor || '#38bdf8';
    this.bgDark = options.bgDark || '#0b1120';
  }

  // Pure function to calculate barcode parity bit pattern from alphanumeric code
  static calculateBarcodeParity(code = '') {
    const clean = String(code || 'DYM-0000').toUpperCase();
    let pattern = '';
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      const binary = (charCode % 32).toString(2).padStart(5, '0');
      pattern += binary;
    }
    return pattern;
  }

  generateReceiptData(overrides = {}) {
    return {
      certificateId: overrides.certificateId || `DYM-${Date.now().toString(36).toUpperCase()}`,
      pool: overrides.pool || 'USDC-ETH High Yield Vault',
      stakeAmount: overrides.stakeAmount || '25,000.00 USDC',
      apy: overrides.apy || '18.45% APY',
      txHash: overrides.txHash || `0x${Math.random().toString(16).substring(2, 14)}...${Math.random().toString(16).substring(2, 6)}`,
      timestamp: overrides.timestamp || new Date().toISOString()
    };
  }

  drawBarcode(ctx, code, x = 40, y = 330, width = 520, height = 36) {
    if (!ctx) return [];
    const pattern = DefiYieldMatrixReceiptGenerator.calculateBarcodeParity(code);
    const barWidth = width / Math.max(pattern.length, 1);
    const bars = [];

    ctx.save();
    for (let i = 0; i < pattern.length; i++) {
      const isDrawn = pattern[i] === '1';
      const barX = x + i * barWidth;
      if (isDrawn) {
        ctx.fillStyle = this.accentColor;
        ctx.fillRect(barX, y, Math.max(1, barWidth - 0.5), height);
        bars.push({ x: barX, width: barWidth, active: true });
      } else {
        bars.push({ x: barX, width: barWidth, active: false });
      }
    }
    ctx.restore();
    return bars;
  }

  renderCanvas(ctx, data = {}) {
    if (!ctx) return null;
    const payload = this.generateReceiptData(data);
    const { width, height } = this;

    // Background fill
    ctx.fillStyle = this.bgDark;
    ctx.fillRect(0, 0, width, height);

    // Decorative gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.08)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Outer border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Header badge
    ctx.fillStyle = this.accentColor;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('DEFI YIELD MATRIX // VERIFIED STAKE CERTIFICATE', 40, 48);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(payload.pool, 40, 82);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(40, 98);
    ctx.lineTo(width - 40, 98);
    ctx.stroke();

    // Metrics grid
    const drawField = (label, val, x, y) => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillText(label.toUpperCase(), x, y);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(String(val), x, y + 20);
    };

    drawField('Certificate ID', payload.certificateId, 40, 130);
    drawField('Staked Principal', payload.stakeAmount, 280, 130);
    drawField('Effective Yield', payload.apy, 40, 190);
    drawField('Verification Tx', payload.txHash, 280, 190);
    drawField('Timestamp (UTC)', payload.timestamp, 40, 250);

    // Bottom Barcode Pattern
    this.drawBarcode(ctx, payload.certificateId, 40, 310, width - 80, 40);

    // Bottom label
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`AUTHENTICATED CRYPTOGRAPHIC PROOF: ${payload.certificateId}`, 40, 368);

    return payload;
  }

  downloadBlob(filename = 'defi-yield-matrix-receipt.png', canvas) {
    if (!canvas || typeof window === 'undefined') return false;
    const url = canvas.toDataURL('image/png');
    const anchor = document.createElement('a');
    anchor.download = filename;
    anchor.href = url;
    anchor.click();
    return true;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const generator = new DefiYieldMatrixReceiptGenerator();
    const canvas = document.getElementById('receiptCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const poolInput = document.getElementById('poolInput');
    const amountInput = document.getElementById('amountInput');
    const apyInput = document.getElementById('apyInput');
    const downloadBtn = document.getElementById('downloadReceiptBtn');

    function refresh() {
      generator.renderCanvas(ctx, {
        pool: poolInput?.value,
        stakeAmount: amountInput?.value,
        apy: apyInput?.value
      });
    }

    poolInput?.addEventListener('input', refresh);
    amountInput?.addEventListener('input', refresh);
    apyInput?.addEventListener('input', refresh);

    downloadBtn?.addEventListener('click', () => {
      generator.downloadBlob('defi-yield-matrix-receipt.png', canvas);
    });

    refresh();
  });
}
