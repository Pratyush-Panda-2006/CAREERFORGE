import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadNotificationManager } from './event-notifier.js';

test('SaasLaunchpadNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new SaasLaunchpadNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Login Event', 'User signed into dashboard', { duration: 0 });
  manager.dispatch('danger', 'Payment Failure', 'Card declined on checkout', { duration: 0 });
  manager.dispatch('warning', 'Rate Limited', 'API requests exceeding limit', { duration: 0 });
  manager.dispatch('success', 'Plan Upgraded', 'Enterprise subscription activated', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active SaaS alerts', () => {
  const manager = new SaasLaunchpadNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Webhook Retrying', 'Endpoint responded with 503', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'Webhook Retrying', 'Endpoint responded with 503', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new SaasLaunchpadNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Ping 1', 'Heartbeat normal', { duration: 0 });
  manager.dispatch('info', 'Ping 2', 'Metrics reported', { duration: 0 });
  manager.dispatch('info', 'Ping 3', 'Cache purged', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'Gateway Down', 'Payment gateway 502 Bad Gateway', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new SaasLaunchpadNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Quick Ping', 'Ephemeral toast message', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
