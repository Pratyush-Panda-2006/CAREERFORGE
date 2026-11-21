/**
 * Supply Chain Logistics - Dynamic Cost Optimizer & Resource Allocation Sandbox
 * Issue #2140 - NSoC '26 Level 3 Feature
 */

export const TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter Logistics Tier',
    badge: 'Tier 1 • Starter',
    maxCompute: 15,
    maxStorage: 200,
    maxBandwidth: 1000,
    rates: {
      compute: 1200.0,   // ₹ per vCPU node / month
      storage: 20.0,     // ₹ per GB telemetry & manifest / month
      bandwidth: 6.5     // ₹ per GB tracking transfer / month
    },
    discountRate: 0.0    // 0% volume discount
  },
  business: {
    id: 'business',
    name: 'Business Logistics Tier',
    badge: 'Tier 2 • Business',
    maxCompute: 50,
    maxStorage: 1000,
    maxBandwidth: 5000,
    rates: {
      compute: 960.0,    // ₹ per vCPU node / month
      storage: 16.0,     // ₹ per GB / month
      bandwidth: 5.0     // ₹ per GB transfer / month
    },
    discountRate: 0.10   // 10% volume discount
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Fleet Tier',
    badge: 'Tier 3 • Enterprise',
    maxCompute: Infinity,
    maxStorage: Infinity,
    maxBandwidth: Infinity,
    rates: {
      compute: 720.0,    // ₹ per vCPU node / month
      storage: 12.0,     // ₹ per GB / month
      bandwidth: 3.5     // ₹ per GB transfer / month
    },
    discountRate: 0.20   // 20% volume discount
  }
};

export class SupplyChainLogisticsCostOptimizerEngine {
  constructor(initialConfig = {}) {
    this.currency = 'INR';
    this.currencySymbol = '₹';
    this.annualDiscountRate = 0.15; // 15% discount for annual commitment
    this.currentInputs = {
      compute: this.sanitizeInput(initialConfig.compute ?? 8),
      storage: this.sanitizeInput(initialConfig.storage ?? 150),
      bandwidth: this.sanitizeInput(initialConfig.bandwidth ?? 800),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly'
    };
  }

  sanitizeInput(val) {
    if (val === null || val === undefined || typeof val === 'boolean') return 0;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
    return Math.floor(num);
  }

  determineTier(compute, storage, bandwidth) {
    if (
      compute <= TIERS.starter.maxCompute &&
      storage <= TIERS.starter.maxStorage &&
      bandwidth <= TIERS.starter.maxBandwidth
    ) {
      return TIERS.starter;
    }
    if (
      compute <= TIERS.business.maxCompute &&
      storage <= TIERS.business.maxStorage &&
      bandwidth <= TIERS.business.maxBandwidth
    ) {
      return TIERS.business;
    }
    return TIERS.enterprise;
  }

  applyVolumeDiscount(tierOrId, amount = 0) {
    const tier = typeof tierOrId === 'string' ? TIERS[tierOrId] || TIERS.starter : tierOrId;
    const rate = tier?.discountRate || 0;
    const sanitizedAmount = Math.max(0, Number(amount) || 0);
    const discountAmount = Math.round(sanitizedAmount * rate * 100) / 100;
    const netCost = Math.round((sanitizedAmount - discountAmount) * 100) / 100;

    return {
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      discountAmount,
      netCost
    };
  }

  calculatePricing(inputs = {}) {
    const compute = this.sanitizeInput(inputs.compute ?? this.currentInputs.compute);
    const storage = this.sanitizeInput(inputs.storage ?? this.currentInputs.storage);
    const bandwidth = this.sanitizeInput(inputs.bandwidth ?? this.currentInputs.bandwidth);
    const billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';

    const tier = this.determineTier(compute, storage, bandwidth);

    const monthlyComputeCost = Math.round(compute * tier.rates.compute * 100) / 100;
    const monthlyStorageCost = Math.round(storage * tier.rates.storage * 100) / 100;
    const monthlyBandwidthCost = Math.round(bandwidth * tier.rates.bandwidth * 100) / 100;

    const monthlyBaseCost = Math.round((monthlyComputeCost + monthlyStorageCost + monthlyBandwidthCost) * 100) / 100;

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * multiplier * 100) / 100;

    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscount.discountAmount) * 100) / 100;

    const annualDiscountAmount = isAnnual
      ? Math.round(afterVolumeDiscount * this.annualDiscountRate * 100) / 100
      : 0;

    const totalDiscount = Math.round((volumeDiscount.discountAmount + annualDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);

    return {
      inputs: { compute, storage, bandwidth },
      billingFrequency,
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        discountRate: tier.discountRate,
        discountPercent: Math.round(tier.discountRate * 100),
        rates: { ...tier.rates }
      },
      annualMultiplier: multiplier,
      annualDiscountRate: this.annualDiscountRate,
      annualDiscountPercent: Math.round(this.annualDiscountRate * 100),
      breakdown: {
        compute: Math.round(monthlyComputeCost * multiplier * 100) / 100,
        storage: Math.round(monthlyStorageCost * multiplier * 100) / 100,
        bandwidth: Math.round(monthlyBandwidthCost * multiplier * 100) / 100
      },
      subtotal,
      baseCost: subtotal,
      volumeDiscountAmount: volumeDiscount.discountAmount,
      annualDiscountAmount,
      totalDiscountAmount: totalDiscount,
      discountAmount: totalDiscount,
      totalCost
    };
  }

  generateQuote(inputs = null) {
    if (inputs) {
      if (inputs.compute !== undefined) this.currentInputs.compute = this.sanitizeInput(inputs.compute);
      if (inputs.storage !== undefined) this.currentInputs.storage = this.sanitizeInput(inputs.storage);
      if (inputs.bandwidth !== undefined) this.currentInputs.bandwidth = this.sanitizeInput(inputs.bandwidth);
      if (inputs.billingFrequency !== undefined) {
        this.currentInputs.billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';
      }
    }
    return this.calculatePricing(this.currentInputs);
  }
}

