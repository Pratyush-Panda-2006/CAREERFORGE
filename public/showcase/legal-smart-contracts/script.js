/**
 * LEX-ESCROW // Smart Legal Contract Clause & Escrow Machine
 * Isolated Showcase Module for CAREERFORGE
 */


export function calculateEscrowRelease(milestones) {
  const total = milestones.length;
  if (total === 0) return { percentComplete: 0, unlockedAmount: 0 };
  const completed = milestones.filter(m => m.approved);
  const unlocked = completed.reduce((sum, m) => sum + m.amount, 0);
  const percent = Math.round((completed.length / total) * 100);
  return { percentComplete: percent, unlockedAmount: unlocked };
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