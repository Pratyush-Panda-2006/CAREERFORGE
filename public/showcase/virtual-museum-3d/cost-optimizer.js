const RESOURCES = Object.freeze({
  compute: Object.freeze({ label: 'Compute', unit: 'hours / month', unitCents: 25 }),
  storage: Object.freeze({ label: 'Storage', unit: 'GB / month', unitCents: 3 }),
  bandwidth: Object.freeze({ label: 'Bandwidth', unit: 'GB / month', unitCents: 7 }),
});
const DISCOUNTS = Object.freeze({ base: 0, growth: 1000, scale: 2000 });
const MAX_UNITS = 1_000_000;
const rounded = (numerator, denominator) => Number((numerator + denominator / 2n) / denominator);
const copy = value => structuredClone(value);

/**
 * Virtual Museum 3D - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2128 - NSoC '26 Level 3 Feature
 */
export class VirtualMuseum3dCostOptimizerEngine {
  #quote = null;

  applyVolumeDiscount(tier) {
    if (typeof tier !== 'string' || !Object.hasOwn(DISCOUNTS, tier)) throw new TypeError('Unknown volume tier.');
    return DISCOUNTS[tier];
  }

  calculatePricing(inputs = {}) {
    this.#quote = null;
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || ![Object.prototype, null].includes(Object.getPrototypeOf(inputs))) {
      throw new TypeError('Supply an object with compute, storage, bandwidth and billing values.');
    }
    const fields = Object.getOwnPropertyDescriptors(inputs);
    for (const key of Reflect.ownKeys(fields)) {
      if (typeof key !== 'string' || !['compute', 'storage', 'bandwidth', 'billing'].includes(key) || !('value' in fields[key])) {
        throw new TypeError('Only plain resource values and a billing period are accepted.');
      }
    }
    const billing = Object.hasOwn(fields, 'billing') ? fields.billing.value : 'monthly';
    if (!['monthly', 'annual'].includes(billing)) throw new TypeError('Choose monthly or annual billing.');
    const months = billing === 'annual' ? 12 : 1;
    const resources = Object.entries(RESOURCES).map(([resource, tariff]) => {
      const units = Object.hasOwn(fields, resource) ? fields[resource].value : 0;
      if (!Number.isSafeInteger(units) || units < 0 || units > MAX_UNITS) {
        throw new RangeError(`${tariff.label} must be a whole number from 0 to ${MAX_UNITS.toLocaleString('en-US')}.`);
      }
      const bands = [
        { tier: 'base', units: Math.min(units, 100) },
        { tier: 'growth', units: Math.min(Math.max(units - 100, 0), 900) },
        { tier: 'scale', units: Math.max(units - 1000, 0) },
      ].filter(band => band.units > 0).map(band => ({ ...band, discountBasisPoints: this.applyVolumeDiscount(band.tier) }));

      const monthlyMicroCents = bands.reduce((sum, band) => sum + BigInt(band.units) * BigInt(tariff.unitCents) * BigInt(10_000 - band.discountBasisPoints), 0n);
      const periodMicroCents = monthlyMicroCents * BigInt(months);
      const subtotalCents = units * tariff.unitCents * months;
      const graduatedCents = rounded(periodMicroCents, 10_000n);
      const amountCents = billing === 'annual' ? rounded(periodMicroCents * 9000n, 100_000_000n) : graduatedCents;
      return {
        resource, units, unit: tariff.unit, baseUnitCents: tariff.unitCents, bands,
        tier: bands.at(-1)?.tier ?? 'base',
        subtotalCents, volumeDiscountCents: subtotalCents - graduatedCents,
        annualDiscountCents: graduatedCents - amountCents, amountCents,
      };
    });
    const sum = key => resources.reduce((total, resource) => total + resource[key], 0);
    const totalCents = sum('amountCents');
    this.#quote = {
      schemaVersion: 1, tariffId: 'virtual-museum-3d-demo-v1', demo: true, currency: 'USD', billing,
      rounding: 'Half up, once per resource for the selected billing period; annual pricing uses unrounded monthly usage.',
      resources, subtotalCents: sum('subtotalCents'), volumeDiscountCents: sum('volumeDiscountCents'),
      annualDiscountCents: sum('annualDiscountCents'), totalCents,
      monthlyEquivalentCents: billing === 'annual' ? rounded(BigInt(totalCents), 12n) : totalCents,
    };
    return this.generateQuote();
  }

  generateQuote() {
    if (!this.#quote) throw new Error('Calculate valid resource inputs before exporting a quote.');
    return copy(this.#quote);
  }
}

function mountCostOptimizer(root) {
  const engine = new VirtualMuseum3dCostOptimizerEngine();
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = cents => currency.format(cents / 100);
  const total = root.querySelector('#quote-total');
  const error = root.querySelector('#quote-error');
  const download = root.querySelector('#download-quote');
  const chart = root.querySelector('#cost-donut');
  const colors = ['#fb8b85', '#f6c66d', '#76dae6'];

  function update() {
    const inputs = { billing: root.querySelector('input[name="billing"]:checked').value };
    for (const resource of Object.keys(RESOURCES)) inputs[resource] = root.querySelector(`#${resource}-units`).valueAsNumber;
    try {
      const quote = engine.calculatePricing(inputs);
      total.textContent = money(quote.totalCents);
      total.dataset.cents = String(quote.totalCents);
      root.querySelector('#billing-caption').textContent = quote.billing === 'annual' ? 'Demo annual invoice' : 'Demo monthly invoice';
      root.querySelector('#monthly-equivalent').textContent = quote.billing === 'annual' ? `${money(quote.monthlyEquivalentCents)} monthly equivalent, rounded` : 'Adjust the sliders to compare resource plans.';
      root.querySelector('#subtotal').textContent = money(quote.subtotalCents);
      root.querySelector('#volume-discount').textContent = `âˆ’${money(quote.volumeDiscountCents)}`;
      root.querySelector('#annual-discount').textContent = `âˆ’${money(quote.annualDiscountCents)}`;
      let angle = 0;
      const segments = quote.resources.map((line, index) => {
        const start = angle;
        angle += quote.totalCents ? line.amountCents / quote.totalCents * 360 : 0;
        root.querySelector(`#${line.resource}-cost`).textContent = money(line.amountCents);
        root.querySelector(`#${line.resource}-tier`).textContent = `${line.tier[0].toUpperCase()}${line.tier.slice(1)} volume`;
        return `${colors[index]} ${start}deg ${angle}deg`;
      });
      chart.style.background = quote.totalCents ? `conic-gradient(${segments.join(',')})` : '#35424d';
      root.querySelector('#chart-label').textContent = quote.totalCents ? 'Cost mix' : 'No usage';
      error.hidden = true;
      error.textContent = '';
      download.disabled = false;
    } catch (cause) {
      total.textContent = 'â€”';
      delete total.dataset.cents;
      root.querySelector('#monthly-equivalent').textContent = 'Correct the inputs to calculate a new quote.';
      for (const id of ['subtotal', 'volume-discount', 'annual-discount', 'compute-cost', 'storage-cost', 'bandwidth-cost']) root.querySelector(`#${id}`).textContent = 'â€”';
      chart.style.background = '#35424d';
      root.querySelector('#chart-label').textContent = 'Check inputs';
      error.textContent = cause.message;
      error.hidden = false;
      download.disabled = true;
    }
  }

  for (const resource of Object.keys(RESOURCES)) {
    const number = root.querySelector(`#${resource}-units`);
    const slider = root.querySelector(`#${resource}-slider`);
    number.addEventListener('input', () => {
      const value = number.valueAsNumber;
      if (Number.isSafeInteger(value) && value >= 0 && value <= MAX_UNITS) {
        slider.max = String(Math.max(5000, value));
        slider.value = String(value);
      }
      update();
    });
    slider.addEventListener('input', () => { number.value = slider.value; update(); });
  }
  root.querySelectorAll('input[name="billing"]').forEach(input => input.addEventListener('change', update));
  root.querySelector('#zero-resources').addEventListener('click', () => {
    for (const resource of Object.keys(RESOURCES)) {
      root.querySelector(`#${resource}-units`).value = '0';
      root.querySelector(`#${resource}-slider`).value = '0';
    }
    update();
  });
  download.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(engine.generateQuote(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'virtual-museum-3d-demo-quote.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-cost-optimizer]');
  if (root) mountCostOptimizer(root);
}
