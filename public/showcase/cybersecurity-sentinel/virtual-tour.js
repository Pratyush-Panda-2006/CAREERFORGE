/**
 * Cybersecurity Sentinel - Interactive Feature Spotlight & Guided Tour Controller
 * Spotlights user interface components step-by-step, calculates viewport anchor positions,
 * renders tooltip guidance balloons, and handles collision boundaries.
 */

export class CybersecuritySentinelTourGuide {
  constructor(options = {}) {
    this.name = 'CybersecuritySentinelTourGuide';
    this.steps = options.steps || this.getDefaultSteps();
    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.storageKey = options.storageKey || 'robotics_tour_completed';
    this.listeners = [];
  }

  getDefaultSteps() {
    return [
      {
        id: 'arm-telemetry',
        selector: '#arm-telemetry',
        title: 'Robotic Arm 6-DoF Telemetry',
        description: 'Monitors real-time joint angular velocities, torque feedback, and Cartesian end-effector coordinates.'
      },
      {
        id: 'sensor-fusion',
        selector: '#sensor-fusion',
        title: 'LiDAR & Depth Sensor Fusion',
        description: 'Blends spatial point cloud measurements with ultrasonic safety perimeter trip barriers.'
      },
      {
        id: 'motion-planner',
        selector: '#motion-planner',
        title: 'Inverse Kinematics Trajectory Planner',
        description: 'Computes jerk-continuous polynomial motion profiles to achieve optimal robotic workcell traversal.'
      },
      {
        id: 'safety-interlock',
        selector: '#safety-interlock',
        title: 'ISO-13849 Category 4 Safety Interlock',
        description: 'Monitors dual-channel redundant optical light curtains and instant E-stop dynamic braking circuits.'
      }
    ];
  }

  /**
   * Starts or restarts the guided tour.
   * @param {Array<object>} [steps=null] - Optional override steps
   * @returns {object|null} Current active step
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
   * Returns current active step object.
   * @returns {object|null}
   */
  getCurrentStep() {
    if (!this.isActive || this.steps.length === 0) return null;
    return this.steps[this.currentStepIndex] || null;
  }

  /**
   * Advances to the next tour step or finishes tour on the last step.
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
   * Moves back to the previous tour step.
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
   * Finishes the tour and marks completion.
   * @returns {null}
   */
  finishTour() {
    this.isActive = false;
    this.completed = true;
    this.notify();
    return null;
  }

  /**
   * Skips and exits the tour without completion.
   * @returns {null}
   */
  skipTour() {
    this.isActive = false;
    this.notify();
    return null;
  }

  /**
   * Checks whether the tour has finished.
   * @returns {boolean}
   */
  isCompleted() {
    return this.completed;
  }

  /**
   * Calculates tooltip anchor coordinates with viewport collision avoidance.
   * @param {Element|object} targetEl - Target DOM element or mock bounding rect
   * @param {number} [tooltipWidth=320]
   * @param {number} [tooltipHeight=180]
   * @param {{ width: number, height: number }} [viewport={ width: 1024, height: 768 }]
   * @returns {{ top: number, left: number }}
   */
  calculateTooltipCoords(targetEl, tooltipWidth = 320, tooltipHeight = 180, viewport = { width: 1024, height: 768 }) {
    let targetRect = { top: 100, left: 100, width: 200, height: 100, bottom: 200, right: 300 };
    if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
      targetRect = targetEl.getBoundingClientRect();
    }

    // Default position: centered below the target with 12px margin
    let top = targetRect.bottom + 12;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Collision avoidance: if overflowing bottom, position above target
    if (top + tooltipHeight > viewport.height) {
      top = targetRect.top - tooltipHeight - 12;
    }

    // Horizontal boundaries clamping
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewport.width - 16) {
      left = viewport.width - tooltipWidth - 16;
    }

    // Vertical boundaries clamping
    if (top < 16) {
      top = 16;
    } else if (top + tooltipHeight > viewport.height - 16) {
      top = viewport.height - tooltipHeight - 16;
    }

    return {
      top: Math.round(top),
      left: Math.round(left)
    };
  }

  /**
   * Subscribes a listener callback to tour state updates.
   * @param {Function} listener
   */
  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  /**
   * Notifies registered listeners.
   */
  notify() {
    const current = this.getCurrentStep();
    this.listeners.forEach((fn) => fn(current, this.currentStepIndex, this.steps.length, this.isActive));
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const tour = new CybersecuritySentinelTourGuide();

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

    function renderTourUI() {
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

      // Update spotlight class
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
          stepDotsContainer.appendChild(dot);
        });
      }

      // Button labels
      if (prevBtn) {
        prevBtn.style.visibility = tour.currentStepIndex === 0 ? 'hidden' : 'visible';
      }
      if (nextBtn) {
        nextBtn.textContent = tour.currentStepIndex === tour.steps.length - 1 ? 'Finish ✔' : 'Next ➔';
      }

      // Position tooltip
      if (tooltip && targetCard) {
        const viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        };
        const coords = tour.calculateTooltipCoords(targetCard, 320, 180, viewport);
        tooltip.style.top = `${coords.top + window.scrollY}px`;
        tooltip.style.left = `${coords.left}px`;
      }
    }

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        tour.startTour();
        renderTourUI();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        tour.nextStep();
        renderTourUI();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        tour.prevStep();
        renderTourUI();
      });
    }

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        tour.skipTour();
        renderTourUI();
      });
    }

    tour.subscribe(() => {
      renderTourUI();
    });
  });
}
