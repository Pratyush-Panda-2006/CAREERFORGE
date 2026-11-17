/**
 * PAWS & HAVEN // Animal Rescue & Foster Matching Network
 * Isolated Showcase Module for CAREERFORGE
 */


export function matchPetCompatibility(userLifestyle, petProfile) {
  let score = 0;
  if (userLifestyle.hasYard && petProfile.needsYard) score += 30;
  if (!userLifestyle.hasYard && !petProfile.needsYard) score += 30;
  if (userLifestyle.activityLevel === petProfile.energyLevel) score += 40;
  else score += 15;
  if (userLifestyle.hasKids && petProfile.goodWithKids) score += 30;
  return Math.min(100, score);
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