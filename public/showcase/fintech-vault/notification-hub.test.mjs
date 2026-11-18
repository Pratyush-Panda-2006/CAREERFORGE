import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultNotificationHub } from './notification-hub.js';

describe('FintechVaultNotificationHub', () => {
  let hub;

  beforeEach(() => {
    hub = new FintechVaultNotificationHub();
  });

  it('enqueues alerts and prioritizes critical compliance risks', () => {
    hub.enqueue('Nostro liquidity warning', 'warning', 'warning');
    hub.enqueue('Daily ledger notarization', 'info', 'info');
    hub.enqueue('AML sanction screening hit', 'critical', 'critical');

    const active = hub.getActiveQueue();
    assert.equal(active.length, 3);
    assert.equal(active[0].priority, 'critical');
    assert.equal(active[1].priority, 'warning');
    assert.equal(active[2].priority, 'info');
  });

  it('binds financial mitigation actions to critical events', () => {
    const item = hub.enqueue('OFAC sanction match', 'critical', 'critical');
    assert.ok(item.actions.length >= 2);
    assert.equal(item.actions[0].id, 'freeze-asset');
  });

  it('dismisses notifications to history stream', () => {
    const item = hub.enqueue('Margin warning', 'warning', 'warning');
    assert.equal(hub.getActiveQueue().length, 1);

    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 1);
    assert.equal(hub.getHistory()[0].id, item.id);
  });

  it('executes actions and records compliance resolution', () => {
    const item = hub.enqueue('Suspicious wire burst', 'critical', 'critical');
    const res = hub.executeAction(item.id, 'escalate-compliance');
    assert.ok(res);
    assert.equal(res.status, 'resolved');
    assert.equal(item.actionTaken, 'escalate-compliance');
  });

  it('returns false when dismissing unknown alert', () => {
    assert.equal(hub.dismiss('invalid-id'), false);
  });

  it('calculates financial telemetry metrics correctly', () => {
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
