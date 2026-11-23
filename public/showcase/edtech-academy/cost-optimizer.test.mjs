import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyCostOptimizerEngine, EDTECH_TIERS } from './cost-optimizer.js';

test('EdtechAcademyCostOptimizerEngine - initializes with proper default values and currency USD', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();
  const quote = engine.calculatePricing();

  assert.equal(typeof quote, 'object');
  assert.equal(quote.billingFrequency, 'monthly');
  assert.equal(quote.currency, 'USD');
  assert.equal(quote.currencySymbol, '$');
  assert.equal(quote.annualDiscountRate, 0.20);
  assert.equal(quote.annualDiscountPercent, 20);
  assert.equal(quote.inputs.students, 500);
  assert.equal(quote.inputs.streams, 15);
  assert.equal(quote.inputs.storageTB, 5);
  assert.equal(quote.inputs.aiCredits, 10000);
  assert.equal(quote.inputs.proctoring, 250);
  assert.ok(quote.subtotal > 0);
  assert.ok(quote.totalCost > 0);
  assert.ok(quote.tier);
  assert.equal(quote.tier.id, 'departmental');
});

test('EdtechAcademyCostOptimizerEngine - tier determination across all four academic tiers', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // 1. Starter Cohort: <= 250 students, <= 10 streams, <= 2 TB, <= 5000 AI, <= 100 proctoring
  const starter = engine.determineTier({ students: 200, streams: 8, storageTB: 2, aiCredits: 3000, proctoring: 80 });
  assert.equal(starter.id, 'starter');
  assert.equal(starter.volumeDiscountRate, 0.0);
  assert.equal(starter.academicSubsidyRate, 0.05);

  // 2. Departmental Faculty: <= 1500 students, <= 50 streams, <= 10 TB, <= 30000 AI, <= 750 proctoring
  const dept = engine.determineTier({ students: 800, streams: 25, storageTB: 6, aiCredits: 15000, proctoring: 400 });
  assert.equal(dept.id, 'departmental');
  assert.equal(dept.volumeDiscountRate, 0.10);
  assert.equal(dept.academicSubsidyRate, 0.10);

  // 3. Campus-wide Institution: <= 10000 students, <= 200 streams, <= 50 TB, <= 150000 AI, <= 5000 proctoring
  const campus = engine.determineTier({ students: 5000, streams: 120, storageTB: 30, aiCredits: 80000, proctoring: 2500 });
  assert.equal(campus.id, 'campus');
  assert.equal(campus.volumeDiscountRate, 0.18);
  assert.equal(campus.academicSubsidyRate, 0.15);

  // 4. Multi-Campus University System: > 10000 students or other limits
  const multiCampus = engine.determineTier({ students: 18000, streams: 300, storageTB: 80, aiCredits: 250000, proctoring: 8000 });
  assert.equal(multiCampus.id, 'multiCampus');
  assert.equal(multiCampus.volumeDiscountRate, 0.25);
  assert.equal(multiCampus.academicSubsidyRate, 0.20);
});

test('EdtechAcademyCostOptimizerEngine - exact tier boundary threshold transitions', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Exact boundary of Starter
  const atStarterLimit = engine.determineTier({ students: 250, streams: 10, storageTB: 2, aiCredits: 5000, proctoring: 100 });
  assert.equal(atStarterLimit.id, 'starter');

  // Crossing by 1 student into Departmental
  const crossByStudent = engine.determineTier({ students: 251, streams: 10, storageTB: 2, aiCredits: 5000, proctoring: 100 });
  assert.equal(crossByStudent.id, 'departmental');

  // Crossing by 1 stream into Departmental
  const crossByStream = engine.determineTier({ students: 200, streams: 11, storageTB: 2, aiCredits: 5000, proctoring: 100 });
  assert.equal(crossByStream.id, 'departmental');

  // Crossing by storage into Campus
  const crossByStorage = engine.determineTier({ students: 500, streams: 20, storageTB: 11, aiCredits: 10000, proctoring: 200 });
  assert.equal(crossByStorage.id, 'campus');

  // Exact boundary of Departmental
  const atDeptLimit = engine.determineTier({ students: 1500, streams: 50, storageTB: 10, aiCredits: 30000, proctoring: 750 });
  assert.equal(atDeptLimit.id, 'departmental');

  // Crossing by 1 into Campus
  const crossDept = engine.determineTier({ students: 1501, streams: 50, storageTB: 10, aiCredits: 30000, proctoring: 750 });
  assert.equal(crossDept.id, 'campus');

  // Exact boundary of Campus
  const atCampusLimit = engine.determineTier({ students: 10000, streams: 200, storageTB: 50, aiCredits: 150000, proctoring: 5000 });
  assert.equal(atCampusLimit.id, 'campus');

  // Crossing into Multi-Campus
  const crossCampus = engine.determineTier({ students: 10001, streams: 200, storageTB: 50, aiCredits: 150000, proctoring: 5000 });
  assert.equal(crossCampus.id, 'multiCampus');
});

