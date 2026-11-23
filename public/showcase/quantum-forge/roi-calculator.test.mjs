import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeRoiEngine } from './roi-calculator.js';

describe('QuantumForgeRoiEngine', () => {
  it('calculates gross annual savings and efficiency metrics accurately', () => {
    const engine = new QuantumForgeRoiEngine();
    const res = engine.calculateAnnualSavings({ teamSize: 5, hoursSavedPerWeek: 2, hourlyRate: 50 });
    assert.equal(res.annualHoursSaved, 520);
    assert.equal(res.grossAnnualSavings, 26000);
    assert.equal(res.efficiencyGainPercent, 5);
  });

  it('computes break-even investment return timelines in months', () => {
    const engine = new QuantumForgeRoiEngine();
    const months = engine.computeBreakEvenMonths(12000, 2000);
    assert.equal(months, 6.0);
  });

  it('formats currency values cleanly with 2 decimal precision', () => {
    const engine = new QuantumForgeRoiEngine();
    assert.equal(engine.formatCurrency(1500), '$1,500.00');
    assert.equal(engine.formatCurrency(0), '$0.00');
  });
});
