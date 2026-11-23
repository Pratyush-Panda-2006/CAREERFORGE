/**
 * Quantum Forge - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2112 - NSoC '26
 *
 * Core mathematical engine modeling quantum compute consumption pricing,
 * hardware QPU reservations, circuit shot volume discounts, cryogenic retention,
 * transpiler optimizations, and dynamic budget allocation recommendations.
 */

export const QPU_INSTANCES = Object.freeze({
  'standard-16': Object.freeze({
    id: 'standard-16',
    name: 'Standard 16-qubit',
    qubits: 16,
    baseMonthlyRate: 180.00,
    shotRate: 0.0004, // $0.40 per 1k shots
    fidelity: '99.2%',
    coherenceTimeUs: 120,
    description: 'Entry-grade superconducting QPU for variational algorithm prototyping and NISQ benchmark circuits.'
  }),
  'advanced-64': Object.freeze({
    id: 'advanced-64',
    name: 'Advanced 64-qubit',
    qubits: 64,
    baseMonthlyRate: 580.00,
    shotRate: 0.0008, // $0.80 per 1k shots
    fidelity: '99.7%',
    coherenceTimeUs: 250,
    description: 'Mid-scale heavy-hex lattice QPU with active crosstalk suppression for medium-depth quantum circuits.'
  }),
  'flagship-256': Object.freeze({
    id: 'flagship-256',
    name: 'Flagship 256-qubit',
    qubits: 256,
    baseMonthlyRate: 1950.00,
    shotRate: 0.0018, // $1.80 per 1k shots
    fidelity: '99.95%',
    coherenceTimeUs: 500,
    description: 'Fault-tolerant quantum architecture with multi-layer surface code error correction and real-time feedforward.'
  })
});

export const SHOT_DISCOUNT_TIERS = Object.freeze([
  Object.freeze({
    tier: 1,
    name: 'Tier 1',
    label: '0 - 100k shots',
    minShots: 0,
    maxShots: 100_000,
    discountRate: 0.00,
    discountPercent: 0,
    badgeColor: 'cyan'
  }),
  Object.freeze({
    tier: 2,
    name: 'Tier 2',
    label: '100k - 1M shots',
    minShots: 100_000,
    maxShots: 1_000_000,
    discountRate: 0.10,
    discountPercent: 10,
    badgeColor: 'violet'
  }),
  Object.freeze({
    tier: 3,
    name: 'Tier 3',
    label: '1M - 10M shots',
    minShots: 1_000_000,
    maxShots: 10_000_000,
    discountRate: 0.20,
    discountPercent: 20,
    badgeColor: 'electric-violet'
  }),
  Object.freeze({
    tier: 4,
    name: 'Tier 4',
    label: '> 10M shots (Enterprise)',
    minShots: 10_000_000,
    maxShots: Infinity,
    discountRate: 0.35,
    discountPercent: 35,
    badgeColor: 'gradient-gold'
  })
]);

export const RATES = Object.freeze({
  SIMULATION_HOURLY_RATE: 15.00,
  CRYOGENIC_MEMORY_PER_GB_MONTH: 8.00,
  ANNUAL_COMMITMENT_DISCOUNT: 0.20, // 20% commitment saving
  DEFAULT_TAX_RATE: 0.08, // 8% sales/infrastructure tax
  COMPILER_PASS_RATES: Object.freeze({
    none: 0.00,
    standard: 49.00,
    aggressive: 129.00
  })
});

const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
const round4 = (val) => Math.round((val + Number.EPSILON) * 10000) / 10000;

function assertNonNegative(value, fieldName) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError(`${fieldName} must be a valid finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${fieldName} cannot be negative.`);
  }
  return value;
}

export class QuantumForgeCostOptimizerEngine {
  static QPU_INSTANCES = QPU_INSTANCES;
  static SHOT_DISCOUNT_TIERS = SHOT_DISCOUNT_TIERS;
  static RATES = RATES;

  #listeners = new Map();

  constructor(options = {}) {
    this.defaultTaxRate = options.taxRate !== undefined ? assertNonNegative(options.taxRate, 'taxRate') : RATES.DEFAULT_TAX_RATE;
  }

