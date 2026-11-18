/**
 * Fintech Vault - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #605 - Level 3 Core Feature
 *
 * Implements interactive telemetry visualizer rendering continuous treasury yield velocity,
 * liquidity depth curves, cryptographic transaction throughput, and interactive hover tooltips using Canvas and SVG.
 */

export class FintechVaultTelemetryVisualizer {
  /**
   * @param {object} [options={}]
   * @param {string} [options.timeWindow='24H']
   * @param {Array<object>} [options.data]
   * @param {string} [options.color='#10b981']
   * @param {string} [options.secondaryColor='#06b6d4']
   * @param {object} [options.padding]
   */
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#10b981';
    this.secondaryColor = options.secondaryColor || '#06b6d4';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 45 };
    this.activePoint = null;
  }

  /**
   * Default sample telemetry points for treasury yield throughput & liquidity velocity
   * @param {string} windowKey
   * @returns {Array<{ timestamp: number, value: number }>}
   */
  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const baseVal = 91.2;

    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.44) * 6.8 + Math.cos(i * 0.26) * 3.4;
      const jitter = (Math.random() - 0.5) * 1.5;
      const val = Number(Math.max(50, Math.min(100, baseVal + wave + jitter)).toFixed(2));

      return {
        timestamp: Date.now() - (count - 1 - i) * 3600000,
        value: val
      };
    });
  }

  /**
   * Sets custom series
   * @param {Array<object>} data
   * @returns {Array<object>}
   */
  setData(data) {
    if (!Array.isArray(data)) return [];
    this.rawSeries = [...data];
    return this.rawSeries;
  }

  /**
   * Sets time window ('1H', '24H', '7D')
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
   * Calculates coordinate bounds across points
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
   * Interpolates data points for smooth line rendering
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
   * Finds nearest telemetry point from canvas hover coordinates
   * @param {number} mouseX
   * @param {number} mouseY
   * @param {number} width
   * @param {number} height
   * @returns {object|null}
   */
  getCoordinateAt(mouseX, mouseY, width, height) {
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    if (mouseX < left || mouseX > width - right || mouseY < top || mouseY > height - bottom) {
      return null;
    }

    const normalized = this.normalizeData();
    if (normalized.length === 0) return null;

    const relativeX = (mouseX - left) / plotWidth;
    const exactIndex = relativeX * (normalized.length - 1);
    const closestIndex = Math.min(normalized.length - 1, Math.max(0, Math.round(exactIndex)));

    const item = normalized[closestIndex];
    const canvasX = left + (closestIndex / (normalized.length - 1 || 1)) * plotWidth;
    const canvasY = top + (1 - item.normalized) * plotHeight;

    return {
      index: closestIndex,
      item,
      canvasX,
      canvasY,
      value: item.value,
      timestamp: item.timestamp
    };
  }

  /**
   * Exports rendered line chart as standalone valid SVG markup
   * @param {number} [width=600]
   * @param {number} [height=240]
   * @returns {string}
   */
  exportSVG(width = 600, height = 240) {
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
    <linearGradient id="fintechGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${this.color}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${this.color}" stop-opacity="0.0"/>
    </linearGradient>
  </defs>
  <path d="${areaCommands}" fill="url(#fintechGrad)"/>
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

    const gradient = ctx.createLinearGradient(0, top, 0, top + plotHeight);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

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

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

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
    const canvas = document.getElementById('fintech-vault-telemetry-canvas');
    if (!canvas) return;

    const visualizer = new FintechVaultTelemetryVisualizer();
    const tooltip = document.getElementById('fintechTelemetryTooltip');
    const timeBtns = document.querySelectorAll('.fintech-time-btn');

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
          tooltip.innerHTML = `<strong>${hit.value}%</strong><span>Vault Treasury Efficiency</span>`;
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
