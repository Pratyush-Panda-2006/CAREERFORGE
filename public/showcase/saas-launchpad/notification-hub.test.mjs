import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadNotificationHub } from './notification-hub.js';

describe('SaasLaunchpadNotificationHub', () => {
  let hub;

  beforeEach(() => {
    hub = new SaasLaunchpadNotificationHub();
  });

  it('enqueues alerts and prioritizes critical billing failures', () => {
    hub.enqueue('Info update', 'info', 'platform');
    hub.enqueue('Stripe webhook failed', 'critical', 'billing');
    hub.enqueue('Quota warning', 'warning', 'quota');

    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  it('binds SaaS billing recovery actions to critical notifications', () => {
    const item = hub.enqueue('Payment method expired', 'critical', 'billing');
    assert.equal(item.actions[0].id, 'update-billing');
  });

  it('dismisses notifications to history stream', () => {
    const item = hub.enqueue('Seat invitation sent', 'info', 'membership');
    assert.equal(hub.getActiveQueue().length, 1);

    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 1);
    assert.equal(hub.getHistory()[0].status, 'dismissed');
  });

  it('executes actions and records operational resolution', () => {
    const item = hub.enqueue('Quota high', 'warning', 'quota');
    const result = hub.executeAction(item.id, 'increase-quota');

    assert.ok(result);
    assert.equal(result.status, 'resolved');
    assert.equal(result.actionId, 'increase-quota');
    assert.equal(hub.getActiveQueue().length, 0);
  });

  it('calculates SaaS metrics correctly', () => {
    hub.enqueue('Alert 1', 'critical', 'billing');
    hub.enqueue('Alert 2', 'warning', 'quota');
    hub.enqueue('Alert 3', 'success', 'license');

    const metrics = hub.getMetrics();
    assert.equal(metrics.active, 3);
    assert.equal(metrics.criticalActive, 1);
    assert.equal(metrics.warningActive, 1);
  });
});
