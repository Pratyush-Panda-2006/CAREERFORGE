/**
 * RenewableMicrogridEnergyOptimizer
 * Autonomous client-side renewable microgrid energy arbitrage and battery storage dispatch optimization engine.
 * Models multi-source renewable generation, load profiles, dynamic time-of-use tariffs,
 * and battery Depth-of-Discharge (DoD) lifecycle constraints.
 */

class RenewableMicrogridEnergyOptimizer {
  constructor(options = {}) {
    this.batteryCapacityKwh = options.batteryCapacityKwh || 100; // kWh
    this.initialSocPct = options.initialSocPct !== undefined ? options.initialSocPct : 50; // %
    this.minSocPct = options.minSocPct !== undefined ? options.minSocPct : 20; // 20% DoD lower boundary
    this.maxSocPct = options.maxSocPct !== undefined ? options.maxSocPct : 95; // 95% overcharge upper boundary
    this.maxChargePowerKw = options.maxChargePowerKw || 50; // kW
    this.maxDischargePowerKw = options.maxDischargePowerKw || 50; // kW
    this.chargeEfficiency = options.chargeEfficiency || 0.95;
    this.dischargeEfficiency = options.dischargeEfficiency || 0.95;
  }

  /**
   * Computes instantaneous power balance: (Solar + Wind) - Load
   * @param {number} solarKw
   * @param {number} windKw
   * @param {number} loadKw
   * @returns {{
   *   totalRenewableKw: number,
   *   netPowerKw: number,
   *   isSurplus: boolean
   * }}
   */
  calculateNetPowerBalance(solarKw = 0, windKw = 0, loadKw = 0) {
    const s = Math.max(0, Number(solarKw) || 0);
    const w = Math.max(0, Number(windKw) || 0);
    const l = Math.max(0, Number(loadKw) || 0);

    const totalRenewableKw = Number((s + w).toFixed(2));
    const netPowerKw = Number((totalRenewableKw - l).toFixed(2));

    return {
      totalRenewableKw,
      netPowerKw,
      isSurplus: netPowerKw >= 0
    };
  }

