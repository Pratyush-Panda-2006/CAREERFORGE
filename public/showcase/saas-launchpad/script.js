document.addEventListener('DOMContentLoaded', () => {
  console.log('CloudPulse SaaS Launchpad initialized');

  initTestimonialsCarousel();
  initRoiCalculator();
  initFaqAccordion();
  initBillingToggle();
  initIntegrationFilters();
  initSystemStatus();
  initTelemetryAnomalyDetector();
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
    } catch {
      return [];
    }
  }

  function save() {
    try {
      const done = steps.filter(s => s.querySelector('.onb-check').checked).map(s => s.dataset.step);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
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

/* ===== BEGIN Issue #303: Product Feature Tour Modal with Step-by-Step Navigation Carousel ===== */
(function () {
  'use strict';

  let currentSlide = 0;
  const TOTAL_SLIDES = 4;

  function initTourModal() {
    const openBtn = document.getElementById('openTourBtn');
    const modal = document.getElementById('tourModal');
    const backdrop = document.getElementById('tourBackdrop');
    const closeBtn = document.getElementById('tourCloseBtn');
    const prevBtn = document.getElementById('tourPrevBtn');
    const nextBtn = document.getElementById('tourNextBtn');
    const track = document.getElementById('tourSlidesTrack');
    const dots = document.querySelectorAll('.step-dot');

    if (!modal) return;

    function goToSlide(index) {
      if (index < 0) index = 0;
      if (index >= TOTAL_SLIDES) index = TOTAL_SLIDES - 1;
      currentSlide = index;

      if (track) {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
      }

      // Update dots
      dots.forEach((dot, idx) => {
        const isActive = idx === currentSlide;
        dot.classList.toggle('active', isActive);
        dot.setAttribute('aria-selected', String(isActive));
      });

      // Update buttons
      if (prevBtn) {
        prevBtn.disabled = currentSlide === 0;
      }
      if (nextBtn) {
        nextBtn.textContent = currentSlide === TOTAL_SLIDES - 1 ? 'Finish Tour ✓' : 'Next →';
      }
    }

    function openModal() {
      goToSlide(0);
      modal.classList.add('open');
      if (backdrop) backdrop.classList.add('open');
      modal.focus();
    }

    function closeModal() {
      modal.classList.remove('open');
      if (backdrop) backdrop.classList.remove('open');
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        goToSlide(currentSlide - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentSlide === TOTAL_SLIDES - 1) {
          closeModal();
        } else {
          goToSlide(currentSlide + 1);
        }
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        goToSlide(idx);
      });
    });

    // Arrow keys & Escape
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('open')) return;

      if (e.key === 'ArrowRight') {
        goToSlide(currentSlide + 1);
      } else if (e.key === 'ArrowLeft') {
        goToSlide(currentSlide - 1);
      } else if (e.key === 'Escape') {
        closeModal();
      }
    });

    window.openTourModal = openModal;
    window.closeTourModal = closeModal;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTourModal);
  } else {
    initTourModal();
  }
})();
/* ===== END Issue #303 ===== */


