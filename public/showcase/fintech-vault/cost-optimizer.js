/**
 * ApexVault — Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2060 - NSoC '26 Level 3 Feature
 *
 * Dedicated modular engine for institutional banking & fintech infrastructure cost modeling,
 * volume subsidies, multi-region HSM key provisioning, ISO 20022 Swift gateway tariffs,
 * basis point (bps) per transaction metrics, dynamic budget allocation optimization,
 * and reactive event subscriptions.
 */

export const BANKING_RESOURCES = Object.freeze({
  transactionsPerSec: Object.freeze({
    id: 'transactionsPerSec',
    label: 'Ledger Transaction Throughput',
    unit: 'TPS (Txn/sec)',
    unitRateMonthly: 1.50, // $1.50 per sustained TPS capacity / month
    min: 0,
    max: 20000,
    defaultVal: 500,
    step: 50
  }),
  vaultStorageTb: Object.freeze({
    id: 'vaultStorageTb',
    label: 'PCI-DSS Cold Vault Storage',
    unit: 'TB / month',
    unitRateMonthly: 45.00, // $45.00 per encrypted TB / month
    min: 0,
    max: 1000,
    defaultVal: 25,
    step: 5
  }),
  fraudInferences: Object.freeze({
    id: 'fraudInferences',
    label: 'Real-Time Fraud ML Inferences',
    unit: 'Inferences/sec',
    unitRateMonthly: 2.20, // $2.20 per ML inference capacity / sec
    min: 0,
    max: 15000,
    defaultVal: 400,
    step: 50
  }),
  swiftEndpoints: Object.freeze({
    id: 'swiftEndpoints',
    label: 'ISO 20022 SWIFT Settlement Endpoints',
    unit: 'Gateways',
    unitRateMonthly: 180.00, // $180.00 per dedicated gateway / month
    min: 0,
    max: 100,
    defaultVal: 4,
    step: 1
  }),
  hsmKeys: Object.freeze({
    id: 'hsmKeys',
    label: 'Multi-Region HSM FIPS 140-3 Keys',
    unit: 'Hardware Security Keys',
    unitRateMonthly: 125.00, // $125.00 per dedicated HSM key / month
    min: 0,
    max: 200,
    defaultVal: 8,
    step: 1
  })
});

export const BANKING_TIERS = Object.freeze({
  seedling: Object.freeze({
    id: 'seedling',
    name: 'Fintech Seedling',
    badge: 'Tier 1 • Fintech Seedling',
    maxTPS: 100,
    maxStorage: 10,
    maxFraud: 100,
    maxSwift: 2,
    maxHSM: 4,
    discountRate: 0.00, // 0% discount
    sla: '99.9% Uptime SLA • Standard Regulatory Reporting'
  }),
  neobank: Object.freeze({
    id: 'neobank',
    name: 'Regulated Neobank',
    badge: 'Tier 2 • Regulated Neobank',
    maxTPS: 1000,
    maxStorage: 100,
    maxFraud: 1000,
    maxSwift: 10,
    maxHSM: 20,
    discountRate: 0.10, // 10% volume discount
    sla: '99.99% High Availability • Dual-Region Active-Active'
  }),
  investment_bank: Object.freeze({
    id: 'investment_bank',
    name: 'Tier-1 Investment Bank',
    badge: 'Tier 3 • Tier-1 Investment Bank',
    maxTPS: 10000,
    maxStorage: 500,
    maxFraud: 10000,
    maxSwift: 50,
    maxHSM: 100,
    discountRate: 0.20, // 20% institutional banking subsidy
    sla: '99.999% Fault Tolerant • Sub-millisecond Settlement'
  }),
  sovereign_central_bank: Object.freeze({
    id: 'sovereign_central_bank',
    name: 'Global Sovereign Central Banking',
    badge: 'Tier 4 • Sovereign Central Bank',
    maxTPS: Infinity,
    maxStorage: Infinity,
    maxFraud: Infinity,
    maxSwift: Infinity,
    maxHSM: Infinity,
    discountRate: 0.30, // 30% sovereign multi-lateral subsidy
    sla: 'Continuous Air-Gapped Resiliency • Basel IV & ISO 20022 Compliant'
  })
});

export class FintechVaultCostOptimizerEngine {
  #listeners = new Map();
  #lastQuote = null;

