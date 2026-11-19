const MAX_TRIALS = 50000;
function integer(value, min, max, name) { if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer from ${min} to ${max}.`); return value; }
function probability(value, name) { if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`${name} must be between 0 and 1.`); return value; }
export class SeededScenarioRandom {
  constructor(seed) { this.state = integer(seed, 0, 4294967295, 'Seed'); }
  uniform() { this.state = (Math.imul(1664525, this.state) + 1013904223) >>> 0; return (this.state + .5) / 4294967296; }
  normal() {
    let x, y, radius;
    do { x = 2 * this.uniform() - 1; y = 2 * this.uniform() - 1; radius = x * x + y * y; } while (radius >= 1 || radius === 0);
    return x * Math.sqrt(-2 * Math.log(radius) / radius);
  }
}
export function percentile(sorted, fraction) {
  if (!Array.isArray(sorted) || !sorted.length || sorted.some(v => !Number.isFinite(v)) || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new RangeError('A nonempty finite sample and a percentile from 0 to 1 are required.');
  const values = [...sorted].sort((a, b) => a - b), index = (values.length - 1) * fraction, lower = Math.floor(index);
  return values[lower] + (values[Math.ceil(index)] - values[lower]) * (index - lower);
}
export function probabilityInterval(successes, trials) {
  integer(trials, 1, MAX_TRIALS, 'Scenarios'); integer(successes, 0, trials, 'Exceedances');
  const z2 = 1.959963984540054 ** 2, p = successes / trials, denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator, radius = Math.sqrt(z2 * (p * (1 - p) / trials + z2 / (4 * trials ** 2))) / denominator;
  return Object.freeze({ lower: Math.max(0, center - radius), upper: Math.min(1, center + radius) });
}
export function summarizeLosses(values, maximum, budget) {
  if (!values.length || values.some(v => !Number.isSafeInteger(v) || v < 0 || v > maximum) || !Number.isSafeInteger(maximum) || maximum < 0 || !Number.isSafeInteger(budget) || budget < 0) throw new RangeError('Losses must be bounded integer paise.');
  let mean = 0, m2 = 0, exceeded = 0;
  values.forEach((v, i) => { const delta = v - mean; mean += delta / (i + 1); m2 += delta * (v - mean); if (v > budget) exceeded++; });
  const sorted = [...values].sort((a, b) => a - b), bins = Array.from({ length: maximum === 0 ? 1 : 20 }, (_, i) => ({ lower: maximum * i / 20, upper: maximum * (i + 1) / 20, count: 0 }));
  for (const value of values) bins[maximum === 0 ? 0 : Math.min(19, Math.floor(value / maximum * 20))].count++;
  return Object.freeze({ values: Object.freeze(sorted), mean, standardDeviation: Math.sqrt(Math.max(0, m2 / values.length)), median: percentile(sorted, .5), p95: percentile(sorted, .95), low: percentile(sorted, .025), high: percentile(sorted, .975), exceeded, interval: probabilityInterval(exceeded, values.length), bins: Object.freeze(bins.map(Object.freeze)) });
}
export class CharityMicroloansMonteCarloEngine {
  constructor({ loans = 40, principalPaise = 500000, defaultRate = .08, recoveryRate = .25, budgetPaise = 2500000, seed = 42 } = {}) {
    integer(loans, 1, 500, 'Loans'); integer(principalPaise, 100, 100000000, 'Principal in paise'); probability(defaultRate, 'Default probability'); probability(recoveryRate, 'Recovery'); integer(budgetPaise, 0, loans * principalPaise, 'Comparison amount in paise'); integer(seed, 0, 4294967295, 'Seed');
    this.parameters = Object.freeze({ loans, principalPaise, defaultRate, recoveryRate, budgetPaise, seed }); this.unitLoss = Math.round(principalPaise * (1 - recoveryRate)); this.results = null; this.generation = 0;
  }
  zeroShockReference() {
    const { loans, defaultRate } = this.parameters;
    return Object.freeze({ mean: loans * defaultRate * this.unitLoss, standardDeviation: Math.sqrt(loans * defaultRate * (1 - defaultRate)) * this.unitLoss });
  }
  async runSimulation(trials = 1000, volatility = 0, { signal, onProgress = () => {}, yieldControl = () => Promise.resolve() } = {}) {
    integer(trials, 1000, MAX_TRIALS, 'Scenarios'); if (!Number.isFinite(volatility) || volatility < 0 || volatility > .25) throw new RangeError('Shared shock must be between 0 and 0.25.');
    const generation = ++this.generation, random = new SeededScenarioRandom(this.parameters.seed), values = [], { loans, defaultRate, budgetPaise } = this.parameters;
    const check = () => { if (signal?.aborted || generation !== this.generation) throw new DOMException('Run cancelled; previous results are unchanged.', 'AbortError'); };
    check(); onProgress(0);
    while (values.length < trials) {
      check(); const end = Math.min(trials, values.length + 100);
      while (values.length < end) {
        const p = Math.min(1, Math.max(0, defaultRate + (volatility ? volatility * random.normal() : 0))); let defaults = 0;
        for (let loan = 0; loan < loans; loan++) if (random.uniform() < p) defaults++;
        values.push(defaults * this.unitLoss);
      }
      onProgress(values.length / trials); if (values.length < trials) await yieldControl();
    }
    check(); const summary = summarizeLosses(values, loans * this.unitLoss, budgetPaise); check();
    this.results = Object.freeze({ ...summary, parameters: Object.freeze({ ...this.parameters, trials, volatility }), unitLoss: this.unitLoss, reference: this.zeroShockReference() }); return this.results;
  }
  calculatePercentiles() { return this.results ? { low: this.results.low, median: this.results.median, p95: this.results.p95, high: this.results.high } : null; }
  getStandardDeviation() { return this.results?.standardDeviation ?? null; }
}

if (typeof document !== 'undefined' && document.querySelector('#scenario-form')) {
  const byId = id => document.getElementById(id), form = byId('scenario-form'), parameters = byId('parameters');
  const money = paise => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100), percent = ratio => `${(100 * ratio).toFixed(2)}%`;
  let controller = null;
  function refreshInputs() {
    for (const [id, unit] of [['loan-count', ''], ['default-rate', '%'], ['recovery-rate', '%'], ['shared-shock', ' pp']]) document.querySelector(`output[for="${id}"]`).textContent = byId(id).value + unit;
    byId('loss-budget').max = String(Number(byId('loan-count').value) * Number(byId('principal').value));
    if (!controller) byId('run-status').textContent = 'Assumptions changed. Run scenarios to refresh the last completed result.';
  }
  parameters.addEventListener('input', refreshInputs);
  const svgNode = (tag, attrs, text) => { const el = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v)); if (text !== undefined) el.textContent = text; return el; };
  function render(result) {
    const p = result.parameters, chart = document.querySelector('svg.loss-histogram'), maximum = p.loans * result.unitLoss, tallest = Math.max(...result.bins.map(bin => bin.count));
    chart.replaceChildren(svgNode('title', { id: 'chart-title' }, 'Simulated portfolio loss histogram'), svgNode('desc', { id: 'chart-description' }, `${p.trials} scenarios, ${result.bins.length} frequency bins. The table provides the same counts.`));
    chart.append(svgNode('line', { x1: 58, x2: 752, y1: 248, y2: 248, class: 'axis' }));
    result.bins.forEach((bin, i) => { const width = 690 / result.bins.length, height = bin.count / tallest * 206; chart.append(svgNode('rect', { x: 60 + i * width, y: 248 - height, width: Math.max(1, width - 3), height, class: 'bar', 'data-count': bin.count })); });
    for (const [x, anchor, value] of [[58, 'start', 0], [405, 'middle', maximum / 2], [752, 'end', maximum]]) chart.append(svgNode('text', { x, y: 276, 'text-anchor': anchor, class: anchor === 'middle' ? 'mid-label' : '' }, money(value)));
    chart.append(svgNode('text', { x: 60, y: 25, 'text-anchor': 'start' }, String(tallest)));
    if (maximum > 0 && p.budgetPaise <= maximum) { const x = 60 + p.budgetPaise / maximum * 690; chart.append(svgNode('line', { x1: x, x2: x, y1: 30, y2: 248, class: 'budget-line' })); }
    byId('total-principal').textContent = money(p.loans * p.principalPaise); byId('unit-loss').textContent = money(result.unitLoss); byId('completed').textContent = p.trials.toLocaleString('en-IN');
    byId('run-description').textContent = `Last completed run: ${p.loans} loans × ${money(p.principalPaise)}, ${percent(p.defaultRate)} base default, ${percent(p.recoveryRate)} recovery, ${(p.volatility * 100).toFixed(0)} pp shared shock; seed ${p.seed}.`;
    for (const [id, value] of [['mean', result.mean], ['p95', result.p95], ['deviation', result.standardDeviation]]) byId(id).textContent = money(value);
    byId('exceedance').textContent = `${percent(result.exceeded / p.trials)} above ${money(p.budgetPaise)} (${result.exceeded.toLocaleString('en-IN')} / ${p.trials.toLocaleString('en-IN')}).`;
    byId('confidence').textContent = `95% Wilson sampling interval: ${percent(result.interval.lower)}–${percent(result.interval.upper)}. This interval concerns simulation sampling, not real borrower risk.`;
    byId('outcome-band').textContent = `Middle 95% of simulated losses: ${money(result.low)}–${money(result.high)}. This outcome range is different from the probability interval above.`;
    byId('reference').textContent = `Analytic reference with zero shared shock: mean loss ${money(result.reference.mean)}, standard deviation ${money(result.reference.standardDeviation)}. ${p.volatility ? 'The current run has a shared shock, so these are reference values, not its expected moments.' : 'The current zero-shock model should approach these values as more scenarios are sampled.'}`;
    byId('counts').replaceChildren(...result.bins.map((bin, i) => { const tr = document.createElement('tr'), range = document.createElement('td'), count = document.createElement('td'); range.textContent = `${money(bin.lower)}–${money(bin.upper)}${i === result.bins.length - 1 ? ' (inclusive upper end)' : ' (upper end excluded)'}`; count.textContent = String(bin.count); tr.append(range, count); return tr; }));
  }
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (controller || !form.reportValidity()) return; byId('run-error').textContent = ''; const current = new AbortController(); controller = current; parameters.disabled = true; byId('run').disabled = true; byId('cancel').disabled = false; byId('progress').value = 0;
    try {
      const engine = new CharityMicroloansMonteCarloEngine({ loans: Number(byId('loan-count').value), principalPaise: Number(byId('principal').value) * 100, defaultRate: Number(byId('default-rate').value) / 100, recoveryRate: Number(byId('recovery-rate').value) / 100, budgetPaise: Number(byId('loss-budget').value) * 100, seed: Number(byId('seed').value) });
      const result = await engine.runSimulation(Number(byId('trials').value), Number(byId('shared-shock').value) / 100, { signal: current.signal, yieldControl: () => new Promise(resolve => requestAnimationFrame(resolve)), onProgress: fraction => { byId('progress').value = fraction * 100; byId('run-status').textContent = `Running scenarios: ${Math.round(fraction * 100)}%.`; } });
      render(result); byId('run-status').textContent = `Completed ${result.parameters.trials.toLocaleString('en-IN')} scenarios. Results reflect only the assumptions recorded beside the chart.`;
    } catch (error) {
      byId('run-status').textContent = error.name === 'AbortError' ? 'Run cancelled. Previous completed results are unchanged; you can retry.' : 'Run failed. Previous completed results are unchanged.';
      if (error.name !== 'AbortError') { byId('run-error').textContent = error.message; byId('run-error').focus(); }
    } finally { if (controller === current) { controller = null; parameters.disabled = false; byId('run').disabled = false; byId('cancel').disabled = true; if (!byId('run-error').textContent) byId('run').focus(); } }
  });
  byId('cancel').addEventListener('click', () => controller?.abort());
}
