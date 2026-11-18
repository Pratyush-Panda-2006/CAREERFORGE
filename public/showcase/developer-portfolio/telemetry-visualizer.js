/**
 * Developer Portfolio - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #589 - Level 3 Core Feature
 *
 * Implements interactive telemetry visualizer rendering continuous performance curves,
 * historical developer activity trajectories, and interactive hover tooltips using Canvas and SVG.
 */

export class DeveloperPortfolioTelemetryVisualizer {
  /**
   * @param {object} [options={}]
   * @param {string} [options.timeWindow='24H']
   * @param {Array<object>} [options.data]
   * @param {string} [options.color='#38bdf8']
   * @param {string} [options.secondaryColor='#818cf8']
   * @param {object} [options.padding]
   */
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#38bdf8';
    this.secondaryColor = options.secondaryColor || '#818cf8';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 45 };
    this.activePoint = null;
  }

  /**
   * Generates realistic telemetry points for Developer velocity & CI builds
   * @param {string} windowKey
   * @returns {Array<{ timestamp: number, value: number }>}
   */
  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const baseVal = 86.4;

    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.5) * 6.5 + Math.cos(i * 0.2) * 3.2;
      const jitter = (Math.random() - 0.5) * 1.5;
      const val = Number(Math.max(65, Math.min(99.5, baseVal + wave + jitter)).toFixed(2));

      return {
        timestamp: Date.now() - (count - 1 - i) * 3600000,
        value: val
      };
    });
  }

  /**
   * Sets custom time-series data
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    if (!Array.isArray(data)) return [];
    this.rawSeries = [...data];
    return this.rawSeries;
  }

  /**
   * Switches time window ('1H', '24H', '7D')
   * @param {string} windowKey
   * @returns {boolean}
   */
  setTimeWindow(windowKey) {
    if (!['1H', '24H', '7D'].includes(windowKey)) return false;
    this.timeWindow = windowKey;
    this.rawSeries = this._getDefaultData(windowKey);
    return true;
  }

  /**
   * Calculates min/max bounds across data series
   * @param {Array<object|number>} [points=this.rawSeries]
   * @returns {{ minVal: number, maxVal: number, minTime: number, maxTime: number }}
   */
  getCoordinateBounds(points = this.rawSeries) {
    if (!points || points.length === 0) {
      return { minVal: 0, maxVal: 1, minTime: 0, maxTime: 1 };
    }

    let minVal = Infinity;
    let maxVal = -Infinity;
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const p of points) {
      const v = typeof p === 'number' ? p : p.value;
      const t = typeof p === 'number' ? 0 : (p.timestamp || 0);

      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
    }

    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    return { minVal, maxVal, minTime, maxTime };
  }

  /**
   * Normalizes values strictly to [0.0, 1.0] domain
   * @param {Array<object|number>} [points=this.rawSeries]
   * @returns {Array<object>}
   */
  normalizeData(points = this.rawSeries) {
    if (!points || points.length === 0) return [];
    const { minVal, maxVal } = this.getCoordinateBounds(points);
    const range = maxVal - minVal || 1;

    return points.map(p => {
      const rawVal = typeof p === 'number' ? p : p.value;
      const normalized = (rawVal - minVal) / range;
      return {
        ...((typeof p === 'object' && p !== null) ? p : {}),
        normalized: Math.min(1.0, Math.max(0.0, Number(normalized.toFixed(4))))
      };
    });
  }

  /**
   * Interpolates data points for smooth bezier rendering
   * @param {Array<object|number>} [points=this.rawSeries]
   * @param {number} [targetCount=50]
   * @returns {Array<object>}
   */
  interpolate(points = this.rawSeries, targetCount = 50) {
    if (!points || points.length < 2) return points;
    const result = [];
    const step = (points.length - 1) / (targetCount - 1);

    for (let i = 0; i < targetCount; i++) {
      const exactIndex = i * step;
      const lower = Math.floor(exactIndex);
      const upper = Math.min(points.length - 1, Math.ceil(exactIndex));
      const t = exactIndex - lower;

      const p0 = points[lower];
      const p1 = points[upper];

      const v0 = typeof p0 === 'number' ? p0 : p0.value;
      const v1 = typeof p1 === 'number' ? p1 : p1.value;
      const interpolatedVal = v0 + (v1 - v0) * t;

      const t0 = typeof p0 === 'number' ? 0 : (p0.timestamp || 0);
      const t1 = typeof p1 === 'number' ? 0 : (p1.timestamp || 0);
      const interpolatedTime = Math.round(t0 + (t1 - t0) * t);

      result.push({
        timestamp: interpolatedTime,
        value: Number(interpolatedVal.toFixed(2))
      });
    }

    return result;
  }

  /**
   * Identifies closest data point from canvas coordinate
   * @param {number} x
   * @param {number} y
   * @param {number} [width=600]
   * @param {number} [height=260]
   * @returns {object|null}
   */
  getCoordinateAt(x, y, width = 600, height = 260) {
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    if (x < left || x > width - right) return null;

    const data = this.rawSeries;
    if (data.length === 0) return null;

    const fractionX = (x - left) / plotWidth;
    const index = Math.min(data.length - 1, Math.max(0, Math.round(fractionX * (data.length - 1))));
    const point = data[index];

    const { minVal, maxVal } = this.getCoordinateBounds(data);
    const v = typeof point === 'number' ? point : point.value;
    const normalizedY = (v - minVal) / (maxVal - minVal || 1);
    const canvasPointY = top + (1 - normalizedY) * plotHeight;
    const canvasPointX = left + (index / (data.length - 1 || 1)) * plotWidth;

    return {
      index,
      point,
      value: v,
      canvasX: Number(canvasPointX.toFixed(1)),
      canvasY: Number(canvasPointY.toFixed(1))
    };
  }

  /**
   * Generates standalone SVG vector string
   * @param {number} [width=600]
   * @param {number} [height=260]
   * @returns {string}
   */
  exportSVG(width = 600, height = 260) {
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const normalized = this.normalizeData();

    if (normalized.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
    }

    const pathCommands = normalized.map((p, idx) => {
      const x = left + (idx / (normalized.length - 1 || 1)) * plotWidth;
      const y = top + (1 - p.normalized) * plotHeight;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    const areaCommands = `${pathCommands} L ${(left + plotWidth).toFixed(1)} ${(top + plotHeight).toFixed(1)} L ${left.toFixed(1)} ${(top + plotHeight).toFixed(1)} Z`;

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="devGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${this.color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${this.color}" stop-opacity="0.0"/>
    </linearGradient>
  </defs>
  <path d="${areaCommands}" fill="url(#devGrad)"/>
  <path d="${pathCommands}" fill="none" stroke="${this.color}" stroke-width="2.5" stroke-linecap="round"/>
</svg>`.trim();
  }

  /**
   * Renders trajectory onto an HTML5 Canvas element
   * @param {HTMLCanvasElement} canvas
   */
  renderCanvas(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    ctx.clearRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = top + (i / 4) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(width - right, y);
      ctx.stroke();
    }

    const normalized = this.normalizeData();
    if (normalized.length < 2) return;

    const points = normalized.map((p, idx) => ({
      x: left + (idx / (normalized.length - 1)) * plotWidth,
      y: top + (1 - p.normalized) * plotHeight
    }));

    // Area fill gradient
    const gradient = ctx.createLinearGradient(0, top, 0, top + plotHeight);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.lineTo(left + plotWidth, top + plotHeight);
    ctx.lineTo(left, top + plotHeight);
    ctx.closePath();
    ctx.fill();

    // Main curve stroke
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Active hover point indicator
    if (this.activePoint) {
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.activePoint.canvasX, this.activePoint.canvasY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
}

// Browser Interactive UI wiring
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('developer-portfolio-telemetry-canvas');
    if (!canvas) return;

    const visualizer = new DeveloperPortfolioTelemetryVisualizer();
    const tooltip = document.getElementById('devTelemetryTooltip');
    const timeBtns = document.querySelectorAll('.dev-time-btn');

    function redraw() {
      visualizer.renderCanvas(canvas);
    }

    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        visualizer.setTimeWindow(btn.dataset.window);
        redraw();
      });
    });

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      const hit = visualizer.getCoordinateAt(mouseX, mouseY, canvas.width, canvas.height);
      if (hit) {
        visualizer.activePoint = hit;
        redraw();

        if (tooltip) {
          tooltip.style.display = 'block';
          tooltip.style.left = `${e.clientX - rect.left + 12}px`;
          tooltip.style.top = `${e.clientY - rect.top - 30}px`;
          tooltip.innerHTML = `<strong>${hit.value} req/s</strong><span>Velocity Metric</span>`;
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      visualizer.activePoint = null;
      redraw();
      if (tooltip) tooltip.style.display = 'none';
    });

    redraw();
  });
}
