/**
 * YIELD MATRIX // Decentralized Liquidity & APY Optimizer
 * Isolated Showcase Module for CAREERFORGE
 */


export function calculateImpermanentLoss(priceRatio) {
  // IL = 2 * sqrt(k) / (1 + k) - 1
  const il = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
  return Number((Math.abs(il) * 100).toFixed(2));
}

export function calculateCompoundedYield(principal, apyPercent, days) {
  const rate = apyPercent / 100;
  const time = days / 365;
  const amount = principal * Math.pow(1 + rate / 365, 365 * time);
  return Number(amount.toFixed(2));
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