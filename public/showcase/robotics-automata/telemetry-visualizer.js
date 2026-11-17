/**
 * Robotics Automata - Interactive SVG / Canvas Metrics Telemetry & Sparkline Visualizer
 * Issue #689 - NSoC '26 Level 3 Feature
 */

export class RoboticsAutomataTelemetryVisualizer {
  constructor(canvasElement = null, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement && canvasElement.getContext ? canvasElement.getContext('2d') : null;
    this.padding = options.padding || 30;
    this.timeWindow = options.timeWindow || '24H';
    this.dataSeries = options.dataSeries || [];
    this.activePointIndex = null;
  }

  normalizeData(values) {
    if (!values || values.length === 0) {
      return { normalized: [], min: 0, max: 0 };
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    const normalized = values.map((val) => {
      if (range === 0) return 0.5;
      return Number(((val - min) / range).toFixed(4));
    });

    return { normalized, min, max };
  }

  interpolate(valA, valB, t) {
    const clampedT = Math.max(0, Math.min(1, t));
    return valA + (valB - valA) * clampedT;
  }

  smoothPoints(points, windowSize = 3) {
    if (!points || points.length <= 2) return [...(points || [])];
    const smoothed = [];
    const half = Math.floor(windowSize / 2);

    for (let i = 0; i < points.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < points.length) {
          sum += points[j];
          count++;
        }
      }
      smoothed.push(Number((sum / count).toFixed(3)));
    }
    return smoothed;
  }

  mapCoordinates(normalizedVal, index, totalCount, width, height, padding = 30) {
    const effectiveWidth = Math.max(1, width - padding * 2);
    const effectiveHeight = Math.max(1, height - padding * 2);

    const stepX = totalCount > 1 ? effectiveWidth / (totalCount - 1) : 0;
    const x = padding + index * stepX;
    const y = padding + (1 - normalizedVal) * effectiveHeight;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    };
  }

  findNearestPoint(mouseX, totalCount, width, padding = 30) {
    const effectiveWidth = Math.max(1, width - padding * 2);
    if (totalCount <= 1 || effectiveWidth <= 0) return 0;
    const relativeX = Math.max(0, Math.min(effectiveWidth, mouseX - padding));
    const stepX = effectiveWidth / (totalCount - 1);
    const index = Math.round(relativeX / stepX);
    return Math.max(0, Math.min(totalCount - 1, index));
  }

  render(rawValues = null) {
    if (rawValues) this.dataSeries = rawValues;
    if (!this.canvas || !this.ctx) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    if (this.dataSeries.length === 0) return;

    const { normalized } = this.normalizeData(this.dataSeries);
    const smoothed = this.smoothPoints(normalized);

    // Background grid
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.lineWidth = 1;
    for (let yStep = this.padding; yStep <= height - this.padding; yStep += (height - this.padding * 2) / 4) {
      ctx.beginPath();
      ctx.moveTo(this.padding, yStep);
      ctx.lineTo(width - this.padding, yStep);
      ctx.stroke();
    }

    const coords = smoothed.map((val, idx) =>
      this.mapCoordinates(val, idx, smoothed.length, width, height, this.padding)
    );

    // Area fill gradient
    const gradient = ctx.createLinearGradient(0, this.padding, 0, height - this.padding);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.lineTo(coords[coords.length - 1].x, height - this.padding);
    ctx.lineTo(coords[0].x, height - this.padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line stroke
    ctx.beginPath();
    ctx.moveTo(coords[0].x, coords[0].y);
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(coords[i].x, coords[i].y);
    }
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw points
    coords.forEach((c, idx) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, idx === this.activePointIndex ? 6 : 3, 0, Math.PI * 2);
      ctx.fillStyle = idx === this.activePointIndex ? '#ffffff' : '#fbbf24';
      ctx.fill();
      if (idx === this.activePointIndex) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  }
}

// Presets for joint velocity / torque telemetry
export const ROBOTICS_TELEMETRY_PRESETS = {
  '1H': [12.4, 12.8, 13.1, 14.5, 16.2, 15.8, 17.0, 18.5, 17.2, 16.9, 15.5, 14.8],
  '24H': [8.5, 9.2, 11.0, 14.2, 18.0, 22.5, 24.1, 23.8, 20.4, 18.1, 15.0, 12.8, 10.5, 9.8, 9.0],
  '7D': [15.2, 16.8, 18.0, 21.5, 20.2, 22.8, 25.0, 24.5, 22.1, 19.8, 18.5, 17.0]
};

// Browser UI Bindings
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.RoboticsAutomataTelemetryVisualizer = RoboticsAutomataTelemetryVisualizer;

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('robotics-automata-telemetry-canvas');
    if (!canvas) return;

    const tooltip = document.getElementById('telemetry-tooltip');
    const visualizer = new RoboticsAutomataTelemetryVisualizer(canvas, {
      padding: 30,
      timeWindow: '24H',
      dataSeries: ROBOTICS_TELEMETRY_PRESETS['24H']
    });

    visualizer.render();

    const windowButtons = document.querySelectorAll('.time-window-btn');
    windowButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        windowButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const win = btn.getAttribute('data-window');
        visualizer.timeWindow = win;
        visualizer.render(ROBOTICS_TELEMETRY_PRESETS[win] || ROBOTICS_TELEMETRY_PRESETS['24H']);
      });
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const index = visualizer.findNearestPoint(mouseX, visualizer.dataSeries.length, canvas.width, visualizer.padding);
      visualizer.activePointIndex = index;
      visualizer.render();

      if (tooltip) {
        const val = visualizer.dataSeries[index];
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 10}px`;
        tooltip.style.top = `${e.clientY - 30}px`;
        tooltip.textContent = `Torque Sample #${index + 1}: ${val} N·m`;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      visualizer.activePointIndex = null;
      visualizer.render();
      if (tooltip) tooltip.style.display = 'none';
    });
  });
}
