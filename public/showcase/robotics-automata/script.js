/**
 * AUTOMATA // Robotic Arm Inverse Kinematics Simulator
 * Isolated Showcase Module for CAREERFORGE
 */


export function forwardKinematics(l1, l2, theta1Rad, theta2Rad) {
  const x = l1 * Math.cos(theta1Rad) + l2 * Math.cos(theta1Rad + theta2Rad);
  const y = l1 * Math.sin(theta1Rad) + l2 * Math.sin(theta1Rad + theta2Rad);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
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