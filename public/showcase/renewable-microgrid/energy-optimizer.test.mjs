import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridEnergyOptimizer } from './energy-optimizer.js';

describe('RenewableMicrogridEnergyOptimizer', () => {
  it('instantiates with realistic microgrid battery and boundary parameters', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer();
    assert.equal(optimizer.batteryCapacityKwh, 100);
    assert.equal(optimizer.minSocPct, 20); // 20% DoD safety limit
    assert.equal(optimizer.maxSocPct, 95); // 95% overcharge ceiling
    assert.equal(optimizer.maxChargePowerKw, 50);
    assert.equal(optimizer.maxDischargePowerKw, 50);
  });

  it('calculates instantaneous net power balance correctly', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer();

    // Generation exceeds load: surplus
    const surplus = optimizer.calculateNetPowerBalance(60, 25, 40); // 85 - 40 = +45 kW
    assert.equal(surplus.totalRenewableKw, 85);
    assert.equal(surplus.netPowerKw, 45);
    assert.equal(surplus.isSurplus, true);

    // Load exceeds generation: deficit
    const deficit = optimizer.calculateNetPowerBalance(10, 5, 50); // 15 - 50 = -35 kW
    assert.equal(deficit.totalRenewableKw, 15);
    assert.equal(deficit.netPowerKw, -35);
    assert.equal(deficit.isSurplus, false);
  });

  it('charges battery with generation surplus and clamps strictly to maxSocPct', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer({
      batteryCapacityKwh: 100,
      maxSocPct: 95
    });

    // Start at 90% SoC (90 kWh). Capacity ceiling is 95 kWh (room = 5 kWh).
    // Surplus is 30 kW for 1 hour.
    const step = optimizer.optimizeBatteryDispatch(30, 90, 0.25, 0.08, 1);
    assert.equal(step.batteryState, 'CHARGING');
    assert.ok(step.newSocPct <= 95);
    // Overflow surplus is exported to grid
    assert.ok(step.gridExportKw > 0);
  });

  it('discharges battery during deficit and clamps strictly to minSocPct', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer({
      batteryCapacityKwh: 100,
      minSocPct: 20
    });

    // Start at 23% SoC (23 kWh). Minimum floor is 20 kWh (room = 3 kWh).
    // Deficit is 40 kW for 1 hour.
    const step = optimizer.optimizeBatteryDispatch(-40, 23, 0.30, 0.10, 1);
    assert.equal(step.batteryState, 'DISCHARGING');
    assert.ok(step.newSocPct >= 20);
    // Remaining deficit is imported from grid
    assert.ok(step.gridImportKw > 0);
  });

  it('computes financial arbitrage correctly based on dynamic peak/off-peak tariffs', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer();

    // Exporting 10 kWh during peak tariff ($0.15/kWh credit)
    const exportStep = optimizer.optimizeBatteryDispatch(10, 95, 0.35, 0.15, 1);
    assert.equal(exportStep.gridExportKw, 10);
    assert.equal(exportStep.netFinancialImpact, 1.50); // +$1.50 revenue

    // Importing 10 kWh during peak tariff ($0.35/kWh cost)
    const importStep = optimizer.optimizeBatteryDispatch(-10, 20, 0.35, 0.15, 1);
    assert.equal(importStep.gridImportKw, 10);
    assert.equal(importStep.netFinancialImpact, -3.50); // -$3.50 cost
  });

  it('runs complete 24-hour sequential simulation with economic savings vs baseline', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer({ initialSocPct: 50 });
    const hourlyData = optimizer.generatePreset24HourProfile('sunny');
    assert.equal(hourlyData.length, 24);

    const result = optimizer.simulate24HourDispatch(hourlyData);
    assert.equal(result.trajectory.length, 24);
    assert.ok(result.totalSolarGenerationKwh > 0);
    assert.ok(result.totalWindGenerationKwh > 0);
    assert.ok(result.totalLoadConsumptionKwh > 0);
    // Optimized battery dispatch must reduce net costs compared to unbuffered baseline
    assert.ok(result.optimizedCost < result.baselineCost);
    assert.ok(result.netSavings > 0);
  });

  it('handles empty inputs and invalid arguments safely', () => {
    const optimizer = new RenewableMicrogridEnergyOptimizer();
    assert.throws(() => optimizer.simulate24HourDispatch([]), /Invalid input/);
    assert.throws(() => optimizer.simulate24HourDispatch(null), /Invalid input/);

    const zeroBalance = optimizer.calculateNetPowerBalance(0, 0, 0);
    assert.equal(zeroBalance.netPowerKw, 0);
    assert.equal(zeroBalance.isSurplus, true);
  });
});
