document.addEventListener('DOMContentLoaded', () => {
  console.log('CloudPulse SaaS Launchpad initialized');

  initTestimonialsCarousel();
  initRoiCalculator();
  initFaqAccordion();
  initBillingToggle();
  initIntegrationFilters();
});

function initFaqAccordion() {
  const items = document.querySelectorAll('.faq-section .faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const shouldOpen = question.getAttribute('aria-expanded') !== 'true';
      items.forEach(current => {
        const button = current.querySelector('.faq-question');
        const answer = current.querySelector('.faq-answer');
        if (!button || !answer) return;
        const open = current === item && shouldOpen;
        current.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        answer.setAttribute('aria-hidden', String(!open));
        answer.toggleAttribute('inert', !open);
      });
    });
  });
}

/* ==========================================================
   Customer Testimonials Carousel Module
   ========================================================== */
function initTestimonialsCarousel() {
  const track = document.getElementById('testimonialsTrack');
  const slides = document.querySelectorAll('.testimonial-slide');
  const prevBtn = document.getElementById('prevTestimonialBtn');
  const nextBtn = document.getElementById('nextTestimonialBtn');
  const indicators = document.querySelectorAll('.indicator-dot');
  const counter = document.getElementById('slideCounter');
  const autoRotateToggle = document.getElementById('autoRotateToggle');
  const toggleIcon = document.getElementById('toggleIcon');
  const toggleLabel = document.getElementById('toggleLabel');
  const timerProgressFill = document.getElementById('timerProgressFill');
  const viewport = document.getElementById('testimonialsViewport');
  const carouselWrapper = document.querySelector('.testimonial-carousel-wrapper');

  if (!track || slides.length === 0) return;

  const totalSlides = slides.length;
  let currentIndex = 0;
  const ROTATION_INTERVAL_MS = 5000;
  const PROGRESS_TICK_MS = 50;
  let elapsedMs = 0;
  let isAutoplayActive = true;
  let isHovered = false;
  let timerInterval = null;

  // Format counter (e.g., 01 / 05)
  function updateCounter() {
    if (counter) {
      const currentFormatted = String(currentIndex + 1).padStart(2, '0');
      const totalFormatted = String(totalSlides).padStart(2, '0');
      counter.textContent = `${currentFormatted} / ${totalFormatted}`;
    }
  }

  // Update Slide Position and Active States
  function updateSlider(animate = true) {
    if (!animate) {
      track.style.transition = 'none';
    } else {
      track.style.transition = 'transform 0.55s cubic-bezier(0.33, 1, 0.68, 1)';
    }

    track.style.transform = `translateX(-${currentIndex * 100}%)`;

    slides.forEach((slide, idx) => {
      const isActive = idx === currentIndex;
      slide.classList.toggle('active', isActive);
      slide.setAttribute('aria-hidden', !isActive);
      if (isActive) {
        slide.removeAttribute('inert');
      } else {
        slide.setAttribute('inert', '');
      }
    });

    indicators.forEach((dot, idx) => {
      const isActive = idx === currentIndex;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    updateCounter();
    resetProgressBar();
  }

  // Go to specific slide
  function goToSlide(index) {
    currentIndex = (index + totalSlides) % totalSlides;
    updateSlider();
  }

  // Next / Prev functions
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // Reset Progress Bar
  function resetProgressBar() {
    elapsedMs = 0;
    if (timerProgressFill) {
      timerProgressFill.style.width = '0%';
    }
  }

  // Timer Tick Function for 5s Auto-rotation
  function startAutoplayTimer() {
    stopAutoplayTimer();
    timerInterval = setInterval(() => {
      if (!isAutoplayActive || isHovered) {
        return;
      }

      elapsedMs += PROGRESS_TICK_MS;
      const progressPercent = Math.min((elapsedMs / ROTATION_INTERVAL_MS) * 100, 100);

      if (timerProgressFill) {
        timerProgressFill.style.width = `${progressPercent}%`;
      }

      if (elapsedMs >= ROTATION_INTERVAL_MS) {
        nextSlide();
      }
    }, PROGRESS_TICK_MS);
  }

  function stopAutoplayTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Toggle Autoplay State
  function toggleAutoplay() {
    isAutoplayActive = !isAutoplayActive;
    if (isAutoplayActive) {
      if (toggleIcon) toggleIcon.textContent = '⏸';
      if (toggleLabel) toggleLabel.textContent = 'Auto-rotate (5s)';
      autoRotateToggle.setAttribute('aria-label', 'Pause 5-second auto-rotation');
      resetProgressBar();
      startAutoplayTimer();
    } else {
      if (toggleIcon) toggleIcon.textContent = '▶';
      if (toggleLabel) toggleLabel.textContent = 'Paused';
      autoRotateToggle.setAttribute('aria-label', 'Resume 5-second auto-rotation');
      if (timerProgressFill) timerProgressFill.style.width = '0%';
    }
  }

  // Event Listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
    });
  }

  indicators.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      goToSlide(idx);
    });
  });

  if (autoRotateToggle) {
    autoRotateToggle.addEventListener('click', toggleAutoplay);
  }

  // Pause on hover / pointerenter, resume on pointerleave
  if (carouselWrapper) {
    carouselWrapper.addEventListener('mouseenter', () => {
      isHovered = true;
    });

    carouselWrapper.addEventListener('mouseleave', () => {
      isHovered = false;
    });
  }

  // Keyboard navigation when user is focused on or interacting with carousel
  document.addEventListener('keydown', (e) => {
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  });

  // Touch Swipe Support for Mobile Screens
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 50;

  if (viewport) {
    viewport.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      isHovered = true;
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      isHovered = false;
      handleSwipe();
    }, { passive: true });
  }

  function handleSwipe() {
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
  }

  // Initial State Setup
  updateSlider(false);
  startAutoplayTimer();
}

