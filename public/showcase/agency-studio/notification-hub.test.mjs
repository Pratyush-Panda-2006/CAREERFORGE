import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioNotificationHub } from './notification-hub.js';

test('AgencyStudioNotificationHub - prioritizes critical studio alerts ahead of info alerts', () => {
  const hub = new AgencyStudioNotificationHub({ maxQueueSize: 5 });

  hub.enqueue('Asset export started', 'info', 'info', 0);
  hub.enqueue('Design feedback pending review', 'warning', 'warning', 0);
  hub.enqueue('Pitch presentation deadline critical!', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();

  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('AgencyStudioNotificationHub - auto-dismisses alerts after configured timeout duration', async () => {
  const hub = new AgencyStudioNotificationHub();

  const item = hub.enqueue('Transient agency notification', 'info', 'info', 50);
  assert.strictEqual(hub.getActiveQueue().length, 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.strictEqual(hub.getActiveQueue().length, 0);
  assert.ok(hub.getHistory().some(h => h.id === item.id));
});

test('AgencyStudioNotificationHub - respects maximum queue size and evicts lowest priority', () => {
  const hub = new AgencyStudioNotificationHub({ maxQueueSize: 3 });

  hub.enqueue('Low priority notice 1', 'info', 'info', 0);
  hub.enqueue('Low priority notice 2', 'info', 'info', 0);
  hub.enqueue('Medium priority warning', 'warning', 'warning', 0);
  assert.strictEqual(hub.getActiveQueue().length, 3);

  // Enqueue a critical notification, which should preempt and evict the lowest priority item
  hub.enqueue('CRITICAL: Final Print Deadline', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();
  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('AgencyStudioNotificationHub - manually dismisses notifications by id', () => {
  const hub = new AgencyStudioNotificationHub();

  const item1 = hub.enqueue('Milestone completed', 'success', 'success', 0);
  const item2 = hub.enqueue('Client invoice generated', 'success', 'success', 0);

  assert.strictEqual(hub.getActiveQueue().length, 2);

  const dismissed = hub.dismiss(item1.id);
  assert.strictEqual(dismissed, true);
  assert.strictEqual(hub.getActiveQueue().length, 1);
  assert.strictEqual(hub.getActiveQueue()[0].id, item2.id);
});
