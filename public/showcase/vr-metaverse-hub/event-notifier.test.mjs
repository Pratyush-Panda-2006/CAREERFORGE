import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubNotificationManager } from './event-notifier.js';

test('VrMetaverseHubNotificationManager - enforces max queue size capping', () => {
  const manager = new VrMetaverseHubNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Title 1', 'Message 1', 0);
  manager.dispatch('info', 'Title 2', 'Message 2', 0);
  manager.dispatch('info', 'Title 3', 'Message 3', 0);
  assert.strictEqual(manager.getQueueSize(), 3);

  // 4th notification should evict lowest priority from queue
  manager.dispatch('info', 'Title 4', 'Message 4', 0);
  assert.strictEqual(manager.getQueueSize(), 3);
});

test('VrMetaverseHubNotificationManager - auto-dismisses toasts on timeout expiration', async () => {
  const manager = new VrMetaverseHubNotificationManager({ audioEnabled: false });

  manager.dispatch('info', 'Expiring Notice', 'Short lifespan', 50);
  assert.strictEqual(manager.getQueueSize(), 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.strictEqual(manager.getQueueSize(), 0);
});

test('VrMetaverseHubNotificationManager - deduplicates identical active notifications', () => {
  const manager = new VrMetaverseHubNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Duplicate Warning', 'Same alert body', 0);
  assert.ok(first);
  assert.strictEqual(manager.getQueueSize(), 1);

  // Dispatching identical alert while first is still active returns null and does not duplicate
  const second = manager.dispatch('warning', 'Duplicate Warning', 'Same alert body', 0);
  assert.strictEqual(second, null);
  assert.strictEqual(manager.getQueueSize(), 1);
});

test('VrMetaverseHubNotificationManager - prioritizes danger alerts over info', () => {
  const manager = new VrMetaverseHubNotificationManager({ audioEnabled: false });

  manager.dispatch('info', 'Low priority', 'Info text', 0);
  manager.dispatch('danger', 'Critical crash', 'Danger text', 0);

  const queue = manager.getActiveQueue();
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].type, 'danger');
  assert.strictEqual(queue[1].type, 'info');
});