test('EdtechAcademyCostOptimizerEngine - exact monthly pricing arithmetic with volume & academic discounts', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Test Starter cohort:
  // students: 100 ($5.00) = 500
  // streams: 5 ($15.00) = 75
  // storageTB: 1 ($25.00) = 25
  // aiCredits: 2000 ($0.02) = 40
  // proctoring: 40 ($1.50) = 60
  // Monthly base: 500 + 75 + 25 + 40 + 60 = 700
  // Subtotal: 700
  // Volume discount (0%): 0
  // Academic subsidy (5% on 700): 35
  // Total cost: 700 - 35 = 665
  const quoteStarter = engine.calculatePricing({
    students: 100, streams: 5, storageTB: 1, aiCredits: 2000, proctoring: 40,
    billingFrequency: 'monthly', applyAcademicSubsidy: true
  });
  assert.equal(quoteStarter.tier.id, 'starter');
  assert.equal(quoteStarter.subtotal, 700);
  assert.equal(quoteStarter.volumeDiscountAmount, 0);
  assert.equal(quoteStarter.academicSubsidyAmount, 35);
  assert.equal(quoteStarter.annualDiscountAmount, 0);
  assert.equal(quoteStarter.totalCost, 665);
  assert.equal(quoteStarter.costPerStudentMonthly, 6.65);

  // Test Departmental faculty with 10% volume discount and 10% subsidy:
  // students: 1000 ($4.00) = 4000
  // streams: 20 ($12.00) = 240
  // storageTB: 5 ($20.00) = 100
  // aiCredits: 10000 ($0.015) = 150
  // proctoring: 300 ($1.20) = 360
  // Monthly base: 4000 + 240 + 100 + 150 + 360 = 4850
  // Subtotal: 4850
  // Volume discount (10% on 4850): 485
  // Remainder: 4850 - 485 = 4365
  // Academic subsidy (10% on 4365): 436.50
  // Total discount: 485 + 436.50 = 921.50
  // Total cost: 4850 - 921.50 = 3928.50
  const quoteDept = engine.calculatePricing({
    students: 1000, streams: 20, storageTB: 5, aiCredits: 10000, proctoring: 300,
    billingFrequency: 'monthly', applyAcademicSubsidy: true
  });
  assert.equal(quoteDept.tier.id, 'departmental');
  assert.equal(quoteDept.subtotal, 4850);
  assert.equal(quoteDept.volumeDiscountAmount, 485);
  assert.equal(quoteDept.academicSubsidyAmount, 436.50);
  assert.equal(quoteDept.totalDiscountAmount, 921.50);
  assert.equal(quoteDept.totalCost, 3928.50);
  assert.equal(quoteDept.costPerStudentMonthly, 3.93);
});

test('EdtechAcademyCostOptimizerEngine - academic subsidy toggle on and off', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  const inputs = { students: 1000, streams: 20, storageTB: 5, aiCredits: 10000, proctoring: 300, billingFrequency: 'monthly' };

  const withSubsidy = engine.calculatePricing({ ...inputs, applyAcademicSubsidy: true });
  assert.equal(withSubsidy.academicSubsidyAmount, 436.50);
  assert.equal(withSubsidy.totalCost, 3928.50);

  const withoutSubsidy = engine.calculatePricing({ ...inputs, applyAcademicSubsidy: false });
  assert.equal(withoutSubsidy.academicSubsidyAmount, 0);
  assert.equal(withoutSubsidy.volumeDiscountAmount, 485);
  assert.equal(withoutSubsidy.totalCost, 4850 - 485);
});

