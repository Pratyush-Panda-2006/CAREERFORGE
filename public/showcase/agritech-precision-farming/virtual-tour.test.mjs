import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingTourGuide } from './virtual-tour.js';

describe('AgritechPrecisionFarmingTourGuide', () => {
  let guide;

  beforeEach(() => {
    guide = new AgritechPrecisionFarmingTourGuide();
  });

  it('initializes with default precision agriculture steps', () => {
    const current = guide.startTour();
    assert.ok(current);
    assert.equal(current.id, 'soil-sensors');
    assert.equal(guide.isCompleted(), false);
  });

  it('clamps navigation within step boundaries and completes on last step', () => {
    guide.startTour();

    // Cannot go back from step 0
    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);

    // Advance through steps
    const step1 = guide.nextStep();
    assert.equal(step1.id, 'irrigation-control');
    assert.equal(guide.currentStepIndex, 1);

    guide.nextStep(); // step 2
    guide.nextStep(); // step 3 (last step)
    assert.equal(guide.currentStepIndex, 3);

    // Next step on last item completes the tour
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

    // Viewport 1024x768
    const coords = guide.calculateTooltipCoords(mockTarget, 300, 150, { width: 1024, height: 768 });

    // Target bottom 730 + 150 > 768, so tooltip must flip above target
    assert.ok(coords.top < 650);

    // Left coordinate must be clamped inside viewport (<= 1024 - 300 - 16 = 708)
    assert.ok(coords.left <= 708);
    assert.ok(coords.left >= 16);
  });

  it('handles skipTour correctly', () => {
    guide.startTour();
    assert.equal(guide.isActive, true);

    guide.skipTour();
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), false);
  });

  it('notifies subscribers on step change', () => {
    let callCount = 0;
    guide.subscribe(() => {
      callCount++;
    });

    guide.startTour();
    guide.nextStep();
    assert.equal(callCount, 2);
  });
});
