import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioNotificationManager } from './event-notifier.js';

test('DeveloperPortfolioNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new DeveloperPortfolioNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Profile View', 'Recruiter viewed projects', { duration: 0 });
  manager.dispatch('danger', 'Build Failed', 'Production release error', { duration: 0 });
  manager.dispatch('warning', 'High Memory', 'Worker thread exceeding threshold', { duration: 0 });
  manager.dispatch('success', 'Project Starred', 'New star received', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active portfolio alerts', () => {
  const manager = new DeveloperPortfolioNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'API Quota Low', 'Approaching rate limit', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'API Quota Low', 'Approaching rate limit', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new DeveloperPortfolioNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Ping 1', 'Network heartbeat ok', { duration: 0 });
  manager.dispatch('info', 'Ping 2', 'Cache refreshed', { duration: 0 });
  manager.dispatch('info', 'Ping 3', 'Metrics collected', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'Server Down', 'Service unavailable 503', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new DeveloperPortfolioNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Quick Ping', 'Ephemeral toast message', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
