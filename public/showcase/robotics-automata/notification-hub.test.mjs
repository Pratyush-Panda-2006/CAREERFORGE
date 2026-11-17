import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataNotificationHub } from './notification-hub.js';

describe('RoboticsAutomataNotificationHub', () => {
  it('should prioritize critical alerts over standard info messages in queue ordering', () => {
    const hub = new RoboticsAutomataNotificationHub({ maxQueueSize: 5 });

    hub.enqueue('System online', 'info', 'info');
    hub.enqueue('CRITICAL OVERHEAT', 'error', 'critical');
    hub.enqueue('Minor drift', 'warn', 'warning');

    const queue = hub.getActiveQueue();
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  it('should dismiss notification by id and remove it from active queue', () => {
    const hub = new RoboticsAutomataNotificationHub();
    const item = hub.enqueue('Test alert', 'info', 'info');

    assert.equal(hub.getActiveQueue().length, 1);
    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed.id, item.id);
    assert.equal(hub.getActiveQueue().length, 0);
  });

  it('should evict lowest-priority notification when max queue size is exceeded', () => {
    const hub = new RoboticsAutomataNotificationHub({ maxQueueSize: 3 });

    hub.enqueue('Info 1', 'info', 'info');
    hub.enqueue('Info 2', 'info', 'info');
    hub.enqueue('Info 3', 'info', 'info');
    assert.equal(hub.getActiveQueue().length, 3);

    // Enqueue a critical alert: should push to front and drop lowest info
    hub.enqueue('CRITICAL EMERGENCY', 'error', 'critical');
    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
  });

  it('should track actionable alert history and clear queue when requested', () => {
    const hub = new RoboticsAutomataNotificationHub();
    hub.enqueue('Log event 1', 'info', 'info');
    hub.enqueue('Log event 2', 'warn', 'warning');

    assert.equal(hub.getHistory().length, 2);
    hub.clearQueue();
    assert.equal(hub.getActiveQueue().length, 0);
    assert.equal(hub.getHistory().length, 2); // History persists
  });
});
