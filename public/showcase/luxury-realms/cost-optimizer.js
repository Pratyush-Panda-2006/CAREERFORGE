/**
 * Luxury Realms - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2100 - Nexus Spring of Code 2026 (NSoC '26)
 *
 * Models bespoke ultra-high-net-worth estate concierge, private aviation flight hours,
 * 24/7 tactical personal security & armored transport details, superyacht charter allocations,
 * and master sommelier / fine art curation retainers.
 */

export const ASSET_TIERS = Object.freeze({
  tier1: Object.freeze({
    id: 'tier1',
    tierNumber: 1,
    name: 'Sapphire Portfolio',
    badge: 'Tier 1 • Sapphire Portfolio',
    minAssets: 100_000,
    maxAssets: 500_000,
    discountRate: 0.00,
    discountPercent: 0,
    label: 'Sapphire Portfolio ($100k - $500k)',
    description: 'Entry private estate management & on-call aviation dispatch'
  }),
  tier2: Object.freeze({
    id: 'tier2',
    tierNumber: 2,
    name: 'Diamond Estate',
    badge: 'Tier 2 • Diamond Estate',
    minAssets: 500_000,
    maxAssets: 2_000_000,
    discountRate: 0.08,
    discountPercent: 8,
    label: 'Diamond Estate ($500k - $2M)',
    description: 'Premier multi-property asset stewardship with 8% prestige rebate'
  }),
  tier3: Object.freeze({
    id: 'tier3',
    tierNumber: 3,
    name: 'Royal Sovereign',
    badge: 'Tier 3 • Royal Sovereign',
    minAssets: 2_000_000,
    maxAssets: 10_000_000,
    discountRate: 0.15,
    discountPercent: 15,
    label: 'Royal Sovereign ($2M - $10M)',
    description: 'Elite global sovereign estate management with 15% elite discount'
  }),
  tier4: Object.freeze({
    id: 'tier4',
    tierNumber: 4,
    name: 'Sovereign Global Sovereign',
    badge: 'Tier 4 • Sovereign Global Sovereign',
    minAssets: 10_000_000,
    maxAssets: Infinity,
    discountRate: 0.25,
    discountPercent: 25,
    label: 'Sovereign Global Sovereign (> $10M)',
    description: 'Ultra-HNW sovereign family office concierge with 25% institutional discount'
  })
});

export const SERVICE_RATES = Object.freeze({
  estates: Object.freeze({
    key: 'estates',
    label: 'Estate Portfolio Stewardship',
    unit: 'managed estates / month',
    rate: 15000.0,
    description: 'Primary & secondary residence stewardship, staffing & physical maintenance'
  }),
  flightHours: Object.freeze({
    key: 'flightHours',
    label: 'Private Aviation Flight Hours',
    unit: 'flight hours / month',
    rate: 6500.0,
    description: 'Guaranteed private jet availability, ramp dispatch & international overflight permits'
  }),
  securityOperatives: Object.freeze({
    key: 'securityOperatives',
    label: '24/7 Security & Armored Transport',
    unit: 'close-protection details / month',
    rate: 12000.0,
    description: 'Tactical close protection, B6 armored vehicle fleet & 24/7 surveillance detail'
  }),
  yachtDays: Object.freeze({
    key: 'yachtDays',
    label: 'Superyacht Charter Allocations',
    unit: 'charter days / month',
    rate: 25000.0,
    description: '50m+ superyacht access, licensed master crew, marine provisioning & berths'
  }),
  lifestyleRetainers: Object.freeze({
    key: 'lifestyleRetainers',
    label: 'Sommelier & Art Curation Retainer',
    unit: 'bespoke retainers / month',
    rate: 8000.0,
    description: 'Master sommelier cellar acquisitions, private gallery previews & VIP allocations'
  })
});

export class LuxuryRealmsCostOptimizerEngine {
  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.annualDiscountRate = 0.15; // 15% savings with annual commitment
    this.listeners = new Map();

