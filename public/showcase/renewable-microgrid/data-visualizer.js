/**
 * Renewable Microgrid - Multi-Dimensional SVG Radar Chart & Polar Metrics Visualizer
 */

export class RenewableMicrogridRadarChart {
  constructor(options = {}) {
    this.cx = options.cx || 160;
    this.cy = options.cy || 160;
    this.radius = options.radius || 110;
  }

  polarToCartesian(radius, angleRad, cx = this.cx, cy = this.cy) {
    const r = Math.max(0, Number(radius) || 0);
    const a = Number(angleRad) || 0;
    // -PI/2 offset aligns first axis to 12 o'clock
    const x = cx + r * Math.cos(a - Math.PI / 2);
    const y = cy + r * Math.sin(a - Math.PI / 2);
    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  }

  generatePolygonPoints(metrics, maxRadius = this.radius, cx = this.cx, cy = this.cy) {
    if (!Array.isArray(metrics) || metrics.length === 0) return '';
    const n = metrics.length;
    const angleStep = (2 * Math.PI) / n;

    const coords = metrics.map((m, i) => {
      const val = Number(m.value) || 0;
      const max = Number(m.max) || 100;
      const ratio = Math.max(0, Math.min(1, max > 0 ? val / max : 0));
      const ptRadius = ratio * maxRadius;
      return this.polarToCartesian(ptRadius, i * angleStep, cx, cy);
    });

    return coords.map(pt => `${pt.x},${pt.y}`).join(' ');
  }

  computeEnclosedArea(points) {
    if (!points) return 0;
    const pts = typeof points === 'string'
      ? points.trim().split(/\s+/).map(p => {
          const [x, y] = p.split(',').map(Number);
          return { x, y };
        })
      : points;

    if (!Array.isArray(pts) || pts.length < 3) return 0;

    // Shoelace formula for polygon area
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Number((Math.abs(area) / 2).toFixed(2));
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const chart = new RenewableMicrogridRadarChart();

    let metrics = [
      { name: 'Solar', value: 88, max: 100 }, { name: 'Wind', value: 72, max: 100 }, { name: 'Storage', value: 95, max: 100 }, { name: 'Efficiency', value: 91, max: 100 }, { name: 'Resilience', value: 84, max: 100 }, { name: 'PeakLoad', value: 68, max: 100 }
    ];

    const polygon = document.getElementById('radarPolygon');
    const areaVal = document.getElementById('enclosedAreaVal');
    const ringsGroup = document.getElementById('gridRingsGroup');
    const axesGroup = document.getElementById('radialAxesGroup');
    const labelsGroup = document.getElementById('labelsGroup');
    const verticesGroup = document.getElementById('verticesGroup');
    const slidersList = document.getElementById('metricsSlidersList');

    function renderBackground() {
      if (!ringsGroup || !axesGroup || !labelsGroup) return;
      ringsGroup.replaceChildren();
      axesGroup.replaceChildren();
      labelsGroup.replaceChildren();

      const rings = 4;
      for (let i = 1; i <= rings; i++) {
        const r = (chart.radius / rings) * i;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(chart.cx));
        circle.setAttribute('cy', String(chart.cy));
        circle.setAttribute('r', String(r));
        circle.setAttribute('class', 'grid-ring');
        ringsGroup.appendChild(circle);
      }

      const n = metrics.length;
      const angleStep = (2 * Math.PI) / n;
      metrics.forEach((m, i) => {
        const pt = chart.polarToCartesian(chart.radius, i * angleStep);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(chart.cx));
        line.setAttribute('y1', String(chart.cy));
        line.setAttribute('x2', String(pt.x));
        line.setAttribute('y2', String(pt.y));
        line.setAttribute('class', 'radial-axis');
        axesGroup.appendChild(line);

        const labelPt = chart.polarToCartesian(chart.radius + 22, i * angleStep);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(labelPt.x));
        text.setAttribute('y', String(labelPt.y));
        text.setAttribute('class', 'axis-label');
        text.textContent = m.name;
        labelsGroup.appendChild(text);
      });
    }

    function renderData() {
      const pointsStr = chart.generatePolygonPoints(metrics);
      if (polygon) polygon.setAttribute('points', pointsStr);

      const area = chart.computeEnclosedArea(pointsStr);
      if (areaVal) areaVal.textContent = String(area);

      if (verticesGroup) {
        verticesGroup.replaceChildren();
        const n = metrics.length;
        const angleStep = (2 * Math.PI) / n;
        metrics.forEach((m, i) => {
          const ratio = m.value / m.max;
          const pt = chart.polarToCartesian(chart.radius * ratio, i * angleStep);
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(pt.x));
          circle.setAttribute('cy', String(pt.y));
          circle.setAttribute('r', '4');
          circle.setAttribute('class', 'radar-vertex');
          verticesGroup.appendChild(circle);
        });
      }
    }

    function buildSliders() {
      if (!slidersList) return;
      slidersList.replaceChildren();

      metrics.forEach((m, i) => {
        const group = document.createElement('div');
        group.className = 'slider-group';

        const label = document.createElement('label');
        const nameSpan = document.createElement('span');
        nameSpan.textContent = m.name;
        const valSpan = document.createElement('span');
        valSpan.id = `val-${i}`;
        valSpan.textContent = `${m.value} / ${m.max}`;
        label.appendChild(nameSpan);
        label.appendChild(valSpan);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0';
        input.max = String(m.max);
        input.value = String(m.value);
        input.oninput = (e) => {
          metrics[i].value = Number(e.target.value);
          valSpan.textContent = `${metrics[i].value} / ${metrics[i].max}`;
          renderData();
        };

        group.appendChild(label);
        group.appendChild(input);
        slidersList.appendChild(group);
      });
    }

    document.getElementById('resetMetricsBtn')?.addEventListener('click', () => {
      metrics.forEach(m => { m.value = Math.floor(m.max * 0.6); });
      buildSliders();
      renderData();
    });

    document.getElementById('maximizeMetricsBtn')?.addEventListener('click', () => {
      metrics.forEach(m => { m.value = m.max; });
      buildSliders();
      renderData();
    });

    renderBackground();
    buildSliders();
    renderData();
  });
}