test('EdtechAcademyCostOptimizerEngine - annual academic year billing discount (20% off)', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Departmental: monthly subtotal 4850
  // Annual subtotal: 4850 * 12 = 58200
  // Volume discount 10%: 5820
  // Remainder: 58200 - 5820 = 52380
  // Academic subsidy 10%: 5238
  // Remainder: 52380 - 5238 = 47142
  // Annual discount 20% on 47142: 9428.40
  // Total discount: 5820 + 5238 + 9428.40 = 20486.40
  // Total cost: 58200 - 20486.40 = 37713.60
  // Monthly equivalent: 37713.60 / 12 = 3142.80
  const quoteAnnual = engine.calculatePricing({
    students: 1000, streams: 20, storageTB: 5, aiCredits: 10000, proctoring: 300,
    billingFrequency: 'annual', applyAcademicSubsidy: true
  });

  assert.equal(quoteAnnual.isAnnual, true);
  assert.equal(quoteAnnual.annualMultiplier, 12);
  assert.equal(quoteAnnual.subtotal, 58200);
  assert.equal(quoteAnnual.volumeDiscountAmount, 5820);
  assert.equal(quoteAnnual.academicSubsidyAmount, 5238);
  assert.equal(quoteAnnual.annualDiscountAmount, 9428.40);
  assert.equal(quoteAnnual.totalDiscountAmount, 20486.40);
  assert.equal(quoteAnnual.totalCost, 37713.60);
  assert.equal(quoteAnnual.monthlyEquivalentCost, 3142.80);
  assert.equal(quoteAnnual.costPerStudentMonthly, 3.14);
});

test('EdtechAcademyCostOptimizerEngine - applyVolumeDiscount method behavior and error handling', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Test by string id
  const dStarter = engine.applyVolumeDiscount('starter', 10000);
  assert.equal(dStarter.discountRate, 0.0);
  assert.equal(dStarter.discountAmount, 0);
  assert.equal(dStarter.netCost, 10000);

  const dDept = engine.applyVolumeDiscount('departmental', 10000);
  assert.equal(dDept.discountRate, 0.10);
  assert.equal(dDept.discountAmount, 1000);
  assert.equal(dDept.netCost, 9000);

  const dCampus = engine.applyVolumeDiscount('campus', 10000);
  assert.equal(dCampus.discountRate, 0.18);
  assert.equal(dCampus.discountAmount, 1800);
  assert.equal(dCampus.netCost, 8200);

  const dMulti = engine.applyVolumeDiscount('multiCampus', 10000);
  assert.equal(dMulti.discountRate, 0.25);
  assert.equal(dMulti.discountAmount, 2500);
  assert.equal(dMulti.netCost, 7500);

  // Test by tier object
  const dObj = engine.applyVolumeDiscount(EDTECH_TIERS.campus, 5000);
  assert.equal(dObj.discountAmount, 900);
  assert.equal(dObj.netCost, 4100);

  // Unknown tier should throw TypeError
  assert.throws(() => engine.applyVolumeDiscount('nonexistent', 1000), /Unknown volume tier/);
  assert.throws(() => engine.applyVolumeDiscount(null, 1000), /Tier must be/);
});

test('EdtechAcademyCostOptimizerEngine - generateQuote structure, immutability, and state tracking', () => {
  const engine = new EdtechAcademyCostOptimizerEngine({ students: 300, streams: 12 });
  const quote1 = engine.generateQuote();

  assert.equal(typeof quote1.quoteId, 'string');
  assert.ok(quote1.quoteId.startsWith('EDTECH-'));
  assert.ok(quote1.validUntil);
  assert.equal(quote1.inputs.students, 300);
  assert.equal(quote1.inputs.streams, 12);

  // Check required keys
  const expectedKeys = [
    'schemaVersion', 'tariffId', 'currency', 'currencySymbol',
    'billingFrequency', 'isAnnual', 'annualMultiplier', 'annualDiscountRate',
    'inputs', 'tier', 'rates', 'breakdown', 'subtotal', 'baseCost',
    'volumeDiscountAmount', 'academicSubsidyAmount', 'annualDiscountAmount',
    'totalDiscountAmount', 'discountAmount', 'totalCost', 'monthlyEquivalentCost',
    'costPerStudentMonthly', 'costPerStudentAnnual', 'quoteId', 'institutionName', 'validUntil'
  ];
  for (const key of expectedKeys) {
    assert.ok(key in quote1, `Missing expected key in quote: ${key}`);
  }

  // Mutating quote copy should not alter engine state
  quote1.totalCost = 0;
  const quote2 = engine.generateQuote();
  assert.notEqual(quote2.totalCost, 0);

  // Updating options
  const quote3 = engine.generateQuote({ students: 600, institutionName: 'Global Science Institute' });
  assert.equal(quote3.inputs.students, 600);
  assert.equal(quote3.institutionName, 'Global Science Institute');
});

