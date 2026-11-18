import test from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalNotificationManager } from './event-notifier.js';

test('DocsPortalNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new DocsPortalNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'System Notice', 'Standard background task completed', { duration: 0 });
  manager.dispatch('danger', 'Critical Fault', 'High severity error detected', { duration: 0 });
  manager.dispatch('warning', 'Resource Spike', 'Memory utilization threshold warning', { duration: 0 });
  manager.dispatch('success', 'Operation OK', 'Transaction confirmed and persisted', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active alerts', () => {
  const manager = new DocsPortalNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Alert Duplication', 'Testing deduplication filter', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'Alert Duplication', 'Testing deduplication filter', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new DocsPortalNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Notice 1', 'Item 1 description', { duration: 0 });
  manager.dispatch('info', 'Notice 2', 'Item 2 description', { duration: 0 });
  manager.dispatch('info', 'Notice 3', 'Item 3 description', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'Critical Disruption', 'Eviction test', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new DocsPortalNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Expiring Notice', 'Timeout verification test', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
