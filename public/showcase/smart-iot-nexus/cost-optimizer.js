const RESOURCES = Object.freeze({
  compute: Object.freeze({ label: 'Compute', unit: 'hours / month', unitCents: 25 }),
  storage: Object.freeze({ label: 'Storage', unit: 'GB / month', unitCents: 3 }),
  bandwidth: Object.freeze({ label: 'Bandwidth', unit: 'GB / month', unitCents: 7 }),
});
const DISCOUNTS = Object.freeze({ base: 0, growth: 1000, scale: 2000 });
const MAX_UNITS = 1_000_000;
const rounded = (numerator, denominator) => Number((numerator + denominator / 2n) / denominator);
const copy = value => structuredClone(value);

/** Local illustrative tariffs, not a live provider quote. All monetary arithmetic is integer based. */
export class SmartIotNexusCostOptimizerEngine {
  #quote = null;

  /** Return the marginal volume discount in basis points: base 0%, growth 10%, scale 20%. */
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
      // Keep fractional cents until the selected billing period's final per-resource rounding.
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
      schemaVersion: 1, tariffId: 'smart-iot-nexus-v1', demo: true, currency: 'USD', billing,
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
  const engine = new SmartIotNexusCostOptimizerEngine();
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = cents => currency.format(cents / 100);
  const total = root.querySelector('#quote-total');
  const error = root.querySelector('#quote-error');
  const download = root.querySelector('#download-quote');
  const chart = root.querySelector('#cost-donut');
  const colors = ['#06b6d4', '#10b981', '#f59e0b'];

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
      root.querySelector('#volume-discount').textContent = `−${money(quote.volumeDiscountCents)}`;
      root.querySelector('#annual-discount').textContent = `−${money(quote.annualDiscountCents)}`;
      let angle = 0;
      const segments = quote.resources.map((line, index) => {
        const start = angle;
        const slice = quote.totalCents === 0 ? 0 : (line.amountCents / quote.totalCents) * 360;
        angle += slice;
        return `${colors[index]} ${start}deg ${angle}deg`;
      });
      chart.style.background = quote.totalCents === 0 ? '#1e293b' : `conic-gradient(${segments.join(', ')})`;
      for (const line of quote.resources) {
        root.querySelector(`#${line.resource}-cost`).textContent = money(line.amountCents);
        root.querySelector(`#${line.resource}-tier`).textContent = line.units === 0 ? 'No usage' : `${line.tier} bracket · ${line.bands.at(-1).discountBasisPoints / 100}% off marginal units`;
      }
      error.hidden = true;
      download.disabled = false;
    } catch (err) {
      error.hidden = false;
      error.textContent = err.message;
      download.disabled = true;
    }
  }

  for (const resource of Object.keys(RESOURCES)) {
    const numberInput = root.querySelector(`#${resource}-units`);
    const sliderInput = root.querySelector(`#${resource}-slider`);
    numberInput.addEventListener('input', () => {
      sliderInput.value = numberInput.value;
      update();
    });
    sliderInput.addEventListener('input', () => {
      numberInput.value = sliderInput.value;
      update();
    });
  }

  root.querySelectorAll('input[name="billing"]').forEach(radio => radio.addEventListener('change', update));
  root.querySelector('#zero-resources')?.addEventListener('click', () => {
    for (const resource of Object.keys(RESOURCES)) {
      root.querySelector(`#${resource}-units`).value = 0;
      root.querySelector(`#${resource}-slider`).value = 0;
    }
    update();
  });

  download?.addEventListener('click', () => {
    const quote = engine.generateQuote();
    const blob = new Blob([JSON.stringify(quote, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-iot-nexus-quote.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  update();
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('[data-cost-optimizer]');
    if (container) mountCostOptimizer(container);
  });
}
