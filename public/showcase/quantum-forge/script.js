/**
 * QUANTUM FORGE // Quantum Circuit & Qubit State Simulator
 * Isolated Showcase Module for CAREERFORGE
 */


export function applyHadamard(qubitState) {
  // Input: [alpha, beta], Output: 1/sqrt(2) * [alpha + beta, alpha - beta]
  const invSqrt2 = 1 / Math.SQRT2;
  return [
    invSqrt2 * (qubitState[0] + qubitState[1]),
    invSqrt2 * (qubitState[0] - qubitState[1])
  ];
}

export function measureProbabilities(state) {
  const p0 = Math.pow(state[0], 2);
  const p1 = Math.pow(state[1], 2);
  return { p0: Number(p0.toFixed(4)), p1: Number(p1.toFixed(4)) };
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