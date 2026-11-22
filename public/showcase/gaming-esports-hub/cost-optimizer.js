/**
 * Gaming Esports Hub - Tiered Resource Allocation & Dynamic Cost Optimizer Sandbox
 * Issue #2064: Tiered infrastructure engine for dedicated game servers, anti-cheat,
 * broadcast stream relays, and replay VOD storage.
 */

function validateNonNegativeNumber(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    throw new TypeError(`${name} must be a valid finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must be non-negative.`);
  }
  return value;
}

function validateInteger(value, name, min = 0) {
  validateNonNegativeNumber(value, name);
  if (!Number.isInteger(value)) {
    throw new TypeError(`${name} must be an integer.`);
  }
  if (value < min) {
    throw new RangeError(`${name} must be at least ${min}.`);
  }
  return value;
}

export const DEFAULT_CONFIG = Object.freeze({
  serverBaseCost: 45, // $45 / server / month (64Hz baseline)
  tickRateMultipliers: Object.freeze({
    64: 1.0,
    128: 1.65 // 128Hz competitive tournament tick-rate
  }),
  antiCheatNodeCost: 85, // $85 / node / month (inspects concurrent matches)
  streamRelayCostPerMbps: 0.12, // $0.12 / Mbps / month for ultra-low-latency broadcast
  vodStorageCostPerTB: 18, // $18 / TB / month for NVMe replay archive
  annualDiscountRate: 0.20, // 20% annual league season pass discount
  estimatedMatchesPerServerMonth: 250, // default estimation per dedicated server instance
  tiers: Object.freeze([
    Object.freeze({
      id: 'indie',
      name: 'Indie Community',
      minSpend: 0,
      discountRate: 0.0,
      subsidy: 0,
      badgeColor: '#9ca3af',
      description: 'Grassroots tournaments & community scrim lobbies'
    }),
    Object.freeze({
      id: 'challenger',
      name: 'Challenger League',
      minSpend: 500,
      discountRate: 0.10, // 10% volume discount
      subsidy: 50, // $50 esports league ecosystem subsidy
      badgeColor: '#06b6d4',
      description: 'Regional qualifier circuits & semi-pro tournaments'
    }),
    Object.freeze({
      id: 'pro',
      name: 'Pro Championship Tier',
      minSpend: 2000,
      discountRate: 0.18, // 18% volume discount
      subsidy: 200, // $200 premier publisher subsidy
      badgeColor: '#8b5cf6',
      description: 'Franchised leagues, national broadcast finals'
    }),
    Object.freeze({
      id: 'global',
      name: 'Global Major Invitational',
      minSpend: 5000,
      discountRate: 0.25, // 25% volume discount
      subsidy: 500, // $500 major tournament partner subsidy
      badgeColor: '#f59e0b',
      description: 'Tier-1 world championship & arena stadium events'
    })
  ])
});

export class GamingEsportsHubCostOptimizerEngine {
  #listeners = new Map();

  constructor(options = {}) {
    this.config = {
      serverBaseCost: options.serverBaseCost ?? DEFAULT_CONFIG.serverBaseCost,
      tickRateMultipliers: {
        ...DEFAULT_CONFIG.tickRateMultipliers,
        ...(options.tickRateMultipliers || {})
      },
      antiCheatNodeCost: options.antiCheatNodeCost ?? DEFAULT_CONFIG.antiCheatNodeCost,
      streamRelayCostPerMbps: options.streamRelayCostPerMbps ?? DEFAULT_CONFIG.streamRelayCostPerMbps,
      vodStorageCostPerTB: options.vodStorageCostPerTB ?? DEFAULT_CONFIG.vodStorageCostPerTB,
      annualDiscountRate: options.annualDiscountRate ?? DEFAULT_CONFIG.annualDiscountRate,
      estimatedMatchesPerServerMonth: options.estimatedMatchesPerServerMonth ?? DEFAULT_CONFIG.estimatedMatchesPerServerMonth,
      tiers: (options.tiers ? options.tiers.map(t => ({ ...t })) : DEFAULT_CONFIG.tiers.map(t => ({ ...t })))
        .sort((a, b) => a.minSpend - b.minSpend)
    };

    validateNonNegativeNumber(this.config.serverBaseCost, 'serverBaseCost');
    validateNonNegativeNumber(this.config.antiCheatNodeCost, 'antiCheatNodeCost');
    validateNonNegativeNumber(this.config.streamRelayCostPerMbps, 'streamRelayCostPerMbps');
    validateNonNegativeNumber(this.config.vodStorageCostPerTB, 'vodStorageCostPerTB');
    validateNonNegativeNumber(this.config.annualDiscountRate, 'annualDiscountRate');
    if (this.config.annualDiscountRate > 1) {
      throw new RangeError('annualDiscountRate must not exceed 1.0 (100%).');
    }
  }

