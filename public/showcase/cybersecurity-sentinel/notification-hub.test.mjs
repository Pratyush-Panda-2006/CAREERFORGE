import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelNotificationHub } from './notification-hub.js';

test('CybersecuritySentinelNotificationHub prioritizes critical exploits over info', () => {
  const hub = new CybersecuritySentinelNotificationHub();

  hub.enqueue('Routine log heartbeat', 'info', 'info');
  hub.enqueue('RCE Zero-Day exploit', 'critical', 'critical');
  hub.enqueue('Brute force spike', 'warning', 'warning');
  hub.enqueue('Host isolated', 'success', 'success');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 4);
  assert.equal(active[0].priority, 'critical');
  assert.equal(active[1].priority, 'warning');
  assert.equal(active[2].priority, 'success');
  assert.equal(active[3].priority, 'info');
});

test('CybersecuritySentinelNotificationHub dismisses alert by id into historical log', () => {
  const hub = new CybersecuritySentinelNotificationHub();

  const item1 = hub.enqueue('Port scan alert', 'warning', 'warning');
  const item2 = hub.enqueue('DNS sinkhole update', 'info', 'info');

  assert.equal(hub.getActiveQueue().length, 2);
  const success = hub.dismiss(item1.id);

  assert.equal(success, true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, item2.id);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item1.id);
});

test('CybersecuritySentinelNotificationHub bounds queue size while preserving high priority', () => {
  const hub = new CybersecuritySentinelNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Low 1', 'info', 'info');
  hub.enqueue('Low 2', 'info', 'info');
  hub.enqueue('Active Ransomware Exfiltration', 'critical', 'critical');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 2);
  assert.equal(active[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].message, 'Low 2');
});

test('CybersecuritySentinelNotificationHub clearQueue flushes all alerts cleanly', () => {
  const hub = new CybersecuritySentinelNotificationHub();
  hub.enqueue('Alert 1', 'info', 'info');
  hub.enqueue('Alert 2', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});
