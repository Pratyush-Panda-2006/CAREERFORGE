const finite = (value, name) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} must be finite.`); return value; };
const format = (value) => Math.abs(value) < 0.00005 ? '0' : String(Number(value.toFixed(4)));

export class NonprofitImpactRadarChart {
  #metrics = [];
  constructor({ radius = 160, centerX = 240, centerY = 240, maxValue = 100 } = {}) {
    for (const [name, value] of Object.entries({ radius, centerX, centerY, maxValue })) finite(value, name);
    if (radius < 0 || radius > 10000 || Math.abs(centerX) > 10000 || Math.abs(centerY) > 10000 || maxValue <= 0 || maxValue > 1_000_000) throw new RangeError('Chart dimensions or scale are outside the supported range.');
    this.radius = radius; this.centerX = centerX; this.centerY = centerY; this.maxValue = maxValue;
    Object.freeze(this);
  }
  polarToCartesian(radius, angleRad) {
    finite(radius, 'Radius'); finite(angleRad, 'Angle');
    if (radius < 0) throw new RangeError('Radius cannot be negative.');
    const x = this.centerX + radius * Math.cos(angleRad), y = this.centerY + radius * Math.sin(angleRad);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new RangeError('Coordinates overflowed.');
    return { x, y };
  }
  vertices(metrics) {
    if (!Array.isArray(metrics) || (metrics.length !== 0 && (metrics.length < 3 || metrics.length > 12))) throw new RangeError('Use 3–12 metric values, or an empty dataset.');
    return Array.from(metrics, (value, index) => {
      finite(value, 'Metric');
      if (value < 0 || value > this.maxValue) throw new RangeError(`Metrics must be between 0 and ${this.maxValue}.`);
      return this.polarToCartesian(value / this.maxValue * this.radius, -Math.PI / 2 + index * 2 * Math.PI / metrics.length);
    });
  }
  generatePolygonPoints(metrics) {
    const vertices = this.vertices(metrics);
    this.#metrics = [...metrics];
    return vertices.map(point => `${format(point.x)},${format(point.y)}`).join(' ');
  }
  computeEnclosedArea(metrics = this.#metrics) {
    const vertices = this.vertices(metrics);
    if (!vertices.length) return 0;
    // Translate to the center before the shoelace sum to avoid cancellation.
    const cross = vertices.reduce((sum, point, index) => {
      const next = vertices[(index + 1) % vertices.length];
      return sum + (point.x - this.centerX) * (next.y - this.centerY) - (next.x - this.centerX) * (point.y - this.centerY);
    }, 0);
    return Math.abs(cross) / 2;
  }
}

const METRICS = ['Tree establishment', 'Native diversity', 'Ocean recovery', 'Local participation', 'Monitoring coverage', 'Funding continuity'];
const PROFILES = [{ name: 'Current program', color: '#2d7259', values: [64, 58, 72, 44, 85, 60] }, { name: 'Proposed program', color: '#b75931', values: [80, 65, 76, 78, 90, 73] }];
const defaults = () => PROFILES.map(profile => ({ ...profile, values: [...profile.values], visible: true }));
function mountRadar() {
  const root = document.querySelector('[data-conservation-radar]'); if (!root) return;
  const get = (id) => root.querySelector(`#${id}`), ns = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}) => { const node = document.createElementNS(ns, tag); for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); return node; };
  const chart = new NonprofitImpactRadarChart(); let profiles = defaults(), editing = 0;
  const fullArea = chart.computeEnclosedArea(Array(6).fill(100));
  const clearTip = () => { get('vertex-tooltip').textContent = 'Focus or point to a vertex to inspect its metric.'; };
  for (const percent of [25, 50, 75, 100]) {
    get('grid').append(svg('polygon', { points: chart.generatePolygonPoints(Array(6).fill(percent)), class: 'grid-web' }));
    const text = svg('text', { x: 247, y: 240 - 160 * percent / 100 + 12, class: 'scale-label' }); text.textContent = `${percent}%`; get('grid').append(text);
  }
  for (let index = 0; index < 6; index++) {
    const angle = -Math.PI / 2 + index * Math.PI / 3, end = chart.polarToCartesian(160, angle), label = chart.polarToCartesian(188, angle);
    get('grid').append(svg('line', { x1: 240, y1: 240, x2: end.x, y2: end.y, class: 'axis-line' }));
    const text = svg('text', { x: label.x, y: label.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle', class: 'axis-label' }); text.textContent = `S${index + 1}`; get('grid').append(text);
  }
  function renderChart() {
    clearTip(); const groups = [];
    profiles.forEach((profile, profileIndex) => {
      const area = chart.computeEnclosedArea(profile.values);
      get(`area-${profileIndex}`).textContent = area.toFixed(2);
      get(`coverage-${profileIndex}`).textContent = `${(area / fullArea * 100).toFixed(1)}%`;
      get(`visibility-${profileIndex}`).textContent = profile.visible ? 'Visible' : 'Hidden';
      if (!profile.visible) return;
      const group = svg('g', { 'data-profile': profileIndex, style: `color:${profile.color}` });
      group.append(svg('polygon', { points: chart.generatePolygonPoints(profile.values), class: 'profile-polygon', 'data-polygon': profileIndex }));
      chart.vertices(profile.values).forEach((point, index) => {
        const description = `${profile.name}: S${index + 1} ${METRICS[index]}, ${profile.values[index]}%`;
        const vertex = svg('g', { tabindex: 0, role: 'img', 'aria-label': description, 'aria-describedby': 'vertex-tooltip', 'data-vertex': `${profileIndex}-${index}`, class: 'vertex' });
        vertex.append(svg('circle', { cx: point.x, cy: point.y, r: 12, class: 'vertex-hit' }), svg('circle', { cx: point.x, cy: point.y, r: 4, class: 'vertex-dot' }));
        vertex.addEventListener('mouseenter', () => { get('vertex-tooltip').textContent = description; });
        vertex.addEventListener('focus', () => { get('vertex-tooltip').textContent = description; });
        vertex.addEventListener('mouseleave', () => { if (document.activeElement !== vertex) clearTip(); });
        vertex.addEventListener('blur', clearTip); group.append(vertex);
      });
      groups.push(group);
    });
    get('profiles').replaceChildren(...groups);
    get('empty-state').hidden = groups.length > 0;
  }
  const controls = METRICS.map((name, index) => {
    const row = document.createElement('div'), label = document.createElement('label'), range = document.createElement('input'), value = document.createElement('output');
    row.className = 'metric'; range.id = `metric-${index}`; range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '1';
    label.htmlFor = range.id; label.textContent = `S${index + 1} ${name}`; value.htmlFor = range.id;
    range.addEventListener('input', () => { profiles[editing].values[index] = range.valueAsNumber; value.textContent = `${range.value}%`; renderChart(); });
    row.append(label, value, range); get('metric-controls').append(row); return { range, value };
  });
  function syncControls() { controls.forEach(({ range, value }, index) => { range.value = String(profiles[editing].values[index]); value.textContent = `${range.value}%`; }); }
  get('editing-profile').addEventListener('change', event => { editing = Number(event.target.value); syncControls(); });
  profiles.forEach((_, index) => get(`show-${index}`).addEventListener('change', event => { profiles[index].visible = event.target.checked; renderChart(); }));
  get('reset').addEventListener('click', () => { profiles = defaults(); editing = 0; get('editing-profile').value = '0'; profiles.forEach((_, index) => { get(`show-${index}`).checked = true; }); syncControls(); renderChart(); get('status').textContent = 'Illustrative profiles reset.'; });
  syncControls(); renderChart();
}
if (typeof document !== 'undefined') mountRadar();