  /**
   * Optimizes single time-step battery dispatch and grid interaction
   * @param {number} netPowerKw - Net power (surplus > 0, deficit < 0)
   * @param {number} currentSocPct - Current battery state of charge (0 - 100%)
   * @param {number} tariffImportPerKwh - Cost to buy electricity from grid ($/kWh)
   * @param {number} tariffExportPerKwh - Credit to sell electricity to grid ($/kWh)
   * @param {number} dtHours - Time step duration in hours (default: 1 hour)
   * @returns {{
   *   newSocPct: number,
   *   batteryFlowKw: number, // positive = charging, negative = discharging
   *   gridImportKw: number,
   *   gridExportKw: number,
   *   netFinancialImpact: number, // negative = cost, positive = revenue
   *   batteryState: 'CHARGING'|'DISCHARGING'|'IDLE'
   * }}
   */
  optimizeBatteryDispatch(netPowerKw, currentSocPct, tariffImportPerKwh = 0.25, tariffExportPerKwh = 0.08, dtHours = 1) {
    let soc = Math.min(100, Math.max(0, Number(currentSocPct)));
    const usableCapacity = this.batteryCapacityKwh;
    let batteryFlowKw = 0;
    let gridImportKw = 0;
    let gridExportKw = 0;
    let state = 'IDLE';

    if (netPowerKw > 0) {
      // SURPLUS: Prioritize charging battery up to maxSocPct
      const currentEnergyKwh = (soc / 100) * usableCapacity;
      const maxEnergyKwh = (this.maxSocPct / 100) * usableCapacity;
      const energyRoomKwh = Math.max(0, maxEnergyKwh - currentEnergyKwh);
      const maxPossibleChargeKw = Math.min(this.maxChargePowerKw, energyRoomKwh / (dtHours * this.chargeEfficiency));

      const chargeKw = Math.min(netPowerKw, maxPossibleChargeKw);
      if (chargeKw > 0.001) {
        state = 'CHARGING';
        batteryFlowKw = chargeKw;
        const energyAddedKwh = chargeKw * dtHours * this.chargeEfficiency;
        soc = Math.min(this.maxSocPct, ((currentEnergyKwh + energyAddedKwh) / usableCapacity) * 100);
      }

      // Remaining surplus exported to grid
      const leftoverSurplus = netPowerKw - chargeKw;
      if (leftoverSurplus > 0.001) {
        gridExportKw = leftoverSurplus;
      }
    } else if (netPowerKw < 0) {
      // DEFICIT: Discharge battery down to minSocPct to avoid expensive grid imports
      const deficitKw = Math.abs(netPowerKw);
      const currentEnergyKwh = (soc / 100) * usableCapacity;
      const minEnergyKwh = (this.minSocPct / 100) * usableCapacity;
      const availableEnergyKwh = Math.max(0, currentEnergyKwh - minEnergyKwh);
      const maxPossibleDischargeKw = Math.min(this.maxDischargePowerKw, (availableEnergyKwh * this.dischargeEfficiency) / dtHours);

      const dischargeKw = Math.min(deficitKw, maxPossibleDischargeKw);
      if (dischargeKw > 0.001) {
        state = 'DISCHARGING';
        batteryFlowKw = -dischargeKw;
        const energyExtractedKwh = (dischargeKw * dtHours) / this.dischargeEfficiency;
        soc = Math.max(this.minSocPct, ((currentEnergyKwh - energyExtractedKwh) / usableCapacity) * 100);
      }

      // Remaining deficit imported from grid
      const leftoverDeficit = deficitKw - dischargeKw;
      if (leftoverDeficit > 0.001) {
        gridImportKw = leftoverDeficit;
      }
    }

    const exportRevenue = gridExportKw * dtHours * tariffExportPerKwh;
    const importCost = gridImportKw * dtHours * tariffImportPerKwh;
    const netFinancialImpact = Number((exportRevenue - importCost).toFixed(4));

    return {
      newSocPct: Number(soc.toFixed(2)),
      batteryFlowKw: Number(batteryFlowKw.toFixed(2)),
      gridImportKw: Number(gridImportKw.toFixed(2)),
      gridExportKw: Number(gridExportKw.toFixed(2)),
      netFinancialImpact,
      batteryState: state
    };
  }

