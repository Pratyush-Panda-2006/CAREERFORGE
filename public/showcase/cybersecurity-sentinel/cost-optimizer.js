/**
 * Cybersecurity Sentinel - Tiered Resource Allocation & Dynamic Cost Optimizer Engine
 * Models consumption pricing, volume discount thresholds, and expense projections.
 */

export class CybersecuritySentinelCostOptimizerEngine {
  constructor(options = {}) {
    this.currency = options.currency || 'USD';
    this.billingCycle = options.billingCycle || 'monthly';
    this.inputs = { compute: 0, storage: 0, bandwidth: 0 };
    this.rates = { compute: 0.04, storage: 0.023, bandwidth: 0.09 };
    this.tiers = [
      { label: 'Starter', threshold: 0, discount: 0 },
      { label: 'Growth', threshold: 500, discount: 5 },
      { label: 'Scale', threshold: 1500, discount: 10 },
      { label: 'Enterprise', threshold: 3000, discount: 20 },
      { label: 'Premium', threshold: 5000, discount: 30 }
    ];
    this.annualDiscount = 0.17;
  }

  applyVolumeDiscount(tier) {
    if (!tier) return 0;
    return Math.min(100, Math.max(0, Number(tier.discount) || 0));
  }

  getTierForSpend(spend) {
    let tier = this.tiers[0];
    for (const t of this.tiers) {
      if (spend >= t.threshold) tier = t;
    }
    return tier;
  }

  calculatePricing(inputs = this.inputs) {
    const compute = Number(inputs.compute) || 0;
    const storage = Number(inputs.storage) || 0;
    const bandwidth = Number(inputs.bandwidth) || 0;
    const lineItems = [
      { resource: 'compute', units: compute, rate: this.rates.compute, subtotal: compute * this.rates.compute },
      { resource: 'storage', units: storage, rate: this.rates.storage, subtotal: storage * this.rates.storage },
      { resource: 'bandwidth', units: bandwidth, rate: this.rates.bandwidth, subtotal: bandwidth * this.rates.bandwidth }
    ];
    const subtotal = Number(lineItems.reduce((s, i) => s + i.subtotal, 0).toFixed(2));
    const tier = this.getTierForSpend(subtotal);
    const discountPct = this.applyVolumeDiscount(tier);
    const discountAmount = Number((subtotal * discountPct / 100).toFixed(2));
    const discounted = Number((subtotal - discountAmount).toFixed(2));
    const annualTotal = Number((discounted * 12 * (1 - this.annualDiscount)).toFixed(2));
    return {
      billingCycle: this.billingCycle,
      currency: this.currency,
      lineItems,
      subtotal,
      tier: tier.label,
      tierThreshold: tier.threshold,
      discountPercent: discountPct,
      discountAmount,
      discountedTotal: discounted,
      monthlyTotal: discounted,
      annualTotal,
      projectedTotal: this.billingCycle === 'annual' ? annualTotal : discounted,
      savings: Number((subtotal * 12 - annualTotal).toFixed(2)),
      generatedAt: Date.now()
    };
  }

  generateQuote() {
    const pricing = this.calculatePricing();
    return {
      quoteId: `qts_${Date.now()}`,
      billingCycle: this.billingCycle,
      currency: this.currency,
      inputs: { ...this.inputs },
      ...pricing,
      validUntil: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new CybersecuritySentinelCostOptimizerEngine();
    const els = {
      compute: document.getElementById('inpCompute'),
      storage: document.getElementById('inpStorage'),
      bandwidth: document.getElementById('inpBandwidth'),
      cycle: document.getElementById('btnCycle'),
      valCompute: document.getElementById('valCompute'),
      valStorage: document.getElementById('valStorage'),
      valBandwidth: document.getElementById('valBandwidth'),
      valCycle: document.getElementById('valCycle'),
      ticker: document.getElementById('ticker'),
      donutProgress: document.getElementById('donutProgress'),
      tierBadge: document.getElementById('tierBadge')
    };

    function update() {
      engine.inputs = {
        compute: Number(els.compute.value),
        storage: Number(els.storage.value),
        bandwidth: Number(els.bandwidth.value)
      };
      els.valCompute.textContent = engine.inputs.compute;
      els.valStorage.textContent = engine.inputs.storage;
      els.valBandwidth.textContent = engine.inputs.bandwidth;
      const quote = engine.generateQuote();
      els.ticker.textContent = `${quote.currency} ${quote.projectedTotal.toFixed(2)} / ${quote.billingCycle}`;
      els.tierBadge.textContent = `Tier: ${quote.tier} (${quote.discountPercent}% off)`;
      const pct = Math.min(100, (quote.subtotal / 5000) * 100);
      els.donutProgress.style.strokeDashoffset = 251.2 * (1 - pct / 100);
    }

    [els.compute, els.storage, els.bandwidth].forEach(inp => inp.addEventListener('input', update));
    els.cycle.addEventListener('click', () => {
      engine.billingCycle = engine.billingCycle === 'monthly' ? 'annual' : 'monthly';
      const label = engine.billingCycle.charAt(0).toUpperCase() + engine.billingCycle.slice(1);
      els.cycle.textContent = label;
      els.valCycle.textContent = label;
      update();
    });
    update();
  });
}
