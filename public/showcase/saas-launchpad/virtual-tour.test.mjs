import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadTourGuide } from './virtual-tour.js';

describe('SaasLaunchpadTourGuide (SaaS Launchpad Feature Spotlight)', () => {
  let guide;
  let mockStorage;
  let storageStore;

  beforeEach(() => {
    storageStore = {};
    mockStorage = {
      getItem: (key) => storageStore[key] ?? null,
      setItem: (key, val) => {
        storageStore[key] = String(val);
      },
      removeItem: (key) => {
        delete storageStore[key];
      }
    };
    guide = new SaasLaunchpadTourGuide({ storage: mockStorage });
  });

  it('initializes with default SaaS launchpad steps and inactive posture', () => {
    assert.equal(guide.name, 'SaasLaunchpadTourGuide');
    assert.equal(guide.isActive, false);
    assert.equal(guide.completed, false);
    assert.ok(Array.isArray(guide.steps));
    assert.equal(guide.steps.length, 4);
    assert.equal(guide.getCurrentStep(), null);

    const step0 = guide.startTour();
    assert.ok(step0);
    assert.equal(step0.id, 'metrics-analytics');
    assert.equal(guide.isActive, true);
  });

  it('clamps step boundaries on backward and forward navigation', () => {
    guide.startTour();
    assert.equal(guide.currentStepIndex, 0);

    // Clamps at index 0 on prevStep
    const prevAtZero = guide.prevStep();
    assert.equal(guide.currentStepIndex, 0);
    assert.equal(prevAtZero.id, 'metrics-analytics');

    // Advances step-by-step
    const step1 = guide.nextStep();
    assert.equal(guide.currentStepIndex, 1);
    assert.equal(step1.id, 'uptime-monitor');

    const step2 = guide.nextStep();
    assert.equal(guide.currentStepIndex, 2);
    assert.equal(step2.id, 'anomaly-detector');

    const step3 = guide.nextStep();
    assert.equal(guide.currentStepIndex, 3);
    assert.equal(step3.id, 'billing-tiers');

    // Prev step moves backward from step 3 to step 2
    const backTo2 = guide.prevStep();
    assert.equal(guide.currentStepIndex, 2);
    assert.equal(backTo2.id, 'anomaly-detector');
  });

  it('completes tour on final step and persists completion flag', () => {
    guide.startTour();
    guide.nextStep(); // 1
    guide.nextStep(); // 2
    guide.nextStep(); // 3 (billing-tiers)
    assert.equal(guide.currentStepIndex, 3);

    // Advancing past final step triggers finishTour
    const finishResult = guide.nextStep();
    assert.equal(finishResult, null);
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), true);

    // Verify storage persistence
    assert.equal(storageStore['saas_launchpad_tour_completed'], 'true');
    assert.equal(guide.getPersistedCompletion(), true);

    // Creating a new instance with this storage initializes completed to true
    const secondGuide = new SaasLaunchpadTourGuide({ storage: mockStorage });
    assert.equal(secondGuide.completed, true);
    assert.equal(secondGuide.getPersistedCompletion(), true);
  });

  it('calculates tooltip coordinates and handles bottom viewport collision avoidance', () => {
    // Target near bottom of viewport: top 680, bottom 750 in 1024x768 viewport
    const bottomTarget = {
      getBoundingClientRect: () => ({
        top: 680,
        left: 350,
        width: 200,
        height: 70,
        bottom: 750,
        right: 550
      })
    };

    const coords = guide.calculateTooltipCoords(bottomTarget, 320, 180, { width: 1024, height: 768 });

    // Since 750 + 12 + 180 = 942 > 768, tooltip must flip above target
    assert.equal(coords.placement, 'top');
    assert.ok(coords.top < 680);
    assert.ok(coords.top >= 16);
  });

  it('clamps tooltip horizontal and vertical coordinates within safe viewport margins', () => {
    // Target overflowing left boundary
    const leftTarget = {
      getBoundingClientRect: () => ({
        top: 100,
        left: -50,
        width: 100,
        height: 50,
        bottom: 150,
        right: 50
      })
    };
    const leftCoords = guide.calculateTooltipCoords(leftTarget, 320, 180, { width: 1024, height: 768 });
    assert.equal(leftCoords.left, 16);

    // Target overflowing right boundary
    const rightTarget = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 950,
        width: 100,
        height: 50,
        bottom: 150,
        right: 1050
      })
    };
    const rightCoords = guide.calculateTooltipCoords(rightTarget, 320, 180, { width: 1024, height: 768 });
    assert.equal(rightCoords.left, 1024 - 320 - 16); // 688
  });

  it('supports skipTour and leaves completion flag false', () => {
    guide.startTour();
    assert.equal(guide.isActive, true);

    const skipResult = guide.skipTour();
    assert.equal(skipResult, null);
    assert.equal(guide.isActive, false);
    assert.equal(guide.isCompleted(), false);
    assert.equal(guide.getPersistedCompletion(), false);
  });

  it('notifies subscribers upon tour transitions and step changes', () => {
    const events = [];
    const unsubscribe = guide.subscribe((payload) => {
      events.push(payload);
    });

    guide.startTour();
    guide.nextStep();
    guide.prevStep();
    guide.skipTour();

    assert.equal(events.length, 4);
    assert.equal(events[0].stepIndex, 0);
    assert.equal(events[1].stepIndex, 1);
    assert.equal(events[2].stepIndex, 0);
    assert.equal(events[3].isActive, false);

    unsubscribe();
    guide.startTour();
    // No new events pushed after unsubscribe
    assert.equal(events.length, 4);
  });

  it('allows custom steps override on startTour', () => {
    const customSteps = [
      { id: 'custom-1', selector: '#c1', title: 'Custom 1', description: 'Desc 1' },
      { id: 'custom-2', selector: '#c2', title: 'Custom 2', description: 'Desc 2' }
    ];

    const firstStep = guide.startTour(customSteps);
    assert.equal(guide.steps.length, 2);
    assert.equal(firstStep.id, 'custom-1');

    const secondStep = guide.nextStep();
    assert.equal(secondStep.id, 'custom-2');

    const finished = guide.nextStep();
    assert.equal(finished, null);
    assert.equal(guide.isCompleted(), true);
  });
});
