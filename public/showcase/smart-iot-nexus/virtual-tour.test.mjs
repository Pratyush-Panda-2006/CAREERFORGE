import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusTourGuide } from './virtual-tour.js';

test('SmartIotNexusTourGuide - clamps step boundaries during forward and backward navigation', () => {
  const guide = new SmartIotNexusTourGuide({
    steps: [
      { id: 'step-1', title: 'Step 1' },
      { id: 'step-2', title: 'Step 2' },
      { id: 'step-3', title: 'Step 3' }
    ]
  });

  guide.startTour();
  assert.strictEqual(guide.currentStepIndex, 0);

  // Clamping at zero index
  guide.prevStep();
  assert.strictEqual(guide.currentStepIndex, 0);

  // Advance to step 2
  guide.nextStep();
  assert.strictEqual(guide.currentStepIndex, 1);

  // Advance to step 3 (final)
  guide.nextStep();
  assert.strictEqual(guide.currentStepIndex, 2);

  // Calling next on final step completes the tour and clamps
  guide.nextStep();
  assert.strictEqual(guide.completed, true);
  assert.strictEqual(guide.isActive, false);
});

test('SmartIotNexusTourGuide - detects viewport bottom collision and flips placement to top', () => {
  const guide = new SmartIotNexusTourGuide();

  // Target positioned at y = 680 in a 768px height viewport
  const targetNearBottom = { top: 680, left: 200, width: 150, height: 40 };
  const tooltipSize = { width: 300, height: 160 };
  const viewport = { width: 1024, height: 768 };

  const coords = guide.calculateTooltipCoords(targetNearBottom, tooltipSize, viewport, 'bottom');

  // Should flip to top because 680 + 40 + 14 + 160 = 894px > 768px
  assert.strictEqual(coords.placement, 'top');
  assert.strictEqual(coords.top < targetNearBottom.top, true);
  assert.strictEqual(coords.top >= 16, true);
});

test('SmartIotNexusTourGuide - detects viewport top collision and flips placement to bottom', () => {
  const guide = new SmartIotNexusTourGuide();

  // Target positioned at y = 30 in a 768px height viewport
  const targetNearTop = { top: 30, left: 200, width: 150, height: 40 };
  const tooltipSize = { width: 300, height: 160 };
  const viewport = { width: 1024, height: 768 };

  const coords = guide.calculateTooltipCoords(targetNearTop, tooltipSize, viewport, 'top');

  // Should flip to bottom because 30 - 160 - 14 = -144px < 16px padding
  assert.strictEqual(coords.placement, 'bottom');
  assert.strictEqual(coords.top > targetNearTop.top, true);
});

test('SmartIotNexusTourGuide - clamps tooltip coordinates to viewport horizontal boundaries', () => {
  const guide = new SmartIotNexusTourGuide();

  // Target positioned near rightmost edge of 1024px screen
  const targetFarRight = { top: 300, left: 950, width: 80, height: 50 };
  const tooltipSize = { width: 320, height: 150 };
  const viewport = { width: 1024, height: 768 };

  const coords = guide.calculateTooltipCoords(targetFarRight, tooltipSize, viewport, 'bottom');

  // Tooltip must not overflow right edge (1024 - 320 - 16 = 688 max left)
  assert.strictEqual(coords.left <= viewport.width - tooltipSize.width - 16, true);
  assert.strictEqual(coords.left >= 16, true);
});

test('SmartIotNexusTourGuide - tracks tour completion and skip state persistence', () => {
  const guide = new SmartIotNexusTourGuide();

  // Test skip
  guide.startTour();
  assert.strictEqual(guide.isActive, true);
  guide.skipTour();
  assert.strictEqual(guide.isActive, false);
  assert.strictEqual(guide.skipped, true);
  assert.strictEqual(guide.completed, false);

  // Test complete
  guide.startTour();
  assert.strictEqual(guide.skipped, false);
  guide.completeTour();
  assert.strictEqual(guide.isActive, false);
  assert.strictEqual(guide.completed, true);
});
