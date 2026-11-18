/**
 * DroneDeliverySkywayTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for autonomous drone delivery fleets, skyway corridors, and vertiport telemetry.
 */
export class DroneDeliverySkywayTourGuide {
  constructor(options = {}) {
    this.steps = options.steps || this.getDefaultSteps();
    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.listeners = [];
  }

  getDefaultSteps() {
    return [
      {
        id: 'flight-radar',
        selector: '#flight-radar-card',
        title: 'Airspace Fleet Radar & UTM Tracking',
        description: 'Monitor active multi-rotor delivery UAVs, ADS-B transponder pings, and urban low-altitude flight corridors in real time.'
      },
      {
        id: 'battery-hub',
        selector: '#battery-hub-card',
        title: 'Automated Battery Swapping & Charging Port',
        description: 'Track lithium-polymer thermal degradation, autonomous charging bay queues, and rapid battery swap cycle latency.'
      },
      {
        id: 'payload-bay',
        selector: '#payload-bay-card',
        title: 'Smart Payload Winch & Cargo Lock',
        description: 'Inspect package tether cable tension, drop-zone ultrasonic altimeter sensors, and anti-tamper electronic cargo latches.'
      },
      {
        id: 'telemetry-stream',
        selector: '#telemetry-card',
        title: '5G Real-Time Telemetry & Geofence Corridor',
        description: 'Audit micro-weather gusts, dynamic no-fly zones, and encrypted ground control station fail-safe abort sequences.'
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
    tourWrapper.className = 'drone-tour-container';

    const header = document.createElement('div');
    header.className = 'drone-tour-header';

    const title = document.createElement('h3');
    title.textContent = 'Skyway Drone Fleet Feature Spotlight & Tour';

    const startBtn = document.createElement('button');
    startBtn.className = 'drone-tour-start-btn';
    startBtn.textContent = this.isActive ? 'Restart Tour' : 'Start Skyway Tour';
    startBtn.addEventListener('click', () => {
      this.startTour();
      this.renderToDOM(container);
    });

    header.append(title, startBtn);
    tourWrapper.append(header);

    if (this.isActive) {
      const step = this.getCurrentStep();
      const card = document.createElement('div');
      card.className = 'drone-tour-card';

      const progress = document.createElement('div');
      progress.className = 'drone-tour-progress';
      progress.textContent = `Skyway Step ${this.currentStepIndex + 1} of ${this.steps.length}`;

      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;

      const stepDesc = document.createElement('p');
      stepDesc.textContent = step.description;

      const controls = document.createElement('div');
      controls.className = 'drone-tour-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'drone-tour-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = this.currentStepIndex === 0;
      prevBtn.addEventListener('click', () => {
        this.prevStep();
        this.renderToDOM(container);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'drone-tour-btn primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });

      const skipBtn = document.createElement('button');
      skipBtn.className = 'drone-tour-btn link';
      skipBtn.textContent = 'Skip';
      skipBtn.addEventListener('click', () => {
        this.skipTour();
        this.renderToDOM(container);
      });

      controls.append(prevBtn, nextBtn, skipBtn);

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'drone-tour-dots';
      this.steps.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `drone-tour-dot ${idx === this.currentStepIndex ? 'active' : ''}`;
        dotsContainer.append(dot);
      });

      card.append(progress, stepTitle, stepDesc, dotsContainer, controls);
      tourWrapper.append(card);
    } else if (this.completed) {
      const completionCard = document.createElement('div');
      completionCard.className = 'drone-tour-completion';
      completionCard.textContent = '✓ Skyway Drone Fleet Tour Completed! You are ready to dispatch delivery UAVs.';
      tourWrapper.append(completionCard);
    }

    container.append(tourWrapper);
  }
}
