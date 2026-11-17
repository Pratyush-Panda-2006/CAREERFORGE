import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreOfflineQueue } from './offline-sync.js';

test('EcommerceStoreOfflineQueue - initializes with clean state or hydrated data', () => {
  const queue = new EcommerceStoreOfflineQueue();
  const metrics = queue.getMetrics();
  assert.equal(metrics.pendingCount, 0);
  assert.equal(metrics.historyCount, 0);
  assert.equal(metrics.isOnline, true);
});

test('EcommerceStoreOfflineQueue - enqueue adds operation with unique ID and pending status', () => {
  const queue = new EcommerceStoreOfflineQueue();
  const op = queue.enqueue('ADD_TO_CART', { productId: 'PROD-1', quantity: 2 });
  assert.ok(op.id.startsWith('OP-'));
  assert.equal(op.action, 'ADD_TO_CART');
  assert.equal(op.status, 'pending');
  assert.equal(queue.getMetrics().pendingCount, 1);
});

test('EcommerceStoreOfflineQueue - resolveConflict implements Last-Write-Wins logic', () => {
  const queue = new EcommerceStoreOfflineQueue();
  const localOp = {
    timestamp: 2000,
    payload: { cartTotal: 150, items: 3 }
  };
  const olderServer = {
    timestamp: 1000,
    version: 1,
    cartTotal: 100
  };
  const newerServer = {
    timestamp: 3000,
    version: 2,
    cartTotal: 180
  };

  const lwwResult = queue.resolveConflict(localOp, olderServer);
  assert.equal(lwwResult.winner, 'local');
  assert.equal(lwwResult.state.cartTotal, 150);
  assert.equal(lwwResult.state.version, 2);

  const serverWinsResult = queue.resolveConflict(localOp, newerServer);
  assert.equal(serverWinsResult.winner, 'server');
  assert.equal(serverWinsResult.state.cartTotal, 180);
});

test('EcommerceStoreOfflineQueue - processQueue flushes pending items when online', async () => {
  const queue = new EcommerceStoreOfflineQueue();
  queue.enqueue('APPLY_COUPON', { code: 'SAVE20' });
  queue.enqueue('UPDATE_QTY', { itemId: '101', qty: 5 });

  const result = await queue.processQueue();
  assert.equal(result.processed, 2);
  assert.equal(result.remaining, 0);
  assert.equal(queue.getMetrics().pendingCount, 0);
  assert.equal(queue.getMetrics().historyCount, 2);
});

test('EcommerceStoreOfflineQueue - processQueue does not flush when offline', async () => {
  const queue = new EcommerceStoreOfflineQueue();
  queue.setOnlineStatus(false);
  queue.enqueue('CHECKOUT_INIT', { method: 'card' });

  const result = await queue.processQueue();
  assert.equal(result.processed, 0);
  assert.equal(result.remaining, 1);
  assert.equal(queue.getMetrics().pendingCount, 1);
});
