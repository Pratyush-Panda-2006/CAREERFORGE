import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsNotificationHub } from './notification-hub.js';

test('BiotechGenomicsNotificationHub - prioritizes critical lab alerts ahead of info alerts', () => {
  const hub = new BiotechGenomicsNotificationHub({ maxQueueSize: 5 });

  hub.enqueue('Reagent kit registered', 'info', 'info', 0);
  hub.enqueue('Sequencer cluster density suboptimal', 'warning', 'warning', 0);
  hub.enqueue('Incubator temperature critical spike!', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();

  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('BiotechGenomicsNotificationHub - auto-dismisses alerts after configured timeout duration', async () => {
  const hub = new BiotechGenomicsNotificationHub();

  const item = hub.enqueue('Transient assay status update', 'info', 'info', 50);
  assert.strictEqual(hub.getActiveQueue().length, 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.strictEqual(hub.getActiveQueue().length, 0);
  assert.ok(hub.getHistory().some(h => h.id === item.id));
});

test('BiotechGenomicsNotificationHub - respects maximum queue size and evicts lowest priority', () => {
  const hub = new BiotechGenomicsNotificationHub({ maxQueueSize: 3 });

  hub.enqueue('Routine log 1', 'info', 'info', 0);
  hub.enqueue('Routine log 2', 'info', 'info', 0);
  hub.enqueue('Buffer low warning', 'warning', 'warning', 0);
  assert.strictEqual(hub.getActiveQueue().length, 3);

  // Enqueue a critical notification, which should preempt and evict the lowest priority item
  hub.enqueue('CRITICAL: Contamination Detected', 'critical', 'critical', 0);

  const queue = hub.getActiveQueue();
  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].priority, 'critical');
  assert.strictEqual(queue[1].priority, 'warning');
  assert.strictEqual(queue[2].priority, 'info');
});

test('BiotechGenomicsNotificationHub - manually dismisses notifications by id', () => {
  const hub = new BiotechGenomicsNotificationHub();

  const item1 = hub.enqueue('Exome run complete', 'success', 'success', 0);
  const item2 = hub.enqueue('Report generated', 'success', 'success', 0);

  assert.strictEqual(hub.getActiveQueue().length, 2);

  const dismissed = hub.dismiss(item1.id);
  assert.strictEqual(dismissed, true);
  assert.strictEqual(hub.getActiveQueue().length, 1);
  assert.strictEqual(hub.getActiveQueue()[0].id, item2.id);
});