  constructor(options = {}) {
    this.currency = options.currency || 'USD';
    this.currencySymbol = options.currencySymbol || '$';
    this.annualDiscountRate = typeof options.annualDiscountRate === 'number'
      ? Math.max(0, Math.min(1, options.annualDiscountRate))
      : 0.20; // 20% institutional SLA discount
    this.tiers = options.tiers || BANKING_TIERS;
    this.resources = options.resources || BANKING_RESOURCES;

    this.currentInputs = {
      transactionsPerSec: this.sanitizeInput(options.transactionsPerSec ?? this.resources.transactionsPerSec.defaultVal),
      vaultStorageTb: this.sanitizeInput(options.vaultStorageTb ?? this.resources.vaultStorageTb.defaultVal),
      fraudInferences: this.sanitizeInput(options.fraudInferences ?? this.resources.fraudInferences.defaultVal),
      swiftEndpoints: this.sanitizeInput(options.swiftEndpoints ?? this.resources.swiftEndpoints.defaultVal),
      hsmKeys: this.sanitizeInput(options.hsmKeys ?? this.resources.hsmKeys.defaultVal),
      billingFrequency: options.billingFrequency === 'annual' ? 'annual' : 'monthly'
    };
  }

  /**
   * Sanitizes numerical inputs safely to whole numbers within [min, max] range.
   */
  sanitizeInput(val, min = 0, max = Infinity) {
    if (val === null || val === undefined || typeof val === 'boolean') return min;
    const num = Number(val);
    if (!Number.isFinite(num) || Number.isNaN(num)) return min;
    return Math.max(min, Math.min(max, Math.floor(num)));
  }

  /**
   * Evaluates resource volume demands against institutional tier limits.
   */
  determineTier(inputs = {}) {
    if (inputs.tier && this.tiers[inputs.tier]) {
      return this.tiers[inputs.tier];
    }

    const tps = this.sanitizeInput(inputs.transactionsPerSec ?? this.currentInputs.transactionsPerSec);
    const storage = this.sanitizeInput(inputs.vaultStorageTb ?? this.currentInputs.vaultStorageTb);
    const fraud = this.sanitizeInput(inputs.fraudInferences ?? this.currentInputs.fraudInferences);
    const swift = this.sanitizeInput(inputs.swiftEndpoints ?? this.currentInputs.swiftEndpoints);
    const hsm = this.sanitizeInput(inputs.hsmKeys ?? this.currentInputs.hsmKeys);

    if (
      tps <= this.tiers.seedling.maxTPS &&
      storage <= this.tiers.seedling.maxStorage &&
      fraud <= this.tiers.seedling.maxFraud &&
      swift <= this.tiers.seedling.maxSwift &&
      hsm <= this.tiers.seedling.maxHSM
    ) {
      return this.tiers.seedling;
    }

    if (
      tps <= this.tiers.neobank.maxTPS &&
      storage <= this.tiers.neobank.maxStorage &&
      fraud <= this.tiers.neobank.maxFraud &&
      swift <= this.tiers.neobank.maxSwift &&
      hsm <= this.tiers.neobank.maxHSM
    ) {
      return this.tiers.neobank;
    }

    if (
      tps <= this.tiers.investment_bank.maxTPS &&
      storage <= this.tiers.investment_bank.maxStorage &&
      fraud <= this.tiers.investment_bank.maxFraud &&
      swift <= this.tiers.investment_bank.maxSwift &&
      hsm <= this.tiers.investment_bank.maxHSM
    ) {
      return this.tiers.investment_bank;
    }

    return this.tiers.sovereign_central_bank;
  }

  /**
   * Calculates volume discount based on institutional banking tier.
   */
  applyVolumeDiscount(tierOrId, baseCost = 0) {
    let tierObj = null;
    if (typeof tierOrId === 'string') {
      tierObj = this.tiers[tierOrId] ||
        Object.values(this.tiers).find(t => t.id === tierOrId || t.name === tierOrId) ||
        this.tiers.seedling;
    } else if (tierOrId && typeof tierOrId === 'object') {
      tierObj = tierOrId;
    } else {
      tierObj = this.tiers.seedling;
    }

    const rate = typeof tierObj.discountRate === 'number'
      ? Math.max(0, Math.min(1, tierObj.discountRate))
      : 0;
    const cost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(cost * rate * 100) / 100;
    const netCost = Math.round((cost - discountAmount) * 100) / 100;

    return {
      tierId: tierObj.id || 'custom',
      tierName: tierObj.name || 'Custom Tier',
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      discountAmount,
      netCost
    };
  }

