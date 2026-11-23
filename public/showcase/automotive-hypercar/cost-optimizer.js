/**
 * Automotive Hypercar - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2088 - NSoC '26
 *
 * Models tiered bespoke hypercar customization, powertrain allocation,
 * aerodynamic carbon-fiber packages, track pit-crew telemetry support,
 * volume discount tiering, and upfront settlement optimization.
 */

export const VOLUME_TIERS = {
  tier1: {
    id: 'tier1',
    level: 1,
    name: 'Club Sport Allocation',
    badge: 'Tier 1 • Club Sport',
    minSpend: 500000,
    maxSpend: 1500000,
    discountRate: 0.0,
    discountPercent: 0,
    description: 'Bespoke entry chassis allocation (0% discount)'
  },
  tier2: {
    id: 'tier2',
    level: 2,
    name: 'Performance Incentive Allocation',
    badge: 'Tier 2 • Performance Incentive',
    minSpend: 1500000,
    maxSpend: 3000000,
    discountRate: 0.05,
    discountPercent: 5,
    description: '5% Performance incentive on high-output bespoke builds'
  },
  tier3: {
    id: 'tier3',
    level: 3,
    name: 'VIP Paddock Package',
    badge: 'Tier 3 • VIP Paddock',
    minSpend: 3000000,
    maxSpend: 5000000,
    discountRate: 0.10,
    discountPercent: 10,
    description: '10% VIP paddock package with priority factory build slots'
  },
  tier4: {
    id: 'tier4',
    level: 4,
    name: 'Factory Racing Team Allocation',
    badge: 'Tier 4 • Factory Racing',
    minSpend: 5000000,
    maxSpend: Infinity,
    discountRate: 0.18,
    discountPercent: 18,
    description: '18% Factory racing team allocation with dedicated track support'
  }
};

export const CHASSIS_OPTIONS = {
  'apex-v8': {
    id: 'apex-v8',
    level: 1,
    name: 'Apex GT V8 Twin-Turbo',
    description: '4.0L Twin-Turbo Flat-Plane V8 producing 780 HP with carbon monocoque',
    basePrice: 850000,
    specs: {
      horsepower: 780,
      topSpeedKmh: 345,
      acceleration0to100: 2.85,
      downforceKg: 420,
      lateralG: 1.45,
      weightKg: 1380
    }
  },
  'valkyrie-v12': {
    id: 'valkyrie-v12',
    level: 2,
    name: 'Valkyrie V12 Hybrid',
    description: '6.5L Naturally-Aspirated Cosworth V12 Hybrid producing 1,160 HP',
    basePrice: 2200000,
    specs: {
      horsepower: 1160,
      topSpeedKmh: 395,
      acceleration0to100: 2.35,
      downforceKg: 850,
      lateralG: 1.75,
      weightKg: 1220
    }
  },
  'chiron-w16': {
    id: 'chiron-w16',
    level: 3,
    name: 'Chiron W16 Quad-Turbo',
    description: '8.0L Quad-Turbocharged W16 powerhouse delivering 1,600 HP',
    basePrice: 3800000,
    specs: {
      horsepower: 1600,
      topSpeedKmh: 442,
      acceleration0to100: 2.15,
      downforceKg: 1100,
      lateralG: 1.65,
      weightKg: 1950
    }
  },
  'bolide-lm': {
    id: 'bolide-lm',
    level: 4,
    name: 'Bolide LM Track Prototype',
    description: 'Track-only ultra-lightweight prototype reaching 1,850 HP',
    basePrice: 5200000,
    specs: {
      horsepower: 1850,
      topSpeedKmh: 485,
      acceleration0to100: 1.95,
      downforceKg: 1600,
      lateralG: 2.10,
      weightKg: 1240
    }
  }
};

export const AERO_OPTIONS = {
  'stage-1': {
    id: 'stage-1',
    level: 1,
    name: 'Stage 1 Active Aero',
    description: 'Active hydraulic rear wing with DRS actuator and carbon front splitter',
    price: 120000,
    impact: {
      downforceKg: 150,
      topSpeedKmh: 0,
      lateralG: 0.08,
      weightKg: 15
    }
  },
  'stage-2': {
    id: 'stage-2',
    level: 2,
    name: 'Stage 2 Carbon Ground Effect',
    description: 'Venturi underbody tunnels, vortex generators, and full carbon diffuser',
    price: 280000,
    impact: {
      downforceKg: 350,
      topSpeedKmh: -4,
      lateralG: 0.18,
      weightKg: 22
    }
  },
  'stage-3': {
    id: 'stage-3',
    level: 3,
    name: 'Stage 3 Le Mans Spec',
    description: 'Full LMP1-derived high-downforce dual-element wing, shark fin and louvers',
    price: 480000,
    impact: {
      downforceKg: 650,
      topSpeedKmh: -8,
      lateralG: 0.32,
      weightKg: 28
    }
  }
};

