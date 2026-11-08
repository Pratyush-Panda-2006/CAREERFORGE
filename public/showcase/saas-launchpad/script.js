document.addEventListener('DOMContentLoaded', () => {
  console.log('CloudPulse SaaS Launchpad initialized');

  initTestimonialsCarousel();
  initRoiCalculator();
  initFaqAccordion();
  initBillingToggle();
  initIntegrationFilters();
  initSystemStatus();
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
  const SERVICES = [
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
