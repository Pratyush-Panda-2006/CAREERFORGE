/**
 * Health & Vitality - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2068 - NSoC '26 Level 3 Feature
 * 
 * Provides dynamic resource provisioning modeling, HIPAA-compliant healthcare
 * tier calculations, clinical healthcare subsidies, volume discounts,
 * annual billing incentives, and automatic budget-constrained allocation.
 */

export const HEALTH_TIERS = Object.freeze({
  clinic: {
    id: 'clinic',
    name: 'Wellness Clinic',
    badge: 'Tier 1 • Clinic',
    description: 'Independent medical practices, wellness clinics & community health centers',
    maxPatients: 1000,
    discountRate: 0.0,          // 0% volume discount
    clinicalSubsidyRate: 0.05,  // 5% Public Health & Preventative Care subsidy
    rates: {
      patientProfiles: 1.50,    // $ per patient profile / month
      telehealthHours: 5.00,    // $ per HD video stream hour / month
      iotSyncData: 0.90,        // $ per GB wearable telemetry / month
      aiConsults: 15.00,        // $ per clinical AI diagnostic scan / month
      hipaaStorage: 30.00       // $ per TB encrypted cold storage / month
    }
  },
  hospital: {
    id: 'hospital',
    name: 'Regional Hospital Network',
    badge: 'Tier 2 • Hospital Network',
    description: 'Regional hospitals, acute care centers & outpatient surgery facilities',
    maxPatients: 5000,
    discountRate: 0.10,         // 10% volume discount
    clinicalSubsidyRate: 0.08,  // 8% Regional healthcare infrastructure subsidy
    rates: {
      patientProfiles: 1.25,
      telehealthHours: 4.20,
      iotSyncData: 0.75,
      aiConsults: 12.50,
      hipaaStorage: 25.00
    }
  },
  multisite: {
    id: 'multisite',
    name: 'Multisite Healthcare System',
    badge: 'Tier 3 • Multisite System',
    description: 'Metropolitan health systems, multi-hospital campuses & regional HMO networks',
    maxPatients: 20000,
    discountRate: 0.18,         // 18% volume discount
    clinicalSubsidyRate: 0.10,  // 10% Coordinated care clinical subsidy
    rates: {
      patientProfiles: 1.00,
      telehealthHours: 3.50,
      iotSyncData: 0.60,
      aiConsults: 10.00,
      hipaaStorage: 20.00
    }
  },
  consortium: {
    id: 'consortium',
    name: 'National Integrated Health Consortium',
    badge: 'Tier 4 • National Consortium',
    description: 'National health systems, academic medical alliances & federal care networks',
    maxPatients: Infinity,
    discountRate: 0.25,         // 25% volume discount
    clinicalSubsidyRate: 0.12,  // 12% National public healthcare alliance subsidy
    rates: {
      patientProfiles: 0.80,
      telehealthHours: 2.80,
      iotSyncData: 0.45,
      aiConsults: 8.00,
      hipaaStorage: 15.00
    }
  }
});

export const RESOURCE_METRICS = Object.freeze({
  patientProfiles: {
    key: 'patientProfiles',
    label: 'Active Patient Profiles',
    unit: 'members',
    description: 'HIPAA-compliant longitudinal patient health records, biometric baselines & EHR sync',
    min: 0,
    max: 100000,
    defaultVal: 750
  },
  telehealthHours: {
    key: 'telehealthHours',
    label: 'Telehealth Video Stream Hours',
    unit: 'hours',
    description: 'Encrypted HD peer-to-peer WebRTC video consultations with live clinical transcription',
    min: 0,
    max: 10000,
    defaultVal: 150
  },
  iotSyncData: {
    key: 'iotSyncData',
    label: 'Wearable IoT Telemetry Data',
    unit: 'GB',
    description: 'Continuous continuous glucose monitoring, ECG waveforms, SpO2 & vitals telemetry',
    min: 0,
    max: 20000,
    defaultVal: 350
  },
  aiConsults: {
    key: 'aiConsults',
    label: 'Clinical AI Diagnostic Scans',
    unit: 'scans',
    description: 'FDA-aligned AI triage, biomarker analysis & radiology pre-screening inference passes',
    min: 0,
    max: 5000,
    defaultVal: 120
  },
  hipaaStorage: {
    key: 'hipaaStorage',
    label: 'HIPAA Cold Storage',
    unit: 'TB',
    description: 'AES-256 encrypted immutable diagnostic image archive (DICOM/PACS) & audit log vaults',
    min: 0,
    max: 500,
    defaultVal: 10
  }
});

