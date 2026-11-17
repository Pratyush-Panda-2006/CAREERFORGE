import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubNotificationHub } from './notification-hub.js';

test('FestivalHubNotificationHub prioritizes critical alerts over info and warning alerts', () => {
  const hub = new FestivalHubNotificationHub({ maxQueueSize: 10 });
  hub.enqueue('Sound check routine completed', 'info', 'info', 0);
  hub.enqueue('Stage 2 Audio Limiter Clapped', 'warning', 'warning', 0);
  hub.enqueue('Emergency Weather Alert: High Winds', 'critical', 'critical', 0);
  hub.enqueue('VIP Wristband Scanner Online', 'success', 'success', 0);

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'success');
  assert.equal(queue[3].priority, 'info');
});

test('enforces max queue size limits by evicting lowest-priority items', () => {
  const hub = new FestivalHubNotificationHub({ maxQueueSize: 3 });
  hub.enqueue('Info 1', 'info', 'info', 0);
  hub.enqueue('Info 2', 'info', 'info', 0);
  hub.enqueue('Info 3', 'info', 'info', 0);

  assert.equal(hub.getActiveQueue().length, 3);

  // Enqueueing higher priority item should evict an info item
  hub.enqueue('Critical Power Outage', 'critical', 'critical', 0);
  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');

  const log = hub.getLog();
  assert.equal(log.length, 1);
  assert.equal(log[0].dismissedReason, 'evicted');
});

test('auto-dismisses notifications after specified timeout duration', async () => {
  const hub = new FestivalHubNotificationHub();
  const notif = hub.enqueue('Temporary Flash Notice', 'info', 'info', 50);

  assert.equal(hub.getActiveQueue().length, 1);

  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(hub.getActiveQueue().length, 0);
  const log = hub.getLog();
  assert.equal(log.length, 1);
  assert.equal(log[0].id, notif.id);
  assert.equal(log[0].dismissedReason, 'timeout');
});

test('manual dismiss and clearActive update active queue and history log correctly', () => {
  const hub = new FestivalHubNotificationHub();
  const n1 = hub.enqueue('Item A', 'info', 'info', 0);
  const n2 = hub.enqueue('Item B', 'warning', 'warning', 0);

  assert.equal(hub.dismiss(n1.id), true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, n2.id);

  hub.clearActive();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getLog().length, 2);
});