export const BRAKE_OPTIONS = {
  'standard-ceramic': {
    id: 'standard-ceramic',
    level: 1,
    name: 'Carbon-Silicon Carbide (CSiC) 400mm',
    description: 'High-thermal tolerance 6-piston monobloc ceramic brakes',
    price: 95000,
    impact: {
      braking100to0M: 30.2,
      weightKg: -12
    }
  },
  'extreme-ceramic': {
    id: 'extreme-ceramic',
    level: 2,
    name: 'F1-Spec Monobloc Carbon-Carbon 420mm',
    description: 'Formula 1 grade carbon-carbon discs with titanium cooling ducts',
    price: 195000,
    impact: {
      braking100to0M: 27.8,
      weightKg: -22
    }
  }
};

export const EXHAUST_OPTIONS = {
  'inconel-sport': {
    id: 'inconel-sport',
    level: 1,
    name: 'Inconel 625 Dual Sport Exhaust',
    description: 'Heat-shielded aerospace Inconel alloy tuned for acoustic resonance',
    price: 75000,
    impact: {
      horsepower: 15,
      weightKg: -10
    }
  },
  'titanium-f1': {
    id: 'titanium-f1',
    level: 2,
    name: '3D-Printed Titanium Race Exhaust',
    description: 'Ultra-lightweight laser-sintered titanium system with valved straight pipes',
    price: 150000,
    impact: {
      horsepower: 35,
      weightKg: -20
    }
  }
};

export const WHEEL_OPTIONS = {
  'forged-aluminum': {
    id: 'forged-aluminum',
    level: 1,
    name: 'Lightweight Forged Aluminum',
    description: 'Aviation-grade 6061-T6 forged aluminum wheels with Michelin Pilot Sport Cup 2',
    price: 45000,
    impact: {
      acceleration0to100: 0,
      lateralG: 0.05,
      weightKg: 0
    }
  },
  'forged-magnesium': {
    id: 'forged-magnesium',
    level: 2,
    name: 'Center-Lock Aerodynamic Forged Magnesium',
    description: '30% lighter unsprung rotational mass with carbon aero disc inserts',
    price: 120000,
    impact: {
      acceleration0to100: -0.05,
      lateralG: 0.12,
      weightKg: -16
    }
  },
  'carbon-composite': {
    id: 'carbon-composite',
    level: 3,
    name: 'Full Carbon-Fiber Barrel Wheels & Slicks',
    description: 'Structural carbon fiber weave barrel wheels wrapped in Pirelli P Zero Trofeo RS',
    price: 210000,
    impact: {
      acceleration0to100: -0.10,
      lateralG: 0.20,
      weightKg: -26
    }
  }
};

export const TELEMETRY_OPTIONS = {
  'standard-telemetry': {
    id: 'standard-telemetry',
    level: 1,
    name: 'Cloud Telemetry & CAN-Bus Logging',
    description: 'Live sensor telemetry streaming to iOS/Android track companion app',
    price: 60000,
    impact: {
      dataChannels: 128
    }
  },
  'factory-trackside': {
    id: 'factory-trackside',
    level: 2,
    name: 'Trackside Engineer Real-Time Telemetry',
    description: 'Direct satellite telemetry uplink with factory race engineer live diagnostics',
    price: 160000,
    impact: {
      dataChannels: 512
    }
  },
  'pit-crew-vip': {
    id: 'pit-crew-vip',
    level: 3,
    name: 'Dedicated Factory Pit-Crew & VIP Paddock',
    description: 'Full 6-mechanic trackside team, tire warmers, sim training, and paddock hospitality',
    price: 360000,
    impact: {
      dataChannels: 2048
    }
  }
};

