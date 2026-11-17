import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterNotificationManager } from './event-notifier.js';

test('AerospaceOrbiterNotificationManager dispatches prioritized notifications correctly', () => {
  const manager = new AerospaceOrbiterNotificationManager({ maxQueueSize: 10, audioEnabled: false });

  manager.dispatch('info', 'Orbit Insertion', 'LEO orbital apogee achieved at 410km', { duration: 0 });
  manager.dispatch('danger', 'Thruster Malfunction', 'RCS attitude thruster valve jammed open', { duration: 0 });
  manager.dispatch('warning', 'Thermal Shield Delta', 'Tile sensor indicates +120°C above baseline', { duration: 0 });
  manager.dispatch('success', 'Docking Lock', 'ISS Harmony module latch confirmed', { duration: 0 });

  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 4);
  assert.equal(queue[0].type, 'danger');
  assert.equal(queue[1].type, 'warning');
  assert.equal(queue[2].type, 'success');
  assert.equal(queue[3].type, 'info');
});

test('deduplicates identical active telemetry alerts', () => {
  const manager = new AerospaceOrbiterNotificationManager({ audioEnabled: false });

  const first = manager.dispatch('warning', 'Solar Array Yaw Error', 'Tracking gimbal locked at 32 deg', { duration: 0 });
  assert.ok(first);
  assert.equal(manager.getActiveQueue().length, 1);

  // Dispatch exact duplicate
  const duplicate = manager.dispatch('warning', 'Solar Array Yaw Error', 'Tracking gimbal locked at 32 deg', { duration: 0 });
  assert.equal(duplicate, null);
  assert.equal(manager.getActiveQueue().length, 1);
});

test('enforces max queue size capping by evicting lowest priority', () => {
  const manager = new AerospaceOrbiterNotificationManager({ maxQueueSize: 3, audioEnabled: false });

  manager.dispatch('info', 'Comm Check 1', 'Deep Space Network ping ok', { duration: 0 });
  manager.dispatch('info', 'Comm Check 2', 'Ground station handshake ok', { duration: 0 });
  manager.dispatch('info', 'Comm Check 3', 'Telemetry downlink ok', { duration: 0 });
  assert.equal(manager.getActiveQueue().length, 3);

  // Critical alert evicts lowest priority info item
  manager.dispatch('danger', 'Hull Depressurization', 'Cabin pressure falling below 10.2 psi', { duration: 0 });
  const queue = manager.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].type, 'danger');

  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].reason, 'evicted');
});

test('automatically expires notifications after timeout delay', async () => {
  const manager = new AerospaceOrbiterNotificationManager({ audioEnabled: false });
  const notif = manager.dispatch('info', 'Guidance Ping', 'Star tracker calibration update', { duration: 50 });

  assert.equal(manager.getActiveQueue().length, 1);
  await new Promise(resolve => setTimeout(resolve, 80));

  assert.equal(manager.getActiveQueue().length, 0);
  const history = manager.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, notif.id);
  assert.equal(history[0].reason, 'timeout');
});
