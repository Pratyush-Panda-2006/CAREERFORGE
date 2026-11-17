import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dNotificationManager } from './event-notifier.js';

test('VirtualMuseum3dNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new VirtualMuseum3dNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Gallery 1', 'Curator tour starting soon', { duration: 0 });
  manager.dispatch('danger', 'Alarm Active', 'Proximity sensor triggered in Roman Vault', { duration: 0 });
  manager.dispatch('warning', 'Low Humidity', 'Climate control variance in Wing B', { duration: 0 });
  manager.dispatch('success', 'Artifact Restored', 'Greek amphora 3D scan finalized', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active notifications', () => {
  const manager = new VirtualMuseum3dNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Exhibit Closed', 'Maintenance in progress', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact same alert
  const duplicate = manager.dispatch('warning', 'Exhibit Closed', 'Maintenance in progress', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new VirtualMuseum3dNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Info 1', 'Tour update', { duration: 0 });
  manager.dispatch('info', 'Info 2', 'Audio guide update', { duration: 0 });
  manager.dispatch('info', 'Info 3', 'Gift shop discount', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Dispatch critical alert exceeding capacity
  manager.dispatch('danger', 'Security Breach', 'Emergency gate lockdown', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new VirtualMuseum3dNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Flash Card', 'Quick tip for VR mode', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
