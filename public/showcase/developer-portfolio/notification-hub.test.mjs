import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioNotificationHub } from './notification-hub.js';

describe('DeveloperPortfolioNotificationHub', () => {
  let hub;

  beforeEach(() => {
    hub = new DeveloperPortfolioNotificationHub();
  });

  it('enqueues notifications and sorts by priority', () => {
    hub.enqueue('Info note', 'info', 'general');
    hub.enqueue('Critical deploy failure', 'critical', 'ci-cd');
    hub.enqueue('Warning: high memory', 'warning', 'runtime');

    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  it('assigns appropriate developer default actions based on priority', () => {
    const critItem = hub.enqueue('Build broken', 'critical', 'build');
    assert.equal(critItem.actions[0].id, 'retry-build');

    const warnItem = hub.enqueue('Memory spike', 'warning', 'metrics');
    assert.equal(warnItem.actions[0].id, 'view-diagnostics');
  });

  it('dismisses notifications to history stream', () => {
    const item = hub.enqueue('Recruiter contacted', 'info', 'messages');
    assert.equal(hub.getActiveQueue().length, 1);

    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed, true);
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 1);
    assert.equal(hub.getHistory()[0].status, 'dismissed');
  });

  it('executes actions and marks alert resolved', () => {
    const item = hub.enqueue('SSH key expired', 'critical', 'security');
    const result = hub.executeAction(item.id, 'retry-build');

    assert.ok(result);
    assert.equal(result.status, 'resolved');
    assert.equal(result.actionId, 'retry-build');
    assert.equal(hub.getActiveQueue().length, 0);
  });

  it('calculates metrics properly', () => {
    hub.enqueue('Alert 1', 'critical', 'infra');
    hub.enqueue('Alert 2', 'warning', 'lint');
    hub.enqueue('Alert 3', 'success', 'test');

    const metrics = hub.getMetrics();
    assert.equal(metrics.active, 3);
    assert.equal(metrics.criticalActive, 1);
    assert.equal(metrics.warningActive, 1);
  });

  it('respects maximum queue size', () => {
    const tinyHub = new DeveloperPortfolioNotificationHub({ maxQueueSize: 2 });
    tinyHub.enqueue('First', 'info');
    tinyHub.enqueue('Second', 'warning');
    tinyHub.enqueue('Third', 'critical');

    assert.equal(tinyHub.getActiveQueue().length, 2);
    assert.equal(tinyHub.getHistory().length, 1);
  });
});
