/**
 * Implement interactive svg / canvas metrics telemetry & sparkline visualizer - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 */

export class PetAdoptionHavenTelemetryVisualizer {
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#38bdf8';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 40 };
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

  renderCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const norm = this.normalizeData();
    if (norm.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    norm.forEach((p, idx) => {
      const x = this.padding.left + (idx / (norm.length - 1)) * (width - this.padding.left - this.padding.right);
      const y = height - this.padding.bottom - (p.normalized * (height - this.padding.top - this.padding.bottom));
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new PetAdoptionHavenTelemetryVisualizer();
    const canvas = document.getElementById('telemetryCanvas');
    const hoverInfo = document.getElementById('hoverInfo');
    const windowBtns = document.querySelectorAll('.btn-time');

    function draw() {
      if (canvas) visualizer.renderCanvas(canvas);
    }

    windowBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        windowBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const win = btn.getAttribute('data-window');
        visualizer.setTimeWindow(win);
        draw();
      });
    });

    canvas?.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = Math.round(e.clientX - rect.left);
      const y = Math.round(e.clientY - rect.top);
      if (hoverInfo) {
        hoverInfo.textContent = `Coordinates: X=${x}px, Y=${y}px [Window: ${visualizer.timeWindow}]`;
      }
    });

    draw();
  });
}
