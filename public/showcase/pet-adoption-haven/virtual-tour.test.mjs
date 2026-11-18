import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenTourGuide } from './virtual-tour.js';

describe('PetAdoptionHavenTourGuide', () => {
  let guide;

  beforeEach(() => {
    guide = new PetAdoptionHavenTourGuide();
  });

  it('initializes with default pet adoption haven steps', () => {
    const current = guide.startTour();
    assert.ok(current);
    assert.equal(current.id, 'pet-matcher');
    assert.equal(guide.isCompleted(), false);
  });

  it('clamps navigation within step boundaries and completes on last step', () => {
    guide.startTour();

    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);

    const step1 = guide.nextStep();
    assert.equal(step1.id, 'health-records');
    assert.equal(guide.currentStepIndex, 1);

    guide.nextStep(); // step 2
    guide.nextStep(); // step 3 (last step)
    assert.equal(guide.currentStepIndex, 3);

    const result = guide.nextStep();
    assert.equal(result, null);
    assert.equal(guide.isCompleted(), true);
  });

  it('calculates tooltip coordinates with viewport collision avoidance', () => {
    const mockTarget = {
      getBoundingClientRect: () => ({
        top: 680,
        left: 820,
        width: 140,
        height: 70,
        bottom: 750,
        right: 960
      })
    };

    const coords = guide.calculateTooltipCoords(mockTarget, 300, 150, { width: 1024, height: 768 });

    // Target bottom 750 + 150 > 768, must flip above
    assert.ok(coords.top < 680);
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
});
