import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityNotificationHub } from './notification-hub.js';

describe('HealthVitalityNotificationHub', () => {
  let hub;

  beforeEach(() => {
    hub = new HealthVitalityNotificationHub();
  });

  it('enqueues notifications and sorts critical ahead of info', () => {
    hub.enqueue('Hydration warning', 'warning', 'warning');
    hub.enqueue('Routine biomarker sync', 'info', 'info');
    hub.enqueue('Tachycardia alert', 'critical', 'critical');

    const active = hub.getActiveQueue();
    assert.equal(active.length, 3);
    assert.equal(active[0].priority, 'critical');
    assert.equal(active[1].priority, 'warning');
    assert.equal(active[2].priority, 'info');
  });

  it('assigns actions to critical alerts', () => {
    const item = hub.enqueue('Arrhythmia spike', 'critical', 'critical');
    assert.ok(item.actions.length >= 2);
    assert.equal(item.actions[0].id, 'cooldown-protocol');
  });

  it('dismisses notifications into history', () => {
    const item = hub.enqueue('Mild electrolyte drop', 'warning', 'warning');
    assert.equal(hub.getActiveQueue().length, 1);

    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 1);
    assert.equal(hub.getHistory()[0].id, item.id);
  });

  it('executes actions and marks actionTaken', () => {
    const item = hub.enqueue('Elevated heart rate', 'critical', 'critical');
    const res = hub.executeAction(item.id, 'cooldown-protocol');
    assert.ok(res);
    assert.equal(res.status, 'resolved');
    assert.equal(item.actionTaken, 'cooldown-protocol');
  });

  it('returns false for invalid dismissal', () => {
    assert.equal(hub.dismiss('non-existent-id'), false);
  });

  it('reports accurate metrics', () => {
    hub.enqueue('Alert 1', 'critical', 'critical');
    hub.enqueue('Alert 2', 'warning', 'warning');
    hub.enqueue('Alert 3', 'info', 'info');

    const metrics = hub.getMetrics();
    assert.equal(metrics.active, 3);
    assert.equal(metrics.criticalActive, 1);
    assert.equal(metrics.warningActive, 1);
  });

  it('notifies subscribers on queue updates', () => {
    let called = false;
    const unsub = hub.subscribe((queue) => {
      if (queue.length > 0) called = true;
    });

    hub.enqueue('Subscriber test notification', 'info', 'info');
    assert.equal(called, true);
    unsub();
  });
});
