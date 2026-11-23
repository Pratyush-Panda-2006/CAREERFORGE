/**
 * Nonprofit Impact - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2084 - NSoC '26 Level 3 Feature
 * 
 * Modular engine modeling multi-tiered nonprofit resource allocations,
 * 501(c)(3) tax-exempt subsidies, volume scale discounts, grant allowance offsets,
 * and automated allocation budget optimization.
 */

export const RESOURCES = Object.freeze({
  donors: Object.freeze({
    id: 'donors',
    label: 'Donor CRM Capacity',
    unit: 'active donor profiles',
    shortUnit: 'donors',
    description: 'Cloud CRM profiles, automated tax receipts & recurring gift management'
  }),
  volunteers: Object.freeze({
    id: 'volunteers',
    label: 'Volunteer Coordinator Accounts',
    unit: 'coordinator seats',
    shortUnit: 'seats',
    description: 'Field mobilization tools, dispatch rosters & background check verification'
  }),
  notifications: Object.freeze({
    id: 'notifications',
    label: 'Email & SMS Broadcast Credits',
    unit: 'urgent broadcasts',
    shortUnit: 'broadcasts',
    description: 'Disaster mobilization alerts, community broadcasts & monthly donor newsletters'
  }),
  storage: Object.freeze({
    id: 'storage',
    label: 'Secure Cloud & Media Storage',
    unit: 'GB impact data',
    shortUnit: 'GB',
    description: 'Satellite reforestation imagery, legal grants archive & compliance documents'
  }),
  telemetry: Object.freeze({
    id: 'telemetry',
    label: 'Aid Campaign Telemetry',
    unit: 'GB field bandwidth',
    shortUnit: 'GB bandwidth',
    description: 'Real-time GPS drone mapping, IoT soil/canopy sensor feeds & field dispatch'
  })
});

export const NONPROFIT_TIERS = Object.freeze({
  grassroots: Object.freeze({
    id: 'grassroots',
    name: 'Grassroots Initiative',
    badge: 'Tier 1 • Grassroots',
    tagline: 'Ideal for local community collectives, seed banks & emergent tree nurseries',
    maxLimits: Object.freeze({
      donors: 1000,
      volunteers: 10,
      notifications: 5000,
      storage: 50,
      telemetry: 100
    }),
    rates: Object.freeze({
      donors: 0.025,       // $0.025 / donor profile / mo
      volunteers: 5.00,    // $5.00 / coordinator account / mo
      notifications: 0.005, // $0.005 / broadcast message / mo
      storage: 0.12,       // $0.12 / GB storage / mo
      telemetry: 0.18      // $0.18 / GB bandwidth / mo
    }),
    volumeDiscountRate: 0.0,   // 0% volume discount
    subsidyDiscountRate: 0.25  // 25% 501(c)(3) tax-exempt subsidy
  }),
  community: Object.freeze({
    id: 'community',
    name: 'Community Alliance',
    badge: 'Tier 2 • Community',
    tagline: 'Expanding regional conservancies with multi-district volunteer networks',
    maxLimits: Object.freeze({
      donors: 5000,
      volunteers: 50,
      notifications: 25000,
      storage: 250,
      telemetry: 500
    }),
    rates: Object.freeze({
      donors: 0.020,
      volunteers: 4.00,
      notifications: 0.004,
      storage: 0.10,
      telemetry: 0.14
    }),
    volumeDiscountRate: 0.10,  // 10% volume discount
    subsidyDiscountRate: 0.30  // 30% 501(c)(3) tax-exempt subsidy
  }),
  regional: Object.freeze({
    id: 'regional',
    name: 'Regional NGO',
    badge: 'Tier 3 • Regional NGO',
    tagline: 'Multi-state environmental conservation & habitat restoration operations',
    maxLimits: Object.freeze({
      donors: 25000,
      volunteers: 200,
      notifications: 100000,
      storage: 1000,
      telemetry: 2500
    }),
    rates: Object.freeze({
      donors: 0.015,
      volunteers: 3.00,
      notifications: 0.003,
      storage: 0.08,
      telemetry: 0.10
    }),
    volumeDiscountRate: 0.18,  // 18% volume discount
    subsidyDiscountRate: 0.35  // 35% 501(c)(3) tax-exempt subsidy
  }),
  global: Object.freeze({
    id: 'global',
    name: 'Global Relief',
    badge: 'Tier 4 • Global Relief',
    tagline: 'International disaster response & global planetary ecosystem alliances',
    maxLimits: Object.freeze({
      donors: Infinity,
      volunteers: Infinity,
      notifications: Infinity,
      storage: Infinity,
      telemetry: Infinity
    }),
    rates: Object.freeze({
      donors: 0.010,
      volunteers: 2.00,
      notifications: 0.002,
      storage: 0.05,
      telemetry: 0.07
    }),
    volumeDiscountRate: 0.25,  // 25% volume discount
    subsidyDiscountRate: 0.40  // 40% 501(c)(3) tax-exempt subsidy
  })
});

