import test from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarNotificationHub } from './notification-hub.js';

test('AutomotiveHypercarNotificationHub - enqueues and sorts by telemetry priority', () => {
  const hub = new AutomotiveHypercarNotificationHub();
  
  hub.enqueue('CAN nominal', 'info', 'info');
  hub.enqueue('Inverter Overheat', 'critical', 'critical');
  hub.enqueue('Tire Pressure Low', 'warning', 'warning');
  
  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('AutomotiveHypercarNotificationHub - dismisses alert to history', () => {
  const hub = new AutomotiveHypercarNotificationHub();
  const alert = hub.enqueue('Brake rotor thermal warning', 'warning', 'warning');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(alert.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, alert.id);
});

test('AutomotiveHypercarNotificationHub - drops lowest priority when queue full', () => {
  const hub = new AutomotiveHypercarNotificationHub({ maxQueueSize: 2 });
  
  hub.enqueue('Low alert 1', 'info', 'info');
  hub.enqueue('Low alert 2', 'info', 'info');
  hub.enqueue('Emergency Brake Cutoff', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('AutomotiveHypercarNotificationHub - clearQueue and subscribers', () => {
  const hub = new AutomotiveHypercarNotificationHub();
  let calls = 0;
  const unsub = hub.subscribe(() => {
    calls++;
  });

  hub.enqueue('Telemetry ping', 'info', 'info');
  assert.equal(calls, 1);

  hub.clearQueue();
  assert.equal(calls, 2);
  assert.equal(hub.getActiveQueue().length, 0);

  unsub();
  hub.enqueue('After unsub', 'info', 'info');
  assert.equal(calls, 2);
});