test('EdtechAcademyCostOptimizerEngine - optimizeAllocation within budget bounds', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Test with realistic budget of $5,000 / month
  const targetBudget = 5000;
  const result = engine.optimizeAllocation(targetBudget, {
    students: 200, streams: 10, storageTB: 2, aiCredits: 5000, proctoring: 100
  });

  assert.equal(result.feasible, true);
  assert.equal(result.targetBudget, targetBudget);
  assert.ok(result.allocatedCost <= targetBudget);
  assert.ok(result.remainingBudget >= 0);
  assert.ok(result.allocation.students >= 200);
  assert.ok(result.costPerStudentMonthly > 0);
  assert.ok(result.quote);

  // Test with tight budget where baseline exceeds target budget
  const tightBudget = 200;
  const tightResult = engine.optimizeAllocation(tightBudget, {
    students: 500, streams: 20, storageTB: 5, aiCredits: 10000, proctoring: 250
  });

  assert.ok(tightResult.allocatedCost <= tightBudget);
  assert.ok(tightResult.allocation.students < 500);

  // Test with zero or negative budget
  const zeroResult = engine.optimizeAllocation(0);
  assert.equal(zeroResult.feasible, false);
  assert.equal(zeroResult.allocatedCost, 0);

  const negResult = engine.optimizeAllocation(-100);
  assert.equal(negResult.feasible, false);
  assert.equal(negResult.allocatedCost, 0);
});

test('EdtechAcademyCostOptimizerEngine - event emitter pattern (on, off, emit)', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();
  let calculateCalled = 0;
  let quoteCalled = 0;
  let optimizeCalled = 0;

  const unsubCalc = engine.on('calculate', () => { calculateCalled++; });
  const unsubQuote = engine.on('quote', () => { quoteCalled++; });
  const unsubOpt = engine.on('optimize', () => { optimizeCalled++; });

  engine.calculatePricing({ students: 100 });
  assert.equal(calculateCalled, 1);

  engine.generateQuote({ students: 150 });
  assert.equal(calculateCalled, 2);
  assert.equal(quoteCalled, 1);

  // Unsubscribe calculate before optimization
  unsubCalc();
  const countBeforeOpt = calculateCalled;

  engine.optimizeAllocation(3000);
  assert.equal(calculateCalled, countBeforeOpt);
  assert.equal(optimizeCalled, 1);

  // Direct off
  const dummyHandler = () => {};
  engine.on('custom', dummyHandler);
  engine.off('custom', dummyHandler);
  assert.equal(engine.emit('custom'), false);

  // Non-function handler should throw TypeError
  assert.throws(() => engine.on('test', null), /Event handler must be a function/);
});

test('EdtechAcademyCostOptimizerEngine - edge cases, zero and negative inputs handling', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // All zero inputs
  const zeroQuote = engine.calculatePricing({
    students: 0, streams: 0, storageTB: 0, aiCredits: 0, proctoring: 0
  });
  assert.equal(zeroQuote.subtotal, 0);
  assert.equal(zeroQuote.totalCost, 0);
  assert.equal(zeroQuote.costPerStudentMonthly, 0);
  assert.equal(zeroQuote.tier.id, 'starter');

  // Negative inputs sanitized safely to 0
  const negQuote = engine.calculatePricing({
    students: -50, streams: -5, storageTB: -2, aiCredits: -1000, proctoring: -20
  });
  assert.equal(negQuote.inputs.students, 0);
  assert.equal(negQuote.inputs.streams, 0);
  assert.equal(negQuote.inputs.storageTB, 0);
  assert.equal(negQuote.inputs.aiCredits, 0);
  assert.equal(negQuote.inputs.proctoring, 0);
  assert.equal(negQuote.totalCost, 0);

  // Non-numeric, null, undefined, boolean inputs
  const weirdQuote = engine.calculatePricing({
    students: 'invalid', streams: null, storageTB: undefined, aiCredits: true, proctoring: false
  });
  assert.equal(weirdQuote.inputs.students, 0);
  assert.equal(weirdQuote.inputs.streams, 0);
  assert.equal(weirdQuote.inputs.storageTB, 0);
  assert.equal(weirdQuote.inputs.aiCredits, 0);
  assert.equal(weirdQuote.inputs.proctoring, 0);
  assert.equal(weirdQuote.totalCost, 0);
});

