/**
 * VirtualMuseum3dTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for itineraries, expedition waypoints, and museum vouchers.
 */
export class VirtualMuseum3dTourGuide {
  constructor(options = {}) {
    this.steps = options.steps || this.getDefaultSteps();
    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.storageKey = options.storageKey || 'odyssey_tour_completed';
    this.listeners = [];
  }

  getDefaultSteps() {
    return [
      {
        id: 'gallery-viewport',
        selector: '#gallery-viewport-card',
        title: 'Multi-City Itinerary Planner',
        description: 'Construct custom multi-leg flight, rail, and road expedition routes with interactive transit schedules.'
      },
      {
        id: 'artifact-inspector',
        selector: '#artifact-inspector-card',
        title: 'Alpine Elevation & Sickness Forecaster',
        description: 'Simulates elevation profiles, barometric variance, and oxygen acclimatization schedules.'
      },
      {
        id: 'audio-guide',
        selector: '#audio-guide-card',
        title: 'Digital Travel Voucher & Pass Vault',
        description: 'Manages cryptographic boarding passes, hotel reservations, and emergency transit insurance.'
      },
      {
        id: 'curator-studio',
        selector: '#curator-studio-card',
        title: 'Global Expedition Satellite Atlas',
        description: 'Interactive offline-capable geospatial navigation map with live waypoint tracking.'
      }
    ];
  }

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

  getCurrentStep() {
    if (!this.isActive || this.steps.length === 0) return null;
    return this.steps[this.currentStepIndex] || null;
  }

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

  prevStep() {
    if (!this.isActive) return null;
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.notify();
      return this.getCurrentStep();
    }
    return this.getCurrentStep();
  }

  finishTour() {
    this.isActive = false;
    this.completed = true;
    this.notify();
    return null;
  }

  skipTour() {
    this.isActive = false;
    this.notify();
    return null;
  }

  isCompleted() {
    return this.completed;
  }

  calculateTooltipCoords(targetEl, tooltipWidth = 320, tooltipHeight = 180, viewport = { width: 1024, height: 768 }) {
    let targetRect = { top: 100, left: 100, width: 200, height: 100, bottom: 200, right: 300 };
    if (targetEl && typeof targetEl.getBoundingClientRect === 'function') {
      targetRect = targetEl.getBoundingClientRect();
    }

    let top = targetRect.bottom + 12;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    if (top + tooltipHeight > viewport.height) {
      top = targetRect.top - tooltipHeight - 12;
    }

    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewport.width - 16) {
      left = viewport.width - tooltipWidth - 16;
    }

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

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  }

  notify() {
    const current = this.getCurrentStep();
    this.listeners.forEach((fn) => fn(current, this.currentStepIndex, this.steps.length));
  }

  renderToDOM(container) {
    if (!container || typeof container.appendChild !== 'function') {
      throw new Error('Valid DOM container element required');
    }

    container.replaceChildren();

    const tourWrapper = document.createElement('div');
    tourWrapper.className = 'museum-tour-container';

    const header = document.createElement('div');
    header.className = 'museum-tour-header';

    const title = document.createElement('h3');
    title.textContent = 'Virtual Museum 3D Feature Spotlight & Guided Tour';

    const startBtn = document.createElement('button');
    startBtn.className = 'museum-tour-start-btn';
    startBtn.textContent = this.isActive ? 'Restart Tour' : 'Start Onboarding Tour';
    startBtn.addEventListener('click', () => {
      this.startTour();
      this.renderToDOM(container);
    });

    header.append(title, startBtn);
    tourWrapper.append(header);

    if (this.isActive) {
      const step = this.getCurrentStep();
      const card = document.createElement('div');
      card.className = 'museum-tour-card';

      const progress = document.createElement('div');
      progress.className = 'museum-tour-progress';
      progress.textContent = `Step ${this.currentStepIndex + 1} of ${this.steps.length}`;

      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;

      const stepDesc = document.createElement('p');
      stepDesc.textContent = step.description;

      const actions = document.createElement('div');
      actions.className = 'museum-tour-actions';

      const actionsLeft = document.createElement('div');
      actionsLeft.className = 'museum-tour-actions-left';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'museum-tour-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = this.currentStepIndex === 0;
      prevBtn.addEventListener('click', () => {
        this.prevStep();
        this.renderToDOM(container);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'museum-tour-btn museum-tour-btn-primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });

      actionsLeft.append(prevBtn, nextBtn);

      const skipBtn = document.createElement('button');
      skipBtn.className = 'museum-tour-skip-btn';
      skipBtn.textContent = 'Skip Tour';
      skipBtn.addEventListener('click', () => {
        this.skipTour();
        this.renderToDOM(container);
      });

      actions.append(actionsLeft, skipBtn);
      card.append(progress, stepTitle, stepDesc, actions);
      tourWrapper.append(card);
    } else if (this.completed) {
      const banner = document.createElement('div');
      banner.className = 'museum-tour-completed-banner';
      banner.textContent = '✓ Expedition Tour Completed! You are ready to explore the world.';
      tourWrapper.append(banner);
    }

    container.append(tourWrapper);
  }
}
