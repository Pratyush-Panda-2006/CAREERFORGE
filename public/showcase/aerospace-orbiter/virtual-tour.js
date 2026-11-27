/**
 * AerospaceOrbiterTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for Aerospace Orbiter.
 * Manages step navigation, clamps boundaries, computes viewport anchor collisions,
 * and handles completion flag persistence.
 */

export class AerospaceOrbiterTourGuide {
  constructor(options = {}) {
    this.name = 'AerospaceOrbiterTourGuide';
    this.steps = options.steps || this.getDefaultSteps();
    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.storageKey = options.storageKey || 'aerospace_orbiter_tour_completed';
    this.storage = options.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    this.listeners = [];

    // Load persisted completion if available
    if (this.storage && typeof this.storage.getItem === 'function') {
      try {
        const stored = this.storage.getItem(this.storageKey);
        if (stored === 'true') {
          this.completed = true;
        }
      } catch {
        // Fallback gracefully on storage access errors
      }
    }
  }

  /**
   * Returns default spotlight tour steps for Aerospace Orbiter systems.
   * @returns {Array<object>}
   */
  getDefaultSteps() {
    return [
      {
        id: 'orbital-telemetry',
        selector: '#orbital-telemetry',
        title: 'Orbital State Vector Telemetry',
        description: 'Track real-time Keplerian orbital elements: apoapsis, periapsis, orbital inclination, and true anomaly tracking.'
      },
      {
        id: 'propulsion-rcs',
        selector: '#propulsion-rcs',
        title: 'Reaction Control & Propulsion Array',
        description: 'Continuous delta-v propellant accounting, thruster manifold pressure valves, and specific impulse telemetry.'
      },
      {
        id: 'trajectory-planner',
        selector: '#trajectory-planner',
        title: 'Orbital Maneuver & Transfer Planner',
        description: 'Coplanar Hohmann transfer calculations, bi-elliptic transfer burns, and orbital rendezvous intercept trajectories.'
      },
      {
        id: 'thermal-radiator',
        selector: '#thermal-radiator',
        title: 'Cryogenic Radiator & Thermal Bus',
        description: 'Loop heat pipe circulation, deployed radiator orientation tracking, and equilibrium skin temperature balance.'
      }
    ];
  }

  /**
   * Starts or restarts the guided tour.
   * @param {Array<object>} [steps=null]
   * @returns {object|null}
   */
  startTour(steps = null) {
    if (steps && Array.isArray(steps) && steps.length > 0) {
      this.steps = steps;
    }
    this.currentStepIndex = 0;
    this.isActive = true;
    this.completed = false;
    this.notify();
    return this.getCurrentStep();
  }

  /**
   * Returns the currently active step.
   * @returns {object|null}
   */
  getCurrentStep() {
    if (!this.isActive || this.steps.length === 0) return null;
    return this.steps[this.currentStepIndex] || null;
  }

  /**
   * Advances to next step, or finishes tour on final step.
   * @returns {object|null}
   */
  nextStep() {
    if (!this.isActive) return null;
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.notify();
      return this.getCurrentStep();
    } else {
      return this.finishTour();
    }
  }

  /**
   * Moves back to previous step, clamped at 0.
   * @returns {object|null}
   */
  prevStep() {
    if (!this.isActive) return null;
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.notify();
      return this.getCurrentStep();
    }
    return this.getCurrentStep();
  }

  /**
   * Finishes tour, marks completed, and persists completion flag.
   * @returns {null}
   */
  finishTour() {
    this.isActive = false;
    this.completed = true;
    this.persistCompletion(true);
    this.notify();
    return null;
  }

  /**
   * Skips tour without marking completed.
   * @returns {null}
   */
  skipTour() {
    this.isActive = false;
    this.notify();
    return null;
  }

  /**
   * Returns tour completion status.
   * @returns {boolean}
   */
  isCompleted() {
    return this.completed;
  }

  /**
   * Persists completion flag to storage.
   * @param {boolean} [completed=true]
   */
  persistCompletion(completed = true) {
    this.completed = completed;
    if (this.storage && typeof this.storage.setItem === 'function') {
      try {
        this.storage.setItem(this.storageKey, completed ? 'true' : 'false');
      } catch {
        // Fallback silently if storage unavailable
      }
    }
  }

  /**
   * Reads persisted completion flag from storage.
   * @returns {boolean}
   */
  getPersistedCompletion() {
    if (this.storage && typeof this.storage.getItem === 'function') {
      try {
        return this.storage.getItem(this.storageKey) === 'true';
      } catch {
        return false;
      }
    }
    return this.completed;
  }

  /**
   * Calculates tooltip coordinates with collision avoidance and boundary clamping.
   * @param {Element|object} targetEl
   * @param {number} [tooltipWidth=320]
   * @param {number} [tooltipHeight=180]
   * @param {{ width: number, height: number }} [viewport={ width: 1024, height: 768 }]
   * @returns {{ top: number, left: number, placement: string, targetRect: object }}
   */
  calculateTooltipCoords(targetEl, tooltipWidth = 320, tooltipHeight = 180, viewport = { width: 1024, height: 768 }) {
    let targetRect = { top: 100, left: 100, width: 200, height: 100, bottom: 200, right: 300 };
    if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
      targetRect = targetEl.getBoundingClientRect();
    } else if (targetEl && typeof targetEl === 'object') {
      targetRect = { ...targetRect, ...targetEl };
    }

    let placement = 'bottom';
    // Default placement: below target centered horizontally with 12px gap
    let top = targetRect.bottom + 12;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Viewport collision avoidance: if overflowing bottom, position above target
    if (top + tooltipHeight > viewport.height) {
      top = targetRect.top - tooltipHeight - 12;
      placement = 'top';
    }

    // Horizontal boundaries clamping (16px margin)
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewport.width - 16) {
      left = viewport.width - tooltipWidth - 16;
    }

    // Vertical boundaries clamping (16px margin)
    if (top < 16) {
      top = 16;
    } else if (top + tooltipHeight > viewport.height - 16) {
      top = viewport.height - tooltipHeight - 16;
    }

    return {
      top: Math.round(top),
      left: Math.round(left),
      placement,
      targetRect
    };
  }

  /**
   * Subscribes a listener to tour events.
   * @param {Function} callback
   * @returns {Function} unsubscribe function
   */
  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  /**
   * Notifies all registered listeners of tour state changes.
   */
  notify() {
    const current = this.getCurrentStep();
    const payload = {
      currentStep: current,
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      isActive: this.isActive,
      completed: this.completed
    };
    this.listeners.forEach((fn) => fn(payload));
  }
}