test('EdtechAcademyCostOptimizerEngine - cost increases monotonically within each tier', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();

  // Test inside Starter tier
  const starterCounts = [10, 50, 100, 150, 200, 250];
  let prevStarterCost = -1;
  for (const students of starterCounts) {
    const quote = engine.calculatePricing({ students, streams: 5, storageTB: 1, aiCredits: 1000, proctoring: 20 });
    assert.equal(quote.tier.id, 'starter');
    assert.ok(quote.totalCost >= prevStarterCost, `Starter cost should be monotonic at ${students}`);
    prevStarterCost = quote.totalCost;
  }

  // Test inside Departmental tier
  const deptCounts = [300, 500, 800, 1000, 1200, 1500];
  let prevDeptCost = -1;
  for (const students of deptCounts) {
    const quote = engine.calculatePricing({ students, streams: 20, storageTB: 5, aiCredits: 10000, proctoring: 200 });
    assert.equal(quote.tier.id, 'departmental');
    assert.ok(quote.totalCost >= prevDeptCost, `Departmental cost should be monotonic at ${students}`);
    prevDeptCost = quote.totalCost;
  }

  // Test inside Campus-wide tier
  const campusCounts = [2000, 3500, 5000, 7500, 10000];
  let prevCampusCost = -1;
  for (const students of campusCounts) {
    const quote = engine.calculatePricing({ students, streams: 80, storageTB: 25, aiCredits: 50000, proctoring: 1000 });
    assert.equal(quote.tier.id, 'campus');
    assert.ok(quote.totalCost >= prevCampusCost, `Campus cost should be monotonic at ${students}`);
    prevCampusCost = quote.totalCost;
  }

  // Test inside Multi-Campus tier
  const multiCounts = [12000, 15000, 20000, 30000];
  let prevMultiCost = -1;
  for (const students of multiCounts) {
    const quote = engine.calculatePricing({ students, streams: 250, storageTB: 60, aiCredits: 180000, proctoring: 6000 });
    assert.equal(quote.tier.id, 'multiCampus');
    assert.ok(quote.totalCost >= prevMultiCost, `MultiCampus cost should be monotonic at ${students}`);
    prevMultiCost = quote.totalCost;
  }
});

test('EdtechAcademyCostOptimizerEngine - financial reconciliation across varied matrix inputs', () => {
  const engine = new EdtechAcademyCostOptimizerEngine();
  const testCases = [
    { students: 50, streams: 2, storageTB: 0.5, aiCredits: 500, proctoring: 10, billingFrequency: 'monthly', applyAcademicSubsidy: true },
    { students: 50, streams: 2, storageTB: 0.5, aiCredits: 500, proctoring: 10, billingFrequency: 'annual', applyAcademicSubsidy: true },
    { students: 500, streams: 15, storageTB: 5, aiCredits: 10000, proctoring: 250, billingFrequency: 'monthly', applyAcademicSubsidy: false },
    { students: 3000, streams: 60, storageTB: 20, aiCredits: 50000, proctoring: 1500, billingFrequency: 'annual', applyAcademicSubsidy: true },
    { students: 15000, streams: 250, storageTB: 60, aiCredits: 180000, proctoring: 6000, billingFrequency: 'monthly', applyAcademicSubsidy: true }
  ];

  for (const c of testCases) {
    const q = engine.calculatePricing(c);
    const expectedTotal = Math.max(0, Math.round((q.subtotal - q.totalDiscountAmount) * 100) / 100);
    assert.equal(q.totalCost, expectedTotal, `Total cost must equal subtotal - totalDiscountAmount for ${q.tier.id}`);
    assert.equal(q.totalDiscountAmount, Math.round((q.volumeDiscountAmount + q.academicSubsidyAmount + q.annualDiscountAmount) * 100) / 100);
  }
});

