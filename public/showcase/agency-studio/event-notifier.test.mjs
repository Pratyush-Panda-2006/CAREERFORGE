import test from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioNotificationManager } from './event-notifier.js';

test('AgencyStudioNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new AgencyStudioNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Client Deliverable', 'Design handoff review scheduled', { duration: 0 });
  manager.dispatch('danger', 'Server Error', 'Gateway timeout reported', { duration: 0 });
  manager.dispatch('warning', 'Scope Alert', 'Sprint capacity exceeded', { duration: 0 });
  manager.dispatch('success', 'Invoice Settled', 'Payment confirmed', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active alerts', () => {
  const manager = new AgencyStudioNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Milestone Pending', 'Client signoff needed', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'Milestone Pending', 'Client signoff needed', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new AgencyStudioNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Ping 1', 'Team update 1', { duration: 0 });
  manager.dispatch('info', 'Ping 2', 'Team update 2', { duration: 0 });
  manager.dispatch('info', 'Ping 3', 'Team update 3', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'System Crash', 'Critical node offline', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new AgencyStudioNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Reminder', 'Standup starting soon', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
