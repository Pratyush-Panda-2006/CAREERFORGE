import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsNotificationHub } from './notification-hub.js';

test('LuxuryRealmsNotificationHub prioritizes critical escrow alerts over info', () => {
  const hub = new LuxuryRealmsNotificationHub();

  hub.enqueue('Helipad request', 'info', 'info');
  hub.enqueue('Escrow deadline trip', 'critical', 'critical');
  hub.enqueue('Auction outbid', 'warning', 'warning');
  hub.enqueue('Viewing booked', 'success', 'success');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 4);
  assert.equal(active[0].priority, 'critical');
  assert.equal(active[1].priority, 'warning');
  assert.equal(active[2].priority, 'success');
  assert.equal(active[3].priority, 'info');
});

test('LuxuryRealmsNotificationHub dismisses notice by id into history', () => {
  const hub = new LuxuryRealmsNotificationHub();

  const item1 = hub.enqueue('Auction outbid notice', 'warning', 'warning');
  const item2 = hub.enqueue('Chauffeur assigned', 'info', 'info');

  assert.equal(hub.getActiveQueue().length, 2);
  const success = hub.dismiss(item1.id);

  assert.equal(success, true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, item2.id);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item1.id);
});

test('LuxuryRealmsNotificationHub limits queue size by evicting lowest priority notices', () => {
  const hub = new LuxuryRealmsNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Low 1', 'info', 'info');
  hub.enqueue('Low 2', 'info', 'info');
  hub.enqueue('Urgent Deed Signing', 'critical', 'critical');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 2);
  assert.equal(active[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].message, 'Low 2');
});

test('LuxuryRealmsNotificationHub clearQueue removes all active notices', () => {
  const hub = new LuxuryRealmsNotificationHub();
  hub.enqueue('Notice 1', 'info', 'info');
  hub.enqueue('Notice 2', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});