/* ===== BEGIN Issue #359: Live System Observability Log Stream Simulator ===== */
(function initLiveLogStreamSimulator() {
  const section = document.getElementById('live-log-stream-section');
  if (!section) return;

  // Stream Configuration & State
  let isStreaming = true;
  let streamIntervalMs = 500; // 2 logs/sec default
  let timerId = null;
  let totalLogsCount = 0;
  const MAX_BUFFER_LINES = 200;
  const logsBuffer = []; // stores { id, timestamp, level, service, message, rawText }

  let activeLevelFilter = 'ALL';
  let activeRegex = null;
  let regexInputStr = '';

  // DOM Elements
  const linesContainer = document.getElementById('terminalLinesContainer');
  const viewport = document.getElementById('terminalViewport');
  const toggleBtn = document.getElementById('toggleStreamBtn');
  const toggleIcon = document.getElementById('toggleStreamIcon');
  const toggleText = document.getElementById('toggleStreamText');
  const speedButtons = section.querySelectorAll('.speed-btn');
  const clearBtn = document.getElementById('clearTerminalBtn');
  const sevPills = section.querySelectorAll('.sev-pill');
  const regexInput = document.getElementById('regexSearchInput');
  const regexStatusPill = document.getElementById('regexStatusPill');
  const autoScrollCheckbox = document.getElementById('autoScrollLockCheckbox');

  // Telemetry Elements
  const streamStatusVal = document.getElementById('streamStatusVal');
  const totalLogsCounter = document.getElementById('totalLogsCounter');
  const errorRateVal = document.getElementById('errorRateVal');
  const bufferCapacityVal = document.getElementById('bufferCapacityVal');
  const anomalySpikeAlert = document.getElementById('anomalySpikeAlert');
  const anomalySpikeText = document.getElementById('anomalySpikeText');
  const dismissAlertBtn = document.getElementById('dismissAlertBtn');
  const footerMatchesCount = document.getElementById('footerMatchesCount');

  // Microservices & Log Templates
  const _SERVICES = [
    'api-gateway',
    'auth-service',
    'payment-processor',
    'model-orchestrator',
    'vector-indexer',
    'cache-cluster'
  ];

  const LOG_TEMPLATES = [
    // INFO
    { level: 'INFO', service: 'api-gateway', template: (trace) => `GET /v2/models HTTP/1.1 200 OK latency=14ms client_ip=198.51.100.44 trace_id=${trace}` },
    { level: 'INFO', service: 'auth-service', template: (trace) => `JWT token signature verified for user_id=usr_8f1a2 exp=3600s trace_id=${trace}` },
    { level: 'INFO', service: 'model-orchestrator', template: (trace) => `Inference stream initialized: model=gemini-3.8-flash tokens_prompt=512 batch_size=1 trace_id=${trace}` },
    { level: 'INFO', service: 'vector-indexer', template: (trace) => `Cosine similarity search completed: chunks=256 time_ms=38.4 index=hnsw_v3 trace_id=${trace}` },
    { level: 'INFO', service: 'cache-cluster', template: (trace) => `Semantic cache HIT: key=sha256:7b91d latency=1.8ms ttl=7200s trace_id=${trace}` },

    // WARN
    { level: 'WARN', service: 'model-orchestrator', template: (trace) => `TPM rate-limit soft ceiling reached (88% quota). Queueing request 40ms trace_id=${trace}` },
    { level: 'WARN', service: 'payment-processor', template: (trace) => `Idempotency key replayed: key=idemp_a94f retry_count=1 trace_id=${trace}` },
    { level: 'WARN', service: 'api-gateway', template: (trace) => `High latency detected: endpoint=/v1/embeddings duration=842ms threshold=500ms trace_id=${trace}` },
    { level: 'WARN', service: 'cache-cluster', template: (trace) => `Redis connection pool saturated: active=96 idle=4 max=100 trace_id=${trace}` },

    // ERROR
    { level: 'ERROR', service: 'payment-processor', template: (trace) => `StripeWebhookTimeout: request_id=req_9a8f2 latency=1420ms code=504 upstream=api.stripe.com trace_id=${trace}` },
    { level: 'ERROR', service: 'auth-service', template: (trace) => `OIDCProviderUnreachable: token validation failed for auth0.corp connection reset by peer trace_id=${trace}` },
    { level: 'ERROR', service: 'vector-indexer', template: (trace) => `PgVectorConnectionPoolExhausted: error=pool_size_exceeded workers=32 trace_id=${trace}` },
    { level: 'ERROR', service: 'model-orchestrator', template: (trace) => `ProviderUpstream503: Model overloaded on region us-east-1a, initiating auto-failover trace_id=${trace}` },

    // FATAL
    { level: 'FATAL', service: 'api-gateway', template: (trace) => `PANIC: ingress controller segfault memory_allocated=8.4GB error=out_of_memory trace_id=${trace}` },
    { level: 'FATAL', service: 'payment-processor', template: (trace) => `CRITICAL: settlement ledger balance verification mismatch during atomic commit tx_id=tx_9982 trace_id=${trace}` }
  ];

  function generateTraceId() {
    const chars = '0123456789abcdef';
    let s = '';
    for (let i = 0; i < 12; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return '0x' + s;
  }

  // Generate Log Event
  function generateLogEvent() {
    // Weighted random selection for level:
    // INFO 65%, WARN 20%, ERROR 12%, FATAL 3%
    const rand = Math.random();
    let targetLevel = 'INFO';
    if (rand < 0.65) targetLevel = 'INFO';
    else if (rand < 0.85) targetLevel = 'WARN';
    else if (rand < 0.97) targetLevel = 'ERROR';
    else targetLevel = 'FATAL';

    const pool = LOG_TEMPLATES.filter(t => t.level === targetLevel);
    const item = pool[Math.floor(Math.random() * pool.length)];

    const now = new Date();
    const isoTime = now.toISOString().replace('T', ' ').replace('Z', '');
    const traceId = generateTraceId();
    const message = item.template(traceId);
    const rawText = `[${isoTime}] [${item.level}] [${item.service}] ${message}`;

    return {
      id: ++totalLogsCount,
      timestamp: isoTime,
      level: item.level,
      service: item.service,
      message: message,
      rawText: rawText
    };
  }

  // Append Log to State and DOM
  function pushLog(logObj) {
    logsBuffer.push(logObj);
    if (logsBuffer.length > MAX_BUFFER_LINES) {
      logsBuffer.shift();
      if (linesContainer.firstElementChild) {
        linesContainer.removeChild(linesContainer.firstElementChild);
      }
    }

    renderSingleLog(logObj);
    updateTelemetry();
  }

  // Render a Single Log Row
  function renderSingleLog(logObj) {
    const isVisible = checkVisibility(logObj);
    const rowEl = document.createElement('div');
    rowEl.className = 'terminal-log-row';
    rowEl.id = 'log-line-' + logObj.id;
    rowEl.dataset.level = logObj.level;
    rowEl.dataset.service = logObj.service;

    if (!isVisible) {
      rowEl.style.display = 'none';
    }

    let formattedMessage = escapeHtml(logObj.message);

    // Apply Regex Match Highlight
    if (activeRegex && isVisible) {
      formattedMessage = highlightRegex(formattedMessage, activeRegex);
    }

    rowEl.innerHTML = `
      <span class="log-time">${logObj.timestamp.split(' ')[1]}</span>
      <span class="log-level-badge sev-${logObj.level.toLowerCase()}">${logObj.level}</span>
      <span class="log-service">[${logObj.service}]</span>
      <span class="log-msg">${formattedMessage}</span>
    `;

    linesContainer.appendChild(rowEl);

    // Auto-scroll if enabled
    if (autoScrollCheckbox.checked && isVisible) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function highlightRegex(text, regex) {
    try {
      return text.replace(regex, (match) => `<mark class="regex-match">${match}</mark>`);
    } catch {
      return text;
    }
  }

  function checkVisibility(logObj) {
    // 1. Level filter
    if (activeLevelFilter !== 'ALL' && logObj.level !== activeLevelFilter) {
      return false;
    }

    // 2. Regex filter
    if (activeRegex) {
      return activeRegex.test(logObj.rawText);
    }

    return true;
  }

  // Re-filter all rendered rows when filter or regex changes
  function applyAllFilters() {
    let visibleCount = 0;
    const rows = linesContainer.children;

    for (let i = 0; i < logsBuffer.length; i++) {
      const logObj = logsBuffer[i];
      const rowEl = rows[i];
      if (!rowEl) continue;

      const isVisible = checkVisibility(logObj);
      if (isVisible) {
        rowEl.style.display = 'flex';
        visibleCount++;
        // Re-highlight message
        const msgEl = rowEl.querySelector('.log-msg');
        if (msgEl) {
          let msg = escapeHtml(logObj.message);
          if (activeRegex) msg = highlightRegex(msg, activeRegex);
          msgEl.innerHTML = msg;
        }
      } else {
        rowEl.style.display = 'none';
      }
    }

    footerMatchesCount.textContent = `Showing ${visibleCount} of ${logsBuffer.length} buffered logs`;

    if (autoScrollCheckbox.checked) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }

  // Telemetry & Error Rate Spike Alert
  function updateTelemetry() {
    totalLogsCounter.textContent = totalLogsCount.toLocaleString();
    bufferCapacityVal.textContent = `${logsBuffer.length} / ${MAX_BUFFER_LINES} Lines`;

    // Calculate error rate over the last 30 logs in buffer
    const sampleWindow = logsBuffer.slice(-30);
    const errorCount = sampleWindow.filter(l => l.level === 'ERROR' || l.level === 'FATAL').length;
    const errorRate = sampleWindow.length > 0 ? (errorCount / sampleWindow.length) * 100 : 0;

    errorRateVal.textContent = errorRate.toFixed(1) + '%';
    if (errorRate >= 20) {
      errorRateVal.className = 'telemetry-value text-red';
    } else if (errorRate >= 10) {
      errorRateVal.className = 'telemetry-value text-amber';
    } else {
      errorRateVal.className = 'telemetry-value text-emerald';
    }

    // Trigger Anomaly Spike Banner if error rate > 30% with at least 15 logs
    if (errorRate >= 30 && sampleWindow.length >= 15) {
      anomalySpikeText.textContent = `High error rate (${errorRate.toFixed(1)}%) in recent stream window! Detected ${errorCount} service failure codes.`;
      anomalySpikeAlert.style.display = 'flex';
    }
  }

  // Dismiss Alert
  dismissAlertBtn.addEventListener('click', () => {
    anomalySpikeAlert.style.display = 'none';
  });

  // Severity Level Filter Buttons
  sevPills.forEach(pill => {
    pill.addEventListener('click', () => {
      sevPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeLevelFilter = pill.getAttribute('data-level');
      applyAllFilters();
    });
  });

  // Regex Search Query Handler
  regexInput.addEventListener('input', (e) => {
    regexInputStr = e.target.value.trim();
    if (!regexInputStr) {
      activeRegex = null;
      regexStatusPill.textContent = 'Valid';
      regexStatusPill.className = 'regex-valid-pill valid';
      applyAllFilters();
      return;
    }

    try {
      activeRegex = new RegExp(regexInputStr, 'gi');
      regexStatusPill.textContent = 'Valid';
      regexStatusPill.className = 'regex-valid-pill valid';
    } catch {
      activeRegex = null;
      regexStatusPill.textContent = 'Invalid';
      regexStatusPill.className = 'regex-valid-pill invalid';
    }

    applyAllFilters();
  });

  // Clear Terminal Buffer
  clearBtn.addEventListener('click', () => {
    logsBuffer.length = 0;
    linesContainer.innerHTML = '';
    updateTelemetry();
    footerMatchesCount.textContent = 'Buffer cleared';
  });

  // Stream Toggle
  function setStreaming(play) {
    isStreaming = play;
    if (isStreaming) {
      toggleIcon.textContent = '⏸';
      toggleText.textContent = 'Pause Stream';
      toggleBtn.className = 'term-btn term-btn-primary';
      streamStatusVal.innerHTML = '<span class="status-live-dot"></span> STREAMING (' + (1000 / streamIntervalMs).toFixed(1) + '/s)';
      streamStatusVal.className = 'telemetry-value text-emerald';
      startLoop();
    } else {
      toggleIcon.textContent = '▶';
      toggleText.textContent = 'Resume Stream';
      toggleBtn.className = 'term-btn term-btn-secondary';
      streamStatusVal.textContent = 'PAUSED';
      streamStatusVal.className = 'telemetry-value text-amber';
      clearInterval(timerId);
    }
  }

  toggleBtn.addEventListener('click', () => setStreaming(!isStreaming));

  // Speed Selector Buttons
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      speedButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      streamIntervalMs = parseInt(btn.getAttribute('data-speed'), 10) || 500;
      if (isStreaming) {
        streamStatusVal.innerHTML = '<span class="status-live-dot"></span> STREAMING (' + (1000 / streamIntervalMs).toFixed(1) + '/s)';
        startLoop();
      }
    });
  });

  function startLoop() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (isStreaming) {
        pushLog(generateLogEvent());
      }
    }, streamIntervalMs);
  }

  // Seed initial 12 logs for immediate visual feedback
  for (let i = 0; i < 12; i++) {
    pushLog(generateLogEvent());
  }

  startLoop();
})();
/* ===== END Issue #359 ===== */

