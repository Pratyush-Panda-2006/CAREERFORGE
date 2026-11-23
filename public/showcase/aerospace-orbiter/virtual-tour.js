/**
 * Aerospace Orbiter - Interactive Feature Spotlight Onboarding & Guided Tour Controller
 */

export class AerospaceOrbiterTourGuide {
  constructor(steps = null) {
    this.steps = steps || [
      { id: 'telemetry', title: 'Orbital Telemetry', target: '#telemetryPanel', description: 'Monitor live orbital speed, altitude, and inclination.' },
      { id: 'thrusters', title: 'RCS Thruster Controls', target: '#rcsControls', description: 'Fire reaction control thrusters for attitude adjustment.' },
      { id: 'navmap', title: 'Orbital Trajectory Map', target: '#orbitMap', description: 'View real-time apogee, perigee, and orbital nodes.' }
    ];
    this.currentStepIndex = 0;
    this.completed = false;
  }

  getCurrentStep() {
    return this.steps[this.currentStepIndex] || null;
  }

  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      return this.getCurrentStep();
    }
    this.completed = true;
    return null;
  }

  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      return this.getCurrentStep();
    }
    return this.getCurrentStep();
  }

  calculateTooltipCoords(targetRect, tooltipWidth = 220, tooltipHeight = 90) {
    // Center horizontally relative to target element
    const x = targetRect.x + targetRect.width / 2 - tooltipWidth / 2;
    // Position below target element with 10px spacing
    const y = targetRect.y + targetRect.height + 10;
    
    return {
      x: Math.max(10, Math.round(x)),
      y: Math.max(10, Math.round(y)),
      placement: 'bottom'
    };
  }

  reset() {
    this.currentStepIndex = 0;
    this.completed = false;
  }
}
