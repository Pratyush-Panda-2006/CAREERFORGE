import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterNotificationHub } from './notification-hub.js';

test('AerospaceOrbiterNotificationHub prioritizes critical flight alerts over info', () => {
  const hub = new AerospaceOrbiterNotificationHub();

  hub.enqueue('Routine DSN ping', 'info', 'info');
  hub.enqueue('Debris conjunction warning', 'critical', 'critical');
  hub.enqueue('RCS pressure drop', 'warning', 'warning');
  hub.enqueue('Docking lock', 'success', 'success');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 4);
  assert.equal(active[0].priority, 'critical');
  assert.equal(active[1].priority, 'warning');
  assert.equal(active[2].priority, 'success');
  assert.equal(active[3].priority, 'info');
});

test('AerospaceOrbiterNotificationHub dismisses alert by id into history', () => {
  const hub = new AerospaceOrbiterNotificationHub();

  const item1 = hub.enqueue('RCS fuel leak', 'warning', 'warning');
  const item2 = hub.enqueue('Beacon active', 'info', 'info');

  assert.equal(hub.getActiveQueue().length, 2);
  const success = hub.dismiss(item1.id);

  assert.equal(success, true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, item2.id);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item1.id);
});

test('AerospaceOrbiterNotificationHub limits queue size by evicting lowest priority', () => {
  const hub = new AerospaceOrbiterNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Low 1', 'info', 'info');
  hub.enqueue('Low 2', 'info', 'info');
  hub.enqueue('Immediate de-orbit burn', 'critical', 'critical');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 2);
  assert.equal(active[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].message, 'Low 2');
});

test('AerospaceOrbiterNotificationHub clears queue cleanly', () => {
  const hub = new AerospaceOrbiterNotificationHub();
  hub.enqueue('Alert A', 'info', 'info');
  hub.enqueue('Alert B', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});