// Client-side DOM UI binder for cost-optimizer.html
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const engine = new SupplyChainLogisticsCostOptimizerEngine();

    const computeSlider = document.getElementById('slider-compute');
    const storageSlider = document.getElementById('slider-storage');
    const bandwidthSlider = document.getElementById('slider-bandwidth');

    const computeVal = document.getElementById('val-compute');
    const storageVal = document.getElementById('val-storage');
    const bandwidthVal = document.getElementById('val-bandwidth');

    const billingToggle = document.getElementById('billing-toggle');
    const billingPeriodLabel = document.getElementById('billing-period-label');

    const tierBadge = document.getElementById('tier-badge');
    const totalPriceEl = document.getElementById('total-price-val');
    const basePriceEl = document.getElementById('base-price-val');
    const discountPriceEl = document.getElementById('discount-price-val');

    const costComputeEl = document.getElementById('cost-compute');
    const costStorageEl = document.getElementById('cost-storage');
    const costBandwidthEl = document.getElementById('cost-bandwidth');

    const donutCompute = document.getElementById('donut-segment-compute');
    const donutStorage = document.getElementById('donut-segment-storage');
    const donutBandwidth = document.getElementById('donut-segment-bandwidth');

    function formatCurrency(amount) {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function updateUI() {
      if (!computeSlider || !storageSlider || !bandwidthSlider) return;

      const compute = Number(computeSlider.value);
      const storage = Number(storageSlider.value);
      const bandwidth = Number(bandwidthSlider.value);
      const isAnnual = billingToggle?.checked ?? false;
      const billingFrequency = isAnnual ? 'annual' : 'monthly';

      if (computeVal) computeVal.textContent = `${compute} vCPU Nodes`;
      if (storageVal) storageVal.textContent = `${storage.toLocaleString('en-IN')} GB`;
      if (bandwidthVal) bandwidthVal.textContent = `${bandwidth.toLocaleString('en-IN')} GB`;

      if (billingPeriodLabel) {
        billingPeriodLabel.textContent = isAnnual ? '/ year (15% annual commitment discount)' : '/ month';
      }

      const quote = engine.calculatePricing({
        compute,
        storage,
        bandwidth,
        billingFrequency
      });

      if (tierBadge) {
        tierBadge.textContent = quote.tier.badge;
        tierBadge.className = `tier-badge tier-${quote.tier.id}`;
      }

      if (totalPriceEl) totalPriceEl.textContent = formatCurrency(quote.totalCost);
      if (basePriceEl) basePriceEl.textContent = formatCurrency(quote.subtotal);
      if (discountPriceEl) discountPriceEl.textContent = `-${formatCurrency(quote.totalDiscountAmount)}`;

      if (costComputeEl) costComputeEl.textContent = formatCurrency(quote.breakdown.compute);
      if (costStorageEl) costStorageEl.textContent = formatCurrency(quote.breakdown.storage);
      if (costBandwidthEl) costBandwidthEl.textContent = formatCurrency(quote.breakdown.bandwidth);

      // SVG Donut circumference = 2 * PI * 45 ≈ 282.743
      const totalBreakdown = quote.breakdown.compute + quote.breakdown.storage + quote.breakdown.bandwidth || 1;
      const pctCompute = quote.breakdown.compute / totalBreakdown;
      const pctStorage = quote.breakdown.storage / totalBreakdown;
      const pctBandwidth = quote.breakdown.bandwidth / totalBreakdown;

      const circumference = 282.743;
      const dashCompute = pctCompute * circumference;
      const dashStorage = pctStorage * circumference;
      const dashBandwidth = pctBandwidth * circumference;

      if (donutCompute) {
        donutCompute.style.strokeDasharray = `${dashCompute} ${circumference}`;
        donutCompute.style.strokeDashoffset = '0';
      }
      if (donutStorage) {
        donutStorage.style.strokeDasharray = `${dashStorage} ${circumference}`;
        donutStorage.style.strokeDashoffset = `-${dashCompute}`;
      }
      if (donutBandwidth) {
        donutBandwidth.style.strokeDasharray = `${dashBandwidth} ${circumference}`;
        donutBandwidth.style.strokeDashoffset = `-${dashCompute + dashStorage}`;
      }
    }

    computeSlider?.addEventListener('input', updateUI);
    storageSlider?.addEventListener('input', updateUI);
    bandwidthSlider?.addEventListener('input', updateUI);
    billingToggle?.addEventListener('change', updateUI);

    updateUI();
  });
}