// Browser DOM controller binding
if (typeof document !== 'undefined') {
  const initTourUI = () => {
    const tour = new AerospaceOrbiterTourGuide();

    const startBtn = document.getElementById('start-tour-btn');
    const scrim = document.getElementById('tour-scrim');
    const tooltip = document.getElementById('tour-tooltip');
    const stepIndicator = document.getElementById('step-indicator');
    const tooltipTitle = document.getElementById('tooltip-title');
    const tooltipDesc = document.getElementById('tooltip-desc');
    const stepDotsContainer = document.getElementById('step-dots');
    const prevBtn = document.getElementById('prev-step-btn');
    const nextBtn = document.getElementById('next-step-btn');
    const skipBtn = document.getElementById('skip-tour-btn');

    function updateTourUI() {
      if (!tour.isActive) {
        if (scrim) scrim.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
        document.querySelectorAll('.feature-card').forEach((card) => {
          card.classList.remove('spotlight-active');
        });
        return;
      }

      if (scrim) scrim.style.display = 'block';
      if (tooltip) tooltip.style.display = 'flex';

      const currentStep = tour.getCurrentStep();
      if (!currentStep) return;

      // Update spotlight active card
      document.querySelectorAll('.feature-card').forEach((card) => {
        card.classList.remove('spotlight-active');
      });
      const targetCard = document.querySelector(currentStep.selector);
      if (targetCard) {
        targetCard.classList.add('spotlight-active');
      }

      if (stepIndicator) {
        stepIndicator.textContent = `Step ${tour.currentStepIndex + 1} of ${tour.steps.length}`;
      }
      if (tooltipTitle) {
        tooltipTitle.textContent = currentStep.title;
      }
      if (tooltipDesc) {
        tooltipDesc.textContent = currentStep.description;
      }

      // Render step dots
      if (stepDotsContainer) {
        stepDotsContainer.textContent = '';
        tour.steps.forEach((_, idx) => {
          const dot = document.createElement('div');
          dot.className = `step-dot ${idx === tour.currentStepIndex ? 'active' : ''}`;
          dot.addEventListener('click', () => {
            tour.currentStepIndex = idx;
            tour.notify();
            updateTourUI();
          });
          stepDotsContainer.appendChild(dot);
        });
      }

      // Update button labels & visibility
      if (prevBtn) {
        prevBtn.style.visibility = tour.currentStepIndex === 0 ? 'hidden' : 'visible';
      }
      if (nextBtn) {
        nextBtn.textContent = tour.currentStepIndex === tour.steps.length - 1 ? 'Finish ✔' : 'Next ➔';
      }

      // Position tooltip with collision calculations
      if (tooltip && targetCard) {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        const coords = tour.calculateTooltipCoords(targetCard, 320, 180, viewport);
        tooltip.style.top = `${coords.top + window.scrollY}px`;
        tooltip.style.left = `${coords.left}px`;

        tooltip.classList.remove('arrow-top', 'arrow-bottom');
        tooltip.classList.add(coords.placement === 'top' ? 'arrow-bottom' : 'arrow-top');
      }
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        tour.startTour();
        updateTourUI();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tour.nextStep();
        updateTourUI();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        tour.prevStep();
        updateTourUI();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        tour.skipTour();
        updateTourUI();
      });
    }

    tour.subscribe(() => {
      updateTourUI();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTourUI);
  } else {
    initTourUI();
  }
}
