import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterTourGuide } from './virtual-tour.js';

describe('AerospaceOrbiterTourGuide', () => {
  it('initializes with default telemetry and control tour steps', () => {
    const tour = new AerospaceOrbiterTourGuide();
    assert.equal(tour.currentStepIndex, 0);
    assert.equal(tour.getCurrentStep().id, 'telemetry');
  });

  it('steps through onboarding stages and marks completion', () => {
    const tour = new AerospaceOrbiterTourGuide();
    const step2 = tour.nextStep();
    assert.equal(step2.id, 'thrusters');
    const step3 = tour.nextStep();
    assert.equal(step3.id, 'navmap');
    const end = tour.nextStep();
    assert.equal(end, null);
    assert.equal(tour.completed, true);
  });

  it('calculates tooltip anchor coordinates with viewport safety margins', () => {
    const tour = new AerospaceOrbiterTourGuide();
    const mockRect = { x: 100, y: 50, width: 200, height: 40 };
    const coords = tour.calculateTooltipCoords(mockRect, 200, 80);
    assert.equal(coords.x, 100);
    assert.equal(coords.y, 100);
    assert.equal(coords.placement, 'bottom');
  });
});
