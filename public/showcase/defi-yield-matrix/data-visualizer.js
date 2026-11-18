/**
 * DeFi Yield Matrix - Multi-Dimensional SVG Radar Chart & Polar Metrics Visualizer
 * Issue #1121 - NSoC '26 Level 3 Feature
 */

export class DefiYieldMatrixRadarChart {
  constructor(options = {}) {
    this.cx = options.cx || 200;
    this.cy = options.cy || 200;
    this.maxRadius = options.maxRadius || 140;
    this.defaultMetrics = [
      { key: 'yield', label: 'Yield APY', value: 85, max: 100 },
      { key: 'liquidity', label: 'Liquidity Depth', value: 92, max: 100 },
      { key: 'safety', label: 'Contract Safety', value: 95, max: 100 },
      { key: 'il_risk', label: 'IL Resilience', value: 78, max: 100 },
      { key: 'capital_eff', label: 'Capital Efficiency', value: 88, max: 100 }
    ];
  }

  // Trigonometric coordinate conversion from polar (r, theta) to cartesian (x, y)
  polarToCartesian(radius, angleRad, cx = this.cx, cy = this.cy) {
    const r = Math.max(0, Number(radius) || 0);
    const theta = Number(angleRad) || 0;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  }

  // Generates SVG polygon points string from an array of metric objects or numerical values
  generatePolygonPoints(metrics = this.defaultMetrics, maxRadius = this.maxRadius, cx = this.cx, cy = this.cy) {
    const items = Array.isArray(metrics) && metrics.length >= 3 ? metrics : this.defaultMetrics;
    const n = items.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2; // Start from top vertex

    const points = [];
    for (let i = 0; i < n; i++) {
      const item = items[i];
      const val = typeof item === 'object' && item !== null ? Number(item.value) || 0 : Number(item) || 0;
      const max = typeof item === 'object' && item !== null ? Number(item.max) || 100 : 100;

      const norm = Math.min(1, Math.max(0, val / max));
      const radius = norm * maxRadius;
      const angle = startAngle + i * angleStep;

      const pt = this.polarToCartesian(radius, angle, cx, cy);
      points.push(pt);
    }

    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');
    return {
      points,
      pointsString
    };
  }

  // Computes enclosed polygon surface area using Gauss's Area Formula (Shoelace algorithm)
  computeEnclosedArea(pointsInput) {
    let pts = [];
    if (Array.isArray(pointsInput)) {
      pts = pointsInput;
    } else if (typeof pointsInput === 'string') {
      pts = pointsInput.trim().split(/\s+/).map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
      });
    }

    if (pts.length < 3) return 0;

    let sum = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      sum += (pts[i].x * pts[next].y) - (pts[next].x * pts[i].y);
    }

    const area = 0.5 * Math.abs(sum);
    return Number(area.toFixed(2));
  }

  getGridWebPolygons(levels = 5, cx = this.cx, cy = this.cy, maxRadius = this.maxRadius, numAxes = 5) {
    const webs = [];
    const angleStep = (2 * Math.PI) / numAxes;
    const startAngle = -Math.PI / 2;

    for (let lvl = 1; lvl <= levels; lvl++) {
      const r = (lvl / levels) * maxRadius;
      const pts = [];
      for (let i = 0; i < numAxes; i++) {
        const angle = startAngle + i * angleStep;
        pts.push(this.polarToCartesian(r, angle, cx, cy));
      }
      webs.push({
        level: lvl,
        fraction: lvl / levels,
        pointsString: pts.map(p => `${p.x},${p.y}`).join(' ')
      });
    }
    return webs;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const radar = new DefiYieldMatrixRadarChart();
    const polygonEl = document.getElementById('radarPolygon');
    const areaVal = document.getElementById('radarAreaVal');
    const efficiencyVal = document.getElementById('radarEfficiencyVal');

    const inputs = [
      { id: 'metricYield', key: 'yield', label: 'Yield APY' },
      { id: 'metricLiquidity', key: 'liquidity', label: 'Liquidity Depth' },
      { id: 'metricSafety', key: 'safety', label: 'Contract Safety' },
      { id: 'metricIlRisk', key: 'il_risk', label: 'IL Resilience' },
      { id: 'metricCapEff', key: 'capital_eff', label: 'Capital Efficiency' }
    ];

    function update() {
      const metrics = inputs.map(m => {
        const inputEl = document.getElementById(m.id);
        const val = Number(inputEl?.value) || 80;
        const labelEl = document.getElementById(`${m.id}Val`);
        if (labelEl) labelEl.textContent = `${val}%`;
        return { key: m.key, label: m.label, value: val, max: 100 };
      });

      const { points, pointsString } = radar.generatePolygonPoints(metrics);
      if (polygonEl) polygonEl.setAttribute('points', pointsString);

      const area = radar.computeEnclosedArea(points);
      if (areaVal) areaVal.textContent = String(area);

      // Max theoretical pentagon area with radius 140 is ~5 * 0.5 * 140^2 * sin(72 deg) = ~46,602
      const maxArea = 46602;
      const efficiencyPct = Math.min(100, Math.round((area / maxArea) * 100));
      if (efficiencyVal) efficiencyVal.textContent = `${efficiencyPct}%`;
    }

    inputs.forEach(m => {
      document.getElementById(m.id)?.addEventListener('input', update);
    });

    update();
  });
}
