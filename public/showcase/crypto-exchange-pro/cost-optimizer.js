/**
 * CryptoExchangeProCostOptimizerEngine
 * Standalone interactive resource provisioning and dynamic cost estimation engine
 * Models tiered consumption pricing, volume discount thresholds, and real-time expense projections.
 */

export class CryptoExchangeProCostOptimizerEngine {
  constructor(options = {}) {
    // Base unit rates per month ($)
    this.unitRates = {
      compute: options.unitRates?.compute ?? 0.05, // per vCPU hour ($36/mo per vCPU @ 720h, or say $0.05/vCPU unit)
      storage: options.unitRates?.storage ?? 0.08, // per GB / month
      bandwidth: options.unitRates?.bandwidth ?? 0.03 // per GB / month
    };

    // Volume discount tiers based on total raw monthly spend threshold
    this.discountTiers = [
      { name: 'Standard', minSpend: 0, discountRate: 0.00, badgeClass: 'tier-standard' },
      { name: 'Growth', minSpend: 250, discountRate: 0.08, badgeClass: 'tier-growth' },
      { name: 'Enterprise', minSpend: 750, discountRate: 0.15, badgeClass: 'tier-enterprise' },
      { name: 'Whale / Institutional', minSpend: 2000, discountRate: 0.25, badgeClass: 'tier-institutional' }
    ];

    // Annual commitment discount percentage (applied after volume discount)
    this.annualDiscountRate = 0.20; // 20% discount for annual commitment
  }

  /**
   * Calculate pricing breakdown based on resource inputs and frequency
   * @param {Object} inputs - { compute: number, storage: number, bandwidth: number, frequency?: 'monthly' | 'annual' }
   */
  calculatePricing(inputs = {}) {
    const compute = Math.max(0, Number(inputs.compute) || 0);
    const storage = Math.max(0, Number(inputs.storage) || 0);
    const bandwidth = Math.max(0, Number(inputs.bandwidth) || 0);
    const frequency = inputs.frequency === 'annual' ? 'annual' : 'monthly';

    // Base subtotal (monthly equivalents)
    const computeSubtotal = Number((compute * this.unitRates.compute).toFixed(2));
    const storageSubtotal = Number((storage * this.unitRates.storage).toFixed(2));
    const bandwidthSubtotal = Number((bandwidth * this.unitRates.bandwidth).toFixed(2));
    const rawSubtotal = Number((computeSubtotal + storageSubtotal + bandwidthSubtotal).toFixed(2));

    // Determine volume tier and discount
    const tier = this.resolveTier(rawSubtotal);
    const volumeDiscountAmount = Number((rawSubtotal * tier.discountRate).toFixed(2));
    const discountedMonthly = Number(Math.max(0, rawSubtotal - volumeDiscountAmount).toFixed(2));

    // Calculate billing term adjustments
    let effectiveMonthly = discountedMonthly;
    let annualSavings = 0;
    let totalBilled = discountedMonthly;

    if (frequency === 'annual') {
      const commitmentDiscount = Number((discountedMonthly * this.annualDiscountRate).toFixed(2));
      effectiveMonthly = Number((discountedMonthly - commitmentDiscount).toFixed(2));
      totalBilled = Number((effectiveMonthly * 12).toFixed(2));
      annualSavings = Number(((rawSubtotal * 12) - totalBilled).toFixed(2));
    } else {
      totalBilled = discountedMonthly;
      annualSavings = Number((volumeDiscountAmount * 12).toFixed(2));
    }

    // Cost distribution percentages for donut / chart
    const totalResourceCost = rawSubtotal || 1;
    const distribution = {
      computePercent: Number(((computeSubtotal / totalResourceCost) * 100).toFixed(1)),
      storagePercent: Number(((storageSubtotal / totalResourceCost) * 100).toFixed(1)),
      bandwidthPercent: Number(((bandwidthSubtotal / totalResourceCost) * 100).toFixed(1))
    };

    return {
      inputs: { compute, storage, bandwidth, frequency },
      rates: { ...this.unitRates },
      breakdown: {
        compute: computeSubtotal,
        storage: storageSubtotal,
        bandwidth: bandwidthSubtotal,
        rawSubtotal
      },
      distribution,
      tier,
      volumeDiscountAmount,
      frequency,
      effectiveMonthly,
      totalBilled,
      annualSavings
    };
  }

  /**
   * Resolve tier metadata from spend amount
   * @param {number} monthlySpend
   */
  resolveTier(monthlySpend) {
    const spend = Math.max(0, Number(monthlySpend) || 0);
    let matchedTier = this.discountTiers[0];
    for (const tier of this.discountTiers) {
      if (spend >= tier.minSpend) {
        matchedTier = tier;
      }
    }
    return { ...matchedTier };
  }

  /**
   * Apply volume discount given a tier object or spend amount
   * @param {Object|string|number} tierOrSpend
   */
  applyVolumeDiscount(tierOrSpend) {
    let rate = 0;
    let tierName = 'Standard';

    if (typeof tierOrSpend === 'number') {
      const resolved = this.resolveTier(tierOrSpend);
      rate = resolved.discountRate;
      tierName = resolved.name;
    } else if (typeof tierOrSpend === 'string') {
      const found = this.discountTiers.find(t => t.name.toLowerCase() === tierOrSpend.toLowerCase());
      if (found) {
        rate = found.discountRate;
        tierName = found.name;
      }
    } else if (tierOrSpend && typeof tierOrSpend.discountRate === 'number') {
      rate = tierOrSpend.discountRate;
      tierName = tierOrSpend.name || 'Custom';
    }

    return {
      tierName,
      discountRate: rate,
      discountPercentage: Number((rate * 100).toFixed(0))
    };
  }

