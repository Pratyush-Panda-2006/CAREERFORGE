// Shared rule for the cart's shipping charge and the progress banner.
(function (root) {
  const THRESHOLD = 150;

  function calculate(subtotal, couponCode) {
    const amount = Math.max(0, Number(subtotal) || 0);
    const couponUnlocked = amount > 0 && couponCode === 'FREESHIP';
    const thresholdUnlocked = amount >= THRESHOLD;
    return {
      unlocked: couponUnlocked || thresholdUnlocked,
      couponUnlocked,
      remaining: Math.max(0, THRESHOLD - amount),
      percent: couponUnlocked ? 100 : Math.min(100, Math.round(amount / THRESHOLD * 100))
    };
  }

  root.ShippingProgress = { THRESHOLD, calculate };
})(typeof window !== 'undefined' ? window : globalThis);
