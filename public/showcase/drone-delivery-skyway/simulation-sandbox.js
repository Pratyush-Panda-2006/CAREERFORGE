const MAX_TRIALS = 50000;
const Z95 = 1.959963984540054;

function numberIn(value, low, high, name, integer = false) {
  if (!Number.isFinite(value) || value < low || value > high || (integer && !Number.isInteger(value))) {
    throw new RangeError(name + ' must be ' + (integer ? 'an integer ' : '') + 'between ' + low + ' and ' + high + '.');
  }
  return value;
}

export function summarize(values, deadline) {
  if (!Array.isArray(values) || !values.length || values.length > MAX_TRIALS) throw new RangeError('Provide 1–50,000 outcomes.');
  numberIn(deadline, 1, 1000000000, 'Deadline');
  const sorted = Array.from(values, value => numberIn(value, -1000000000, 1000000000, 'Outcome')).sort((a, b) => a - b);
  let mean = 0, m2 = 0, late = 0;
  values.forEach((value, i) => {
    const delta = value - mean;
    mean += delta / (i + 1);
    m2 += delta * (value - mean);
    if (value > deadline) late++;
  });
  const n = values.length, fraction = late / n, z2 = Z95 * Z95, denominator = 1 + z2 / n;
  const center = (fraction + z2 / (2 * n)) / denominator;
  const half = Z95 * Math.sqrt(fraction * (1 - fraction) / n + z2 / (4 * n * n)) / denominator;
  const quantile = p => {
    const position = (n - 1) * p, index = Math.floor(position);
    return sorted[index] + (sorted[Math.min(index + 1, n - 1)] - sorted[index]) * (position - index);
  };
  const percentiles = Object.freeze(Object.fromEntries([10, 25, 50, 75, 90, 95, 99].map(p => ['p' + p, quantile(p / 100)])));
  const minimum = sorted[0], maximum = sorted[n - 1];
  const low = minimum === maximum ? minimum - .5 : minimum, high = minimum === maximum ? maximum + .5 : maximum;
  const bins = Array.from({ length: 24 }, (_, i) => ({ low: low + (high - low) * i / 24, high: low + (high - low) * (i + 1) / 24, count: 0 }));
  for (const value of values) bins[Math.min(23, Math.floor((value - low) / (high - low) * 24))].count++;
  return Object.freeze({
    count: n, mean, standardDeviation: Math.sqrt(Math.max(0, m2 / n)), minimum, maximum,
    percentiles, late, lateFraction: fraction,
    lateInterval: Object.freeze([Math.max(0, center - half), Math.min(1, center + half)]),
    histogram: Object.freeze({ low, high, bins: Object.freeze(bins.map(bin => Object.freeze(bin))) })
  });
}

