import test from 'node:test';
import assert from 'node:assert/strict';
import { RenewableMicrogridNotificationManager } from './event-notifier.js';

test('RenewableMicrogridNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new RenewableMicrogridNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Solar Peak', 'Solar array generating at 145 kW peak', { duration: 0 });
  manager.dispatch('danger', 'Grid Overfrequency', 'Frequency reached 50.85 Hz disconnect trigger', { duration: 0 });
  manager.dispatch('warning', 'Battery SOC Low', 'BESS at 18% reserve capacity', { duration: 0 });
  manager.dispatch('success', 'Sync Lock', 'Substation synchronized with primary feeder', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active notifications', () => {
  const manager = new RenewableMicrogridNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'High Cell Temperature', 'Rack 2 cell at 46°C', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'High Cell Temperature', 'Rack 2 cell at 46°C', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new RenewableMicrogridNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Status A', 'Feed normal', { duration: 0 });
  manager.dispatch('info', 'Status B', 'Feed normal', { duration: 0 });
  manager.dispatch('info', 'Status C', 'Feed normal', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // High priority danger notification evicts an info notification
  manager.dispatch('danger', 'Arc Flash Fault', 'Breaker trip initiated', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new RenewableMicrogridNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Inverter Ping', 'Telemetry synced', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