export class AutomotiveHypercarCostOptimizerEngine {
  constructor(initialConfig = {}) {
    this.currency = 'USD';
    this.currencySymbol = '$';
    this.cashDiscountRate = 0.10; // 10% cash settlement saving
    this.financingTermMonths = 48; // Standard bespoke hypercar lease / financing term
    this.listeners = {};

    this.currentInputs = {
      chassis: this.resolveOptionId(initialConfig.chassis ?? initialConfig.chassisTier ?? 'apex-v8', CHASSIS_OPTIONS, 'apex-v8'),
      aero: this.resolveOptionId(initialConfig.aero ?? initialConfig.aeroStage ?? 'stage-1', AERO_OPTIONS, 'stage-1'),
      brakes: this.resolveOptionId(initialConfig.brakes ?? initialConfig.brakesTier ?? 'standard-ceramic', BRAKE_OPTIONS, 'standard-ceramic'),
      exhaust: this.resolveOptionId(initialConfig.exhaust ?? initialConfig.exhaustTier ?? 'inconel-sport', EXHAUST_OPTIONS, 'inconel-sport'),
      wheels: this.resolveOptionId(initialConfig.wheels ?? initialConfig.wheelSpec ?? 'forged-aluminum', WHEEL_OPTIONS, 'forged-aluminum'),
      telemetry: this.resolveOptionId(initialConfig.telemetry ?? initialConfig.trackSupport ?? 'standard-telemetry', TELEMETRY_OPTIONS, 'standard-telemetry'),
      paymentTerms: this.resolvePaymentTerms(initialConfig.paymentTerms ?? (initialConfig.cashSettlement === false ? 'financed' : 'cash'))
    };

    this.lastQuote = null;
  }

  resolveOptionId(input, optionsMap, defaultId) {
    if (input === null || input === undefined) return defaultId;
    if (typeof input === 'string') {
      const clean = input.toLowerCase().trim();
      if (optionsMap[clean]) return clean;
      const match = Object.values(optionsMap).find(
        opt => opt.id === clean || opt.name.toLowerCase().includes(clean)
      );
      if (match) return match.id;
    }
    if (typeof input === 'number') {
      const match = Object.values(optionsMap).find(opt => opt.level === input);
      if (match) return match.id;
    }
    return defaultId;
  }

  resolvePaymentTerms(terms) {
    if (terms === 'financed' || terms === 'monthly' || terms === false) {
      return 'financed';
    }
    return 'cash'; // 'cash', 'full', 'settlement', or default
  }

  determineVolumeTier(baseCost) {
    const cost = Math.max(0, Number(baseCost) || 0);
    if (cost > VOLUME_TIERS.tier3.maxSpend) {
      return VOLUME_TIERS.tier4;
    }
    if (cost >= VOLUME_TIERS.tier3.minSpend) {
      return VOLUME_TIERS.tier3;
    }
    if (cost >= VOLUME_TIERS.tier2.minSpend) {
      return VOLUME_TIERS.tier2;
    }
    return VOLUME_TIERS.tier1;
  }

  applyVolumeDiscount(tierOrCost, maybeBaseCost) {
    let tier;
    let baseCost;

    if (typeof tierOrCost === 'number' && maybeBaseCost === undefined) {
      baseCost = tierOrCost;
      tier = this.determineVolumeTier(baseCost);
    } else {
      baseCost = maybeBaseCost ?? 0;
      if (typeof tierOrCost === 'string') {
        const lower = tierOrCost.toLowerCase().trim();
        tier = VOLUME_TIERS[lower] ||
          Object.values(VOLUME_TIERS).find(t => t.id === lower || t.name.toLowerCase().includes(lower)) ||
          this.determineVolumeTier(baseCost);
      } else if (typeof tierOrCost === 'number') {
        tier = Object.values(VOLUME_TIERS).find(t => t.level === tierOrCost) || this.determineVolumeTier(baseCost);
      } else if (tierOrCost && typeof tierOrCost === 'object') {
        tier = tierOrCost;
      } else {
        tier = this.determineVolumeTier(baseCost);
      }
    }

    const sanitizedBase = Math.max(0, Number(baseCost) || 0);
    const rate = Number(tier?.discountRate) || 0;
    const discountAmount = Math.round(sanitizedBase * rate * 100) / 100;
    const netCost = Math.round((sanitizedBase - discountAmount) * 100) / 100;

    return {
      tier: tier || VOLUME_TIERS.tier1,
      tierId: tier?.id || 'tier1',
      discountRate: rate,
      discountPercent: Math.round(rate * 100),
      discountAmount,
      netCost
    };
  }

