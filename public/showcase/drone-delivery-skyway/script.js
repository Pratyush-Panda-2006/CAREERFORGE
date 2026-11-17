/**
 * SKYWAY-EXPRESS // Autonomous Urban Drone Dispatch & Air Corridor
 * Isolated Showcase Module for CAREERFORGE
 */


export function checkDispatchClearance(windSpeedKnots, packageWeightKg, maxWind = 25, maxWeight = 5.0) {
  const windOk = windSpeedKnots <= maxWind;
  const weightOk = packageWeightKg <= maxWeight;
  return {
    cleared: windOk && weightOk,
    reasons: [
      ...(windOk ? [] : ['Wind exceeds safe limits']),
      ...(weightOk ? [] : ['Package payload exceeds drone capacity'])
    ]
  };
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