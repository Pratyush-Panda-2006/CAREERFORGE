import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubTourGuide } from './virtual-tour.js';

describe('StreamingCinemaHubTourGuide', () => {
  it('initializes with default cinema tour steps and inactive state', () => {
    const guide = new StreamingCinemaHubTourGuide();
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), false);
    assert.equal(guide.steps.length, 4);
    assert.equal(guide.steps[0].id, 'video-player');
  });

  it('starts tour and advances through steps correctly', () => {
    const guide = new StreamingCinemaHubTourGuide();
    const firstStep = guide.startTour();
    assert.equal(guide.isActive, true);
    assert.equal(firstStep.id, 'video-player');

    const step2 = guide.nextStep();
    assert.equal(step2.id, 'audio-engine');

    const step1 = guide.prevStep();
    assert.equal(step1.id, 'video-player');
  });

  it('clamps at first step when previous is called at index 0', () => {
    const guide = new StreamingCinemaHubTourGuide();
    guide.startTour();
    const step = guide.prevStep();
    assert.equal(step.id, 'video-player');
    assert.equal(guide.currentStepIndex, 0);
  });

  it('completes tour on last step next call and marks completion flag', () => {
    const guide = new StreamingCinemaHubTourGuide();
    guide.startTour();
    guide.nextStep(); // step 2
    guide.nextStep(); // step 3
    guide.nextStep(); // step 4
    const finishResult = guide.nextStep();

    assert.equal(finishResult, null);
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), true);
  });

  it('calculates tooltip coordinates within viewport constraints and collision checks', () => {
    const guide = new StreamingCinemaHubTourGuide();
    const mockEl = {
      getBoundingClientRect: () => ({
        top: 200,
        left: 400,
        width: 150,
        height: 80,
        bottom: 280,
        right: 550
      })
    };

    const coords = guide.calculateTooltipCoords(mockEl, 300, 150, { width: 1200, height: 800 });
    assert.equal(typeof coords.top, 'number');
    assert.equal(typeof coords.left, 'number');
    assert.equal(coords.top, 292); // 280 + 12
    assert.equal(coords.left, 325); // 400 + 75 - 150
  });

  it('adjusts tooltip position upward when bottom overflow occurs', () => {
    const guide = new StreamingCinemaHubTourGuide();
    const mockEl = {
      getBoundingClientRect: () => ({
        top: 700,
        left: 300,
        width: 100,
        height: 50,
        bottom: 750,
        right: 400
      })
    };

    const coords = guide.calculateTooltipCoords(mockEl, 200, 100, { width: 1000, height: 800 });
    // 750 + 12 + 100 = 862 > 800, so flips to top - height - 12 = 700 - 100 - 12 = 588
    assert.equal(coords.top, 588);
  });
});
