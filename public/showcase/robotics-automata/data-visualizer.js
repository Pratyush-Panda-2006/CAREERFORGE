/**
 * Robotics Automata - Multi-Dimensional SVG Radar Chart & Polar Metrics Visualizer
 * Issue #1142 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataRadarChart {
  constructor(options = {}) {
    this.cx = options.cx || 150;
    this.cy = options.cy || 150;
    this.radius = options.radius || 110;
    this.maxVal = options.maxVal || 100;
    this.metrics = options.metrics || [
      { key: 'payload', label: 'Payload Capacity', value: 85 },
      { key: 'precision', label: 'Precision Accuracy', value: 95 },
      { key: 'velocity', label: 'Cycle Velocity', value: 78 },
      { key: 'torque', label: 'Joint Torque', value: 92 },
      { key: 'uptime', label: 'MTBF Uptime', value: 99 },
      { key: 'thermal', label: 'Thermal Efficiency', value: 88 }
    ];
  }

  // Trigonometric coordinate conversion from polar radius & radians to 2D Cartesian
  polarToCartesian(radius, angleRad, cx = this.cx, cy = this.cy) {
    const r = Number(radius) || 0;
    const rad = Number(angleRad) || 0;
    const x = Number((cx + r * Math.cos(rad)).toFixed(2));
    const y = Number((cy + r * Math.sin(rad)).toFixed(2));
    return { x, y };
  }

  generatePolygonPoints(metrics = this.metrics, max = this.maxVal, radius = this.radius, cx = this.cx, cy = this.cy) {
    if (!Array.isArray(metrics) || metrics.length === 0) return '';
    const n = metrics.length;
    const angleStepRad = (2 * Math.PI) / n;

    const points = metrics.map((item, idx) => {
      const rawVal = typeof item === 'object' ? item.value : item;
      const validMax = Math.max(0.0001, Number(max) || 100);
      const normalized = Math.min(1, Math.max(0, Number(rawVal || 0) / validMax));
      const currentRadius = normalized * (Number(radius) || this.radius);

      // 0 rad points to top (12 o'clock)
      const angleRad = idx * angleStepRad - Math.PI / 2;
      const coord = this.polarToCartesian(currentRadius, angleRad, cx, cy);
      return `${coord.x},${coord.y}`;
    });

    return points.join(' ');
  }

  // Calculate polygon enclosed area using Gauss's Shoelace formula
  computeEnclosedArea(pointsInput = this.generatePolygonPoints()) {
    let rawCoords = [];
    if (typeof pointsInput === 'string') {
      if (!pointsInput.trim()) return 0;
      rawCoords = pointsInput.trim().split(/\s+/).map(pair => {
        const [x, y] = pair.split(',').map(Number);
        return { x, y };
      });
    } else if (Array.isArray(pointsInput)) {
      rawCoords = pointsInput;
    }

    const n = rawCoords.length;
    if (n < 3) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const current = rawCoords[i];
      const next = rawCoords[(i + 1) % n];
      sum += (current.x * next.y) - (next.x * current.y);
    }

    return Number((Math.abs(sum) / 2).toFixed(2));
  }

  generateGridLevels(levels = 4, max = this.maxVal, radius = this.radius, cx = this.cx, cy = this.cy) {
    const gridPolygons = [];
    for (let i = 1; i <= levels; i++) {
      const fraction = i / levels;
      const r = radius * fraction;
      const dummyData = this.metrics.map(() => 100);
      const points = this.generatePolygonPoints(dummyData, 100, r, cx, cy);
      gridPolygons.push({
        level: i,
        percentage: Math.round(fraction * 100),
        points
      });
    }
    return gridPolygons;
  }

  generateAxisLines(data = this.metrics, radius = this.radius, cx = this.cx, cy = this.cy) {
    const n = data.length;
    const angleStepRad = (2 * Math.PI) / n;

    return data.map((item, idx) => {
      const angleRad = idx * angleStepRad - Math.PI / 2;
      const target = this.polarToCartesian(radius, angleRad, cx, cy);
      const labelPos = this.polarToCartesian(radius + 20, angleRad, cx, cy);
      return {
        key: item.key || `axis_${idx}`,
        label: item.label || item.key || `Metric ${idx + 1}`,
        x1: cx,
        y1: cy,
        x2: target.x,
        y2: target.y,
        labelX: labelPos.x,
        labelY: labelPos.y,
        value: typeof item === 'object' ? item.value : item
      };
    });
  }

  renderSvg(container) {
    if (!container) return null;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 300 300');
    svg.setAttribute('class', 'robotics-radar-svg');

    // Concentric grid webs
    const gridLevels = this.generateGridLevels(4);
    gridLevels.forEach(grid => {
      const polygon = document.createElementNS(svgNS, 'polygon');
      polygon.setAttribute('points', grid.points);
      polygon.setAttribute('class', 'radar-grid-web');
      svg.appendChild(polygon);
    });

    // Spoke axes
    const axes = this.generateAxisLines();
    axes.forEach(axis => {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(axis.x1));
      line.setAttribute('y1', String(axis.y1));
      line.setAttribute('x2', String(axis.x2));
      line.setAttribute('y2', String(axis.y2));
      line.setAttribute('class', 'radar-axis-spoke');
      svg.appendChild(line);

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(axis.labelX));
      text.setAttribute('y', String(axis.labelY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'radar-axis-text');
      text.textContent = axis.label;
      svg.appendChild(text);
    });

    // Data polygon
    const pointsStr = this.generatePolygonPoints();
    const dataPolygon = document.createElementNS(svgNS, 'polygon');
    dataPolygon.setAttribute('points', pointsStr);
    dataPolygon.setAttribute('class', 'radar-data-fill');
    svg.appendChild(dataPolygon);

    // Vertex points
    const n = this.metrics.length;
    const angleStepRad = (2 * Math.PI) / n;
    this.metrics.forEach((m, idx) => {
      const normalized = Math.min(1, Math.max(0, m.value / this.maxVal));
      const r = normalized * this.radius;
      const angleRad = idx * angleStepRad - Math.PI / 2;
      const coord = this.polarToCartesian(r, angleRad);

      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', String(coord.x));
      circle.setAttribute('cy', String(coord.y));
      circle.setAttribute('r', '4');
      circle.setAttribute('class', 'radar-vertex');
      svg.appendChild(circle);
    });

    container.replaceChildren(svg);
    return svg;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new RoboticsAutomataRadarChart();
    const chartContainer = document.getElementById('radarCanvasContainer');
    const slidersContainer = document.getElementById('metricSlidersContainer');
    const areaDisplay = document.getElementById('enclosedAreaVal');

    function updateView() {
      visualizer.renderSvg(chartContainer);
      if (areaDisplay) {
        areaDisplay.textContent = `${visualizer.computeEnclosedArea().toLocaleString()} px²`;
      }
    }

    if (slidersContainer) {
      slidersContainer.replaceChildren();
      visualizer.metrics.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = 'metric-row';
        row.innerHTML = `
          <div class="row-header">
            <span>${m.label}</span>
            <span class="row-val" id="val-${idx}">${m.value}</span>
          </div>
          <input type="range" min="0" max="100" value="${m.value}" data-idx="${idx}" class="metric-slider">
        `;
        const input = row.querySelector('.metric-slider');
        input.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          visualizer.metrics[idx].value = val;
          const valDisplay = document.getElementById(`val-${idx}`);
          if (valDisplay) valDisplay.textContent = String(val);
          updateView();
        });
        slidersContainer.appendChild(row);
      });
    }

    document.getElementById('btnRandomize')?.addEventListener('click', () => {
      visualizer.metrics.forEach((m, idx) => {
        m.value = Math.floor(Math.random() * 40) + 60;
        const valDisplay = document.getElementById(`val-${idx}`);
        if (valDisplay) valDisplay.textContent = String(m.value);
        const input = document.querySelector(`input[data-idx="${idx}"]`);
        if (input) input.value = m.value;
      });
      updateView();
    });

    updateView();
  });
}
