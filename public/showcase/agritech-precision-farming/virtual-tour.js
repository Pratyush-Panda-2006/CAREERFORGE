/**
 * AgritechPrecisionFarmingTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for precision farming IoT sensors, irrigation controls, and aerial NDVI maps.
 */
export class AgritechPrecisionFarmingTourGuide {
  constructor(options = {}) {
    this.steps = options.steps || this.getDefaultSteps();
    this.currentStepIndex = 0;
    this.isActive = false;
    this.completed = false;
    this.storageKey = options.storageKey || 'agri_tour_completed';
    this.listeners = [];
  }

  getDefaultSteps() {
    return [
      {
        id: 'soil-sensors',
        selector: '#soil-sensor-card',
        title: 'IoT Soil Probes & NPK Sensors',
        description: 'Monitors real-time nitrogen, phosphorus, potassium, and soil moisture tension across farm management zones.'
      },
      {
        id: 'irrigation-control',
        selector: '#irrigation-controller',
        title: 'Autonomous Drip Irrigation Valve',
        description: 'Regulates precision water distribution schedules modulated by solar irradiance and evapotranspiration rates.'
      },
      {
        id: 'ndvi-mapping',
        selector: '#crop-health-map',
        title: 'Hyperspectral NDVI Crop Health Map',
        description: 'Ingests drone and satellite imagery to calculate normalized difference vegetation index anomalies.'
      },
      {
        id: 'yield-forecasting',
        selector: '#yield-predictor',
        title: 'AI Harvest Yield Predictor',
        description: 'Predicts crop harvest yield metrics per hectare using localized microclimate machine learning models.'
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

    // Default position: below target centered
    let top = targetRect.bottom + 12;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);

    // Collision avoidance: if overflows bottom, place above
    if (top + tooltipHeight > viewport.height) {
      top = targetRect.top - tooltipHeight - 12;
    }

    // Horizontal clamping
    if (left < 16) {
      left = 16;
    } else if (left + tooltipWidth > viewport.width - 16) {
      left = viewport.width - tooltipWidth - 16;
    }

    // Vertical clamping
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
    tourWrapper.className = 'agri-tour-container';

    const header = document.createElement('div');
    header.className = 'agri-tour-header';

    const title = document.createElement('h3');
    title.textContent = 'Agritech Feature Spotlight & Guided Tour';

    const startBtn = document.createElement('button');
    startBtn.className = 'agri-tour-start-btn';
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
      card.className = 'agri-tour-card';

      const progress = document.createElement('div');
      progress.className = 'agri-tour-progress';
      progress.textContent = `Step ${this.currentStepIndex + 1} of ${this.steps.length}`;

      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;

      const stepDesc = document.createElement('p');
      stepDesc.textContent = step.description;

      const controls = document.createElement('div');
      controls.className = 'agri-tour-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'agri-tour-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = this.currentStepIndex === 0;
      prevBtn.addEventListener('click', () => {
        this.prevStep();
        this.renderToDOM(container);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'agri-tour-btn primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });

      const skipBtn = document.createElement('button');
      skipBtn.className = 'agri-tour-btn text';
      skipBtn.textContent = 'Skip';
      skipBtn.addEventListener('click', () => {
        this.skipTour();
        this.renderToDOM(container);
      });

      controls.append(prevBtn, nextBtn, skipBtn);
      card.append(progress, stepTitle, stepDesc, controls);
      tourWrapper.append(card);
    } else if (this.completed) {
      const finishMsg = document.createElement('div');
      finishMsg.className = 'agri-tour-finished';
      finishMsg.textContent = 'You have completed the Agritech Precision Farming tour!';
      tourWrapper.append(finishMsg);
    }

    container.append(tourWrapper);
  }
}
