import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GamingEsportsHubCostOptimizerEngine,
  DEFAULT_CONFIG,
  mountCostOptimizer
} from './cost-optimizer.js';

const near = (a, b, epsilon = 1e-4) => {
  assert(Math.abs(a - b) < epsilon, `Expected ${a} to be approximately ${b} (diff: ${Math.abs(a - b)})`);
};

test('GamingEsportsHubCostOptimizerEngine initializes with defaults and exposes config', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();
  assert.equal(engine.config.serverBaseCost, DEFAULT_CONFIG.serverBaseCost);
  assert.equal(engine.config.antiCheatNodeCost, DEFAULT_CONFIG.antiCheatNodeCost);
  assert.equal(engine.config.streamRelayCostPerMbps, DEFAULT_CONFIG.streamRelayCostPerMbps);
  assert.equal(engine.config.vodStorageCostPerTB, DEFAULT_CONFIG.vodStorageCostPerTB);
  assert.equal(engine.config.annualDiscountRate, DEFAULT_CONFIG.annualDiscountRate);
  assert.equal(engine.getTiers().length, 4);
});

test('Constructor accepts valid custom configuration and rejects invalid parameters', () => {
  const custom = new GamingEsportsHubCostOptimizerEngine({
    serverBaseCost: 50,
    annualDiscountRate: 0.15
  });
  assert.equal(custom.config.serverBaseCost, 50);
  assert.equal(custom.config.annualDiscountRate, 0.15);

  assert.throws(() => new GamingEsportsHubCostOptimizerEngine({ serverBaseCost: -10 }), RangeError);
  assert.throws(() => new GamingEsportsHubCostOptimizerEngine({ annualDiscountRate: 1.5 }), RangeError);
  assert.throws(() => new GamingEsportsHubCostOptimizerEngine({ antiCheatNodeCost: 'free' }), TypeError);
});

test('Event emitter pattern supports on, off, unsubscribe and emit', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();
  let received = null;
  let calls = 0;

  const unsubscribe = engine.on('testEvent', data => {
    received = data;
    calls++;
  });

  assert.throws(() => engine.on('testEvent', 'notAFunction'), TypeError);

  engine.emit('testEvent', { status: 'ready' });
  assert.equal(calls, 1);
  assert.deepEqual(received, { status: 'ready' });

  // Unsubscribe via returned function
  unsubscribe();
  engine.emit('testEvent', { status: 'ignored' });
  assert.equal(calls, 1);

  // Re-subscribe and unsubscribe via off()
  const handler = () => calls++;
  engine.on('testEvent2', handler);
  engine.emit('testEvent2');
  assert.equal(calls, 2);
  engine.off('testEvent2', handler);
  engine.emit('testEvent2');
  assert.equal(calls, 2);
});

test('getTierForSpend resolves accurate esports tiers across threshold boundaries', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  assert.equal(engine.getTierForSpend(0).id, 'indie');
  assert.equal(engine.getTierForSpend(499.99).id, 'indie');
  assert.equal(engine.getTierForSpend(500).id, 'challenger');
  assert.equal(engine.getTierForSpend(1999.99).id, 'challenger');
  assert.equal(engine.getTierForSpend(2000).id, 'pro');
  assert.equal(engine.getTierForSpend(4999.99).id, 'pro');
  assert.equal(engine.getTierForSpend(5000).id, 'global');
  assert.equal(engine.getTierForSpend(25000).id, 'global');

  assert.throws(() => engine.getTierForSpend(-1), RangeError);
});

