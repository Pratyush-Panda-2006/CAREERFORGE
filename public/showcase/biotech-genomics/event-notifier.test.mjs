import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsNotificationManager } from './event-notifier.js';

test('BiotechGenomicsNotificationManager - enforces max queue size capping', () => {
  const manager = new BiotechGenomicsNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Title 1', 'Message 1', 0);
  manager.dispatch('info', 'Title 2', 'Message 2', 0);
  manager.dispatch('info', 'Title 3', 'Message 3', 0);
  assert.strictEqual(manager.getQueueSize(), 3);

  manager.dispatch('info', 'Title 4', 'Message 4', 0);
  assert.strictEqual(manager.getQueueSize(), 3);
});

test('BiotechGenomicsNotificationManager - auto-dismisses toasts on timeout expiration', async () => {
  const manager = new BiotechGenomicsNotificationManager({ audioEnabled: false });

  manager.dispatch('info', 'Expiring Notice', 'Short lifespan', 50);
  assert.strictEqual(manager.getQueueSize(), 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.strictEqual(manager.getQueueSize(), 0);
});

test('BiotechGenomicsNotificationManager - deduplicates identical active notifications', () => {
  const manager = new BiotechGenomicsNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Duplicate Warning', 'Same alert body', 0);
  assert.ok(first);
  assert.strictEqual(manager.getQueueSize(), 1);

  const second = manager.dispatch('warning', 'Duplicate Warning', 'Same alert body', 0);
  assert.strictEqual(second, null);
  assert.strictEqual(manager.getQueueSize(), 1);
});

test('BiotechGenomicsNotificationManager - prioritizes danger alerts over info', () => {
  const manager = new BiotechGenomicsNotificationManager({ audioEnabled: false });

  manager.dispatch('info', 'Low priority', 'Info text', 0);
  manager.dispatch('danger', 'Critical crash', 'Danger text', 0);

  const queue = manager.getActiveQueue();
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].type, 'danger');
  assert.strictEqual(queue[1].type, 'info');
});
