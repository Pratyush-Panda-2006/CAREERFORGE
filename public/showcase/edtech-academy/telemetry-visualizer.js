/**
 * EdtechAcademyTelemetryVisualizer - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 */

export class EdtechAcademyTelemetryVisualizer {
  constructor(options = {}) {
    this.timeWindow = options.timeWindow || '24H';
    this.rawSeries = options.data || this._getDefaultData(this.timeWindow);
    this.color = options.color || '#3b82f6';
    this.padding = options.padding || { top: 20, right: 20, bottom: 30, left: 40 };
  }

  _getDefaultData(windowKey) {
    const counts = { '1H': 12, '24H': 24, '7D': 14 };
    const count = counts[windowKey] || 24;
    const base = 750;
    return Array.from({ length: count }, (_, i) => {
      const noise = Math.sin(i * 0.6) * 120 + Math.cos(i * 1.4) * 60;
      const val = Math.max(100, Math.round(base + noise + (i * 12)));
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
      const v = typeof p === 'number' ? p : p.value;
      const t = typeof p === 'number' ? 0 : (p.timestamp || 0);
      return {
        timestamp: t,
        value: v,
        normalized: (v - minVal) / range
      };
    });
  }

  interpolate(points = this.rawSeries, count = 20) {
    if (!points || points.length === 0) return [];
    if (points.length === 1 || count <= 1) return [...points];

    const result = [];
    const step = (points.length - 1) / (count - 1);

    for (let i = 0; i < count; i++) {
      const idx = i * step;
      const low = Math.floor(idx);
      const high = Math.min(low + 1, points.length - 1);
      const weight = idx - low;

      const v1 = typeof points[low] === 'number' ? points[low] : points[low].value;
      const v2 = typeof points[high] === 'number' ? points[high] : points[high].value;
      const val = Math.round(v1 + (v2 - v1) * weight);

      const t1 = typeof points[low] === 'number' ? 0 : (points[low].timestamp || 0);
      const t2 = typeof points[high] === 'number' ? 0 : (points[high].timestamp || 0);
      const time = Math.round(t1 + (t2 - t1) * weight);

      result.push({ timestamp: time, value: val });
    }

    return result;
  }

  render(canvas) {
    if (!canvas || !canvas.getContext) return false;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const pad = this.padding;

    ctx.clearRect(0, 0, width, height);

    const norm = this.normalizeData();
    if (norm.length < 2) return false;

    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Draw background grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
    grad.addColorStop(0, 'rgba(59, 130, 246, 0.35)');
    grad.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    ctx.beginPath();
    norm.forEach((p, i) => {
      const x = pad.left + (i / (norm.length - 1)) * plotW;
      const y = pad.top + (1 - p.normalized) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    norm.forEach((p, i) => {
      const x = pad.left + (i / (norm.length - 1)) * plotW;
      const y = pad.top + (1 - p.normalized) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    return true;
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new EdtechAcademyTelemetryVisualizer();
    const canvas = document.getElementById('edtech-academy-telemetry-canvas') || document.getElementById('telemetryCanvas');
    const hoverInfo = document.getElementById('hoverInfo');

    function redraw() {
      if (canvas) visualizer.render(canvas);
    }

    document.querySelectorAll('.btn-time').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-time').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const win = btn.getAttribute('data-window');
        visualizer.setTimeWindow(win);
        redraw();
      });
    });

    if (canvas && hoverInfo) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pad = visualizer.padding;
        const plotW = canvas.width - pad.left - pad.right;
        const relX = Math.max(0, Math.min(x - pad.left, plotW));
        const ratio = relX / plotW;
        const norm = visualizer.normalizeData();
        const idx = Math.min(Math.round(ratio * (norm.length - 1)), norm.length - 1);
        const pt = norm[idx];
        if (pt) {
          hoverInfo.textContent = `Time: ${new Date(pt.timestamp).toLocaleTimeString()} | Learners: ${pt.value.toLocaleString()} active`;
        }
      });

      canvas.addEventListener('mouseleave', () => {
        hoverInfo.textContent = 'Hover over chart to inspect telemetry coordinates';
      });
    }

    redraw();
  });
}