  /**
   * Event emitter: subscribe to engine events.
   * Returns an unbind function for convenience.
   */
  on(event, fn) {
    if (typeof fn !== 'function') {
      throw new TypeError('Event listener must be a function.');
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  /**
   * Event emitter: remove a subscriber.
   */
  off(event, fn) {
    if (this.#listeners.has(event)) {
      this.#listeners.get(event).delete(fn);
    }
  }

  /**
   * Event emitter: broadcast an event to all subscribers.
   */
  emit(event, data) {
    if (this.#listeners.has(event)) {
      for (const fn of this.#listeners.get(event)) {
        try {
          fn(data);
        } catch (err) {
          console.error(`QuantumForgeCostOptimizerEngine listener error on "${event}":`, err);
        }
      }
    }
  }

  /**
   * Resolve volume discount tier from shot count or tier identifier.
   */
  resolveVolumeTier(tierOrShots) {
    if (typeof tierOrShots === 'number') {
      // If it's a tier index 1-4
      if (tierOrShots >= 1 && tierOrShots <= 4) {
        return SHOT_DISCOUNT_TIERS[tierOrShots - 1];
      }
      // Otherwise treat as shot volume
      assertNonNegative(tierOrShots, 'Shots');
      for (let i = SHOT_DISCOUNT_TIERS.length - 1; i >= 0; i--) {
        const t = SHOT_DISCOUNT_TIERS[i];
        if (tierOrShots > t.minShots) {
          return t;
        }
      }
      return SHOT_DISCOUNT_TIERS[0];
    }

    if (typeof tierOrShots === 'string') {
      const normalized = tierOrShots.toLowerCase().replace(/[^a-z0-9]/g, '');
      const match = SHOT_DISCOUNT_TIERS.find(t => 
        t.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized ||
        normalized === `tier${t.tier}` ||
        normalized === String(t.tier)
      );
      if (match) return match;
    }

    if (typeof tierOrShots === 'object' && tierOrShots !== null) {
      if (typeof tierOrShots.tier === 'number' && tierOrShots.tier >= 1 && tierOrShots.tier <= 4) {
        return SHOT_DISCOUNT_TIERS[tierOrShots.tier - 1];
      }
      if (typeof tierOrShots.discountRate === 'number') {
        const found = SHOT_DISCOUNT_TIERS.find(t => Math.abs(t.discountRate - tierOrShots.discountRate) < 0.001);
        if (found) return found;
      }
    }

    throw new RangeError(`Unrecognized volume discount tier: ${JSON.stringify(tierOrShots)}`);
  }

  /**
   * Apply volume discount based on tier and raw base cost.
   * Returns discounted cost: baseCost * (1 - discountRate).
   */
  applyVolumeDiscount(tier, baseCost) {
    assertNonNegative(baseCost, 'Base cost');
    const resolvedTier = this.resolveVolumeTier(tier);
    return baseCost * (1 - resolvedTier.discountRate);
  }

  /**
   * Resolve QPU instance by instance ID, name, or required qubit count.
   */
  resolveQpuInstance(qubitsOrTier = 'standard-16') {
    if (typeof qubitsOrTier === 'number') {
      assertNonNegative(qubitsOrTier, 'Qubits');
      if (qubitsOrTier < 1) {
        throw new RangeError('Qubit allocation must be at least 1.');
      }
      if (qubitsOrTier > 256) {
        throw new RangeError('Requested qubit allocation exceeds maximum available hardware capacity of 256 qubits.');
      }
      if (qubitsOrTier <= 16) return QPU_INSTANCES['standard-16'];
      if (qubitsOrTier <= 64) return QPU_INSTANCES['advanced-64'];
      return QPU_INSTANCES['flagship-256'];
    }

    if (typeof qubitsOrTier === 'string') {
      const key = qubitsOrTier.toLowerCase().trim();
      if (QPU_INSTANCES[key]) return QPU_INSTANCES[key];
      const match = Object.values(QPU_INSTANCES).find(inst => 
        inst.name.toLowerCase() === key ||
        inst.id.toLowerCase() === key
      );
      if (match) return match;
    }

    throw new RangeError(`Invalid QPU instance or qubit configuration: ${qubitsOrTier}`);
  }

  /**
   * Resolve compiler pass rate.
   */
  resolveCompilerRate(optimization) {
    if (typeof optimization === 'boolean') {
      return optimization ? RATES.COMPILER_PASS_RATES.standard : 0.00;
    }
    if (typeof optimization === 'string') {
      const key = optimization.toLowerCase().trim();
      if (RATES.COMPILER_PASS_RATES[key] !== undefined) {
        return RATES.COMPILER_PASS_RATES[key];
      }
    }
    if (typeof optimization === 'number') {
      return assertNonNegative(optimization, 'Compiler optimization rate');
    }
    return 0.00;
  }

  /**
   * Calculate tiered consumption pricing for quantum compute workloads.
   */
  calculatePricing(inputs = {}) {
    const qubitsOrTier = inputs.qubits ?? inputs.qpuTier ?? inputs.instance ?? 'standard-16';
    const qpu = this.resolveQpuInstance(qubitsOrTier);

    const shots = assertNonNegative(inputs.shots ?? 100_000, 'Circuit shots');
    const simulationHours = assertNonNegative(inputs.simulationHours ?? 0, 'Simulation hours');
    const cryogenicMemoryGB = assertNonNegative(inputs.cryogenicMemoryGB ?? inputs.cryoMemoryGB ?? 0, 'Cryogenic memory');
    
    const compilerOptimization = inputs.compilerOptimization ?? inputs.compiler ?? 'none';
    const compilerCost = this.resolveCompilerRate(compilerOptimization);

    const billingFrequency = (inputs.billingFrequency ?? 'monthly').toLowerCase().trim();
    if (billingFrequency !== 'monthly' && billingFrequency !== 'annual') {
      throw new TypeError(`Invalid billing frequency: "${billingFrequency}". Must be "monthly" or "annual".`);
    }

    const taxRate = inputs.taxRate !== undefined ? assertNonNegative(inputs.taxRate, 'taxRate') : this.defaultTaxRate;

    // 1. QPU Base Instance Cost
    const qpuBaseCost = qpu.baseMonthlyRate;

    // 2. Circuit Execution Shots & Volume Discount
    const rawShotCost = round4(shots * qpu.shotRate);
    const volumeTier = this.resolveVolumeTier(shots);
    const discountedShotCost = this.applyVolumeDiscount(volumeTier.tier, rawShotCost);
    const shotVolumeDiscount = round2(rawShotCost - discountedShotCost);

    // 3. Quantum Simulation Hours
    const simulationCost = round2(simulationHours * RATES.SIMULATION_HOURLY_RATE);

    // 4. Cryogenic Memory Retention
    const cryogenicCost = round2(cryogenicMemoryGB * RATES.CRYOGENIC_MEMORY_PER_GB_MONTH);

    // Subtotal before commitment discount
    const subtotal = round2(qpuBaseCost + rawShotCost + simulationCost + cryogenicCost + compilerCost);
    const subtotalAfterVolumeDiscount = round2(qpuBaseCost + discountedShotCost + simulationCost + cryogenicCost + compilerCost);

    // Billing Commitment Multiplier (Annual gives 20% commitment saving)
    const isAnnual = billingFrequency === 'annual';
    const commitmentDiscountRate = isAnnual ? RATES.ANNUAL_COMMITMENT_DISCOUNT : 0.00;
    const commitmentDiscountAmount = round2(subtotalAfterVolumeDiscount * commitmentDiscountRate);
    const netMonthlyCost = round2(subtotalAfterVolumeDiscount - commitmentDiscountAmount);

    // Taxes
    const monthlyTax = round2(netMonthlyCost * taxRate);
    const totalMonthlyCostWithTax = round2(netMonthlyCost + monthlyTax);

    // Annual run-rate
    const standardAnnualCost = round2(subtotalAfterVolumeDiscount * 12);
    const committedAnnualCost = round2(netMonthlyCost * 12);
    const annualSavingsWithCommitment = round2(standardAnnualCost * RATES.ANNUAL_COMMITMENT_DISCOUNT);
    const annualTax = round2(committedAnnualCost * taxRate);
    const totalAnnualCostWithTax = round2(committedAnnualCost + annualTax);

    const result = {
      inputs: {
        qubits: qpu.qubits,
        qpuTier: qpu.id,
        shots,
        simulationHours,
        cryogenicMemoryGB,
        compilerOptimization: typeof compilerOptimization === 'boolean' ? (compilerOptimization ? 'standard' : 'none') : compilerOptimization,
        billingFrequency,
        taxRate
      },
      qpu,
      volumeTier,
      costs: {
        qpuBaseCost: round2(qpuBaseCost),
        rawShotCost: round2(rawShotCost),
        discountedShotCost: round2(discountedShotCost),
        shotVolumeDiscount: round2(shotVolumeDiscount),
        simulationCost: round2(simulationCost),
        cryogenicCost: round2(cryogenicCost),
        compilerCost: round2(compilerCost),
        subtotal: round2(subtotal),
        volumeDiscountTotal: round2(shotVolumeDiscount),
        commitmentDiscountMonthly: round2(commitmentDiscountAmount),
        netMonthlySubtotal: round2(netMonthlyCost),
        monthlyTax: round2(monthlyTax),
        estimatedMonthlyCost: round2(totalMonthlyCostWithTax),
        estimatedAnnualCost: round2(totalAnnualCostWithTax),
        annualSavingsWithCommitment: round2(annualSavingsWithCommitment)
      }
    };

    this.emit('pricing:calculated', result);
    return result;
  }

  /**
   * Helper to evaluate efficiency recommendations for a workload.
   */
  #generateEfficiencyRecommendation(pricingResult) {
    const { inputs, costs, volumeTier, qpu } = pricingResult;

    // 1. Annual commitment savings recommendation
    if (inputs.billingFrequency === 'monthly' && costs.annualSavingsWithCommitment > 0) {
      return {
        key: 'annual_commitment_savings',
        category: 'commitment',
        title: 'Switch to Annual Billing',
        message: `Switching to an annual commitment saves $${costs.annualSavingsWithCommitment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (20% commitment saving) annually on dedicated QPU reservations and simulation hours.`,
        potentialSavingsUSD: costs.annualSavingsWithCommitment
      };
    }

    // 2. Near tier boundary recommendation
    const nextTier = SHOT_DISCOUNT_TIERS.find(t => t.tier === volumeTier.tier + 1);
    if (nextTier && Number.isFinite(nextTier.minShots)) {
      const shotsNeeded = nextTier.minShots - inputs.shots + 1;
      const thresholdRatio = inputs.shots / nextTier.minShots;
      if (thresholdRatio >= 0.75 && thresholdRatio < 1.0) {
        const currentShotRate = qpu.shotRate * (1 - volumeTier.discountRate);
        const nextShotRate = qpu.shotRate * (1 - nextTier.discountRate);
        return {
          key: 'volume_tier_opportunity',
          category: 'volume',
          title: `Upgrade to ${nextTier.name} (${nextTier.discountPercent}% Discount)`,
          message: `You are only ${shotsNeeded.toLocaleString()} shots away from ${nextTier.name}. Reaching ${nextTier.label} lowers effective rate from $${currentShotRate.toFixed(6)} to $${nextShotRate.toFixed(6)} per shot.`,
          potentialSavingsUSD: round2((currentShotRate - nextShotRate) * nextTier.minShots)
        };
      }
    }

    // 3. Compiler optimization recommendation if large shots/simulation and no compiler pass
    if (inputs.compilerOptimization === 'none' && inputs.shots >= 200_000) {
      return {
        key: 'circuit_compiler_pass',
        category: 'circuit_depth',
        title: 'Activate Quantum Circuit Transpiler Pass',
        message: 'Enabling compiler transpiler optimizations reduces circuit depth by an estimated 25-35%, cutting overall shot runtime and noise variance while saving hardware execution budget.',
        potentialSavingsUSD: round2(costs.discountedShotCost * 0.25)
      };
    }

    // 4. Default optimal recommendation
    return {
      key: 'optimal_allocation',
      category: 'optimal',
      title: 'Allocation Profile Highly Optimized',
      message: `Your quantum workload configuration is operating at maximum economic efficiency on the ${qpu.name} lattice with ${volumeTier.name} volume discounts applied.`,
      potentialSavingsUSD: 0.00
    };
  }

  /**
   * Generate formal structured quote object with line items, subtotal, discount,
   * tax, estimated monthly cost, estimated annual cost, and efficiency recommendation.
   */
  generateQuote(options = {}) {
    const pricing = this.calculatePricing(options);
    const { inputs, qpu, volumeTier, costs } = pricing;

    const hash = Math.random().toString(36).substring(2, 8).toUpperCase();
    const quoteId = `QTE-QF-${Date.now().toString(36).toUpperCase()}-${hash}`;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const lineItems = [
      {
        id: 'qpu-reservation',
        name: `QPU Hardware Reservation (${qpu.name})`,
        category: 'compute',
        quantity: 1,
        unit: 'instance/month',
        unitPrice: qpu.baseMonthlyRate,
        rawCost: costs.qpuBaseCost,
        discount: 0.00,
        totalCost: costs.qpuBaseCost,
        specs: {
          qubits: qpu.qubits,
          fidelity: qpu.fidelity,
          coherenceTimeUs: qpu.coherenceTimeUs
        }
      },
      {
        id: 'circuit-shots',
        name: `Quantum Circuit Execution (${inputs.shots.toLocaleString()} shots, ${volumeTier.name})`,
        category: 'execution',
        quantity: inputs.shots,
        unit: 'shots',
        unitPrice: qpu.shotRate,
        rawCost: costs.rawShotCost,
        discount: costs.shotVolumeDiscount,
        totalCost: costs.discountedShotCost,
        tier: volumeTier.name,
        discountPercent: volumeTier.discountPercent
      }
    ];

    if (inputs.simulationHours > 0) {
      lineItems.push({
        id: 'noise-simulation',
        name: 'Quantum Noise & Statevector Simulation',
        category: 'simulation',
        quantity: inputs.simulationHours,
        unit: 'hours',
        unitPrice: RATES.SIMULATION_HOURLY_RATE,
        rawCost: costs.simulationCost,
        discount: 0.00,
        totalCost: costs.simulationCost
      });
    }

    if (inputs.cryogenicMemoryGB > 0) {
      lineItems.push({
        id: 'cryo-memory',
        name: 'Cryogenic Coherence Retention Buffer',
        category: 'storage',
        quantity: inputs.cryogenicMemoryGB,
        unit: 'GB-month',
        unitPrice: RATES.CRYOGENIC_MEMORY_PER_GB_MONTH,
        rawCost: costs.cryogenicCost,
        discount: 0.00,
        totalCost: costs.cryogenicCost
      });
    }

    if (costs.compilerCost > 0) {
      lineItems.push({
        id: 'compiler-optimization',
        name: `Transpiler & Circuit Optimizer (${inputs.compilerOptimization})`,
        category: 'optimization',
        quantity: 1,
        unit: 'pass/month',
        unitPrice: costs.compilerCost,
        rawCost: costs.compilerCost,
        discount: 0.00,
        totalCost: costs.compilerCost
      });
    }

    const totalDiscount = round2(costs.volumeDiscountTotal + (inputs.billingFrequency === 'annual' ? costs.commitmentDiscountMonthly : 0.00));
    const efficiencyRecommendation = this.#generateEfficiencyRecommendation(pricing);

    const quote = {
      quoteId,
      createdAt,
      expiresAt,
      status: 'active',
      currency: 'USD',
      billingFrequency: inputs.billingFrequency,
      qpu: {
        id: qpu.id,
        name: qpu.name,
        qubits: qpu.qubits,
        fidelity: qpu.fidelity
      },
      volumeTier: {
        tier: volumeTier.tier,
        name: volumeTier.name,
        label: volumeTier.label,
        discountPercent: volumeTier.discountPercent
      },
      lineItems,
      subtotal: costs.subtotal,
      volumeDiscount: costs.volumeDiscountTotal,
      commitmentDiscount: inputs.billingFrequency === 'annual' ? costs.commitmentDiscountMonthly : 0.00,
      discount: totalDiscount,
      netSubtotal: costs.netMonthlySubtotal,
      tax: costs.monthlyTax,
      total: costs.estimatedMonthlyCost,
      estimatedMonthlyCost: costs.estimatedMonthlyCost,
      estimatedAnnualCost: costs.estimatedAnnualCost,
      annualSavingsWithCommitment: costs.annualSavingsWithCommitment,
      efficiencyRecommendation
    };

    this.emit('quote:generated', quote);
    return quote;
  }

  /**
   * Recommends optimal QPU tier and shot budget to stay under target expense.
   * optimizeAllocation(targetBudget, requiredQubits)
   */
  optimizeAllocation(targetBudget, requiredQubits) {
    assertNonNegative(targetBudget, 'Target budget');
    if (targetBudget <= 0) {
      throw new RangeError('Target budget must be strictly greater than zero.');
    }
    assertNonNegative(requiredQubits, 'Required qubits');
    if (requiredQubits < 1) {
      throw new RangeError('Required qubits must be at least 1.');
    }
    if (requiredQubits > 256) {
      throw new RangeError('Required qubits exceeds maximum hardware capacity of 256 qubits.');
    }

    // 1. Determine minimum viable QPU instance
    const recommendedQpu = this.resolveQpuInstance(requiredQubits);
    const baseMonthly = recommendedQpu.baseMonthlyRate;
    const baseAnnualMonthly = round2(baseMonthly * (1 - RATES.ANNUAL_COMMITMENT_DISCOUNT));

    // Check if target budget can afford even the QPU reservation
    if (targetBudget < baseAnnualMonthly) {
      const deficit = round2(baseAnnualMonthly - targetBudget);
      const res = {
        feasibility: 'exceeds_budget',
        targetBudget: round2(targetBudget),
        requiredQubits,
        recommendedQpu,
        baseMonthlyRate: baseMonthly,
        annualCommittedMonthlyRate: baseAnnualMonthly,
        maxAchievableShotsMonthly: 0,
        maxAchievableShotsAnnual: 0,
        recommendedBillingFrequency: 'annual',
        budgetDeficit: deficit,
        recommendation: `Budget of $${targetBudget.toFixed(2)}/mo is below the minimum hardware reservation cost of $${baseAnnualMonthly.toFixed(2)}/mo for ${recommendedQpu.name} (${recommendedQpu.qubits}Q). Increase budget by at least $${deficit.toFixed(2)}/mo or optimize circuit ansatz for fewer qubits.`
      };
      this.emit('allocation:optimized', res);
      return res;
    }

    // Helper to calculate max shots given an available dollar amount for shots
    const calculateMaxShots = (availableBudget, shotRate) => {
      if (availableBudget <= 0) return { shots: 0, tier: SHOT_DISCOUNT_TIERS[0] };

      // Try tier 4
      const t4Rate = shotRate * (1 - SHOT_DISCOUNT_TIERS[3].discountRate);
      const t3MaxCost = 10_000_000 * (shotRate * (1 - SHOT_DISCOUNT_TIERS[2].discountRate));
      if (availableBudget > t3MaxCost) {
        const shots = Math.floor(availableBudget / t4Rate);
        return { shots, tier: SHOT_DISCOUNT_TIERS[3] };
      }

      // Try tier 3
      const t3Rate = shotRate * (1 - SHOT_DISCOUNT_TIERS[2].discountRate);
      const t2MaxCost = 1_000_000 * (shotRate * (1 - SHOT_DISCOUNT_TIERS[1].discountRate));
      if (availableBudget > t2MaxCost) {
        const shots = Math.floor(availableBudget / t3Rate);
        return { shots, tier: SHOT_DISCOUNT_TIERS[2] };
      }

      // Try tier 2
      const t2Rate = shotRate * (1 - SHOT_DISCOUNT_TIERS[1].discountRate);
      const t1MaxCost = 100_000 * shotRate;
      if (availableBudget > t1MaxCost) {
        const shots = Math.floor(availableBudget / t2Rate);
        return { shots, tier: SHOT_DISCOUNT_TIERS[1] };
      }

      // Tier 1
      const shots = Math.floor(availableBudget / shotRate);
      return { shots, tier: SHOT_DISCOUNT_TIERS[0] };
    };

    // Calculate monthly shots budget
    const monthlyShotBudget = Math.max(0, targetBudget - baseMonthly);
    const monthlyAlloc = calculateMaxShots(monthlyShotBudget, recommendedQpu.shotRate);

    // Calculate annual committed shots budget (unlocked savings from 20% commitment discount)
    const annualShotBudget = Math.max(0, targetBudget - baseAnnualMonthly);
    const annualAlloc = calculateMaxShots(annualShotBudget, recommendedQpu.shotRate);

    const extraShotsWithAnnual = Math.max(0, annualAlloc.shots - monthlyAlloc.shots);
    const feasibility = monthlyShotBudget > 50 ? 'optimal' : 'tight_budget';

    const recommendation = extraShotsWithAnnual > 0
      ? `Allocating on ${recommendedQpu.name} allows up to ${monthlyAlloc.shots.toLocaleString()} shots/mo on monthly billing. Switching to Annual Commitment frees $${(baseMonthly - baseAnnualMonthly).toFixed(2)}/mo, yielding +${extraShotsWithAnnual.toLocaleString()} additional execution shots (${annualAlloc.shots.toLocaleString()} total) under the same $${targetBudget.toFixed(2)} budget.`
      : `Optimal allocation achieved on ${recommendedQpu.name}. Maximum execution volume: ${monthlyAlloc.shots.toLocaleString()} shots/month within $${targetBudget.toFixed(2)} budget.`;

    const result = {
      feasibility,
      targetBudget: round2(targetBudget),
      requiredQubits,
      recommendedQpu,
      baseMonthlyRate: baseMonthly,
      annualCommittedMonthlyRate: baseAnnualMonthly,
      maxAchievableShotsMonthly: monthlyAlloc.shots,
      maxAchievableShotsAnnual: annualAlloc.shots,
      extraShotsWithAnnual,
      monthlyShotTier: monthlyAlloc.tier,
      annualShotTier: annualAlloc.tier,
      recommendedBillingFrequency: 'annual',
      remainingMonthlyBuffer: round2(monthlyShotBudget - (monthlyAlloc.shots * recommendedQpu.shotRate * (1 - monthlyAlloc.tier.discountRate))),
      recommendation
    };

    this.emit('allocation:optimized', result);
    return result;
  }
}

// Browser mount logic for interactive sandbox
function mountCostOptimizerUI() {
  if (typeof document === 'undefined') return;

  const root = document.getElementById('quantum-cost-optimizer-app');
  if (!root) return;

  const engine = new QuantumForgeCostOptimizerEngine();

  // Elements
  const get = (id) => document.getElementById(id);
  const qpuSlider = get('slider-qubits');
  const qpuVal = get('val-qubits');
  const shotsSlider = get('slider-shots');
  const shotsVal = get('val-shots');
  const shotsInput = get('input-shots');
  const simSlider = get('slider-simulation');
  const simVal = get('val-simulation');
  const cryoSlider = get('slider-cryo');
  const cryoVal = get('val-cryo');
  const compilerSelect = get('select-compiler');
  const freqMonthly = get('radio-monthly');
  const freqAnnual = get('radio-annual');

  // Breakdown Card Elements
  const tickerPrice = get('ticker-price');
  const tickerPeriod = get('ticker-period');
  const savingsBanner = get('savings-banner');
  const savingsAmount = get('savings-amount');
  const badgeTier = get('badge-volume-tier');
  const qpuNameBadge = get('badge-qpu-name');
  const rowQpuCost = get('row-qpu-cost');
  const rowShotsCost = get('row-shots-cost');
  const rowShotsDiscount = get('row-shots-discount');
  const rowSimCost = get('row-sim-cost');
  const rowCryoCost = get('row-cryo-cost');
  const rowCompilerCost = get('row-compiler-cost');
  const rowSubtotal = get('row-subtotal');
  const rowCommitmentDiscount = get('row-commitment-discount');
  const rowTax = get('row-tax');
  const rowAnnualRunRate = get('row-annual-run-rate');

  // Progress to next tier
  const tierProgressFill = get('tier-progress-fill');
  const tierProgressLabel = get('tier-progress-label');

  // Recommendation callout
  const recCard = get('efficiency-recommendation-card');
  const recTitle = get('rec-title');
  const recMessage = get('rec-message');

  // Actions
  const btnGenerateQuote = get('btn-generate-quote');
  const quoteModal = get('quote-modal');
  const quoteJsonOutput = get('quote-json-output');
  const btnExportJson = get('btn-export-json');
  const btnCopyMarkdown = get('btn-copy-markdown');
  const btnCloseModal = get('btn-close-modal');

  // Optimizer Elements
  const optBudgetInput = get('opt-target-budget');
  const optQubitsInput = get('opt-required-qubits');
  const btnRunOptimizer = get('btn-run-optimizer');
  const optResultCard = get('opt-result-card');
  const optResultText = get('opt-result-text');

  let currentQuote = null;

  function getInputs() {
    return {
      qubits: parseInt(qpuSlider?.value ?? '16', 10),
      shots: parseInt(shotsInput?.value ?? shotsSlider?.value ?? '100000', 10),
      simulationHours: parseInt(simSlider?.value ?? '0', 10),
      cryogenicMemoryGB: parseInt(cryoSlider?.value ?? '0', 10),
      compilerOptimization: compilerSelect?.value ?? 'none',
      billingFrequency: freqAnnual?.checked ? 'annual' : 'monthly'
    };
  }

  function update() {
    const inputs = getInputs();
    const pricing = engine.calculatePricing(inputs);
    const { costs, volumeTier, qpu } = pricing;

    // Sliders text sync
    if (qpuVal) qpuVal.textContent = `${inputs.qubits} Qubits (${qpu.name})`;
    if (shotsVal) shotsVal.textContent = inputs.shots.toLocaleString() + ' shots';
    if (simVal) simVal.textContent = `${inputs.simulationHours} hrs`;
    if (cryoVal) cryoVal.textContent = `${inputs.cryogenicMemoryGB} GB`;

    // QPU Badge
    if (qpuNameBadge) {
      qpuNameBadge.textContent = `${qpu.name} • ${qpu.fidelity} Fidelity • ${qpu.coherenceTimeUs}μs T1`;
    }

    // Ticker Price
    const isAnnual = inputs.billingFrequency === 'annual';
    if (tickerPrice) {
      tickerPrice.textContent = `$${costs.estimatedMonthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (tickerPeriod) {
      tickerPeriod.textContent = isAnnual ? '/ month (billed annually)' : '/ month';
    }

    // Savings banner
    if (savingsBanner && savingsAmount) {
      if (isAnnual && costs.annualSavingsWithCommitment > 0) {
        savingsBanner.style.display = 'flex';
        savingsAmount.textContent = `$${costs.annualSavingsWithCommitment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      } else {
        savingsBanner.style.display = 'none';
      }
    }

    // Volume Tier Badge
    if (badgeTier) {
      badgeTier.textContent = `${volumeTier.name} (${volumeTier.discountPercent}% OFF)`;
      badgeTier.className = `tier-badge tier-${volumeTier.tier}`;
    }

    // Rows
    if (rowQpuCost) rowQpuCost.textContent = `$${costs.qpuBaseCost.toFixed(2)}`;
    if (rowShotsCost) rowShotsCost.textContent = `$${costs.discountedShotCost.toFixed(2)}`;
    if (rowShotsDiscount) {
      rowShotsDiscount.textContent = costs.shotVolumeDiscount > 0 ? `-$${costs.shotVolumeDiscount.toFixed(2)}` : '$0.00';
    }
    if (rowSimCost) rowSimCost.textContent = `$${costs.simulationCost.toFixed(2)}`;
    if (rowCryoCost) rowCryoCost.textContent = `$${costs.cryogenicCost.toFixed(2)}`;
    if (rowCompilerCost) rowCompilerCost.textContent = `$${costs.compilerCost.toFixed(2)}`;
    if (rowSubtotal) rowSubtotal.textContent = `$${costs.subtotal.toFixed(2)}`;
    if (rowCommitmentDiscount) {
      rowCommitmentDiscount.textContent = isAnnual ? `-$${costs.commitmentDiscountMonthly.toFixed(2)} (20%)` : '$0.00';
    }
    if (rowTax) rowTax.textContent = `$${costs.monthlyTax.toFixed(2)}`;
    if (rowAnnualRunRate) rowAnnualRunRate.textContent = `$${costs.estimatedAnnualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    // Tier progress
    if (tierProgressFill && tierProgressLabel) {
      if (volumeTier.tier < 4) {
        const nextTier = SHOT_DISCOUNT_TIERS[volumeTier.tier];
        const span = nextTier.minShots - volumeTier.minShots;
        const progress = Math.min(100, Math.max(0, ((inputs.shots - volumeTier.minShots) / span) * 100));
        tierProgressFill.style.width = `${progress}%`;
        const needed = nextTier.minShots - inputs.shots + 1;
        tierProgressLabel.textContent = `${inputs.shots.toLocaleString()} / ${nextTier.minShots.toLocaleString()} shots (${needed.toLocaleString()} shots to ${nextTier.name})`;
      } else {
        tierProgressFill.style.width = '100%';
        tierProgressLabel.textContent = 'Maximum Enterprise Discount Tier Achieved (35% OFF)';
      }
    }

    // Recommendation card
    const quote = engine.generateQuote(inputs);
    currentQuote = quote;
    if (recCard && recTitle && recMessage && quote.efficiencyRecommendation) {
      recTitle.textContent = quote.efficiencyRecommendation.title;
      recMessage.textContent = quote.efficiencyRecommendation.message;
    }
  }

  // Event Listeners for inputs
  [qpuSlider, simSlider, cryoSlider].forEach(slider => {
    slider?.addEventListener('input', update);
  });

  if (shotsSlider && shotsInput) {
    shotsSlider.addEventListener('input', () => {
      shotsInput.value = shotsSlider.value;
      update();
    });
    shotsInput.addEventListener('input', () => {
      shotsSlider.value = shotsInput.value;
      update();
    });
  }

  compilerSelect?.addEventListener('change', update);
  freqMonthly?.addEventListener('change', update);
  freqAnnual?.addEventListener('change', update);

  // Quote Generation & Modal
  if (btnGenerateQuote) {
    btnGenerateQuote.addEventListener('click', () => {
      const quote = engine.generateQuote(getInputs());
      currentQuote = quote;
      if (quoteJsonOutput) {
        quoteJsonOutput.textContent = JSON.stringify(quote, null, 2);
      }
      if (quoteModal) {
        quoteModal.classList.add('active');
        quoteModal.setAttribute('aria-hidden', 'false');
      }
    });
  }

  if (btnCloseModal && quoteModal) {
    btnCloseModal.addEventListener('click', () => {
      quoteModal.classList.remove('active');
      quoteModal.setAttribute('aria-hidden', 'true');
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener('click', () => {
      if (!currentQuote) currentQuote = engine.generateQuote(getInputs());
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentQuote, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${currentQuote.quoteId}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  if (btnCopyMarkdown) {
    btnCopyMarkdown.addEventListener('click', async () => {
      if (!currentQuote) currentQuote = engine.generateQuote(getInputs());
      const lines = [
        `# Quantum Forge Cost Optimizer Quote`,
        `**Quote ID**: \`${currentQuote.quoteId}\``,
        `**Date**: ${currentQuote.createdAt.split('T')[0]}`,
        `**QPU Instance**: ${currentQuote.qpu.name} (${currentQuote.qpu.qubits} qubits)`,
        `**Billing Frequency**: ${currentQuote.billingFrequency}`,
        ``,
        `## Line Items`,
        `| Item | Category | Qty | Unit Price | Total |`,
        `| :--- | :--- | :--- | :--- | :--- |`,
        ...currentQuote.lineItems.map(item => `| ${item.name} | ${item.category} | ${item.quantity.toLocaleString()} | $${item.unitPrice.toFixed(4)} | $${item.totalCost.toFixed(2)} |`),
        ``,
        `**Subtotal**: $${currentQuote.subtotal.toFixed(2)}  `,
        `**Volume Discount**: -$${currentQuote.volumeDiscount.toFixed(2)}  `,
        `**Commitment Discount**: -$${currentQuote.commitmentDiscount.toFixed(2)}  `,
        `**Tax**: $${currentQuote.tax.toFixed(2)}  `,
        `**Estimated Monthly Total**: $${currentQuote.total.toFixed(2)}  `,
        `**Estimated Annual Run-Rate**: $${currentQuote.estimatedAnnualCost.toFixed(2)}  `,
        ``,
        `> **Recommendation**: ${currentQuote.efficiencyRecommendation.message}`
      ];
      const md = lines.join('\n');
      try {
        await navigator.clipboard.writeText(md);
        btnCopyMarkdown.textContent = 'Copied Markdown!';
        setTimeout(() => { btnCopyMarkdown.textContent = 'Copy Markdown'; }, 2000);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    });
  }

  // Budget Optimizer Action
  if (btnRunOptimizer) {
    btnRunOptimizer.addEventListener('click', () => {
      const budget = parseFloat(optBudgetInput?.value ?? '1000');
      const qubits = parseInt(optQubitsInput?.value ?? '32', 10);
      try {
        const result = engine.optimizeAllocation(budget, qubits);
        if (optResultCard && optResultText) {
          optResultCard.style.display = 'block';
          optResultText.innerHTML = `
            <div class="opt-badge ${result.feasibility}">${result.feasibility.toUpperCase().replace('_', ' ')}</div>
            <p><strong>Recommended Hardware:</strong> ${result.recommendedQpu.name} (${result.recommendedQpu.qubits} Qubits)</p>
            <p><strong>Max Monthly Shots:</strong> ${result.maxAchievableShotsMonthly.toLocaleString()} shots</p>
            <p><strong>Max Annual Committed Shots:</strong> ${result.maxAchievableShotsAnnual.toLocaleString()} shots (+${result.extraShotsWithAnnual.toLocaleString()} extra shots)</p>
            <p class="opt-note">${result.recommendation}</p>
          `;
        }
      } catch (err) {
        if (optResultCard && optResultText) {
          optResultCard.style.display = 'block';
          optResultText.innerHTML = `<span style="color: #ef4444;">Error: ${err.message}</span>`;
        }
      }
    });
  }

  // Initial render
  update();
}

if (typeof window !== 'undefined') {
  window.QuantumForgeCostOptimizerEngine = QuantumForgeCostOptimizerEngine;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountCostOptimizerUI);
    } else {
      mountCostOptimizerUI();
    }
  }
}