/* ===== BEGIN Issue #440: Real-Time Telemetry Anomaly Detection & Adaptive Alert Threshold Simulator ===== */
function initTelemetryAnomalyDetector() {
  'use strict';

  const canvas = document.getElementById('telemetryCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const ROLLING_WINDOW = 60;
  let isStreaming = true;
  let activeMetric = 'cpu'; // 'cpu' | 'memory' | 'latency' | 'composite'
  let zThreshold = 2.5;
  let autoWebhook = true;
  let animationFrameId = null;
  let tickIntervalId = null;
  const incidentLogs = [];

  // Metric Stream Specifications
  const METRIC_SPECS = Object.freeze({
    cpu: {
      id: 'cpu',
      name: 'CPU Utilization',
      unit: '%',
      baseMean: 42.0,
      baseStdDev: 3.2,
      minVal: 5,
      maxVal: 100,
      color: '#06b6d4',
      glowColor: 'rgba(6, 182, 212, 0.35)',
      yMin: 0,
      yMax: 100
    },
    memory: {
      id: 'memory',
      name: 'Memory Heap',
      unit: '%',
      baseMean: 58.0,
      baseStdDev: 2.8,
      minVal: 10,
      maxVal: 100,
      color: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.35)',
      yMin: 0,
      yMax: 100
    },
    latency: {
      id: 'latency',
      name: 'Query Latency',
      unit: 'ms',
      baseMean: 34.0,
      baseStdDev: 4.5,
      minVal: 5,
      maxVal: 220,
      color: '#f59e0b',
      glowColor: 'rgba(245, 158, 11, 0.35)',
      yMin: 0,
      yMax: 220
    }
  });

  // Ring buffers for rolling 60 data points
  const streamBuffers = {
    cpu: [],
    memory: [],
    latency: []
  };

  // Seed initial 60 samples using Box-Muller transform for realistic Gaussian telemetry
  function generateGaussian(mean, stdDev, min, max) {
    const u1 = Math.max(0.0001, Math.random());
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const val = mean + z0 * stdDev;
    return Math.max(min, Math.min(max, Math.round(val * 10) / 10));
  }

  function seedBuffer(metricKey) {
    const spec = METRIC_SPECS[metricKey];
    const arr = [];
    for (let i = 0; i < ROLLING_WINDOW; i++) {
      arr.push(generateGaussian(spec.baseMean, spec.baseStdDev, spec.minVal, spec.maxVal));
    }
    return arr;
  }

  function resetBuffers() {
    streamBuffers.cpu = seedBuffer('cpu');
    streamBuffers.memory = seedBuffer('memory');
    streamBuffers.latency = seedBuffer('latency');
  }
  resetBuffers();

  // Statistical Engine: Rolling Mean, Std Dev, Z-Score
  function computeStats(buffer) {
    const n = buffer.length;
    if (n === 0) return { mean: 0, stdDev: 1, zScore: 0, upperThreshold: 0, latest: 0 };

    const sum = buffer.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    const varianceSum = buffer.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const stdDev = Math.max(0.5, Math.sqrt(varianceSum / n)); // Guard against division by zero

    const latest = buffer[n - 1];
    const zScore = (latest - mean) / stdDev;
    const upperThreshold = mean + zThreshold * stdDev;

    return {
      mean: Math.round(mean * 10) / 10,
      stdDev: Math.round(stdDev * 10) / 10,
      zScore: Math.round(zScore * 100) / 100,
      upperThreshold: Math.round(upperThreshold * 10) / 10,
      latest: Math.round(latest * 10) / 10,
      isAnomaly: zScore > zThreshold
    };
  }

  // Toast Notification Trigger
  function showToast(metricName, value, unit, zVal) {
    const container = document.getElementById('telemetryToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'telemetry-toast';
    toast.setAttribute('role', 'alert');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = '🚨';

    const content = document.createElement('div');
    content.className = 'toast-content';

    const title = document.createElement('strong');
    title.textContent = `Telemetry Anomaly: ${metricName}`;

    const text = document.createElement('span');
    text.textContent = `Spike detected: ${value}${unit} (Z = +${zVal}σ) · Automated Webhook Dispatched`;

    content.appendChild(title);
    content.appendChild(text);
    toast.appendChild(icon);
    toast.appendChild(content);

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(40px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  // Simulated Webhook Dispatch Engine
  function dispatchWebhook(metricKey, stats) {
    const spec = METRIC_SPECS[metricKey];
    const now = new Date();
    const isoTime = now.toISOString();
    const epochSec = Math.floor(now.getTime() / 1000);

    const payload = {
      event: 'telemetry.anomaly_detected',
      incident_id: `inc_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: epochSec,
      iso_timestamp: isoTime,
      metric: spec.name,
      metric_key: metricKey,
      current_value: `${stats.latest}${spec.unit}`,
      rolling_mean: `${stats.mean}${spec.unit}`,
      rolling_std_dev: `${stats.stdDev}${spec.unit}`,
      z_score: stats.zScore,
      threshold_sigma: zThreshold,
      confidence_level: `${(100 - (1 / Math.pow(zThreshold, 2)) * 10).toFixed(1)}%`,
      severity: stats.zScore >= 3.5 ? 'CRITICAL' : 'HIGH',
      channels_notified: [
        'slack:#prod-cloudpulse-alerts',
        'pagerduty:service/high-sev-telemetry'
      ]
    };

    const codeBlock = document.getElementById('payloadCodeBlock');
    if (codeBlock) {
      codeBlock.querySelector('code').textContent = JSON.stringify(payload, null, 2);
    }

    // Append to Incident Stream
    const logItem = {
      time: now.toTimeString().split(' ')[0],
      metric: spec.name,
      value: `${stats.latest}${spec.unit}`,
      threshold: `${stats.upperThreshold}${spec.unit}`,
      zScore: stats.zScore,
      severity: payload.severity
    };
    incidentLogs.unshift(logItem);
    if (incidentLogs.length > 50) incidentLogs.pop();
    renderIncidentLogs();

    if (autoWebhook) {
      showToast(spec.name, stats.latest, spec.unit, stats.zScore);
    }
  }

  // Render Incident Stream Feed
  function renderIncidentLogs() {
    const feed = document.getElementById('incidentLogFeed');
    const badge = document.getElementById('incidentCountBadge');
    if (!feed) return;

    if (badge) {
      badge.textContent = `${incidentLogs.length} Anomal${incidentLogs.length === 1 ? 'y' : 'ies'} Logged`;
    }

    if (incidentLogs.length === 0) {
      feed.replaceChildren();
      const empty = document.createElement('div');
      empty.className = 'incident-empty-state';
      empty.innerHTML = `
        <span class="empty-icon">🛡️</span>
        <p>No anomaly outliers detected in current rolling window. System operating within normal Gaussian variance.</p>
        <span class="empty-hint">Click any Chaos button above to simulate an immediate spike event.</span>
      `;
      feed.appendChild(empty);
      return;
    }

    feed.replaceChildren();
    incidentLogs.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'incident-event-item';

      const mainInfo = document.createElement('div');
      mainInfo.className = 'event-main-info';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'event-time';
      timeSpan.textContent = `[${item.time}]`;

      const descBlock = document.createElement('div');
      descBlock.className = 'event-desc';

      const strong = document.createElement('strong');
      strong.textContent = `${item.metric}: ${item.value} (Upper Limit: ${item.threshold})`;

      const sub = document.createElement('span');
      sub.textContent = `Dispatched to Slack #prod-cloudpulse-alerts & PagerDuty`;

      descBlock.appendChild(strong);
      descBlock.appendChild(sub);
      mainInfo.appendChild(timeSpan);
      mainInfo.appendChild(descBlock);

      const badgesCol = document.createElement('div');
      badgesCol.className = 'event-badges-col';

      const zBadge = document.createElement('span');
      zBadge.className = 'event-z-badge';
      zBadge.textContent = `Z = +${item.zScore}σ`;

      const whStatus = document.createElement('span');
      whStatus.className = 'event-wh-status';
      whStatus.textContent = '● POST 200 OK';

      badgesCol.appendChild(zBadge);
      badgesCol.appendChild(whStatus);

      el.appendChild(mainInfo);
      el.appendChild(badgesCol);
      feed.appendChild(el);
    });
  }

  // Telemetry Sample Step (Tick Engine)
  function pushNextSamples() {
    Object.keys(METRIC_SPECS).forEach((key) => {
      const spec = METRIC_SPECS[key];
      const nextVal = generateGaussian(spec.baseMean, spec.baseStdDev, spec.minVal, spec.maxVal);
      streamBuffers[key].push(nextVal);
      if (streamBuffers[key].length > ROLLING_WINDOW) {
        streamBuffers[key].shift();
      }

      // Check anomaly on active or all
      const stats = computeStats(streamBuffers[key]);
      if (stats.isAnomaly && (activeMetric === key || activeMetric === 'composite')) {
        dispatchWebhook(key, stats);
      }
    });

    updateKpiCards();
  }

  // Update KPI Metrics Cards
  function updateKpiCards() {
    const metricKey = activeMetric === 'composite' ? 'cpu' : activeMetric;
    const spec = METRIC_SPECS[metricKey];
    const stats = computeStats(streamBuffers[metricKey]);

    const curValEl = document.getElementById('metricCurrentVal');
    if (curValEl) curValEl.textContent = `${stats.latest}${spec.unit}`;

    const deltaEl = document.getElementById('metricDeltaVal');
    if (deltaEl) {
      const delta = Math.round((stats.latest - stats.mean) * 10) / 10;
      deltaEl.textContent = `${delta >= 0 ? '+' : ''}${delta}${spec.unit}`;
      deltaEl.className = `kpi-delta-pill ${delta >= 0 ? 'positive' : 'negative'}`;
    }

    const meanEl = document.getElementById('metricMeanVal');
    if (meanEl) meanEl.textContent = `${stats.mean}${spec.unit}`;

    const stdDevEl = document.getElementById('metricStdDevVal');
    if (stdDevEl) stdDevEl.textContent = `${stats.stdDev}${spec.unit}`;

    const zValEl = document.getElementById('metricZScoreVal');
    if (zValEl) {
      zValEl.textContent = `${stats.zScore >= 0 ? '+' : ''}${stats.zScore.toFixed(2)}`;
      zValEl.style.color = stats.isAnomaly ? '#ef4444' : (stats.zScore > 1.5 ? '#f59e0b' : '#34d399');
    }

    const zBadgeEl = document.getElementById('metricZScoreBadge');
    if (zBadgeEl) {
      if (stats.isAnomaly) {
        zBadgeEl.className = 'kpi-zbadge critical';
        zBadgeEl.textContent = 'ANOMALY ALERT';
      } else if (stats.zScore > 1.5) {
        zBadgeEl.className = 'kpi-zbadge elevated';
        zBadgeEl.textContent = 'ELEVATED';
      } else {
        zBadgeEl.className = 'kpi-zbadge normal';
        zBadgeEl.textContent = 'NORMAL';
      }
    }

    const zFormulaEl = document.getElementById('metricZScoreFormula');
    if (zFormulaEl) {
      zFormulaEl.textContent = `Z = (${stats.latest} - ${stats.mean}) / ${stats.stdDev}`;
    }

    const threshValEl = document.getElementById('metricThresholdVal');
    if (threshValEl) threshValEl.textContent = `${stats.upperThreshold}${spec.unit}`;

    const marginEl = document.getElementById('metricMarginVal');
    if (marginEl) {
      const margin = Math.round((stats.upperThreshold - stats.latest) * 10) / 10;
      marginEl.textContent = `${margin >= 0 ? '+' : ''}${margin}${spec.unit} Margin`;
      marginEl.style.color = margin <= 0 ? '#ef4444' : '#38bdf8';
    }

    const threshFormulaEl = document.getElementById('metricThresholdFormula');
    if (threshFormulaEl) {
      threshFormulaEl.textContent = `Upper Limit = μ + ${zThreshold.toFixed(2)}σ`;
    }

    const statusPill = document.getElementById('chartStreamStatus');
    if (statusPill) {
      if (stats.isAnomaly) {
        statusPill.className = 'chart-status-pill anomaly';
        statusPill.textContent = '⚠️ ANOMALY DETECTED';
      } else {
        statusPill.className = 'chart-status-pill healthy';
        statusPill.textContent = 'STREAM HEALTHY';
      }
    }
  }

  // Chaos Injection Handlers
  function injectAnomaly(metricKey, boostAmount) {
    const spec = METRIC_SPECS[metricKey];
    const buffer = streamBuffers[metricKey];
    const n = buffer.length;
    if (n === 0) return;

    const stats = computeStats(buffer);
    const spikeVal = Math.min(spec.maxVal, Math.round((stats.mean + stats.stdDev * 3.8 + boostAmount) * 10) / 10);
    buffer[n - 1] = spikeVal;

    const updatedStats = computeStats(buffer);
    dispatchWebhook(metricKey, updatedStats);
    updateKpiCards();
  }

  // Canvas Multi-Series Chart Rendering Loop (60fps)
  function renderCanvas() {
    const w = canvas.width;
    const h = canvas.height;

    // Reset and clear with deep cyber aesthetic
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    const padLeft = 55;
    const padRight = 30;
    const padTop = 35;
    const padBottom = 35;
    const chartW = w - padLeft - padRight;
    const chartH = h - padTop - padBottom;

    // Determine scale limits
    let yMin = 0;
    let yMax = 100;
    if (activeMetric === 'latency') {
      yMax = 220;
    }

    // Draw Grid Lines & Y-Axis Labels
    const numYTicks = 5;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Outfit, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= numYTicks; i++) {
      const val = Math.round(yMin + (yMax - yMin) * (i / numYTicks));
      const y = padTop + chartH - (i / numYTicks) * chartH;

      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const unit = activeMetric === 'latency' ? 'ms' : '%';
      ctx.fillText(`${val}${unit}`, padLeft - 8, y);
    }

    // Draw Vertical Time Grid Ticks
    const numXTicks = 4;
    for (let j = 0; j <= numXTicks; j++) {
      const x = padLeft + (j / numXTicks) * chartW;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + chartH);
      ctx.stroke();
    }
    ctx.restore();

    // Render Metric Series Function
    function drawSeries(metricKey, isSecondary = false) {
      const spec = METRIC_SPECS[metricKey];
      const buffer = streamBuffers[metricKey];
      const n = buffer.length;
      if (n < 2) return;

      const stats = computeStats(buffer);

      const getX = (idx) => padLeft + (idx / (ROLLING_WINDOW - 1)) * chartW;
      const getY = (val) => padTop + chartH - ((Math.min(yMax, Math.max(yMin, val)) - yMin) / (yMax - yMin)) * chartH;

      // Draw Adaptive Threshold Envelope & Shaded Confidence Band (Primary series only)
      if (!isSecondary) {
        const meanY = getY(stats.mean);
        const threshY = getY(stats.upperThreshold);

        // Confidence Area Fill
        ctx.save();
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fillRect(padLeft, threshY, chartW, Math.max(0, meanY - threshY));

        // Upper Alert Bound Line (Dashed)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(padLeft, threshY);
        ctx.lineTo(w - padRight, threshY);
        ctx.stroke();

        ctx.font = 'bold 10px Outfit, sans-serif';
        ctx.fillStyle = '#f87171';
        ctx.textAlign = 'right';
        ctx.fillText(`+${zThreshold.toFixed(1)}σ THRESHOLD (${stats.upperThreshold}${spec.unit})`, w - padRight - 6, threshY - 7);

        // Rolling Mean Line (Dotted)
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(padLeft, meanY);
        ctx.lineTo(w - padRight, meanY);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`MEAN μ (${stats.mean}${spec.unit})`, w - padRight - 6, meanY - 6);
        ctx.restore();
      }

      // Draw Gradient Area under Curve
      if (!isSecondary) {
        ctx.save();
        const areaGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
        areaGrad.addColorStop(0, spec.glowColor);
        areaGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = areaGrad;

        ctx.beginPath();
        ctx.moveTo(getX(0), padTop + chartH);
        for (let i = 0; i < n; i++) {
          ctx.lineTo(getX(i), getY(buffer[i]));
        }
        ctx.lineTo(getX(n - 1), padTop + chartH);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Draw Smooth Telemetry Polyline
      ctx.save();
      ctx.strokeStyle = spec.color;
      ctx.lineWidth = isSecondary ? 1.5 : 2.5;
      ctx.shadowColor = spec.color;
      ctx.shadowBlur = isSecondary ? 4 : 10;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = getX(i);
        const y = getY(buffer[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Highlight Anomaly Data Points
      ctx.save();
      for (let i = 0; i < n; i++) {
        const val = buffer[i];
        const pointZ = (val - stats.mean) / stats.stdDev;
        if (pointZ > zThreshold) {
          const x = getX(i);
          const y = getY(val);

          // Pulsating outer warning ring
          const pulse = (Math.sin(Date.now() * 0.008) + 1) * 4;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, 7 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          // Solid inner alert marker
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();

          // Callout tag if latest
          if (i === n - 1) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
            ctx.strokeStyle = '#f87171';
            ctx.lineWidth = 1;
            const tagText = `⚠️ ANOMALY SPIKE: ${val}${spec.unit} (Z = +${pointZ.toFixed(2)}σ)`;
            const tagW = ctx.measureText(tagText).width + 16;
            const tagX = Math.min(w - padRight - tagW, Math.max(padLeft, x - tagW / 2));
            const tagY = Math.max(padTop + 14, y - 24);

            ctx.beginPath();
            ctx.roundRect(tagX, tagY - 14, tagW, 20, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px Outfit, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(tagText, tagX + 8, tagY);
          }
        }
      }
      ctx.restore();

      // Latest Sample Glowing Pulse Head
      if (n > 0) {
        const latestX = getX(n - 1);
        const latestY = getY(buffer[n - 1]);
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = spec.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(latestX, latestY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (activeMetric === 'composite') {
      drawSeries('latency', true);
      drawSeries('memory', true);
      drawSeries('cpu', false);
    } else {
      drawSeries(activeMetric, false);
    }

    if (isStreaming) {
      animationFrameId = requestAnimationFrame(renderCanvas);
    }
  }

  // Event Listeners & Controls Binding
  function bindEvents() {
    // Metric Switcher Tabs
    const tabsContainer = document.getElementById('telemetryMetricTabs');
    if (tabsContainer) {
      tabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.metric-tab-pill');
        if (!btn) return;

        const metric = btn.getAttribute('data-metric');
        if (!metric) return;

        activeMetric = metric;

        tabsContainer.querySelectorAll('.metric-tab-pill').forEach((b) => {
          const isSelected = b === btn;
          b.classList.toggle('active', isSelected);
          b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        });

        // Update chart title
        const titleEl = document.getElementById('chartStreamTitle');
        if (titleEl) {
          if (activeMetric === 'composite') {
            titleEl.textContent = 'Tri-Series Telemetry (CPU, Memory, Latency) — 60s Window';
          } else {
            const spec = METRIC_SPECS[activeMetric];
            titleEl.textContent = `${spec.name} Telemetry — 60s Rolling Window`;
          }
        }

        updateKpiCards();
        if (!isStreaming) renderCanvas();
      });
    }

    // Sensitivity Threshold Slider
    const slider = document.getElementById('zScoreSlider');
    const display = document.getElementById('zScoreDisplay');
    if (slider) {
      slider.addEventListener('input', () => {
        zThreshold = parseFloat(slider.value);
        if (display) {
          const conf = (100 - (1 / Math.pow(zThreshold, 2)) * 10).toFixed(1);
          display.textContent = `${zThreshold.toFixed(1)}σ (${conf}% Confidence)`;
        }
        updateKpiCards();
        if (!isStreaming) renderCanvas();
      });
    }

    // Play / Pause Stream Button
    const btnToggle = document.getElementById('btnStreamToggle');
    const icon = document.getElementById('btnStreamIcon');
    const label = document.getElementById('btnStreamLabel');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        isStreaming = !isStreaming;
        if (icon) icon.textContent = isStreaming ? '⏸' : '▶';
        if (label) label.textContent = isStreaming ? 'Pause Stream' : 'Resume Stream';
        btnToggle.classList.toggle('paused', !isStreaming);

        if (isStreaming) {
          startStreamLoops();
        } else {
          clearInterval(tickIntervalId);
          cancelAnimationFrame(animationFrameId);
        }
      });
    }

    // Reset Buffer Button
    const btnReset = document.getElementById('btnStreamReset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        resetBuffers();
        updateKpiCards();
        if (!isStreaming) renderCanvas();
      });
    }

    // Webhook Toggle
    const whToggle = document.getElementById('webhookToggle');
    if (whToggle) {
      whToggle.addEventListener('change', () => {
        autoWebhook = whToggle.checked;
        const statusBadge = document.getElementById('webhookStatusBadge');
        if (statusBadge) {
          statusBadge.textContent = autoWebhook ? 'LISTENER ACTIVE' : 'DISPATCH PAUSED';
          statusBadge.className = `wh-status-badge ${autoWebhook ? 'ready' : 'paused'}`;
        }
      });
    }

    // Chaos Spike Buttons
    const btnCpu = document.getElementById('btnInjectCpu');
    if (btnCpu) btnCpu.addEventListener('click', () => injectAnomaly('cpu', 45));

    const btnMem = document.getElementById('btnInjectMemory');
    if (btnMem) btnMem.addEventListener('click', () => injectAnomaly('memory', 35));

    const btnLat = document.getElementById('btnInjectLatency');
    if (btnLat) btnLat.addEventListener('click', () => injectAnomaly('latency', 150));

    const btnRand = document.getElementById('btnInjectRandom');
    if (btnRand) {
      btnRand.addEventListener('click', () => {
        const keys = ['cpu', 'memory', 'latency'];
        const chosen = keys[Math.floor(Math.random() * keys.length)];
        injectAnomaly(chosen, 40);
      });
    }

    // Incident Feed Actions
    const btnClear = document.getElementById('btnClearIncidents');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        incidentLogs.length = 0;
        renderIncidentLogs();
      });
    }

    const btnExport = document.getElementById('btnExportIncidents');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        navigator.clipboard.writeText(JSON.stringify(incidentLogs, null, 2)).then(() => {
          showToast('Incident Feed', incidentLogs.length, ' events', '0.0');
        }).catch(() => {});
      });
    }

    const btnCopyPayload = document.getElementById('btnCopyPayload');
    if (btnCopyPayload) {
      btnCopyPayload.addEventListener('click', () => {
        const code = document.querySelector('#payloadCodeBlock code');
        if (code) {
          navigator.clipboard.writeText(code.textContent).then(() => {
            btnCopyPayload.textContent = 'Copied!';
            setTimeout(() => { btnCopyPayload.textContent = 'Copy JSON'; }, 2000);
          }).catch(() => {});
        }
      });
    }

    // Responsive Canvas Resize Observer
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = Math.round(rect.width * window.devicePixelRatio);
        canvas.height = Math.round(rect.width * 0.35 * window.devicePixelRatio);
        if (!isStreaming) renderCanvas();
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
  }

  // Start Sampling & 60fps Animation Loop
  function startStreamLoops() {
    clearInterval(tickIntervalId);
    tickIntervalId = setInterval(() => {
      if (isStreaming) {
        pushNextSamples();
      }
    }, 1000); // 1 sample per second rolling time series

    cancelAnimationFrame(animationFrameId);
    renderCanvas();
  }

  // Initial Run
  bindEvents();
  updateKpiCards();
  startStreamLoops();
}
/* ===== END Issue #440 ===== */

/*System Status Indicator*/
function initSystemStatus() {
  const toggle = document.getElementById('systemStatusToggle');
  const popover = document.getElementById('systemStatusPopover');
  const status = document.querySelector('.system-status');

  if (!toggle || !popover || !status) return;

  const closePopover = () => {
    popover.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };

  const openPopover = () => {
    popover.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
  };

  toggle.addEventListener('click', event => {
    event.stopPropagation();

    if (popover.hidden) {
      openPopover();
    } else {
      closePopover();
    }
  });

  status.addEventListener('mouseenter', openPopover);

  status.addEventListener('mouseleave', () => {
    closePopover();
  });

  document.addEventListener('click', event => {
    if (!status.contains(event.target)) {
      closePopover();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closePopover();
      toggle.focus();
    }
  });
}
