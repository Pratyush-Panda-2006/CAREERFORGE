import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridTourGuide } from './virtual-tour.js';

describe('RenewableMicrogridTourGuide', () => {
  let guide;

  beforeEach(() => {
    guide = new RenewableMicrogridTourGuide();
  });

  it('initializes with default renewable microgrid steps', () => {
    const current = guide.startTour();
    assert.ok(current);
    assert.equal(current.id, 'solar-telemetry');
    assert.equal(guide.isCompleted(), false);
  });

  it('clamps navigation within step boundaries and completes on last step', () => {
    guide.startTour();

    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);

    const step1 = guide.nextStep();
    assert.equal(step1.id, 'wind-turbine');
    assert.equal(guide.currentStepIndex, 1);

    guide.nextStep();
    guide.nextStep();
    assert.equal(guide.currentStepIndex, 3);

    const result = guide.nextStep();
    assert.equal(result, null);
    assert.equal(guide.isCompleted(), true);
  });

  it('calculates tooltip coordinates with viewport collision avoidance', () => {
    const mockTarget = {
      getBoundingClientRect: () => ({
        top: 650,
        left: 800,
        width: 150,
        height: 80,
        bottom: 730,
        right: 950
      })
    };

    const coords = guide.calculateTooltipCoords(mockTarget, 300, 150, { width: 1024, height: 768 });

    assert.ok(coords.top < 650);
    assert.ok(coords.left <= 708);
  });

  it('allows skipping and finishes tour cleanly', () => {
    guide.startTour();
    assert.equal(guide.isActive, true);

    guide.skipTour();
    assert.equal(guide.isActive, false);
    assert.equal(guide.getCurrentStep(), null);
  });
});
