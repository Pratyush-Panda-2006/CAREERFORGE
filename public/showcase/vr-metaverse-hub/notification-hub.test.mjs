import test from 'node:test';
import assert from 'node:assert/strict';
import { VRMetaverseHubNotificationHub } from './notification-hub.js';

test('VRMetaverseHubNotificationHub', async (t) => {
  await t.test('should enqueue and sort toasts by priority weight descending', () => {
    const hub = new VRMetaverseHubNotificationHub({ maxQueueSize: 5 });

    hub.enqueue('Info: Shard connected', 'info', 'info');
    hub.enqueue('Critical: FPS below 45', 'error', 'critical');
    hub.enqueue('Warning: Packet loss 10%', 'warn', 'warning');

    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  await t.test('should respect maxQueueSize and evict lowest priority item', () => {
    const hub = new VRMetaverseHubNotificationHub({ maxQueueSize: 2 });

    hub.enqueue('Info 1', 'info', 'info');
    hub.enqueue('Warning 1', 'warn', 'warning');
    hub.enqueue('Critical 1', 'error', 'critical');

    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 2);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.ok(!queue.some(item => item.priority === 'info'));
  });

  await t.test('should dismiss active item by id', () => {
    const hub = new VRMetaverseHubNotificationHub();
    const item = hub.enqueue('IK solver reset', 'info', 'info');

    assert.equal(hub.getActiveQueue().length, 1);
    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed.id, item.id);
    assert.equal(hub.getActiveQueue().length, 0);
  });

  await t.test('should maintain audit history across dispatches', () => {
    const hub = new VRMetaverseHubNotificationHub({ maxQueueSize: 2 });
    hub.enqueue('Message 1', 'info', 'info');
    hub.enqueue('Message 2', 'warn', 'warning');
    hub.enqueue('Message 3', 'error', 'critical');

    const history = hub.getHistory();
    assert.equal(history.length, 3);
    assert.equal(history[0].message, 'Message 3');
  });
});
