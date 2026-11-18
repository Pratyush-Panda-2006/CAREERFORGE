/**
 * MusicDawStudioTourGuide
 * Interactive feature spotlight onboarding & guided tour controller for digital audio workstation tracks, synthesizer racks, and stem mastering consoles.
 */
export class MusicDawStudioTourGuide {
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
        id: 'piano-roll',
        selector: '#piano-roll-card',
        title: 'Multi-Track MIDI Piano Roll',
        description: 'Sequence melodic patterns, microtonal scale quantizations, and polyphonic MIDI velocity automation.'
      },
      {
        id: 'vst-rack',
        selector: '#vst-rack-card',
        title: 'Analog Synthesizer & DSP Plugin Rack',
        description: 'Chain subtractive oscillators, frequency modulation wavetables, and convolution reverb impulse responses.'
      },
      {
        id: 'mixer-console',
        selector: '#mixer-console-card',
        title: 'Stem Mixer & Sidechain Bus Console',
        description: 'Route 32-channel audio tracks through parametric equalizers, transient shapers, and optical compressors.'
      },
      {
        id: 'mastering-exporter',
        selector: '#exporter-card',
        title: 'Lossless Audio Stems & Mastering Suite',
        description: 'Render broadcast-ready master files in 24-bit 96kHz FLAC and multi-channel stem archives.'
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
    tourWrapper.className = 'daw-tour-container';

    const header = document.createElement('div');
    header.className = 'daw-tour-header';

    const title = document.createElement('h3');
    title.textContent = 'DAW Studio Feature Spotlight & Tour';

    const startBtn = document.createElement('button');
    startBtn.className = 'daw-tour-start-btn';
    startBtn.textContent = this.isActive ? 'Restart Tour' : 'Start Studio Tour';
    startBtn.addEventListener('click', () => {
      this.startTour();
      this.renderToDOM(container);
    });

    header.append(title, startBtn);
    tourWrapper.append(header);

    if (this.isActive) {
      const step = this.getCurrentStep();
      const card = document.createElement('div');
      card.className = 'daw-tour-card';

      const progress = document.createElement('div');
      progress.className = 'daw-tour-progress';
      progress.textContent = `Studio Step ${this.currentStepIndex + 1} of ${this.steps.length}`;

      const stepTitle = document.createElement('h4');
      stepTitle.textContent = step.title;

      const stepDesc = document.createElement('p');
      stepDesc.textContent = step.description;

      const controls = document.createElement('div');
      controls.className = 'daw-tour-controls';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'daw-tour-btn';
      prevBtn.textContent = 'Previous';
      prevBtn.disabled = this.currentStepIndex === 0;
      prevBtn.addEventListener('click', () => {
        this.prevStep();
        this.renderToDOM(container);
      });

      const nextBtn = document.createElement('button');
      nextBtn.className = 'daw-tour-btn primary';
      nextBtn.textContent = this.currentStepIndex === this.steps.length - 1 ? 'Finish' : 'Next';
      nextBtn.addEventListener('click', () => {
        this.nextStep();
        this.renderToDOM(container);
      });

      const skipBtn = document.createElement('button');
      skipBtn.className = 'daw-tour-btn text';
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
      finishMsg.className = 'daw-tour-finished';
      finishMsg.textContent = 'Music DAW Studio tour complete! Ready to produce your track? 🎚️';
      tourWrapper.append(finishMsg);
    }

    container.append(tourWrapper);
  }
}