/* ==========================================================
   Interactive ROI Value Calculator Module
   ========================================================== */
function initRoiCalculator() {
  const teamSizeSlider = document.getElementById('team-size-slider');
  const teamSizeVal = document.getElementById('team-size-val');
  const hourlyRateInput = document.getElementById('hourly-rate-input');
  const hourlyRateVal = document.getElementById('hourly-rate-val');

  const annualSavingsEl = document.getElementById('annual-savings');
  const hoursSavedEl = document.getElementById('hours-saved');
  const monthlySavingsEl = document.getElementById('monthly-savings');
  const roiMultiplierEl = document.getElementById('roi-multiplier');
  const devWeeksSavedEl = document.getElementById('dev-weeks-saved');

  const presetBtns = document.querySelectorAll('.preset-btn');
  const bookDemoBtn = document.getElementById('book-demo-btn');
  const roiModal = document.getElementById('roi-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const demoForm = document.getElementById('demo-form');
  const modalSuccess = document.getElementById('modal-success');

  if (!teamSizeSlider || !hourlyRateInput) return;

  // Animated numbers tracking state
  let currentMetrics = {
    annualSavings: 0,
    hoursSaved: 0,
    monthlySavings: 0,
    devWeeks: 0,
    roi: 0
  };

  let animationFrameId = null;

  function calculateTargetMetrics(teamSize, hourlyRate) {
    // 4 hours per week saved per engineer across 50 working weeks = 200 hrs/dev/yr
    const annualHoursPerDev = 200;
    const hoursSaved = teamSize * annualHoursPerDev;
    const annualSavings = hoursSaved * hourlyRate;
    const monthlySavings = Math.round(annualSavings / 12);
    const devWeeks = Math.round(hoursSaved / 40);

    // SaaS investment ratio: assumed standard CloudPulse seat of ~$99/dev/mo (~$1,188/dev/yr)
    const annualSaasCost = Math.max(teamSize * 1188, 1);
    const roi = parseFloat((annualSavings / annualSaasCost).toFixed(1));

    return {
      annualSavings,
      hoursSaved,
      monthlySavings,
      devWeeks,
      roi
    };
  }

  function formatCurrency(num) {
    return '$' + Math.round(num).toLocaleString('en-US');
  }

  function formatNumber(num) {
    return Math.round(num).toLocaleString('en-US');
  }

  function animateMetrics(targetMetrics, duration = 300) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    const startMetrics = { ...currentMetrics };
    const startTime = performance.now();

    function updateFrame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quadratic
      const ease = progress * (2 - progress);

      currentMetrics.annualSavings = startMetrics.annualSavings + (targetMetrics.annualSavings - startMetrics.annualSavings) * ease;
      currentMetrics.hoursSaved = startMetrics.hoursSaved + (targetMetrics.hoursSaved - startMetrics.hoursSaved) * ease;
      currentMetrics.monthlySavings = startMetrics.monthlySavings + (targetMetrics.monthlySavings - startMetrics.monthlySavings) * ease;
      currentMetrics.devWeeks = startMetrics.devWeeks + (targetMetrics.devWeeks - startMetrics.devWeeks) * ease;
      currentMetrics.roi = startMetrics.roi + (targetMetrics.roi - startMetrics.roi) * ease;

      // Render to DOM
      if (annualSavingsEl) annualSavingsEl.textContent = formatCurrency(currentMetrics.annualSavings);
      if (hoursSavedEl) hoursSavedEl.textContent = formatNumber(currentMetrics.hoursSaved);
      if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(currentMetrics.monthlySavings);
      if (devWeeksSavedEl) devWeeksSavedEl.textContent = `${formatNumber(currentMetrics.devWeeks)} wks`;
      if (roiMultiplierEl) roiMultiplierEl.textContent = `${currentMetrics.roi.toFixed(1)}x`;

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateFrame);
      } else {
        currentMetrics = { ...targetMetrics };
      }
    }

    animationFrameId = requestAnimationFrame(updateFrame);
  }

  function updateCalculator(animate = true) {
    const teamSize = parseInt(teamSizeSlider.value, 10) || 50;
    const hourlyRate = Math.max(parseFloat(hourlyRateInput.value) || 85, 1);

    if (teamSizeVal) teamSizeVal.textContent = `${teamSize} Devs`;
    if (hourlyRateVal) hourlyRateVal.textContent = `$${Math.round(hourlyRate)} / hr`;

    // Highlight matching preset
    presetBtns.forEach(btn => {
      const presetSize = parseInt(btn.dataset.size, 10);
      btn.classList.toggle('active', presetSize === teamSize);
    });

    const targets = calculateTargetMetrics(teamSize, hourlyRate);
    if (animate) {
      animateMetrics(targets);
    } else {
      currentMetrics = { ...targets };
      if (annualSavingsEl) annualSavingsEl.textContent = formatCurrency(targets.annualSavings);
      if (hoursSavedEl) hoursSavedEl.textContent = formatNumber(targets.hoursSaved);
      if (monthlySavingsEl) monthlySavingsEl.textContent = formatCurrency(targets.monthlySavings);
      if (devWeeksSavedEl) devWeeksSavedEl.textContent = `${formatNumber(targets.devWeeks)} wks`;
      if (roiMultiplierEl) roiMultiplierEl.textContent = `${targets.roi.toFixed(1)}x`;
    }
  }

  // Event Listeners for Controls
  if (teamSizeSlider) {
    teamSizeSlider.addEventListener('input', () => updateCalculator(true));
  }

  if (hourlyRateInput) {
    hourlyRateInput.addEventListener('input', () => updateCalculator(true));
  }

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.size;
      if (teamSizeSlider) {
        teamSizeSlider.value = size;
        updateCalculator(true);
      }
    });
  });

  // Modal logic
  function openModal() {
    const teamSize = parseInt(teamSizeSlider.value, 10) || 50;
    const hourlyRate = Math.round(parseFloat(hourlyRateInput.value) || 85);
    const targets = calculateTargetMetrics(teamSize, hourlyRate);

    const mTeam = document.getElementById('modal-team-size');
    const mRate = document.getElementById('modal-hourly-rate');
    const mAnnual = document.getElementById('modal-annual-savings');
    const mHours = document.getElementById('modal-hours-saved');
    const mRoi = document.getElementById('modal-roi');

    if (mTeam) mTeam.textContent = `${teamSize} Developers`;
    if (mRate) mRate.textContent = `$${hourlyRate} / hr`;
    if (mAnnual) mAnnual.textContent = formatCurrency(targets.annualSavings);
    if (mHours) mHours.textContent = `${formatNumber(targets.hoursSaved)} hrs / yr`;
    if (mRoi) mRoi.textContent = `${targets.roi.toFixed(1)}x`;

    if (modalSuccess) modalSuccess.style.display = 'none';
    if (demoForm) demoForm.style.display = 'flex';

    if (roiModal) roiModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (roiModal) roiModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (bookDemoBtn) {
    bookDemoBtn.addEventListener('click', openModal);
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', closeModal);
  }

  if (roiModal) {
    roiModal.addEventListener('click', (e) => {
      if (e.target === roiModal) closeModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && roiModal && roiModal.style.display === 'flex') {
      closeModal();
    }
  });

  if (demoForm) {
    demoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('demo-email-input');
      if (emailInput && emailInput.value) {
        demoForm.style.display = 'none';
        if (modalSuccess) modalSuccess.style.display = 'block';
      }
    });
  }

  // Initial render (without animation delay)
  updateCalculator(false);
  console.log('CloudPulse SaaS Launchpad ROI Calculator ready');
}

