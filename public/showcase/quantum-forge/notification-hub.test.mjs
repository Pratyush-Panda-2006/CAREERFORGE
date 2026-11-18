import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeNotificationHub } from './notification-hub.js';

test('QuantumForgeNotificationHub enqueues and prioritizes critical alerts over info', () => {
  const hub = new QuantumForgeNotificationHub();

  hub.enqueue('Routine QPU check', 'info', 'info');
  hub.enqueue('Microwave calibration', 'info', 'info');
  hub.enqueue('QPU Cryogenic Failure', 'critical', 'critical');
  hub.enqueue('Qubit Dephasing High', 'warning', 'warning');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 4);
  assert.equal(active[0].priority, 'critical');
  assert.equal(active[1].priority, 'warning');
  assert.equal(active[2].priority, 'info');
  assert.equal(active[3].priority, 'info');
});

test('QuantumForgeNotificationHub dismisses notification by id to history', () => {
  const hub = new QuantumForgeNotificationHub();

  const item1 = hub.enqueue('Warning pulse drift', 'warning', 'warning');
  const item2 = hub.enqueue('Qubit ready', 'success', 'success');

  assert.equal(hub.getActiveQueue().length, 2);
  const success = hub.dismiss(item1.id);

  assert.equal(success, true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, item2.id);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item1.id);
});

test('QuantumForgeNotificationHub enforces max queue size by dropping lowest priority items', () => {
  const hub = new QuantumForgeNotificationHub({ maxQueueSize: 3 });

  hub.enqueue('Low 1', 'info', 'info');
  hub.enqueue('Low 2', 'info', 'info');
  hub.enqueue('Low 3', 'info', 'info');
  hub.enqueue('Urgent Cryo alert', 'critical', 'critical');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 3);
  assert.equal(active[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].message, 'Low 3');
});

test('QuantumForgeNotificationHub clearQueue moves all active to history', () => {
  const hub = new QuantumForgeNotificationHub();
  hub.enqueue('Event 1', 'info', 'info');
  hub.enqueue('Event 2', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});
