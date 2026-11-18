import test from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyNotificationHub } from './notification-hub.js';

test('TravelOdysseyNotificationHub - enqueues and sorts alerts by priority', () => {
  const hub = new TravelOdysseyNotificationHub();
  
  hub.enqueue('FX rate update', 'info', 'info');
  hub.enqueue('Flight cancellation', 'critical', 'critical');
  hub.enqueue('Vaccine mandate advisory', 'warning', 'warning');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('TravelOdysseyNotificationHub - dismisses alert to history', () => {
  const hub = new TravelOdysseyNotificationHub();
  const item = hub.enqueue('Boarding gate update', 'success', 'success');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(item.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item.id);
});

test('TravelOdysseyNotificationHub - limits maxQueueSize correctly', () => {
  const hub = new TravelOdysseyNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Transit ping 1', 'info', 'info');
  hub.enqueue('Transit ping 2', 'info', 'info');
  hub.enqueue('Emergency Ground Stop', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('TravelOdysseyNotificationHub - clearQueue and subscriber cleanup', () => {
  const hub = new TravelOdysseyNotificationHub();
  let calls = 0;
  const unsub = hub.subscribe(() => {
    calls++;
  });

  hub.enqueue('Hotel booked', 'success', 'success');
  assert.equal(calls, 1);

  hub.clearQueue();
  assert.equal(calls, 2);
  assert.equal(hub.getActiveQueue().length, 0);

  unsub();
  hub.enqueue('Post-unsub itinerary note', 'info', 'info');
  assert.equal(calls, 2);
});
