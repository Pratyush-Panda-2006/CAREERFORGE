/**
 * EdTech Academy - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2076 - Level 3 Feature
 */

export const EDTECH_TIERS = {
  starter: {
    id: 'starter',
    name: 'Starter Cohort',
    badge: 'Starter • Cohort',
    description: 'Designed for pilot programs, single instructors, and boutique bootcamp cohorts.',
    maxStudents: 250,
    maxStreams: 10,
    maxStorageTB: 2,
    maxAiCredits: 5000,
    maxProctoringSessions: 100,
    rates: {
      students: 5.00,        // $ per student seat / month
      streams: 15.00,        // $ per concurrent virtual classroom stream / month
      storageTB: 25.00,      // $ per TB video lecture repository / month
      aiCredits: 0.02,       // $ per AI tutor bot credit / month
      proctoring: 1.50       // $ per proctored verification session / month
    },
    volumeDiscountRate: 0.0,      // 0% volume discount
    academicSubsidyRate: 0.05,    // 5% baseline academic grant subsidy
  },
  departmental: {
    id: 'departmental',
    name: 'Departmental Faculty',
    badge: 'Departmental • Growth',
    description: 'Tailored for academic departments, university faculties, and expanding digital schools.',
    maxStudents: 1500,
    maxStreams: 50,
    maxStorageTB: 10,
    maxAiCredits: 30000,
    maxProctoringSessions: 750,
    rates: {
      students: 4.00,
      streams: 12.00,
      storageTB: 20.00,
      aiCredits: 0.015,
      proctoring: 1.20
    },
    volumeDiscountRate: 0.10,     // 10% volume discount
    academicSubsidyRate: 0.10,    // 10% academic grant subsidy
  },
  campus: {
    id: 'campus',
    name: 'Campus-wide Institution',
    badge: 'Campus-wide • Premier',
    description: 'Enterprise education platform for full colleges, universities, and large academic centers.',
    maxStudents: 10000,
    maxStreams: 200,
    maxStorageTB: 50,
    maxAiCredits: 150000,
    maxProctoringSessions: 5000,
    rates: {
      students: 3.00,
      streams: 9.00,
      storageTB: 15.00,
      aiCredits: 0.010,
      proctoring: 0.90
    },
    volumeDiscountRate: 0.18,     // 18% volume discount
    academicSubsidyRate: 0.15,    // 15% academic grant subsidy
  },
  multiCampus: {
    id: 'multiCampus',
    name: 'Multi-Campus University System',
    badge: 'Multi-Campus • System',
    description: 'High-availability educational infrastructure for multi-institution consortia and university systems.',
    maxStudents: Infinity,
    maxStreams: Infinity,
    maxStorageTB: Infinity,
    maxAiCredits: Infinity,
    maxProctoringSessions: Infinity,
    rates: {
      students: 2.20,
      streams: 6.50,
      storageTB: 10.00,
      aiCredits: 0.006,
      proctoring: 0.65
    },
    volumeDiscountRate: 0.25,     // 25% volume discount
    academicSubsidyRate: 0.20,    // 20% academic grant subsidy
  }
};

export class EdtechAcademyCostOptimizerEngine {
  #listeners = new Map();

  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.annualDiscountRate = 0.20; // 20% discount for annual academic commitment
    this.tiers = EDTECH_TIERS;

    this.currentInputs = {
      students: this.sanitizeInput(initialConfig.students ?? 500),
      streams: this.sanitizeInput(initialConfig.streams ?? 15),
      storageTB: this.sanitizeInput(initialConfig.storageTB ?? 5, true),
      aiCredits: this.sanitizeInput(initialConfig.aiCredits ?? 10000),
      proctoring: this.sanitizeInput(initialConfig.proctoring ?? 250),
      billingFrequency: initialConfig.billingFrequency === 'annual' ? 'annual' : 'monthly',
      applyAcademicSubsidy: initialConfig.applyAcademicSubsidy !== false
    };

