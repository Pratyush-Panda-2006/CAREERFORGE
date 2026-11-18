/**
 * Supply Chain Logistics - Telemetry & Sparkline Visualizer
 * Real-time cargo throughput, fleet transit velocity, and intermodal hub latency
 * visualizer with mathematical smoothing, normalization, and canvas rendering.
 */

export class SupplyChainLogisticsTelemetryVisualizer {
  constructor(options = {}) {
    this.canvasId = options.canvasId || 'supply-chain-logistics-telemetry-canvas';
    this.timeWindow = options.timeWindow || '24H';
    this.alpha = options.alpha !== undefined ? options.alpha : 0.28; // EMA smoothing factor
    this.padding = options.padding || { top: 25, right: 30, bottom: 35, left: 45 };

    this.presets = {
      '1H': [88.5, 91.2, 89.4, 94.1, 93.8, 96.2, 95.0, 97.4, 98.1, 96.9, 99.2, 98.6],
      '24H': [72.0, 75.4, 78.1, 82.3, 80.9, 85.6, 88.2, 91.0, 89.5, 94.3, 93.1, 96.5, 95.8, 97.9, 98.4, 99.1],
      '7D': [65.0, 68.2, 74.5, 71.8, 80.4, 78.9, 86.2, 89.1, 87.4, 92.6, 94.8, 96.1, 97.5, 99.0]
    };

    this.currentData = [...(this.presets[this.timeWindow] || this.presets['24H'])];
  }

  setTimeWindow(windowKey) {
    if (this.presets[windowKey]) {
      this.timeWindow = windowKey;
      this.currentData = [...this.presets[windowKey]];
      return true;
    }
    return false;
  }

  calculateBounds(data = this.currentData) {
    if (!Array.isArray(data) || data.length === 0) {
      return { min: 0, max: 100, span: 100 };
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min === 0 ? 1 : max - min;
    return { min, max, span };
  }

  normalizeData(data = this.currentData) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const { min, span } = this.calculateBounds(data);
    return data.map(v => Number(((v - min) / span).toFixed(4)));
  }

  exponentialMovingAverage(data = this.currentData, alpha = this.alpha) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const smoothed = [data[0]];
    for (let i = 1; i < data.length; i++) {
      const val = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
      smoothed.push(Number(val.toFixed(2)));
    }
    return smoothed;
  }

  interpolatePoint(p0, p1, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    return {
      x: Number((p0.x + (p1.x - p0.x) * clampedT).toFixed(2)),
      y: Number((p0.y + (p1.y - p0.y) * clampedT).toFixed(2))
    };
  }

  mapCoordinates(data = this.currentData, width = 600, height = 280, padding = this.padding) {
    if (!Array.isArray(data) || data.length === 0) return [];
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const { min, span } = this.calculateBounds(data);

    const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

    return data.map((val, idx) => {
      const normY = (val - min) / span;
      return {
        x: Number((padding.left + idx * stepX).toFixed(2)),
        y: Number((padding.top + plotHeight - normY * plotHeight).toFixed(2)),
        value: val,
        index: idx
      };
    });
  }

  findNearestPoint(pixelX, coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;
    let closest = coordinates[0];
    let minDiff = Math.abs(pixelX - coordinates[0].x);

    for (let i = 1; i < coordinates.length; i++) {
      const diff = Math.abs(pixelX - coordinates[i].x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = coordinates[i];
      }
    }
    return closest;
  }

  getSummaryMetrics(data = this.currentData) {
    if (!Array.isArray(data) || data.length === 0) {
      return { current: 0, min: 0, max: 0, average: 0, count: 0 };
    }
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = Number((sum / data.length).toFixed(2));
    const { min, max } = this.calculateBounds(data);
    return {
      current: data[data.length - 1],
      min,
      max,
      average: avg,
      count: data.length
    };
  }

  render(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      return { success: false, reason: 'Invalid or mock canvas element' };
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return { success: false, reason: 'Failed to obtain 2D context' };

    const width = canvas.width || 600;
    const height = canvas.height || 280;
    ctx.clearRect(0, 0, width, height);

    const coords = this.mapCoordinates(this.currentData, width, height, this.padding);
    if (coords.length < 2) return { success: true, pointsRendered: coords.length };

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let y = this.padding.top; y <= height - this.padding.bottom; y += 45) {
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(width - this.padding.right, y);
      ctx.stroke();
    }

    // Draw Gradient Area Fill
    const grad = ctx.createLinearGradient(0, this.padding.top, 0, height - this.padding.bottom);
    grad.addColorStop(0, 'rgba(20, 184, 166, 0.35)');
    grad.addColorStop(1, 'rgba(20, 184, 166, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.lineTo(coords[coords.length - 1].x, height - this.padding.bottom);
    ctx.lineTo(coords[0].x, height - this.padding.bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Stroke Line
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw Dots
    coords.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();
      ctx.strokeStyle = '#090a0f';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    return { success: true, pointsRendered: coords.length };
  }
}

// Alias export for interoperability
export { SupplyChainLogisticsTelemetryVisualizer as SupplyChainTelemetryVisualizer };
