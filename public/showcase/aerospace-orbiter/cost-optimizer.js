/**
 * Aerospace Orbiter - Tiered Resource Allocation & Dynamic Cost Optimizer Engine
 * Issue #2108 - NSoC '26 Level 3 Feature
 */

export const PRICING_TIERS = {
  EXPLORER: {
    name: 'Explorer',
    threshold: 0,
    rates: { compute: 0.05, storage: 0.02, bandwidth: 0.08 },
    volumeDiscount: 0.0,
  },
  ORBITAL: {
    name: 'Orbital',
    threshold: 100,
    rates: { compute: 0.045, storage: 0.018, bandwidth: 0.07 },
    volumeDiscount: 0.05, // 5% discount
  },
  DEEP_SPACE: {
    name: 'Deep Space',
    threshold: 500,
    rates: { compute: 0.038, storage: 0.014, bandwidth: 0.055 },
    volumeDiscount: 0.12, // 12% discount
  },
  CONSTELLATION: {
    name: 'Constellation',
    threshold: 1500,
    rates: { compute: 0.030, storage: 0.010, bandwidth: 0.040 },
    volumeDiscount: 0.20, // 20% discount
  },
};

export const FREQUENCY_DISCOUNTS = {
  monthly: 0.0,
  annual: 0.15, // 15% discount for annual commitment
};

export class AerospaceOrbiterCostOptimizerEngine {
  constructor(options = {}) {
    this.defaultInputs = {
      computeHours: 120, // CPU core-hours
      storageGB: 500,    // GB / month
      bandwidthGB: 250,  // GB data transfer
      frequency: 'monthly',
      ...options.defaultInputs,
    };
    this.currency = options.currency || 'USD';
  }

  /**
   * Determine resource tier based on composite compute + storage units
   * @param {number} compositeUnits
   * @returns {string} Tier key
   */
  resolveTier(compositeUnits) {
    if (compositeUnits >= PRICING_TIERS.CONSTELLATION.threshold) return 'CONSTELLATION';
    if (compositeUnits >= PRICING_TIERS.DEEP_SPACE.threshold) return 'DEEP_SPACE';
    if (compositeUnits >= PRICING_TIERS.ORBITAL.threshold) return 'ORBITAL';
    return 'EXPLORER';
  }

  /**
   * Apply volume discount threshold based on tier
   * @param {string} tierKey
   * @returns {number} discount rate (0 to 1)
   */
  applyVolumeDiscount(tierKey) {
    const tier = PRICING_TIERS[tierKey];
    if (!tier) {
      throw new Error(`Invalid tier key: ${tierKey}`);
    }
    return tier.volumeDiscount;
  }

  /**
   * Calculate tiered pricing and breakdowns
   * @param {Object} inputs
   * @returns {Object} detailed calculation breakdown
   */
  calculatePricing(inputs = {}) {
    const computeHours = Math.max(0, Number(inputs.computeHours ?? this.defaultInputs.computeHours));
    const storageGB = Math.max(0, Number(inputs.storageGB ?? this.defaultInputs.storageGB));
    const bandwidthGB = Math.max(0, Number(inputs.bandwidthGB ?? this.defaultInputs.bandwidthGB));
    const frequency = ['annual', 'yearly'].includes(inputs.frequency) ? 'annual' : 'monthly';

    // Composite activity index to scale tiers: compute * 1 + storage * 0.5 + bandwidth * 0.2
    const compositeUnits = Math.round(computeHours * 1.0 + storageGB * 0.5 + bandwidthGB * 0.2);
    const tierKey = this.resolveTier(compositeUnits);
    const tier = PRICING_TIERS[tierKey];

    const computeCost = parseFloat((computeHours * tier.rates.compute).toFixed(4));
    const storageCost = parseFloat((storageGB * tier.rates.storage).toFixed(4));
    const bandwidthCost = parseFloat((bandwidthGB * tier.rates.bandwidth).toFixed(4));
    const subtotal = parseFloat((computeCost + storageCost + bandwidthCost).toFixed(4));

    const volumeDiscountRate = this.applyVolumeDiscount(tierKey);
    const frequencyDiscountRate = FREQUENCY_DISCOUNTS[frequency] || 0.0;
    
    // Combined discount factor: 1 - (1 - vDiscount) * (1 - fDiscount)
    const totalDiscountRate = parseFloat(
      (1 - (1 - volumeDiscountRate) * (1 - frequencyDiscountRate)).toFixed(4)
    );

    const discountAmount = parseFloat((subtotal * totalDiscountRate).toFixed(2));
    const monthlyTotal = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
    const annualTotal = frequency === 'annual'
      ? parseFloat((monthlyTotal * 12).toFixed(2))
      : parseFloat((monthlyTotal * 12).toFixed(2));

    const total = frequency === 'annual' ? annualTotal : monthlyTotal;

    // Percentages for breakdown donut/pie
    const totalResourceCost = computeCost + storageCost + bandwidthCost;
    const computePct = totalResourceCost > 0 ? Math.round((computeCost / totalResourceCost) * 100) : 33;
    const storagePct = totalResourceCost > 0 ? Math.round((storageCost / totalResourceCost) * 100) : 33;
    const bandwidthPct = totalResourceCost > 0 ? Math.max(0, 100 - computePct - storagePct) : 34;

    return {
      tier: tierKey,
      tierName: tier.name,
      compositeUnits,
      frequency,
      rates: tier.rates,
      breakdown: {
        compute: computeCost,
        storage: storageCost,
        bandwidth: bandwidthCost,
        percentages: {
          compute: computePct,
          storage: storagePct,
          bandwidth: bandwidthPct,
        },
      },
      subtotal: parseFloat(subtotal.toFixed(2)),
      discounts: {
        volumeRate: volumeDiscountRate,
        frequencyRate: frequencyDiscountRate,
        totalRate: totalDiscountRate,
        amount: discountAmount,
      },
      monthlyTotal,
      annualTotal,
      total,
      currency: this.currency,
    };
  }

