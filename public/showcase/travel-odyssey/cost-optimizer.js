/**
 * Travel Odyssey - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2072 - NSoC '26 Level 3 Feature
 * 
 * Provides dynamic resource provisioning modeling, multi-tiered GDS query tariffs,
 * volume discount thresholds, agency partner subsidies, and annual contract discounts.
 */

export const TIERS = Object.freeze({
  backpacker: Object.freeze({
    id: 'backpacker',
    name: 'Backpacker & Boutique Agency',
    badge: 'Tier 1 • Backpacker / Boutique',
    limits: Object.freeze({
      maxApiRequests: 25,
      maxFlightSearches: 10000,
      maxHotelSyncNodes: 5,
      maxMapCacheStorage: 200,
      maxFlightAlerts: 5000
    }),
    rates: Object.freeze({
      apiRequests: 2.50,       // $ per req/sec / month
      flightSearches: 0.0050,  // $ per GDS flight search query
      hotelSyncNodes: 45.00,   // $ per sync node / month
      mapCacheStorage: 0.20,   // $ per GB map tile cache / month
      flightAlerts: 0.0100     // $ per real-time flight alert
    }),
    discountRate: 0.00         // 0% partner volume subsidy
  }),
  regional: Object.freeze({
    id: 'regional',
    name: 'Regional Operator Tier',
    badge: 'Tier 2 • Regional Operator',
    limits: Object.freeze({
      maxApiRequests: 100,
      maxFlightSearches: 50000,
      maxHotelSyncNodes: 20,
      maxMapCacheStorage: 1000,
      maxFlightAlerts: 25000
    }),
    rates: Object.freeze({
      apiRequests: 2.00,       // $ per req/sec / month
      flightSearches: 0.0040,  // $ per GDS flight search query
      hotelSyncNodes: 38.00,   // $ per sync node / month
      mapCacheStorage: 0.16,   // $ per GB map tile cache / month
      flightAlerts: 0.0080     // $ per real-time flight alert
    }),
    discountRate: 0.10         // 10% partner volume subsidy
  }),
  enterprise: Object.freeze({
    id: 'enterprise',
    name: 'Global OTA Enterprise',
    badge: 'Tier 3 • Global OTA Enterprise',
    limits: Object.freeze({
      maxApiRequests: 300,
      maxFlightSearches: 200000,
      maxHotelSyncNodes: 60,
      maxMapCacheStorage: 4000,
      maxFlightAlerts: 100000
    }),
    rates: Object.freeze({
      apiRequests: 1.50,       // $ per req/sec / month
      flightSearches: 0.0030,  // $ per GDS flight search query
      hotelSyncNodes: 30.00,   // $ per sync node / month
      mapCacheStorage: 0.12,   // $ per GB map tile cache / month
      flightAlerts: 0.0060     // $ per real-time flight alert
    }),
    discountRate: 0.18         // 18% partner volume subsidy
  }),
  sovereign: Object.freeze({
    id: 'sovereign',
    name: 'Sovereign Travel Group',
    badge: 'Tier 4 • Sovereign Travel Group',
    limits: Object.freeze({
      maxApiRequests: Infinity,
      maxFlightSearches: Infinity,
      maxHotelSyncNodes: Infinity,
      maxMapCacheStorage: Infinity,
      maxFlightAlerts: Infinity
    }),
    rates: Object.freeze({
      apiRequests: 1.10,       // $ per req/sec / month
      flightSearches: 0.0020,  // $ per GDS flight search query
      hotelSyncNodes: 24.00,   // $ per sync node / month
      mapCacheStorage: 0.08,   // $ per GB map tile cache / month
      flightAlerts: 0.0040     // $ per real-time flight alert
    }),
    discountRate: 0.25         // 25% partner volume subsidy
  })
});