    this.lastQuote = null;
  }

  // Event Emitter Pattern
  on(event, handler) {
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function.');
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.#listeners.has(event)) return;
    this.#listeners.get(event).delete(handler);
    if (this.#listeners.get(event).size === 0) {
      this.#listeners.delete(event);
    }
  }

  emit(event, ...args) {
    if (!this.#listeners.has(event)) return false;
    for (const handler of Array.from(this.#listeners.get(event))) {
      try {
        handler(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  sanitizeInput(val, allowDecimals = false) {
    if (val === null || val === undefined || typeof val === 'boolean') return 0;
    const num = Number(val);
    if (!Number.isFinite(num) || isNaN(num) || num < 0) return 0;
    return allowDecimals ? Math.round(num * 100) / 100 : Math.floor(num);
  }

  getTier(tierId) {
    if (typeof tierId !== 'string') return null;
    const lower = tierId.toLowerCase().trim();
    if (lower === 'starter' || lower === 'starter cohort') return this.tiers.starter;
    if (lower === 'departmental' || lower === 'departmental faculty') return this.tiers.departmental;
    if (lower === 'campus' || lower === 'campus-wide' || lower === 'campus-wide institution') return this.tiers.campus;
    if (lower === 'multicampus' || lower === 'multi-campus' || lower === 'multi-campus university system') return this.tiers.multiCampus;
    return this.tiers[tierId] || null;
  }

  determineTier(inputs = {}) {
    const students = this.sanitizeInput(inputs.students ?? 0);
    const streams = this.sanitizeInput(inputs.streams ?? 0);
    const storageTB = this.sanitizeInput(inputs.storageTB ?? 0, true);
    const aiCredits = this.sanitizeInput(inputs.aiCredits ?? 0);
    const proctoring = this.sanitizeInput(inputs.proctoring ?? 0);

    const s = this.tiers.starter;
    const d = this.tiers.departmental;
    const c = this.tiers.campus;

    if (
      students <= s.maxStudents &&
      streams <= s.maxStreams &&
      storageTB <= s.maxStorageTB &&
      aiCredits <= s.maxAiCredits &&
      proctoring <= s.maxProctoringSessions
    ) {
      return this.tiers.starter;
    }

    if (
      students <= d.maxStudents &&
      streams <= d.maxStreams &&
      storageTB <= d.maxStorageTB &&
      aiCredits <= d.maxAiCredits &&
      proctoring <= d.maxProctoringSessions
    ) {
      return this.tiers.departmental;
    }

    if (
      students <= c.maxStudents &&
      streams <= c.maxStreams &&
      storageTB <= c.maxStorageTB &&
      aiCredits <= c.maxAiCredits &&
      proctoring <= c.maxProctoringSessions
    ) {
      return this.tiers.campus;
    }

    return this.tiers.multiCampus;
  }

  applyVolumeDiscount(tierOrId, baseCost = 0) {
    let tier = null;
    if (typeof tierOrId === 'string') {
      tier = this.getTier(tierOrId);
      if (!tier) throw new TypeError(`Unknown volume tier: ${tierOrId}`);
    } else if (tierOrId && typeof tierOrId === 'object' && tierOrId.id && this.tiers[tierOrId.id]) {
      tier = tierOrId;
    } else {
      throw new TypeError('Tier must be a valid tier string or tier object.');
    }

    const rate = Number(tier.volumeDiscountRate ?? tier.discountRate ?? 0);
    const cost = Math.max(0, Number(baseCost) || 0);
    const discountAmount = Math.round(cost * rate * 100) / 100;
    const netCost = Math.round((cost - discountAmount) * 100) / 100;

    return {
      tier: tier.id,
      tierName: tier.name,
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      discountAmount,
      netCost,
      baseCost: cost
    };
  }

  calculatePricing(inputs = {}) {
    if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
      inputs = {};
    }

    const getVal = (key, allowDecimals = false) => {
      if (inputs && Object.hasOwn(inputs, key)) {
        return this.sanitizeInput(inputs[key], allowDecimals);
      }
      return this.currentInputs[key];
    };

    const students = getVal('students');
    const streams = getVal('streams');
    const storageTB = getVal('storageTB', true);
    const aiCredits = getVal('aiCredits');
    const proctoring = getVal('proctoring');

    const billingFrequency = (inputs.billingFrequency ?? inputs.billing ?? this.currentInputs.billingFrequency) === 'annual'
      ? 'annual'
      : 'monthly';

    const applyAcademicSubsidy = inputs.applyAcademicSubsidy !== undefined
      ? Boolean(inputs.applyAcademicSubsidy)
      : (inputs.academicSubsidy !== undefined ? Boolean(inputs.academicSubsidy) : this.currentInputs.applyAcademicSubsidy);

    // Determine tier (support explicit tier override if provided)
    const tier = inputs.tier ? (this.getTier(inputs.tier) || this.determineTier({ students, streams, storageTB, aiCredits, proctoring }))
                            : this.determineTier({ students, streams, storageTB, aiCredits, proctoring });

    // Itemized resource calculations
    const studentsMonthly = Math.round(students * tier.rates.students * 100) / 100;
    const streamsMonthly = Math.round(streams * tier.rates.streams * 100) / 100;
    const storageMonthly = Math.round(storageTB * tier.rates.storageTB * 100) / 100;
    const aiCreditsMonthly = Math.round(aiCredits * tier.rates.aiCredits * 100) / 100;
    const proctoringMonthly = Math.round(proctoring * tier.rates.proctoring * 100) / 100;

    const monthlyBaseCost = Math.round((studentsMonthly + streamsMonthly + storageMonthly + aiCreditsMonthly + proctoringMonthly) * 100) / 100;

    const isAnnual = billingFrequency === 'annual';
    const multiplier = isAnnual ? 12 : 1;
    const subtotal = Math.round(monthlyBaseCost * multiplier * 100) / 100;

    // Volume discount
    const volumeDiscount = this.applyVolumeDiscount(tier, subtotal);
    const volumeDiscountAmount = volumeDiscount.discountAmount;
    const afterVolumeDiscount = Math.round((subtotal - volumeDiscountAmount) * 100) / 100;

    // Academic Institution Subsidy
    const academicSubsidyRate = applyAcademicSubsidy ? tier.academicSubsidyRate : 0;
    const academicSubsidyAmount = applyAcademicSubsidy
      ? Math.round(afterVolumeDiscount * academicSubsidyRate * 100) / 100
      : 0;
    const afterAcademicSubsidy = Math.round((afterVolumeDiscount - academicSubsidyAmount) * 100) / 100;

    // Annual academic year discount (20% off)
    const annualDiscountRate = isAnnual ? this.annualDiscountRate : 0;
    const annualDiscountAmount = isAnnual
      ? Math.round(afterAcademicSubsidy * annualDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round((volumeDiscountAmount + academicSubsidyAmount + annualDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((subtotal - totalDiscountAmount) * 100) / 100);

    const monthlyEquivalentCost = isAnnual ? Math.round((totalCost / 12) * 100) / 100 : totalCost;
    const costPerStudentMonthly = students > 0 ? Math.round((monthlyEquivalentCost / students) * 100) / 100 : 0;
    const costPerStudentAnnual = students > 0 ? Math.round(((monthlyEquivalentCost * 12) / students) * 100) / 100 : 0;

    const quote = {
      schemaVersion: 1,
      tariffId: 'edtech-academy-cost-optimizer-v1',
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      billingFrequency,
      isAnnual,
      annualMultiplier: multiplier,
      annualDiscountRate: this.annualDiscountRate,
      annualDiscountPercent: Math.round(this.annualDiscountRate * 100),
      applyAcademicSubsidy,
      inputs: {
        students,
        streams,
        storageTB,
        aiCredits,
        proctoring
      },
      tier: {
        id: tier.id,
        name: tier.name,
        badge: tier.badge,
        description: tier.description,
        volumeDiscountRate: tier.volumeDiscountRate,
        volumeDiscountPercent: Math.round(tier.volumeDiscountRate * 100),
        academicSubsidyRate: tier.academicSubsidyRate,
        academicSubsidyPercent: Math.round(tier.academicSubsidyRate * 100),
        rates: { ...tier.rates }
      },
      rates: { ...tier.rates },
      breakdown: {
        students: {
          units: students,
          unitLabel: 'Student Seats',
          rate: tier.rates.students,
          monthlyCost: studentsMonthly,
          subtotal: Math.round(studentsMonthly * multiplier * 100) / 100
        },
        streams: {
          units: streams,
          unitLabel: 'Concurrent Streams',
          rate: tier.rates.streams,
          monthlyCost: streamsMonthly,
          subtotal: Math.round(streamsMonthly * multiplier * 100) / 100
        },
        storageTB: {
          units: storageTB,
          unitLabel: 'TB Video Repository',
          rate: tier.rates.storageTB,
          monthlyCost: storageMonthly,
          subtotal: Math.round(storageMonthly * multiplier * 100) / 100
        },
        aiCredits: {
          units: aiCredits,
          unitLabel: 'AI Tutor Credits',
          rate: tier.rates.aiCredits,
          monthlyCost: aiCreditsMonthly,
          subtotal: Math.round(aiCreditsMonthly * multiplier * 100) / 100
        },
        proctoring: {
          units: proctoring,
          unitLabel: 'Proctored Exam Sessions',
          rate: tier.rates.proctoring,
          monthlyCost: proctoringMonthly,
          subtotal: Math.round(proctoringMonthly * multiplier * 100) / 100
        }
      },
      monthlyBaseCost,
      subtotal,
      baseCost: subtotal,
      volumeDiscountAmount,
      academicSubsidyAmount,
      academicSubsidyRate,
      academicSubsidyPercent: Math.round(academicSubsidyRate * 100),
      annualDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      totalCost,
      monthlyEquivalentCost,
      costPerStudentMonthly,
      costPerStudentAnnual,
      generatedAt: new Date().toISOString()
    };

    this.lastQuote = quote;
    this.emit('pricingCalculated', quote);
    this.emit('calculate', quote);

    return quote;
  }

  generateQuote(options = null) {
    if (options && typeof options === 'object') {
      if (options.students !== undefined) this.currentInputs.students = this.sanitizeInput(options.students);
      if (options.streams !== undefined) this.currentInputs.streams = this.sanitizeInput(options.streams);
      if (options.storageTB !== undefined) this.currentInputs.storageTB = this.sanitizeInput(options.storageTB, true);
      if (options.aiCredits !== undefined) this.currentInputs.aiCredits = this.sanitizeInput(options.aiCredits);
      if (options.proctoring !== undefined) this.currentInputs.proctoring = this.sanitizeInput(options.proctoring);
      if (options.billingFrequency !== undefined || options.billing !== undefined) {
        this.currentInputs.billingFrequency = (options.billingFrequency ?? options.billing) === 'annual' ? 'annual' : 'monthly';
      }
      if (options.applyAcademicSubsidy !== undefined) {
        this.currentInputs.applyAcademicSubsidy = Boolean(options.applyAcademicSubsidy);
      }
    }
    const quote = this.calculatePricing(this.currentInputs);
    const fullQuote = {
      ...quote,
      quoteId: `EDTECH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      institutionName: options?.institutionName || 'EdTech Academy Partner Institution',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.emit('quoteGenerated', fullQuote);
    this.emit('quote', fullQuote);
    return structuredClone(fullQuote);
  }

  optimizeAllocation(targetBudget, requiredNeeds = {}) {
    const budget = Number(targetBudget);
    if (!Number.isFinite(budget) || isNaN(budget) || budget <= 0) {
      return {
        feasible: false,
        targetBudget: Math.max(0, budget || 0),
        allocatedCost: 0,
        remainingBudget: 0,
        allocation: { students: 0, streams: 0, storageTB: 0, aiCredits: 0, proctoring: 0 },
        message: 'Target budget must be greater than zero.',
        quote: null
      };
    }

    const billingFrequency = (requiredNeeds.billingFrequency ?? requiredNeeds.billing ?? 'monthly') === 'annual'
      ? 'annual'
      : 'monthly';
    const applyAcademicSubsidy = requiredNeeds.applyAcademicSubsidy !== false;

    // Minimum baseline requirements
    let students = this.sanitizeInput(requiredNeeds.students ?? 100);
    let streams = this.sanitizeInput(requiredNeeds.streams ?? 5);
    let storageTB = this.sanitizeInput(requiredNeeds.storageTB ?? 1, true);
    let aiCredits = this.sanitizeInput(requiredNeeds.aiCredits ?? 2000);
    let proctoring = this.sanitizeInput(requiredNeeds.proctoring ?? 50);

    let baselineQuote = this.calculatePricing({
      students, streams, storageTB, aiCredits, proctoring,
      billingFrequency, applyAcademicSubsidy
    });

    if (baselineQuote.totalCost > budget) {
      // Scale down proportionally to meet budget if baseline exceeds budget
      const scaleFactor = budget / baselineQuote.totalCost;
      students = Math.max(1, Math.floor(students * scaleFactor));
      streams = Math.max(1, Math.floor(streams * scaleFactor));
      storageTB = Math.max(0.5, Math.round(storageTB * scaleFactor * 10) / 10);
      aiCredits = Math.max(100, Math.floor(aiCredits * scaleFactor));
      proctoring = Math.max(10, Math.floor(proctoring * scaleFactor));

      let adjustedQuote = this.calculatePricing({
        students, streams, storageTB, aiCredits, proctoring,
        billingFrequency, applyAcademicSubsidy
      });

      while (adjustedQuote.totalCost > budget && students > 1) {
        students = Math.max(1, students - Math.ceil(students * 0.05));
        adjustedQuote = this.calculatePricing({
          students, streams, storageTB, aiCredits, proctoring,
          billingFrequency, applyAcademicSubsidy
        });
      }

      return {
        feasible: adjustedQuote.totalCost <= budget,
        targetBudget: budget,
        allocatedCost: adjustedQuote.totalCost,
        remainingBudget: Math.max(0, Math.round((budget - adjustedQuote.totalCost) * 100) / 100),
        allocation: { students, streams, storageTB, aiCredits, proctoring },
        tier: adjustedQuote.tier,
        costPerStudentMonthly: adjustedQuote.costPerStudentMonthly,
        message: 'Required needs exceeded target budget. Adjusted allocation scaled down to fit constraints.',
        quote: adjustedQuote
      };
    }

    // Baseline fits within budget! Allocate surplus
    let surplus = budget - baselineQuote.totalCost;
    let currentAllocation = { students, streams, storageTB, aiCredits, proctoring };

    const weights = {
      students: 0.45,
      streams: 0.15,
      storageTB: 0.10,
      aiCredits: 0.25,
      proctoring: 0.05
    };

    const currentTier = baselineQuote.tier;
    const effectiveDiscount = 1 - (
      (baselineQuote.totalDiscountAmount / baselineQuote.subtotal) || 0
    );
    const months = billingFrequency === 'annual' ? 12 : 1;

    const addStudents = Math.floor((surplus * weights.students) / (Math.max(1, currentTier.rates.students * months * effectiveDiscount)));
    const addStreams = Math.floor((surplus * weights.streams) / (Math.max(1, currentTier.rates.streams * months * effectiveDiscount)));
    const addStorageTB = Math.floor((surplus * weights.storageTB) / (Math.max(1, currentTier.rates.storageTB * months * effectiveDiscount)));
    const addAiCredits = Math.floor((surplus * weights.aiCredits) / (Math.max(0.001, currentTier.rates.aiCredits * months * effectiveDiscount)));
    const addProctoring = Math.floor((surplus * weights.proctoring) / (Math.max(0.1, currentTier.rates.proctoring * months * effectiveDiscount)));

    currentAllocation.students += Math.max(0, addStudents);
    currentAllocation.streams += Math.max(0, addStreams);
    currentAllocation.storageTB += Math.max(0, addStorageTB);
    currentAllocation.aiCredits += Math.max(0, addAiCredits);
    currentAllocation.proctoring += Math.max(0, addProctoring);

    let finalQuote = this.calculatePricing({
      ...currentAllocation,
      billingFrequency,
      applyAcademicSubsidy
    });

    while (finalQuote.totalCost > budget && currentAllocation.students > 10) {
      currentAllocation.students -= Math.max(1, Math.ceil(currentAllocation.students * 0.02));
      finalQuote = this.calculatePricing({
        ...currentAllocation,
        billingFrequency,
        applyAcademicSubsidy
      });
    }

    let step = Math.max(1, Math.floor(currentAllocation.students * 0.05));
    while (step >= 1) {
      const testQuote = this.calculatePricing({
        ...currentAllocation,
        students: currentAllocation.students + step,
        billingFrequency,
        applyAcademicSubsidy
      });
      if (testQuote.totalCost <= budget) {
        currentAllocation.students += step;
        finalQuote = testQuote;
      } else {
        step = Math.floor(step / 2);
      }
    }

    const result = {
      feasible: true,
      targetBudget: budget,
      allocatedCost: finalQuote.totalCost,
      remainingBudget: Math.round((budget - finalQuote.totalCost) * 100) / 100,
      allocation: { ...currentAllocation },
      tier: finalQuote.tier,
      costPerStudentMonthly: finalQuote.costPerStudentMonthly,
      message: 'Optimal resource allocation calculated within budget bounds.',
      quote: finalQuote
    };

    this.emit('allocationOptimized', result);
    this.emit('optimize', result);
    return result;
  }
}

// Client-side DOM UI binding
export function mountCostOptimizer(root = document) {
  if (!root) return null;
  const engine = new EdtechAcademyCostOptimizerEngine();
  const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const money = val => currencyFormatter.format(val);

  // Input mapping
  const resources = ['students', 'streams', 'storageTB', 'aiCredits', 'proctoring'];

  const getInputs = () => {
    const inputs = {
      billingFrequency: root.querySelector('input[name="billingFrequency"]:checked')?.value || 'monthly',
      applyAcademicSubsidy: root.querySelector('#academicSubsidyToggle')?.checked ?? true
    };
    for (const res of resources) {
      const el = root.querySelector(`#${res}Input`);
      if (el) inputs[res] = el.valueAsNumber || Number(el.value) || 0;
    }
    return inputs;
  };

  const updateUI = () => {
    const inputs = getInputs();
    const quote = engine.calculatePricing(inputs);

    // Update Tier Card & Badge
    const tierBadge = root.querySelector('#tierBadge');
    if (tierBadge) tierBadge.textContent = quote.tier.badge;
    const tierName = root.querySelector('#tierName');
    if (tierName) tierName.textContent = quote.tier.name;
    const tierDesc = root.querySelector('#tierDescription');
    if (tierDesc) tierDesc.textContent = quote.tier.description;

    // Update Totals & Metrics
    const totalCostEl = root.querySelector('#totalCostValue');
    if (totalCostEl) totalCostEl.textContent = money(quote.totalCost);

    const billingPeriodLabel = root.querySelector('#billingPeriodLabel');
    if (billingPeriodLabel) {
      billingPeriodLabel.textContent = quote.isAnnual ? 'per academic year' : 'per month';
    }

    const monthlyEqEl = root.querySelector('#monthlyEquivalentValue');
    if (monthlyEqEl) {
      monthlyEqEl.textContent = quote.isAnnual
        ? `${money(quote.monthlyEquivalentCost)} / mo effective`
        : 'Billed monthly, cancel anytime';
    }

    const perStudentEl = root.querySelector('#perStudentCostValue');
    if (perStudentEl) {
      perStudentEl.textContent = `${money(quote.costPerStudentMonthly)} / student / mo`;
    }

    // Discounts
    const subtotalEl = root.querySelector('#subtotalValue');
    if (subtotalEl) subtotalEl.textContent = money(quote.subtotal);

    const volumeDiscountEl = root.querySelector('#volumeDiscountValue');
    if (volumeDiscountEl) {
      volumeDiscountEl.textContent = quote.volumeDiscountAmount > 0
        ? `-${money(quote.volumeDiscountAmount)} (${quote.tier.volumeDiscountPercent}%)`
        : '$0.00 (0%)';
    }

    const academicSubsidyEl = root.querySelector('#academicSubsidyValue');
    if (academicSubsidyEl) {
      academicSubsidyEl.textContent = quote.academicSubsidyAmount > 0
        ? `-${money(quote.academicSubsidyAmount)} (${quote.academicSubsidyPercent}%)`
        : '$0.00 (0%)';
    }

    const annualDiscountEl = root.querySelector('#annualDiscountValue');
    if (annualDiscountEl) {
      annualDiscountEl.textContent = quote.annualDiscountAmount > 0
        ? `-${money(quote.annualDiscountAmount)} (20%)`
        : '$0.00 (0%)';
    }

    const totalSavingsEl = root.querySelector('#totalSavingsValue');
    if (totalSavingsEl) {
      totalSavingsEl.textContent = money(quote.totalDiscountAmount);
    }

    // Breakdown Line Items
    for (const [key, item] of Object.entries(quote.breakdown)) {
      const lineCostEl = root.querySelector(`#breakdown-${key}-cost`);
      if (lineCostEl) lineCostEl.textContent = money(item.subtotal);
      const lineRateEl = root.querySelector(`#breakdown-${key}-rate`);
      if (lineRateEl) lineRateEl.textContent = `${money(item.rate)} / unit`;
    }

    return quote;
  };

  // Sync sliders & number inputs
  for (const res of resources) {
    const num = root.querySelector(`#${res}Input`);
    const slider = root.querySelector(`#${res}Slider`);
    if (num && slider) {
      num.addEventListener('input', () => {
        slider.value = num.value;
        updateUI();
      });
      slider.addEventListener('input', () => {
        num.value = slider.value;
        updateUI();
      });
    }
  }

  // Billing Radio & Subsidy Checkbox
  root.querySelectorAll('input[name="billingFrequency"]').forEach(r => {
    r.addEventListener('change', updateUI);
  });
  root.querySelector('#academicSubsidyToggle')?.addEventListener('change', updateUI);

  // Quick preset buttons
  const presets = {
    presetBootcamp: { students: 150, streams: 8, storageTB: 2, aiCredits: 3500, proctoring: 80 },
    presetDept: { students: 800, streams: 25, storageTB: 8, aiCredits: 18000, proctoring: 400 },
    presetCampus: { students: 4500, streams: 90, storageTB: 25, aiCredits: 65000, proctoring: 2200 },
    presetSystem: { students: 16000, streams: 250, storageTB: 75, aiCredits: 220000, proctoring: 7500 }
  };

  for (const [id, presetVals] of Object.entries(presets)) {
    root.querySelector(`#${id}`)?.addEventListener('click', () => {
      for (const [res, val] of Object.entries(presetVals)) {
        const num = root.querySelector(`#${res}Input`);
        const slider = root.querySelector(`#${res}Slider`);
        if (num) num.value = val;
        if (slider) slider.value = val;
      }
      updateUI();
    });
  }

  // Allocation Optimizer UI
  const optimizeBtn = root.querySelector('#btnOptimizeBudget');
  const budgetInput = root.querySelector('#targetBudgetInput');
  const optimizeResultCard = root.querySelector('#optimizeResultCard');

  if (optimizeBtn && budgetInput) {
    optimizeBtn.addEventListener('click', () => {
      const budget = budgetInput.valueAsNumber || Number(budgetInput.value) || 0;
      const inputs = getInputs();
      const result = engine.optimizeAllocation(budget, inputs);

      if (optimizeResultCard) {
        optimizeResultCard.hidden = false;
        const msgEl = optimizeResultCard.querySelector('#optimizeMessage');
        if (msgEl) msgEl.textContent = result.message;

        const allocStudents = optimizeResultCard.querySelector('#allocStudents');
        if (allocStudents) allocStudents.textContent = result.allocation.students.toLocaleString();
        const allocStreams = optimizeResultCard.querySelector('#allocStreams');
        if (allocStreams) allocStreams.textContent = result.allocation.streams.toLocaleString();
        const allocStorage = optimizeResultCard.querySelector('#allocStorage');
        if (allocStorage) allocStorage.textContent = `${result.allocation.storageTB} TB`;
        const allocCredits = optimizeResultCard.querySelector('#allocAiCredits');
        if (allocCredits) allocCredits.textContent = result.allocation.aiCredits.toLocaleString();
        const allocCost = optimizeResultCard.querySelector('#allocTotalCost');
        if (allocCost) allocCost.textContent = money(result.allocatedCost);
        const allocPerStudent = optimizeResultCard.querySelector('#allocPerStudent');
        if (allocPerStudent) allocPerStudent.textContent = `${money(result.costPerStudentMonthly)} / mo`;

        const applyBtn = optimizeResultCard.querySelector('#btnApplyAllocation');
        if (applyBtn) {
          applyBtn.onclick = () => {
            for (const [res, val] of Object.entries(result.allocation)) {
              const num = root.querySelector(`#${res}Input`);
              const slider = root.querySelector(`#${res}Slider`);
              if (num) num.value = val;
              if (slider) slider.value = val;
            }
            updateUI();
            optimizeResultCard.hidden = true;
          };
        }
      }
    });
  }

  // Quote Generation Modal & Export
  const quoteModal = root.querySelector('#quoteModal');
  const btnOpenQuote = root.querySelector('#btnOpenQuote');
  const btnCloseQuote = root.querySelector('#btnCloseQuote');
  const btnDownloadQuote = root.querySelector('#btnDownloadQuote');

  if (btnOpenQuote && quoteModal) {
    btnOpenQuote.addEventListener('click', () => {
      const quote = engine.generateQuote({
        ...getInputs(),
        institutionName: root.querySelector('#institutionNameInput')?.value || 'EdTech Academy Partner'
      });

      const modalId = quoteModal.querySelector('#modalQuoteId');
      if (modalId) modalId.textContent = quote.quoteId;
      const modalInst = quoteModal.querySelector('#modalInstitution');
      if (modalInst) modalInst.textContent = quote.institutionName;
      const modalTotal = quoteModal.querySelector('#modalTotalCost');
      if (modalTotal) modalTotal.textContent = money(quote.totalCost);
      const modalPerStudent = quoteModal.querySelector('#modalPerStudent');
      if (modalPerStudent) modalPerStudent.textContent = `${money(quote.costPerStudentMonthly)} / mo`;
      const modalTier = quoteModal.querySelector('#modalTier');
      if (modalTier) modalTier.textContent = `${quote.tier.name} (${quote.tier.badge})`;

      quoteModal.classList.add('active');
    });
  }

  if (btnCloseQuote && quoteModal) {
    btnCloseQuote.addEventListener('click', () => {
      quoteModal.classList.remove('active');
    });
  }

  if (btnDownloadQuote) {
    btnDownloadQuote.addEventListener('click', () => {
      const quote = engine.generateQuote(getInputs());
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(quote, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${quote.quoteId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  updateUI();
  return engine;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('[data-cost-optimizer]') || document.body;
    mountCostOptimizer(container);
  });
}
