import test from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamNotificationHub } from './notification-hub.js';

test('PodcastAudioStreamNotificationHub - enqueues and sorts alerts by priority', () => {
  const hub = new PodcastAudioStreamNotificationHub();
  
  hub.enqueue('Chapter sync', 'info', 'info');
  hub.enqueue('HLS stream fatal', 'critical', 'critical');
  hub.enqueue('Buffer jitter warning', 'warning', 'warning');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 3);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(queue[1].priority, 'warning');
  assert.equal(queue[2].priority, 'info');
});

test('PodcastAudioStreamNotificationHub - dismisses alert to history', () => {
  const hub = new PodcastAudioStreamNotificationHub();
  const item = hub.enqueue('Bitrate dropped', 'warning', 'warning');

  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getHistory().length, 0);

  const res = hub.dismiss(item.id);
  assert.equal(res, true);
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item.id);
});

test('PodcastAudioStreamNotificationHub - limits maxQueueSize correctly', () => {
  const hub = new PodcastAudioStreamNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Item A', 'info', 'info');
  hub.enqueue('Item B', 'info', 'info');
  hub.enqueue('Critical Connection Drop', 'critical', 'critical');

  const queue = hub.getActiveQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
});

test('PodcastAudioStreamNotificationHub - clearQueue and subscriber cleanup', () => {
  const hub = new PodcastAudioStreamNotificationHub();
  let calls = 0;
  const unsub = hub.subscribe(() => {
    calls++;
  });

  hub.enqueue('Playback resumed', 'success', 'success');
  assert.equal(calls, 1);

  hub.clearQueue();
  assert.equal(calls, 2);
  assert.equal(hub.getActiveQueue().length, 0);

  unsub();
  hub.enqueue('Ignored playback ping', 'info', 'info');
  assert.equal(calls, 2);
});
