/**
 * Festival Hub - Multi-Dimensional Polar Radar Chart & Metrics Visualizer
 * Plots multi-variable festival stage acoustics, crowd density, lighting fidelity,
 * and artist latency with SVG concentric webs and shoelace area calculation.
 */

export class FestivalHubRadarChart {
  constructor(options = {}) {
    this.cx = options.cx !== undefined ? options.cx : 200;
    this.cy = options.cy !== undefined ? options.cy : 200;
    this.maxRadius = options.maxRadius !== undefined ? options.maxRadius : 150;
    this.maxValue = options.maxValue !== undefined ? options.maxValue : 100;

    this.defaultAxes = options.axes || [
      { key: 'acoustics', label: 'Acoustics Fidelity', value: 85 },
      { key: 'lighting', label: 'Stage Lumens & FX', value: 92 },
      { key: 'crowdFlow', label: 'Crowd Circulation', value: 78 },
      { key: 'pyrotechnics', label: 'SFX & Pyros', value: 88 },
      { key: 'artistSync', label: 'In-Ear Monitor Sync', value: 95 },
      { key: 'vibeIndex', label: 'Atmosphere Energy', value: 90 }
    ];

    this.metrics = [...this.defaultAxes];
  }

  /**
   * Converts polar coordinates (r, angle in radians) to Cartesian (x, y) relative to center.
   * Angle 0 is straight up (-Y axis) in SVG coordinate space.
   */
  polarToCartesian(radius, angleRad) {
    const x = this.cx + radius * Math.sin(angleRad);
    const y = this.cy - radius * Math.cos(angleRad);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  }

  /**
   * Normalizes an array of metric values [0..maxValue] to scale [0..1].
   */
  normalizeMetrics(metrics = this.metrics, maxVal = this.maxValue) {
    if (!Array.isArray(metrics) || metrics.length === 0) return [];
    return metrics.map(m => {
      const val = typeof m === 'number' ? m : m.value;
      const normalized = Math.max(0, Math.min(1, val / maxVal));
      return Number(normalized.toFixed(4));
    });
  }

  /**
   * Generates polygon point coordinates and SVG points string "x1,y1 x2,y2 ...".
   */
  generatePolygonPoints(metrics = this.metrics, maxRadius = this.maxRadius) {
    if (!Array.isArray(metrics) || metrics.length < 3) {
      return { points: [], pointsString: '' };
    }
    const count = metrics.length;
    const angleStep = (2 * Math.PI) / count;
    const points = [];

    for (let i = 0; i < count; i++) {
      const val = typeof metrics[i] === 'number' ? metrics[i] : metrics[i].value;
      const normalized = Math.max(0, Math.min(1, val / this.maxValue));
      const r = normalized * maxRadius;
      const angle = i * angleStep;
      const pt = this.polarToCartesian(r, angle);
      points.push({ ...pt, key: metrics[i].key, label: metrics[i].label, value: val, index: i });
    }

    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    return { points, pointsString };
  }

  /**
   * Computes the enclosed area of the polygon using Gauss's shoelace formula.
   */
  computeEnclosedArea(points) {
    const pts = Array.isArray(points) ? points : this.generatePolygonPoints(this.metrics).points;
    const n = pts.length;
    if (n < 3) return 0;

    let area = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Number((Math.abs(area) / 2).toFixed(2));
  }

  /**
   * Generates concentric circular/polygonal web grid lines.
   */
  generateWebPolygons(levels = 5, maxRadius = this.maxRadius) {
    const webs = [];
    const count = this.metrics.length;
    const angleStep = (2 * Math.PI) / count;

    for (let level = 1; level <= levels; level++) {
      const r = (level / levels) * maxRadius;
      const pts = [];
      for (let i = 0; i < count; i++) {
        const pt = this.polarToCartesian(r, i * angleStep);
        pts.push(`${pt.x},${pt.y}`);
      }
      webs.push({
        level,
        radius: r,
        pointsString: pts.join(' ')
      });
    }
    return webs;
  }

  /**
   * Generates axis spokes from center to perimeter vertices.
   */
  generateAxes(maxRadius = this.maxRadius) {
    const count = this.metrics.length;
    const angleStep = (2 * Math.PI) / count;
    const axes = [];

    for (let i = 0; i < count; i++) {
      const angle = i * angleStep;
      const target = this.polarToCartesian(maxRadius, angle);
      const labelPos = this.polarToCartesian(maxRadius + 22, angle);
      axes.push({
        index: i,
        key: this.metrics[i].key,
        label: this.metrics[i].label,
        x1: this.cx,
        y1: this.cy,
        x2: target.x,
        y2: target.y,
        labelX: labelPos.x,
        labelY: labelPos.y
      });
    }
    return axes;
  }

  /**
   * Sets value of a specific metric key.
   */
  setMetricValue(key, val) {
    const item = this.metrics.find(m => m.key === key);
    if (item) {
      item.value = Math.max(0, Math.min(this.maxValue, val));
      return true;
    }
    return false;
  }

  /**
   * Calculates high-level festival telemetry statistics.
   */
  getMetricsSummary() {
    const pointsData = this.generatePolygonPoints(this.metrics);
    const area = this.computeEnclosedArea(pointsData.points);
    const maxTheoreticalArea = 0.5 * this.metrics.length * Math.pow(this.maxRadius, 2) * Math.sin((2 * Math.PI) / this.metrics.length);
    const scorePct = Number(((area / maxTheoreticalArea) * 100).toFixed(1));

    let peak = this.metrics[0];
    this.metrics.forEach(m => {
      if (m.value > peak.value) peak = m;
    });

    return {
      enclosedArea: area,
      maxTheoreticalArea: Number(maxTheoreticalArea.toFixed(2)),
      overallPerformanceScore: scorePct,
      peakMetric: peak.label,
      peakValue: peak.value,
      axisCount: this.metrics.length
    };
  }
}