  /**
   * Simulates full 24-hour sequential dispatch schedule
   * @param {Array<{hour: number, solarKw: number, windKw: number, loadKw: number, tariffImport: number, tariffExport: number}>} hourlyData
   * @returns {{
   *   trajectory: Array<Object>,
   *   totalSolarGenerationKwh: number,
   *   totalWindGenerationKwh: number,
   *   totalLoadConsumptionKwh: number,
   *   totalGridImportKwh: number,
   *   totalGridExportKwh: number,
   *   baselineCost: number,
   *   optimizedCost: number,
   *   netSavings: number,
   *   finalSocPct: number
   * }}
   */
  simulate24HourDispatch(hourlyData) {
    if (!hourlyData || !Array.isArray(hourlyData) || hourlyData.length === 0) {
      throw new Error('Invalid input: hourlyData must be a non-empty array');
    }

    let currentSoc = this.initialSocPct;
    const trajectory = [];
    let totalSolar = 0;
    let totalWind = 0;
    let totalLoad = 0;
    let totalImport = 0;
    let totalExport = 0;
    let baselineCost = 0;
    let optimizedCost = 0;

    for (const h of hourlyData) {
      const balance = this.calculateNetPowerBalance(h.solarKw, h.windKw, h.loadKw);
      const step = this.optimizeBatteryDispatch(balance.netPowerKw, currentSoc, h.tariffImport, h.tariffExport, 1);

      totalSolar += (h.solarKw || 0);
      totalWind += (h.windKw || 0);
      totalLoad += (h.loadKw || 0);
      totalImport += step.gridImportKw;
      totalExport += step.gridExportKw;

      // Baseline cost without battery: net deficit is 100% grid import, surplus is 100% export
      if (balance.netPowerKw < 0) {
        baselineCost += Math.abs(balance.netPowerKw) * (h.tariffImport || 0.25);
      } else {
        baselineCost -= balance.netPowerKw * (h.tariffExport || 0.08);
      }

      // Optimized cost with battery arbitrage
      if (step.netFinancialImpact < 0) {
        optimizedCost += Math.abs(step.netFinancialImpact);
      } else {
        optimizedCost -= step.netFinancialImpact;
      }

      currentSoc = step.newSocPct;
      trajectory.push({
        hour: h.hour,
        solarKw: h.solarKw,
        windKw: h.windKw,
        loadKw: h.loadKw,
        netPowerKw: balance.netPowerKw,
        socPct: step.newSocPct,
        batteryFlowKw: step.batteryFlowKw,
        gridImportKw: step.gridImportKw,
        gridExportKw: step.gridExportKw,
        batteryState: step.batteryState
      });
    }

    const netSavings = Math.max(0, baselineCost - optimizedCost);

    return {
      trajectory,
      totalSolarGenerationKwh: Number(totalSolar.toFixed(2)),
      totalWindGenerationKwh: Number(totalWind.toFixed(2)),
      totalLoadConsumptionKwh: Number(totalLoad.toFixed(2)),
      totalGridImportKwh: Number(totalImport.toFixed(2)),
      totalGridExportKwh: Number(totalExport.toFixed(2)),
      baselineCost: Number(baselineCost.toFixed(2)),
      optimizedCost: Number(optimizedCost.toFixed(2)),
      netSavings: Number(netSavings.toFixed(2)),
      finalSocPct: currentSoc
    };
  }

  /**
   * Generates realistic 24-hour baseline profile
   */
  generatePreset24HourProfile(scenario = 'sunny') {
    const hours = [];
    for (let h = 0; h < 24; h++) {
      // Solar bell-curve between 6:00 and 18:00
      let solar = 0;
      if (h >= 6 && h <= 18) {
        const peak = scenario === 'stormy' ? 25 : (scenario === 'sunny' ? 80 : 50);
        solar = peak * Math.sin(((h - 6) / 12) * Math.PI);
      }

      // Wind profile (higher at night and early morning)
      let windBase = scenario === 'stormy' ? 65 : 20;
      const wind = Math.max(5, windBase + 10 * Math.cos((h / 24) * 2 * Math.PI));

      // Load profile (dual peaks: 9:00 morning and 19:00 evening)
      let load = 35 + 25 * Math.sin(((h - 5) / 16) * Math.PI);
      if (scenario === 'heavy_load') load *= 1.4;
      load = Math.max(15, load);

      // Time of use tariff: Peak 14:00 - 20:00 ($0.38/kWh), Off-Peak ($0.15/kWh)
      const isPeak = h >= 14 && h <= 20;
      const tariffImport = isPeak ? 0.38 : 0.15;
      const tariffExport = isPeak ? 0.12 : 0.06;

      hours.push({
        hour: h,
        solarKw: Number(solar.toFixed(1)),
        windKw: Number(wind.toFixed(1)),
        loadKw: Number(load.toFixed(1)),
        tariffImport,
        tariffExport
      });
    }
    return hours;
  }

