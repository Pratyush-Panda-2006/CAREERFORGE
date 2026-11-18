/**
 * DeFi Yield Matrix - Interactive Feature Spotlight Onboarding & Guided Tour Controller
 * Coordinates step-by-step UI highlights, calculates dynamic viewport tooltip positions,
 * and handles boundary clamps with collision avoidance.
 */

export class DefiYieldMatrixTourGuide {
  constructor(options = {}) {
    this.steps = options.steps || [
      {
        id: 'step-vaults',
        targetId: 'vaultOverviewSection',
        title: 'Concentrated Liquidity Vaults',
        content: 'Inspect automated market maker pools, tick ranges, and fee tier distributions across pairs.',
        placement: 'bottom'
      },
      {
        id: 'step-yield',
        targetId: 'yieldMatrixSection',
        title: 'Auto-Compounding Engine',
        content: 'Review multi-protocol yield routes and auto-harvest compounding frequencies achieving optimal APY.',
        placement: 'bottom'
      },
      {
        id: 'step-risk',
        targetId: 'riskHedgeSection',
        title: 'Delta-Neutral Risk Hedging',
        content: 'Analyze real-time impermanent loss buffers, liquidation protection parameters, and delta neutrality.',
        placement: 'top'
      },
      {
        id: 'step-governance',
        targetId: 'governanceSection',
        title: 'Protocol Governance & Staking',
        content: 'Participate in on-chain parameter voting and earn matrix revenue-sharing token rewards.',
        placement: 'top'
      }
    ];

    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.skipped = false;
    this.listeners = new Set();
  }

  /**
   * Starts or restarts the tour from the first step.
   * @param {Array<object>} [customSteps]
   * @returns {object} Current step state
   */
  startTour(customSteps) {
    if (customSteps && Array.isArray(customSteps) && customSteps.length > 0) {
      this.steps = customSteps;
    }
    if (!this.steps || this.steps.length === 0) {
      throw new Error('Cannot start tour: No steps defined in tour guide.');
    }

    this.currentStepIndex = 0;
    this.isActive = true;
    this.completed = false;
    this.skipped = false;

    const event = {
      type: 'start',
      stepIndex: 0,
      step: this.steps[0],
      totalSteps: this.steps.length,
      isFirst: true,
      isLast: this.steps.length === 1
    };

    this.notify(event);
    return event;
  }

  /**
   * Advances to the next tour step or marks the tour complete if at the final step.
   * Clamps boundary to steps.length - 1.
   * @returns {object} Updated tour state
   */
  nextStep() {
    if (!this.isActive) return { isActive: false };

    if (this.currentStepIndex >= this.steps.length - 1) {
      return this.completeTour();
    }

    this.currentStepIndex = Math.min(this.steps.length - 1, this.currentStepIndex + 1);
    const step = this.steps[this.currentStepIndex];

    const event = {
      type: 'step_change',
      stepIndex: this.currentStepIndex,
      step,
      totalSteps: this.steps.length,
      isFirst: this.currentStepIndex === 0,
      isLast: this.currentStepIndex === this.steps.length - 1
    };

    this.notify(event);
    return event;
  }

  /**
   * Navigates back to the previous tour step.
   * Clamps boundary to 0.
   * @returns {object} Updated tour state
   */
  prevStep() {
    if (!this.isActive) return { isActive: false };

    this.currentStepIndex = Math.max(0, this.currentStepIndex - 1);
    const step = this.steps[this.currentStepIndex];

    const event = {
      type: 'step_change',
      stepIndex: this.currentStepIndex,
      step,
      totalSteps: this.steps.length,
      isFirst: this.currentStepIndex === 0,
      isLast: this.currentStepIndex === this.steps.length - 1
    };

    this.notify(event);
    return event;
  }

  /**
   * Completes the tour and marks the finished flag.
   * @returns {object} Completion event state
   */
  completeTour() {
    this.isActive = false;
    this.completed = true;
    this.skipped = false;

    const event = {
      type: 'complete',
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      completed: true
    };

    this.notify(event);
    return event;
  }

