/**
 * MICRO-IMPACT // Global Peer-to-Peer Microfinance Network
 * Isolated Showcase Module for CAREERFORGE
 */


export function calculateMonthlyRepayment(principal, annualRatePercent, months) {
  const r = annualRatePercent / 1200;
  if (r === 0) return Number((principal / months).toFixed(2));
  const pmt = (principal * r) / (1 - Math.pow(1 + r, -months));
  return Number(pmt.toFixed(2));
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