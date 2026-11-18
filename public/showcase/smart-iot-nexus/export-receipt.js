/**
 * Smart IoT Nexus - Canvas 2D Branded Graphic Certificate & PNG Receipt Exporter
 * Issue #1119 - NSoC '26 Level 3 Feature
 */

export class SmartIotNexusReceiptGenerator {
  constructor(options = {}) {
    this.width = options.width || 600;
    this.height = options.height || 400;
    this.accentColor = options.accentColor || '#10b981';
    this.bgDark = options.bgDark || '#0b1329';
  }

  // Pure function to calculate barcode parity bit pattern from alphanumeric code
  static calculateBarcodeParity(code = '') {
    const clean = String(code || 'IOT-0000').toUpperCase();
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
      deviceId: overrides.deviceId || `IOT-GATEWAY-${Date.now().toString(36).toUpperCase()}`,
      gatewayName: overrides.gatewayName || 'Industrial Edge Gateway #42',
      telemetryThroughput: overrides.telemetryThroughput || '1,420 msgs/sec',
      calibrationStatus: overrides.calibrationStatus || 'VERIFIED (ISO-9001)',
      hardwareSignature: overrides.hardwareSignature || `0x${Math.random().toString(16).substring(2, 14)}...${Math.random().toString(16).substring(2, 6)}`,
      timestamp: overrides.timestamp || new Date().toISOString()
    };
  }

  drawBarcode(ctx, code, x = 40, y = 330, width = 520, height = 36) {
    if (!ctx) return [];
    const pattern = SmartIotNexusReceiptGenerator.calculateBarcodeParity(code);
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
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
    gradient.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Outer border
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Inner border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Header badge
    ctx.fillStyle = this.accentColor;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('SMART IOT NEXUS // TELEMETRY CERTIFICATE OF CALIBRATION', 40, 48);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(payload.gatewayName, 40, 82);

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

    drawField('Device Gateway ID', payload.deviceId, 40, 130);
    drawField('Stream Throughput', payload.telemetryThroughput, 280, 130);
    drawField('Calibration Grade', payload.calibrationStatus, 40, 190);
    drawField('HW Device Signature', payload.hardwareSignature, 280, 190);
    drawField('Audit Timestamp', payload.timestamp, 40, 250);

    // Bottom Barcode Pattern
    this.drawBarcode(ctx, payload.deviceId, 40, 310, width - 80, 40);

    // Bottom label
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`AUTHENTICATED HARDWARE PROOF: ${payload.deviceId}`, 40, 368);

    return payload;
  }

  downloadBlob(filename = 'smart-iot-nexus-receipt.png', canvas) {
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
    const generator = new SmartIotNexusReceiptGenerator();
    const canvas = document.getElementById('receiptCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const gatewayInput = document.getElementById('gatewayInput');
    const throughputInput = document.getElementById('throughputInput');
    const calibrationInput = document.getElementById('calibrationInput');
    const downloadBtn = document.getElementById('downloadReceiptBtn');

    function refresh() {
      generator.renderCanvas(ctx, {
        gatewayName: gatewayInput?.value,
        telemetryThroughput: throughputInput?.value,
        calibrationStatus: calibrationInput?.value
      });
    }

    gatewayInput?.addEventListener('input', refresh);
    throughputInput?.addEventListener('input', refresh);
    calibrationInput?.addEventListener('input', refresh);

    downloadBtn?.addEventListener('click', () => {
      generator.downloadBlob('smart-iot-nexus-receipt.png', canvas);
    });

    refresh();
  });
}
