/**
 * FREIGHT-FLOW // Global Maritime & Air Logistics Corridor
 * Isolated Showcase Module for CAREERFORGE
 */


export function estimateVoyageDurationHours(distanceNauticalMiles, cruiseSpeedKnots, portWaitHours = 12) {
  const sailingHours = distanceNauticalMiles / cruiseSpeedKnots;
  return Number((sailingHours + portWaitHours).toFixed(1));
}

export function calculateCarbonEmissionsTons(fuelConsumedTons) {
  // Heavy fuel oil produces approx 3.114 metric tons of CO2 per ton of fuel
  return Number((fuelConsumedTons * 3.114).toFixed(2));
}
    

// Client-side UI Interactions
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('run-calc-btn');
    const outputEl = document.getElementById('calc-output');
    const inputEl = document.getElementById('main-input');

    if (calcBtn && outputEl) {
      calcBtn.addEventListener('click', () => {
        const val = inputEl ? inputEl.value : '';
        outputEl.textContent = `[Telemetry Ready] Processed parameter input: "${val || 'Default Execution'}" at ${new Date().toISOString()}`;
      });
    }

    // Metric animation ticker
    const metricEl = document.getElementById('live-metric-val');
    if (metricEl) {
      let tick = 0;
      setInterval(() => {
        tick++;
        const base = parseFloat(metricEl.getAttribute('data-base') || '100');
        const jitter = (Math.sin(tick) * 2.5).toFixed(1);
        metricEl.textContent = (base + parseFloat(jitter)).toFixed(1);
      }, 2500);
    }
  });
}