import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactNotificationHub } from './notification-hub.js';

test('NonprofitImpactNotificationHub - enqueues and sorts alerts by priority', () => {
  const hub = new NonprofitImpactNotificationHub();
  
  hub.enqueue('Ledger sync', 'info', 'info');
  hub.enqueue('Emergency drought response', 'critical', 'critical');
  hub.enqueue('Seedling transit delay', 'warning', 'warning');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('NonprofitImpactNotificationHub - dismisses alert to history', () => {
  const hub = new NonprofitImpactNotificationHub();
  const item = hub.enqueue('Grant review pending', 'warning', 'warning');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(item.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item.id);
});

test('NonprofitImpactNotificationHub - limits maxQueueSize correctly', () => {
  const hub = new NonprofitImpactNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Ping 1', 'info', 'info');
  hub.enqueue('Ping 2', 'info', 'info');
  hub.enqueue('Critical Water Depletion', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('NonprofitImpactNotificationHub - clearQueue and subscriber cleanup', () => {
  const hub = new NonprofitImpactNotificationHub();
  let calls = 0;
  const unsub = hub.subscribe(() => {
    calls++;
  });

  hub.enqueue('First donation received', 'success', 'success');
  assert.equal(calls, 1);

  hub.clearQueue();
  assert.equal(calls, 2);
  assert.equal(hub.getActiveQueue().length, 0);

  unsub();
  hub.enqueue('Ignored call', 'info', 'info');
  assert.equal(calls, 2);
});