  /**
   * Generate quote object structure
   * @param {Object} inputs
   * @returns {Object} finalized quote object
   */
  generateQuote(inputs = {}) {
    const pricing = this.calculatePricing(inputs);
    const quoteId = `ORB-QUOTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      quoteId,
      issuedAt: new Date().toISOString(),
      validUntil,
      status: 'ESTIMATED',
      resourceInputs: {
        computeHours: Number(inputs.computeHours ?? this.defaultInputs.computeHours),
        storageGB: Number(inputs.storageGB ?? this.defaultInputs.storageGB),
        bandwidthGB: Number(inputs.bandwidthGB ?? this.defaultInputs.bandwidthGB),
        frequency: pricing.frequency,
      },
      pricing,
    };
  }
}

// DOM Interactive Controller for cost-optimizer.html
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new AerospaceOrbiterCostOptimizerEngine();

    const computeSlider = document.getElementById('compute-slider');
    const storageSlider = document.getElementById('storage-slider');
    const bandwidthSlider = document.getElementById('bandwidth-slider');

    const computeVal = document.getElementById('compute-val');
    const storageVal = document.getElementById('storage-val');
    const bandwidthVal = document.getElementById('bandwidth-val');

    const freqMonthly = document.getElementById('freq-monthly');
    const freqAnnual = document.getElementById('freq-annual');

    const totalTicker = document.getElementById('total-ticker');
    const billingPeriodLabel = document.getElementById('billing-period-label');
    const tierBadge = document.getElementById('tier-badge');
    const discountBadge = document.getElementById('discount-badge');
    const savingsAmount = document.getElementById('savings-amount');

    const breakdownCompute = document.getElementById('breakdown-compute');
    const breakdownStorage = document.getElementById('breakdown-storage');
    const breakdownBandwidth = document.getElementById('breakdown-bandwidth');
    const donutSlice = document.getElementById('donut-slice');

    const quoteBtn = document.getElementById('generate-quote-btn');
    const quoteModal = document.getElementById('quote-modal');
    const quoteCode = document.getElementById('quote-json');
    const closeModal = document.getElementById('close-modal');

    function updateOptimizer() {
      if (!computeSlider) return;

      const frequency = freqAnnual && freqAnnual.checked ? 'annual' : 'monthly';
      const inputs = {
        computeHours: Number(computeSlider.value),
        storageGB: Number(storageSlider.value),
        bandwidthGB: Number(bandwidthSlider.value),
        frequency,
      };

      if (computeVal) computeVal.textContent = `${inputs.computeHours.toLocaleString()} hrs`;
      if (storageVal) storageVal.textContent = `${inputs.storageGB.toLocaleString()} GB`;
      if (bandwidthVal) bandwidthVal.textContent = `${inputs.bandwidthGB.toLocaleString()} GB`;

      const result = engine.calculatePricing(inputs);

      if (totalTicker) {
        totalTicker.textContent = `$${result.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (billingPeriodLabel) {
        billingPeriodLabel.textContent = frequency === 'annual' ? '/ year (billed annually)' : '/ month';
      }

      if (tierBadge) {
        tierBadge.textContent = `${result.tierName} Tier`;
        tierBadge.dataset.tier = result.tier.toLowerCase();
      }

      if (discountBadge) {
        const totalPct = Math.round(result.discounts.totalRate * 100);
        discountBadge.textContent = `${totalPct}% Off`;
        discountBadge.style.display = totalPct > 0 ? 'inline-block' : 'none';
      }

      if (savingsAmount) {
        savingsAmount.textContent = `$${result.discounts.amount.toFixed(2)}`;
      }

      if (breakdownCompute) breakdownCompute.textContent = `$${result.breakdown.compute.toFixed(2)} (${result.breakdown.percentages.compute}%)`;
      if (breakdownStorage) breakdownStorage.textContent = `$${result.breakdown.storage.toFixed(2)} (${result.breakdown.percentages.storage}%)`;
      if (breakdownBandwidth) breakdownBandwidth.textContent = `$${result.breakdown.bandwidth.toFixed(2)} (${result.breakdown.percentages.bandwidth}%)`;

      if (donutSlice) {
        const cDeg = result.breakdown.percentages.compute * 3.6;
        const sDeg = cDeg + result.breakdown.percentages.storage * 3.6;
        donutSlice.style.background = `conic-gradient(
          #0284c7 0deg ${cDeg}deg,
          #38bdf8 ${cDeg}deg ${sDeg}deg,
          #818cf8 ${sDeg}deg 360deg
        )`;
      }
    }

    [computeSlider, storageSlider, bandwidthSlider].forEach((slider) => {
      slider?.addEventListener('input', updateOptimizer);
    });

    [freqMonthly, freqAnnual].forEach((radio) => {
      radio?.addEventListener('change', updateOptimizer);
    });

    quoteBtn?.addEventListener('click', () => {
      const frequency = freqAnnual && freqAnnual.checked ? 'annual' : 'monthly';
      const quote = engine.generateQuote({
        computeHours: Number(computeSlider?.value || 100),
        storageGB: Number(storageSlider?.value || 500),
        bandwidthGB: Number(bandwidthSlider?.value || 250),
        frequency,
      });
      if (quoteCode) quoteCode.textContent = JSON.stringify(quote, null, 2);
      if (quoteModal) quoteModal.style.display = 'flex';
    });

    closeModal?.addEventListener('click', () => {
      if (quoteModal) quoteModal.style.display = 'none';
    });

    updateOptimizer();
  });
}