export const AGENCY_PRESETS = Object.freeze({
  backpacker: Object.freeze({
    name: 'Boutique Eco-Lodge',
    description: 'Local adventure outfitters & boutique accommodation lodges',
    inputs: Object.freeze({
      apiRequests: 15,
      flightSearches: 5000,
      hotelSyncNodes: 3,
      mapCacheStorage: 100,
      flightAlerts: 2500,
      billingFrequency: 'monthly'
    })
  }),
  regional: Object.freeze({
    name: 'Alpine & Mediterranean Tours',
    description: 'Mid-sized charter & regional multi-destination voyage operator',
    inputs: Object.freeze({
      apiRequests: 80,
      flightSearches: 35000,
      hotelSyncNodes: 15,
      mapCacheStorage: 600,
      flightAlerts: 18000,
      billingFrequency: 'annual'
    })
  }),
  enterprise: Object.freeze({
    name: 'Pacific Skyway OTA',
    description: 'High-volume international travel & booking engine aggregator',
    inputs: Object.freeze({
      apiRequests: 220,
      flightSearches: 150000,
      hotelSyncNodes: 45,
      mapCacheStorage: 2500,
      flightAlerts: 70000,
      billingFrequency: 'annual'
    })
  }),
  sovereign: Object.freeze({
    name: 'Trans-Continental Alliance',
    description: 'Global airline consortium & multi-national travel conglomerate',
    inputs: Object.freeze({
      apiRequests: 450,
      flightSearches: 400000,
      hotelSyncNodes: 85,
      mapCacheStorage: 4500,
      flightAlerts: 160000,
      billingFrequency: 'annual'
    })
  })
});

export class TravelOdysseyCostOptimizerEngine {
  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.annualDiscountRate = 0.20; // 20% annual multi-year booking platform discount
    this.listeners = new Map();

    this.currentInputs = {
      apiRequests: this.sanitizeInput(initialConfig.apiRequests ?? 20),
      flightSearches: this.sanitizeInput(initialConfig.flightSearches ?? 8000),
      hotelSyncNodes: this.sanitizeInput(initialConfig.hotelSyncNodes ?? 4),
      mapCacheStorage: this.sanitizeInput(initialConfig.mapCacheStorage ?? 150),
      flightAlerts: this.sanitizeInput(initialConfig.flightAlerts ?? 3500),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly'
    };