  /**
   * Skips and exits the tour prematurely.
   * @returns {object} Skip event state
   */
  skipTour() {
    this.isActive = false;
    this.skipped = true;

    const event = {
      type: 'skip',
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      skipped: true
    };

    this.notify(event);
    return event;
  }

  /**
   * Calculates anchor coordinates with automatic collision avoidance and viewport clamping.
   * @param {{ top: number, left: number, width: number, height: number }} targetRect
   * @param {{ width: number, height: number }} [tooltipSize]
   * @param {{ width: number, height: number }} [viewportSize]
   * @param {string} [preferredPlacement='bottom']
   * @returns {{ top: number, left: number, placement: string }}
   */
  calculateTooltipCoords(
    targetRect,
    tooltipSize = { width: 320, height: 180 },
    viewportSize = { width: 1024, height: 768 },
    preferredPlacement = 'bottom'
  ) {
    const spacing = 14;
    const padding = 16;
    let placement = preferredPlacement;
    let top = 0;
    let left = 0;

    // Evaluate preferred top/left
    if (placement === 'bottom') {
      top = targetRect.top + targetRect.height + spacing;
      left = targetRect.left + (targetRect.width / 2) - (tooltipSize.width / 2);
      // Collision detection: flip to top if overflowing viewport bottom
      if (top + tooltipSize.height > viewportSize.height - padding && targetRect.top - tooltipSize.height - spacing >= padding) {
        placement = 'top';
        top = targetRect.top - tooltipSize.height - spacing;
      }
    } else if (placement === 'top') {
      top = targetRect.top - tooltipSize.height - spacing;
      left = targetRect.left + (targetRect.width / 2) - (tooltipSize.width / 2);
      // Collision detection: flip to bottom if overflowing viewport top
      if (top < padding && targetRect.top + targetRect.height + spacing + tooltipSize.height <= viewportSize.height - padding) {
        placement = 'bottom';
        top = targetRect.top + targetRect.height + spacing;
      }
    } else if (placement === 'right') {
      top = targetRect.top + (targetRect.height / 2) - (tooltipSize.height / 2);
      left = targetRect.left + targetRect.width + spacing;
      if (left + tooltipSize.width > viewportSize.width - padding) {
        placement = 'left';
        left = targetRect.left - tooltipSize.width - spacing;
      }
    } else if (placement === 'left') {
      top = targetRect.top + (targetRect.height / 2) - (tooltipSize.height / 2);
      left = targetRect.left - tooltipSize.width - spacing;
      if (left < padding) {
        placement = 'right';
        left = targetRect.left + targetRect.width + spacing;
      }
    }

    // Viewport boundary clamping to guarantee tooltip remains entirely on-screen
    const minLeft = padding;
    const maxLeft = Math.max(padding, viewportSize.width - tooltipSize.width - padding);
    const minTop = padding;
    const maxTop = Math.max(padding, viewportSize.height - tooltipSize.height - padding);

    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, left));
    const clampedTop = Math.min(maxTop, Math.max(minTop, top));

    return {
      top: Math.round(clampedTop),
      left: Math.round(clampedLeft),
      placement
    };
  }

  /**
   * Returns current active step object.
   * @returns {object|null}
   */
  getCurrentStep() {
    if (!this.isActive || !this.steps[this.currentStepIndex]) return null;
    return {
      ...this.steps[this.currentStepIndex],
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      isFirst: this.currentStepIndex === 0,
      isLast: this.currentStepIndex === this.steps.length - 1
    };
  }

  /**
   * Registers a subscriber listener.
   * @param {Function} callback
   * @returns {Function} Unsubscribe handle
   */
  on(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Subscriber must be a callable function.');
    }
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Dispatches payload to listeners.
   * @param {object} payload
   */
  notify(payload) {
    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (err) {
        console.error('DefiYieldMatrixTourGuide listener error:', err);
      }
    }
  }
}
