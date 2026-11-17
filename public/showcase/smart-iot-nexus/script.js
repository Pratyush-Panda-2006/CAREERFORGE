/**
 * NEXUS-IOT // Industrial IoT Sensor Matrix & Telemetry Stream
 * Isolated Showcase Module for CAREERFORGE
 */


export function evaluateSensorAlert(reading, minThreshold, maxThreshold) {
  if (reading < minThreshold) return { alert: true, level: 'CRITICAL_LOW', delta: minThreshold - reading };
  if (reading > maxThreshold) return { alert: true, level: 'CRITICAL_HIGH', delta: reading - maxThreshold };
  return { alert: false, level: 'NOMINAL', delta: 0 };
}

export function calculateMovingAverage(windowArray, newSample) {
  const updated = [...windowArray, newSample];
  if (updated.length > 10) updated.shift();
  const sum = updated.reduce((a, b) => a + b, 0);
  return { window: updated, average: Number((sum / updated.length).toFixed(2)) };
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