export class HealthVitalityCostOptimizerEngine {
  #listeners = new Map();
  #lastQuote = null;

  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.annualDiscountRate = 0.20; // 20% annual subscription discount

    this.currentInputs = {
      patientProfiles: this.sanitizeInput(initialConfig.patientProfiles ?? RESOURCE_METRICS.patientProfiles.defaultVal),
      telehealthHours: this.sanitizeInput(initialConfig.telehealthHours ?? RESOURCE_METRICS.telehealthHours.defaultVal),
      iotSyncData: this.sanitizeInput(initialConfig.iotSyncData ?? RESOURCE_METRICS.iotSyncData.defaultVal),
      aiConsults: this.sanitizeInput(initialConfig.aiConsults ?? RESOURCE_METRICS.aiConsults.defaultVal),
      hipaaStorage: this.sanitizeInput(initialConfig.hipaaStorage ?? RESOURCE_METRICS.hipaaStorage.defaultVal),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly',
      tierId: initialConfig.tierId || null
    };
  }

  // --- Event Emitter Pattern ---
  on(event, callback) {
    if (typeof event !== 'string' || typeof callback !== 'function') return () => {};
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.#listeners.has(event)) return this;
    if (callback) {
      this.#listeners.get(event).delete(callback);
    } else {
      this.#listeners.delete(event);
    }
    return this;
  }

  emit(event, ...args) {
    if (!this.#listeners.has(event)) return false;
    for (const listener of this.#listeners.get(event)) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`[HealthVitalityCostOptimizerEngine] Error in listener for "${event}":`, err);
      }
    }
    return true;
  }

  // --- Sanitization & Tier Resolution ---
  sanitizeInput(val) {
    if (val === null || val === undefined || typeof val === 'boolean') return 0;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
    return Math.floor(num);
  }

  determineTier(inputs = {}) {
    const patients = this.sanitizeInput(inputs.patientProfiles);
    if (patients <= HEALTH_TIERS.clinic.maxPatients) {
      return HEALTH_TIERS.clinic;
    }
    if (patients <= HEALTH_TIERS.hospital.maxPatients) {
      return HEALTH_TIERS.hospital;
    }
    if (patients <= HEALTH_TIERS.multisite.maxPatients) {
      return HEALTH_TIERS.multisite;
    }
    return HEALTH_TIERS.consortium;
  }

  applyVolumeDiscount(tierOrId, baseCost = 0) {
    let tier;
    if (typeof tierOrId === 'string') {
      tier = HEALTH_TIERS[tierOrId] || this.determineTier({ patientProfiles: 0 });
    } else if (tierOrId && typeof tierOrId === 'object') {
      tier = tierOrId;
    } else {
      tier = HEALTH_TIERS.clinic;
    }

    const discountRate = tier.discountRate || 0;
    const sanitizedCost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(sanitizedCost * discountRate * 100) / 100;
    const netCost = Math.round((sanitizedCost - discountAmount) * 100) / 100;

    return {
      tier: tier.id || 'clinic',
      discountRate,
      discountPercent: Math.round(discountRate * 100),
      discountAmount,
      netCost
    };
  }

  calculatePricing(inputs = {}) {
    const patientProfiles = this.sanitizeInput(inputs.patientProfiles ?? this.currentInputs.patientProfiles);
    const telehealthHours = this.sanitizeInput(inputs.telehealthHours ?? this.currentInputs.telehealthHours);
    const iotSyncData = this.sanitizeInput(inputs.iotSyncData ?? this.currentInputs.iotSyncData);
    const aiConsults = this.sanitizeInput(inputs.aiConsults ?? this.currentInputs.aiConsults);
    const hipaaStorage = this.sanitizeInput(inputs.hipaaStorage ?? this.currentInputs.hipaaStorage);
    const billingFrequency = (inputs.billingFrequency ?? inputs.billing) === 'annual' ? 'annual' : 'monthly';
    const tierOverride = inputs.tierId || inputs.tier;

    let tier;
    if (typeof tierOverride === 'string' && HEALTH_TIERS[tierOverride]) {
      tier = HEALTH_TIERS[tierOverride];
    } else {
      tier = this.determineTier({ patientProfiles });
    }

    // Monthly unit calculations
    const monthlyPatientCost = Math.round(patientProfiles * tier.rates.patientProfiles * 100) / 100;
    const monthlyTelehealthCost = Math.round(telehealthHours * tier.rates.telehealthHours * 100) / 100;
    const monthlyIotCost = Math.round(iotSyncData * tier.rates.iotSyncData * 100) / 100;
    const monthlyAiCost = Math.round(aiConsults * tier.rates.aiConsults * 100) / 100;
    const monthlyStorageCost = Math.round(hipaaStorage * tier.rates.hipaaStorage * 100) / 100;

    const monthlyBaseCost = Math.round(
      (monthlyPatientCost + monthlyTelehealthCost + monthlyIotCost + monthlyAiCost + monthlyStorageCost) * 100
    ) / 100;

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * multiplier * 100) / 100;

    // 1. Volume Discount
    const volumeResult = this.applyVolumeDiscount(tier, subtotal);
    const volumeDiscountAmount = volumeResult.discountAmount;
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscountAmount) * 100) / 100;

    // 2. Clinical Healthcare Subsidy
    const subsidyRate = tier.clinicalSubsidyRate || 0;
    const clinicalSubsidyAmount = Math.round(afterVolumeDiscount * subsidyRate * 100) / 100;
    const afterSubsidy = Math.round((afterVolumeDiscount - clinicalSubsidyAmount) * 100) / 100;

    // 3. Annual Commitment Discount
    const annualDiscountAmount = isAnnual
      ? Math.round(afterSubsidy * this.annualDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round(
      (volumeDiscountAmount + clinicalSubsidyAmount + annualDiscountAmount) * 100
    ) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100);

    const monthlyEquivalent = Math.round((totalCost / multiplier) * 100) / 100;
    const perPatientCareIndex = patientProfiles > 0
      ? Math.round((totalCost / (multiplier * patientProfiles)) * 100) / 100
      : 0;

    const result = {
      inputs: {
        patientProfiles,
        telehealthHours,
        iotSyncData,
        aiConsults,
        hipaaStorage
      },
      billingFrequency,
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        description: tier.description,
        discountRate: tier.discountRate,
        discountPercent: Math.round(tier.discountRate * 100),
        clinicalSubsidyRate: tier.clinicalSubsidyRate,
        clinicalSubsidyPercent: Math.round(tier.clinicalSubsidyRate * 100),
        rates: { ...tier.rates }
      },
      annualMultiplier: multiplier,
      annualDiscountRate: this.annualDiscountRate,
      annualDiscountPercent: Math.round(this.annualDiscountRate * 100),
      breakdown: {
        patientProfiles: Math.round(monthlyPatientCost * multiplier * 100) / 100,
        telehealthHours: Math.round(monthlyTelehealthCost * multiplier * 100) / 100,
        iotSyncData: Math.round(monthlyIotCost * multiplier * 100) / 100,
        aiConsults: Math.round(monthlyAiCost * multiplier * 100) / 100,
        hipaaStorage: Math.round(monthlyStorageCost * multiplier * 100) / 100
      },
      subtotal,
      baseCost: subtotal,
      volumeDiscountAmount,
      clinicalSubsidyAmount,
      annualDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      totalCost,
      monthlyEquivalent,
      perPatientCareIndex
    };

    this.emit('pricingCalculated', result);
    return result;
  }

  generateQuote(options = {}) {
    let inputsToUse = { ...this.currentInputs };
    if (options && typeof options === 'object') {
      if (options.patientProfiles !== undefined) inputsToUse.patientProfiles = this.sanitizeInput(options.patientProfiles);
      if (options.telehealthHours !== undefined) inputsToUse.telehealthHours = this.sanitizeInput(options.telehealthHours);
      if (options.iotSyncData !== undefined) inputsToUse.iotSyncData = this.sanitizeInput(options.iotSyncData);
      if (options.aiConsults !== undefined) inputsToUse.aiConsults = this.sanitizeInput(options.aiConsults);
      if (options.hipaaStorage !== undefined) inputsToUse.hipaaStorage = this.sanitizeInput(options.hipaaStorage);
      if (options.billingFrequency !== undefined || options.billing !== undefined) {
        inputsToUse.billingFrequency = (options.billingFrequency ?? options.billing) === 'annual' ? 'annual' : 'monthly';
      }
      if (options.tierId !== undefined) inputsToUse.tierId = options.tierId;
    }

    const pricing = this.calculatePricing(inputsToUse);
    const now = new Date();
    const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const quote = {
      quoteId: `HV-QUOTE-${now.getTime().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      schemaVersion: '2026.1',
      generatedAt: now.toISOString(),
      validUntilDays: 30,
      validUntil: validUntil.toISOString(),
      organization: options.organization || 'Health & Vitality Partner Healthcare Org',
      complianceBadges: [
        'HIPAA Compliant (45 CFR § 164)',
        'SOC 2 Type II Certified',
        'HITECH Act Certified',
        'HITRUST CSF Certified',
        'FDA 21 CFR Part 11 Audit Trail'
      ],
      ...pricing
    };

    this.#lastQuote = quote;
    this.emit('quoteGenerated', quote);
    return quote;
  }

  getLastQuote() {
    return this.#lastQuote;
  }

  /**
   * Automatically calculates an optimal resource allocation that maximizes
   * healthcare capacity without exceeding a specified budget.
   *
   * @param {number} targetBudget - The spending limit (currency matching engine.currency).
   * @param {Object} requiredNeeds - Baseline minimum requirements and billing mode.
   * @returns {Object} Optimization outcome with allocated resources and quote.
   */
  optimizeAllocation(targetBudget, requiredNeeds = {}) {
    const budget = Math.max(0, Number(targetBudget) || 0);
    const isAnnual = (requiredNeeds.billingFrequency ?? requiredNeeds.billing) === 'annual';
    const billingFrequency = isAnnual ? 'annual' : 'monthly';

    if (budget <= 0) {
      return {
        success: false,
        reason: 'Target budget must be a positive number.',
        targetBudget: budget,
        allocatedResources: {
          patientProfiles: 0,
          telehealthHours: 0,
          iotSyncData: 0,
          aiConsults: 0,
          hipaaStorage: 0
        },
        totalCost: 0,
        remainingBudget: 0,
        utilizationPercent: 0
      };
    }

    // Baseline minimum needs
    const minPatients = this.sanitizeInput(requiredNeeds.minPatients ?? requiredNeeds.patientProfiles ?? 0);
    const minTelehealth = this.sanitizeInput(requiredNeeds.minTelehealth ?? requiredNeeds.telehealthHours ?? 0);
    const minIot = this.sanitizeInput(requiredNeeds.minIot ?? requiredNeeds.iotSyncData ?? 0);
    const minAi = this.sanitizeInput(requiredNeeds.minAi ?? requiredNeeds.aiConsults ?? 0);
    const minStorage = this.sanitizeInput(requiredNeeds.minHipaaStorage ?? requiredNeeds.hipaaStorage ?? 0);

    const baselinePricing = this.calculatePricing({
      patientProfiles: minPatients,
      telehealthHours: minTelehealth,
      iotSyncData: minIot,
      aiConsults: minAi,
      hipaaStorage: minStorage,
      billingFrequency
    });

    if (baselinePricing.totalCost > budget) {
      return {
        success: false,
        reason: 'Target budget is insufficient to satisfy the specified minimum healthcare requirements.',
        targetBudget: budget,
        minimumRequiredCost: baselinePricing.totalCost,
        allocatedResources: {
          patientProfiles: minPatients,
          telehealthHours: minTelehealth,
          iotSyncData: minIot,
          aiConsults: minAi,
          hipaaStorage: minStorage
        },
        totalCost: baselinePricing.totalCost,
        remainingBudget: Math.round((budget - baselinePricing.totalCost) * 100) / 100,
        utilizationPercent: Math.round((baselinePricing.totalCost / budget) * 10000) / 100
      };
    }

    // Clinical balanced ratio per 100 patient profiles:
    // 100 patients : 20 telehealth hrs : 50 GB IoT : 15 AI consults : 1 TB storage
    const ratio = {
      patients: 100,
      telehealth: 20,
      iot: 50,
      ai: 15,
      storage: 1
    };

    // Binary search for multiplier k on the ratio step
    let low = 0;
    let high = 5000; // supports up to 500,000 patients
    let bestK = 0;
    let bestQuote = baselinePricing;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const testInputs = {
        patientProfiles: minPatients + (mid * ratio.patients),
        telehealthHours: minTelehealth + (mid * ratio.telehealth),
        iotSyncData: minIot + (mid * ratio.iot),
        aiConsults: minAi + (mid * ratio.ai),
        hipaaStorage: minStorage + (mid * ratio.storage),
        billingFrequency
      };

      const quote = this.calculatePricing(testInputs);
      if (quote.totalCost <= budget) {
        bestK = mid;
        bestQuote = quote;
        low = mid + 1; // Try higher capacity
      } else {
        high = mid - 1; // Exceeded budget, reduce
      }
    }

    // Fine-tune single patients if headroom remains
    let fineTunePatients = bestQuote.inputs.patientProfiles;
    let stepQuote = bestQuote;
    for (let extra = 10; extra >= 1; extra -= 3) {
      while (true) {
        const nextQuote = this.calculatePricing({
          ...stepQuote.inputs,
          patientProfiles: fineTunePatients + extra,
          billingFrequency
        });
        if (nextQuote.totalCost <= budget) {
          fineTunePatients += extra;
          stepQuote = nextQuote;
        } else {
          break;
        }
      }
    }

    const finalQuote = stepQuote;
    const remainingBudget = Math.round((budget - finalQuote.totalCost) * 100) / 100;
    const utilizationPercent = Math.round((finalQuote.totalCost / budget) * 10000) / 100;

    const result = {
      success: true,
      targetBudget: budget,
      allocatedResources: { ...finalQuote.inputs },
      quote: finalQuote,
      totalCost: finalQuote.totalCost,
      remainingBudget,
      utilizationPercent
    };

    this.emit('allocationOptimized', result);
    return result;
  }
}

// --- Browser DOM UI Controller ---
export function mountCostOptimizer(root = document) {
  const engine = new HealthVitalityCostOptimizerEngine();

  // Slider Elements
  const sliderPatients = root.querySelector('#slider-patients');
  const sliderTelehealth = root.querySelector('#slider-telehealth');
  const sliderIot = root.querySelector('#slider-iot');
  const sliderAi = root.querySelector('#slider-ai');
  const sliderStorage = root.querySelector('#slider-storage');

  // Value Display Elements
  const valPatients = root.querySelector('#val-patients');
  const valTelehealth = root.querySelector('#val-telehealth');
  const valIot = root.querySelector('#val-iot');
  const valAi = root.querySelector('#val-ai');
  const valStorage = root.querySelector('#val-storage');

  // Billing Toggle
  const billingToggle = root.querySelector('#billing-toggle');
  const billingPeriodLabel = root.querySelector('#billing-period-label');

  // Price Ticker & Summary Displays
  const totalPriceVal = root.querySelector('#total-price-val');
  const basePriceVal = root.querySelector('#base-price-val');
  const volumeDiscountVal = root.querySelector('#volume-discount-val');
  const subsidyDiscountVal = root.querySelector('#subsidy-discount-val');
  const annualDiscountVal = root.querySelector('#annual-discount-val');
  const perPatientIndex = root.querySelector('#per-patient-index');
  const tierBadge = root.querySelector('#tier-badge');
  const tierDesc = root.querySelector('#tier-description');

  // Cost Breakdown Items
  const costPatient = root.querySelector('#cost-patient');
  const costTelehealth = root.querySelector('#cost-telehealth');
  const costIot = root.querySelector('#cost-iot');
  const costAi = root.querySelector('#cost-ai');
  const costStorage = root.querySelector('#cost-storage');

  // Donut SVG Segments
  const segPatient = root.querySelector('#donut-seg-patient');
  const segTelehealth = root.querySelector('#donut-seg-telehealth');
  const segIot = root.querySelector('#donut-seg-iot');
  const segAi = root.querySelector('#donut-seg-ai');
  const segStorage = root.querySelector('#donut-seg-storage');

  // Modal & Optimizer Controls
  const optBudgetInput = root.querySelector('#opt-budget-input');
  const btnRunOptimizer = root.querySelector('#btn-run-optimizer');
  const optResultBox = root.querySelector('#opt-result-box');
  const btnApplyOptimized = root.querySelector('#btn-apply-optimized');
  const btnOpenQuoteModal = root.querySelector('#btn-open-quote-modal');
  const quoteModal = root.querySelector('#quote-modal');
  const btnCloseQuoteModal = root.querySelector('#btn-close-quote-modal');
  const btnDownloadQuote = root.querySelector('#btn-download-quote');
  const btnPrintQuote = root.querySelector('#btn-print-quote');
  const quoteModalBody = root.querySelector('#quote-modal-body');

  let lastOptimizedAllocation = null;

  function formatMoney(amount) {
    return `$${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function update() {
    if (!sliderPatients || !sliderTelehealth || !sliderIot || !sliderAi || !sliderStorage) return;

    const patientProfiles = Number(sliderPatients.value);
    const telehealthHours = Number(sliderTelehealth.value);
    const iotSyncData = Number(sliderIot.value);
    const aiConsults = Number(sliderAi.value);
    const hipaaStorage = Number(sliderStorage.value);
    const isAnnual = billingToggle?.checked ?? false;
    const billingFrequency = isAnnual ? 'annual' : 'monthly';

    // Update Slider text labels
    if (valPatients) valPatients.textContent = `${patientProfiles.toLocaleString()} profiles`;
    if (valTelehealth) valTelehealth.textContent = `${telehealthHours.toLocaleString()} hrs`;
    if (valIot) valIot.textContent = `${iotSyncData.toLocaleString()} GB`;
    if (valAi) valAi.textContent = `${aiConsults.toLocaleString()} scans`;
    if (valStorage) valStorage.textContent = `${hipaaStorage.toLocaleString()} TB`;

    if (billingPeriodLabel) {
      billingPeriodLabel.textContent = isAnnual ? '/ year (billed annually · 20% discount)' : '/ month';
    }

    const quote = engine.calculatePricing({
      patientProfiles,
      telehealthHours,
      iotSyncData,
      aiConsults,
      hipaaStorage,
      billingFrequency
    });

    // Update Price display
    if (totalPriceVal) totalPriceVal.textContent = formatMoney(quote.totalCost);
    if (basePriceVal) basePriceVal.textContent = formatMoney(quote.subtotal);
    if (volumeDiscountVal) volumeDiscountVal.textContent = `-${formatMoney(quote.volumeDiscountAmount)} (${quote.tier.discountPercent}%)`;
    if (subsidyDiscountVal) subsidyDiscountVal.textContent = `-${formatMoney(quote.clinicalSubsidyAmount)} (${quote.tier.clinicalSubsidyPercent}%)`;
    if (annualDiscountVal) {
      annualDiscountVal.textContent = isAnnual ? `-${formatMoney(quote.annualDiscountAmount)} (20%)` : '$0.00';
    }

    if (perPatientIndex) {
      perPatientIndex.textContent = `${formatMoney(quote.perPatientCareIndex)} / patient / mo`;
    }

    // Update Tier Badge
    if (tierBadge) {
      tierBadge.textContent = quote.tier.badge;
      tierBadge.className = `tier-badge tier-${quote.tier.id}`;
    }
    if (tierDesc) {
      tierDesc.textContent = quote.tier.description;
    }

    // Update Itemized Cost Breakdown
    if (costPatient) costPatient.textContent = formatMoney(quote.breakdown.patientProfiles);
    if (costTelehealth) costTelehealth.textContent = formatMoney(quote.breakdown.telehealthHours);
    if (costIot) costIot.textContent = formatMoney(quote.breakdown.iotSyncData);
    if (costAi) costAi.textContent = formatMoney(quote.breakdown.aiConsults);
    if (costStorage) costStorage.textContent = formatMoney(quote.breakdown.hipaaStorage);

    // Update SVG Donut chart segments
    // Circumference for r=45 is 2 * PI * 45 ≈ 282.743
    const circumference = 2 * Math.PI * 45;
    const totalBreakdown = quote.breakdown.patientProfiles +
      quote.breakdown.telehealthHours +
      quote.breakdown.iotSyncData +
      quote.breakdown.aiConsults +
      quote.breakdown.hipaaStorage || 1;

    const segments = [
      { el: segPatient, val: quote.breakdown.patientProfiles },
      { el: segTelehealth, val: quote.breakdown.telehealthHours },
      { el: segIot, val: quote.breakdown.iotSyncData },
      { el: segAi, val: quote.breakdown.aiConsults },
      { el: segStorage, val: quote.breakdown.hipaaStorage }
    ];

    let currentOffset = 0;
    for (const seg of segments) {
      if (!seg.el) continue;
      const proportion = seg.val / totalBreakdown;
      const length = proportion * circumference;
      seg.el.style.strokeDasharray = `${length} ${circumference - length}`;
      seg.el.style.strokeDashoffset = String(-currentOffset);
      currentOffset += length;
    }
  }

  // Wire up slider listeners
  const sliders = [sliderPatients, sliderTelehealth, sliderIot, sliderAi, sliderStorage];
  for (const slider of sliders) {
    slider?.addEventListener('input', update);
  }
  billingToggle?.addEventListener('change', update);

  // Preset Buttons
  root.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const presets = {
        clinic: { p: 450, t: 80, i: 180, a: 40, s: 3 },
        hospital: { p: 3500, t: 750, i: 1600, a: 500, s: 30 },
        multisite: { p: 15000, t: 3200, i: 7500, a: 2200, s: 150 },
        consortium: { p: 48000, t: 9500, i: 20000, a: 4500, s: 380 }
      };
      const p = presets[presetKey];
      if (p) {
        if (sliderPatients) sliderPatients.value = p.p;
        if (sliderTelehealth) sliderTelehealth.value = p.t;
        if (sliderIot) sliderIot.value = p.i;
        if (sliderAi) sliderAi.value = p.a;
        if (sliderStorage) sliderStorage.value = p.s;
        update();
      }
    });
  });

  // Zero Reset Button
  root.querySelector('#btn-reset-zero')?.addEventListener('click', () => {
    if (sliderPatients) sliderPatients.value = 0;
    if (sliderTelehealth) sliderTelehealth.value = 0;
    if (sliderIot) sliderIot.value = 0;
    if (sliderAi) sliderAi.value = 0;
    if (sliderStorage) sliderStorage.value = 0;
    update();
  });

  // Allocation Optimizer Runner
  btnRunOptimizer?.addEventListener('click', () => {
    const budget = Number(optBudgetInput?.value || 0);
    const isAnnual = billingToggle?.checked ?? false;
    const optimization = engine.optimizeAllocation(budget, {
      billingFrequency: isAnnual ? 'annual' : 'monthly'
    });

    if (!optResultBox) return;
    optResultBox.hidden = false;

    if (!optimization.success) {
      optResultBox.innerHTML = `
        <div class="opt-alert opt-alert-error">
          <strong>Optimization Notice:</strong> ${optimization.reason}
        </div>
      `;
      if (btnApplyOptimized) btnApplyOptimized.hidden = true;
      return;
    }

    lastOptimizedAllocation = optimization.allocatedResources;
    const a = optimization.allocatedResources;
    optResultBox.innerHTML = `
      <div class="opt-alert opt-alert-success">
        <h4>Optimal Clinical Provisioning (Budget: ${formatMoney(budget)})</h4>
        <div class="opt-grid">
          <div><span>Patients:</span> <strong>${a.patientProfiles.toLocaleString()}</strong></div>
          <div><span>Telehealth:</span> <strong>${a.telehealthHours.toLocaleString()} hrs</strong></div>
          <div><span>IoT Sync:</span> <strong>${a.iotSyncData.toLocaleString()} GB</strong></div>
          <div><span>AI Scans:</span> <strong>${a.aiConsults.toLocaleString()}</strong></div>
          <div><span>Storage:</span> <strong>${a.hipaaStorage.toLocaleString()} TB</strong></div>
        </div>
        <div class="opt-meta">
          <span>Projected Total: <strong>${formatMoney(optimization.totalCost)}</strong></span>
          <span>Budget Headroom: <strong>${formatMoney(optimization.remainingBudget)}</strong> (${optimization.utilizationPercent}% utilized)</span>
        </div>
      </div>
    `;
    if (btnApplyOptimized) btnApplyOptimized.hidden = false;
  });

  btnApplyOptimized?.addEventListener('click', () => {
    if (!lastOptimizedAllocation) return;
    if (sliderPatients) sliderPatients.value = lastOptimizedAllocation.patientProfiles;
    if (sliderTelehealth) sliderTelehealth.value = lastOptimizedAllocation.telehealthHours;
    if (sliderIot) sliderIot.value = lastOptimizedAllocation.iotSyncData;
    if (sliderAi) sliderAi.value = lastOptimizedAllocation.aiConsults;
    if (sliderStorage) sliderStorage.value = lastOptimizedAllocation.hipaaStorage;
    update();
    if (optResultBox) optResultBox.hidden = true;
    if (btnApplyOptimized) btnApplyOptimized.hidden = true;
  });

  // Formal Quote Modal Generator
  btnOpenQuoteModal?.addEventListener('click', () => {
    const isAnnual = billingToggle?.checked ?? false;
    const quote = engine.generateQuote({
      patientProfiles: Number(sliderPatients.value),
      telehealthHours: Number(sliderTelehealth.value),
      iotSyncData: Number(sliderIot.value),
      aiConsults: Number(sliderAi.value),
      hipaaStorage: Number(sliderStorage.value),
      billingFrequency: isAnnual ? 'annual' : 'monthly'
    });

    if (quoteModalBody) {
      quoteModalBody.innerHTML = `
        <div class="formal-quote-sheet">
          <div class="quote-sheet-header">
            <div>
              <h3>Health & Vitality Infrastructure Quote</h3>
              <p class="quote-id-tag">Reference: <code>${quote.quoteId}</code></p>
            </div>
            <div class="quote-date-box">
              <span>Date: ${new Date(quote.generatedAt).toLocaleDateString()}</span>
              <span>Valid for: ${quote.validUntilDays} Days</span>
            </div>
          </div>

          <div class="compliance-pill-row">
            ${quote.complianceBadges.map(b => `<span class="comp-badge">✓ ${b}</span>`).join('')}
          </div>

          <table class="quote-table">
            <thead>
              <tr>
                <th>Service Line</th>
                <th>Allocated Units</th>
                <th>Rate Tier</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Active Patient Profiles</td>
                <td>${quote.inputs.patientProfiles.toLocaleString()} members</td>
                <td>${formatMoney(quote.tier.rates.patientProfiles)} / patient</td>
                <td>${formatMoney(quote.breakdown.patientProfiles)}</td>
              </tr>
              <tr>
                <td>Telehealth Video Stream Hours</td>
                <td>${quote.inputs.telehealthHours.toLocaleString()} hours</td>
                <td>${formatMoney(quote.tier.rates.telehealthHours)} / hr</td>
                <td>${formatMoney(quote.breakdown.telehealthHours)}</td>
              </tr>
              <tr>
                <td>Wearable IoT Sync Data</td>
                <td>${quote.inputs.iotSyncData.toLocaleString()} GB</td>
                <td>${formatMoney(quote.tier.rates.iotSyncData)} / GB</td>
                <td>${formatMoney(quote.breakdown.iotSyncData)}</td>
              </tr>
              <tr>
                <td>Clinical AI Diagnostic Consults</td>
                <td>${quote.inputs.aiConsults.toLocaleString()} scans</td>
                <td>${formatMoney(quote.tier.rates.aiConsults)} / scan</td>
                <td>${formatMoney(quote.breakdown.aiConsults)}</td>
              </tr>
              <tr>
                <td>HIPAA Cold Storage</td>
                <td>${quote.inputs.hipaaStorage.toLocaleString()} TB</td>
                <td>${formatMoney(quote.tier.rates.hipaaStorage)} / TB</td>
                <td>${formatMoney(quote.breakdown.hipaaStorage)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">List Subtotal (${quote.billingFrequency})</td>
                <td><strong>${formatMoney(quote.subtotal)}</strong></td>
              </tr>
              <tr class="discount-row">
                <td colspan="3">Clinical Volume Discount (${quote.tier.name} · ${quote.tier.discountPercent}%)</td>
                <td>-${formatMoney(quote.volumeDiscountAmount)}</td>
              </tr>
              <tr class="discount-row">
                <td colspan="3">Healthcare Infrastructure Subsidy (${quote.tier.clinicalSubsidyPercent}%)</td>
                <td>-${formatMoney(quote.clinicalSubsidyAmount)}</td>
              </tr>
              ${quote.billingFrequency === 'annual' ? `
              <tr class="discount-row">
                <td colspan="3">Annual Subscription Commitment Incentive (20%)</td>
                <td>-${formatMoney(quote.annualDiscountAmount)}</td>
              </tr>` : ''}
              <tr class="total-row">
                <td colspan="3">Projected Net Investment</td>
                <td><strong>${formatMoney(quote.totalCost)} ${quote.currency}</strong></td>
              </tr>
              <tr class="metric-row">
                <td colspan="3">Per-Patient Monthly Care Index</td>
                <td><strong>${formatMoney(quote.perPatientCareIndex)} / patient / mo</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }

    if (quoteModal) quoteModal.hidden = false;
  });

  btnCloseQuoteModal?.addEventListener('click', () => {
    if (quoteModal) quoteModal.hidden = true;
  });

  btnDownloadQuote?.addEventListener('click', () => {
    const quote = engine.getLastQuote() || engine.generateQuote();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quote, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${quote.quoteId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  btnPrintQuote?.addEventListener('click', () => {
    window.print();
  });

  // Run initial calculation
  update();
}

// Auto mount if in browser environment
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountCostOptimizer());
  } else {
    mountCostOptimizer();
  }
}
