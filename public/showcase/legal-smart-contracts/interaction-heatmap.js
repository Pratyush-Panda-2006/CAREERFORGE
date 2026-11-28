// Cold to hot. Each stop is [position, red, green, blue].
const STOPS = [[0, 37, 99, 235], [0.35, 34, 211, 238], [0.6, 250, 204, 21], [1, 239, 68, 68]];

export function thermalColor(heat) {
  const t = Math.min(1, Math.max(0, Number(heat) || 0));
  const upper = STOPS.findIndex((stop) => t <= stop[0]);
  if (upper <= 0) return STOPS[0].slice(1);
  const [from, to] = [STOPS[upper - 1], STOPS[upper]];
  const mix = (t - from[0]) / (to[0] - from[0]);
  return [1, 2, 3].map((i) => Math.round(from[i] + (to[i] - from[i]) * mix));
}

export class LegalSmartContractsHeatmapTracker {
  constructor({ limit = 3000, radius = 40 } = {}) {
    this.limit = limit;
    this.radius = radius;
    this.points = [];
  }

  // Coordinates are page coordinates, so points stay in place while scrolling.
  recordPoint(x, y, weight = 1) {
    if (![x, y, weight].every(Number.isFinite) || weight <= 0) return false;
    this.points.push({ x, y, weight: Math.min(weight, 1) });
    if (this.points.length > this.limit) this.points.shift();
    return true;
  }

  // Draws density as transparency first, then swaps each alpha value for a thermal colour.
  renderHeatmap(canvas, { offsetX = 0, offsetY = 0, scale = 1 } = {}) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.clearRect(0, 0, canvas.width, canvas.height);
    const radius = this.radius * scale;
    let drawn = 0;
    for (const point of this.points) {
      const x = (point.x - offsetX) * scale;
      const y = (point.y - offsetY) * scale;
      if (x < -radius || y < -radius || x > canvas.width + radius || y > canvas.height + radius) continue;
      const glow = context.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(0, 0, 0, ${point.weight * 0.5})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context.fillStyle = glow;
      context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      drawn += 1;
    }
    if (!drawn) return 0;
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const palette = Array.from({ length: 256 }, (_, alpha) => thermalColor(alpha / 255));
    const { data } = image;
    for (let i = 0; i < data.length; i += 4) {
      if (!data[i + 3]) continue;
      [data[i], data[i + 1], data[i + 2]] = palette[data[i + 3]];
    }
    context.putImageData(image, 0, 0);
    return drawn;
  }

  resetData() {
    this.points = [];
  }
}

if (typeof document !== 'undefined') {
  const tracker = new LegalSmartContractsHeatmapTracker();
  const $ = (id) => document.getElementById(id);
  const canvas = $('overlay');
  // Half resolution keeps the per-pixel colouring cheap.
  const scale = 0.5;
  let queued = false;
  let lastMove = 0;
  let cursor = { x: 0, y: 0 };

  const render = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      $('readout').textContent = `x ${cursor.x}, y ${cursor.y}, ${tracker.points.length} points`;
      if (canvas.hidden) return;
      const width = Math.round(innerWidth * scale);
      const height = Math.round(innerHeight * scale);
      if (canvas.width !== width || canvas.height !== height) Object.assign(canvas, { width, height });
      tracker.renderHeatmap(canvas, { offsetX: scrollX, offsetY: scrollY, scale });
    });
  };

  // Use of the heatmap's own controls is not counted.
  const record = (event, weight) => {
    cursor = { x: Math.round(event.pageX), y: Math.round(event.pageY) };
    if (!event.target.closest?.('.dock')) tracker.recordPoint(event.pageX, event.pageY, weight);
    render();
  };

  addEventListener('pointermove', (event) => {
    if (event.timeStamp - lastMove < 50) return;
    lastMove = event.timeStamp;
    record(event, 0.2);
  });
  addEventListener('pointerdown', (event) => record(event, 1));
  addEventListener('scroll', render, { passive: true });
  addEventListener('resize', render);

  $('toggle').addEventListener('click', () => {
    canvas.hidden = !canvas.hidden;
    $('toggle').setAttribute('aria-pressed', String(!canvas.hidden));
    $('toggle').textContent = canvas.hidden ? 'Show heatmap' : 'Hide heatmap';
    render();
  });
  $('opacity').addEventListener('input', (event) => { canvas.style.opacity = event.target.value / 100; });
  $('reset').addEventListener('click', () => { tracker.resetData(); render(); });
}