export class NonprofitImpactCostOptimizerEngine {
  #listeners;
  #lastQuote;

  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.annualDiscountRate = 0.20; // 20% annual commitment discount

    this.#listeners = new Map();
    this.#lastQuote = null;

    this.currentInputs = {
      donors: this.sanitizeInput(initialConfig.donors ?? 1200),
      volunteers: this.sanitizeInput(initialConfig.volunteers ?? 15),
      notifications: this.sanitizeInput(initialConfig.notifications ?? 8000),
      storage: this.sanitizeInput(initialConfig.storage ?? 80),
      telemetry: this.sanitizeInput(initialConfig.telemetry ?? 150),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly',
      isNonprofitVerified: initialConfig.isNonprofitVerified !== false,
      grantAllowance: this.sanitizeFloat(initialConfig.grantAllowance ?? 0)
    };
  }

  // --- Input Sanitizers ---

  sanitizeInput(val, fallback = 0) {
    if (val === null || val === undefined || typeof val === 'boolean') return fallback;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return fallback;
    return Math.floor(num);
  }

  sanitizeFloat(val, fallback = 0) {
    if (val === null || val === undefined || typeof val === 'boolean') return fallback;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return fallback;
    return Math.round(num * 100) / 100;
  }

  // --- Event Emitter Pattern (on, off, emit) ---

  on(eventName, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError(`Listener for event "${eventName}" must be a function.`);
    }
    if (!this.#listeners.has(eventName)) {
      this.#listeners.set(eventName, new Set());
    }
    this.#listeners.get(eventName).add(listener);

    // Return unsubscribe function for convenience
    return () => this.off(eventName, listener);
  }

  off(eventName, listener) {
    if (!this.#listeners.has(eventName)) return false;
    const set = this.#listeners.get(eventName);
    const removed = set.delete(listener);
    if (set.size === 0) {
      this.#listeners.delete(eventName);
    }
    return removed;
  }

  emit(eventName, data) {
    if (!this.#listeners.has(eventName)) return false;
    const listeners = [...this.#listeners.get(eventName)];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (err) {
        // Safe dispatch: log error without breaking execution
        if (typeof console !== 'undefined' && console.error) {
          console.error(`Error in event listener for "${eventName}":`, err);
        }
      }
    }
    return true;
  }

  listenerCount(eventName) {
    return this.#listeners.get(eventName)?.size ?? 0;
  }

  // --- Tier Determination ---

  determineTier(inputs = {}) {
    if (inputs.tier && NONPROFIT_TIERS[inputs.tier]) {
      return NONPROFIT_TIERS[inputs.tier];
    }

    const donors = this.sanitizeInput(inputs.donors ?? this.currentInputs.donors);
    const volunteers = this.sanitizeInput(inputs.volunteers ?? this.currentInputs.volunteers);
    const notifications = this.sanitizeInput(inputs.notifications ?? this.currentInputs.notifications);
    const storage = this.sanitizeInput(inputs.storage ?? this.currentInputs.storage);
    const telemetry = this.sanitizeInput(inputs.telemetry ?? this.currentInputs.telemetry);

    const fits = (tier) => (
      donors <= tier.maxLimits.donors &&
      volunteers <= tier.maxLimits.volunteers &&
      notifications <= tier.maxLimits.notifications &&
      storage <= tier.maxLimits.storage &&
      telemetry <= tier.maxLimits.telemetry
    );

    if (fits(NONPROFIT_TIERS.grassroots)) return NONPROFIT_TIERS.grassroots;
    if (fits(NONPROFIT_TIERS.community)) return NONPROFIT_TIERS.community;
    if (fits(NONPROFIT_TIERS.regional)) return NONPROFIT_TIERS.regional;
    return NONPROFIT_TIERS.global;
  }

  // --- Volume Discount ---

  applyVolumeDiscount(tierOrId, baseCost = 0) {
    const tier = typeof tierOrId === 'string'
      ? NONPROFIT_TIERS[tierOrId] || NONPROFIT_TIERS.grassroots
      : tierOrId || NONPROFIT_TIERS.grassroots;

    const rate = tier?.volumeDiscountRate || 0;
    const sanitizedCost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(sanitizedCost * rate * 100) / 100;
    const netCost = Math.max(0, Math.round((sanitizedCost - discountAmount) * 100) / 100);

    return {
      tierId: tier.id,
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      discountAmount,
      netCost
    };
  }

  // --- Core Pricing Calculator ---

  calculatePricing(inputs = {}) {
    const donors = this.sanitizeInput(inputs.donors ?? this.currentInputs.donors);
    const volunteers = this.sanitizeInput(inputs.volunteers ?? this.currentInputs.volunteers);
    const notifications = this.sanitizeInput(inputs.notifications ?? this.currentInputs.notifications);
    const storage = this.sanitizeInput(inputs.storage ?? this.currentInputs.storage);
    const telemetry = this.sanitizeInput(inputs.telemetry ?? this.currentInputs.telemetry);

    const billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';
    const isNonprofitVerified = inputs.isNonprofitVerified !== undefined
      ? Boolean(inputs.isNonprofitVerified)
      : this.currentInputs.isNonprofitVerified;

    const grantAllowance = this.sanitizeFloat(inputs.grantAllowance ?? this.currentInputs.grantAllowance);

    const tier = this.determineTier({ donors, volunteers, notifications, storage, telemetry, tier: inputs.tier });

    // Monthly baseline resource costs
    const monthlyDonorsCost = Math.round(donors * tier.rates.donors * 100) / 100;
    const monthlyVolunteersCost = Math.round(volunteers * tier.rates.volunteers * 100) / 100;
    const monthlyNotificationsCost = Math.round(notifications * tier.rates.notifications * 100) / 100;
    const monthlyStorageCost = Math.round(storage * tier.rates.storage * 100) / 100;
    const monthlyTelemetryCost = Math.round(telemetry * tier.rates.telemetry * 100) / 100;

    const monthlyBaseCost = Math.round(
      (monthlyDonorsCost + monthlyVolunteersCost + monthlyNotificationsCost + monthlyStorageCost + monthlyTelemetryCost) * 100
    ) / 100;

    const isAnnual = billingFrequency === 'annual';
    const billingMultiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * billingMultiplier * 100) / 100;

    // 1. Volume Scale Discount
    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const volumeDiscountAmount = volumeDiscount.discountAmount;
    const costAfterVolumeDiscount = Math.round((subtotal - volumeDiscountAmount) * 100) / 100;

    // 2. 501(c)(3) Nonprofit Verified Subsidy Discount
    const subsidyDiscountRate = isNonprofitVerified ? tier.subsidyDiscountRate : 0.0;
    const subsidyDiscountAmount = isNonprofitVerified
      ? Math.round(costAfterVolumeDiscount * subsidyDiscountRate * 100) / 100
      : 0;
    const costAfterSubsidy = Math.round((costAfterVolumeDiscount - subsidyDiscountAmount) * 100) / 100;

    // 3. Annual Commitment Discount (applied after nonprofit subsidies for compounded relief)
    const annualDiscountAmount = isAnnual
      ? Math.round(costAfterSubsidy * this.annualDiscountRate * 100) / 100
      : 0;
    const costAfterAnnual = Math.round((costAfterSubsidy - annualDiscountAmount) * 100) / 100;

    const totalDiscountAmount = Math.round((volumeDiscountAmount + subsidyDiscountAmount + annualDiscountAmount) * 100) / 100;
    const grossCost = costAfterAnnual;

    // 4. Grant Allowance Offset
    const grantOffsetApplied = Math.min(grantAllowance, grossCost);
    const grantRemaining = Math.round((grantAllowance - grantOffsetApplied) * 100) / 100;
    const totalCost = Math.max(0, Math.round((grossCost - grantOffsetApplied) * 100) / 100);

    // Cost Breakdown per resource (scaled by billing frequency)
    const breakdown = {
      donors: Math.round(monthlyDonorsCost * billingMultiplier * 100) / 100,
      volunteers: Math.round(monthlyVolunteersCost * billingMultiplier * 100) / 100,
      notifications: Math.round(monthlyNotificationsCost * billingMultiplier * 100) / 100,
      storage: Math.round(monthlyStorageCost * billingMultiplier * 100) / 100,
      telemetry: Math.round(monthlyTelemetryCost * billingMultiplier * 100) / 100
    };

    const quote = {
      inputs: {
        donors,
        volunteers,
        notifications,
        storage,
        telemetry
      },
      billingFrequency,
      billingMultiplier,
      isNonprofitVerified,
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        tagline: tier.tagline,
        volumeDiscountRate: tier.volumeDiscountRate,
        volumeDiscountPercent: Math.round(tier.volumeDiscountRate * 100),
        subsidyDiscountRate: tier.subsidyDiscountRate,
        subsidyDiscountPercent: Math.round(tier.subsidyDiscountRate * 100),
        rates: { ...tier.rates },
        maxLimits: { ...tier.maxLimits }
      },
      rates: { ...tier.rates },
      breakdown,
      monthlyBaseCost,
      subtotal,
      baseCost: subtotal,
      volumeDiscountAmount,
      subsidyDiscountAmount,
      subsidyDiscountRate,
      subsidyDiscountPercent: Math.round(subsidyDiscountRate * 100),
      annualDiscountRate: this.annualDiscountRate,
      annualDiscountPercent: Math.round(this.annualDiscountRate * 100),
      annualDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      grossCost,
      grantAllowance,
      grantOffsetApplied,
      grantRemaining,
      totalCost,
      monthlyEquivalentCost: isAnnual ? Math.round((totalCost / 12) * 100) / 100 : totalCost,
      calculatedAt: new Date().toISOString()
    };

    this.emit('pricingCalculated', quote);
    return quote;
  }

  // --- Quote Generator ---

  generateQuote(options = null) {
    if (options && typeof options === 'object') {
      if (options.donors !== undefined) this.currentInputs.donors = this.sanitizeInput(options.donors);
      if (options.volunteers !== undefined) this.currentInputs.volunteers = this.sanitizeInput(options.volunteers);
      if (options.notifications !== undefined) this.currentInputs.notifications = this.sanitizeInput(options.notifications);
      if (options.storage !== undefined) this.currentInputs.storage = this.sanitizeInput(options.storage);
      if (options.telemetry !== undefined) this.currentInputs.telemetry = this.sanitizeInput(options.telemetry);
      if (options.billingFrequency !== undefined) {
        this.currentInputs.billingFrequency = options.billingFrequency === 'annual' ? 'annual' : 'monthly';
      }
      if (options.isNonprofitVerified !== undefined) {
        this.currentInputs.isNonprofitVerified = Boolean(options.isNonprofitVerified);
      }
      if (options.grantAllowance !== undefined) {
        this.currentInputs.grantAllowance = this.sanitizeFloat(options.grantAllowance);
      }
    }

    const pricing = this.calculatePricing(this.currentInputs);

    // Format quote metadata & identification
    const timestamp = Date.now();
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    const quoteId = `TI-OPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomHex}`;

    const validUntil = new Date(timestamp + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const fullQuote = {
      ...pricing,
      quoteId,
      referenceCode: quoteId,
      organizationName: options?.organizationName || 'TerraInitia Environmental Alliance',
      ein: options?.ein || '501(c)(3) Verified',
      validUntil,
      status: 'active_guaranteed'
    };

    this.#lastQuote = fullQuote;
    this.emit('quoteGenerated', fullQuote);
    return fullQuote;
  }

  getLastQuote() {
    return this.#lastQuote || this.generateQuote();
  }

  // --- Dynamic Resource Allocation Optimizer ---

  optimizeAllocation(targetBudget, requiredNeeds = {}) {
    const budget = this.sanitizeFloat(targetBudget);
    const billingFrequency = requiredNeeds.billingFrequency === 'annual' ? 'annual' : 'monthly';
    const isNonprofitVerified = requiredNeeds.isNonprofitVerified !== false;
    const grantAllowance = this.sanitizeFloat(requiredNeeds.grantAllowance ?? 0);

    if (budget <= 0 && grantAllowance <= 0) {
      return {
        targetBudget: budget,
        fitsBudget: true,
        recommendedTier: NONPROFIT_TIERS.grassroots.id,
        allocation: { donors: 0, volunteers: 0, notifications: 0, storage: 0, telemetry: 0 },
        estimatedCost: 0,
        budgetDifference: 0,
        quote: this.calculatePricing({
          donors: 0,
          volunteers: 0,
          notifications: 0,
          storage: 0,
          telemetry: 0,
          billingFrequency,
          isNonprofitVerified,
          grantAllowance
        })
      };
    }

    // Baseline minimum needs or defaults
    const minDonors = this.sanitizeInput(requiredNeeds.donors ?? 500);
    const minVolunteers = this.sanitizeInput(requiredNeeds.volunteers ?? 5);
    const minNotifications = this.sanitizeInput(requiredNeeds.notifications ?? 2000);
    const minStorage = this.sanitizeInput(requiredNeeds.storage ?? 20);
    const minTelemetry = this.sanitizeInput(requiredNeeds.telemetry ?? 50);

    // Test baseline pricing
    const baselinePricing = this.calculatePricing({
      donors: minDonors,
      volunteers: minVolunteers,
      notifications: minNotifications,
      storage: minStorage,
      telemetry: minTelemetry,
      billingFrequency,
      isNonprofitVerified,
      grantAllowance
    });

    let bestAllocation = {
      donors: minDonors,
      volunteers: minVolunteers,
      notifications: minNotifications,
      storage: minStorage,
      telemetry: minTelemetry
    };

    let bestQuote = baselinePricing;

    // Effective spending ceiling
    const availableFunds = budget;

    if (baselinePricing.totalCost > availableFunds) {
      // Scale down proportionally to fit budget while keeping at least 1 unit
      const ratio = Math.max(0.1, availableFunds / (baselinePricing.totalCost || 1));
      bestAllocation = {
        donors: Math.max(100, Math.floor(minDonors * ratio)),
        volunteers: Math.max(1, Math.floor(minVolunteers * ratio)),
        notifications: Math.max(500, Math.floor(minNotifications * ratio)),
        storage: Math.max(5, Math.floor(minStorage * ratio)),
        telemetry: Math.max(10, Math.floor(minTelemetry * ratio))
      };
      bestQuote = this.calculatePricing({
        ...bestAllocation,
        billingFrequency,
        isNonprofitVerified,
        grantAllowance
      });
    } else {
      // We have surplus budget: optimize resource allocation across priority weights
      // Priority weights: Donors (35%), Broadcasts (25%), Storage (15%), Telemetry (15%), Volunteers (10%)
      const weights = {
        donors: 0.35,
        notifications: 0.25,
        storage: 0.15,
        telemetry: 0.15,
        volunteers: 0.10
      };

      // Binary search expansion factor
      let low = 1.0;
      let high = 50.0;
      let optimalFactor = 1.0;

      for (let step = 0; step < 24; step++) {
        const mid = (low + high) / 2;
        const candidateAllocation = {
          donors: Math.floor(minDonors * (1 + (mid - 1) * (weights.donors / 0.2))),
          volunteers: Math.floor(minVolunteers * (1 + (mid - 1) * (weights.volunteers / 0.2))),
          notifications: Math.floor(minNotifications * (1 + (mid - 1) * (weights.notifications / 0.2))),
          storage: Math.floor(minStorage * (1 + (mid - 1) * (weights.storage / 0.2))),
          telemetry: Math.floor(minTelemetry * (1 + (mid - 1) * (weights.telemetry / 0.2)))
        };

        const testPricing = this.calculatePricing({
          ...candidateAllocation,
          billingFrequency,
          isNonprofitVerified,
          grantAllowance
        });

        if (testPricing.totalCost <= availableFunds) {
          optimalFactor = mid;
          bestAllocation = candidateAllocation;
          bestQuote = testPricing;
          low = mid;
        } else {
          high = mid;
        }
      }
    }

    const result = {
      targetBudget: budget,
      availableFunds,
      recommendedTier: bestQuote.tier.id,
      recommendedTierName: bestQuote.tier.name,
      allocation: bestAllocation,
      estimatedCost: bestQuote.totalCost,
      budgetDifference: Math.round((budget - bestQuote.totalCost) * 100) / 100,
      fitsBudget: bestQuote.totalCost <= budget,
      quote: bestQuote
    };

    this.emit('allocationOptimized', result);
    return result;
  }
}

