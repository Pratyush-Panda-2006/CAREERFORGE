/**
 * BiotechGenomicsTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for Biotech Genomics.
 * Coordinates step navigation, calculates viewport tooltip anchors, and persists completion state.
 */
export class BiotechGenomicsTourGuide {
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
    "id": "step-sequence-viewer",
    "selector": "#sequence-viewer",
    "title": "DNA/RNA Sequence Visualizer",
    "description": "Inspect high-throughput FASTQ and BAM alignment tracks in real time."
  },
  {
    "id": "step-variant-matrix",
    "selector": "#variant-matrix",
    "title": "Variant Impact Filter",
    "description": "Filter single nucleotide polymorphisms by ClinVar pathogenicity ratings."
  },
  {
    "id": "step-crispr-designer",
    "selector": "#crispr-designer",
    "title": "CRISPR Guide Targeter",
    "description": "Calibrate Cas9 on-target cutting efficiency and off-target cleavage scores."
  },
  {
    "id": "step-phylogeny-tree",
    "selector": "#phylogeny-tree",
    "title": "Phylogenetic Tree Reconstruction",
    "description": "Synthesize evolutionary distance trees from genomic MSA matrices."
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
      left: Math.round(left),
      targetRect
    };
  }

  subscribe(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== callback);
    };
  }

  notify() {
    const current = this.getCurrentStep();
    const payload = {
      isActive: this.isActive,
      completed: this.completed,
      stepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
      currentStep: current
    };
    this.listeners.forEach((fn) => fn(payload));
  }

  renderToDOM(container) {
    if (!container) return;
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'biotech-genomics-tour-container';

    const header = document.createElement('div');
    header.className = 'biotech-genomics-tour-header';
    header.innerHTML = `
      <h3>🧭 Biotech Genomics - Guided Feature Tour</h3>
      <div class="biotech-genomics-tour-status-badge ${this.isActive ? 'active' : ''}">
        ${this.isActive ? `Step ${this.currentStepIndex + 1} of ${this.steps.length}` : (this.completed ? 'Tour Completed' : 'Tour Ready')}
      </div>
    `;

    const card = document.createElement('div');
    card.className = 'biotech-genomics-tour-card';

    const current = this.getCurrentStep();
    if (this.isActive && current) {
      card.innerHTML = `
        <div class="biotech-genomics-tour-step-indicator">Step ${this.currentStepIndex + 1} / ${this.steps.length}</div>
        <h4 class="biotech-genomics-tour-step-title">${current.title}</h4>
        <p class="biotech-genomics-tour-step-desc">${current.description}</p>
      `;

      const actions = document.createElement('div');
      actions.className = 'biotech-genomics-tour-actions';

      const skipBtn = document.createElement('button');
      skipBtn.className = 'biotech-genomics-tour-btn biotech-genomics-tour-btn-ghost';
      skipBtn.textContent = 'Skip Tour';
      skipBtn.addEventListener('click', () => {
        this.skipTour();
        this.renderToDOM(container);
      });

      const btnGroup = document.createElement('div');
      btnGroup.className = 'biotech-genomics-tour-btn-group';

      if (this.currentStepIndex > 0) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'biotech-genomics-tour-btn biotech-genomics-tour-btn-secondary';
        prevBtn.textContent = 'Previous';
        prevBtn.addEventListener('click', () => {
          this.prevStep();
          this.renderToDOM(container);
        });
        btnGroup.appendChild(prevBtn);
      }

      const nextBtn = document.createElement('button');
      nextBtn.className = 'biotech-genomics-tour-btn biotech-genomics-tour-btn-primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish Tour' : 'Next Step';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });
      btnGroup.appendChild(nextBtn);

      actions.appendChild(skipBtn);
      actions.appendChild(btnGroup);
      card.appendChild(actions);
    } else {
      card.innerHTML = `
        <h4 class="biotech-genomics-tour-step-title">${this.completed ? 'Onboarding Tour Finished! 🎉' : 'Explore Feature Spotlight'}</h4>
        <p class="biotech-genomics-tour-step-desc">${this.completed ? 'You have completed all guided steps for Biotech Genomics. Re-launch anytime below.' : 'Take an interactive step-by-step walkthrough of interface features and workflows.'}</p>
      `;

      const startBtn = document.createElement('button');
      startBtn.className = 'biotech-genomics-tour-btn biotech-genomics-tour-btn-primary';
      startBtn.textContent = this.completed ? 'Restart Tour' : 'Start Guided Tour';
      startBtn.addEventListener('click', () => {
        this.startTour();
        this.renderToDOM(container);
      });
      card.appendChild(startBtn);
    }

    wrapper.appendChild(header);
    wrapper.appendChild(card);
    container.appendChild(wrapper);
  }
}