    this.lastQuote = null;
  }

  /**
   * Sanitizes numeric input safely to non-negative integer.
   */
  sanitizeInput(val) {
    if (val === null || val === undefined || typeof val === 'boolean') return 0;
    const num = Number(val);
    if (!Number.isFinite(num) || Number.isNaN(num) || num < 0) return 0;
    return Math.floor(num);
  }

  /**
   * Event listener registration.
   */
  on(event, callback) {
    if (typeof callback !== 'function') return this;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return this;
  }

  /**
   * Event listener deregistration.
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
    return this;
  }

  /**
   * Emits an event to registered listeners.
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return false;
    for (const callback of this.listeners.get(event)) {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in listener for ${event}:`, err);
      }
    }
    return true;
  }

  /**
   * Evaluates the appropriate service tier based on resource demands.
   */
  determineTier(inputs) {
    const apiRequests = this.sanitizeInput(inputs.apiRequests);
    const flightSearches = this.sanitizeInput(inputs.flightSearches);
    const hotelSyncNodes = this.sanitizeInput(inputs.hotelSyncNodes);
    const mapCacheStorage = this.sanitizeInput(inputs.mapCacheStorage);
    const flightAlerts = this.sanitizeInput(inputs.flightAlerts);

    if (
      apiRequests <= TIERS.backpacker.limits.maxApiRequests &&
      flightSearches <= TIERS.backpacker.limits.maxFlightSearches &&
      hotelSyncNodes <= TIERS.backpacker.limits.maxHotelSyncNodes &&
      mapCacheStorage <= TIERS.backpacker.limits.maxMapCacheStorage &&
      flightAlerts <= TIERS.backpacker.limits.maxFlightAlerts
    ) {
      return TIERS.backpacker;
    }

    if (
      apiRequests <= TIERS.regional.limits.maxApiRequests &&
      flightSearches <= TIERS.regional.limits.maxFlightSearches &&
      hotelSyncNodes <= TIERS.regional.limits.maxHotelSyncNodes &&
      mapCacheStorage <= TIERS.regional.limits.maxMapCacheStorage &&
      flightAlerts <= TIERS.regional.limits.maxFlightAlerts
    ) {
      return TIERS.regional;
    }

    if (
      apiRequests <= TIERS.enterprise.limits.maxApiRequests &&
      flightSearches <= TIERS.enterprise.limits.maxFlightSearches &&
      hotelSyncNodes <= TIERS.enterprise.limits.maxHotelSyncNodes &&
      mapCacheStorage <= TIERS.enterprise.limits.maxMapCacheStorage &&
      flightAlerts <= TIERS.enterprise.limits.maxFlightAlerts
    ) {
      return TIERS.enterprise;
    }

    return TIERS.sovereign;
  }

  /**
   * Computes agency volume discount subsidies.
   */
  applyVolumeDiscount(tierOrId, baseCost = 0) {
    let tier = tierOrId;
    if (typeof tierOrId === 'string') {
      const key = tierOrId.toLowerCase();
      tier = TIERS[key] || TIERS.backpacker;
    }

    const discountRate = tier?.discountRate ?? 0;
    const cost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(cost * discountRate * 100) / 100;
    const netCost = Math.round((cost - discountAmount) * 100) / 100;

    return {
      tierId: tier?.id || 'backpacker',
      tierName: tier?.name || 'Backpacker & Boutique Agency',
      discountRate,
      discountPercent: Math.round(discountRate * 100),
      discountAmount,
      netCost
    };
  }

  /**
   * Main pricing calculation engine.
   */
  calculatePricing(inputs = {}) {
    const apiRequests = this.sanitizeInput(inputs.apiRequests ?? this.currentInputs.apiRequests);
    const flightSearches = this.sanitizeInput(inputs.flightSearches ?? this.currentInputs.flightSearches);
    const hotelSyncNodes = this.sanitizeInput(inputs.hotelSyncNodes ?? this.currentInputs.hotelSyncNodes);
    const mapCacheStorage = this.sanitizeInput(inputs.mapCacheStorage ?? this.currentInputs.mapCacheStorage);
    const flightAlerts = this.sanitizeInput(inputs.flightAlerts ?? this.currentInputs.flightAlerts);
    const billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';

    const currentInputs = {
      apiRequests,
      flightSearches,
      hotelSyncNodes,
      mapCacheStorage,
      flightAlerts,
      billingFrequency
    };

    const tier = this.determineTier(currentInputs);

    // Monthly unrounded base calculations
    const monthlyApiCost = Math.round(apiRequests * tier.rates.apiRequests * 100) / 100;
    const monthlyFlightCost = Math.round(flightSearches * tier.rates.flightSearches * 100) / 100;
    const monthlyHotelCost = Math.round(hotelSyncNodes * tier.rates.hotelSyncNodes * 100) / 100;
    const monthlyMapCost = Math.round(mapCacheStorage * tier.rates.mapCacheStorage * 100) / 100;
    const monthlyAlertsCost = Math.round(flightAlerts * tier.rates.flightAlerts * 100) / 100;

    const monthlyBaseCost = Math.round((
      monthlyApiCost +
      monthlyFlightCost +
      monthlyHotelCost +
      monthlyMapCost +
      monthlyAlertsCost
    ) * 100) / 100;

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * multiplier * 100) / 100;

    // Apply Tier Volume Subsidy
    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscount.discountAmount) * 100) / 100;

    // Apply Annual Booking Contract Discount (20% off after volume discount)
    const annualDiscountAmount = isAnnual
      ? Math.round(afterVolumeDiscount * this.annualDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round((volumeDiscount.discountAmount + annualDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100);

    // Monthly equivalent cost for comparison
    const monthlyEquivalentCost = isAnnual
      ? Math.round((totalCost / 12) * 100) / 100
      : totalCost;

    // Estimated booking transactions supported based on operational profile:
    // ~4 flight searches per booking inquiry, 0.04 hotel sync node capacity, 2 tracker alerts, 0.02 API requests/sec
    const estimatedBookingsSupported = Math.max(0, Math.floor(
      (flightSearches / 4) * 0.40 +
      (apiRequests * 50) * 0.25 +
      (hotelSyncNodes * 200) * 0.20 +
      (flightAlerts / 2) * 0.15
    ));

    const effectiveTotalPeriod = isAnnual ? estimatedBookingsSupported * 12 : estimatedBookingsSupported;
    const costPerBooking = effectiveTotalPeriod > 0
      ? Math.round((totalCost / effectiveTotalPeriod) * 1000) / 1000
      : 0;

    const quote = {
      inputs: {
        apiRequests,
        flightSearches,
        hotelSyncNodes,
        mapCacheStorage,
        flightAlerts
      },
      billingFrequency,
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        discountRate: tier.discountRate,
        discountPercent: Math.round(tier.discountRate * 100),
        rates: { ...tier.rates },
        limits: { ...tier.limits }
      },
      annualMultiplier: multiplier,
      annualDiscountRate: this.annualDiscountRate,
      annualDiscountPercent: Math.round(this.annualDiscountRate * 100),
      breakdown: {
        apiRequests: Math.round(monthlyApiCost * multiplier * 100) / 100,
        flightSearches: Math.round(monthlyFlightCost * multiplier * 100) / 100,
        hotelSyncNodes: Math.round(monthlyHotelCost * multiplier * 100) / 100,
        mapCacheStorage: Math.round(monthlyMapCost * multiplier * 100) / 100,
        flightAlerts: Math.round(monthlyAlertsCost * multiplier * 100) / 100
      },
      monthlyBaseCost,
      subtotal,
      baseCost: subtotal,
      volumeDiscountAmount: volumeDiscount.discountAmount,
      annualDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      totalCost,
      monthlyEquivalentCost,
      estimatedBookingsSupported,
      costPerBooking
    };

    this.lastQuote = quote;
    this.emit('calculate', quote);
    return quote;
  }

  /**
   * Generates a formal travel platform contract quote with unique ID and validity.
   */
  generateQuote(options = null) {
    if (options && typeof options === 'object') {
      if (options.apiRequests !== undefined) this.currentInputs.apiRequests = this.sanitizeInput(options.apiRequests);
      if (options.flightSearches !== undefined) this.currentInputs.flightSearches = this.sanitizeInput(options.flightSearches);
      if (options.hotelSyncNodes !== undefined) this.currentInputs.hotelSyncNodes = this.sanitizeInput(options.hotelSyncNodes);
      if (options.mapCacheStorage !== undefined) this.currentInputs.mapCacheStorage = this.sanitizeInput(options.mapCacheStorage);
      if (options.flightAlerts !== undefined) this.currentInputs.flightAlerts = this.sanitizeInput(options.flightAlerts);
      if (options.billingFrequency !== undefined) {
        this.currentInputs.billingFrequency = options.billingFrequency === 'annual' ? 'annual' : 'monthly';
      }
    }

    const pricing = this.calculatePricing(this.currentInputs);
    const quoteId = `TO-Q-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const validUntil = new Date(now.getTime() + (options?.validUntilDays ?? 30) * 24 * 60 * 60 * 1000);

    const formalQuote = {
      quoteId,
      agencyName: options?.agencyName || 'Global Travel Odyssey Partner',
      contactEmail: options?.contactEmail || 'partner-ops@travelodyssey.internal',
      issuedAt: now.toISOString(),
      expiresAt: validUntil.toISOString(),
      ...pricing
    };

    this.emit('quote', formalQuote);
    return formalQuote;
  }

  /**
   * Optimizes resource allocation within a targeted monthly budget.
   * 
   * @param {number} targetBudget - Maximum targeted monthly spend in USD.
   * @param {Object} requiredNeeds - Minimum mandatory resource requirements.
   * @returns {Object} Optimization outcome including allocated resources and quote.
   */
  optimizeAllocation(targetBudget = 0, requiredNeeds = {}) {
    const budget = Math.max(0, Number(targetBudget) || 0);
    const minNeeds = {
      apiRequests: this.sanitizeInput(requiredNeeds.apiRequests),
      flightSearches: this.sanitizeInput(requiredNeeds.flightSearches),
      hotelSyncNodes: this.sanitizeInput(requiredNeeds.hotelSyncNodes),
      mapCacheStorage: this.sanitizeInput(requiredNeeds.mapCacheStorage),
      flightAlerts: this.sanitizeInput(requiredNeeds.flightAlerts),
      billingFrequency: 'monthly'
    };

    if (budget <= 0) {
      const zeroQuote = this.calculatePricing({
        apiRequests: 0,
        flightSearches: 0,
        hotelSyncNodes: 0,
        mapCacheStorage: 0,
        flightAlerts: 0,
        billingFrequency: 'monthly'
      });
      const result = {
        targetBudget: 0,
        allocatedResources: { apiRequests: 0, flightSearches: 0, hotelSyncNodes: 0, mapCacheStorage: 0, flightAlerts: 0 },
        quote: zeroQuote,
        withinBudget: true,
        message: 'Zero target budget supplied. Minimal idle allocation returned.'
      };
      this.emit('optimize', result);
      return result;
    }

    // Check if minimum needs already exceed budget
    const minQuote = this.calculatePricing(minNeeds);
    if (minQuote.totalCost > budget) {
      const result = {
        targetBudget: budget,
        allocatedResources: { ...minNeeds },
        quote: minQuote,
        withinBudget: false,
        message: `Minimum required needs ($${minQuote.totalCost.toFixed(2)}) exceed target budget ($${budget.toFixed(2)}).`
      };
      this.emit('optimize', result);
      return result;
    }

    // Allocate remaining budget across weighted dimensions
    let remainingBudget = budget - minQuote.totalCost;

    // Weights representing balanced operational profile:
    // 35% Flight Searches, 25% API Requests, 20% Hotel Nodes, 10% Map Cache, 10% Flight Alerts
    const weights = {
      flightSearches: 0.35,
      apiRequests: 0.25,
      hotelSyncNodes: 0.20,
      mapCacheStorage: 0.10,
      flightAlerts: 0.10
    };

    // Determine current best tier rates to guide unit allocation
    let currentTier = this.determineTier(minNeeds);
    
    // Incrementally estimate additional units
    let extraFlight = Math.floor((remainingBudget * weights.flightSearches) / currentTier.rates.flightSearches);
    let extraApi = Math.floor((remainingBudget * weights.apiRequests) / currentTier.rates.apiRequests);
    let extraHotel = Math.floor((remainingBudget * weights.hotelSyncNodes) / currentTier.rates.hotelSyncNodes);
    let extraMap = Math.floor((remainingBudget * weights.mapCacheStorage) / currentTier.rates.mapCacheStorage);
    let extraAlerts = Math.floor((remainingBudget * weights.flightAlerts) / currentTier.rates.flightAlerts);

    let allocated = {
      apiRequests: minNeeds.apiRequests + extraApi,
      flightSearches: minNeeds.flightSearches + extraFlight,
      hotelSyncNodes: minNeeds.hotelSyncNodes + extraHotel,
      mapCacheStorage: minNeeds.mapCacheStorage + extraMap,
      flightAlerts: minNeeds.flightAlerts + extraAlerts,
      billingFrequency: 'monthly'
    };

    let optQuote = this.calculatePricing(allocated);

    // Iterative fine-tuning step (if rounding or tier transition caused slight overshoot)
    let attempts = 0;
    while (optQuote.totalCost > budget && attempts < 15) {
      const scale = budget / optQuote.totalCost;
      allocated.apiRequests = Math.max(minNeeds.apiRequests, Math.floor(allocated.apiRequests * scale));
      allocated.flightSearches = Math.max(minNeeds.flightSearches, Math.floor(allocated.flightSearches * scale));
      allocated.hotelSyncNodes = Math.max(minNeeds.hotelSyncNodes, Math.floor(allocated.hotelSyncNodes * scale));
      allocated.mapCacheStorage = Math.max(minNeeds.mapCacheStorage, Math.floor(allocated.mapCacheStorage * scale));
      allocated.flightAlerts = Math.max(minNeeds.flightAlerts, Math.floor(allocated.flightAlerts * scale));

      optQuote = this.calculatePricing(allocated);
      attempts++;
    }

    const result = {
      targetBudget: budget,
      allocatedResources: {
        apiRequests: allocated.apiRequests,
        flightSearches: allocated.flightSearches,
        hotelSyncNodes: allocated.hotelSyncNodes,
        mapCacheStorage: allocated.mapCacheStorage,
        flightAlerts: allocated.flightAlerts
      },
      quote: optQuote,
      withinBudget: optQuote.totalCost <= budget,
      message: `Optimal resource allocation generated ($${optQuote.totalCost.toFixed(2)} / $${budget.toFixed(2)}).`
    };

    this.emit('optimize', result);
    return result;
  }
}

// Interactive DOM binding for UI controls in browser environments
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const engine = new TravelOdysseyCostOptimizerEngine();

    // DOM Elements - Sliders
    const sliderFlightSearches = document.getElementById('slider-flight-searches');
    const sliderHotelNodes = document.getElementById('slider-hotel-nodes');
    const sliderMapCache = document.getElementById('slider-map-cache');
    const sliderFlightAlerts = document.getElementById('slider-flight-alerts');
    const sliderApiRequests = document.getElementById('slider-api-requests');

    // DOM Elements - Value Labels
    const valFlightSearches = document.getElementById('val-flight-searches');
    const valHotelNodes = document.getElementById('val-hotel-nodes');
    const valMapCache = document.getElementById('val-map-cache');
    const valFlightAlerts = document.getElementById('val-flight-alerts');
    const valApiRequests = document.getElementById('val-api-requests');

    // DOM Elements - Toggles & Badges
    const billingToggle = document.getElementById('billing-toggle');
    const billingPeriodLabel = document.getElementById('billing-period-label');
    const tierBadge = document.getElementById('tier-badge');
    const tierDiscountBadge = document.getElementById('tier-discount-badge');

    // DOM Elements - Price Display
    const totalPriceEl = document.getElementById('total-price-val');
    const basePriceEl = document.getElementById('base-price-val');
    const discountPriceEl = document.getElementById('discount-price-val');
    const monthlyEquivalentEl = document.getElementById('monthly-equivalent-val');
    const costPerBookingEl = document.getElementById('cost-per-booking-val');
    const bookingsSupportedEl = document.getElementById('bookings-supported-val');

    // DOM Elements - Breakdown Amounts
    const costFlightSearches = document.getElementById('cost-flight-searches');
    const costHotelNodes = document.getElementById('cost-hotel-nodes');
    const costMapCache = document.getElementById('cost-map-cache');
    const costFlightAlerts = document.getElementById('cost-flight-alerts');
    const costApiRequests = document.getElementById('cost-api-requests');

    // DOM Elements - Donut Chart Segments
    const segFlight = document.getElementById('donut-segment-flight');
    const segHotel = document.getElementById('donut-segment-hotel');
    const segMap = document.getElementById('donut-segment-map');
    const segAlerts = document.getElementById('donut-segment-alerts');
    const segApi = document.getElementById('donut-segment-api');

    // DOM Elements - Quote Modal
    const btnOpenQuote = document.getElementById('btn-open-quote-modal');
    const quoteModal = document.getElementById('quote-modal');
    const btnCloseQuote = document.getElementById('btn-close-quote-modal');
    const quoteJsonView = document.getElementById('quote-json-view');
    const btnCopyQuote = document.getElementById('btn-copy-quote');
    const btnDownloadQuote = document.getElementById('btn-download-quote');
    const copyNotice = document.getElementById('copy-notice');

    // DOM Elements - Budget Optimizer
    const targetBudgetInput = document.getElementById('target-budget-input');
    const btnOptimize = document.getElementById('btn-optimize-allocation');
    const optimizerFeedback = document.getElementById('optimizer-feedback');

    // DOM Elements - Presets
    const presetButtons = document.querySelectorAll('[data-preset]');

    function formatCurrency(val) {
      return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function updateUI() {
      if (!sliderFlightSearches) return;

      const flightSearches = Number(sliderFlightSearches.value);
      const hotelSyncNodes = Number(sliderHotelNodes.value);
      const mapCacheStorage = Number(sliderMapCache.value);
      const flightAlerts = Number(sliderFlightAlerts.value);
      const apiRequests = Number(sliderApiRequests.value);
      const isAnnual = billingToggle?.checked ?? false;
      const billingFrequency = isAnnual ? 'annual' : 'monthly';

      // Update text labels
      if (valFlightSearches) valFlightSearches.textContent = `${flightSearches.toLocaleString('en-US')} queries`;
      if (valHotelNodes) valHotelNodes.textContent = `${hotelSyncNodes} nodes`;
      if (valMapCache) valMapCache.textContent = `${mapCacheStorage.toLocaleString('en-US')} GB`;
      if (valFlightAlerts) valFlightAlerts.textContent = `${flightAlerts.toLocaleString('en-US')} alerts`;
      if (valApiRequests) valApiRequests.textContent = `${apiRequests} req/s`;

      if (billingPeriodLabel) {
        billingPeriodLabel.textContent = isAnnual ? '/ year (20% Annual Contract Discount)' : '/ month';
      }

      const quote = engine.calculatePricing({
        apiRequests,
        flightSearches,
        hotelSyncNodes,
        mapCacheStorage,
        flightAlerts,
        billingFrequency
      });

      // Update Tier Badge
      if (tierBadge) {
        tierBadge.textContent = quote.tier.badge;
        tierBadge.className = `tier-badge tier-${quote.tier.id}`;
      }

      if (tierDiscountBadge) {
        tierDiscountBadge.textContent = `${quote.tier.discountPercent}% Volume Subsidy`;
      }

      // Update Pricing Displays
      if (totalPriceEl) totalPriceEl.textContent = formatCurrency(quote.totalCost);
      if (basePriceEl) basePriceEl.textContent = formatCurrency(quote.subtotal);
      if (discountPriceEl) discountPriceEl.textContent = `-${formatCurrency(quote.totalDiscountAmount)}`;

      if (monthlyEquivalentEl) {
        if (isAnnual) {
          monthlyEquivalentEl.parentElement?.classList.remove('hidden');
          monthlyEquivalentEl.textContent = `${formatCurrency(quote.monthlyEquivalentCost)} / mo`;
        } else {
          monthlyEquivalentEl.parentElement?.classList.add('hidden');
        }
      }

      // Efficiency Metrics
      if (costPerBookingEl) costPerBookingEl.textContent = `$${quote.costPerBooking.toFixed(3)}`;
      if (bookingsSupportedEl) bookingsSupportedEl.textContent = `~${quote.estimatedBookingsSupported.toLocaleString('en-US')}/mo`;

      // Cost Breakdown Items
      if (costFlightSearches) costFlightSearches.textContent = formatCurrency(quote.breakdown.flightSearches);
      if (costHotelNodes) costHotelNodes.textContent = formatCurrency(quote.breakdown.hotelSyncNodes);
      if (costMapCache) costMapCache.textContent = formatCurrency(quote.breakdown.mapCacheStorage);
      if (costFlightAlerts) costFlightAlerts.textContent = formatCurrency(quote.breakdown.flightAlerts);
      if (costApiRequests) costApiRequests.textContent = formatCurrency(quote.breakdown.apiRequests);

      // SVG Donut Visualization
      // Circumference = 2 * PI * 45 ≈ 282.743
      const totalBreakdown = (
        quote.breakdown.flightSearches +
        quote.breakdown.hotelSyncNodes +
        quote.breakdown.mapCacheStorage +
        quote.breakdown.flightAlerts +
        quote.breakdown.apiRequests
      ) || 1;

      const pFlight = quote.breakdown.flightSearches / totalBreakdown;
      const pHotel = quote.breakdown.hotelSyncNodes / totalBreakdown;
      const pMap = quote.breakdown.mapCacheStorage / totalBreakdown;
      const pAlerts = quote.breakdown.flightAlerts / totalBreakdown;
      const pApi = quote.breakdown.apiRequests / totalBreakdown;

      const C = 282.743;
      const dFlight = pFlight * C;
      const dHotel = pHotel * C;
      const dMap = pMap * C;
      const dAlerts = pAlerts * C;
      const dApi = pApi * C;

      let offset = 0;
      if (segFlight) {
        segFlight.style.strokeDasharray = `${dFlight} ${C}`;
        segFlight.style.strokeDashoffset = `${-offset}`;
      }
      offset += dFlight;

      if (segHotel) {
        segHotel.style.strokeDasharray = `${dHotel} ${C}`;
        segHotel.style.strokeDashoffset = `${-offset}`;
      }
      offset += dHotel;

      if (segMap) {
        segMap.style.strokeDasharray = `${dMap} ${C}`;
        segMap.style.strokeDashoffset = `${-offset}`;
      }
      offset += dMap;

      if (segAlerts) {
        segAlerts.style.strokeDasharray = `${dAlerts} ${C}`;
        segAlerts.style.strokeDashoffset = `${-offset}`;
      }
      offset += dAlerts;

      if (segApi) {
        segApi.style.strokeDasharray = `${dApi} ${C}`;
        segApi.style.strokeDashoffset = `${-offset}`;
      }
    }

    // Attach slider event listeners
    [sliderFlightSearches, sliderHotelNodes, sliderMapCache, sliderFlightAlerts, sliderApiRequests].forEach(slider => {
      slider?.addEventListener('input', updateUI);
    });

    billingToggle?.addEventListener('change', updateUI);

    // Presets Handlers
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        const preset = AGENCY_PRESETS[presetKey];
        if (!preset) return;

        if (sliderFlightSearches) sliderFlightSearches.value = preset.inputs.flightSearches;
        if (sliderHotelNodes) sliderHotelNodes.value = preset.inputs.hotelSyncNodes;
        if (sliderMapCache) sliderMapCache.value = preset.inputs.mapCacheStorage;
        if (sliderFlightAlerts) sliderFlightAlerts.value = preset.inputs.flightAlerts;
        if (sliderApiRequests) sliderApiRequests.value = preset.inputs.apiRequests;
        if (billingToggle) billingToggle.checked = preset.inputs.billingFrequency === 'annual';

        updateUI();
      });
    });

    // Budget Optimizer Handler
    btnOptimize?.addEventListener('click', () => {
      const budget = Number(targetBudgetInput?.value || 0);
      if (budget <= 0) {
        if (optimizerFeedback) {
          optimizerFeedback.textContent = 'Please enter a valid monthly budget amount (> $0).';
          optimizerFeedback.className = 'optimizer-feedback error';
        }
        return;
      }

      const optResult = engine.optimizeAllocation(budget, {
        apiRequests: 5,
        flightSearches: 1000,
        hotelSyncNodes: 1,
        mapCacheStorage: 50,
        flightAlerts: 500
      });

      if (sliderFlightSearches) sliderFlightSearches.value = optResult.allocatedResources.flightSearches;
      if (sliderHotelNodes) sliderHotelNodes.value = optResult.allocatedResources.hotelSyncNodes;
      if (sliderMapCache) sliderMapCache.value = optResult.allocatedResources.mapCacheStorage;
      if (sliderFlightAlerts) sliderFlightAlerts.value = optResult.allocatedResources.flightAlerts;
      if (sliderApiRequests) sliderApiRequests.value = optResult.allocatedResources.apiRequests;
      if (billingToggle) billingToggle.checked = false;

      updateUI();

      if (optimizerFeedback) {
        optimizerFeedback.textContent = optResult.message;
        optimizerFeedback.className = `optimizer-feedback ${optResult.withinBudget ? 'success' : 'warning'}`;
      }
    });

    // Modal Handlers
    btnOpenQuote?.addEventListener('click', () => {
      const formalQuote = engine.generateQuote({
        agencyName: 'Voyage Partner Agency',
        billingFrequency: billingToggle?.checked ? 'annual' : 'monthly'
      });

      if (quoteJsonView) {
        quoteJsonView.textContent = JSON.stringify(formalQuote, null, 2);
      }
      if (quoteModal) {
        quoteModal.classList.remove('hidden');
        quoteModal.setAttribute('aria-hidden', 'false');
      }
    });

    btnCloseQuote?.addEventListener('click', () => {
      if (quoteModal) {
        quoteModal.classList.add('hidden');
        quoteModal.setAttribute('aria-hidden', 'true');
      }
    });

    quoteModal?.addEventListener('click', (e) => {
      if (e.target === quoteModal) {
        quoteModal.classList.add('hidden');
        quoteModal.setAttribute('aria-hidden', 'true');
      }
    });

    btnCopyQuote?.addEventListener('click', async () => {
      if (!quoteJsonView) return;
      try {
        await navigator.clipboard.writeText(quoteJsonView.textContent);
        if (copyNotice) {
          copyNotice.classList.remove('hidden');
          setTimeout(() => copyNotice.classList.add('hidden'), 2500);
        }
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });

    btnDownloadQuote?.addEventListener('click', () => {
      if (!quoteJsonView) return;
      const blob = new Blob([quoteJsonView.textContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `travel-odyssey-contract-quote-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Initial render
    updateUI();
  });
}

export default TravelOdysseyCostOptimizerEngine;