test('applyVolumeDiscount computes percentage volume discounts and league subsidies correctly', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Indie: 0% discount, $0 subsidy
  const indie = engine.applyVolumeDiscount('indie', 300);
  assert.equal(indie.discountAmount, 0);
  assert.equal(indie.subsidyAmount, 0);
  assert.equal(indie.netCost, 300);

  // Challenger: 10% volume discount, $50 subsidy
  // Base 1000: discount = 100, remaining = 900, subsidy = 50, net = 850
  const challenger = engine.applyVolumeDiscount('challenger', 1000);
  assert.equal(challenger.discountAmount, 100);
  assert.equal(challenger.subsidyAmount, 50);
  assert.equal(challenger.netCost, 850);

  // Pro: 18% discount, $200 subsidy
  // Base 3000: discount = 540, remaining = 2460, subsidy = 200, net = 2260
  const pro = engine.applyVolumeDiscount('pro', 3000);
  assert.equal(pro.discountAmount, 540);
  assert.equal(pro.subsidyAmount, 200);
  assert.equal(pro.netCost, 2260);

  // Global: 25% discount, $500 subsidy
  // Base 10000: discount = 2500, remaining = 7500, subsidy = 500, net = 7000
  const global = engine.applyVolumeDiscount('global', 10000);
  assert.equal(global.discountAmount, 2500);
  assert.equal(global.subsidyAmount, 500);
  assert.equal(global.netCost, 7000);

  // Auto-resolution when tier is omitted
  const autoTier = engine.applyVolumeDiscount(null, 6000);
  assert.equal(autoTier.tier.id, 'global');

  // Subsidy capping when cost is lower than subsidy
  const customTier = { id: 'test', minSpend: 0, discountRate: 0, subsidy: 500 };
  const capped = engine.applyVolumeDiscount(customTier, 100);
  assert.equal(capped.subsidyAmount, 100);
  assert.equal(capped.netCost, 0);

  // Errors on invalid tiers
  assert.throws(() => engine.applyVolumeDiscount('non_existent_tier', 1000), Error);
  assert.throws(() => engine.applyVolumeDiscount(12345, 1000), TypeError);
});

test('calculatePricing computes precise component breakdowns and tick-rate multipliers', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Test 64Hz: 4 servers * 45 * 1.0 = 180
  // 2 anti-cheat * 85 = 170
  // 500 Mbps * 0.12 = 60
  // 5 TB * 18 = 90
  // rawTotal = 180 + 170 + 60 + 90 = 500 (Qualifies for Challenger Tier: 10% discount = 50, subsidy = 50 -> subtotal = 400)
  const res64 = engine.calculatePricing({
    servers: 4,
    tickRate: 64,
    antiCheatNodes: 2,
    streamRelayMbps: 500,
    vodStorageTB: 5,
    billingCycle: 'monthly',
    estimatedMatches: 1000
  });

  assert.equal(res64.breakdown.serverCost, 180);
  assert.equal(res64.breakdown.antiCheatCost, 170);
  assert.equal(res64.breakdown.streamCost, 60);
  assert.equal(res64.breakdown.vodCost, 90);
  assert.equal(res64.breakdown.rawTotal, 500);
  assert.equal(res64.tier.id, 'challenger');
  assert.equal(res64.tier.discountAmount, 50);
  assert.equal(res64.tier.subsidyAmount, 50);
  assert.equal(res64.subtotal, 400);
  assert.equal(res64.monthlyTotal, 400);
  assert.equal(res64.annualTotal, 4800);
  assert.equal(res64.costPerMatch, 0.4);

  // Test 128Hz: 4 servers * 45 * 1.65 = 297
  // rawTotal = 297 + 170 + 60 + 90 = 617
  // Challenger: discount 10% = 61.70, subsidy = 50, net = 505.30
  const res128 = engine.calculatePricing({
    servers: 4,
    tickRate: 128,
    antiCheatNodes: 2,
    streamRelayMbps: 500,
    vodStorageTB: 5,
    billingCycle: 'monthly'
  });

  assert.equal(res128.breakdown.serverCost, 297);
  assert.equal(res128.breakdown.rawTotal, 617);
  assert.equal(res128.tier.discountAmount, 61.7);
  assert.equal(res128.tier.subsidyAmount, 50);
  assert.equal(res128.subtotal, 505.3);
});

