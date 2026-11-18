import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsTourGuide } from './virtual-tour.js';

describe('LegalSmartContractsTourGuide', () => {
  let guide;

  beforeEach(() => {
    guide = new LegalSmartContractsTourGuide();
  });

  it('initializes with default smart legal contract steps', () => {
    const current = guide.startTour();
    assert.ok(current);
    assert.equal(current.id, 'escrow-vault');
    assert.equal(guide.isCompleted(), false);
  });

  it('clamps navigation within step boundaries and completes on last step', () => {
    guide.startTour();

    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);

    const step1 = guide.nextStep();
    assert.equal(step1.id, 'clause-compiler');
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
        top: 700,
        left: 850,
        width: 120,
        height: 60,
        bottom: 760,
        right: 970
      })
    };

    const coords = guide.calculateTooltipCoords(mockTarget, 300, 150, { width: 1024, height: 768 });

    // Target bottom 760 overflows 768, must flip above
    assert.ok(coords.top < 700);
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
