/**
 * Streaming Cinema Hub - Multi-Axis Polar Coordinate Radar Chart & Metrics Visualizer
 * Plots multi-variable telemetry and performance metrics in Cartesian polar projection
 * and calculates enclosed polygon area via Gauss shoelace formula.
 */

export class StreamingCinemaHubRadarChart {
  constructor(options = {}) {
    this.centerX = options.centerX || 230;
    this.centerY = options.centerY || 230;
    this.maxRadius = options.maxRadius || 170;

    this.defaultMetrics = [
      {
            "key": "bitrate",
            "name": "Adaptive Bitrate Delivery",
            "value": 0.97
      },
      {
            "key": "buffer",
            "name": "Playback Buffer Health",
            "value": 0.94
      },
      {
            "key": "pacing",
            "name": "Frame Pacing & VSync",
            "value": 0.98
      },
      {
            "key": "audioFidelity",
            "name": "Spatial Audio Fidelity",
            "value": 0.92
      },
      {
            "key": "cdnLatency",
            "name": "Edge CDN TTFB Latency",
            "value": 0.95
      },
      {
            "key": "dynamicRange",
            "name": "HDR Tone Mapping Accuracy",
            "value": 0.93
      }
];

    this.metrics = options.metrics
      ? options.metrics.map((m) => ({ ...m }))
      : this.defaultMetrics.map((m) => ({ ...m }));
  }

  /**
   * Transforms polar coordinates (radius, angle in radians) into Cartesian space (x, y).
   * Note: Angle 0 points straight up (-PI / 2 offset in screen space).
   */
  polarToCartesian(radius, angleRad) {
    const screenAngle = angleRad - Math.PI / 2;
    const x = this.centerX + radius * Math.cos(screenAngle);
    const y = this.centerY + radius * Math.sin(screenAngle);
    return {
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3))
    };
  }

  /**
   * Generates SVG polygon points string from metric list.
   */
  generatePolygonPoints(metricsList = this.metrics) {
    if (!Array.isArray(metricsList) || metricsList.length === 0) return '';
    const total = metricsList.length;
    const step = (2 * Math.PI) / total;

    return metricsList
      .map((m, idx) => {
        const normalized = Math.max(0, Math.min(1, m.value));
        const r = normalized * this.maxRadius;
        const pt = this.polarToCartesian(r, idx * step);
        return `${pt.x},${pt.y}`;
      })
      .join(' ');
  }

  /**
   * Computes the enclosed polygon area using the Gauss Shoelace formula.
   */
  computeEnclosedArea(metricsList = this.metrics) {
    if (!Array.isArray(metricsList) || metricsList.length < 3) return 0;
    const total = metricsList.length;
    const step = (2 * Math.PI) / total;

    const coords = metricsList.map((m, idx) => {
      const normalized = Math.max(0, Math.min(1, m.value));
      const r = normalized * this.maxRadius;
      return this.polarToCartesian(r, idx * step);
    });

    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < coords.length; i++) {
      const current = coords[i];
      const next = coords[(i + 1) % coords.length];
      sum1 += current.x * next.y;
      sum2 += current.y * next.x;
    }

    return Number((Math.abs(sum1 - sum2) / 2).toFixed(2));
  }

  /**
   * Generates concentric polygon grid point strings for spider web background.
   */
  generateWebGrid(levels = 5) {
    const total = this.metrics.length;
    const step = (2 * Math.PI) / total;
    const grids = [];

    for (let l = 1; l <= levels; l++) {
      const fraction = l / levels;
      const r = fraction * this.maxRadius;
      const points = [];

      for (let i = 0; i < total; i++) {
        const pt = this.polarToCartesian(r, i * step);
        points.push(`${pt.x},${pt.y}`);
      }
      grids.push(points.join(' '));
    }

    return grids;
  }

  /**
   * Computes spoke axis lines radiating from center to outer boundary.
   */
  getSpokeCoordinates() {
    const total = this.metrics.length;
    const step = (2 * Math.PI) / total;

    return this.metrics.map((m, idx) => {
      const angle = idx * step;
      const end = this.polarToCartesian(this.maxRadius, angle);
      const labelPt = this.polarToCartesian(this.maxRadius + 22, angle);

      return {
        key: m.key,
        name: m.name,
        x1: this.centerX,
        y1: this.centerY,
        x2: end.x,
        y2: end.y,
        labelX: labelPt.x,
        labelY: labelPt.y + 4
      };
    });
  }

  /**
   * Computes individual vertex point coordinates for handles and tooltips.
   */
  getVertexCoordinates(metricsList = this.metrics) {
    const total = metricsList.length;
    const step = (2 * Math.PI) / total;

    return metricsList.map((m, idx) => {
      const normalized = Math.max(0, Math.min(1, m.value));
      const r = normalized * this.maxRadius;
      const pt = this.polarToCartesian(r, idx * step);
      return {
        key: m.key,
        name: m.name,
        value: m.value,
        x: pt.x,
        y: pt.y
      };
    });
  }

  /**
   * Updates an individual metric score by key.
   */
  updateMetric(key, value) {
    const metric = this.metrics.find((m) => m.key === key);
    if (!metric) return false;
    metric.value = Math.max(0, Math.min(1, Number(value) || 0));
    return true;
  }

  /**
   * Resets all metric values to default.
   */
  resetMetrics() {
    this.metrics = this.defaultMetrics.map((m) => ({ ...m }));
  }

  /**
   * Returns summary calculations.
   */
  getMetricsSummary() {
    const sum = this.metrics.reduce((acc, m) => acc + m.value, 0);
    return {
      totalMetrics: this.metrics.length,
      averageScore: Number((sum / this.metrics.length).toFixed(3)),
      enclosedArea: this.computeEnclosedArea()
    };
  }
}