test('calculatePricing correctly applies annual season league discount (20% off)', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  const monthlyRes = engine.calculatePricing({
    servers: 8,
    tickRate: 128,
    antiCheatNodes: 4,
    streamRelayMbps: 1000,
    vodStorageTB: 10,
    billingCycle: 'monthly'
  });

  const annualRes = engine.calculatePricing({
    servers: 8,
    tickRate: 128,
    antiCheatNodes: 4,
    streamRelayMbps: 1000,
    vodStorageTB: 10,
    billingCycle: 'annual'
  });

  assert.equal(monthlyRes.subtotal, annualRes.subtotal);
  assert.equal(monthlyRes.annualSavings, 0);

  // 20% discount on subtotal
  const expectedSavings = Number((monthlyRes.subtotal * 0.20).toFixed(2));
  assert.equal(annualRes.annualSavings, expectedSavings);
  assert.equal(annualRes.monthlyTotal, Number((monthlyRes.subtotal - expectedSavings).toFixed(2)));
  assert.equal(annualRes.annualTotal, Number((annualRes.monthlyTotal * 12).toFixed(2)));
  assert(annualRes.costPerMatch < monthlyRes.costPerMatch);
});

test('Per-match cost handles zero matches and default auto-estimation', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Zero matches should return 0 rather than NaN or Infinity
  const zeroMatches = engine.calculatePricing({
    servers: 2,
    estimatedMatches: 0
  });
  assert.equal(zeroMatches.costPerMatch, 0);

  // Auto estimation defaults to servers * estimatedMatchesPerServerMonth (4 * 250 = 1000)
  const defaultMatches = engine.calculatePricing({
    servers: 4
  });
  assert.equal(defaultMatches.estimatedMatches, 1000);
  assert(defaultMatches.costPerMatch > 0);
});

test('generateQuote emits event and returns itemized commercial specification', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();
  let emittedQuote = null;
  engine.on('quoteGenerated', q => { emittedQuote = q; });

  const quote = engine.generateQuote({
    organization: 'Apex Predators League',
    servers: 16,
    tickRate: 128,
    antiCheatNodes: 6,
    streamRelayMbps: 2500,
    vodStorageTB: 20,
    billingCycle: 'annual'
  });

  assert.equal(quote, emittedQuote);
  assert.equal(quote.organization, 'Apex Predators League');
  assert(quote.quoteId.startsWith('VORTEX-QUOTE-'));
  assert.equal(quote.currency, 'USD');
  assert(quote.slaGuarantee.includes('99.99%'));
  assert.equal(quote.specifications.length, 4);

  const serverSpec = quote.specifications.find(s => s.item === 'Dedicated Matchmaking Servers');
  assert.equal(serverSpec.quantity, 16);
  assert(serverSpec.specs.includes('128Hz'));

  // Validity period: ~30 days
  const now = Date.now();
  const validUntilTime = new Date(quote.validUntil).getTime();
  assert(validUntilTime > now + 29 * 24 * 60 * 60 * 1000);
});

test('optimizeAllocation maximizes resources within budget and handles infeasible minimums', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Infeasible budget test: $100/mo is too small for baseline requirements
  const infeasible = engine.optimizeAllocation(100, {
    minServers: 4,
    minAntiCheat: 2,
    minStreamMbps: 500,
    minVodTB: 5,
    billingCycle: 'annual'
  });

  assert.equal(infeasible.feasible, false);
  assert.equal(infeasible.allocation, null);
  assert(infeasible.shortfall > 0);
  assert(infeasible.recommendations.length > 0);

  // Feasible budget test: $2,500/mo
  const feasible = engine.optimizeAllocation(2500, {
    minServers: 4,
    minAntiCheat: 2,
    minStreamMbps: 1000,
    minVodTB: 10,
    preferredTickRate: 128,
    billingCycle: 'annual'
  });

  assert.equal(feasible.feasible, true);
  assert(feasible.allocatedBudget <= 2500);
  assert(feasible.remainingBudget >= 0);
  assert(feasible.allocation.servers >= 4);
  assert.equal(feasible.allocation.tickRate, 128);
  assert(feasible.recommendations.length >= 3);
});