// --- Browser DOM Binding & Interactive Mounting ---
export function mountCostOptimizer(rootElement = document) {
  if (!rootElement) return null;

  const engine = new NonprofitImpactCostOptimizerEngine();

  // Slider Elements
  const sliderDonors = rootElement.querySelector('#slider-donors');
  const sliderVolunteers = rootElement.querySelector('#slider-volunteers');
  const sliderNotifications = rootElement.querySelector('#slider-notifications');
  const sliderStorage = rootElement.querySelector('#slider-storage');
  const sliderTelemetry = rootElement.querySelector('#slider-telemetry');

  // Value Display Elements
  const valDonors = rootElement.querySelector('#val-donors');
  const valVolunteers = rootElement.querySelector('#val-volunteers');
  const valNotifications = rootElement.querySelector('#val-notifications');
  const valStorage = rootElement.querySelector('#val-storage');
  const valTelemetry = rootElement.querySelector('#val-telemetry');

  // Controls & Toggles
  const billingToggle = rootElement.querySelector('#billing-toggle');
  const billingCycleLabel = rootElement.querySelector('#billing-cycle-text');
  const subsidyToggle = rootElement.querySelector('#subsidy-toggle');
  const sliderGrant = rootElement.querySelector('#slider-grant');
  const valGrant = rootElement.querySelector('#val-grant');

  // Pricing & Metrics Outputs
  const tierBadge = rootElement.querySelector('#tier-badge');
  const tierTagline = rootElement.querySelector('#tier-tagline');
  const totalPriceVal = rootElement.querySelector('#total-price-val');
  const pricePeriodLabel = rootElement.querySelector('#price-period-label');
  const basePriceVal = rootElement.querySelector('#base-price-val');
  const discountPriceVal = rootElement.querySelector('#discount-price-val');
  const grantAppliedVal = rootElement.querySelector('#grant-applied-val');
  const grantMeterFill = rootElement.querySelector('#grant-meter-fill');
  const grantCoverageText = rootElement.querySelector('#grant-coverage-text');

  // Breakdown Amounts
  const costDonorsEl = rootElement.querySelector('#cost-donors');
  const costVolunteersEl = rootElement.querySelector('#cost-volunteers');
  const costNotificationsEl = rootElement.querySelector('#cost-notifications');
  const costStorageEl = rootElement.querySelector('#cost-storage');
  const costTelemetryEl = rootElement.querySelector('#cost-telemetry');

  // Donut SVG Segments
  const donutDonors = rootElement.querySelector('#donut-seg-donors');
  const donutVolunteers = rootElement.querySelector('#donut-seg-volunteers');
  const donutNotifications = rootElement.querySelector('#donut-seg-notifications');
  const donutStorage = rootElement.querySelector('#donut-seg-storage');
  const donutTelemetry = rootElement.querySelector('#donut-seg-telemetry');

  // Modal / Quote Elements
  const btnGenerateQuote = rootElement.querySelector('#btn-generate-quote');
  const quoteModal = rootElement.querySelector('#quote-modal');
  const quoteModalClose = rootElement.querySelector('#quote-modal-close');
  const quoteModalPrint = rootElement.querySelector('#quote-modal-print');
  const quoteModalCopy = rootElement.querySelector('#quote-modal-copy');
  const quoteDetailsBox = rootElement.querySelector('#quote-details-box');

  // Budget Optimizer Elements
  const budgetInput = rootElement.querySelector('#target-budget-input');
  const btnOptimize = rootElement.querySelector('#btn-optimize-budget');
  const optimizerResultBox = rootElement.querySelector('#optimizer-result-box');

  // Preset Buttons
  const presetButtons = rootElement.querySelectorAll('[data-preset]');

  function formatMoney(amount) {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function render(quote) {
    if (!quote) return;

    if (valDonors) valDonors.textContent = `${quote.inputs.donors.toLocaleString('en-US')} profiles`;
    if (valVolunteers) valVolunteers.textContent = `${quote.inputs.volunteers.toLocaleString('en-US')} coordinators`;
    if (valNotifications) valNotifications.textContent = `${quote.inputs.notifications.toLocaleString('en-US')} msgs/mo`;
    if (valStorage) valStorage.textContent = `${quote.inputs.storage.toLocaleString('en-US')} GB`;
    if (valTelemetry) valTelemetry.textContent = `${quote.inputs.telemetry.toLocaleString('en-US')} GB`;

    if (valGrant) valGrant.textContent = formatMoney(quote.grantAllowance);

    if (billingCycleLabel) {
      billingCycleLabel.textContent = quote.billingFrequency === 'annual'
        ? 'Annual Billing (20% commitment relief applied)'
        : 'Monthly Billing';
    }

    if (tierBadge) {
      tierBadge.textContent = quote.tier.badge;
      tierBadge.className = `tier-badge tier-${quote.tier.id}`;
    }

    if (tierTagline) {
      tierTagline.textContent = quote.tier.tagline;
    }

    if (totalPriceVal) {
      totalPriceVal.textContent = formatMoney(quote.totalCost);
    }

    if (pricePeriodLabel) {
      pricePeriodLabel.textContent = quote.billingFrequency === 'annual'
        ? '/ year (billed annually)'
        : '/ month';
    }

    if (basePriceVal) {
      basePriceVal.textContent = formatMoney(quote.subtotal);
    }

    if (discountPriceVal) {
      discountPriceVal.textContent = `-${formatMoney(quote.totalDiscountAmount)}`;
    }

    if (grantAppliedVal) {
      grantAppliedVal.textContent = quote.grantOffsetApplied > 0
        ? `-${formatMoney(quote.grantOffsetApplied)}`
        : '$0.00';
    }

    // Grant Allowance Meter
    if (grantMeterFill && grantCoverageText) {
      const gross = quote.grossCost || 1;
      const pct = Math.min(100, Math.round((quote.grantOffsetApplied / gross) * 100));
      grantMeterFill.style.width = `${pct}%`;
      grantCoverageText.textContent = `${pct}% covered by grants (${formatMoney(quote.grantOffsetApplied)} of ${formatMoney(gross)})`;
    }

    // Resource Breakdown Line Items
    if (costDonorsEl) costDonorsEl.textContent = formatMoney(quote.breakdown.donors);
    if (costVolunteersEl) costVolunteersEl.textContent = formatMoney(quote.breakdown.volunteers);
    if (costNotificationsEl) costNotificationsEl.textContent = formatMoney(quote.breakdown.notifications);
    if (costStorageEl) costStorageEl.textContent = formatMoney(quote.breakdown.storage);
    if (costTelemetryEl) costTelemetryEl.textContent = formatMoney(quote.breakdown.telemetry);

    // SVG Donut Visualization
    const totalResourceCost = (
      quote.breakdown.donors +
      quote.breakdown.volunteers +
      quote.breakdown.notifications +
      quote.breakdown.storage +
      quote.breakdown.telemetry
    ) || 1;

    const circumference = 2 * Math.PI * 45; // ~282.743
    const pDonors = quote.breakdown.donors / totalResourceCost;
    const pVolunteers = quote.breakdown.volunteers / totalResourceCost;
    const pNotifications = quote.breakdown.notifications / totalResourceCost;
    const pStorage = quote.breakdown.storage / totalResourceCost;
    const pTelemetry = quote.breakdown.telemetry / totalResourceCost;

    let offset = 0;
    const segments = [
      { el: donutDonors, pct: pDonors },
      { el: donutVolunteers, pct: pVolunteers },
      { el: donutNotifications, pct: pNotifications },
      { el: donutStorage, pct: pStorage },
      { el: donutTelemetry, pct: pTelemetry }
    ];

    for (const seg of segments) {
      if (seg.el) {
        const dash = seg.pct * circumference;
        seg.el.style.strokeDasharray = `${dash} ${circumference}`;
        seg.el.style.strokeDashoffset = `-${offset}`;
      }
      offset += seg.pct * circumference;
    }
  }

  function getFormInputs() {
    return {
      donors: Number(sliderDonors?.value || 1200),
      volunteers: Number(sliderVolunteers?.value || 15),
      notifications: Number(sliderNotifications?.value || 8000),
      storage: Number(sliderStorage?.value || 80),
      telemetry: Number(sliderTelemetry?.value || 150),
      billingFrequency: billingToggle?.checked ? 'annual' : 'monthly',
      isNonprofitVerified: subsidyToggle ? subsidyToggle.checked : true,
      grantAllowance: Number(sliderGrant?.value || 0)
    };
  }

  function update() {
    const inputs = getFormInputs();
    const quote = engine.calculatePricing(inputs);
    render(quote);
  }

  // Event Listeners for inputs
  sliderDonors?.addEventListener('input', update);
  sliderVolunteers?.addEventListener('input', update);
  sliderNotifications?.addEventListener('input', update);
  sliderStorage?.addEventListener('input', update);
  sliderTelemetry?.addEventListener('input', update);
  sliderGrant?.addEventListener('input', update);
  billingToggle?.addEventListener('change', update);
  subsidyToggle?.addEventListener('change', update);

  // Preset Configurations
  const presets = {
    grassroots: { donors: 800, volunteers: 6, notifications: 3500, storage: 35, telemetry: 60, isNonprofitVerified: true, grantAllowance: 25 },
    community: { donors: 3500, volunteers: 35, notifications: 18000, storage: 180, telemetry: 320, isNonprofitVerified: true, grantAllowance: 100 },
    regional: { donors: 18000, volunteers: 140, notifications: 75000, storage: 750, telemetry: 1800, isNonprofitVerified: true, grantAllowance: 500 },
    disaster: { donors: 45000, volunteers: 350, notifications: 250000, storage: 1800, telemetry: 4500, isNonprofitVerified: true, grantAllowance: 1200 }
  };

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      const preset = presets[presetKey];
      if (!preset) return;

      if (sliderDonors) sliderDonors.value = preset.donors;
      if (sliderVolunteers) sliderVolunteers.value = preset.volunteers;
      if (sliderNotifications) sliderNotifications.value = preset.notifications;
      if (sliderStorage) sliderStorage.value = preset.storage;
      if (sliderTelemetry) sliderTelemetry.value = preset.telemetry;
      if (sliderGrant) sliderGrant.value = preset.grantAllowance;
      if (subsidyToggle) subsidyToggle.checked = preset.isNonprofitVerified;

      update();
    });
  });

  // Target Budget Optimizer UI
  btnOptimize?.addEventListener('click', () => {
    const targetBudget = Number(budgetInput?.value || 150);
    const inputs = getFormInputs();
    const optResult = engine.optimizeAllocation(targetBudget, inputs);

    if (sliderDonors) sliderDonors.value = optResult.allocation.donors;
    if (sliderVolunteers) sliderVolunteers.value = optResult.allocation.volunteers;
    if (sliderNotifications) sliderNotifications.value = optResult.allocation.notifications;
    if (sliderStorage) sliderStorage.value = optResult.allocation.storage;
    if (sliderTelemetry) sliderTelemetry.value = optResult.allocation.telemetry;

    update();

    if (optimizerResultBox) {
      optimizerResultBox.innerHTML = `
        <div class="optimizer-alert success">
          <strong>Optimal Allocation Applied:</strong> Fit into ${formatMoney(optResult.estimatedCost)} ${inputs.billingFrequency} (Budget: ${formatMoney(targetBudget)}).
          Allocated: ${optResult.allocation.donors.toLocaleString()} donors, ${optResult.allocation.volunteers} coordinators, ${optResult.allocation.notifications.toLocaleString()} broadcasts.
        </div>
      `;
    }
  });

  // Modal Quote Generator
  btnGenerateQuote?.addEventListener('click', () => {
    const inputs = getFormInputs();
    const quote = engine.generateQuote(inputs);

    if (quoteDetailsBox) {
      quoteDetailsBox.innerHTML = `
        <div class="quote-sheet">
          <div class="quote-sheet-header">
            <div>
              <h3>TerraInitia Impact Infrastructure Guaranteed Quote</h3>
              <p class="quote-id">Ref Code: <strong>${quote.quoteId}</strong></p>
            </div>
            <div class="quote-stamp">501(c)(3) APPROVED</div>
          </div>
          <table class="quote-table">
            <thead>
              <tr><th>Resource Dimension</th><th>Allocation</th><th>Rate</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              <tr><td>Donor CRM Profiles</td><td>${quote.inputs.donors.toLocaleString()} profiles</td><td>$${quote.tier.rates.donors}/mo</td><td>${formatMoney(quote.breakdown.donors)}</td></tr>
              <tr><td>Volunteer Coordinator Seats</td><td>${quote.inputs.volunteers.toLocaleString()} seats</td><td>$${quote.tier.rates.volunteers}/mo</td><td>${formatMoney(quote.breakdown.volunteers)}</td></tr>
              <tr><td>Urgent SMS / Email Broadcasts</td><td>${quote.inputs.notifications.toLocaleString()} msgs</td><td>$${quote.tier.rates.notifications}/mo</td><td>${formatMoney(quote.breakdown.notifications)}</td></tr>
              <tr><td>Secure Impact Data Storage</td><td>${quote.inputs.storage.toLocaleString()} GB</td><td>$${quote.tier.rates.storage}/mo</td><td>${formatMoney(quote.breakdown.storage)}</td></tr>
              <tr><td>Aid Campaign Telemetry</td><td>${quote.inputs.telemetry.toLocaleString()} GB</td><td>$${quote.tier.rates.telemetry}/mo</td><td>${formatMoney(quote.breakdown.telemetry)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="3">List Subtotal (${quote.billingFrequency}):</td><td>${formatMoney(quote.subtotal)}</td></tr>
              <tr><td colspan="3">Volume Scale Discount (${quote.tier.volumeDiscountPercent}%):</td><td class="text-green">-${formatMoney(quote.volumeDiscountAmount)}</td></tr>
              <tr><td colspan="3">501(c)(3) Nonprofit Subsidy (${quote.subsidyDiscountPercent}%):</td><td class="text-green">-${formatMoney(quote.subsidyDiscountAmount)}</td></tr>
              ${quote.billingFrequency === 'annual' ? `<tr><td colspan="3">Annual Commitment Discount (${quote.annualDiscountPercent}%):</td><td class="text-green">-${formatMoney(quote.annualDiscountAmount)}</td></tr>` : ''}
              ${quote.grantOffsetApplied > 0 ? `<tr><td colspan="3">Direct Grant Allowance Credit:</td><td class="text-green">-${formatMoney(quote.grantOffsetApplied)}</td></tr>` : ''}
              <tr class="quote-total-row"><td colspan="3"><strong>Net Guaranteed Total Cost:</strong></td><td><strong>${formatMoney(quote.totalCost)} ${quote.billingFrequency === 'annual' ? '/ yr' : '/ mo'}</strong></td></tr>
            </tfoot>
          </table>
          <p class="quote-guarantee">Valid through ${quote.validUntil}. Guaranteed under TerraInitia Global Philanthropic Pricing Accord.</p>
        </div>
      `;
    }

    if (quoteModal) {
      quoteModal.classList.add('active');
      quoteModal.setAttribute('aria-hidden', 'false');
    }
  });

  quoteModalClose?.addEventListener('click', () => {
    if (quoteModal) {
      quoteModal.classList.remove('active');
      quoteModal.setAttribute('aria-hidden', 'true');
    }
  });

  quoteModalPrint?.addEventListener('click', () => {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  });

  quoteModalCopy?.addEventListener('click', () => {
    const quote = engine.getLastQuote();
    const text = `TerraInitia Quote Ref: ${quote.quoteId}\nTier: ${quote.tier.name}\nNet Cost: ${formatMoney(quote.totalCost)} (${quote.billingFrequency})\nStatus: 501(c)(3) Guaranteed`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (quoteModalCopy) quoteModalCopy.textContent = '✓ Copied Quote!';
        setTimeout(() => { if (quoteModalCopy) quoteModalCopy.textContent = 'Copy Reference'; }, 2000);
      });
    }
  });

  // Initial render
  update();

  return { engine, update, render };
}

// Auto-mount in browser environments
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => mountCostOptimizer(document));
  } else {
    mountCostOptimizer(document);
  }
}
