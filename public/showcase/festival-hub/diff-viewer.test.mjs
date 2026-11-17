import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubDiffInspector } from './diff-viewer.js';

test('FestivalHubDiffInspector calculates zero-change idempotency', () => {
  const text = 'Line 1: Festival Lineup\nLine 2: Main Stage at 8PM\nLine 3: Gates Close at 2AM';
  const inspector = new FestivalHubDiffInspector();
  const diffs = inspector.computeDiff(text, text);

  assert.equal(diffs.length, 3);
  assert.ok(diffs.every(d => d.type === 'equal'));

  const metrics = inspector.getChangeMetrics();
  assert.equal(metrics.additions, 0);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 3);
  assert.equal(metrics.changePercentage, 0);
});

test('detects line insertions accurately', () => {
  const original = 'Acoustic Tent\nFood Court';
  const modified = 'Acoustic Tent\nVIP Lounge\nFood Court';

  const inspector = new FestivalHubDiffInspector({ original, modified });
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.additions, 1);
  assert.equal(metrics.deletions, 0);
  assert.equal(metrics.unchanged, 2);

  const unified = inspector.generateUnifiedView();
  assert.ok(unified.includes('+ VIP Lounge'));
});

test('detects line deletions and modifications correctly', () => {
  const original = 'Gate 1 Open\nFireworks 10PM\nDrone Show Cancelled';
  const modified = 'Gate 1 Open\nDrone Show Rescheduled';

  const inspector = new FestivalHubDiffInspector();
  inspector.computeDiff(original, modified);
  const metrics = inspector.getChangeMetrics();

  assert.equal(metrics.deletions, 2);
  assert.equal(metrics.additions, 1);

  const sideBySide = inspector.generateSideBySideView();
  assert.ok(sideBySide.left.some(l => l.text.includes('Fireworks 10PM') && l.type === 'delete'));
  assert.ok(sideBySide.right.some(r => r.text.includes('Drone Show Rescheduled') && r.type === 'insert'));
});

test('handles state objects by stringifying JSON cleanly', () => {
  const stateA = { stage: 'Main', volume: 80, active: true };
  const stateB = { stage: 'Main', volume: 95, active: true };

  const inspector = new FestivalHubDiffInspector();
  inspector.computeDiff(stateA, stateB);
  const metrics = inspector.getChangeMetrics();

  assert.ok(metrics.totalChanges > 0);
  assert.ok(inspector.generateUnifiedView().includes('"volume": 95'));
});