  /**
   * UI Workbench DOM Initializer
   */
  initUI(containerId = 'microgrid-optimizer-container') {
    const root = document.getElementById(containerId);
    if (!root) return;

    let activeScenario = 'sunny';

    const render = () => {
      const data = this.generatePreset24HourProfile(activeScenario);
      const res = this.simulate24HourDispatch(data);

      // Render Summary KPIs
      const genEl = document.getElementById('metric-total-gen');
      if (genEl) genEl.textContent = `${(res.totalSolarGenerationKwh + res.totalWindGenerationKwh).toFixed(1)} kWh`;

      const loadEl = document.getElementById('metric-total-load');
      if (loadEl) loadEl.textContent = `${res.totalLoadConsumptionKwh.toFixed(1)} kWh`;

      const gridEl = document.getElementById('metric-grid-import');
      if (gridEl) gridEl.textContent = `${res.totalGridImportKwh.toFixed(1)} kWh`;

      const savingsEl = document.getElementById('metric-net-savings');
      if (savingsEl) savingsEl.textContent = `$${res.netSavings.toFixed(2)}`;

      const socGauge = document.getElementById('battery-soc-gauge');
      const socText = document.getElementById('battery-soc-text');
      if (socGauge) socGauge.style.width = `${res.finalSocPct}%`;
      if (socText) socText.textContent = `${res.finalSocPct}% SoC`;

      // Render 24-Hour Dispatch Canvas
      const canvas = document.getElementById('dispatch-chart-canvas');
      if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const W = canvas.width;
        const H = canvas.height;
        ctx.fillStyle = '#080f1e';
        ctx.fillRect(0, 0, W, H);

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const chartW = W - margin.left - margin.right;
        const chartH = H - margin.top - margin.bottom;

        // Draw Zero Line
        const zeroY = margin.top + chartH / 2;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(margin.left, zeroY);
        ctx.lineTo(margin.left + chartW, zeroY);
        ctx.stroke();

        const stepX = chartW / 24;

        // Draw Generation Curve (Yellow/Amber)
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        res.trajectory.forEach((t, i) => {
          const gen = t.solarKw + t.windKw;
          const x = margin.left + (i * stepX);
          const y = zeroY - (gen * 1.2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Load Curve (Red/Rose)
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        res.trajectory.forEach((t, i) => {
          const x = margin.left + (i * stepX);
          const y = zeroY - (t.loadKw * 1.2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Battery SoC Curve (Emerald)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        res.trajectory.forEach((t, i) => {
          const x = margin.left + (i * stepX);
          const y = margin.top + chartH - (t.socPct / 100) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      // Render Hourly Breakdown Table
      const tableBody = document.getElementById('hourly-table-body');
      if (tableBody) {
        tableBody.innerHTML = res.trajectory.slice(0, 12).map(t => `
          <tr>
            <td>${t.hour.toString().padStart(2, '0')}:00</td>
            <td>${t.solarKw} kW</td>
            <td>${t.windKw} kW</td>
            <td>${t.loadKw} kW</td>
            <td class="${t.batteryState === 'CHARGING' ? 'state-charge' : (t.batteryState === 'DISCHARGING' ? 'state-discharge' : '')}">
              ${t.batteryFlowKw > 0 ? `+${t.batteryFlowKw}` : t.batteryFlowKw} kW (${t.batteryState})
            </td>
            <td><strong>${t.socPct}%</strong></td>
            <td>${t.gridImportKw > 0 ? `${t.gridImportKw} kW` : (t.gridExportKw > 0 ? `-${t.gridExportKw} kW (Exp)` : '0 kW')}</td>
          </tr>
        `).join('');
      }
    };

    const sel = document.getElementById('scenario-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        activeScenario = e.target.value;
        render();
      });
    }

    const retestBtn = document.getElementById('run-dispatch-btn');
    if (retestBtn) {
      retestBtn.addEventListener('click', () => {
        render();
      });
    }

    render();
  }
}

// Support dual export: ES Module and Browser Global
if (typeof window !== 'undefined') {
  window.RenewableMicrogridEnergyOptimizer = RenewableMicrogridEnergyOptimizer;
  window.addEventListener('DOMContentLoaded', () => {
    const autoRoot = document.getElementById('microgrid-optimizer-container');
    if (autoRoot) {
      const optimizer = new RenewableMicrogridEnergyOptimizer();
      optimizer.initUI();
    }
  });
}

export { RenewableMicrogridEnergyOptimizer };
