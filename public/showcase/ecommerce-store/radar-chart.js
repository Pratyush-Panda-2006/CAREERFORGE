/**
 * Ecommerce Store - Multi-Dimensional SVG Radar Chart Visualizer
 */

export class EcommerceStoreRadarChart {
  constructor(options = {}) {
    this.size = options.size || 400;
    this.center = this.size / 2;
    this.radius = options.radius || 150;
    this.metrics = options.metrics || [
      { key: 'performance', name: 'Performance', value: 0.9 },
      { key: 'reliability', name: 'Reliability', value: 0.85 },
      { key: 'security', name: 'Security', value: 0.95 },
      { key: 'usability', name: 'Usability', value: 0.8 },
      { key: 'scalability', name: 'Scalability', value: 0.88 },
      { key: 'efficiency', name: 'Efficiency', value: 0.92 }
    ];
  }

  polarToCartesian(angleInDegrees, radius) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: Number((this.center + radius * Math.cos(angleInRadians)).toFixed(2)),
      y: Number((this.center + radius * Math.sin(angleInRadians)).toFixed(2))
    };
  }

  getPolygonPoints() {
    const total = this.metrics.length;
    const step = 360 / total;
    return this.metrics.map((m, i) => {
      const val = Math.max(0, Math.min(1, m.value));
      return this.polarToCartesian(i * step, this.radius * val);
    });
  }

  calculateArea(points) {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Number((Math.abs(area) / 2).toFixed(2));
  }

  renderSVG() {
    const points = this.getPolygonPoints();
    const pointStr = points.map(p => `${p.x},${p.y}`).join(' ');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.size} ${this.size}" width="${this.size}" height="${this.size}"><polygon points="${pointStr}" fill="rgba(56, 189, 248, 0.4)" stroke="#38bdf8" stroke-width="2"/></svg>`;
  }
}