export class DroneDeliverySkywayMonteCarloEngine {
  #results = Object.freeze([]);
  #summary = null;
  #generation = 0;
  #parameters;
  constructor({ baseline = 30, deadline = 40, seed = 17 } = {}) {
    this.#parameters = Object.freeze({
      baseline: numberIn(baseline, 5, 180, 'Baseline'),
      deadline: numberIn(deadline, 5, 240, 'Deadline'),
      seed: numberIn(seed, 0, 4294967295, 'Seed', true)
    });
  }
  get parameters() { return this.#parameters; }
  get results() { return this.#results; }
  get summary() { return this.#summary; }
  getStandardDeviation() { return this.#summary?.standardDeviation ?? 0; }
  calculatePercentiles() { return this.#summary?.percentiles ?? null; }
  async runSimulation(trials = 1000, volatility = .2, { signal, onProgress } = {}) {
    numberIn(trials, 100, MAX_TRIALS, 'Trials', true);
    numberIn(volatility, 0, .6, 'Volatility');
    if (onProgress !== undefined && typeof onProgress !== 'function') throw new TypeError('Progress must be a function.');
    const generation = ++this.#generation, values = [], parameters = this.parameters;
    let state = parameters.seed;
    const uniform = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return (state + .5) / 4294967296; };
    const check = () => {
      if (signal?.aborted || generation !== this.#generation) throw new DOMException('Simulation cancelled; previous results are preserved.', 'AbortError');
    };
    check();
    while (values.length < trials) {
      check();
      const end = Math.min(trials, values.length + 250);
      while (values.length < end) {
        const normal = Math.sqrt(-2 * Math.log(uniform())) * Math.cos(2 * Math.PI * uniform());
        values.push(Math.max(1, parameters.baseline * (1 + volatility * normal)));
      }
      onProgress?.(values.length, trials);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    check();
    const result = summarize(values, parameters.deadline);
    this.#results = Object.freeze(values);
    this.#summary = Object.freeze({ ...result, parameters: Object.freeze({ ...parameters, trials, volatility }) });
    return this.#summary;
  }
}

function mount(root) {
  const form = root.querySelector('form'), fields = root.querySelector('fieldset');
  const run = root.querySelector('[data-run]'), cancel = root.querySelector('[data-cancel]');
  const progress = root.querySelector('progress'), status = root.querySelector('[role=status]');
  const svg = root.querySelector('svg.histogram'), counts = root.querySelector('tbody');
  let active = null;
  const minutes = value => value.toFixed(2) + ' min', percent = value => (value * 100).toFixed(1) + '%';
  function updateLabels() {
    for (const id of ['trials', 'volatility', 'baseline', 'deadline']) {
      const value = Number(form.elements[id].value);
      root.querySelector('output[for="' + id + '"]').textContent = id === 'volatility' ? Math.round(value * 100) + '%' : value.toLocaleString() + (id === 'baseline' || id === 'deadline' ? ' min' : '');
    }
  }
  function element(tag, attributes, text) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function render(summary) {
    const histogram = summary.histogram, bins = histogram.bins, maximum = Math.max(...bins.map(bin => bin.count));
    const x = value => 20 + (value - histogram.low) / (histogram.high - histogram.low) * 680;
    svg.replaceChildren();
    svg.append(element('title', {}, 'Simulated delivery-time distribution'));
    svg.append(element('desc', {}, summary.count + ' generated outcomes. The shaded band spans the 10th to 90th percentiles. A table of exact bin counts follows.'));
    for (let i = 0; i <= 4; i++) svg.append(element('line', { x1: 20, x2: 700, y1: 20 + i * 50, y2: 20 + i * 50, class: 'grid-line' }));
    svg.append(element('rect', { x: x(summary.percentiles.p10), y: 10, width: Math.max(0, x(summary.percentiles.p90) - x(summary.percentiles.p10)), height: 215, class: 'percentile-band' }));
    counts.replaceChildren();
    bins.forEach(bin => {
      const height = bin.count / maximum * 190;
      const rect = element('rect', { x: x(bin.low) + 1, y: 220 - height, width: 680 / bins.length - 2, height, class: bin.low >= summary.parameters.deadline ? 'bar late' : 'bar', 'data-count': bin.count });
      rect.append(element('title', {}, minutes(bin.low) + '–' + minutes(bin.high) + ': ' + bin.count + ' outcomes'));
      svg.append(rect);
      const row = document.createElement('tr'), range = document.createElement('td'), count = document.createElement('td');
      range.textContent = minutes(bin.low) + '–' + minutes(bin.high); count.textContent = String(bin.count); row.append(range, count); counts.append(row);
    });
    svg.append(element('line', { x1: x(summary.percentiles.p50), x2: x(summary.percentiles.p50), y1: 10, y2: 225, class: 'median-line' }));
    root.querySelector('[data-scale-low]').textContent = minutes(histogram.low);
    root.querySelector('[data-scale-high]').textContent = minutes(histogram.high);
    const text = {
      mean: minutes(summary.mean), deviation: minutes(summary.standardDeviation),
      band: minutes(summary.percentiles.p10) + ' – ' + minutes(summary.percentiles.p90),
      late: percent(summary.lateFraction), interval: percent(summary.lateInterval[0]) + ' – ' + percent(summary.lateInterval[1])
    };
    for (const [key, value] of Object.entries(text)) root.querySelector('[data-' + key + ']').textContent = value;
    root.querySelector('[data-run-caption]').textContent = summary.count.toLocaleString() + ' outcomes · seed ' + summary.parameters.seed + ' · late means above ' + summary.parameters.deadline + ' min';
    root.querySelector('[data-empty]').hidden = true;
    root.querySelector('[data-plot]').hidden = false;
  }
  form.addEventListener('input', updateLabels);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (active || !form.reportValidity()) return;
    const settings = Object.fromEntries(['trials', 'volatility', 'baseline', 'deadline', 'seed'].map(name => [name, Number(form.elements[name].value)]));
    const controller = new AbortController();
    active = controller; fields.disabled = true; run.disabled = true; cancel.hidden = false; cancel.focus();
    progress.max = settings.trials; progress.value = 0;
    root.querySelector('[data-progress]').textContent = '0 / ' + settings.trials.toLocaleString();
    status.textContent = 'Generating scenarios. Cancel keeps the previous completed run.';
    try {
      const engine = new DroneDeliverySkywayMonteCarloEngine(settings);
      const summary = await engine.runSimulation(settings.trials, settings.volatility, { signal: controller.signal, onProgress(done, total) {
        progress.value = done; root.querySelector('[data-progress]').textContent = done.toLocaleString() + ' / ' + total.toLocaleString();
      } });
      render(summary);
      status.textContent = 'Simulation complete. The distribution and statistics describe this seeded run.';
    } catch (error) {
      status.textContent = error.name === 'AbortError' ? 'Cancelled. Previous completed results are unchanged.' : error.message + ' Adjust the inputs and run again.';
    } finally {
      active = null; fields.disabled = false; run.disabled = false;
      if (document.activeElement === cancel) run.focus();
      cancel.hidden = true;
    }
  });
  cancel.addEventListener('click', () => active?.abort());
  window.addEventListener('pagehide', () => active?.abort());
  updateLabels();
}

if (typeof document !== 'undefined') {
  const root = document.getElementById('drone-simulation');
  if (root) mount(root);
}
