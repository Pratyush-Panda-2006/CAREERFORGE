import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FitnessCrossfitProRoiEngine } from './roi-calculator.js';

describe('FitnessCrossfitProRoiEngine', () => {
  it('calculates gross annual savings and efficiency metrics accurately', () => {
    const engine = new FitnessCrossfitProRoiEngine();
    const res = engine.calculateAnnualSavings({ teamSize: 5, hoursSavedPerWeek: 2, hourlyRate: 50 });
    // 5 * 2 = 10 hrs/wk * 52 = 520 hrs/yr * 50 = $26,000
    assert.equal(res.annualHoursSaved, 520);
    assert.equal(res.grossAnnualSavings, 26000);
    assert.equal(res.efficiencyGainPercent, 5);
  });

  it('computes break-even investment return timelines in months', () => {
    const engine = new FitnessCrossfitProRoiEngine();
    const months = engine.computeBreakEvenMonths(12000, 2000);
    assert.equal(months, 6.0);
  });

  it('formats currency values cleanly with 2 decimal precision', () => {
    const engine = new FitnessCrossfitProRoiEngine();
    assert.equal(engine.formatCurrency(1500), '$1,500.00');
    assert.equal(engine.formatCurrency(0), '$0.00');
  });
});