    this.currentInputs = {
      estates: this.sanitizeInput(initialConfig.estates ?? 2),
      flightHours: this.sanitizeInput(initialConfig.flightHours ?? initialConfig.aviationHours ?? 15),
      securityOperatives: this.sanitizeInput(initialConfig.securityOperatives ?? 2),
      yachtDays: this.sanitizeInput(initialConfig.yachtDays ?? 3),
      lifestyleRetainers: this.sanitizeInput(initialConfig.lifestyleRetainers ?? 1),
      assets: this.sanitizeCurrency(initialConfig.assets ?? initialConfig.assetValuation ?? 3500000),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly'
    };

    this.lastTier = this.determineTier(this.currentInputs.assets);
    this.lastQuote = null;
  }

  /**
   * Sanitizes non-negative integer input values safely.
   */
  sanitizeInput(val, defaultVal = 0) {
    if (val === null || val === undefined || typeof val === 'boolean') return defaultVal;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return defaultVal;
    return Math.floor(num);
  }

  /**
   * Sanitizes currency and decimal inputs safely.
   */
  sanitizeCurrency(val, defaultVal = 0) {
    if (val === null || val === undefined || typeof val === 'boolean') return defaultVal;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return defaultVal;
    return Math.round(num * 100) / 100;
  }

  /**
   * Determines the applicable asset volume discount tier.
   * Accepts tier string id, tier name, integer index (1-4), or asset valuation dollar amount.
   */
  determineTier(assetsOrTier) {
    if (typeof assetsOrTier === 'string') {
      const key = assetsOrTier.toLowerCase().trim();
      if (key === 'tier1' || key === 'sapphire') return ASSET_TIERS.tier1;
      if (key === 'tier2' || key === 'diamond') return ASSET_TIERS.tier2;
      if (key === 'tier3' || key === 'royal' || key === 'imperial') return ASSET_TIERS.tier3;
      if (key === 'tier4' || key === 'sovereign') return ASSET_TIERS.tier4;
    }

    if (typeof assetsOrTier === 'number') {
      // Direct tier number 1, 2, 3, 4
      if (Number.isInteger(assetsOrTier) && assetsOrTier >= 1 && assetsOrTier <= 4) {
        return ASSET_TIERS[`tier${assetsOrTier}`];
      }
      // Asset valuation dollar amount
      if (assetsOrTier <= 500_000) return ASSET_TIERS.tier1;
      if (assetsOrTier <= 2_000_000) return ASSET_TIERS.tier2;
      if (assetsOrTier <= 10_000_000) return ASSET_TIERS.tier3;
      return ASSET_TIERS.tier4;
    }

    if (assetsOrTier && typeof assetsOrTier === 'object') {
      if (assetsOrTier.id && ASSET_TIERS[assetsOrTier.id]) return ASSET_TIERS[assetsOrTier.id];
      if (assetsOrTier.tierNumber && ASSET_TIERS[`tier${assetsOrTier.tierNumber}`]) {
        return ASSET_TIERS[`tier${assetsOrTier.tierNumber}`];
      }
      if ('assets' in assetsOrTier || 'assetValuation' in assetsOrTier) {
        return this.determineTier(assetsOrTier.assets ?? assetsOrTier.assetValuation);
      }
    }

    return ASSET_TIERS.tier1;
  }

  /**
   * Calculates volume discount for a given tier and base cost.
   * Tier 1: $100k - $500k assets (0% discount)
   * Tier 2: $500k - $2M assets (8% prestige rebate)
   * Tier 3: $2M - $10M assets (15% elite discount)
   * Tier 4: > $10M assets (25% sovereign family office discount)
   */
  applyVolumeDiscount(tierOrAsset, baseCost = 0) {
    const tier = this.determineTier(tierOrAsset);
    const rate = tier.discountRate;
    const sanitizedCost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(sanitizedCost * rate * 100) / 100;
    const netCost = Math.round((sanitizedCost - discountAmount) * 100) / 100;

    return {
      tier: tier.id,
      tierNumber: tier.tierNumber,
      tierName: tier.name,
      badge: tier.badge,
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      baseCost: sanitizedCost,
      discountAmount,
      netCost,
      valueOf() { return rate; },
      toString() { return String(rate); }
    };
  }

  /**
   * Calculates itemized pricing, volume rebates, annual commitment savings, and total net costs.
   */
  calculatePricing(inputs = {}) {
    const hasExplicitResources = (
      'estates' in inputs ||
      'flightHours' in inputs ||
      'aviationHours' in inputs ||
      'securityOperatives' in inputs ||
      'yachtDays' in inputs ||
      'lifestyleRetainers' in inputs
    );

    const fallback = hasExplicitResources ? 0 : this.currentInputs;

    const estates = this.sanitizeInput(inputs.estates ?? (typeof fallback === 'object' ? fallback.estates : fallback));
    const flightHours = this.sanitizeInput(
      inputs.flightHours ?? inputs.aviationHours ?? (typeof fallback === 'object' ? fallback.flightHours : fallback)
    );
    const securityOperatives = this.sanitizeInput(
      inputs.securityOperatives ?? (typeof fallback === 'object' ? fallback.securityOperatives : fallback)
    );
    const yachtDays = this.sanitizeInput(inputs.yachtDays ?? (typeof fallback === 'object' ? fallback.yachtDays : fallback));
    const lifestyleRetainers = this.sanitizeInput(
      inputs.lifestyleRetainers ?? (typeof fallback === 'object' ? fallback.lifestyleRetainers : fallback)
    );
    const billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';

    let assets = this.currentInputs.assets;
    if (inputs.assets !== undefined) {
      assets = this.sanitizeCurrency(inputs.assets);
    } else if (inputs.assetValuation !== undefined) {
      assets = this.sanitizeCurrency(inputs.assetValuation);
    } else if (inputs.tier !== undefined) {
      assets = this.determineTier(inputs.tier).minAssets;
    }

    const tier = this.determineTier(inputs.tier !== undefined ? inputs.tier : assets);

    // Monthly baseline resource calculations
    const monthlyEstateCost = Math.round(estates * SERVICE_RATES.estates.rate * 100) / 100;
    const monthlyFlightCost = Math.round(flightHours * SERVICE_RATES.flightHours.rate * 100) / 100;
    const monthlySecurityCost = Math.round(securityOperatives * SERVICE_RATES.securityOperatives.rate * 100) / 100;
    const monthlyYachtCost = Math.round(yachtDays * SERVICE_RATES.yachtDays.rate * 100) / 100;
    const monthlyLifestyleCost = Math.round(lifestyleRetainers * SERVICE_RATES.lifestyleRetainers.rate * 100) / 100;

    const monthlyBaseCost = Math.round(
      (monthlyEstateCost + monthlyFlightCost + monthlySecurityCost + monthlyYachtCost + monthlyLifestyleCost) * 100
    ) / 100;

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * multiplier * 100) / 100;

    // Apply Tiered Volume Discount
    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscount.discountAmount) * 100) / 100;

    // Apply Annual Commitment Savings (15% on net commitment)
    const annualDiscountAmount = isAnnual
      ? Math.round(afterVolumeDiscount * this.annualDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round((volumeDiscount.discountAmount + annualDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100);
    const monthlyEquivalent = isAnnual ? Math.round((totalCost / 12) * 100) / 100 : totalCost;

    // Detect tier change event
    if (this.lastTier && this.lastTier.id !== tier.id) {
      this.emit('tier:changed', {
        previousTier: this.lastTier,
        currentTier: tier
      });
    }
    this.lastTier = tier;

    const quote = {
      quoteId: `LR-VIP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      timestamp: new Date().toISOString(),
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      inputs: {
        estates,
        flightHours,
        securityOperatives,
        yachtDays,
        lifestyleRetainers,
        assets
      },
      billingFrequency,
      annualMultiplier: multiplier,
      tier: {
        id: tier.id,
        tierNumber: tier.tierNumber,
        name: tier.name,
        badge: tier.badge,
        discountRate: tier.discountRate,
        discountPercent: tier.discountPercent,
        minAssets: tier.minAssets,
        maxAssets: tier.maxAssets,
        description: tier.description
      },
      rates: {
        estates: SERVICE_RATES.estates.rate,
        flightHours: SERVICE_RATES.flightHours.rate,
        securityOperatives: SERVICE_RATES.securityOperatives.rate,
        yachtDays: SERVICE_RATES.yachtDays.rate,
        lifestyleRetainers: SERVICE_RATES.lifestyleRetainers.rate
      },
      breakdown: {
        estates: Math.round(monthlyEstateCost * multiplier * 100) / 100,
        flightHours: Math.round(monthlyFlightCost * multiplier * 100) / 100,
        securityOperatives: Math.round(monthlySecurityCost * multiplier * 100) / 100,
        yachtDays: Math.round(monthlyYachtCost * multiplier * 100) / 100,
        lifestyleRetainers: Math.round(monthlyLifestyleCost * multiplier * 100) / 100
      },
      monthlyBaseCost,
      subtotal,
      baseCost: subtotal,
      volumeDiscountRate: tier.discountRate,
      volumeDiscountPercent: tier.discountPercent,
      volumeDiscountAmount: volumeDiscount.discountAmount,
      afterVolumeDiscount,
      annualDiscountRate: isAnnual ? this.annualDiscountRate : 0,
      annualDiscountPercent: isAnnual ? Math.round(this.annualDiscountRate * 100) : 0,
      annualDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      commitmentSavings: annualDiscountAmount,
      totalCost,
      monthlyEquivalent
    };

    this.lastQuote = quote;
    this.emit('pricing:calculated', quote);
    return quote;
  }

  /**
   * Generates a formal VIP Quote and tracks state.
   */
  generateQuote(options = null) {
    if (options) {
      if (options.estates !== undefined) this.currentInputs.estates = this.sanitizeInput(options.estates);
      if (options.flightHours !== undefined || options.aviationHours !== undefined) {
        this.currentInputs.flightHours = this.sanitizeInput(options.flightHours ?? options.aviationHours);
      }
      if (options.securityOperatives !== undefined) {
        this.currentInputs.securityOperatives = this.sanitizeInput(options.securityOperatives);
      }
      if (options.yachtDays !== undefined) this.currentInputs.yachtDays = this.sanitizeInput(options.yachtDays);
      if (options.lifestyleRetainers !== undefined) {
        this.currentInputs.lifestyleRetainers = this.sanitizeInput(options.lifestyleRetainers);
      }
      if (options.assets !== undefined || options.assetValuation !== undefined) {
        this.currentInputs.assets = this.sanitizeCurrency(options.assets ?? options.assetValuation);
      }
      if (options.billingFrequency !== undefined) {
        this.currentInputs.billingFrequency = options.billingFrequency === 'annual' ? 'annual' : 'monthly';
      }
      const quote = this.calculatePricing(this.currentInputs);
      this.emit('quote:generated', quote);
      return quote;
    }

    const quote = this.calculatePricing(this.currentInputs);
    this.emit('quote:generated', quote);
    return quote;
  }

  /**
   * Optimizes resource allocation within a designated target budget.
   * Respects required minimum service thresholds and maximizes high-utility allocations.
   */
  optimizeAllocation(targetBudget, requiredServices = {}) {
    const budget = Number(targetBudget);
    if (!Number.isFinite(budget) || isNaN(budget) || budget <= 0) {
      throw new RangeError('targetBudget must be a positive number');
    }

    const billingFrequency = requiredServices.billingFrequency === 'annual' ? 'annual' : 'monthly';
    const minEstates = this.sanitizeInput(requiredServices.minEstates ?? requiredServices.estates ?? 0);
    const minFlight = this.sanitizeInput(
      requiredServices.minFlightHours ?? requiredServices.flightHours ?? requiredServices.aviationHours ?? 0
    );
    const minSecurity = this.sanitizeInput(
      requiredServices.minSecurityOperatives ?? requiredServices.securityOperatives ?? 0
    );
    const minYacht = this.sanitizeInput(requiredServices.minYachtDays ?? requiredServices.yachtDays ?? 0);
    const minLifestyle = this.sanitizeInput(
      requiredServices.minLifestyleRetainers ?? requiredServices.lifestyleRetainers ?? 0
    );
    const assets = this.sanitizeCurrency(
      requiredServices.assets ?? requiredServices.assetValuation ?? this.currentInputs.assets
    );

    const allocated = {
      estates: minEstates,
      flightHours: minFlight,
      securityOperatives: minSecurity,
      yachtDays: minYacht,
      lifestyleRetainers: minLifestyle,
      assets,
      billingFrequency
    };

    // Calculate baseline cost for required services
    let quote = this.calculatePricing(allocated);

    if (quote.totalCost > budget) {
      const result = {
        feasible: false,
        withinBudget: false,
        targetBudget: budget,
        allocatedServices: { ...allocated },
        quote,
        remainingBudget: Math.round((budget - quote.totalCost) * 100) / 100,
        deficit: Math.round((quote.totalCost - budget) * 100) / 100,
        utilizationPercent: Math.round((quote.totalCost / budget) * 10000) / 100,
        message: 'Target budget is insufficient to satisfy minimum required concierge allocations.'
      };
      this.emit('allocation:optimized', result);
      return result;
    }

    // Prioritized allocation sequence: flight hours, estates, security, yachts, lifestyle
    const priorities = [
      { key: 'flightHours', max: 100, step: 1 },
      { key: 'estates', max: 20, step: 1 },
      { key: 'securityOperatives', max: 15, step: 1 },
      { key: 'yachtDays', max: 30, step: 1 },
      { key: 'lifestyleRetainers', max: 10, step: 1 }
    ];

    let improved = true;
    while (improved) {
      improved = false;
      for (const item of priorities) {
        if (allocated[item.key] < item.max) {
          const testAllocated = { ...allocated, [item.key]: allocated[item.key] + item.step };
          const testQuote = this.calculatePricing(testAllocated);
          if (testQuote.totalCost <= budget) {
            allocated[item.key] += item.step;
            quote = testQuote;
            improved = true;
          }
        }
      }
    }

    const finalQuote = this.calculatePricing(allocated);
    const result = {
      feasible: true,
      withinBudget: true,
      targetBudget: budget,
      allocatedServices: { ...allocated },
      quote: finalQuote,
      remainingBudget: Math.round((budget - finalQuote.totalCost) * 100) / 100,
      deficit: 0,
      utilizationPercent: Math.round((finalQuote.totalCost / budget) * 10000) / 100,
      message: 'Resource allocation successfully optimized within target budget.'
    };

    this.emit('allocation:optimized', result);
    return result;
  }

  /**
   * Event listener subscription.
   */
  on(event, fn) {
    if (typeof fn !== 'function') throw new TypeError('Event listener must be a function');
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  /**
   * Remove event listener.
   */
  off(event, fn) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(fn);
    }
  }

  /**
   * Dispatches event to registered listeners.
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)) {
        try {
          listener(data);
        } catch (err) {
          // Suppress error propagation to ensure sibling listener isolation
        }
      }
    }
  }
}

// Client-side DOM Interactive UI Binder for cost-optimizer.html
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const engine = new LuxuryRealmsCostOptimizerEngine();

    // Range Sliders
    const estatesSlider = document.getElementById('slider-estates');
    const flightSlider = document.getElementById('slider-flight-hours');
    const securitySlider = document.getElementById('slider-security');
    const yachtSlider = document.getElementById('slider-yacht-days');
    const lifestyleSlider = document.getElementById('slider-lifestyle');
    const assetsSlider = document.getElementById('slider-assets');

    // Value Badges
    const estatesVal = document.getElementById('val-estates');
    const flightVal = document.getElementById('val-flight-hours');
    const securityVal = document.getElementById('val-security');
    const yachtVal = document.getElementById('val-yacht-days');
    const lifestyleVal = document.getElementById('val-lifestyle');
    const assetsVal = document.getElementById('val-assets');

    // Controls
    const billingToggle = document.getElementById('billing-toggle');
    const billingPeriodLabel = document.getElementById('billing-period-label');
    const tierBadge = document.getElementById('tier-badge');
    const tierDesc = document.getElementById('tier-description');

    // Prices & Metrics
    const totalPriceEl = document.getElementById('total-price-val');
    const basePriceEl = document.getElementById('base-price-val');
    const volumeDiscountEl = document.getElementById('volume-discount-val');
    const annualDiscountEl = document.getElementById('annual-discount-val');
    const totalSavingsEl = document.getElementById('total-savings-val');
    const monthlyEquivEl = document.getElementById('monthly-equiv-row');
    const monthlyEquivVal = document.getElementById('monthly-equiv-val');

    // Breakdown Elements
    const costEstatesEl = document.getElementById('cost-estates');
    const costFlightEl = document.getElementById('cost-flight-hours');
    const costSecurityEl = document.getElementById('cost-security');
    const costYachtEl = document.getElementById('cost-yacht-days');
    const costLifestyleEl = document.getElementById('cost-lifestyle');

    // SVG Donut Segments
    const donutEstates = document.getElementById('donut-segment-estates');
    const donutFlight = document.getElementById('donut-segment-flight');
    const donutSecurity = document.getElementById('donut-segment-security');
    const donutYacht = document.getElementById('donut-segment-yacht');
    const donutLifestyle = document.getElementById('donut-segment-lifestyle');

    // Modal & Export Elements
    const openQuoteModalBtn = document.getElementById('btn-open-quote-modal');
    const quoteModal = document.getElementById('vip-quote-modal');
    const closeModalBtn = document.getElementById('btn-close-modal');
    const exportJsonBtn = document.getElementById('btn-export-json');
    const exportPdfBtn = document.getElementById('btn-export-pdf');

    // Budget Optimizer Inputs
    const budgetInput = document.getElementById('budget-input');
    const optimizeBudgetBtn = document.getElementById('btn-optimize-budget');
    const budgetNotice = document.getElementById('budget-notice');

    let latestQuote = null;

    function formatCurrency(amount) {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function updateUI() {
      if (!estatesSlider || !flightSlider || !securitySlider || !yachtSlider) return;

      const estates = Number(estatesSlider.value);
      const flightHours = Number(flightSlider.value);
      const securityOperatives = Number(securitySlider.value);
      const yachtDays = Number(yachtSlider.value);
      const lifestyleRetainers = lifestyleSlider ? Number(lifestyleSlider.value) : 1;
      const assets = assetsSlider ? Number(assetsSlider.value) : 3500000;
      const isAnnual = billingToggle?.checked ?? false;
      const billingFrequency = isAnnual ? 'annual' : 'monthly';

      if (estatesVal) estatesVal.textContent = `${estates} Managed Estates`;
      if (flightVal) flightVal.textContent = `${flightHours} Flight Hours / mo`;
      if (securityVal) securityVal.textContent = `${securityOperatives} Close-Protection Details`;
      if (yachtVal) yachtVal.textContent = `${yachtDays} Charter Days / mo`;
      if (lifestyleVal) lifestyleVal.textContent = `${lifestyleRetainers} Bespoke Retainers`;
      if (assetsVal) assetsVal.textContent = formatCurrency(assets);

      if (billingPeriodLabel) {
        billingPeriodLabel.textContent = isAnnual ? '/ year (15% annual savings applied)' : '/ month';
      }

      latestQuote = engine.calculatePricing({
        estates,
        flightHours,
        securityOperatives,
        yachtDays,
        lifestyleRetainers,
        assets,
        billingFrequency
      });

      if (tierBadge) {
        tierBadge.textContent = latestQuote.tier.badge;
        tierBadge.className = `tier-badge tier-${latestQuote.tier.id}`;
      }
      if (tierDesc) {
        tierDesc.textContent = latestQuote.tier.description;
      }

      if (totalPriceEl) totalPriceEl.textContent = formatCurrency(latestQuote.totalCost);
      if (basePriceEl) basePriceEl.textContent = formatCurrency(latestQuote.subtotal);
      if (volumeDiscountEl) volumeDiscountEl.textContent = `-${formatCurrency(latestQuote.volumeDiscountAmount)} (${latestQuote.volumeDiscountPercent}%)`;
      if (annualDiscountEl) annualDiscountEl.textContent = `-${formatCurrency(latestQuote.annualDiscountAmount)}`;
      if (totalSavingsEl) totalSavingsEl.textContent = `-${formatCurrency(latestQuote.totalDiscountAmount)}`;

      if (monthlyEquivEl && monthlyEquivVal) {
        if (isAnnual) {
          monthlyEquivEl.style.display = 'flex';
          monthlyEquivVal.textContent = `${formatCurrency(latestQuote.monthlyEquivalent)} / month`;
        } else {
          monthlyEquivEl.style.display = 'none';
        }
      }

      if (costEstatesEl) costEstatesEl.textContent = formatCurrency(latestQuote.breakdown.estates);
      if (costFlightEl) costFlightEl.textContent = formatCurrency(latestQuote.breakdown.flightHours);
      if (costSecurityEl) costSecurityEl.textContent = formatCurrency(latestQuote.breakdown.securityOperatives);
      if (costYachtEl) costYachtEl.textContent = formatCurrency(latestQuote.breakdown.yachtDays);
      if (costLifestyleEl) costLifestyleEl.textContent = formatCurrency(latestQuote.breakdown.lifestyleRetainers);

      // SVG Donut calculation: circumference = 2 * PI * 45 ≈ 282.743
      const sum = (
        latestQuote.breakdown.estates +
        latestQuote.breakdown.flightHours +
        latestQuote.breakdown.securityOperatives +
        latestQuote.breakdown.yachtDays +
        latestQuote.breakdown.lifestyleRetainers
      ) || 1;

      const pE = latestQuote.breakdown.estates / sum;
      const pF = latestQuote.breakdown.flightHours / sum;
      const pS = latestQuote.breakdown.securityOperatives / sum;
      const pY = latestQuote.breakdown.yachtDays / sum;
      const pL = latestQuote.breakdown.lifestyleRetainers / sum;

      const circ = 282.743;
      const dE = pE * circ;
      const dF = pF * circ;
      const dS = pS * circ;
      const dY = pY * circ;
      const dL = pL * circ;

      if (donutEstates) {
        donutEstates.style.strokeDasharray = `${dE} ${circ}`;
        donutEstates.style.strokeDashoffset = '0';
      }
      if (donutFlight) {
        donutFlight.style.strokeDasharray = `${dF} ${circ}`;
        donutFlight.style.strokeDashoffset = `-${dE}`;
      }
      if (donutSecurity) {
        donutSecurity.style.strokeDasharray = `${dS} ${circ}`;
        donutSecurity.style.strokeDashoffset = `-${dE + dF}`;
      }
      if (donutYacht) {
        donutYacht.style.strokeDasharray = `${dY} ${circ}`;
        donutYacht.style.strokeDashoffset = `-${dE + dF + dS}`;
      }
      if (donutLifestyle) {
        donutLifestyle.style.strokeDasharray = `${dL} ${circ}`;
        donutLifestyle.style.strokeDashoffset = `-${dE + dF + dS + dY}`;
      }
    }

    // Modal populate function
    function populateModal(quote) {
      if (!quote) return;
      const qId = document.getElementById('modal-quote-id');
      const qDate = document.getElementById('modal-quote-date');
      const qTier = document.getElementById('modal-quote-tier');
      const qBilling = document.getElementById('modal-quote-billing');
      const qEstates = document.getElementById('modal-row-estates');
      const qFlight = document.getElementById('modal-row-flight');
      const qSecurity = document.getElementById('modal-row-security');
      const qYacht = document.getElementById('modal-row-yacht');
      const qLifestyle = document.getElementById('modal-row-lifestyle');
      const qSubtotal = document.getElementById('modal-subtotal');
      const qVolDiscount = document.getElementById('modal-vol-discount');
      const qAnnualSavings = document.getElementById('modal-annual-savings');
      const qTotal = document.getElementById('modal-total');

      if (qId) qId.textContent = quote.quoteId;
      if (qDate) qDate.textContent = new Date(quote.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      if (qTier) qTier.textContent = quote.tier.name;
      if (qBilling) qBilling.textContent = quote.billingFrequency === 'annual' ? 'Annual Commitment (12 Months)' : 'Monthly Concierge Retainer';

      if (qEstates) qEstates.textContent = `${quote.inputs.estates} estates (${formatCurrency(quote.breakdown.estates)})`;
      if (qFlight) qFlight.textContent = `${quote.inputs.flightHours} hrs (${formatCurrency(quote.breakdown.flightHours)})`;
      if (qSecurity) qSecurity.textContent = `${quote.inputs.securityOperatives} details (${formatCurrency(quote.breakdown.securityOperatives)})`;
      if (qYacht) qYacht.textContent = `${quote.inputs.yachtDays} days (${formatCurrency(quote.breakdown.yachtDays)})`;
      if (qLifestyle) qLifestyle.textContent = `${quote.inputs.lifestyleRetainers} retainers (${formatCurrency(quote.breakdown.lifestyleRetainers)})`;

      if (qSubtotal) qSubtotal.textContent = formatCurrency(quote.subtotal);
      if (qVolDiscount) qVolDiscount.textContent = `-${formatCurrency(quote.volumeDiscountAmount)} (${quote.volumeDiscountPercent}%)`;
      if (qAnnualSavings) qAnnualSavings.textContent = `-${formatCurrency(quote.annualDiscountAmount)}`;
      if (qTotal) qTotal.textContent = formatCurrency(quote.totalCost);
    }

    // Event listeners
    [estatesSlider, flightSlider, securitySlider, yachtSlider, lifestyleSlider, assetsSlider].forEach(slider => {
      slider?.addEventListener('input', updateUI);
    });

    billingToggle?.addEventListener('change', updateUI);

    openQuoteModalBtn?.addEventListener('click', () => {
      if (!latestQuote) updateUI();
      populateModal(latestQuote);
      if (quoteModal) quoteModal.hidden = false;
    });

    closeModalBtn?.addEventListener('click', () => {
      if (quoteModal) quoteModal.hidden = true;
    });

    quoteModal?.addEventListener('click', (e) => {
      if (e.target === quoteModal) quoteModal.hidden = true;
    });

    exportJsonBtn?.addEventListener('click', () => {
      if (!latestQuote) return;
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(latestQuote, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `luxury-realms-quote-${latestQuote.quoteId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });

    exportPdfBtn?.addEventListener('click', () => {
      window.print();
    });

    // Budget Optimizer Button
    optimizeBudgetBtn?.addEventListener('click', () => {
      const budgetVal = Number(budgetInput?.value);
      if (!budgetVal || budgetVal <= 0) {
        if (budgetNotice) {
          budgetNotice.textContent = 'Please enter a valid positive target budget.';
          budgetNotice.className = 'budget-notice alert-error';
        }
        return;
      }

      try {
        const isAnnual = billingToggle?.checked ?? false;
        const optResult = engine.optimizeAllocation(budgetVal, {
          minEstates: 1,
          minFlightHours: 5,
          minSecurityOperatives: 1,
          billingFrequency: isAnnual ? 'annual' : 'monthly',
          assets: assetsSlider ? Number(assetsSlider.value) : 3500000
        });

        if (optResult.feasible) {
          if (estatesSlider) estatesSlider.value = String(optResult.allocatedServices.estates);
          if (flightSlider) flightSlider.value = String(optResult.allocatedServices.flightHours);
          if (securitySlider) securitySlider.value = String(optResult.allocatedServices.securityOperatives);
          if (yachtSlider) yachtSlider.value = String(optResult.allocatedServices.yachtDays);
          if (lifestyleSlider) lifestyleSlider.value = String(optResult.allocatedServices.lifestyleRetainers);

          updateUI();

          if (budgetNotice) {
            budgetNotice.textContent = `Optimized: ${formatCurrency(optResult.quote.totalCost)} (${optResult.utilizationPercent}% utilization, ${formatCurrency(optResult.remainingBudget)} reserve remaining).`;
            budgetNotice.className = 'budget-notice alert-success';
          }
        } else {
          if (budgetNotice) {
            budgetNotice.textContent = `Budget insufficient for baseline concierge requirements. Deficit: ${formatCurrency(optResult.deficit)}.`;
            budgetNotice.className = 'budget-notice alert-error';
          }
        }
      } catch (err) {
        if (budgetNotice) {
          budgetNotice.textContent = err.message;
          budgetNotice.className = 'budget-notice alert-error';
        }
      }
    });

    updateUI();
  });
}
