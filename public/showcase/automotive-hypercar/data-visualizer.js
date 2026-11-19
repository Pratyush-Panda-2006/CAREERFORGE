function finiteNumber(value, name, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be a finite number from ${min} to ${max}.`);
  }
  return value;
}

function metricValues(metrics) {
  if (!Array.isArray(metrics) || metrics.length < 3 || metrics.length > 12) {
    throw new RangeError('Provide 3 to 12 metric scores.');
  }
  return Array.from({ length: metrics.length }, (_, index) => {
    const item = Object.getOwnPropertyDescriptor(metrics, String(index));
    if (!item || !Object.hasOwn(item, 'value')) throw new TypeError('Metrics must be a dense array of numeric values.');
    return finiteNumber(item.value, 'Metric score', 0, 100);
  });
}

function coordinateText(value) {
  return String(Number((Math.abs(value) < 0.0000005 ? 0 : value).toFixed(6)));
}

/** Equal-angle normalized radar geometry. No DOM or telemetry dependency. */
export class AutomotiveHypercarRadarChart {
  #radius;
  #centerX;
  #centerY;
  #metrics = [];

  constructor({ radius = 150, centerX = 220, centerY = 220 } = {}) {
    this.#radius = finiteNumber(radius, 'Chart radius', 1, 10000);
    this.#centerX = finiteNumber(centerX, 'Center X', -1000000, 1000000);
    this.#centerY = finiteNumber(centerY, 'Center Y', -1000000, 1000000);
  }

  polarToCartesian(radius, angleRad) {
    finiteNumber(radius, 'Point radius', 0, 10000);
    finiteNumber(angleRad, 'Angle', -1000000, 1000000);
    return { x: this.#centerX + radius * Math.cos(angleRad), y: this.#centerY + radius * Math.sin(angleRad) };
  }

  getVertices(metrics = this.#metrics) {
    const values = metricValues(metrics);
    return values.map((value, index) => this.polarToCartesian(this.#radius * value / 100, -Math.PI / 2 + index * 2 * Math.PI / values.length));
  }

  generatePolygonPoints(metrics) {
    const values = metricValues(metrics);
    const points = this.getVertices(values).map(({ x, y }) => `${coordinateText(x)},${coordinateText(y)}`).join(' ');
    this.#metrics = values;
    return points;
  }

  computeEnclosedArea(metrics) {
    if (metrics === undefined && this.#metrics.length === 0) return 0;
    const vertices = this.getVertices(metrics === undefined ? this.#metrics : metrics);
    // Center-relative products avoid catastrophic cancellation on translated charts.
    let twiceArea = 0;
    for (let index = 0; index < vertices.length; index++) {
      const a = vertices[index];
      const b = vertices[(index + 1) % vertices.length];
      twiceArea += (a.x - this.#centerX) * (b.y - this.#centerY) - (b.x - this.#centerX) * (a.y - this.#centerY);
    }
    return Math.abs(twiceArea) / 2;
  }

  getMetrics() { return [...this.#metrics]; }
}

function mountVisualizer() {
  const svg = document.querySelector('#radar');
  if (!svg) return;
  const labels = ['Pace', 'Launch', 'Grip', 'Braking', 'Efficiency', 'Range'];
  const defaults = [80, 83, 72, 77, 64, 68];
  const datasets = [
    { id: 'custom', label: 'Custom setup', values: [...defaults] },
    { id: 'circuit', label: 'Circuit study', values: [92, 95, 88, 90, 48, 60] },
    { id: 'touring', label: 'Touring study', values: [75, 76, 82, 85, 88, 91] },
  ];
  const engine = new AutomotiveHypercarRadarChart();
  const $ = (selector) => document.querySelector(selector);
  const makeSvg = (tag, attributes) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
    return node;
  };
  const detail = $('#vertex-detail');
  const instruction = detail.textContent;
  const format = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });
  for (const score of [20, 40, 60, 80, 100]) {
    $('#grid').append(makeSvg('polygon', { points: engine.generatePolygonPoints(labels.map(() => score)), class: 'grid-ring' }));
    const text = makeSvg('text', { x: 225, y: 220 - 150 * score / 100 - 4, class: 'grid-value' });
    text.textContent = String(score); $('#grid').append(text);
  }
  labels.forEach((label, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const end = engine.polarToCartesian(150, angle);
    $('#grid').append(makeSvg('line', { x1: 220, y1: 220, x2: end.x, y2: end.y, class: 'grid-axis' }));
    const point = engine.polarToCartesian(184, angle);
    const text = makeSvg('text', { x: point.x, y: point.y + 4, 'text-anchor': 'middle', class: 'axis-label' });
    text.textContent = label; $('#axis-labels').append(text);
    const wrap = document.createElement('div'); wrap.className = 'metric';
    const name = document.createElement('label'); name.htmlFor = `metric-${index}`; name.textContent = label;
    const output = document.createElement('output'); output.id = `value-${index}`; output.htmlFor = `metric-${index}`; output.textContent = String(defaults[index]); name.append(output);
    const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100'; input.step = '1'; input.value = String(defaults[index]); input.id = `metric-${index}`;
    input.addEventListener('input', () => {
      const value = Number(input.value);
      datasets[0].values[index] = value; output.textContent = String(value); render();
    });
    wrap.append(name, input); $('#metric-controls').append(wrap);
  });

  function render() {
    try {
      const visible = datasets.filter((item) => $(`input[name="dataset"][value="${item.id}"]`).checked);
      $('#overlays').replaceChildren(); $('#score-rows').replaceChildren(); detail.textContent = instruction;
      $('#empty-state').hidden = visible.length > 0;
      const summaries = [];
      visible.forEach((item) => {
        const group = makeSvg('g', { class: item.id, 'data-dataset': item.id });
        group.append(makeSvg('polygon', { points: engine.generatePolygonPoints(item.values), class: `dataset dataset-${item.id}` }));
        engine.getVertices(item.values).forEach(({ x, y }, index) => {
          const label = `${item.label} · ${labels[index]}: ${item.values[index]} / 100`;
          const point = makeSvg('circle', { cx: x, cy: y, r: 4, class: 'vertex', tabindex: 0, role: 'img', 'aria-label': label });
          const title = makeSvg('title', {}); title.textContent = label; point.append(title);
          point.addEventListener('pointerenter', () => { detail.textContent = label; });
          point.addEventListener('focus', () => { detail.textContent = label; });
          point.addEventListener('pointerleave', () => { if (document.activeElement !== point) detail.textContent = instruction; });
          point.addEventListener('blur', () => { detail.textContent = instruction; });
          group.append(point);
        });
        $('#overlays').append(group);
        const area = engine.computeEnclosedArea();
        const maximum = engine.computeEnclosedArea(labels.map(() => 100));
        const percent = 100 * area / maximum;
        const row = document.createElement('tr');
        const name = document.createElement('th'); name.scope = 'row'; name.textContent = item.label; row.append(name);
        [...item.values, `${format(percent)}%`].forEach((value) => { const cell = document.createElement('td'); cell.textContent = String(value); row.append(cell); });
        $('#score-rows').append(row);
        summaries.push(`${item.label}: ${format(area)} SVG units² (${format(percent)}% of full-grid area)`);
      });
      $('#area-summary').textContent = summaries.length ? summaries.join(' · ') : 'Select at least one dataset to calculate an area.';
      $('#input-error').textContent = '';
    } catch (error) {
      $('#input-error').textContent = error.message;
    }
  }
  document.querySelectorAll('input[name="dataset"]').forEach((input) => input.addEventListener('change', render));
  $('#reset').addEventListener('click', () => {
    datasets[0].values = [...defaults];
    defaults.forEach((value, index) => { $(`#metric-${index}`).value = String(value); $(`#value-${index}`).textContent = String(value); });
    render();
  });
  render();
}

if (typeof document !== 'undefined') mountVisualizer();
