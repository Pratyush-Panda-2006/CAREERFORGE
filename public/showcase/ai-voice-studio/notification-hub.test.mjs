import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioNotificationHub } from './notification-hub.js';

test('AiVoiceStudioNotificationHub - enqueues and sorts by priority', () => {
  const hub = new AiVoiceStudioNotificationHub();
  
  hub.enqueue('Info message', 'info', 'info');
  hub.enqueue('Critical failure', 'critical', 'critical');
  hub.enqueue('Warning notice', 'warning', 'warning');
  
  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('AiVoiceStudioNotificationHub - dismisses notification and moves to history', () => {
  const hub = new AiVoiceStudioNotificationHub();
  const alert = hub.enqueue('Buffer jitter detected', 'warning', 'warning');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(alert.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, alert.id);
});

test('AiVoiceStudioNotificationHub - caps queue at maxQueueSize', () => {
  const hub = new AiVoiceStudioNotificationHub({ maxQueueSize: 2 });
  
  hub.enqueue('Msg 1', 'info', 'info');
  hub.enqueue('Msg 2', 'info', 'info');
  hub.enqueue('Msg 3 (Critical)', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('AiVoiceStudioNotificationHub - clearQueue moves active items to history', () => {
  const hub = new AiVoiceStudioNotificationHub();
  hub.enqueue('Alert A', 'info', 'info');
  hub.enqueue('Alert B', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});

test('AiVoiceStudioNotificationHub - subscriber notification', () => {
  const hub = new AiVoiceStudioNotificationHub();
  let callCount = 0;
  const unsubscribe = hub.subscribe(() => {
    callCount += 1;
  });

  hub.enqueue('Test voice event', 'info', 'info');
  assert.equal(callCount, 1);

  unsubscribe();
  hub.enqueue('Test voice event 2', 'info', 'info');
  assert.equal(callCount, 1);
});
