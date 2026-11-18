/**
 * Supply Chain Logistics - Multi-Dimensional SVG Radar Chart & Polar Metrics Visualizer
 * Issue #1138 - NSoC '26 Level 3 Feature
 */

export class SupplyChainLogisticsRadarVisualizer {
  constructor(options = {}) {
    this.cx = options.cx || 150;
    this.cy = options.cy || 150;
    this.radius = options.radius || 110;
    this.maxVal = options.maxVal || 100;
    this.metrics = options.metrics || [
      { key: 'onTimeDelivery', label: 'On-Time Delivery', value: 94 },
      { key: 'fleetCapacity', label: 'Fleet Capacity Util', value: 82 },
      { key: 'fuelEfficiency', label: 'Fuel / Energy Eco', value: 88 },
      { key: 'coldChainIntegrity', label: 'Cold-Chain Integrity', value: 98 },
      { key: 'orderAccuracy', label: 'Order Picking Accuracy', value: 96 },
      { key: 'warehouseTurnover', label: 'Turnover Velocity', value: 75 }
    ];
  }

  // Pure function converting polar coordinates to Cartesian SVG space
  calculateCoordinates(val, max, angleDegrees, radius, cx = this.cx, cy = this.cy) {
    const validMax = Math.max(0.0001, Number(max) || 100);
    const normalized = Math.min(1, Math.max(0, Number(val || 0) / validMax));
    const currentRadius = normalized * (Number(radius) || this.radius);

    // Standard polar orientation: 0 degrees points straight upward (12 o'clock)
    const angleRad = ((Number(angleDegrees) || 0) - 90) * (Math.PI / 180);

    const x = Number((cx + currentRadius * Math.cos(angleRad)).toFixed(2));
    const y = Number((cy + currentRadius * Math.sin(angleRad)).toFixed(2));

    return { x, y, normalized, angleDegrees, angleRad };
  }

  generatePolygonPoints(data = this.metrics, max = this.maxVal, radius = this.radius, cx = this.cx, cy = this.cy) {
    if (!Array.isArray(data) || data.length === 0) return '';
    const n = data.length;
    const angleStep = 360 / n;

    const points = data.map((item, idx) => {
      const val = typeof item === 'object' ? item.value : item;
      const angle = idx * angleStep;
      const coord = this.calculateCoordinates(val, max, angle, radius, cx, cy);
      return `${coord.x},${coord.y}`;
    });

    return points.join(' ');
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
    const angleStep = 360 / n;

    return data.map((item, idx) => {
      const angle = idx * angleStep;
      const target = this.calculateCoordinates(100, 100, angle, radius, cx, cy);
      const labelPos = this.calculateCoordinates(100, 100, angle, radius + 20, cx, cy);
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
    svg.setAttribute('class', 'sc-radar-svg');

    // Concentric grid polygons
    const gridLevels = this.generateGridLevels(4);
    gridLevels.forEach(grid => {
      const polygon = document.createElementNS(svgNS, 'polygon');
      polygon.setAttribute('points', grid.points);
      polygon.setAttribute('class', 'radar-grid-polygon');
      svg.appendChild(polygon);
    });

    // Axis lines and labels
    const axes = this.generateAxisLines();
    axes.forEach(axis => {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(axis.x1));
      line.setAttribute('y1', String(axis.y1));
      line.setAttribute('x2', String(axis.x2));
      line.setAttribute('y2', String(axis.y2));
      line.setAttribute('class', 'radar-axis-line');
      svg.appendChild(line);

      const text = document.createElementNS(svgNS, 'text');
      text.setAttribute('x', String(axis.labelX));
      text.setAttribute('y', String(axis.labelY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'radar-axis-label');
      text.textContent = axis.label;
      svg.appendChild(text);
    });

    // Data polygon
    const pointsStr = this.generatePolygonPoints();
    const dataPolygon = document.createElementNS(svgNS, 'polygon');
    dataPolygon.setAttribute('points', pointsStr);
    dataPolygon.setAttribute('class', 'radar-data-polygon');
    svg.appendChild(dataPolygon);

    // Vertex circles
    const n = this.metrics.length;
    const angleStep = 360 / n;
    this.metrics.forEach((m, idx) => {
      const coord = this.calculateCoordinates(m.value, this.maxVal, idx * angleStep, this.radius);
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', String(coord.x));
      circle.setAttribute('cy', String(coord.y));
      circle.setAttribute('r', '4');
      circle.setAttribute('class', 'radar-vertex-dot');
      svg.appendChild(circle);
    });

    container.replaceChildren(svg);
    return svg;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new SupplyChainLogisticsRadarVisualizer();
    const chartContainer = document.getElementById('radarSvgContainer');
    const slidersContainer = document.getElementById('metricSlidersContainer');

    function renderUI() {
      visualizer.renderSvg(chartContainer);
    }

    if (slidersContainer) {
      slidersContainer.replaceChildren();
      visualizer.metrics.forEach((m, idx) => {
        const row = document.createElement('div');
        row.className = 'metric-slider-row';
        row.innerHTML = `
          <div class="slider-header">
            <span>${m.label}</span>
            <span class="slider-val" id="val-${idx}">${m.value}</span>
          </div>
          <input type="range" min="0" max="100" value="${m.value}" data-idx="${idx}" class="slider-input">
        `;
        const input = row.querySelector('.slider-input');
        input.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          visualizer.metrics[idx].value = val;
          const valDisplay = document.getElementById(`val-${idx}`);
          if (valDisplay) valDisplay.textContent = String(val);
          renderUI();
        });
        slidersContainer.appendChild(row);
      });
    }

    document.getElementById('btnRandomizeMetrics')?.addEventListener('click', () => {
      visualizer.metrics.forEach((m, idx) => {
        m.value = Math.floor(Math.random() * 40) + 60;
        const valDisplay = document.getElementById(`val-${idx}`);
        if (valDisplay) valDisplay.textContent = String(m.value);
        const input = document.querySelector(`input[data-idx="${idx}"]`);
        if (input) input.value = m.value;
      });
      renderUI();
    });

    renderUI();
  });
}
