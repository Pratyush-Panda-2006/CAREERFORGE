import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyNotificationHub } from './notification-hub.js';

test('EdtechAcademyNotificationHub - enqueues and sorts alerts by priority', () => {
  const hub = new EdtechAcademyNotificationHub();
  
  hub.enqueue('New assignment', 'info', 'info');
  hub.enqueue('Proctoring alert', 'critical', 'critical');
  hub.enqueue('Quiz countdown', 'warning', 'warning');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('EdtechAcademyNotificationHub - dismisses alert to history', () => {
  const hub = new EdtechAcademyNotificationHub();
  const item = hub.enqueue('Assignment graded', 'success', 'success');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(item.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item.id);
});

test('EdtechAcademyNotificationHub - limits maxQueueSize correctly', () => {
  const hub = new EdtechAcademyNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Forum post 1', 'info', 'info');
  hub.enqueue('Forum post 2', 'info', 'info');
  hub.enqueue('Cheating Detection Alert', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('EdtechAcademyNotificationHub - clearQueue and subscriber cleanup', () => {
  const hub = new EdtechAcademyNotificationHub();
  let calls = 0;
  const unsub = hub.subscribe(() => {
    calls++;
  });

  hub.enqueue('Certificate downloaded', 'success', 'success');
  assert.equal(calls, 1);

  hub.clearQueue();
  assert.equal(calls, 2);
  assert.equal(hub.getActiveQueue().length, 0);

  unsub();
  hub.enqueue('Post-unsub notice', 'info', 'info');
  assert.equal(calls, 2);
});
