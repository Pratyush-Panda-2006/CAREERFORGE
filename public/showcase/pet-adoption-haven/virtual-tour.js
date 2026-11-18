/**
 * PetAdoptionHavenTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for rescue pet matching, foster health records, and shelter intake coordination.
 */
export class PetAdoptionHavenTourGuide {
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
        id: 'pet-matcher',
        selector: '#matcher-card',
        title: 'Rescue Pet Compatibility Matcher',
        description: 'Filters adoptable companions based on living space, activity temperament, and household compatibility.'
      },
      {
        id: 'health-records',
        selector: '#records-card',
        title: 'Foster Health & Vaccination Vault',
        description: 'Examines verified veterinarian immunizations, spay/neuter certifications, and dietary care profiles.'
      },
      {
        id: 'shelter-transport',
        selector: '#transport-card',
        title: 'Community Shelter Intake & Transport',
        description: 'Coordinates rescue volunteer transport routes and incoming shelter medical quarantine schedules.'
      },
      {
        id: 'adoption-app',
        selector: '#adoption-card',
        title: 'Instant Adoption Application Portal',
        description: 'Submits digital adoption applications with landlord approvals and background reference verifications.'
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
    tourWrapper.className = 'pet-tour-container';

    const header = document.createElement('div');
    header.className = 'pet-tour-header';

    const title = document.createElement('h3');
    title.textContent = 'Pet Adoption Haven Spotlight & Tour';

    const startBtn = document.createElement('button');
    startBtn.className = 'pet-tour-start-btn';
    startBtn.textContent = this.isActive ? 'Restart Tour' : 'Start Haven Tour';
    startBtn.addEventListener('click', () => {
      this.startTour();
      this.renderToDOM(container);
    });

    header.append(title, startBtn);
    tourWrapper.append(header);

    if (this.isActive) {
      const step = this.getCurrentStep();
      const card = document.createElement('div');
      card.className = 'pet-tour-card';

      const progress = document.createElement('div');
      progress.className = 'pet-tour-progress';
      progress.textContent = `Haven Step ${this.currentStepIndex + 1} of ${this.steps.length}`;

      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;

      const stepDesc = document.createElement('p');
      stepDesc.textContent = step.description;

      const controls = document.createElement('div');
      controls.className = 'pet-tour-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'pet-tour-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = this.currentStepIndex === 0;
      prevBtn.addEventListener('click', () => {
        this.prevStep();
        this.renderToDOM(container);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'pet-tour-btn primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });

      const skipBtn = document.createElement('button');
      skipBtn.className = 'pet-tour-btn text';
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
      finishMsg.className = 'pet-tour-finished';
      finishMsg.textContent = 'You have completed the Pet Adoption Haven tour! Ready to meet your new companion? 🐾';
      tourWrapper.append(finishMsg);
    }

    container.append(tourWrapper);
  }
}