test('Edge cases: zero inputs, large scale, and robust validation checks', () => {
  const engine = new GamingEsportsHubCostOptimizerEngine();

  // Zero resources: all valid, zero cost
  const zeroRes = engine.calculatePricing({
    servers: 0,
    tickRate: 64,
    antiCheatNodes: 0,
    streamRelayMbps: 0,
    vodStorageTB: 0,
    estimatedMatches: 0
  });

  assert.equal(zeroRes.breakdown.rawTotal, 0);
  assert.equal(zeroRes.monthlyTotal, 0);
  assert.equal(zeroRes.annualTotal, 0);
  assert.equal(zeroRes.costPerMatch, 0);

  // Large esports scale: 200 servers, 50 anti-cheat nodes, 50,000 Mbps, 500 TB VOD
  const megaRes = engine.calculatePricing({
    servers: 200,
    tickRate: 128,
    antiCheatNodes: 50,
    streamRelayMbps: 50000,
    vodStorageTB: 500,
    billingCycle: 'annual'
  });

  assert.equal(megaRes.tier.id, 'global');
  assert(megaRes.monthlyTotal > 10000);
  assert(megaRes.annualSavings > 2000);

  // Negative inputs must throw RangeError
  assert.throws(() => engine.calculatePricing({ servers: -1 }), RangeError);
  assert.throws(() => engine.calculatePricing({ antiCheatNodes: -5 }), RangeError);
  assert.throws(() => engine.calculatePricing({ streamRelayMbps: -100 }), RangeError);
  assert.throws(() => engine.calculatePricing({ vodStorageTB: -2 }), RangeError);
  assert.throws(() => engine.calculatePricing({ estimatedMatches: -10 }), RangeError);

  // Invalid types must throw TypeError
  assert.throws(() => engine.calculatePricing({ servers: 'four' }), TypeError);
  assert.throws(() => engine.calculatePricing({ antiCheatNodes: NaN }), TypeError);
  assert.throws(() => engine.calculatePricing({ servers: 2.5 }), TypeError); // Servers must be an integer

  // Invalid tick rate
  assert.throws(() => engine.calculatePricing({ tickRate: 30 }), RangeError);
  assert.throws(() => engine.calculatePricing({ tickRate: 240 }), RangeError);

  // Invalid billing cycle
  assert.throws(() => engine.calculatePricing({ billingCycle: 'weekly' }), Error);

  // optimizeAllocation validation
  assert.throws(() => engine.optimizeAllocation(0), RangeError);
  assert.throws(() => engine.optimizeAllocation(-500), RangeError);
  assert.throws(() => engine.optimizeAllocation('cheap'), TypeError);
});

test('mountCostOptimizer handles missing root or mounts mock DOM cleanly', () => {
  assert.equal(mountCostOptimizer(null), null);

  const listeners = new Map();
  const makeElem = (val = '', checked = false) => ({
    value: val,
    checked,
    textContent: '',
    style: {},
    setAttribute: () => {},
    classList: { add: () => {}, remove: () => {} },
    addEventListener(evt, fn) {
      if (!listeners.has(evt)) listeners.set(evt, []);
      listeners.get(evt).push(fn);
    }
  });

  const mockRoot = {
    querySelector: (sel) => {
      if (sel.includes('co-servers')) return makeElem('10');
      if (sel.includes('co-tick-128')) return makeElem('128', true);
      if (sel.includes('co-tick-64')) return makeElem('64', false);
      if (sel.includes('co-anticheat')) return makeElem('3');
      if (sel.includes('co-stream')) return makeElem('1200');
      if (sel.includes('co-vod')) return makeElem('8');
      if (sel.includes('co-matches')) return makeElem('1500');
      if (sel.includes('co-billing-toggle')) return makeElem('', true);
      return makeElem('0');
    }
  };

  const mounted = mountCostOptimizer(mockRoot);
  assert(mounted !== null);
  assert.equal(typeof mounted.update, 'function');
  const res = mounted.update();
  assert.equal(res.inputs.servers, 10);
  assert.equal(res.inputs.tickRate, 128);
  assert.equal(res.billingCycle, 'annual');
});

