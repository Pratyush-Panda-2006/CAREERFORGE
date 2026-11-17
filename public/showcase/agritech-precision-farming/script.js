/**
 * TERRA-AGRI // Precision Agriculture & Drone Crop Telemetry
 * Isolated Showcase Module for CAREERFORGE
 */


export function calculateNDVI(nirBand, redBand) {
  // NDVI = (NIR - Red) / (NIR + Red)
  const sum = nirBand + redBand;
  if (sum === 0) return 0;
  return Number(((nirBand - redBand) / sum).toFixed(3));
}

export function evaluateCropVigor(ndvi) {
  if (ndvi > 0.6) return 'EXCELLENT_VIGOR';
  if (ndvi > 0.3) return 'MODERATE_HEALTH';
  if (ndvi > 0.1) return 'STRESSED_NEEDS_WATER';
  return 'BARREN_OR_DAMAGED';
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