  // --- Event Emitter Pattern ---
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Event listener callback must be a function.');
    }
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.#listeners.has(event)) {
      this.#listeners.get(event).delete(callback);
    }
  }

  emit(event, payload) {
    if (this.#listeners.has(event)) {
      for (const cb of this.#listeners.get(event)) {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[CostOptimizerEngine] Listener error on event '${event}':`, err);
        }
      }
    }
  }

  getTiers() {
    return this.config.tiers.map(t => ({ ...t }));
  }

  getTierForSpend(baseCost) {
    validateNonNegativeNumber(baseCost, 'baseCost');
    const sorted = [...this.config.tiers].sort((a, b) => b.minSpend - a.minSpend);
    const matched = sorted.find(t => baseCost >= t.minSpend);
    return matched ? { ...matched } : { ...this.config.tiers[0] };
  }

  applyVolumeDiscount(tierOrId, baseCost) {
    validateNonNegativeNumber(baseCost, 'baseCost');

    let tier;
    if (!tierOrId) {
      tier = this.getTierForSpend(baseCost);
    } else if (typeof tierOrId === 'string') {
      tier = this.config.tiers.find(t => t.id === tierOrId);
      if (!tier) {
        throw new Error(`Unknown league tier identifier: '${tierOrId}'`);
      }
    } else if (typeof tierOrId === 'object' && tierOrId !== null) {
      tier = tierOrId;
    } else {
      throw new TypeError('tierOrId must be a string ID, an object, or omitted.');
    }

    const discountRate = Number.isFinite(tier.discountRate) ? tier.discountRate : 0;
    const subsidy = Number.isFinite(tier.subsidy) ? tier.subsidy : 0;

    const discountAmount = Number((baseCost * discountRate).toFixed(2));
    const postDiscountCost = Math.max(0, baseCost - discountAmount);
    const subsidyAmount = Number(Math.min(postDiscountCost, subsidy).toFixed(2));
    const netCost = Number(Math.max(0, postDiscountCost - subsidyAmount).toFixed(2));

    return {
      tier: { ...tier },
      baseCost: Number(baseCost.toFixed(2)),
      discountRate,
      discountAmount,
      subsidyAmount,
      netCost
    };
  }

  calculatePricing(inputs = {}) {
    const servers = validateInteger(inputs.servers ?? 4, 'servers', 0);
    const tickRate = Number(inputs.tickRate ?? 64);
    if (!Object.prototype.hasOwnProperty.call(this.config.tickRateMultipliers, tickRate)) {
      throw new RangeError(`Unsupported tick rate: ${tickRate}. Supported tick rates are ${Object.keys(this.config.tickRateMultipliers).join(', ')}.`);
    }
    const antiCheatNodes = validateInteger(inputs.antiCheatNodes ?? 2, 'antiCheatNodes', 0);
    const streamRelayMbps = validateNonNegativeNumber(inputs.streamRelayMbps ?? 500, 'streamRelayMbps');
    const vodStorageTB = validateNonNegativeNumber(inputs.vodStorageTB ?? 5, 'vodStorageTB');

    const billingCycle = (inputs.billingCycle ?? 'monthly').toLowerCase();
    if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
      throw new Error(`Invalid billingCycle '${billingCycle}'. Must be 'monthly' or 'annual'.`);
    }

    const rawMatches = inputs.estimatedMatches ?? (servers * this.config.estimatedMatchesPerServerMonth);
    const estimatedMatches = validateNonNegativeNumber(rawMatches, 'estimatedMatches');

    // Calculate sub-costs
    const tickMultiplier = this.config.tickRateMultipliers[tickRate];
    const serverCost = servers * this.config.serverBaseCost * tickMultiplier;
    const antiCheatCost = antiCheatNodes * this.config.antiCheatNodeCost;
    const streamCost = streamRelayMbps * this.config.streamRelayCostPerMbps;
    const vodCost = vodStorageTB * this.config.vodStorageCostPerTB;
    const rawTotal = serverCost + antiCheatCost + streamCost + vodCost;

    // Apply Tier volume discount & subsidy
    const manualTier = inputs.manualTier ?? null;
    const volumeResult = this.applyVolumeDiscount(manualTier, rawTotal);
    const tier = volumeResult.tier;
    const subtotal = volumeResult.netCost;

    // Apply Annual multi-tournament league season discount if selected
    let annualSavings = 0;
    let monthlyTotal = subtotal;
    let annualTotal = Number((subtotal * 12).toFixed(2));

    if (billingCycle === 'annual') {
      annualSavings = Number((subtotal * this.config.annualDiscountRate).toFixed(2));
      monthlyTotal = Number(Math.max(0, subtotal - annualSavings).toFixed(2));
      annualTotal = Number((monthlyTotal * 12).toFixed(2));
    }

    const costPerMatch = estimatedMatches > 0
      ? Number((monthlyTotal / estimatedMatches).toFixed(4))
      : 0;

    const result = {
      inputs: {
        servers,
        tickRate,
        antiCheatNodes,
        streamRelayMbps,
        vodStorageTB,
        billingCycle,
        estimatedMatches
      },
      breakdown: {
        serverCost: Number(serverCost.toFixed(2)),
        antiCheatCost: Number(antiCheatCost.toFixed(2)),
        streamCost: Number(streamCost.toFixed(2)),
        vodCost: Number(vodCost.toFixed(2)),
        rawTotal: Number(rawTotal.toFixed(2))
      },
      tier: {
        id: tier.id,
        name: tier.name,
        discountRate: tier.discountRate,
        subsidy: tier.subsidy,
        discountAmount: volumeResult.discountAmount,
        subsidyAmount: volumeResult.subsidyAmount
      },
      billingCycle,
      subtotal: Number(subtotal.toFixed(2)),
      annualDiscountRate: this.config.annualDiscountRate,
      annualSavings,
      monthlyTotal,
      annualTotal,
      estimatedMatches,
      costPerMatch,
      currency: 'USD'
    };

    this.emit('pricingCalculated', result);
    return result;
  }

  generateQuote(options = {}) {
    const pricing = this.calculatePricing(options);
    const organization = String(options.organization || 'Vortex Esports Franchise').trim();
    const quoteId = `VORTEX-QUOTE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const generatedAt = new Date().toISOString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const quote = {
      quoteId,
      organization,
      generatedAt,
      validUntil,
      slaGuarantee: '99.99% Matchmaking & Telemetry Uptime SLA (Sub-15ms Latency Guarantee)',
      tierName: pricing.tier.name,
      billingCycle: pricing.billingCycle,
      currency: 'USD',
      monthlyTotal: pricing.monthlyTotal,
      annualTotal: pricing.annualTotal,
      costPerMatch: pricing.costPerMatch,
      specifications: [
        {
          item: 'Dedicated Matchmaking Servers',
          quantity: pricing.inputs.servers,
          unit: 'instances',
          specs: `${pricing.inputs.tickRate}Hz high-precision tick-rate allocation`,
          monthlyCost: pricing.breakdown.serverCost
        },
        {
          item: 'Anti-Cheat Telemetry Nodes',
          quantity: pricing.inputs.antiCheatNodes,
          unit: 'nodes',
          specs: 'Real-time heuristic anomaly detection and integrity telemetry',
          monthlyCost: pricing.breakdown.antiCheatCost
        },
        {
          item: 'Tournament Live Stream Relay',
          quantity: pricing.inputs.streamRelayMbps,
          unit: 'Mbps',
          specs: 'Edge-accelerated low-latency video relay pipeline',
          monthlyCost: pricing.breakdown.streamCost
        },
        {
          item: 'Match VOD & Replay Storage',
          quantity: pricing.inputs.vodStorageTB,
          unit: 'TB',
          specs: 'High-IOPS hot NVMe replay cold archive',
          monthlyCost: pricing.breakdown.vodCost
        }
      ],
      discounts: {
        volumeDiscountRate: pricing.tier.discountRate,
        volumeDiscountAmount: pricing.tier.discountAmount,
        leagueSubsidyAmount: pricing.tier.subsidyAmount,
        annualSavingsAmount: pricing.annualSavings
      },
      pricing
    };

    this.emit('quoteGenerated', quote);
    return quote;
  }

  optimizeAllocation(targetBudget, requiredNeeds = {}) {
    validateNonNegativeNumber(targetBudget, 'targetBudget');
    if (targetBudget <= 0) {
      throw new RangeError('targetBudget must be greater than zero.');
    }

    const minServers = validateInteger(requiredNeeds.minServers ?? 1, 'minServers', 0);
    const minAntiCheat = validateInteger(requiredNeeds.minAntiCheat ?? 1, 'minAntiCheat', 0);
    const minStreamMbps = validateNonNegativeNumber(requiredNeeds.minStreamMbps ?? 100, 'minStreamMbps');
    const minVodTB = validateNonNegativeNumber(requiredNeeds.minVodTB ?? 1, 'minVodTB');
    const preferredTickRate = requiredNeeds.preferredTickRate ?? 128;
    const billingCycle = requiredNeeds.billingCycle ?? 'annual';

    // Check if the baseline minimum configuration fits
    const baselinePricing = this.calculatePricing({
      servers: minServers,
      tickRate: 64,
      antiCheatNodes: minAntiCheat,
      streamRelayMbps: minStreamMbps,
      vodStorageTB: minVodTB,
      billingCycle
    });

    if (baselinePricing.monthlyTotal > targetBudget) {
      const shortfall = Number((baselinePricing.monthlyTotal - targetBudget).toFixed(2));
      const infeasibleResult = {
        feasible: false,
        targetBudget,
        requiredMinimumBudget: baselinePricing.monthlyTotal,
        shortfall,
        allocation: null,
        pricing: null,
        recommendations: [
          `Target monthly budget ($${targetBudget}) is insufficient for minimal baseline requirements ($${baselinePricing.monthlyTotal}).`,
          `Increase monthly budget by at least $${shortfall} or lower baseline server/stream requirements.`
        ]
      };
      this.emit('allocationOptimized', infeasibleResult);
      return infeasibleResult;
    }

    // Determine if preferred tick-rate fits baseline
    let currentTickRate = 64;
    if (preferredTickRate === 128) {
      const test128 = this.calculatePricing({
        servers: minServers,
        tickRate: 128,
        antiCheatNodes: minAntiCheat,
        streamRelayMbps: minStreamMbps,
        vodStorageTB: minVodTB,
        billingCycle
      });
      if (test128.monthlyTotal <= targetBudget) {
        currentTickRate = 128;
      }
    }

    // Greedy allocation scaling
    let servers = minServers;
    let antiCheatNodes = minAntiCheat;
    let streamRelayMbps = minStreamMbps;
    let vodStorageTB = minVodTB;

    let bestPricing = this.calculatePricing({
      servers,
      tickRate: currentTickRate,
      antiCheatNodes,
      streamRelayMbps,
      vodStorageTB,
      billingCycle
    });

    // Expand resources in prioritized esports order:
    // Priority: Servers -> AntiCheat (1 per 3 servers) -> Stream Relay -> VOD Storage
    let improved = true;
    let loopGuard = 0;
    while (improved && loopGuard++ < 1000) {
      improved = false;

      // Candidate 1: Increase servers
      const nextServers = servers + 1;
      const neededAntiCheat = Math.max(antiCheatNodes, Math.ceil(nextServers / 3));
      const testCandidate = this.calculatePricing({
        servers: nextServers,
        tickRate: currentTickRate,
        antiCheatNodes: neededAntiCheat,
        streamRelayMbps,
        vodStorageTB,
        billingCycle
      });

      if (testCandidate.monthlyTotal <= targetBudget) {
        servers = nextServers;
        antiCheatNodes = neededAntiCheat;
        bestPricing = testCandidate;
        improved = true;
        continue;
      }

      // Candidate 2: Increase stream relay bandwidth (+250 Mbps)
      const nextStream = streamRelayMbps + 250;
      const testStream = this.calculatePricing({
        servers,
        tickRate: currentTickRate,
        antiCheatNodes,
        streamRelayMbps: nextStream,
        vodStorageTB,
        billingCycle
      });

      if (testStream.monthlyTotal <= targetBudget) {
        streamRelayMbps = nextStream;
        bestPricing = testStream;
        improved = true;
        continue;
      }

      // Candidate 3: Increase VOD storage (+2 TB)
      const nextVod = vodStorageTB + 2;
      const testVod = this.calculatePricing({
        servers,
        tickRate: currentTickRate,
        antiCheatNodes,
        streamRelayMbps,
        vodStorageTB: nextVod,
        billingCycle
      });

      if (testVod.monthlyTotal <= targetBudget) {
        vodStorageTB = nextVod;
        bestPricing = testVod;
        improved = true;
        continue;
      }
    }

    const remainingBudget = Number((targetBudget - bestPricing.monthlyTotal).toFixed(2));
    const recommendations = [
      `Optimized for ${bestPricing.tier.name} with ${servers} dedicated servers at ${currentTickRate}Hz.`,
      `Telemetry infrastructure paired with ${antiCheatNodes} anti-cheat detection nodes.`,
      `Tournament streaming configured for ${streamRelayMbps} Mbps concurrent broadcast capacity.`,
      `Retains $${remainingBudget} / month budget buffer.`
    ];

    const result = {
      feasible: true,
      targetBudget,
      allocatedBudget: bestPricing.monthlyTotal,
      remainingBudget,
      allocation: {
        servers,
        tickRate: currentTickRate,
        antiCheatNodes,
        streamRelayMbps,
        vodStorageTB,
        billingCycle
      },
      pricing: bestPricing,
      recommendations
    };

    this.emit('allocationOptimized', result);
    return result;
  }
}

// --- Interactive DOM Mount & Binding ---
export function mountCostOptimizer(rootElement) {
  const root = rootElement || (typeof document !== 'undefined' ? document.querySelector('[data-cost-optimizer]') : null);
  if (!root) return null;

  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Helper selector
  const $ = id => root.querySelector(`#${id}`);

  const serversInput = $('co-servers');
  const serversVal = $('co-servers-val');
  const tick64 = $('co-tick-64');
  const tick128 = $('co-tick-128');
  const antiCheatInput = $('co-anticheat');
  const antiCheatVal = $('co-anticheat-val');
  const streamInput = $('co-stream');
  const streamVal = $('co-stream-val');
  const vodInput = $('co-vod');
  const vodVal = $('co-vod-val');
  const matchesInput = $('co-matches');
  const matchesVal = $('co-matches-val');
  const billingCycleToggle = $('co-billing-toggle');

  // Outputs
  const serverCostOut = $('co-out-server-cost');
  const antiCheatCostOut = $('co-out-anticheat-cost');
  const streamCostOut = $('co-out-stream-cost');
  const vodCostOut = $('co-out-vod-cost');
  const rawSubtotalOut = $('co-out-raw-subtotal');

  const tierBadge = $('co-tier-badge');
  const discountValOut = $('co-out-discount-val');
  const subsidyValOut = $('co-out-subsidy-val');
  const annualSavingsBadge = $('co-annual-savings-badge');
  const annualSavingsAmount = $('co-annual-savings-amount');

  const totalMonthlyOut = $('co-out-monthly-total');
  const totalAnnualOut = $('co-out-annual-total');
  const costPerMatchOut = $('co-out-cost-per-match');

  // Quote modal elements
  const quoteModal = $('co-quote-modal');
  const btnOpenQuote = $('co-btn-open-quote');
  const btnCloseQuote = $('co-btn-close-quote');
  const quoteDetailsPre = $('co-quote-json');
  const btnCopyQuote = $('co-btn-copy-quote');

  // Optimizer elements
  const targetBudgetInput = $('co-target-budget');
  const btnOptimize = $('co-btn-optimize');
  const optimizerResults = $('co-optimizer-results');
  const btnApplyOptimization = $('co-btn-apply-optimization');

  let currentOptimization = null;

  function getInputs() {
    return {
      servers: parseInt(serversInput?.value || '8', 10),
      tickRate: tick128?.checked ? 128 : 64,
      antiCheatNodes: parseInt(antiCheatInput?.value || '4', 10),
      streamRelayMbps: parseFloat(streamInput?.value || '1500'),
      vodStorageTB: parseFloat(vodInput?.value || '10'),
      estimatedMatches: parseFloat(matchesInput?.value || '2000'),
      billingCycle: billingCycleToggle?.checked ? 'annual' : 'monthly'
    };
  }

  function update() {
    const inputs = getInputs();
    if (serversVal) serversVal.textContent = String(inputs.servers);
    if (antiCheatVal) antiCheatVal.textContent = String(inputs.antiCheatNodes);
    if (streamVal) streamVal.textContent = `${inputs.streamRelayMbps.toLocaleString()} Mbps`;
    if (vodVal) vodVal.textContent = `${inputs.vodStorageTB} TB`;
    if (matchesVal) matchesVal.textContent = inputs.estimatedMatches.toLocaleString();

    const result = engine.calculatePricing(inputs);

    if (serverCostOut) serverCostOut.textContent = `$${result.breakdown.serverCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (antiCheatCostOut) antiCheatCostOut.textContent = `$${result.breakdown.antiCheatCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (streamCostOut) streamCostOut.textContent = `$${result.breakdown.streamCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (vodCostOut) vodCostOut.textContent = `$${result.breakdown.vodCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (rawSubtotalOut) rawSubtotalOut.textContent = `$${result.breakdown.rawTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    if (tierBadge) {
      tierBadge.textContent = result.tier.name.toUpperCase();
      tierBadge.setAttribute('data-tier-id', result.tier.id);
    }

    if (discountValOut) {
      discountValOut.textContent = result.tier.discountAmount > 0
        ? `-$${result.tier.discountAmount.toFixed(2)} (${Math.round(result.tier.discountRate * 100)}% Volume)`
        : '$0.00';
    }

    if (subsidyValOut) {
      subsidyValOut.textContent = result.tier.subsidyAmount > 0
        ? `-$${result.tier.subsidyAmount.toFixed(2)} (League Grant)`
        : '$0.00';
    }

    if (annualSavingsBadge) {
      if (inputs.billingCycle === 'annual') {
        annualSavingsBadge.style.display = 'inline-flex';
        if (annualSavingsAmount) annualSavingsAmount.textContent = `$${result.annualSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })} / mo`;
      } else {
        annualSavingsBadge.style.display = 'none';
      }
    }

    if (totalMonthlyOut) totalMonthlyOut.textContent = `$${result.monthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (totalAnnualOut) totalAnnualOut.textContent = `$${result.annualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    if (costPerMatchOut) costPerMatchOut.textContent = `$${result.costPerMatch.toFixed(4)}`;

    return result;
  }

  // Bind input listeners
  const controls = [serversInput, antiCheatInput, streamInput, vodInput, matchesInput, billingCycleToggle, tick64, tick128];
  controls.forEach(ctrl => {
    if (ctrl) {
      ctrl.addEventListener('input', update);
      ctrl.addEventListener('change', update);
    }
  });

  // Quote modal logic
  if (btnOpenQuote && quoteModal) {
    btnOpenQuote.addEventListener('click', () => {
      const quote = engine.generateQuote(getInputs());
      if (quoteDetailsPre) {
        quoteDetailsPre.textContent = JSON.stringify(quote, null, 2);
      }
      quoteModal.classList.add('active');
      quoteModal.setAttribute('aria-hidden', 'false');
    });
  }

  if (btnCloseQuote && quoteModal) {
    btnCloseQuote.addEventListener('click', () => {
      quoteModal.classList.remove('active');
      quoteModal.setAttribute('aria-hidden', 'true');
    });
  }

  if (quoteModal) {
    quoteModal.addEventListener('click', e => {
      if (e.target === quoteModal) {
        quoteModal.classList.remove('active');
        quoteModal.setAttribute('aria-hidden', 'true');
      }
    });
  }

  if (btnCopyQuote && quoteDetailsPre) {
    btnCopyQuote.addEventListener('click', async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(quoteDetailsPre.textContent);
          btnCopyQuote.textContent = 'Copied Quote!';
          setTimeout(() => { btnCopyQuote.textContent = 'Copy JSON Quote'; }, 2000);
        }
      } catch (err) {
        console.error('Failed to copy quote:', err);
      }
    });
  }

  // Budget optimization logic
  if (btnOptimize && targetBudgetInput && optimizerResults) {
    btnOptimize.addEventListener('click', () => {
      const budget = parseFloat(targetBudgetInput.value);
      if (!Number.isFinite(budget) || budget <= 0) {
        optimizerResults.innerHTML = '<p class="error-msg">Please enter a valid monthly budget amount (> $0).</p>';
        return;
      }

      const res = engine.optimizeAllocation(budget, {
        minServers: 2,
        minAntiCheat: 1,
        minStreamMbps: 500,
        minVodTB: 2,
        preferredTickRate: 128,
        billingCycle: billingCycleToggle?.checked ? 'annual' : 'monthly'
      });

      currentOptimization = res;

      if (!res.feasible) {
        optimizerResults.innerHTML = `
          <div class="opt-fail">
            <h4>Budget Threshold Unmet</h4>
            <p>Target budget: <strong>$${res.targetBudget.toFixed(2)}</strong></p>
            <p>Minimum required: <strong>$${res.requiredMinimumBudget.toFixed(2)}</strong> (Shortfall: $${res.shortfall.toFixed(2)})</p>
            <ul>${res.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        `;
        if (btnApplyOptimization) btnApplyOptimization.style.display = 'none';
      } else {
        optimizerResults.innerHTML = `
          <div class="opt-success">
            <h4>Recommended Esports Allocation</h4>
            <div class="opt-grid">
              <div><span>Servers:</span> <strong>${res.allocation.servers} (${res.allocation.tickRate}Hz)</strong></div>
              <div><span>Anti-Cheat:</span> <strong>${res.allocation.antiCheatNodes} Nodes</strong></div>
              <div><span>Stream:</span> <strong>${res.allocation.streamRelayMbps} Mbps</strong></div>
              <div><span>VOD Archive:</span> <strong>${res.allocation.vodStorageTB} TB</strong></div>
              <div><span>Allocated:</span> <strong>$${res.allocatedBudget.toFixed(2)} / mo</strong></div>
              <div><span>Buffer Remaining:</span> <strong>$${res.remainingBudget.toFixed(2)} / mo</strong></div>
            </div>
            <ul class="opt-recs">${res.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
          </div>
        `;
        if (btnApplyOptimization) btnApplyOptimization.style.display = 'inline-block';
      }
    });
  }

  if (btnApplyOptimization) {
    btnApplyOptimization.addEventListener('click', () => {
      if (!currentOptimization || !currentOptimization.feasible) return;
      const alloc = currentOptimization.allocation;
      if (serversInput) serversInput.value = alloc.servers;
      if (alloc.tickRate === 128 && tick128) tick128.checked = true;
      if (alloc.tickRate === 64 && tick64) tick64.checked = true;
      if (antiCheatInput) antiCheatInput.value = alloc.antiCheatNodes;
      if (streamInput) streamInput.value = alloc.streamRelayMbps;
      if (vodInput) vodInput.value = alloc.vodStorageTB;
      update();
    });
  }

  // Initial calculation
  update();

  return { engine, update, getInputs };
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountCostOptimizer());
  } else {
    mountCostOptimizer();
  }
}
