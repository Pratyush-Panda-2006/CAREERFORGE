(function initImpactCounters() {
  const section = document.querySelector('.impact-metrics');
  if (!section || typeof IntersectionObserver === 'undefined') return;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const counters = Array.from(section.querySelectorAll('[data-impact-target]'));
  const format = (value, counter) => {
    const suffix = counter.dataset.suffix ?? '+';
    if (counter.dataset.compact === 'million' && value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M' + suffix;
    }
    return Math.round(value).toLocaleString('en-US') + suffix;
  };

  counters.forEach((counter) => { counter.textContent = format(0, counter); });
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    const startedAt = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / 1400);
      const eased = 1 - (1 - progress) ** 3;
      counters.forEach((counter) => {
        counter.textContent = format(Number(counter.dataset.impactTarget) * eased, counter);
      });
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, { threshold: 0.3 });
  observer.observe(section);
})();