  /**
   * Generate an official formatted quote summary
   * @param {Object} inputs
   */
  generateQuote(inputs = {}) {
    const pricing = this.calculatePricing(inputs);
    const quoteId = `QUOTE-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const timestamp = new Date().toISOString();

    return {
      quoteId,
      timestamp,
      frequency: pricing.frequency,
      tier: pricing.tier.name,
      discountAppliedPercent: Number((pricing.tier.discountRate * 100).toFixed(0)),
      breakdown: pricing.breakdown,
      distribution: pricing.distribution,
      effectiveMonthly: pricing.effectiveMonthly,
      totalBilled: pricing.totalBilled,
      annualSavings: pricing.annualSavings,
      status: 'active'
    };
  }
}

// Client UI integration when running in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new CryptoExchangeProCostOptimizerEngine();

    // DOM Elements
    const computeSlider = document.getElementById('computeSlider');
    const storageSlider = document.getElementById('storageSlider');
    const bandwidthSlider = document.getElementById('bandwidthSlider');

    const computeVal = document.getElementById('computeVal');
    const storageVal = document.getElementById('storageVal');
    const bandwidthVal = document.getElementById('bandwidthVal');

    const freqMonthly = document.getElementById('freqMonthly');
    const freqAnnual = document.getElementById('freqAnnual');

    const tierBadge = document.getElementById('tierBadge');
    const totalCostDisplay = document.getElementById('totalCostDisplay');
    const billingCycleText = document.getElementById('billingCycleText');
    const discountRateText = document.getElementById('discountRateText');
    const annualSavingsText = document.getElementById('annualSavingsText');

    const donutSvg = document.getElementById('donutSvg');
    const donutComputePct = document.getElementById('donutComputePct');
    const donutStoragePct = document.getElementById('donutStoragePct');
    const donutBandwidthPct = document.getElementById('donutBandwidthPct');

    const quoteOutput = document.getElementById('quoteOutput');
    const generateQuoteBtn = document.getElementById('generateQuoteBtn');

    let currentFrequency = 'monthly';

    function getInputs() {
      return {
        compute: Number(computeSlider?.value || 0),
        storage: Number(storageSlider?.value || 0),
        bandwidth: Number(bandwidthSlider?.value || 0),
        frequency: currentFrequency
      };
    }

    function updateDonut(distribution) {
      if (!donutSvg) return;
      const cPct = distribution.computePercent;
      const sPct = distribution.storagePercent;
      const bPct = distribution.bandwidthPercent;

      if (donutComputePct) donutComputePct.textContent = `${cPct}%`;
      if (donutStoragePct) donutStoragePct.textContent = `${sPct}%`;
      if (donutBandwidthPct) donutBandwidthPct.textContent = `${bPct}%`;

      // SVG circumference for r = 40 is 2 * PI * 40 = 251.327
      const C = 251.327;
      const cOffset = 0;
      const cDash = (cPct / 100) * C;

      const sOffset = -(cDash);
      const sDash = (sPct / 100) * C;

      const bOffset = -(cDash + sDash);
      const bDash = (bPct / 100) * C;

      const seg1 = document.getElementById('donutSegment1');
      const seg2 = document.getElementById('donutSegment2');
      const seg3 = document.getElementById('donutSegment3');

      if (seg1) {
        seg1.style.strokeDasharray = `${cDash} ${C - cDash}`;
        seg1.style.strokeDashoffset = `${cOffset}`;
      }
      if (seg2) {
        seg2.style.strokeDasharray = `${sDash} ${C - sDash}`;
        seg2.style.strokeDashoffset = `${sOffset}`;
      }
      if (seg3) {
        seg3.style.strokeDasharray = `${bDash} ${C - bDash}`;
        seg3.style.strokeDashoffset = `${bOffset}`;
      }
    }

    function render() {
      const inputs = getInputs();
      if (computeVal) computeVal.textContent = `${inputs.compute.toLocaleString()} vCPU hrs`;
      if (storageVal) storageVal.textContent = `${inputs.storage.toLocaleString()} GB`;
      if (bandwidthVal) bandwidthVal.textContent = `${inputs.bandwidth.toLocaleString()} GB`;

      const result = engine.calculatePricing(inputs);

      if (totalCostDisplay) {
        totalCostDisplay.textContent = `$${result.totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (billingCycleText) {
        billingCycleText.textContent = currentFrequency === 'annual' ? '/ year (billed annually)' : '/ month';
      }
      if (tierBadge) {
        tierBadge.textContent = result.tier.name;
        tierBadge.className = `tier-badge ${result.tier.badgeClass}`;
      }
      if (discountRateText) {
        discountRateText.textContent = `${(result.tier.discountRate * 100).toFixed(0)}%`;
      }
      if (annualSavingsText) {
        annualSavingsText.textContent = `$${result.annualSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }

      updateDonut(result.distribution);
    }

    // Event listeners
    computeSlider?.addEventListener('input', render);
    storageSlider?.addEventListener('input', render);
    bandwidthSlider?.addEventListener('input', render);

    freqMonthly?.addEventListener('click', () => {
      currentFrequency = 'monthly';
      freqMonthly.classList.add('active');
      freqAnnual?.classList.remove('active');
      render();
    });

    freqAnnual?.addEventListener('click', () => {
      currentFrequency = 'annual';
      freqAnnual.classList.add('active');
      freqMonthly?.classList.remove('active');
      render();
    });

    generateQuoteBtn?.addEventListener('click', () => {
      const quote = engine.generateQuote(getInputs());
      if (quoteOutput) {
        quoteOutput.textContent = JSON.stringify(quote, null, 2);
        quoteOutput.classList.remove('hidden');
      }
    });

    render();
  });
}
