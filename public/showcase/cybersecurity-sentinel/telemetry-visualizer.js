/**
 * Cybersecurity Sentinel - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #641 - Level 3 Core Feature
 *
 * Implements interactive telemetry visualizer rendering continuous SIEM event ingestion curves,
 * anomaly detection rates, threat spikes, and interactive hover tooltips using Canvas and SVG.
 */

export class CybersecuritySentinelTelemetryVisualizer {
  /**
   * @param {object} [options={}]
   * @param {string} [options.timeWindow='24H']
   * @param {Array<object>} [options.data]
   * @param {string} [options.color='#10b981']
   * @param {string} [options.secondaryColor='#ef4444']
   * @param {object} [options.padding]
   */
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#10b981';
    this.secondaryColor = options.secondaryColor || '#ef4444';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 45 };
    this.activePoint = null;
  }

  /**
   * Default sample telemetry points for SIEM ingestion throughput (events/sec)
   * @param {string} windowKey
   * @returns {Array<{ timestamp: number, value: number, anomaliesCount: number }>}
   */
  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const baseThroughput = 850.0;

    return Array.from({ length: count }, (_, i) => {
      const wave = Math.sin(i * 0.44) * 210.0 + Math.cos(i * 0.26) * 115.0;
      const jitter = (Math.random() - 0.5) * 35.0;
      const val = Number(Math.max(300, Math.min(1600, baseThroughput + wave + jitter)).toFixed(1));
      const anomalies = Math.max(0, Math.round((val - 800) / 75));

      return {
        timestamp: Date.now() - (count - 1 - i) * 3600000,
        value: val,
        anomaliesCount: anomalies
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
    if (!points || points.length <= 1) return points || [];
    const normalized = this.normalizeData(points);
    const result = [];
    const step = (normalized.length - 1) / (targetCount - 1);

    for (let i = 0; i < targetCount; i++) {
      const exactIndex = i * step;
      const lower = Math.floor(exactIndex);
      const upper = Math.min(lower + 1, normalized.length - 1);
      const fraction = exactIndex - lower;

      const p0 = normalized[lower];
      const p1 = normalized[upper];

      const val0 = typeof p0 === 'number' ? p0 : p0.value;
      const val1 = typeof p1 === 'number' ? p1 : p1.value;
      const norm0 = p0.normalized !== undefined ? p0.normalized : 0;
      const norm1 = p1.normalized !== undefined ? p1.normalized : 1;

      const interpolatedVal = val0 + (val1 - val0) * fraction;
      const interpolatedNorm = norm0 + (norm1 - norm0) * fraction;

      result.push({
        value: Number(interpolatedVal.toFixed(2)),
        normalized: Number(interpolatedNorm.toFixed(4)),
        fraction: Number((i / (targetCount - 1)).toFixed(4))
      });
    }

    return result;
  }

  /**
   * Finds nearest telemetry point by mouse X coordinate within plot area
   * @param {number} mouseX
   * @param {number} totalWidth
   * @returns {object|null}
   */
  findNearestPoint(mouseX, totalWidth) {
    if (!this.rawSeries || this.rawSeries.length === 0) return null;
    const plotWidth = totalWidth - this.padding.left - this.padding.right;
    const relativeX = Math.max(0, Math.min(plotWidth, mouseX - this.padding.left));
    const ratio = relativeX / plotWidth;

    const index = Math.round(ratio * (this.rawSeries.length - 1));
    const point = this.rawSeries[index];
    const xCoord = this.padding.left + (index / (this.rawSeries.length - 1)) * plotWidth;

    return {
      point,
      index,
      x: xCoord
    };
  }

  /**
   * Generates inline SVG markup for sparkline visualization
   * @param {number} [width=600]
   * @param {number} [height=240]
   * @returns {string}
   */
  renderSVG(width = 600, height = 240) {
    const points = this.normalizeData();
    if (points.length === 0) return '<svg width="100%" height="100%"></svg>';

    const plotW = width - this.padding.left - this.padding.right;
    const plotH = height - this.padding.top - this.padding.bottom;

    const coords = points.map((p, idx) => {
      const x = this.padding.left + (idx / (points.length - 1)) * plotW;
      const y = this.padding.top + (1.0 - p.normalized) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathData = `M ${coords.join(' L ')}`;
    const areaData = `${pathData} L ${this.padding.left + plotW},${this.padding.top + plotH} L ${this.padding.left},${this.padding.top + plotH} Z`;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="telemetry-svg">
        <defs>
          <linearGradient id="sentinelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${this.color}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${this.color}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="${areaData}" fill="url(#sentinelGrad)" />
        <path d="${pathData}" fill="none" stroke="${this.color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `.trim();
  }

  /**
   * Renders the telemetry curve on HTML5 Canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} width
   * @param {number} height
   */
  renderCanvas(ctx, width, height) {
    if (!ctx) return;
    const points = this.normalizeData();
    if (points.length === 0) return;

    ctx.clearRect(0, 0, width, height);

    const plotW = width - this.padding.left - this.padding.right;
    const plotH = height - this.padding.top - this.padding.bottom;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = this.padding.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(this.padding.left + plotW, y);
      ctx.stroke();
    }

    // Coordinates
    const coords = points.map((p, idx) => ({
      x: this.padding.left + (idx / (points.length - 1)) * plotW,
      y: this.padding.top + (1.0 - p.normalized) * plotH
    }));

    // Area fill
    const grad = ctx.createLinearGradient(0, this.padding.top, 0, this.padding.top + plotH);
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, this.padding.top + plotH);
    ctx.lineTo(coords[0].x, this.padding.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke with glow
    ctx.save();
    ctx.shadowColor = 'rgba(16, 185, 129, 0.55)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    coords.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.stroke();
    ctx.restore();

    // Active hover point highlight
    if (this.activePoint) {
      const normY = this.padding.top + (1.0 - this.activePoint.point.normalized) * plotH;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.activePoint.x, this.padding.top);
      ctx.lineTo(this.activePoint.x, this.padding.top + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(this.activePoint.x, normY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// Browser UI bindings
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new CybersecuritySentinelTelemetryVisualizer();
    const canvas = document.getElementById('cybersecurity-sentinel-telemetry-canvas');
    const timeBtns = document.querySelectorAll('.time-window-btn');
    const tooltip = document.getElementById('telemetryTooltip');
    const metricVal = document.getElementById('telemetryMetricVal');
    const minValEl = document.getElementById('telemetryMinVal');
    const maxValEl = document.getElementById('telemetryMaxVal');

    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function updateStats() {
      const bounds = visualizer.getCoordinateBounds();
      if (minValEl) minValEl.textContent = `${bounds.minVal} eps`;
      if (maxValEl) maxValEl.textContent = `${bounds.maxVal} eps`;
      if (metricVal && visualizer.rawSeries.length > 0) {
        const last = visualizer.rawSeries[visualizer.rawSeries.length - 1];
        metricVal.textContent = `${last.value} eps`;
      }
    }

    function draw() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      visualizer.renderCanvas(ctx, rect.width, rect.height);
      updateStats();
    }

    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        visualizer.setTimeWindow(btn.dataset.window);
        visualizer.activePoint = null;
        if (tooltip) tooltip.classList.remove('visible');
        draw();
      });
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const nearest = visualizer.findNearestPoint(mouseX, rect.width);

      if (nearest) {
        const normalized = visualizer.normalizeData();
        visualizer.activePoint = {
          ...nearest,
          point: { ...nearest.point, normalized: normalized[nearest.index].normalized }
        };
        draw();

        if (tooltip) {
          tooltip.style.left = `${nearest.x}px`;
          tooltip.style.top = `${e.clientY - rect.top - 40}px`;
          tooltip.innerHTML = `
            <strong>${nearest.point.value} events/sec</strong>
            <span>${nearest.point.anomaliesCount ? `Anomalies: ${nearest.point.anomaliesCount}` : 'Nominal'}</span>
          `;
          tooltip.classList.add('visible');
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      visualizer.activePoint = null;
      if (tooltip) tooltip.classList.remove('visible');
      draw();
    });

    window.addEventListener('resize', draw);
    draw();
  });
}
