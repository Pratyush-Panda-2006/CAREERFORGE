/**
 * VR Metaverse Hub - Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter
 * Issue #1136 - NSoC '26 Level 3 Feature
 */

export class VrMetaverseHubReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 600;
    this.height = options.height || 400;
    this.accentColor = options.accentColor || '#a855f7';
    this.cyanColor = options.cyanColor || '#06b6d4';
    this.bgDark = options.bgDark || '#090d16';
  }

  // Pure function to calculate barcode parity bit pattern from alphanumeric code
  static calculateBarcodeParity(code = '') {
    const clean = String(code || 'VRM-0000').toUpperCase();
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
      certificateId: overrides.certificateId || `VRM-${Date.now().toString(36).toUpperCase()}`,
      parcel: overrides.parcel || 'Genesis World #4092 - Horizon Sector',
      owner: overrides.owner || 'NexusAvatar-0x89A',
      dimensions: overrides.dimensions || '64m x 64m Virtual Estate',
      txHash: overrides.txHash || `0x${Math.random().toString(16).substring(2, 14)}...${Math.random().toString(16).substring(2, 6)}`,
      timestamp: overrides.timestamp || new Date().toISOString()
    };
  }

  drawBarcode(ctx, code, x = 40, y = 330, width = 520, height = 36) {
    if (!ctx) return [];
    const pattern = VrMetaverseHubReceiptGenerator.calculateBarcodeParity(code);
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
      gradient.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Outer border
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Header badge
    ctx.fillStyle = this.cyanColor;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('VR METAVERSE HUB // VERIFIED LAND & ASSET DEED', 40, 48);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(payload.parcel, 40, 80);

    // Divider line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(40, 96);
    ctx.lineTo(width - 40, 96);
    ctx.stroke();

    // Key-value metadata rows
    const drawRow = (label, val, y) => {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(label, 40, y);

      ctx.fillStyle = '#f3f4f6';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(val, 200, y);
    };

    drawRow('Certificate ID:', payload.certificateId, 130);
    drawRow('Owner Identity:', payload.owner, 160);
    drawRow('Estate Parcel Area:', payload.dimensions, 190);
    drawRow('Verification Tx:', payload.txHash, 220);
    drawRow('Issue Timestamp:', payload.timestamp, 250);

    // Barcode footer
    this.drawBarcode(ctx, payload.certificateId, 40, 280, width - 80, 36);

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px monospace';
    ctx.fillText(`AUTHENTICATION BARCODE [PARITY-VERIFIED: ${payload.certificateId}]`, 40, 335);

    return payload;
  }

  downloadBlob(filename = 'vr-metaverse-certificate.png', canvas = null) {
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
    const generator = new VrMetaverseHubReceiptGenerator();
    const canvas = document.getElementById('receiptCanvas');
    const parcelInput = document.getElementById('inputParcel');
    const ownerInput = document.getElementById('inputOwner');
    const downloadBtn = document.getElementById('btnDownloadPng');

    function refreshCanvas() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      generator.renderCanvas(ctx, {
        parcel: parcelInput?.value,
        owner: ownerInput?.value
      });
    }

    parcelInput?.addEventListener('input', refreshCanvas);
    ownerInput?.addEventListener('input', refreshCanvas);

    downloadBtn?.addEventListener('click', () => {
      generator.downloadBlob('vr-metaverse-certificate.png', canvas);
    });

    refreshCanvas();
  });
}
