/**
 * Ecommerce Store - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 */

export class EcommerceStoreTelemetrySparkline {
  constructor(options = {}) {
    this.width = options.width || 300;
    this.height = options.height || 60;
    this.padding = options.padding || 5;
  }

  normalize(data = []) {
    if (data.length === 0) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const stepX = (this.width - this.padding * 2) / Math.max(1, data.length - 1);
    const availH = this.height - this.padding * 2;

    return data.map((val, i) => {
      const x = Number((this.padding + i * stepX).toFixed(1));
      const y = Number((this.height - this.padding - ((val - min) / range) * availH).toFixed(1));
      return { x, y, raw: val };
    });
  }

  generatePolyline(data = []) {
    const points = this.normalize(data);
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  renderSVG(data = []) {
    const pointsStr = this.generatePolyline(data);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.width} ${this.height}" width="${this.width}" height="${this.height}"><polyline fill="none" stroke="#38bdf8" stroke-width="2" points="${pointsStr}"/></svg>`;
  }
}
