import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalNotificationHub } from './notification-hub.js';

describe('DocsPortalNotificationHub', () => {
  let hub;

  beforeEach(() => {
    hub = new DocsPortalNotificationHub();
  });

  it('enqueues alerts and prioritizes critical schema breaking changes', () => {
    hub.enqueue('Deprecation warning', 'warning', 'warning');
    hub.enqueue('Index sync notice', 'info', 'info');
    hub.enqueue('Breaking schema change', 'critical', 'critical');

    const active = hub.getActiveQueue();
    assert.equal(active.length, 3);
    assert.equal(active[0].priority, 'critical');
    assert.equal(active[1].priority, 'warning');
    assert.equal(active[2].priority, 'info');
  });

  it('binds schema recovery actions to critical alerts', () => {
    const item = hub.enqueue('Field dropped in spec', 'critical', 'critical');
    assert.ok(item.actions.length >= 2);
    assert.equal(item.actions[0].id, 'revert-schema');
  });

  it('dismisses notifications to history stream', () => {
    const item = hub.enqueue('Rate limit notice', 'warning', 'warning');
    assert.equal(hub.getActiveQueue().length, 1);

    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 1);
    assert.equal(hub.getHistory()[0].id, item.id);
  });

  it('executes actions and records operational resolution', () => {
    const item = hub.enqueue('API regression', 'critical', 'critical');
    const res = hub.executeAction(item.id, 'notify-devs');
    assert.ok(res);
    assert.equal(res.status, 'resolved');
    assert.equal(item.actionTaken, 'notify-devs');
  });

  it('returns false when dismissing unknown alert', () => {
    assert.equal(hub.dismiss('invalid-id'), false);
  });

  it('calculates documentation operations metrics correctly', () => {
    hub.enqueue('Alert 1', 'critical', 'critical');
    hub.enqueue('Alert 2', 'warning', 'warning');
    hub.enqueue('Alert 3', 'success', 'success');

    const metrics = hub.getMetrics();
    assert.equal(metrics.active, 3);
    assert.equal(metrics.criticalActive, 1);
    assert.equal(metrics.warningActive, 1);
  });

  it('notifies subscribers upon queue mutation', () => {
    let triggered = false;
    const unsub = hub.subscribe((queue) => {
      if (queue.length > 0) triggered = true;
    });

    hub.enqueue('Test subscriber hook', 'info', 'info');
    assert.equal(triggered, true);
    unsub();
  });
});