  calculatePricing(inputs = {}) {
    const chassisId = this.resolveOptionId(
      inputs.chassis ?? inputs.chassisTier ?? this.currentInputs.chassis,
      CHASSIS_OPTIONS,
      'apex-v8'
    );
    const aeroId = this.resolveOptionId(
      inputs.aero ?? inputs.aeroStage ?? this.currentInputs.aero,
      AERO_OPTIONS,
      'stage-1'
    );
    const brakesId = this.resolveOptionId(
      inputs.brakes ?? inputs.brakesTier ?? this.currentInputs.brakes,
      BRAKE_OPTIONS,
      'standard-ceramic'
    );
    const exhaustId = this.resolveOptionId(
      inputs.exhaust ?? inputs.exhaustTier ?? this.currentInputs.exhaust,
      EXHAUST_OPTIONS,
      'inconel-sport'
    );
    const wheelsId = this.resolveOptionId(
      inputs.wheels ?? inputs.wheelSpec ?? this.currentInputs.wheels,
      WHEEL_OPTIONS,
      'forged-aluminum'
    );
    const telemetryId = this.resolveOptionId(
      inputs.telemetry ?? inputs.trackSupport ?? this.currentInputs.telemetry,
      TELEMETRY_OPTIONS,
      'standard-telemetry'
    );

    const paymentTerms = this.resolvePaymentTerms(
      inputs.paymentTerms ?? (inputs.fullSettlement === false ? 'financed' : (inputs.cashSettlement ? 'cash' : this.currentInputs.paymentTerms))
    );

    const chassis = CHASSIS_OPTIONS[chassisId];
    const aero = AERO_OPTIONS[aeroId];
    const brakes = BRAKE_OPTIONS[brakesId];
    const exhaust = EXHAUST_OPTIONS[exhaustId];
    const wheels = WHEEL_OPTIONS[wheelsId];
    const telemetry = TELEMETRY_OPTIONS[telemetryId];

    const breakdown = {
      chassis: chassis.basePrice,
      aero: aero.price,
      brakes: brakes.price,
      exhaust: exhaust.price,
      wheels: wheels.price,
      telemetry: telemetry.price
    };

    const baseCost = Math.round(
      (breakdown.chassis +
        breakdown.aero +
        breakdown.brakes +
        breakdown.exhaust +
        breakdown.wheels +
        breakdown.telemetry) * 100
    ) / 100;

    const volumeTier = this.determineVolumeTier(baseCost);
    const volumeDiscount = this.applyVolumeDiscount(volumeTier, baseCost);
    const volumeDiscountAmount = volumeDiscount.discountAmount;
    const costAfterVolumeDiscount = volumeDiscount.netCost;

    const isCashSettlement = paymentTerms === 'cash';
    const cashDiscountRate = isCashSettlement ? this.cashDiscountRate : 0.0;
    const cashDiscountAmount = isCashSettlement
      ? Math.round(costAfterVolumeDiscount * cashDiscountRate * 100) / 100
      : 0;

    const totalDiscountAmount = Math.round((volumeDiscountAmount + cashDiscountAmount) * 100) / 100;
    const totalCost = Math.max(0, Math.round((costAfterVolumeDiscount - cashDiscountAmount) * 100) / 100);

    const horsepower = chassis.specs.horsepower + (exhaust.impact?.horsepower || 0);
    const weightKg = chassis.specs.weightKg +
      (aero.impact?.weightKg || 0) +
      (brakes.impact?.weightKg || 0) +
      (exhaust.impact?.weightKg || 0) +
      (wheels.impact?.weightKg || 0);

    const topSpeedKmh = Math.round((chassis.specs.topSpeedKmh + (aero.impact?.topSpeedKmh || 0)) * 10) / 10;
    const acceleration0to100 = Math.round(
      Math.max(1.5, chassis.specs.acceleration0to100 + (wheels.impact?.acceleration0to100 || 0)) * 100
    ) / 100;

    const downforceKg = chassis.specs.downforceKg + (aero.impact?.downforceKg || 0);
    const lateralG = Math.round(
      (chassis.specs.lateralG + (aero.impact?.lateralG || 0) + (wheels.impact?.lateralG || 0)) * 100
    ) / 100;

    const brakingDistance100to0 = brakes.impact?.braking100to0M || 30.0;
    const powerToWeightHpPerTon = Math.round(((horsepower / weightKg) * 1000) * 10) / 10;

    const performance = {
      horsepower,
      topSpeedKmh,
      acceleration0to100,
      downforceKg,
      lateralG,
      weightKg,
      brakingDistance100to0,
      powerToWeightHpPerTon
    };

    const financedMonthlyEstimate = Math.round((costAfterVolumeDiscount / this.financingTermMonths) * 100) / 100;

    const result = {
      inputs: {
        chassis: chassisId,
        aero: aeroId,
        brakes: brakesId,
        exhaust: exhaustId,
        wheels: wheelsId,
        telemetry: telemetryId,
        paymentTerms
      },
      selectedItems: {
        chassis,
        aero,
        brakes,
        exhaust,
        wheels,
        telemetry
      },
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      breakdown,
      baseCost,
      subtotal: baseCost,
      tier: volumeTier,
      volumeTierId: volumeTier.id,
      volumeDiscountRate: volumeDiscount.discountRate,
      volumeDiscountPercent: volumeDiscount.discountPercent,
      volumeDiscountAmount,
      costAfterVolumeDiscount,
      paymentTerms,
      isCashSettlement,
      cashDiscountRate,
      cashDiscountPercent: Math.round(cashDiscountRate * 100),
      cashDiscountAmount,
      totalDiscountAmount,
      discountAmount: totalDiscountAmount,
      totalCost,
      savingsPercentage: baseCost > 0 ? Math.round((totalDiscountAmount / baseCost) * 1000) / 10 : 0,
      financedMonthlyEstimate,
      financingTermMonths: this.financingTermMonths,
      performance
    };

    this.emit('pricing:calculated', result);
    return result;
  }

