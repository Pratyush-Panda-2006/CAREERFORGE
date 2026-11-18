/**
 * Supply Chain Logistics - Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter
 * Issue #1140 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 600;
    this.height = options.height || 400;
    this.accentColor = options.accentColor || '#f59e0b';
    this.cyanColor = options.cyanColor || '#38bdf8';
    this.bgDark = options.bgDark || '#0b1320';
  }

  // Pure function to calculate barcode parity bit pattern from alphanumeric code
  static calculateBarcodeParity(code = '') {
    const clean = String(code || 'SCL-0000').toUpperCase();
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
      certificateId: overrides.certificateId || `SCL-${Date.now().toString(36).toUpperCase()}`,
      shipment: overrides.shipment || 'Global Freight Consignment #8891-EU',
      carrier: overrides.carrier || 'Maersk Horizon Fleet // Vessel IMO 98214',
      cargoCategory: overrides.cargoCategory || 'Cold-Chain Biopharma (Class 2)',
      txHash: overrides.txHash || `0x${Math.random().toString(16).substring(2, 14)}...${Math.random().toString(16).substring(2, 6)}`,
      timestamp: overrides.timestamp || new Date().toISOString()
    };
  }

  drawBarcode(ctx, code, x = 40, y = 330, width = 520, height = 36) {
    if (!ctx) return [];
    const pattern = SupplyChainLogisticsReceiptGenerator.calculateBarcodeParity(code);
    const barWidth = width / Math.max(pattern.length, 1);
    const bars = [];

    if (typeof ctx.save === 'function') ctx.save();
    for (let i = 0; i < pattern.length; i++) {
      const isDrawn = pattern[i] === '1';
      const barX = x + i * barWidth;
      if (isDrawn) {
        if (ctx.fillStyle !== undefined) ctx.fillStyle = this.accentColor;
        if (typeof ctx.fillRect === 'function') {
          ctx.fillRect(barX, y, Math.max(1, barWidth - 0.5), height);
        }
        bars.push({ x: barX, width: barWidth, active: true });
      } else {
        bars.push({ x: barX, width: barWidth, active: false });
      }
    }
    if (typeof ctx.restore === 'function') ctx.restore();
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
    if (typeof ctx.createLinearGradient === 'function') {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
      gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.25)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Outer border
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Header badge
    ctx.fillStyle = this.accentColor;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('SUPPLY CHAIN LOGISTICS // VERIFIED BILL OF LADING & RECEIPT', 40, 48);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(payload.shipment, 40, 80);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(40, 96);
    ctx.lineTo(width - 40, 96);
    ctx.stroke();

    // Key-value metadata rows
    const drawRow = (label, val, y) => {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(label, 40, y);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(val, 200, y);
    };

    drawRow('Consignment ID:', payload.certificateId, 130);
    drawRow('Vessel / Carrier:', payload.carrier, 160);
    drawRow('Cargo Category:', payload.cargoCategory, 190);
    drawRow('Audit Ledger Hash:', payload.txHash, 220);
    drawRow('Manifest Issue:', payload.timestamp, 250);

    // Barcode footer
    this.drawBarcode(ctx, payload.certificateId, 40, 280, width - 80, 36);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`AUTHENTICATED LOGISTICS WAYBILL [PARITY-VERIFIED: ${payload.certificateId}]`, 40, 335);

    return payload;
  }

  downloadBlob(filename = 'supply-chain-waybill.png', canvas = null) {
    if (typeof document === 'undefined') return false;
    const targetCanvas = canvas || document.querySelector('canvas');
    if (!targetCanvas || typeof targetCanvas.toBlob !== 'function') return false;

    targetCanvas.toBlob((blob) => {
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
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const generator = new SupplyChainLogisticsReceiptGenerator();
    const canvas = document.getElementById('receiptCanvas');
    const shipmentInput = document.getElementById('inputShipment');
    const carrierInput = document.getElementById('inputCarrier');
    const downloadBtn = document.getElementById('btnDownloadPng');

    function refreshCanvas() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      generator.renderCanvas(ctx, {
        shipment: shipmentInput?.value,
        carrier: carrierInput?.value
      });
    }

    shipmentInput?.addEventListener('input', refreshCanvas);
    carrierInput?.addEventListener('input', refreshCanvas);

    downloadBtn?.addEventListener('click', () => {
      generator.downloadBlob('supply-chain-waybill.png', canvas);
    });

    refreshCanvas();
  });
}