  /**
   * Main multi-tiered pricing calculation engine.
   */
  calculatePricing(inputs = {}) {
    const transactionsPerSec = this.sanitizeInput(
      inputs.transactionsPerSec ?? inputs.tps ?? this.currentInputs.transactionsPerSec
    );
    const vaultStorageTb = this.sanitizeInput(
      inputs.vaultStorageTb ?? inputs.storage ?? this.currentInputs.vaultStorageTb
    );
    const fraudInferences = this.sanitizeInput(
      inputs.fraudInferences ?? inputs.fraud ?? this.currentInputs.fraudInferences
    );
    const swiftEndpoints = this.sanitizeInput(
      inputs.swiftEndpoints ?? inputs.swift ?? this.currentInputs.swiftEndpoints
    );
    const hsmKeys = this.sanitizeInput(
      inputs.hsmKeys ?? inputs.hsm ?? this.currentInputs.hsmKeys
    );
    const billingFrequency = inputs.billingFrequency === 'annual' ? 'annual' : 'monthly';

    const normalizedInputs = {
      transactionsPerSec,
      vaultStorageTb,
      fraudInferences,
      swiftEndpoints,
      hsmKeys
    };

    const tier = inputs.tier && this.tiers[inputs.tier]
      ? this.tiers[inputs.tier]
      : this.determineTier(normalizedInputs);

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;

    // Line items per resource
    const lineItems = {};
    let monthlyBaseTotal = 0;

    for (const [key, res] of Object.entries(this.resources)) {
      const units = normalizedInputs[key] ?? 0;
      const monthlyCost = Math.round(units * res.unitRateMonthly * 100) / 100;
      const periodCost = Math.round(monthlyCost * multiplier * 100) / 100;

      lineItems[key] = {
        resourceId: key,
        label: res.label,
        unit: res.unit,
        unitRate: res.unitRateMonthly,
        units,
        monthlyCost,
        periodCost
      };

      monthlyBaseTotal += monthlyCost;
    }

    const subtotal = Math.round(monthlyBaseTotal * multiplier * 100) / 100;

    // Apply Tier Volume / Institutional Subsidy
    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscount.discountAmount) * 100) / 100;

    // Apply Annual Multi-Year Institutional SLA Discount
    const annualDiscountAmount = isAnnual
      ? Math.round(afterVolumeDiscount * this.annualDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round((volumeDiscount.discountAmount + annualDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100);
    const monthlyEquivalent = isAnnual ? Math.round((totalCost / 12) * 100) / 100 : totalCost;

    // Calculate Per-Transaction Basis Point (bps) metric
    // Continuous monthly capacity: 30 days * 86,400 seconds = 2,592,000 seconds
    const monthlyTransactionsCapacity = transactionsPerSec * 2_592_000;
    const periodTransactionsCapacity = monthlyTransactionsCapacity * multiplier;

    let costPerTransactionUsd = 0;
    let effectiveBpsPerTransaction = 0;

    if (periodTransactionsCapacity > 0) {
      costPerTransactionUsd = totalCost / periodTransactionsCapacity;
      // 1 basis point (bps) = 0.01% = $0.0001
      effectiveBpsPerTransaction = Math.round(costPerTransactionUsd * 10000 * 1000) / 1000;
    }

    // Line items share percentages
    for (const item of Object.values(lineItems)) {
      item.percentageOfSubtotal = subtotal > 0
        ? Math.round((item.periodCost / subtotal) * 10000) / 100
        : 0;
    }

    const result = {
      inputs: { ...normalizedInputs },
      billingFrequency,
      multiplier,
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        discountRate: tier.discountRate,
        discountPercent: Math.round(tier.discountRate * 100),
        sla: tier.sla
      },
      lineItems,
      subtotal,
      volumeDiscountAmount: volumeDiscount.discountAmount,
      volumeDiscountPercent: volumeDiscount.discountPercent,
      annualDiscountAmount,
      annualDiscountPercent: isAnnual ? Math.round(this.annualDiscountRate * 100) : 0,
      totalDiscountAmount,
      totalCost,
      monthlyEquivalent,
      metrics: {
        monthlyTransactionsCapacity,
        periodTransactionsCapacity,
        costPerTransactionUsd: Number(costPerTransactionUsd.toFixed(8)),
        effectiveBpsPerTransaction
      }
    };

    this.emit('pricingCalculated', result);
    return result;
  }

  /**
   * Generates a formal institutional quote record with SLA specifications.
   */
  generateQuote(options = {}) {
    const inputs = options.inputs || {
      transactionsPerSec: options.transactionsPerSec ?? this.currentInputs.transactionsPerSec,
      vaultStorageTb: options.vaultStorageTb ?? this.currentInputs.vaultStorageTb,
      fraudInferences: options.fraudInferences ?? this.currentInputs.fraudInferences,
      swiftEndpoints: options.swiftEndpoints ?? this.currentInputs.swiftEndpoints,
      hsmKeys: options.hsmKeys ?? this.currentInputs.hsmKeys,
      billingFrequency: options.billingFrequency ?? this.currentInputs.billingFrequency,
      tier: options.tier
    };

    const pricing = this.calculatePricing(inputs);
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const quote = {
      quoteId: `FV-Q-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      issuedAt: now.toISOString(),
      expiresAt: expiry.toISOString(),
      institution: options.institution || 'Institutional Banking Partner',
      complianceFrameworks: [
        'PCI-DSS Level 1 Encrypted Storage',
        'FIPS 140-3 Level 4 HSM Key Management',
        'ISO 20022 SWIFT Messaging Compliant',
        'SOC 2 Type II Certified Vault',
        'Basel IV Operational Resilience Standard'
      ],
      slaGuarantee: pricing.tier.sla,
      pricing
    };

    this.#lastQuote = quote;
    this.emit('quoteGenerated', quote);
    return quote;
  }

  /**
   * Intelligently scales resource allocation to maximize throughput within a target budget.
   */
  optimizeAllocation(targetBudget, requiredNeeds = {}) {
    const budget = Math.max(0, Number(targetBudget) || 0);
    const billingFrequency = requiredNeeds.billingFrequency === 'annual' ? 'annual' : 'monthly';
    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;

    if (budget === 0) {
      const zeroPricing = this.calculatePricing({
        transactionsPerSec: 0,
        vaultStorageTb: 0,
        fraudInferences: 0,
        swiftEndpoints: 0,
        hsmKeys: 0,
        billingFrequency
      });
      const zeroResult = {
        targetBudget: 0,
        billingFrequency,
        allocation: {
          transactionsPerSec: 0,
          vaultStorageTb: 0,
          fraudInferences: 0,
          swiftEndpoints: 0,
          hsmKeys: 0
        },
        pricing: zeroPricing,
        remainingBudget: 0,
        isWithinBudget: true,
        budgetUtilizationPercent: 0,
        exceedsBudget: false
      };
      this.emit('allocationOptimized', zeroResult);
      return zeroResult;
    }

    // Minimum required needs
    const minTps = this.sanitizeInput(requiredNeeds.minTps ?? requiredNeeds.transactionsPerSec ?? 0);
    const minStorage = this.sanitizeInput(requiredNeeds.minStorage ?? requiredNeeds.vaultStorageTb ?? 0);
    const minFraud = this.sanitizeInput(requiredNeeds.minFraudInferences ?? requiredNeeds.fraudInferences ?? 0);
    const minSwift = this.sanitizeInput(requiredNeeds.minSwiftEndpoints ?? requiredNeeds.swiftEndpoints ?? 0);
    const minHsm = this.sanitizeInput(requiredNeeds.minHsmKeys ?? requiredNeeds.hsmKeys ?? 0);

    const basePricing = this.calculatePricing({
      transactionsPerSec: minTps,
      vaultStorageTb: minStorage,
      fraudInferences: minFraud,
      swiftEndpoints: minSwift,
      hsmKeys: minHsm,
      billingFrequency
    });

    if (basePricing.totalCost > budget) {
      // Minimum needs exceed budget
      const overBudgetResult = {
        targetBudget: budget,
        billingFrequency,
        allocation: {
          transactionsPerSec: minTps,
          vaultStorageTb: minStorage,
          fraudInferences: minFraud,
          swiftEndpoints: minSwift,
          hsmKeys: minHsm
        },
        pricing: basePricing,
        remainingBudget: Math.round((budget - basePricing.totalCost) * 100) / 100,
        isWithinBudget: false,
        budgetUtilizationPercent: Math.round((basePricing.totalCost / budget) * 10000) / 100,
        exceedsBudget: true,
        message: 'Minimum required allocations exceed target budget'
      };
      this.emit('allocationOptimized', overBudgetResult);
      return overBudgetResult;
    }

    // Discretionary capital distribution weights
    const weights = {
      transactionsPerSec: 0.40,
      fraudInferences: 0.25,
      vaultStorageTb: 0.15,
      swiftEndpoints: 0.10,
      hsmKeys: 0.10
    };

    const remainingDiscretionary = budget - basePricing.totalCost;

    // Approximate unit period costs
    const alloc = {
      transactionsPerSec: minTps,
      vaultStorageTb: minStorage,
      fraudInferences: minFraud,
      swiftEndpoints: minSwift,
      hsmKeys: minHsm
    };

    for (const [resKey, weight] of Object.entries(weights)) {
      const budgetSlice = remainingDiscretionary * weight;
      const unitRate = this.resources[resKey].unitRateMonthly * multiplier;
      const addedUnits = Math.floor(budgetSlice / unitRate);
      alloc[resKey] += addedUnits;
    }

    // Iterative fine-tuning to ensure strict adherence to budget
    let currentPricing = this.calculatePricing({ ...alloc, billingFrequency });

    // Step down if over budget
    while (currentPricing.totalCost > budget) {
      if (alloc.transactionsPerSec > minTps) {
        alloc.transactionsPerSec = Math.max(minTps, alloc.transactionsPerSec - 5);
      } else if (alloc.fraudInferences > minFraud) {
        alloc.fraudInferences = Math.max(minFraud, alloc.fraudInferences - 5);
      } else if (alloc.vaultStorageTb > minStorage) {
        alloc.vaultStorageTb = Math.max(minStorage, alloc.vaultStorageTb - 1);
      } else if (alloc.swiftEndpoints > minSwift) {
        alloc.swiftEndpoints = Math.max(minSwift, alloc.swiftEndpoints - 1);
      } else if (alloc.hsmKeys > minHsm) {
        alloc.hsmKeys = Math.max(minHsm, alloc.hsmKeys - 1);
      } else {
        break;
      }
      currentPricing = this.calculatePricing({ ...alloc, billingFrequency });
    }

    const finalResult = {
      targetBudget: budget,
      billingFrequency,
      allocation: alloc,
      pricing: currentPricing,
      remainingBudget: Math.round((budget - currentPricing.totalCost) * 100) / 100,
      isWithinBudget: currentPricing.totalCost <= budget,
      budgetUtilizationPercent: budget > 0
        ? Math.round((currentPricing.totalCost / budget) * 10000) / 100
        : 0,
      exceedsBudget: false
    };

    this.emit('allocationOptimized', finalResult);
    return finalResult;
  }

  /**
   * Event Emitter: subscribe to engine events.
   * Returns an unsubscribe callback function.
   */
  on(event, handler) {
    if (typeof event !== 'string' || typeof handler !== 'function') {
      return () => {};
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Event Emitter: unsubscribe from engine events.
   */
  off(event, handler) {
    if (!this.#listeners.has(event)) return false;
    return this.#listeners.get(event).delete(handler);
  }

  /**
   * Event Emitter: broadcast event data to subscribers safely.
   */
  emit(event, data) {
    if (!this.#listeners.has(event)) return;
    for (const handler of this.#listeners.get(event)) {
      try {
        handler(data);
      } catch {
        // Gracefully ignore listener failure so remaining listeners execute safely
      }
    }
  }

  /**
   * Formats numbers to currency string with 2 decimals.
   */
  formatCurrency(amount) {
    return `${this.currencySymbol}${Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
}

/**
 * Client-side DOM UI binder for cost-optimizer.html
 */
export function mountFintechVaultCostOptimizer(root = document) {
  const engine = new FintechVaultCostOptimizerEngine();

  // Resource sliders and value labels
  const controls = {
    transactionsPerSec: {
      slider: root.getElementById('slider-tps'),
      val: root.getElementById('val-tps'),
      cost: root.getElementById('cost-tps')
    },
    vaultStorageTb: {
      slider: root.getElementById('slider-storage'),
      val: root.getElementById('val-storage'),
      cost: root.getElementById('cost-storage')
    },
    fraudInferences: {
      slider: root.getElementById('slider-fraud'),
      val: root.getElementById('val-fraud'),
      cost: root.getElementById('cost-fraud')
    },
    swiftEndpoints: {
      slider: root.getElementById('slider-swift'),
      val: root.getElementById('val-swift'),
      cost: root.getElementById('cost-swift')
    },
    hsmKeys: {
      slider: root.getElementById('slider-hsm'),
      val: root.getElementById('val-hsm'),
      cost: root.getElementById('cost-hsm')
    }
  };

  const billingToggle = root.getElementById('billing-toggle');
  const billingPeriodLabel = root.getElementById('billing-period-label');
  const totalPriceVal = root.getElementById('total-cost-val');
  const baseSubtotalVal = root.getElementById('base-subtotal-val');
  const volumeDiscountVal = root.getElementById('volume-discount-val');
  const annualDiscountVal = root.getElementById('annual-discount-val');
  const bpsVal = root.getElementById('bps-val');
  const tierBadge = root.getElementById('tier-badge');
  const slaText = root.getElementById('sla-text');
  const donutSvg = root.getElementById('cost-donut-chart');

  function render(pricing) {
    if (!pricing) return;

    if (totalPriceVal) totalPriceVal.textContent = engine.formatCurrency(pricing.totalCost);
    if (baseSubtotalVal) baseSubtotalVal.textContent = engine.formatCurrency(pricing.subtotal);
    if (volumeDiscountVal) {
      volumeDiscountVal.textContent = `-${engine.formatCurrency(pricing.volumeDiscountAmount)} (${pricing.volumeDiscountPercent}%)`;
    }
    if (annualDiscountVal) {
      annualDiscountVal.textContent = pricing.billingFrequency === 'annual'
        ? `-${engine.formatCurrency(pricing.annualDiscountAmount)} (${pricing.annualDiscountPercent}%)`
        : '$0.00 (0%)';
    }
    if (billingPeriodLabel) {
      billingPeriodLabel.textContent = pricing.billingFrequency === 'annual' ? '/ year (billed annually)' : '/ month';
    }
    if (bpsVal) {
      bpsVal.textContent = `${pricing.metrics.effectiveBpsPerTransaction.toFixed(3)} bps`;
    }
    if (tierBadge) {
      tierBadge.textContent = pricing.tier.badge;
      tierBadge.className = `tier-badge tier-${pricing.tier.id}`;
    }
    if (slaText) {
      slaText.textContent = pricing.tier.sla;
    }

    // Update individual line item costs and slider values
    for (const [key, ctrl] of Object.entries(controls)) {
      const lineItem = pricing.lineItems[key];
      if (ctrl.cost && lineItem) {
        ctrl.cost.textContent = engine.formatCurrency(lineItem.periodCost);
      }
      if (ctrl.val && lineItem) {
        ctrl.val.textContent = `${lineItem.units.toLocaleString('en-US')} ${engine.resources[key].unit}`;
      }
    }

    // Dynamic Donut Chart rendering
    if (donutSvg && pricing.subtotal > 0) {
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      let accumulatedPercent = 0;

      const colors = {
        transactionsPerSec: '#10b981',
        vaultStorageTb: '#3b82f6',
        fraudInferences: '#f59e0b',
        swiftEndpoints: '#8b5cf6',
        hsmKeys: '#06b6d4'
      };

      for (const [key, item] of Object.entries(pricing.lineItems)) {
        const seg = root.getElementById(`donut-seg-${key}`);
        if (seg) {
          const sliceLength = (item.periodCost / pricing.subtotal) * circumference;
          const strokeOffset = circumference - sliceLength;
          seg.style.strokeDasharray = `${sliceLength} ${circumference}`;
          seg.style.strokeDashoffset = `-${(accumulatedPercent / 100) * circumference}`;
          accumulatedPercent += (item.periodCost / pricing.subtotal) * 100;
        }
      }
    }
  }

  function readInputs() {
    const isAnnual = billingToggle?.checked ?? false;
    return {
      transactionsPerSec: Number(controls.transactionsPerSec.slider?.value || 0),
      vaultStorageTb: Number(controls.vaultStorageTb.slider?.value || 0),
      fraudInferences: Number(controls.fraudInferences.slider?.value || 0),
      swiftEndpoints: Number(controls.swiftEndpoints.slider?.value || 0),
      hsmKeys: Number(controls.hsmKeys.slider?.value || 0),
      billingFrequency: isAnnual ? 'annual' : 'monthly'
    };
  }

  function recalculate() {
    const inputs = readInputs();
    const pricing = engine.calculatePricing(inputs);
    render(pricing);
  }

  // Bind slider input events
  for (const [key, ctrl] of Object.entries(controls)) {
    if (ctrl.slider) {
      ctrl.slider.addEventListener('input', recalculate);
    }
  }

  if (billingToggle) {
    billingToggle.addEventListener('change', recalculate);
  }

  // Banking Presets
  const presets = {
    'btn-preset-seedling': { tps: 80, storage: 8, fraud: 80, swift: 2, hsm: 2 },
    'btn-preset-neobank': { tps: 800, storage: 80, fraud: 800, swift: 8, hsm: 15 },
    'btn-preset-investment': { tps: 6000, storage: 350, fraud: 7500, swift: 35, hsm: 80 },
    'btn-preset-sovereign': { tps: 18000, storage: 800, fraud: 14000, swift: 90, hsm: 180 }
  };

  for (const [btnId, values] of Object.entries(presets)) {
    const btn = root.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', () => {
        if (controls.transactionsPerSec.slider) controls.transactionsPerSec.slider.value = values.tps;
        if (controls.vaultStorageTb.slider) controls.vaultStorageTb.slider.value = values.storage;
        if (controls.fraudInferences.slider) controls.fraudInferences.slider.value = values.fraud;
        if (controls.swiftEndpoints.slider) controls.swiftEndpoints.slider.value = values.swift;
        if (controls.hsmKeys.slider) controls.hsmKeys.slider.value = values.hsm;
        recalculate();
      });
    }
  }

  // Budget Optimizer Control
  const budgetInput = root.getElementById('input-target-budget');
  const btnOptimize = root.getElementById('btn-optimize-budget');
  const optimizationBanner = root.getElementById('optimization-banner');

  if (btnOptimize && budgetInput) {
    btnOptimize.addEventListener('click', () => {
      const targetBudget = Number(budgetInput.value) || 0;
      const isAnnual = billingToggle?.checked ?? false;
      const opt = engine.optimizeAllocation(targetBudget, {
        billingFrequency: isAnnual ? 'annual' : 'monthly'
      });

      if (controls.transactionsPerSec.slider) controls.transactionsPerSec.slider.value = opt.allocation.transactionsPerSec;
      if (controls.vaultStorageTb.slider) controls.vaultStorageTb.slider.value = opt.allocation.vaultStorageTb;
      if (controls.fraudInferences.slider) controls.fraudInferences.slider.value = opt.allocation.fraudInferences;
      if (controls.swiftEndpoints.slider) controls.swiftEndpoints.slider.value = opt.allocation.swiftEndpoints;
      if (controls.hsmKeys.slider) controls.hsmKeys.slider.value = opt.allocation.hsmKeys;

      render(opt.pricing);

      if (optimizationBanner) {
        optimizationBanner.hidden = false;
        optimizationBanner.textContent = opt.isWithinBudget
          ? `✓ Allocation optimized to $${opt.pricing.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Remaining margin: $${opt.remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })})`
          : `⚠ Specified baseline needs exceed target budget by $${Math.abs(opt.remainingBudget).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      }
    });
  }

  // Quote Generation & Modal
  const btnGenerateQuote = root.getElementById('btn-generate-quote');
  const quoteModal = root.getElementById('quote-modal');
  const btnCloseModal = root.getElementById('btn-close-modal');
  const btnDownloadQuote = root.getElementById('btn-download-quote');
  const quoteDetailsEl = root.getElementById('quote-details-json');

  if (btnGenerateQuote) {
    btnGenerateQuote.addEventListener('click', () => {
      const inputs = readInputs();
      const quote = engine.generateQuote({ inputs });

      if (quoteDetailsEl) {
        quoteDetailsEl.textContent = JSON.stringify(quote, null, 2);
      }
      if (quoteModal) {
        quoteModal.hidden = false;
        quoteModal.classList.add('modal-visible');
      }
    });
  }

  if (btnCloseModal && quoteModal) {
    btnCloseModal.addEventListener('click', () => {
      quoteModal.hidden = true;
      quoteModal.classList.remove('modal-visible');
    });
  }

  if (btnDownloadQuote) {
    btnDownloadQuote.addEventListener('click', () => {
      const quote = engine.generateQuote({ inputs: readInputs() });
      const blob = new Blob([JSON.stringify(quote, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `apexvault-institutional-quote-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Initial calculation
  recalculate();

  return engine;
}

// Auto-mount if executed inside browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => mountFintechVaultCostOptimizer(document));
  } else {
    mountFintechVaultCostOptimizer(document);
  }
}