  generateQuote(options = {}) {
    const configInputs = {
      chassis: options.chassis ?? this.currentInputs.chassis,
      aero: options.aero ?? this.currentInputs.aero,
      brakes: options.brakes ?? this.currentInputs.brakes,
      exhaust: options.exhaust ?? this.currentInputs.exhaust,
      wheels: options.wheels ?? this.currentInputs.wheels,
      telemetry: options.telemetry ?? this.currentInputs.telemetry,
      paymentTerms: options.paymentTerms ?? this.currentInputs.paymentTerms,
      fullSettlement: options.fullSettlement,
      cashSettlement: options.cashSettlement
    };

    const pricing = this.calculatePricing(configInputs);

    const now = new Date();
    const quoteYear = now.getFullYear();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const quoteId = options.quoteId || `HFQ-${quoteYear}-${randomSeq}`;

    const quote = {
      quoteId,
      status: 'OFFICIAL_FACTORY_QUOTE',
      generatedAt: now.toISOString(),
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      clientName: options.clientName || 'VIP Private Collector',
      dealerPartner: options.dealerPartner || 'Apex Atelier Scuderia International',
      currency: this.currency,
      currencySymbol: this.currencySymbol,
      buildSlotAllocation: {
        status: 'CONFIRMED',
        quarter: `Q${Math.floor(now.getMonth() / 3) + 1} ${quoteYear + 1}`,
        atelierFacility: "Atelier Molsheim / Sant'Agata Bespoke Works",
        chassisVIN: `APX-${quoteYear}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      },
      ...pricing
    };

    this.lastQuote = quote;
    this.emit('quote:generated', quote);
    return quote;
  }

  optimizeAllocation(targetBudget, requiredSpecs = {}) {
    const sanitizedBudget = Math.max(0, Number(targetBudget) || 0);
    const paymentTerms = this.resolvePaymentTerms(
      requiredSpecs.paymentTerms ?? this.currentInputs.paymentTerms
    );

    const minHP = Number(requiredSpecs.minHorsepower ?? requiredSpecs.minHP) || 0;
    const minTopSpeed = Number(requiredSpecs.minTopSpeed) || 0;
    const minDownforce = Number(requiredSpecs.minDownforce) || 0;
    const max0to100 = Number(requiredSpecs.max0to100) || Infinity;
    const minChassisLevel = Number(requiredSpecs.minChassisTier ?? requiredSpecs.minChassisLevel) || 1;
    const preferredChassis = requiredSpecs.chassis ? this.resolveOptionId(requiredSpecs.chassis, CHASSIS_OPTIONS, null) : null;

    let bestFit = null;
    let highestPerformanceScore = -Infinity;
    let closestOverBudget = null;
    let lowestDeficit = Infinity;

    const chassisKeys = Object.keys(CHASSIS_OPTIONS);
    const aeroKeys = Object.keys(AERO_OPTIONS);
    const brakeKeys = Object.keys(BRAKE_OPTIONS);
    const exhaustKeys = Object.keys(EXHAUST_OPTIONS);
    const wheelKeys = Object.keys(WHEEL_OPTIONS);
    const telemetryKeys = Object.keys(TELEMETRY_OPTIONS);

    for (const cKey of chassisKeys) {
      if (preferredChassis && cKey !== preferredChassis) continue;
      if (CHASSIS_OPTIONS[cKey].level < minChassisLevel) continue;

      for (const aKey of aeroKeys) {
        for (const bKey of brakeKeys) {
          for (const eKey of exhaustKeys) {
            for (const wKey of wheelKeys) {
              for (const tKey of telemetryKeys) {
                const testInputs = {
                  chassis: cKey,
                  aero: aKey,
                  brakes: bKey,
                  exhaust: eKey,
                  wheels: wKey,
                  telemetry: tKey,
                  paymentTerms
                };

                const pricing = this.calculatePricing(testInputs);
                const perf = pricing.performance;

                // Validate required specs
                if (perf.horsepower < minHP) continue;
                if (perf.topSpeedKmh < minTopSpeed) continue;
                if (perf.downforceKg < minDownforce) continue;
                if (perf.acceleration0to100 > max0to100) continue;

                if (pricing.totalCost <= sanitizedBudget) {
                  // Composite score prioritizing speed, power, downforce and low 0-100
                  const score =
                    (perf.horsepower * 1.5) +
                    (perf.topSpeedKmh * 3.0) +
                    (perf.downforceKg * 1.2) +
                    (perf.lateralG * 500) -
                    (perf.acceleration0to100 * 250) +
                    (pricing.totalCost * 0.0001);

                  if (score > highestPerformanceScore) {
                    highestPerformanceScore = score;
                    bestFit = { inputs: testInputs, pricing, score };
                  }
                } else {
                  const deficit = pricing.totalCost - sanitizedBudget;
                  if (deficit < lowestDeficit) {
                    lowestDeficit = deficit;
                    closestOverBudget = { inputs: testInputs, pricing, deficit };
                  }
                }
              }
            }
          }
        }
      }
    }

    if (bestFit) {
      const budgetRemaining = Math.round((sanitizedBudget - bestFit.pricing.totalCost) * 100) / 100;
      const utilizationRate = sanitizedBudget > 0
        ? Math.round((bestFit.pricing.totalCost / sanitizedBudget) * 1000) / 10
        : 0;

      const result = {
        success: true,
        targetBudget: sanitizedBudget,
        configuration: bestFit.inputs,
        pricing: bestFit.pricing,
        budgetRemaining,
        utilizationRate,
        recommendations: [
          `Optimized build allocates ${utilizationRate}% of budget with $${budgetRemaining.toLocaleString()} reserve.`,
          `Applied ${bestFit.pricing.tier.name} volume benefits saving $${bestFit.pricing.volumeDiscountAmount.toLocaleString()}.`,
          bestFit.pricing.isCashSettlement
            ? `Upfront cash settlement provides an extra 10% saving of $${bestFit.pricing.cashDiscountAmount.toLocaleString()}.`
            : `Financing option provides predictable monthly capital expenditure at $${bestFit.pricing.financedMonthlyEstimate.toLocaleString()}/mo.`
        ]
      };

      this.emit('allocation:optimized', result);
      return result;
    }

    // Fallback if no build fits within budget while meeting requiredSpecs
    const fallbackPricing = closestOverBudget?.pricing || this.calculatePricing({
      chassis: 'apex-v8',
      aero: 'stage-1',
      brakes: 'standard-ceramic',
      exhaust: 'inconel-sport',
      wheels: 'forged-aluminum',
      telemetry: 'standard-telemetry',
      paymentTerms
    });

    const result = {
      success: false,
      targetBudget: sanitizedBudget,
      reason: closestOverBudget
        ? `Required specifications exceed target budget by $${Math.round(lowestDeficit).toLocaleString()}.`
        : 'Target budget is insufficient for entry-level Apex GT bespoke specification.',
      nearestConfiguration: closestOverBudget?.inputs || {
        chassis: 'apex-v8',
        aero: 'stage-1',
        brakes: 'standard-ceramic',
        exhaust: 'inconel-sport',
        wheels: 'forged-aluminum',
        telemetry: 'standard-telemetry',
        paymentTerms
      },
      pricing: fallbackPricing,
      budgetRemaining: sanitizedBudget - fallbackPricing.totalCost,
      utilizationRate: 0,
      recommendations: [
        `Increase allocation budget to at least $${fallbackPricing.totalCost.toLocaleString()} to qualify for this hypercar build.`,
        'Consider full settlement payment to unlock the 10% cash savings incentive.'
      ]
    };

    this.emit('allocation:optimized', result);
    return result;
  }

  on(event, fn) {
    if (typeof fn !== 'function') return () => {};
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event].delete(fn);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) {
        try {
          fn(data);
        } catch {
          // Swallow listener exception to prevent breaking caller execution flow
        }
      }
    }
  }
}

// Client-side DOM UI binder for cost-optimizer.html
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const engine = new AutomotiveHypercarCostOptimizerEngine();

    // DOM Elements
    const chassisSelect = document.getElementById('chassis-select');
    const aeroSelect = document.getElementById('aero-select');
    const wheelSelect = document.getElementById('wheel-select');
    const brakesSelect = document.getElementById('brakes-select');
    const exhaustSelect = document.getElementById('exhaust-select');
    const telemetrySelect = document.getElementById('telemetry-select');
    const paymentToggle = document.getElementById('payment-toggle');

    // Display Elements
    const totalCostVal = document.getElementById('total-cost-val');
    const baseMSRPVal = document.getElementById('base-msrp-val');
    const tierBadge = document.getElementById('tier-badge');
    const volumeDiscountVal = document.getElementById('volume-discount-val');
    const cashDiscountVal = document.getElementById('cash-discount-val');
    const totalSavingsVal = document.getElementById('total-savings-val');
    const monthlyEstimateVal = document.getElementById('monthly-estimate-val');

    // Performance Metric Badges
    const perfTopSpeed = document.getElementById('perf-top-speed');
    const perf0to100 = document.getElementById('perf-0-100');
    const perfDownforce = document.getElementById('perf-downforce');
    const perfLateralG = document.getElementById('perf-lateral-g');
    const perfHp = document.getElementById('perf-horsepower');
    const perfPowerWeight = document.getElementById('perf-power-weight');
    const perfBraking = document.getElementById('perf-braking');

    // Breakdown Elements
    const costChassis = document.getElementById('cost-chassis');
    const costAero = document.getElementById('cost-aero');
    const costBrakes = document.getElementById('cost-brakes');
    const costExhaust = document.getElementById('cost-exhaust');
    const costWheels = document.getElementById('cost-wheels');
    const costTelemetry = document.getElementById('cost-telemetry');

    // Optimizer Elements
    const budgetInput = document.getElementById('budget-input');
    const optimizeBtn = document.getElementById('optimize-btn');
    const optimizerMessage = document.getElementById('optimizer-message');

    // Quote Modal Elements
    const quoteBtn = document.getElementById('generate-quote-btn');
    const quoteModal = document.getElementById('quote-modal');
    const closeQuoteBtn = document.getElementById('close-quote-btn');
    const printQuoteBtn = document.getElementById('print-quote-btn');

    function formatCurrency(amount) {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    function updateConfig() {
      if (!chassisSelect) return;

      const isCash = paymentToggle ? paymentToggle.checked : true;
      const currentConfig = {
        chassis: chassisSelect.value,
        aero: aeroSelect?.value,
        brakes: brakesSelect?.value,
        exhaust: exhaustSelect?.value,
        wheels: wheelSelect?.value,
        telemetry: telemetrySelect?.value,
        paymentTerms: isCash ? 'cash' : 'financed'
      };

      const pricing = engine.calculatePricing(currentConfig);

      if (totalCostVal) totalCostVal.textContent = formatCurrency(pricing.totalCost);
      if (baseMSRPVal) baseMSRPVal.textContent = formatCurrency(pricing.baseCost);
      if (volumeDiscountVal) volumeDiscountVal.textContent = `-${formatCurrency(pricing.volumeDiscountAmount)} (${pricing.volumeDiscountPercent}%)`;
      if (cashDiscountVal) cashDiscountVal.textContent = isCash ? `-${formatCurrency(pricing.cashDiscountAmount)} (10%)` : '$0 (Financed)';
      if (totalSavingsVal) totalSavingsVal.textContent = `-${formatCurrency(pricing.totalDiscountAmount)} (${pricing.savingsPercentage}%)`;
      if (monthlyEstimateVal) {
        monthlyEstimateVal.textContent = isCash
          ? 'N/A (Full Cash Settlement)'
          : `${formatCurrency(pricing.financedMonthlyEstimate)} / mo (48 mo)`;
      }

      if (tierBadge) {
        tierBadge.textContent = pricing.tier.badge;
        tierBadge.className = `tier-badge tier-${pricing.tier.id}`;
      }

      // Breakdown
      if (costChassis) costChassis.textContent = formatCurrency(pricing.breakdown.chassis);
      if (costAero) costAero.textContent = formatCurrency(pricing.breakdown.aero);
      if (costBrakes) costBrakes.textContent = formatCurrency(pricing.breakdown.brakes);
      if (costExhaust) costExhaust.textContent = formatCurrency(pricing.breakdown.exhaust);
      if (costWheels) costWheels.textContent = formatCurrency(pricing.breakdown.wheels);
      if (costTelemetry) costTelemetry.textContent = formatCurrency(pricing.breakdown.telemetry);

      // Performance
      if (perfTopSpeed) perfTopSpeed.textContent = `${pricing.performance.topSpeedKmh} km/h`;
      if (perf0to100) perf0to100.textContent = `${pricing.performance.acceleration0to100} s`;
      if (perfDownforce) perfDownforce.textContent = `${pricing.performance.downforceKg} kg`;
      if (perfLateralG) perfLateralG.textContent = `${pricing.performance.lateralG} G`;
      if (perfHp) perfHp.textContent = `${pricing.performance.horsepower} HP`;
      if (perfPowerWeight) perfPowerWeight.textContent = `${pricing.performance.powerToWeightHpPerTon} HP/t`;
      if (perfBraking) perfBraking.textContent = `${pricing.performance.brakingDistance100to0} m`;
    }

    // Event listeners for inputs
    [chassisSelect, aeroSelect, wheelSelect, brakesSelect, exhaustSelect, telemetrySelect].forEach(el => {
      el?.addEventListener('change', updateConfig);
    });
    paymentToggle?.addEventListener('change', updateConfig);

    // Budget Optimizer click
    optimizeBtn?.addEventListener('click', () => {
      const budget = Number(budgetInput?.value) || 3000000;
      const isCash = paymentToggle ? paymentToggle.checked : true;
      const result = engine.optimizeAllocation(budget, { paymentTerms: isCash ? 'cash' : 'financed' });

      if (result.success && result.configuration) {
        if (chassisSelect) chassisSelect.value = result.configuration.chassis;
        if (aeroSelect) aeroSelect.value = result.configuration.aero;
        if (brakesSelect) brakesSelect.value = result.configuration.brakes;
        if (exhaustSelect) exhaustSelect.value = result.configuration.exhaust;
        if (wheelSelect) wheelSelect.value = result.configuration.wheels;
        if (telemetrySelect) telemetrySelect.value = result.configuration.telemetry;
        updateConfig();

        if (optimizerMessage) {
          optimizerMessage.innerHTML = `<span class="success-msg">✓ Optimal allocation found! Reserve: ${formatCurrency(result.budgetRemaining)} (${result.utilizationRate}% utilized).</span>`;
        }
      } else {
        if (optimizerMessage) {
          optimizerMessage.innerHTML = `<span class="error-msg">⚠ ${result.reason}</span>`;
        }
      }
    });

    // Quote Modal
    quoteBtn?.addEventListener('click', () => {
      const isCash = paymentToggle ? paymentToggle.checked : true;
      const quote = engine.generateQuote({
        chassis: chassisSelect?.value,
        aero: aeroSelect?.value,
        brakes: brakesSelect?.value,
        exhaust: exhaustSelect?.value,
        wheels: wheelSelect?.value,
        telemetry: telemetrySelect?.value,
        paymentTerms: isCash ? 'cash' : 'financed'
      });

      const quoteIdEl = document.getElementById('modal-quote-id');
      const quoteDateEl = document.getElementById('modal-quote-date');
      const quoteVinEl = document.getElementById('modal-quote-vin');
      const quoteTotalEl = document.getElementById('modal-quote-total');
      const quoteBaseEl = document.getElementById('modal-quote-base');
      const quoteVolumeEl = document.getElementById('modal-quote-volume');
      const quoteCashEl = document.getElementById('modal-quote-cash');
      const quoteDeliveryEl = document.getElementById('modal-quote-delivery');

      if (quoteIdEl) quoteIdEl.textContent = quote.quoteId;
      if (quoteDateEl) quoteDateEl.textContent = new Date(quote.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      if (quoteVinEl) quoteVinEl.textContent = quote.buildSlotAllocation.chassisVIN;
      if (quoteTotalEl) quoteTotalEl.textContent = formatCurrency(quote.totalCost);
      if (quoteBaseEl) quoteBaseEl.textContent = formatCurrency(quote.baseCost);
      if (quoteVolumeEl) quoteVolumeEl.textContent = `-${formatCurrency(quote.volumeDiscountAmount)} (${quote.volumeDiscountPercent}%)`;
      if (quoteCashEl) quoteCashEl.textContent = isCash ? `-${formatCurrency(quote.cashDiscountAmount)} (10%)` : '$0 (Financed)';
      if (quoteDeliveryEl) quoteDeliveryEl.textContent = `${quote.buildSlotAllocation.quarter} • ${quote.buildSlotAllocation.atelierFacility}`;

      if (quoteModal) {
        quoteModal.classList.add('active');
        quoteModal.setAttribute('aria-hidden', 'false');
      }
    });

    closeQuoteBtn?.addEventListener('click', () => {
      if (quoteModal) {
        quoteModal.classList.remove('active');
        quoteModal.setAttribute('aria-hidden', 'true');
      }
    });

    printQuoteBtn?.addEventListener('click', () => {
      window.print();
    });

    // Initial calculation
    updateConfig();
  });
}