/* Subscription Billing Toggle Module*/
function initBillingToggle() {
  const toggle = document.getElementById('billing-toggle');
  const monthlyLabel = document.getElementById('monthly-label');
  const annualLabel = document.getElementById('annual-label');
  const billingNote = document.getElementById('billing-note');
  const prices = document.querySelectorAll('.price-amount');
  const billingLabels = document.querySelectorAll('.plan-billing');

  if (!toggle || prices.length === 0) return;

  function updateBilling(isAnnual) {
    toggle.setAttribute('aria-checked', String(isAnnual));
    toggle.setAttribute(
      'aria-label',
      isAnnual ? 'Switch to monthly billing' : 'Switch to annual billing'
    );

    monthlyLabel?.classList.toggle('active', !isAnnual);
    annualLabel?.classList.toggle('active', isAnnual);

    prices.forEach(price => {
      const amount = Number(
        isAnnual ? price.dataset.annual : price.dataset.monthly
      );

      if (!Number.isFinite(amount)) return;

      price.textContent = `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
    });

    billingLabels.forEach(label => {
      label.textContent = isAnnual
        ? 'Billed annually'
        : 'Billed monthly';
    });

    if (billingNote) {
      billingNote.textContent = isAnnual
        ? 'Annual billing selected — save 20% compared with monthly billing.'
        : 'Billed monthly. Switch to annual to save 20%.';
    }
  }

  toggle.addEventListener('click', () => {
    const isAnnual = toggle.getAttribute('aria-checked') !== 'true';
    updateBilling(isAnnual);
  });

  updateBilling(false);
}

function initIntegrationFilters() {
  const search = document.getElementById('integration-search');
  const list = document.getElementById('integration-list');
  const count = document.getElementById('integration-count');
  const empty = document.getElementById('integration-empty');
  if (!search || !list || !count || !empty) return;
  const cards = Array.from(list.querySelectorAll('[data-integration-name]'));
  const buttons = document.querySelectorAll('button[data-integration-category]');
  let category = 'all';
  function update() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const name = card.dataset.integrationName;
      const group = card.dataset.integrationCategory;
      const matches = (category === 'all' || category === group) &&
        `${name} ${group}`.toLocaleLowerCase().includes(query);
      card.hidden = !matches;
      if (matches) visible++;
    });
    count.textContent = `${visible} ${visible === 1 ? 'integration' : 'integrations'}`;
    empty.hidden = visible !== 0;
  }
  search.disabled = false;
  search.addEventListener('input', update);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') { search.value = ''; update(); }
  });
  buttons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      category = button.dataset.integrationCategory;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      update();
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.defaultPrevented) return;
    const target = event.target;
    if (target instanceof Element && (target.closest('input, textarea, select') || target.isContentEditable)) return;
    event.preventDefault();
    search.focus();
  });
  update();
}

/* ==========================================================
   Customer Onboarding Checklist
   ========================================================== */
document.addEventListener('DOMContentLoaded', initOnboardingChecklist);

function initOnboardingChecklist() {
  const list = document.getElementById('onb-list');
  const countEl = document.getElementById('onb-count');
  const percentEl = document.getElementById('onb-percent');
  const progress = document.getElementById('onb-progress');
  const fill = document.getElementById('onb-progress-fill');
  const banner = document.getElementById('onb-celebrate');
  const resetBtn = document.getElementById('onb-reset');
  const status = document.getElementById('onb-status');
  const canvas = document.getElementById('onb-confetti');
  if (!list || !countEl || !percentEl || !progress || !fill || !banner || !resetBtn || !status) return;

  const STORAGE_KEY = 'cloudpulse-onboarding-steps';
  const steps = Array.from(list.querySelectorAll('.onb-step'));
  const total = steps.length;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (err) {
      return [];
    }
  }

  function save() {
    try {
      const done = steps.filter(s => s.querySelector('.onb-check').checked).map(s => s.dataset.step);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch (err) {
      /* storage can be blocked, the checklist still works for this visit */
    }
  }

  function render(announce) {
    const done = steps.filter(s => s.querySelector('.onb-check').checked).length;
    const pct = Math.round((done / total) * 100);
    const complete = done === total;
    const nextStep = steps.find(s => !s.querySelector('.onb-check').checked);

    steps.forEach(step => {
      const checked = step.querySelector('.onb-check').checked;
      const badge = step.querySelector('.onb-badge');
      step.classList.toggle('is-done', checked);
      step.classList.toggle('is-next', step === nextStep);
      badge.textContent = checked ? 'Done' : (step === nextStep ? 'Up next' : '');
    });

    const summary = `${done} of ${total} steps complete`;
    countEl.textContent = summary;
    percentEl.textContent = `${pct}%`;
    fill.style.width = `${pct}%`;
    progress.setAttribute('aria-valuenow', String(pct));
    progress.setAttribute('aria-valuetext', summary);
    progress.classList.toggle('is-complete', complete);
    percentEl.classList.toggle('is-complete', complete);
    banner.hidden = !complete;
    resetBtn.disabled = done === 0;

    if (announce) status.textContent = `${announce} ${summary}, ${pct} percent.${complete ? ' All set, your team is live.' : ''}`;
    return complete;
  }

  /* Confetti: a short canvas burst, skipped when the visitor prefers reduced motion. */
  let confettiFrame = 0;
  function launchConfetti() {
    if (!canvas || motionQuery.matches || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cancelAnimationFrame(confettiFrame);

    const colors = ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f3f4f6'];
    const originY = Math.min(height * 0.45, height - 120);
    const pieces = Array.from({ length: 140 }, () => {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 1.6;
      const speed = 7 + Math.random() * 9;
      return {
        x: width / 2,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)]
      };
    });
    canvas.classList.add('is-active');
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, Math.min(1, (3200 - elapsed) / 800));
      pieces.forEach(p => {
        p.vy += 0.28;
        p.vx *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      });
      if (elapsed < 3200) {
        confettiFrame = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
        canvas.classList.remove('is-active');
      }
    }
    confettiFrame = requestAnimationFrame(frame);
  }

  function stopConfetti() {
    cancelAnimationFrame(confettiFrame);
    if (canvas) canvas.classList.remove('is-active');
  }

  // Restore progress from the last visit (no confetti on load).
  const saved = readSaved();
  steps.forEach(step => {
    step.querySelector('.onb-check').checked = saved.includes(step.dataset.step);
  });
  render('');
  status.textContent = '';

  list.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.classList.contains('onb-check')) return;
    const title = document.getElementById(input.getAttribute('aria-labelledby')).textContent.trim();
    const complete = render(`${title} marked ${input.checked ? 'complete' : 'not complete'}.`);
    save();
    if (complete && input.checked) launchConfetti();
    else stopConfetti();
  });

  resetBtn.addEventListener('click', () => {
    steps.forEach(step => { step.querySelector('.onb-check').checked = false; });
    stopConfetti();
    render('Checklist reset.');
    save();
    steps[0].querySelector('.onb-check').focus();
  });
}
