/**
 * Nonprofit Impact - Animated Milestone & Impact Metric Counter
 */

export class MilestoneCounter {
  constructor(targetValue = 50000, durationMs = 2000) {
    this.targetValue = targetValue;
    this.durationMs = durationMs;
    this.currentValue = 0;
  }

  calculateValueAtProgress(progressRatio) {
    const clamped = Math.max(0, Math.min(1, progressRatio));
    // Ease-out cubic formula
    const easeOut = 1 - Math.pow(1 - clamped, 3);
    return Math.round(this.targetValue * easeOut);
  }

  formatNumber(val = this.targetValue) {
    return new Intl.NumberFormat('en-US').format(val);
  }

  getMilestoneMessage() {
    return `Over ${this.formatNumber()} trees planted worldwide!`;
  }
}
