import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProRoiEngine } from './roi-calculator.js';

test('calculates weekly, monthly, and annual savings from team assumptions', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  const result = engine.calculateAnnualSavings({
    teamSize: 12,
    hoursSaved: 4,
    hourlyCost: 35
  });

  assert.deepEqual(result, {
    teamSize: 12,
    hoursSaved: 4,
    hourlyCost: 35,
    weeklySavings: 1680,
    monthlySavings: 7280,
    annualSavings: 87360
  });
});

test('handles fractional hours without rounding away savings', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  const result = engine.calculateAnnualSavings({
    teamSize: 3,
    hoursSaved: 1.5,
    hourlyCost: 20
  });

  assert.equal(result.weeklySavings, 90);
  assert.equal(result.annualSavings, 4680);
});

test('normalizes negative and non-finite input values to zero', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  const result = engine.calculateAnnualSavings({
    teamSize: -2,
    hoursSaved: Number.NaN,
    hourlyCost: Infinity
  });

  assert.equal(result.annualSavings, 0);
  assert.equal(result.monthlySavings, 0);
});

test('calculates break-even months using the latest savings projection', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  engine.calculateAnnualSavings({ teamSize: 12, hoursSaved: 4, hourlyCost: 35 });

  assert.equal(engine.computeBreakEvenMonths(5000), 0.7);
  assert.equal(engine.computeBreakEvenMonths(0), 0);
});

test('returns null when a positive investment cannot be recovered', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  engine.calculateAnnualSavings({ teamSize: 10, hoursSaved: 0, hourlyCost: 50 });

  assert.equal(engine.computeBreakEvenMonths(1000), null);
});

test('returns null for a positive investment before a savings projection exists', () => {
  const engine = new FitnessCrossfitProRoiEngine();
  assert.equal(engine.computeBreakEvenMonths(1000), null);
});

test('formats currency and safely handles non-finite amounts', () => {
  const engine = new FitnessCrossfitProRoiEngine();

  assert.equal(engine.formatCurrency(87360), '$87,360');
  assert.equal(engine.formatCurrency(0), '$0');
  assert.equal(engine.formatCurrency(Number.NaN), '$0');
});
