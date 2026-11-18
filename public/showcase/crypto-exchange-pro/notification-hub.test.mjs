import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProNotificationHub } from './notification-hub.js';

test('CryptoExchangeProNotificationHub prioritizes critical trade alerts over info', () => {
  const hub = new CryptoExchangeProNotificationHub();

  hub.enqueue('Market quote ping', 'info', 'info');
  hub.enqueue('Margin liquidation call', 'critical', 'critical');
  hub.enqueue('Slippage detected', 'warning', 'warning');
  hub.enqueue('Order filled', 'success', 'success');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 4);
  assert.equal(active[0].priority, 'critical');
  assert.equal(active[1].priority, 'warning');
  assert.equal(active[2].priority, 'success');
  assert.equal(active[3].priority, 'info');
});

test('CryptoExchangeProNotificationHub dismisses toast by id into history', () => {
  const hub = new CryptoExchangeProNotificationHub();

  const item1 = hub.enqueue('Slippage notice', 'warning', 'warning');
  const item2 = hub.enqueue('Fill event', 'success', 'success');

  assert.equal(hub.getActiveQueue().length, 2);
  const success = hub.dismiss(item1.id);

  assert.equal(success, true);
  assert.equal(hub.getActiveQueue().length, 1);
  assert.equal(hub.getActiveQueue()[0].id, item2.id);
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].id, item1.id);
});

test('CryptoExchangeProNotificationHub enforces max capacity with priority preservation', () => {
  const hub = new CryptoExchangeProNotificationHub({ maxQueueSize: 2 });

  hub.enqueue('Low 1', 'info', 'info');
  hub.enqueue('Low 2', 'info', 'info');
  hub.enqueue('Emergency Stop Liquidation', 'critical', 'critical');

  const active = hub.getActiveQueue();
  assert.equal(active.length, 2);
  assert.equal(active[0].priority, 'critical');
  assert.equal(hub.getHistory().length, 1);
  assert.equal(hub.getHistory()[0].message, 'Low 2');
});

test('CryptoExchangeProNotificationHub clearQueue removes all active alerts', () => {
  const hub = new CryptoExchangeProNotificationHub();
  hub.enqueue('Alert A', 'info', 'info');
  hub.enqueue('Alert B', 'warning', 'warning');

  hub.clearQueue();
  assert.equal(hub.getActiveQueue().length, 0);
  assert.equal(hub.getHistory().length, 2);
});
