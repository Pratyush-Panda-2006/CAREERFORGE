import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarNotificationManager } from './event-notifier.js';

test('AutomotiveHypercarNotificationManager - dispatches notification and respects priority ordering', () => {
  const manager = new AutomotiveHypercarNotificationManager({ audioEnabled: false });

  manager.dispatch('info', 'Telemetry Synced', 'Data packets logged');
  manager.dispatch('danger', 'Overheat Alert', 'Motor temperature exceeds 120C');
  manager.dispatch('warning', 'Tire Pressure Low', 'Left rear 24 PSI');

  const queue = manager.getActiveQueue();
  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].type, 'danger');
  assert.strictEqual(queue[1].type, 'warning');
  assert.strictEqual(queue[2].type, 'info');
});

test('AutomotiveHypercarNotificationManager - prevents duplicate simultaneous notifications', () => {
  const manager = new AutomotiveHypercarNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Battery Low', 'State of charge < 10%');
  const second = manager.dispatch('warning', 'Battery Low', 'State of charge < 10%');

  assert.notStrictEqual(first, null);
  assert.strictEqual(second, null);
  assert.strictEqual(manager.getActiveQueue().length, 1);
});

test('AutomotiveHypercarNotificationManager - dismisses notification and updates history log', () => {
  const manager = new AutomotiveHypercarNotificationManager({ audioEnabled: false });

  const item = manager.dispatch('success', 'Aerodynamics Deployed', 'Active spoiler engaged');
  assert.strictEqual(manager.getActiveQueue().length, 1);

  const res = manager.dismiss(item.id, 'user_close');
  assert.strictEqual(res, true);
  assert.strictEqual(manager.getActiveQueue().length, 0);

  const history = manager.getHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].dismissedReason, 'user_close');
});

test('AutomotiveHypercarNotificationManager - evicts lowest priority on queue overflow', () => {
  const manager = new AutomotiveHypercarNotificationManager({ maxQueueSize: 2, audioEnabled: false });

  manager.dispatch('info', 'Info 1', 'Message 1');
  manager.dispatch('warning', 'Warning 1', 'Message 2');
  manager.dispatch('danger', 'Danger 1', 'Message 3');

  const queue = manager.getActiveQueue();
  assert.strictEqual(queue.length, 2);
  assert.strictEqual(queue[0].type, 'danger');
  assert.strictEqual(queue[1].type, 'warning');
});
