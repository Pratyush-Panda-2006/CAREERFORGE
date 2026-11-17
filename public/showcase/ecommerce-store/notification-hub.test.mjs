import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreNotificationHub } from './notification-hub.js';

test('EcommerceStoreNotificationHub - prioritizes critical alerts ahead of info alerts', () => {
  const hub = new EcommerceStoreNotificationHub({ maxQueueSize: 5 });

  hub.enqueue('Routine cache refreshed', 'info', 'info', 0);
  hub.enqueue('Database read latency slightly elevated', 'warning', 'warning', 0);
  hub.enqueue('Payment gateway outage detected!', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();

  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('EcommerceStoreNotificationHub - auto-dismisses alerts after configured timeout duration', async () => {
  const hub = new EcommerceStoreNotificationHub();

  const item = hub.enqueue('Transient toast notice', 'info', 'info', 50);
  assert.strictEqual(hub.getActiveQueue().length, 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.strictEqual(hub.getActiveQueue().length, 0);
  assert.ok(hub.getHistory().some(h => h.id === item.id));
});

test('EcommerceStoreNotificationHub - respects maximum queue size and evicts lowest priority', () => {
  const hub = new EcommerceStoreNotificationHub({ maxQueueSize: 3 });

  hub.enqueue('Low priority 1', 'info', 'info', 0);
  hub.enqueue('Low priority 2', 'info', 'info', 0);
  hub.enqueue('Medium priority', 'warning', 'warning', 0);
  assert.strictEqual(hub.getActiveQueue().length, 3);

  // Enqueue a critical notification, which should preempt and evict the lowest priority item
  hub.enqueue('CRITICAL: Stock Depleted', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();
  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('EcommerceStoreNotificationHub - manually dismisses notifications by id', () => {
  const hub = new EcommerceStoreNotificationHub();

  const item1 = hub.enqueue('Order placed', 'success', 'success', 0);
  const item2 = hub.enqueue('Item shipped', 'success', 'success', 0);

  assert.strictEqual(hub.getActiveQueue().length, 2);

  const dismissed = hub.dismiss(item1.id);
  assert.strictEqual(dismissed, true);
  assert.strictEqual(hub.getActiveQueue().length, 1);
  assert.strictEqual(hub.getActiveQueue()[0].id, item2.id);
});
