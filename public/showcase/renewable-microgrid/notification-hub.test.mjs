import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridNotificationHub } from './notification-hub.js';

test('RenewableMicrogridNotificationHub', async (t) => {
  await t.test('should enqueue and sort toasts by priority weight descending', () => {
    const hub = new RenewableMicrogridNotificationHub({ maxQueueSize: 5 });

    hub.enqueue('Info: Battery at 90%', 'info', 'info');
    hub.enqueue('Critical: Substation breaker tripped', 'error', 'critical');
    hub.enqueue('Warning: Solar curtailment active', 'warn', 'warning');

    const queue = hub.getActiveQueue();
    assert.equal(queue.length, 3);
    assert.equal(queue[0].priority, 'critical');
    assert.equal(queue[1].priority, 'warning');
    assert.equal(queue[2].priority, 'info');
  });

  await t.test('should respect maxQueueSize and evict lowest priority item', () => {
    const hub = new RenewableMicrogridNotificationHub({ maxQueueSize: 2 });

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
    const hub = new RenewableMicrogridNotificationHub();
    const item = hub.enqueue('Inverter phase lock acquired', 'info', 'info');

    assert.equal(hub.getActiveQueue().length, 1);
    const dismissed = hub.dismiss(item.id);
    assert.equal(dismissed.id, item.id);
    assert.equal(hub.getActiveQueue().length, 0);
  });

  await t.test('should maintain audit history across dispatches', () => {
    const hub = new RenewableMicrogridNotificationHub({ maxQueueSize: 2 });
    hub.enqueue('Event 1', 'info', 'info');
    hub.enqueue('Event 2', 'warn', 'warning');
    hub.enqueue('Event 3', 'error', 'critical');

    const history = hub.getHistory();
    assert.equal(history.length, 3);
    assert.equal(history[0].message, 'Event 3');
  });
});
