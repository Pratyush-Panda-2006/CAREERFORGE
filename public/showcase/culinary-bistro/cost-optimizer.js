const rules = Object.freeze({
  compute: Object.freeze({ label: 'Compute', max: 1000, rate: 200, boundaries: Object.freeze([100, 500, 1000]) }),
  storage: Object.freeze({ label: 'Storage', max: 10000, rate: 10, boundaries: Object.freeze([500, 2000, 10000]) }),
  bandwidth: Object.freeze({ label: 'Bandwidth', max: 20000, rate: 5, boundaries: Object.freeze([1000, 5000, 20000]) }),
});
const discount = (amount, bps) => Math.floor((amount * bps + 5000) / 10000);
export class CulinaryBistroCostOptimizerEngine {
  #last = null;
  /** Return the graduated tier discount in basis points. */
  applyVolumeDiscount(tier) {
    if (!Number.isInteger(tier) || tier < 0 || tier > 2) throw new RangeError('Choose a volume tier from 0 to 2.');
    return [0, 1000, 2000][tier];
  }
  calculatePricing(inputs) {
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) throw new TypeError('Expected resource quantities and a billing cycle.');
    if (!['monthly', 'annual'].includes(inputs.billing)) throw new RangeError('Choose monthly or annual billing.');
    const resources = {}, lines = [];
    for (const [key, rule] of Object.entries(rules)) {
      const quantity = inputs[key];
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > rule.max) throw new RangeError(`${rule.label} must be a whole quantity from 0 to ${rule.max}.`);
      resources[key] = quantity;
      const segments = []; let previous = 0, remaining = quantity;
      for (let tier = 0; tier < rule.boundaries.length && remaining > 0; tier++) {
        const units = Math.min(remaining, rule.boundaries[tier] - previous), baseCents = units * rule.rate;
        const discountBps = this.applyVolumeDiscount(tier), discountCents = discount(baseCents, discountBps);
        segments.push({ tier, units, baseCents, discountBps, discountCents, netCents: baseCents - discountCents });
        remaining -= units; previous = rule.boundaries[tier];
      }
      lines.push({ resource: key, units: quantity, segments, netCents: segments.reduce((sum, s) => sum + s.netCents, 0) });
    }
    const monthlySubtotalCents = lines.reduce((sum, line) => sum + line.netCents, 0), months = inputs.billing === 'annual' ? 12 : 1;
    const periodSubtotalCents = monthlySubtotalCents * months, annualDiscountBps = months === 12 ? 1500 : 0;
    const annualDiscountCents = discount(periodSubtotalCents, annualDiscountBps);
    const quote = { model: 'demo-graduated-v1', unit: 'fictional demo credits', billing: inputs.billing, months, resources, lines,
      monthlySubtotalCents, periodSubtotalCents, annualDiscountBps, annualDiscountCents, totalCents: periodSubtotalCents - annualDiscountCents,
      disclosure: 'Illustrative rates only. No provider quote, taxes, provisioning or payment.' };
    this.#last = quote;
    return this.generateQuote();
  }
  generateQuote() {
    if (!this.#last) throw new Error('Calculate a valid estimate first.');
    return structuredClone(this.#last);
  }
}

function mount() {
  const root = document.querySelector('[data-cost-sandbox]'); if (!root) return;
  const get = id => root.querySelector(`#${id}`), engine = new CulinaryBistroCostOptimizerEngine();
  let priceAnimation;
  const money = cents => `${(cents / 100).toFixed(2)} credits`;
  function render() {
    try {
      const inputs = Object.fromEntries(Object.keys(rules).map(key => [key, get(key).valueAsNumber]));
      inputs.billing = root.querySelector('input[name="billing"]:checked')?.value;
      const quote = engine.calculatePricing(inputs);
      for (const key of Object.keys(rules)) {
        get(`${key}-quantity`).textContent = String(inputs[key]);
        get(key).style.setProperty('--fill', `${inputs[key] / rules[key].max * 100}%`);
      }
      get('total').textContent = money(quote.totalCents);
      priceAnimation?.cancel();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) priceAnimation = get('total').animate([{ opacity: .6 }, { opacity: 1 }], { duration: 180 });
      get('period').textContent = quote.months === 12 ? 'per demo year' : 'per demo month';
      get('monthly').textContent = money(quote.monthlySubtotalCents);
      get('annual-discount').textContent = money(quote.annualDiscountCents);
      let position = 0; const colors = ['#557864', '#a59169', '#c08d71'];
      const slices = quote.lines.map((line, i) => {
        get(`${line.resource}-cost`).textContent = money(line.netCents);
        get(`${line.resource}-tier`).textContent = line.segments.length ? `Tier ${line.segments.at(-1).tier + 1}` : 'No usage';
        const start = position; position += quote.monthlySubtotalCents ? line.netCents / quote.monthlySubtotalCents * 100 : 0;
        return `${colors[i]} ${start}% ${position}%`;
      });
      get('donut').style.background = quote.monthlySubtotalCents ? `conic-gradient(${slices.join(',')})` : '#deded6';
      get('quote').textContent = JSON.stringify(quote, null, 2);
      get('status').setAttribute('role', 'status'); get('status').textContent = 'Demo estimate updated. Nothing is stored or sent.';
    } catch (error) {
      get('status').setAttribute('role', 'alert'); get('status').textContent = `${error.message} The last valid estimate is retained.`;
    }
  }
  const urls = new Set();
  root.querySelectorAll('input').forEach(input => input.addEventListener('input', render));
  get('reset').addEventListener('click', () => {
    for (const [key, value] of Object.entries({ compute: 120, storage: 600, bandwidth: 1200 })) get(key).value = String(value);
    get('monthly-billing').checked = true; render();
  });
  get('download').addEventListener('click', () => {
    let url = null, anchor = null;
    try {
      url = URL.createObjectURL(new Blob([JSON.stringify(engine.generateQuote(), null, 2)], { type: 'application/json' }));
      urls.add(url); anchor = document.createElement('a'); anchor.href = url; anchor.download = 'culinary-bistro-demo-quote.json';
      document.body.append(anchor); anchor.click();
      const saved = url; setTimeout(() => { if (urls.delete(saved)) URL.revokeObjectURL(saved); }, 1000);
      get('status').setAttribute('role', 'status'); get('status').textContent = 'Demo quote download started. No payment or provisioning.';
    } catch {
      if (url && urls.delete(url)) URL.revokeObjectURL(url);
      get('status').setAttribute('role', 'alert'); get('status').textContent = 'Could not download the quote. Your estimate is retained; try again.';
    } finally { anchor?.remove(); }
  });
  window.addEventListener('pagehide', () => { priceAnimation?.cancel(); for (const url of urls) URL.revokeObjectURL(url); urls.clear(); });
  render();
}
if (typeof document !== 'undefined') mount();
