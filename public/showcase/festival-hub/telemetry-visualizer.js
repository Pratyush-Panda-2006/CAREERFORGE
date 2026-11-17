/**
 * Festival Hub - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #581 - NSoC '26 Level 3 Feature
 */

export class FestivalHubTelemetryVisualizer {
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H'; // '1H', '24H', '7D'
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#ec4899';
    this.secondaryColor = options.secondaryColor || '#8b5cf6';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 40 };
    this.activePoint = null;
  }

  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const base = 450;
    return Array.from({ length: count }, (_, i) => {
      const noise = Math.sin(i * 0.5) * 80 + Math.cos(i * 1.2) * 40;
      const val = Math.max(100, Math.round(base + noise + (i * 8)));
      return {
        timestamp: Date.now() - (count - 1 - i) * 3600000,
        value: val
      };
    });
  }

  setData(data) {
    if (!Array.isArray(data)) return [];
    this.rawSeries = [...data];
    return this.rawSeries;
  }

  setTimeWindow(windowKey) {
    if (!['1H', '24H', '7D'].includes(windowKey)) return false;
    this.timeWindow = windowKey;
    this.rawSeries = this._getDefaultData(windowKey);
    return true;
  }

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

  exportSVG(width = 600, height = 260) {
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const normalized = this.normalizeData();

    if (normalized.length === 0) {
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
    }

    const coords = normalized.map((p, idx) => {
      const cx = left + (idx / (normalized.length - 1 || 1)) * plotWidth;
      const cy = top + (1 - p.normalized) * plotHeight;
      return `${cx.toFixed(1)},${cy.toFixed(1)}`;
    });

    const pathData = `M ${coords.join(' L ')}`;
    const areaData = `${pathData} L ${width - right},${top + plotHeight} L ${left},${top + plotHeight} Z`;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="festivalLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${this.color}" />
            <stop offset="100%" stop-color="${this.secondaryColor}" />
          </linearGradient>
          <linearGradient id="festivalAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${this.color}" stop-opacity="0.35" />
            <stop offset="100%" stop-color="${this.secondaryColor}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path d="${areaData}" fill="url(#festivalAreaGrad)" />
        <path d="${pathData}" fill="none" stroke="url(#festivalLineGrad)" stroke-width="3" stroke-linecap="round" />
      </svg>
    `.trim();
  }

  renderCanvas(canvas, width = 600, height = 260) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    const { left, right, top, bottom } = this.padding;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const normalized = this.normalizeData();

    if (normalized.length < 2) return;

    // Draw horizontal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = top + (i / 4) * plotHeight;
      ctx.beginPath();
      ctx.moveTo(left, gy);
      ctx.lineTo(width - right, gy);
      ctx.stroke();
    }

    // Build path coordinates
    const points = normalized.map((p, idx) => ({
      x: left + (idx / (normalized.length - 1)) * plotWidth,
      y: top + (1 - p.normalized) * plotHeight,
      raw: p
    }));

    // Fill area gradient
    const areaGrad = ctx.createLinearGradient(0, top, 0, top + plotHeight);
    areaGrad.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
    areaGrad.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.lineTo(width - right, top + plotHeight);
    ctx.lineTo(left, top + plotHeight);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Stroke line gradient
    const lineGrad = ctx.createLinearGradient(left, 0, width - right, 0);
    lineGrad.addColorStop(0, this.color);
    lineGrad.addColorStop(1, this.secondaryColor);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const xc = (points[i].x + points[i - 1].x) / 2;
      const yc = (points[i].y + points[i - 1].y) / 2;
      ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Render active hover dot
    if (this.activePoint) {
      const ap = this.activePoint;
      ctx.beginPath();
      ctx.arc(ap.canvasX, ap.canvasY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  initUI(container = document) {
    if (typeof window === 'undefined' || !container) return;
    const canvas = container.querySelector('#festival-hub-telemetry-canvas');
    const tooltip = container.querySelector('#festivalTelemetryTooltip');
    const timeBtns = container.querySelectorAll('.festival-time-btn');

    if (!canvas) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = canvas.width || 600;
      const h = canvas.height || 260;
      this.renderCanvas(canvas, w, h);
    };

    timeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const win = btn.getAttribute('data-window');
        this.setTimeWindow(win);
        render();
      });
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const hit = this.getCoordinateAt(x, y, canvas.width, canvas.height);
      this.activePoint = hit;
      render();

      if (tooltip && hit) {
        tooltip.style.display = 'block';
        tooltip.style.left = `${(hit.canvasX / scaleX) + 10}px`;
        tooltip.style.top = `${(hit.canvasY / scaleY) - 30}px`;
        tooltip.innerHTML = `<strong>${hit.value}</strong> attendees / SPL`;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.activePoint = null;
      if (tooltip) tooltip.style.display = 'none';
      render();
    });

    render();
  }
}

if (typeof window !== 'undefined') {
  window.FestivalHubTelemetryVisualizer = FestivalHubTelemetryVisualizer;
}
if (typeof globalThis !== 'undefined') {
  globalThis.FestivalHubTelemetryVisualizer = FestivalHubTelemetryVisualizer;
}

export default FestivalHubTelemetryVisualizer;
