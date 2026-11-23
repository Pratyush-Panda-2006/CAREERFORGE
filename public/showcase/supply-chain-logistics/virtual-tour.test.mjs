import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsTourGuide } from './virtual-tour.js';

describe('SupplyChainLogisticsTourGuide', () => {
  it('initializes with default tour steps and inactive state', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    assert.equal(guide.isActive, false);
    assert.equal(guide.completed, false);
    assert.equal(guide.steps.length, 4);
    assert.equal(guide.getCurrentStep(), null);
  });

  it('starts tour and advances through steps correctly', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    const firstStep = guide.startTour();

    assert.equal(guide.isActive, true);
    assert.ok(firstStep);
    assert.equal(guide.currentStepIndex, 0);

    const secondStep = guide.nextStep();
    assert.equal(guide.currentStepIndex, 1);
    assert.ok(secondStep);
  });

  it('clamps at first step when previous is called at index 0', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    guide.startTour();
    assert.equal(guide.currentStepIndex, 0);

    guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);
  });

  it('completes tour on last step next call and marks completion flag', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    guide.startTour();
    guide.nextStep();
    guide.nextStep();
    guide.nextStep();
    assert.equal(guide.currentStepIndex, 3);

    const finishResult = guide.nextStep();
    assert.equal(finishResult, null);
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), true);
  });

  it('calculates tooltip coordinates within viewport constraints and collision checks', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    const mockEl = {
      getBoundingClientRect: () => ({
        top: 200,
        left: 300,
        width: 150,
        height: 80,
        bottom: 280,
        right: 450
      })
    };

    const coords = guide.calculateTooltipCoords(mockEl, 300, 150, { width: 1024, height: 768 });
    assert.ok(coords.top > 0);
    assert.ok(coords.left > 0);
    assert.ok(coords.left + 300 <= 1024);
  });

  it('adjusts tooltip position upward when bottom overflow occurs', () => {
    const guide = new SupplyChainLogisticsTourGuide();
    const mockBottomEl = {
      getBoundingClientRect: () => ({
        top: 700,
        left: 200,
        width: 100,
        height: 50,
        bottom: 750,
        right: 300
      })
    };

    const coords = guide.calculateTooltipCoords(mockBottomEl, 250, 120, { width: 1000, height: 800 });
    assert.ok(coords.top < 700);
  });
});
