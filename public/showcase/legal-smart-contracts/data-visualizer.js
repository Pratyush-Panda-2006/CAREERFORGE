/**
 * Legal Smart Contracts - Multi-Axis Polar Coordinate Radar Chart & Metrics Visualizer
 */

export class LegalSmartContractsRadarChart {
  constructor(options = {}) {
    this.centerX = options.centerX || 230;
    this.centerY = options.centerY || 230;
    this.maxRadius = options.maxRadius || 170;
    this.defaultMetrics = [
      {
            "key": "gasEfficiency",
            "name": "EVM Gas Efficiency",
            "value": 0.96
      },
      {
            "key": "auditCoverage",
            "name": "Formal Audit Verification",
            "value": 0.98
      },
      {
            "key": "reentrancyGuard",
            "name": "Reentrancy Guard Defense",
            "value": 0.99
      },
      {
            "key": "bytecodeOpt",
            "name": "Bytecode Optimizer Ratio",
            "value": 0.94
      },
      {
            "key": "multisigSecurity",
            "name": "Multi-Sig Quorum Health",
            "value": 0.97
      },
      {
            "key": "upgradeability",
            "name": "Proxy Storage Isolation",
            "value": 0.92
      }
];
    this.metrics = options.metrics ? options.metrics.map(m => ({ ...m })) : this.defaultMetrics.map(m => ({ ...m }));
  }

  polarToCartesian(radius, angleRad) {
    const screenAngle = angleRad - Math.PI / 2;
    return {
      x: Number((this.centerX + radius * Math.cos(screenAngle)).toFixed(3)),
      y: Number((this.centerY + radius * Math.sin(screenAngle)).toFixed(3))
    };
  }

  generatePolygonPoints(metricsList = this.metrics) {
    if (!Array.isArray(metricsList) || metricsList.length === 0) return '';
    const step = (2 * Math.PI) / metricsList.length;
    return metricsList.map((m, idx) => {
      const r = Math.max(0, Math.min(1, m.value)) * this.maxRadius;
      const pt = this.polarToCartesian(r, idx * step);
      return `${pt.x},${pt.y}`;
    }).join(' ');
  }

  computeEnclosedArea(metricsList = this.metrics) {
    if (!Array.isArray(metricsList) || metricsList.length < 3) return 0;
    const step = (2 * Math.PI) / metricsList.length;
    const coords = metricsList.map((m, idx) => {
      const r = Math.max(0, Math.min(1, m.value)) * this.maxRadius;
      return this.polarToCartesian(r, idx * step);
    });

    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < coords.length; i++) {
      const cur = coords[i], nxt = coords[(i + 1) % coords.length];
      sum1 += cur.x * nxt.y;
      sum2 += cur.y * nxt.x;
    }
    return Number((Math.abs(sum1 - sum2) / 2).toFixed(2));
  }

  generateWebGrid(levels = 5) {
    const total = this.metrics.length;
    const step = (2 * Math.PI) / total;
    const grids = [];
    for (let l = 1; l <= levels; l++) {
      const r = (l / levels) * this.maxRadius;
      const pts = [];
      for (let i = 0; i < total; i++) {
        const pt = this.polarToCartesian(r, i * step);
        pts.push(`${pt.x},${pt.y}`);
      }
      grids.push(pts.join(' '));
    }
    return grids;
  }

  updateMetric(key, value) {
    const m = this.metrics.find(x => x.key === key);
    if (!m) return false;
    m.value = Math.max(0, Math.min(1, Number(value) || 0));
    return true;
  }

  resetMetrics() {
    this.metrics = this.defaultMetrics.map(m => ({ ...m }));
  }
}
