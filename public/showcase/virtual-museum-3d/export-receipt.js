/**
 * Virtual Museum 3D - Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter
 */

export class VirtualMuseum3dReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 560;
    this.height = options.height || 320;
    this.defaultAccent = options.accent || '#38bdf8';
  }

  computeBarcodePattern(code) {
    const clean = String(code || 'REC-001').toUpperCase();
    const pattern = [];
    for (let i = 0; i < clean.length; i++) {
      const charCode = clean.charCodeAt(i);
      // Generate 5 bars per character based on bit parity
      for (let bit = 0; bit < 5; bit++) {
        pattern.push(((charCode >> bit) & 1) === 1 ? 1 : 0);
      }
      pattern.push(0); // spacer
    }
    return pattern;
  }

  drawBarcode(ctx, code, x = 40, y = 240, width = 240, height = 35) {
    if (!ctx) return;
    const pattern = this.computeBarcodePattern(code);
    const barWidth = Math.max(1, width / pattern.length);

    ctx.save();
    ctx.fillStyle = '#f8fafc';
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === 1) {
        ctx.fillRect(x + i * barWidth, y, barWidth, height);
      }
    }

    // Barcode label
    ctx.font = '10px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(String(code).toUpperCase(), x, y + height + 12);
    ctx.restore();
  }

  renderCanvas(ctx, data = {}) {
    if (!ctx) return;
    const title = data.title || 'VIP Museum Pass & Exhibit Certificate';
    const recipient = data.recipient || 'Gallery Patron #4829';
    const refCode = data.refCode || 'VM3D-VIP-9941';
    const accent = data.accent || this.defaultAccent;

    ctx.save();
    // Dark background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, this.width, this.height);

    // Decorative gradient header band
    const grad = ctx.createLinearGradient(0, 0, this.width, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, '#6366f1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, 10);

    // Outer border
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 20, this.width - 30, this.height - 35);

    // Header badge
    ctx.fillStyle = accent;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('VIRTUAL MUSEUM 3D CERTIFIED RECEIPT', 40, 50);

    // Document Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(title, 40, 85);

    // Recipient & Details
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Issued To: ' + recipient, 40, 120);
    ctx.fillText('Authorized By: Virtual Museum 3D Protocol', 40, 142);
    ctx.fillText('Issue Date: ' + (data.date || new Date().toLocaleDateString()), 40, 164);

    // Security watermark pill
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(this.width - 160, 40, 120, 26);
    ctx.fillStyle = accent;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('VERIFIED AUTH', this.width - 145, 57);

    // Barcode stamp
    this.drawBarcode(ctx, refCode, 40, 210, 260, 35);

    ctx.restore();
  }

  downloadBlob(filename = 'receipt.png', canvas = null) {
    if (!canvas || typeof canvas.toDataURL !== 'function') return false;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    return true;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('receiptCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const generator = new VirtualMuseum3dReceiptGenerator({ width: canvas.width, height: canvas.height });

    const titleInput = document.getElementById('receiptTitleInput');
    const recipientInput = document.getElementById('recipientInput');
    const refCodeInput = document.getElementById('refCodeInput');
    const colorPicker = document.getElementById('accentColorPicker');

    function draw() {
      generator.renderCanvas(ctx, {
        title: titleInput?.value,
        recipient: recipientInput?.value,
        refCode: refCodeInput?.value,
        accent: colorPicker?.value
      });
    }

    titleInput?.addEventListener('input', draw);
    recipientInput?.addEventListener('input', draw);
    refCodeInput?.addEventListener('input', draw);
    colorPicker?.addEventListener('input', draw);

    document.getElementById('downloadReceiptBtn')?.addEventListener('click', () => {
      generator.downloadBlob('virtual-museum-3d-receipt.png', canvas);
    });

    draw();
  });
}
