/**
 * ORBITER-X // Orbital Mission Control & Telemetry Hub
 * Isolated Showcase Module for CAREERFORGE
 */


export function calculateOrbitalPeriod(altitudeKm) {
  const G = 6.67430e-11;
  const M = 5.972e24;
  const R = 6371e3;
  const r = R + (altitudeKm * 1000);
  const T = 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / (G * M));
  return Math.round(T / 60); // minutes
}

export function calculateOrbitalVelocity(altitudeKm) {
  const G = 6.67430e-11;
  const M = 5.972e24;
  const R = 6371e3;
  const r = R + (altitudeKm * 1000);
  const v = Math.sqrt((G * M) / r);
  return (v / 1000).toFixed(2); // km/s
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