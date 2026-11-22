import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsTourGuide } from './virtual-tour.js';

describe('LuxuryRealmsTourGuide', () => {
  let guide;

  beforeEach(() => {
    guide = new LuxuryRealmsTourGuide();
  });

  it('initializes with default robotics steps and inactive posture', () => {
    assert.equal(guide.name, 'LuxuryRealmsTourGuide');
    assert.equal(guide.isActive, false);
    assert.equal(guide.completed, false);
    assert.ok(Array.isArray(guide.steps));
    assert.equal(guide.steps.length, 4);

    const step0 = guide.startTour();
    assert.ok(step0);
    assert.equal(step0.id, 'arm-telemetry');
    assert.equal(guide.isActive, true);
  });

  it('clamps navigation within step boundaries and completes on last step', () => {
    guide.startTour();

    // Cannot navigate backwards beyond step 0
    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);

    // Forward through all steps
    const step1 = guide.nextStep();
    assert.equal(step1.id, 'sensor-fusion');
    assert.equal(guide.currentStepIndex, 1);

    const step2 = guide.nextStep();
    assert.equal(step2.id, 'motion-planner');
    assert.equal(guide.currentStepIndex, 2);

    const step3 = guide.nextStep();
    assert.equal(step3.id, 'safety-interlock');
    assert.equal(guide.currentStepIndex, 3);

    // Final step finishes the tour
    const finishResult = guide.nextStep();
    assert.equal(finishResult, null);
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), true);
  });

  it('calculates tooltip coordinates with viewport collision avoidance', () => {
    const mockTarget = {
      getBoundingClientRect: () => ({
        top: 660,
        left: 820,
        width: 160,
        height: 80,
        bottom: 740,
        right: 980
      })
    };

    // Viewport 1024x768
    const coords = guide.calculateTooltipCoords(mockTarget, 300, 160, { width: 1024, height: 768 });

    // Target bottom 740 + 160 > 768 => tooltip must flip above target
    assert.ok(coords.top < 660);

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

  it('notifies subscribers on step transitions', () => {
    let notifiedStep = null;
    guide.subscribe((step) => {
      notifiedStep = step;
    });

    guide.startTour();
    assert.equal(notifiedStep.id, 'arm-telemetry');

    guide.nextStep();
    assert.equal(notifiedStep.id, 'sensor-fusion');
  });
});
